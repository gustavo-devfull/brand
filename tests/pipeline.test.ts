import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCampaign } from '@/lib/agent/pipeline';
import { MockCreativeAgent, type AgentContext, type CreativeAgentProvider } from '@/lib/agent/provider';
import { demoWorkspace, DEMO_BRAND_ID, demoBrief } from '@/lib/brand/demo';
import type { Workspace } from '@/types';

const brief = demoBrief();
const request = { brandId: DEMO_BRAND_ID, brief, format: 'Instagram Post' as const };

async function workspace(): Promise<Workspace> {
  const seed = await demoWorkspace();
  return { ...seed, campaigns: [] };
}

test('a brief becomes three validated, exportable directions', async () => {
  const campaign = await generateCampaign(await workspace(), request);
  assert.equal(campaign.variations.length, 3);
  assert.equal(campaign.brandId, DEMO_BRAND_ID);
  assert.equal(campaign.format, 'Instagram Post');

  for (const variation of campaign.variations) {
    assert.equal(variation.compliance.approved, true, JSON.stringify(variation.compliance.rules.filter(r => r.status !== 'pass')));
    assert.equal(variation.compliance.protectedElementsModified, 0);
    assert.ok(variation.svg.startsWith('<svg'), 'an approved variation carries rendered markup');
    assert.equal(typeof variation.rationale.onTheme, 'boolean', 'every decision carries a rationale');
    assert.ok(variation.imageName, 'the chosen image is named for the audit trail');
  }
  assert.equal(new Set(campaign.variations.map(v => v.id)).size, 3);
});

test('the mock agent is deterministic for the same brief', async () => {
  const state = await workspace();
  const first = await generateCampaign(state, request);
  const second = await generateCampaign(state, request);
  assert.deepEqual(
    first.variations.map(v => v.spec),
    second.variations.map(v => v.spec),
  );
});

test('the brief is validated before the agent ever runs', async () => {
  const state = await workspace();
  await assert.rejects(() => generateCampaign(state, { ...request, brief: 'too short' }), /brief/i);
  await assert.rejects(() => generateCampaign(state, { ...request, format: 'Billboard' }), /format/i);
  await assert.rejects(() => generateCampaign(state, { ...request, brandId: '99999999-0000-4000-8000-000000000009' }), { key: 'brandNotFound' });
  await assert.rejects(() => generateCampaign(state, { ...request, extra: 'field' }), /unexpected|extra/i);
});

test('generation is blocked without an approved template or image', async () => {
  const state = await workspace();
  await assert.rejects(() => generateCampaign({ ...state, templates: [] }, request), /Adicione um template/);
  await assert.rejects(() => generateCampaign({ ...state, assets: [] }, request), /imagem de campanha/);
});

test('the refusal speaks the requested language', async () => {
  const state = await workspace();
  await assert.rejects(
    () => generateCampaign({ ...state, templates: [] }, request, undefined, 'en'),
    /Add a template for this format/,
  );
  await assert.rejects(
    () => generateCampaign({ ...state, templates: [] }, request, undefined, 'pt'),
    /Adicione um template para este formato/,
  );
});

test('an agent that returns the wrong shape is rejected, not rendered', async () => {
  const state = await workspace();
  const provider = (output: unknown): CreativeAgentProvider => ({ generateCreativeSpecs: async () => output });
  const valid = await new MockCreativeAgent().generateCreativeSpecs({
    brief, brand: state.brands[0], templates: state.templates, assets: state.assets, format: 'Instagram Post', locale: 'pt',
  } as AgentContext);

  await assert.rejects(() => generateCampaign(state, request, provider(valid.slice(0, 2))), /3|length/i);
  await assert.rejects(() => generateCampaign(state, request, provider('not an array')), /array|expected/i);
  await assert.rejects(
    () => generateCampaign(state, request, provider(valid.map(spec => ({ ...spec, rotation: 45 })))),
    /unexpected|rotation/i,
  );
});

test('an agent cannot smuggle in a template it was not offered', async () => {
  const state = await workspace();
  const foreign = state.templates.find(t => t.format !== 'Instagram Post')!;
  const valid = await new MockCreativeAgent().generateCreativeSpecs({
    brief, brand: state.brands[0], templates: state.templates, assets: state.assets, format: 'Instagram Post', locale: 'pt',
  } as AgentContext);

  await assert.rejects(
    () => generateCampaign(state, request, {
      generateCreativeSpecs: async () => valid.map(spec => ({ ...spec, templateId: foreign.id })),
    }),
    { key: 'templateUnavailable' },
  );
});

test('a failed pre-flight blocks rendering instead of exporting broken work', async () => {
  const state = await workspace();
  const valid = await new MockCreativeAgent().generateCreativeSpecs({
    brief, brand: state.brands[0], templates: state.templates, assets: state.assets, format: 'Instagram Post', locale: 'pt',
  } as AgentContext);
  const overflowing = valid.map(spec => ({
    ...spec,
    headline: 'A headline far too long for the geometry this template guarantees',
  }));
  const relaxed: Workspace = {
    ...state,
    brands: [{ ...state.brands[0], rules: { ...state.brands[0].rules, text: { ...state.brands[0].rules.text, maxHeadlineCharacters: 200 } } }],
  };

  const campaign = await generateCampaign(relaxed, request, { generateCreativeSpecs: async () => overflowing });
  for (const variation of campaign.variations) {
    assert.equal(variation.compliance.approved, false);
    assert.equal(variation.svg, '', 'a failing spec must never be rendered');
    assert.ok(variation.compliance.rules.some(rule => rule.status === 'fail'), 'the failure stays visible for the operator');
  }
});

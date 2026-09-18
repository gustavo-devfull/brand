import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRules, validateSpec } from '@/lib/validation/engine';
import { renderSvg } from '@/lib/renderer/render';
import { fontBook } from '@/lib/renderer/fonts';
import { demoWorkspace } from '@/lib/brand/demo';
import type { Brand, Template, Variation, Workspace } from '@/types';

async function fixture() {
  const workspace: Workspace = await demoWorkspace();
  const brand: Brand = workspace.brands[0];
  const variation: Variation = workspace.campaigns[0].variations[0];
  const template: Template = workspace.templates.find(t => t.id === variation.spec.templateId)!;
  return { workspace, brand, template, spec: variation.spec, assets: workspace.assets, book: fontBook(workspace.fonts) };
}

const ruleOf = (compliance: { rules: { ruleId: string; status: string }[] }, id: string) =>
  compliance.rules.find(rule => rule.ruleId === id)!;

test('the seeded campaign passes every rule end to end', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const preflight = evaluateRules(brand, template, spec, assets, book);
  assert.equal(preflight.approved, true, JSON.stringify(preflight.rules.filter(r => r.status !== 'pass'), null, 2));
  assert.equal(preflight.percentage, 100);

  const audited = evaluateRules(brand, template, spec, assets, book, renderSvg(brand, template, spec, assets, book));
  assert.equal(audited.approved, true);
  assert.equal(audited.protectedElementsModified, 0);
});

test('copy limits are enforced against the brand, not the schema', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const long = 'x'.repeat(brand.rules.text.maxHeadlineCharacters + 1);
  const compliance = evaluateRules(brand, template, { ...spec, headline: long }, assets, book);
  assert.equal(ruleOf(compliance, 'headline-length').status, 'fail');
  assert.equal(compliance.approved, false);

  const description = 'y'.repeat(brand.rules.text.maxDescriptionCharacters + 1);
  assert.equal(ruleOf(evaluateRules(brand, template, { ...spec, description }, assets, book), 'description-length').status, 'fail');
});

test('overflow is caught from font metrics before anything is drawn', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const generous: Brand = { ...brand, rules: { ...brand.rules, text: { ...brand.rules.text, maxHeadlineCharacters: 200, maxHeadlineLines: 5 } } };
  const headline = 'A considerably longer headline than this template was ever designed to hold';
  const compliance = evaluateRules(generous, template, { ...spec, headline }, assets, book);
  assert.equal(compliance.approved, false);
  assert.equal(ruleOf(compliance, 'overflow').status, 'fail');
});

test('a tightened logo rule fails the stock template', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const strict: Brand = { ...brand, rules: { ...brand.rules, logo: { ...brand.rules.logo, minimumWidth: 400 } } };
  assert.equal(ruleOf(evaluateRules(strict, template, spec, assets, book), 'logo-size').status, 'fail');

  const crowded: Brand = { ...brand, rules: { ...brand.rules, logo: { ...brand.rules.logo, minimumClearspace: 120 } } };
  assert.equal(ruleOf(evaluateRules(crowded, template, spec, assets, book), 'logo-clearspace').status, 'fail');
});

test('off-palette fills and unregistered typefaces are rejected', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const recolored: Template = { ...template, svg: template.svg.replace(/fill="#F4F0E8"/, 'fill="#ff0000"') };
  assert.equal(ruleOf(evaluateRules(brand, recolored, spec, assets, book), 'colors').status, 'fail');

  const refonted: Template = { ...template, svg: template.svg.replace(/font-family="DM Sans"/, 'font-family="Comic Sans MS"') };
  assert.equal(ruleOf(evaluateRules(brand, refonted, spec, assets, book), 'fonts').status, 'fail');
});

test('tampering with rendered output is detected after the fact', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const svg = renderSvg(brand, template, spec, assets, book);

  const recolored = evaluateRules(brand, template, spec, assets, book, svg.replace('data-protected="background"', 'data-protected="background" opacity="0.2"'));
  assert.ok(recolored.protectedElementsModified > 0, 'an altered protected element must be counted');
  assert.equal(ruleOf(recolored, 'protected').status, 'fail');
  assert.equal(recolored.approved, false);

  const stripped = evaluateRules(brand, template, spec, assets, book, svg.replace(/ data-protected="accent"/, ''));
  assert.ok(stripped.protectedElementsModified > 0, 'a removed protected element must be counted');

  const resized = evaluateRules(brand, template, spec, assets, book, svg.replace('viewBox="0 0 1080 1080"', 'viewBox="0 0 540 540"'));
  assert.ok(resized.protectedElementsModified > 0, 'a changed canvas must be counted');
});

test('a swapped logo cannot pass the post-render audit', async () => {
  const { brand, template, spec, assets, book } = await fixture();
  const svg = renderSvg(brand, template, spec, assets, book);
  const forged = svg.replace(/<svg data-slot="logo"[\s\S]*?<\/svg>/, '<svg data-slot="logo" x="64" y="64" width="180" height="56" viewBox="0 0 300 90"><rect width="300" height="90" fill="#243D33"/></svg>');
  const compliance = evaluateRules(brand, template, spec, assets, book, forged);
  assert.ok(compliance.protectedElementsModified > 0);
  assert.equal(compliance.approved, false);
});

test('specs are bound to the template and the brand library', async () => {
  const { workspace, template, spec, assets, book } = await fixture();
  assert.deepEqual(validateSpec(spec, template, assets), spec);

  const other = workspace.templates.find(t => t.id !== template.id)!;
  assert.throws(() => validateSpec(spec, other, assets), { key: 'specNotPermitted' });
  assert.throws(() => validateSpec({ ...spec, alignment: 'center' }, template, assets), { key: 'specNotPermitted' });
  assert.throws(() => validateSpec({ ...spec, heroImageId: '99999999-0000-4000-8000-000000000009' }, template, assets), { key: 'imageNotInBrand' });
  assert.throws(() => validateSpec({ ...spec, headline: '' }, template, assets), /headline/i);
  assert.throws(() => validateSpec({ ...spec, unexpected: true }, template, assets), /unexpected/i);
});

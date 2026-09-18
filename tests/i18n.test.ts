import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dictionary, locales, parseLocale, defaultLocale } from '@/lib/i18n';
import { ruleText, templateLabel, rationaleText, formatLabel } from '@/lib/i18n/format';
import { demoWorkspace, demoBrief } from '@/lib/brand/demo';
import { generateCampaign } from '@/lib/agent/pipeline';
import { makeTemplate } from '@/lib/brand/template-factory';
import { fontBook } from '@/lib/renderer/fonts';
import { ruleIds, type Workspace } from '@/types';
import { formats } from '@/schemas';
import { AppError, describe, fail } from '@/lib/errors';
import { parseSvg } from '@/lib/renderer/parser';

test('português é o padrão e valores inválidos caem nele', () => {
  assert.equal(defaultLocale, 'pt');
  for (const bad of ['', 'fr', 'PT', null, undefined, 'pt-BR']) {
    assert.equal(parseLocale(bad), 'pt', `esperava pt para ${JSON.stringify(bad)}`);
  }
  assert.equal(parseLocale('en'), 'en');
  assert.equal(parseLocale('pt'), 'pt');
});

test('os dicionários cobrem as mesmas chaves em todos os idiomas', () => {
  const shape = (value: unknown): unknown =>
    typeof value === 'function' ? 'fn'
      : Array.isArray(value) ? value.map(shape)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]).sort())
      : typeof value;
  const reference = shape(dictionary('pt'));
  for (const locale of locales) {
    assert.deepEqual(shape(dictionary(locale)), reference, `o dicionário ${locale} diverge do formato de referência`);
  }
});

test('nenhum texto de interface ficou vazio', () => {
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') return assert.ok(value.trim().length > 0, `${path} está vazio`);
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (value && typeof value === 'object' && typeof value !== 'function') {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  for (const locale of locales) walk(dictionary(locale), locale);
});

test('toda regra do motor tem tradução nos dois idiomas', () => {
  for (const locale of locales) {
    const d = dictionary(locale);
    for (const id of ruleIds) {
      assert.ok(d.rules[id], `${locale} não traduz a regra ${id}`);
      assert.ok(d.rules[id].name.trim().length > 0, `${locale}/${id} sem nome`);
    }
    assert.equal(Object.keys(d.rules).length, ruleIds.length, `${locale} tem regras a mais ou a menos`);
  }
});

test('as regras avaliadas viram texto com os números certos', async () => {
  const workspace = await demoWorkspace();
  const variation = workspace.campaigns[0].variations[0];
  const headline = variation.compliance.rules.find(r => r.ruleId === 'headline-length')!;

  assert.equal(
    ruleText(dictionary('pt'), headline).message,
    `${headline.params.length} / ${headline.params.maximum} caracteres.`,
  );
  assert.equal(
    ruleText(dictionary('en'), headline).message,
    `${headline.params.length} / ${headline.params.maximum} characters.`,
  );
  assert.notEqual(ruleText(dictionary('pt'), headline).name, ruleText(dictionary('en'), headline).name);
});

test('os nomes dos templates gerados são traduzidos; os do usuário são preservados', async () => {
  const brand = (await demoWorkspace()).brands[0];
  const generated = makeTemplate(brand, 'Instagram Story', 'sand', crypto.randomUUID());
  assert.equal(generated.nameKey, 'vertical-story');
  assert.equal(templateLabel(dictionary('pt'), generated), 'Story vertical');
  assert.equal(templateLabel(dictionary('en'), generated), 'Vertical Story');

  const custom = { name: 'Quadrado Editorial', nameKey: undefined };
  assert.equal(templateLabel(dictionary('pt'), custom), 'Quadrado Editorial');
  assert.equal(templateLabel(dictionary('en'), custom), 'Quadrado Editorial');
});

test('todo formato tem rótulo nos dois idiomas', () => {
  for (const locale of locales) {
    for (const format of formats) assert.ok(formatLabel(dictionary(locale), format).trim().length > 0, `${locale}/${format}`);
  }
});

test('a justificativa do agente é montada no idioma pedido', async () => {
  const workspace = await demoWorkspace();
  const variation = workspace.campaigns[0].variations[0];
  const portuguese = rationaleText(dictionary('pt'), variation);
  const english = rationaleText(dictionary('en'), variation);

  assert.match(portuguese, /mock determinístico/);
  assert.match(portuguese, /Quadrado social|Story vertical|Hero web/);
  assert.match(english, /deterministic mock/);
  assert.notEqual(portuguese, english);
});

test('o workspace demo é semeado no idioma escolhido', async () => {
  const [portuguese, english] = await Promise.all([demoWorkspace('pt'), demoWorkspace('en')]);

  assert.match(demoBrief('pt'), /coleção de cafés/);
  assert.match(demoBrief('en'), /coffee collection/);
  assert.deepEqual(portuguese.assets.map(a => a.name), ['O ritual diário', 'Luz da manhã', 'A arte do café']);
  assert.deepEqual(english.assets.map(a => a.name), ['The daily ritual', 'Morning light', 'The art of coffee']);
  assert.equal(portuguese.campaigns[0].name, 'A coleção das manhãs sem pressa');
  assert.equal(english.campaigns[0].name, 'The slow morning collection');
});

test('a copy gerada muda de idioma e continua aprovada', async () => {
  for (const locale of locales) {
    const seed = await demoWorkspace(locale);
    const state: Workspace = { ...seed, campaigns: [] };
    const campaign = await generateCampaign(state, { brandId: seed.brands[0].id, brief: demoBrief(locale), format: 'Instagram Post' }, undefined, locale);

    for (const variation of campaign.variations) {
      assert.equal(variation.compliance.approved, true, `${locale}: ${JSON.stringify(variation.compliance.rules.filter(r => r.status !== 'pass'))}`);
      assert.ok(variation.rationale.onTheme, `${locale}: o briefing demo deveria ser reconhecido como on-theme`);
    }
    const headlines = campaign.variations.map(v => v.spec.headline);
    assert.equal(headlines[0], locale === 'pt' ? 'Coisas boas levam tempo.' : 'Good things take time.');
  }
});

test('a copy em português cabe nas fontes empacotadas', async () => {
  const seed = await demoWorkspace('pt');
  const campaign = seed.campaigns[0];
  const accented = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇº]/;

  const text = campaign.variations.flatMap(v => [v.spec.headline, v.spec.description, v.spec.cta]).join(' ');
  assert.match(text, accented, 'a copy demo em português deveria conter acentos');

  for (const name of ['DM Sans', 'Cormorant Garamond'] as const) {
    const font = fontBook().get(name);
    const missing = [...new Set(text.replace(/\s/g, ''))].filter(c => font.charToGlyph(c).index === 0);
    assert.deepEqual(missing, [], `${name} não tem glifo para: ${missing.join(' ')}`);
  }
});

test('as falhas esperadas carregam chave e parâmetros, não uma frase', () => {
  const error = fail('svgElement', { element: 'script' });
  assert.ok(error instanceof AppError);
  assert.equal(error.key, 'svgElement');
  assert.deepEqual(error.params, { element: 'script' });

  assert.equal(describe(dictionary('pt'), error), 'Elemento SVG não suportado: script');
  assert.equal(describe(dictionary('en'), error), 'Unsupported SVG element: script');
});

test('toda chave de erro resolve para texto nos dois idiomas', () => {
  const keys = Object.keys(dictionary('pt').errors) as (keyof ReturnType<typeof dictionary>['errors'])[];
  assert.ok(keys.length > 20, 'esperava um catálogo de erros substancial');
  for (const locale of locales) {
    for (const key of keys) {
      // Params ausentes viram `undefined` interpolado; o que importa é que a chave resolve.
      const text = describe(dictionary(locale), fail(key, { message: 'x', name: 'x', element: 'x', attribute: 'x', slot: 'x', expected: 'x', family: 'x' }));
      assert.ok(text.trim().length > 0, `${locale}/${key} não resolveu`);
      assert.ok(!text.includes('undefined'), `${locale}/${key} deixou um parâmetro sem valor`);
    }
  }
});

test('erros do parser chegam traduzidos, com a mesma chave', () => {
  const thrown = (() => { try { parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'); } catch (e) { return e as AppError; } })()!;
  assert.equal(thrown.key, 'svgElement');
  assert.match(describe(dictionary('pt'), thrown), /não suportado/);
  assert.match(describe(dictionary('en'), thrown), /Unsupported/);
});

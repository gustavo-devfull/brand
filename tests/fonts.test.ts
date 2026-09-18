import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fontBook, parseFont, materializeFonts, builtinFamilies } from '@/lib/renderer/fonts';
import { makeTemplate, type Measurer } from '@/lib/brand/template-factory';
import { layoutText } from '@/lib/renderer/fonts';
import { parseTemplate } from '@/lib/renderer/parser';
import { evaluateRules } from '@/lib/validation/engine';
import { demoWorkspace } from '@/lib/brand/demo';
import type { Brand, BrandFont } from '@/types';

async function customFont(brandId: string, family: string): Promise<BrandFont> {
  // Reusa um arquivo real do projeto: o teste precisa de bytes que o parser aceite.
  const bytes = await readFile('public/demo/fonts/body.ttf');
  return { id: crypto.randomUUID(), brandId, family, source: 'upload', data: `data:font/ttf;base64,${bytes.toString('base64')}`, createdAt: new Date().toISOString() };
}

test('o catálogo resolve as embutidas sem nenhuma fonte registrada', () => {
  const book = fontBook();
  for (const family of builtinFamilies) assert.ok(book.get(family).numGlyphs > 0, family);
  assert.deepEqual(book.families(), [...builtinFamilies]);
  assert.deepEqual(book.custom(), []);
});

test('uma família registrada fica disponível só para a marca dela', async () => {
  const font = await customFont(crypto.randomUUID(), 'Aurelia Sans');
  const book = fontBook([font]);
  assert.ok(book.has('Aurelia Sans'));
  assert.ok(book.get('Aurelia Sans').numGlyphs > 0);
  assert.equal(book.custom().length, 1);
  // Outra marca, mesmo catálogo vazio: a família não vaza.
  assert.equal(fontBook([]).has('Aurelia Sans'), false);
  assert.throws(() => fontBook([]).get('Aurelia Sans'), { key: 'fontNotRegistered' });
});

test('bytes que não são fonte são recusados', async () => {
  assert.throws(() => parseFont(Buffer.from('isto não é uma fonte'), 'Falsa'), { key: 'fontInvalid', params: { family: 'Falsa' } });
  assert.throws(() => parseFont(Buffer.alloc(0), 'Vazia'), { key: 'fontInvalid' });
  const ok = await customFont(crypto.randomUUID(), 'Real');
  assert.ok(parseFont(Buffer.from(ok.data.split(',')[1], 'base64'), 'Real').numGlyphs > 0);
});

test('as fontes viram arquivos para o exportador de PNG', async () => {
  const font = await customFont(crypto.randomUUID(), 'Aurelia Sans');
  const [file] = await materializeFonts([font]);
  assert.match(file, /\.ttf$/);
  assert.ok((await readFile(file)).length > 1000, 'o arquivo materializado precisa ter os bytes');
  assert.deepEqual(await materializeFonts([]), []);
});

test('o template encolhe o texto para caber na fonte escolhida', async () => {
  const brand: Brand = (await demoWorkspace()).brands[0];
  const book = fontBook();
  const measure: Measurer = (text, family, size, width) => layoutText(book, text, family, size, width);
  const sizeOf = (svg: string) => Number(/data-slot="headline"[^>]*font-size="(\d+)"/.exec(svg)![1]);

  // Sem medidor, a geometria histórica é preservada.
  assert.equal(sizeOf(makeTemplate(brand, 'Instagram Post', 'ivory', crypto.randomUUID()).svg), 88);

  // DM Sans é bem mais larga que a Cormorant no mesmo corpo, então precisa encolher mais.
  const serif = sizeOf(makeTemplate(brand, 'Instagram Post', 'ivory', crypto.randomUUID(), measure).svg);
  const wideBrand: Brand = { ...brand, tokens: { ...brand.tokens, typography: { ...brand.tokens.typography, display: 'DM Sans' } } };
  const sans = sizeOf(makeTemplate(wideBrand, 'Instagram Post', 'ivory', crypto.randomUUID(), measure).svg);

  assert.ok(sans < serif, `esperava a sans menor que a serifada (${sans} vs ${serif})`);
  assert.ok(sans >= 9);
});

test('trocar a tipografia mantém os templates gerados aprovados', async () => {
  const workspace = await demoWorkspace();
  const brand = workspace.brands[0];
  const image = workspace.assets.find(a => a.kind === 'image')!;
  const book = fontBook();
  const measure: Measurer = (text, family, size, width) => layoutText(book, text, family, size, width);

  for (const display of builtinFamilies) {
    const swapped: Brand = { ...brand, tokens: { ...brand.tokens, typography: { ...brand.tokens.typography, display } } };
    const template = makeTemplate(swapped, 'Instagram Post', 'ivory', crypto.randomUUID(), measure);
    assert.equal(parseTemplate(template.svg).slots.size, 5);

    const compliance = evaluateRules(swapped, template, {
      templateId: template.id,
      headline: 'Coisas boas levam tempo e atenção'.slice(0, swapped.rules.text.maxHeadlineCharacters),
      description: 'Café excepcional, torrado devagar para as suas manhãs sem pressa.',
      heroImageId: image.id,
      theme: 'ivory',
      alignment: 'left',
      cta: 'DESCUBRA A COLEÇÃO',
    }, workspace.assets, book);

    assert.equal(compliance.approved, true, `${display}: ${JSON.stringify(compliance.rules.filter(r => r.status !== 'pass'))}`);
  }
});

test('o dimensionamento cobre o pior caso realista, não o impossível', async () => {
  const workspace = await demoWorkspace();
  const brand = workspace.brands[0];
  const image = workspace.assets.find(a => a.kind === 'image')!;
  const book = fontBook();
  const measure: Measurer = (text, family, size, width) => layoutText(book, text, family, size, width);
  const template = makeTemplate(brand, 'Instagram Post', 'ivory', crypto.randomUUID(), measure);

  // Uma palavra única longa não quebra em linha nenhuma, então nenhum corpo de texto a
  // faria caber. A regra de overflow continua sendo a rede de segurança para esse caso.
  const compliance = evaluateRules(brand, template, {
    templateId: template.id,
    headline: 'x'.repeat(brand.rules.text.maxHeadlineCharacters),
    description: 'Uma descrição comum.',
    heroImageId: image.id,
    theme: 'ivory',
    alignment: 'left',
    cta: 'DESCUBRA',
  }, workspace.assets, book);

  assert.equal(compliance.approved, false);
  assert.equal(compliance.rules.find(r => r.ruleId === 'overflow')!.status, 'fail');
});

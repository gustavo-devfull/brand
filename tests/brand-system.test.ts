import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandInputSchema, formats, generationInputSchema, templateInputSchema } from '@/schemas';
import { makeTemplate } from '@/lib/brand/template-factory';
import { parseTemplate } from '@/lib/renderer/parser';
import { evaluateRules } from '@/lib/validation/engine';
import { fontBook } from '@/lib/renderer/fonts';
import { demoWorkspace } from '@/lib/brand/demo';
import type { Brand, Template } from '@/types';

const validBrand = {
  name: 'Serein',
  logoSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><rect width="300" height="90" fill="#243D33"/></svg>',
  tokens: {
    colors: { primary: '#243D33', secondary: '#C4A889', background: '#F4F0E8', accent: '#C4A889', additional: [] },
    typography: { display: 'Cormorant Garamond', body: 'DM Sans', weights: [400] },
    spacing: { small: 8, medium: 24, large: 64 },
    grid: { columns: 12, margin: 64, gutter: 24 },
  },
  rules: {
    logo: { minimumWidth: 140, minimumClearspace: 24, rotationAllowed: false, recolorAllowed: false },
    text: { maxHeadlineCharacters: 60, maxHeadlineLines: 2, maxDescriptionCharacters: 120 },
    requireImage: true,
  },
};

test('a complete brand system parses', () => {
  assert.equal(brandInputSchema.parse(validBrand).name, 'Serein');
});

test('the brand vocabulary is closed', () => {
  assert.throws(() => brandInputSchema.parse({ ...validBrand, industry: 'coffee' }));
  assert.throws(() => brandInputSchema.parse({
    ...validBrand,
    tokens: { ...validBrand.tokens, colors: { ...validBrand.tokens.colors, tertiary: '#000000' } },
  }));
});

test('colors must be six-digit hex', () => {
  for (const bad of ['#fff', 'rebeccapurple', '#12345g', 'rgb(0,0,0)', '']) {
    assert.throws(
      () => brandInputSchema.parse({ ...validBrand, tokens: { ...validBrand.tokens, colors: { ...validBrand.tokens.colors, primary: bad } } }),
      `expected ${JSON.stringify(bad)} to be rejected`,
    );
  }
});

test('typeface names are free text, but still have to look like names', () => {
  // Marcas podem registrar suas próprias famílias, então o schema não fecha a lista —
  // quem confere se a família existe é a camada que conhece as fontes da marca.
  const typeface = (display: unknown) => ({ ...validBrand, tokens: { ...validBrand.tokens, typography: { ...validBrand.tokens.typography, display } } });
  assert.equal(brandInputSchema.parse(typeface('Helvetica Neue')).tokens.typography.display, 'Helvetica Neue');
  for (const bad of ['', '   ', '<script>', 'a'.repeat(65), 'url(x)']) {
    assert.throws(() => brandInputSchema.parse(typeface(bad)), `esperava recusar ${JSON.stringify(bad)}`);
  }
  assert.throws(() => brandInputSchema.parse({
    ...validBrand,
    tokens: { ...validBrand.tokens, typography: { ...validBrand.tokens.typography, weights: [400, 700] } },
  }));
});

test('only families the brand actually has are resolvable', async () => {
  const book = fontBook();
  assert.ok(book.has('DM Sans'));
  assert.ok(book.has('Cormorant Garamond'));
  assert.equal(book.has('Helvetica Neue'), false);
  assert.deepEqual(book.families(), ['Cormorant Garamond', 'DM Sans']);

  const brand = (await demoWorkspace()).brands[0];
  const withFont = fontBook([{ id: crypto.randomUUID(), brandId: brand.id, family: 'Aurelia Sans', source: 'upload', data: 'data:font/ttf;base64,', createdAt: new Date().toISOString() }]);
  assert.ok(withFont.has('Aurelia Sans'));
  assert.equal(withFont.custom().length, 1);
});

test('geometry stays inside sane bounds', () => {
  assert.throws(() => brandInputSchema.parse({ ...validBrand, tokens: { ...validBrand.tokens, grid: { ...validBrand.tokens.grid, columns: 0 } } }));
  assert.throws(() => brandInputSchema.parse({ ...validBrand, tokens: { ...validBrand.tokens, spacing: { ...validBrand.tokens.spacing, small: -8 } } }));
  assert.throws(() => brandInputSchema.parse({ ...validBrand, tokens: { ...validBrand.tokens, spacing: { ...validBrand.tokens.spacing, small: 99999 } } }));
});

test('template and generation inputs are constrained', () => {
  assert.throws(() => templateInputSchema.parse({ name: 'X', brandId: 'not-a-uuid', format: 'Instagram Post', svg: '<svg/>', theme: 'ivory' }));
  assert.throws(() => templateInputSchema.parse({ name: 'Editorial', brandId: crypto.randomUUID(), format: 'Instagram Post', svg: '<svg/>', theme: 'neon' }));
  assert.throws(() => generationInputSchema.parse({ brandId: crypto.randomUUID(), brief: 'short', format: 'Instagram Post' }));
  assert.ok(generationInputSchema.parse({ brandId: crypto.randomUUID(), brief: 'A brief long enough to describe an actual campaign.', format: 'LinkedIn' }));
});

test('every generated template is parseable and self-consistent', async () => {
  const brand: Brand = (await demoWorkspace()).brands[0];
  const themes: Template['theme'][] = ['ivory', 'forest', 'sand'];

  for (const format of formats) {
    for (const theme of themes) {
      const template = makeTemplate(brand, format, theme, crypto.randomUUID());
      const parsed = parseTemplate(template.svg);
      assert.equal(parsed.width, template.width, `${format}/${theme} width`);
      assert.equal(parsed.height, template.height, `${format}/${theme} height`);
      assert.equal(parsed.slots.size, 5, `${format}/${theme} slots`);
      assert.equal(template.format, format);
      assert.equal(template.theme, theme);
    }
  }
});

test('every generated template satisfies the brand it was built from', async () => {
  const workspace = await demoWorkspace();
  const brand = workspace.brands[0];
  const image = workspace.assets.find(a => a.kind === 'image')!;
  const themes: Template['theme'][] = ['ivory', 'forest', 'sand'];

  for (const format of formats) {
    for (const theme of themes) {
      const template = makeTemplate(brand, format, theme, crypto.randomUUID());
      const compliance = evaluateRules(brand, template, {
        templateId: template.id,
        headline: 'Good things take time.',
        description: 'Exceptional coffee. An everyday ritual.',
        heroImageId: image.id,
        theme,
        alignment: 'left',
        cta: 'DISCOVER THE COLLECTION',
      }, workspace.assets, fontBook(workspace.fonts));
      assert.equal(
        compliance.approved,
        true,
        `${format}/${theme}: ${JSON.stringify(compliance.rules.filter(r => r.status !== 'pass'))}`,
      );
    }
  }
});

test('the protected eyebrow is derived from the brand, not hardcoded copy', async () => {
  const brand: Brand = (await demoWorkspace()).brands[0];
  const template = makeTemplate({ ...brand, name: 'Aurelia' }, 'Instagram Post', 'ivory', crypto.randomUUID());
  assert.ok(template.svg.includes('>AURELIA / Nº 01<'), 'the eyebrow should name the registered brand');
  assert.ok(!/COFFEE/i.test(template.svg), 'no brand-specific copy may leak between tenants');
});

test('a brand name containing markup cannot break out of the template', async () => {
  const brand: Brand = (await demoWorkspace()).brands[0];
  const hostile = makeTemplate({ ...brand, name: 'A & B <script>' }, 'Instagram Post', 'ivory', crypto.randomUUID());
  assert.ok(hostile.svg.includes('&amp;'), 'ampersands must be escaped');
  assert.ok(!hostile.svg.includes('<script>'), 'markup must not survive interpolation');
  assert.equal(parseTemplate(hostile.svg).slots.size, 5, 'the template must still parse cleanly');
});

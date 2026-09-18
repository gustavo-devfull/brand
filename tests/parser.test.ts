import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSvg, parseTemplate, slotNames } from '@/lib/renderer/parser';

const square = (body = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${body}</svg>`;

const slots = [
  '<image data-slot="heroImage" x="0" y="535" width="1080" height="545"/>',
  '<svg data-slot="logo" x="64" y="64" width="180" height="56" data-clearspace="32" viewBox="0 0 300 90"/>',
  '<text data-slot="headline" x="64" y="306" data-width="952" data-height="190" data-lines="2" font-family="DM Sans" font-size="88" fill="#243D33"/>',
  '<text data-slot="description" x="64" y="439" data-width="952" data-height="58" data-lines="2" font-family="DM Sans" font-size="20" fill="#243D33"/>',
  '<text data-slot="cta" x="64" y="500" data-width="952" data-height="28" data-lines="1" font-family="DM Sans" font-size="17" fill="#243D33"/>',
].join('');

test('accepts a well-formed document', () => {
  const doc = parseSvg(square('<rect width="10" height="10" fill="#243D33"/>'));
  assert.equal(doc.documentElement.tagName, 'svg');
});

test('rejects scripts, foreign elements and unknown attributes', () => {
  assert.throws(() => parseSvg(square('<script>alert(1)</script>')), { key: 'svgElement' });
  assert.throws(() => parseSvg(square('<foreignObject/>')), { key: 'svgElement' });
  assert.throws(() => parseSvg(square('<rect onload="x()"/>')), { key: 'svgAttribute' });
});

test('rejects doctypes, entities and processing instructions', () => {
  assert.throws(() => parseSvg('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>'), { key: 'svgDeclarations' });
  assert.throws(() => parseSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'), { key: 'svgDeclarations' });
});

test('rejects remote references in attribute values', () => {
  assert.throws(() => parseSvg(square('<rect fill="url(https://evil.test/a.png)"/>')), { key: 'svgExternalRef' });
  assert.throws(() => parseSvg(square('<image href="https://evil.test/a.png"/>')), { key: 'svgAttribute' });
  assert.throws(() => parseSvg(square('<rect fill="javascript:alert(1)"/>')), { key: 'svgExternalResource' });
});

test('allows internal fragment references', () => {
  assert.ok(parseSvg(square('<defs><clipPath id="c"><rect width="8" height="8"/></clipPath></defs><rect clip-path="url(#c)" width="8" height="8"/>')));
});

test('rejects malformed markup', () => {
  assert.throws(() => parseSvg('<svg><rect></svg>'), { key: 'svgMalformed' });
  assert.throws(() => parseSvg('not markup at all'), { key: 'svgMalformed' });
});

test('a template needs every named slot', () => {
  const template = parseTemplate(square(slots));
  assert.equal(template.width, 1080);
  assert.equal(template.height, 1080);
  assert.deepEqual([...template.slots.keys()].sort(), [...slotNames].sort());

  for (const name of slotNames) {
    const missing = slots.replace(new RegExp(`<[a-z]+ data-slot="${name}"[^>]*/>`, 'i'), '');
    assert.throws(() => parseTemplate(square(missing)), { key: 'slotMissing', params: { slot: name } });
  }
});

test('a template cannot lie about its geometry', () => {
  assert.throws(
    () => parseTemplate(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 800 800">${slots}</svg>`),
    { key: 'templateViewBox' },
  );
  assert.throws(
    () => parseTemplate(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${slots}</svg>`),
    { key: 'templateDimensions' },
  );
});

test('slots may not be duplicated, transformed, nested or retyped', () => {
  assert.throws(() => parseTemplate(square(slots + '<text data-slot="cta" x="1" y="1" data-width="2" data-height="2" font-size="9"/>')), { key: 'slotUnknown' });
  assert.throws(() => parseTemplate(square(slots.replace('data-slot="cta"', 'data-slot="cta" transform="rotate(9)"'))), { key: 'slotTransformed' });
  assert.throws(() => parseTemplate(square(slots.replace('<text data-slot="cta"', '<rect data-slot="cta"'))), { key: 'slotWrongElement', params: { slot: 'cta', expected: 'text' } });
  assert.throws(() => parseTemplate(square(`<g>${slots}</g>`)), { key: 'slotNotDirectChild' });
  assert.throws(() => parseTemplate(square(slots + '<rect data-slot="watermark" x="0" y="0" width="4" height="4"/>')), { key: 'slotUnknown' });
});

test('aceita a marcação que ferramentas de design realmente exportam', () => {
  const logos = [
    // Figma: fill-rule, clip-rule e um clipPath em <defs>.
    '<svg width="300" height="90" viewBox="0 0 300 90" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 10h50v50H10z" fill="#102A43"/></g><defs><clipPath id="a"><rect width="300" height="90" fill="white"/></clipPath></defs></svg>',
    // Gradiente declarado localmente.
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="300"><stop offset="0" stop-color="#FF6B00"/><stop offset="1" stop-color="#102A43"/></linearGradient></defs><rect width="300" height="90" fill="url(#g)"/></svg>',
    // Illustrator: version e xml:space.
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 300 90"><rect width="300" height="90" fill="#102A43"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><path d="M10 10h50" stroke="#102A43" stroke-miterlimit="10" stroke-dasharray="4 2"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><mask id="m"><rect width="300" height="90" fill="#fff"/></mask><rect width="300" height="90" fill="#102A43" mask="url(#m)"/></svg>',
  ];
  for (const logo of logos) assert.ok(parseSvg(logo), logo.slice(0, 60));
});

test('a marcação ampliada não abriu caminho para execução ou busca remota', () => {
  // <style> continua fora: CSS arbitrário pode trazer @import de um domínio externo.
  assert.throws(() => parseSvg(square('<style>.a{fill:red}</style>')), { key: 'svgElement', params: { element: 'style' } });
  assert.throws(() => parseSvg(square('<use href="#x"/>')), { key: 'svgElement' });
  assert.throws(() => parseSvg(square('<filter id="f"/>')), { key: 'svgElement' });
  assert.throws(() => parseSvg(square('<rect class="a" width="1" height="1"/>')), { key: 'svgAttribute' });
  assert.throws(() => parseSvg(square('<defs><linearGradient id="g"><stop stop-color="javascript:alert(1)"/></linearGradient></defs>')), { key: 'svgExternalResource' });
  assert.throws(() => parseSvg(square('<rect width="1" height="1" fill="url(https://evil.test/a)"/>')), { key: 'svgExternalRef' });
  assert.throws(() => parseSvg(square('<rect width="1" height="1" mask="url(https://evil.test/m)"/>')), { key: 'svgExternalRef' });
});

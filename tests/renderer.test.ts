import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fontBook, layoutText } from '@/lib/renderer/fonts';
import { renderSvg } from '@/lib/renderer/render';
import { demoWorkspace } from '@/lib/brand/demo';

const book = fontBook();

test('only registered typefaces can be loaded', () => {
  assert.ok(book.get('DM Sans'));
  assert.ok(book.get('Cormorant Garamond'));
  assert.throws(() => book.get('Comic Sans MS'), { key: 'fontNotRegistered', params: { name: 'Comic Sans MS' } });
});

test('text wraps on measured advance width, never mid-word', () => {
  const narrow = layoutText(book, 'Good things take time and patience', 'DM Sans', 40, 220);
  assert.ok(narrow.lines.length > 1, 'expected the copy to wrap');
  assert.ok(narrow.widths.every(width => width <= 220), 'every line must fit the measured box');
  assert.equal(narrow.lines.join(' '), 'Good things take time and patience');

  const wide = layoutText(book, 'Good things take time.', 'DM Sans', 40, 4000);
  assert.deepEqual(wide.lines, ['Good things take time.']);
});

test('letter spacing widens the measurement', () => {
  const plain = layoutText(book, 'DISCOVER THE COLLECTION', 'DM Sans', 17, 10000);
  const tracked = layoutText(book, 'DISCOVER THE COLLECTION', 'DM Sans', 17, 10000, 2);
  assert.ok(tracked.widths[0] > plain.widths[0]);
});

test('a single unbreakable word still produces one line', () => {
  const layout = layoutText(book, 'Unbreakableextremelylongword', 'DM Sans', 60, 40);
  assert.equal(layout.lines.length, 1);
});

test('rendering outlines copy, embeds imagery and inlines the official logo', async () => {
  const workspace = await demoWorkspace();
  const brand = workspace.brands[0];
  const variation = workspace.campaigns[0].variations[0];
  const template = workspace.templates.find(t => t.id === variation.spec.templateId)!;
  const svg = renderSvg(brand, template, variation.spec, workspace.assets, book);

  for (const slot of ['headline', 'description', 'cta']) {
    assert.ok(svg.includes(`<g data-slot="${slot}"`), `${slot} should become a group of outlines`);
    assert.ok(!svg.includes(`<text data-slot="${slot}"`), `${slot} should no longer be a text element`);
  }
  assert.ok(!/font-family="[^"]*"[^>]*data-slot/.test(svg), 'outlined copy must not depend on an installed font');
  assert.ok(svg.includes('data:image/jpeg;base64,'), 'imagery must be embedded, not linked');
  assert.ok(svg.includes(brand.logoSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')), 'the official logo must survive verbatim');
  assert.ok(svg.includes('data-protected="background"'), 'protected elements must be carried through');
  assert.ok(svg.includes(`aria-label="${variation.spec.headline}"`), 'outlined copy needs an accessible name');
});

test('rendering refuses an image outside the brand library', async () => {
  const workspace = await demoWorkspace();
  const brand = workspace.brands[0];
  const variation = workspace.campaigns[0].variations[0];
  const template = workspace.templates.find(t => t.id === variation.spec.templateId)!;

  assert.throws(
    () => renderSvg(brand, template, variation.spec, [], book),
    { key: 'rendererNeedsImage' },
  );
  const remote = workspace.assets.map(asset =>
    asset.id === variation.spec.heroImageId ? { ...asset, data: 'https://evil.test/a.jpg' } : asset);
  assert.throws(
    () => renderSvg(brand, template, variation.spec, remote, book),
    { key: 'rendererNeedsImage' },
  );
});

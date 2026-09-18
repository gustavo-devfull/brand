import { loadSync, parse, type Font } from 'opentype.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fail } from '@/lib/errors';
import { builtinFamilies, type BuiltinFamily } from './families';
import type { BrandFont } from '@/types';

/** Sempre disponíveis: acompanham o repositório e semeiam a marca demo. */
export { builtinFamilies, type BuiltinFamily } from './families';

const builtinFiles: Record<BuiltinFamily, string> = {
  'DM Sans': 'body.ttf',
  'Cormorant Garamond': 'display.ttf',
};

const builtinCache = new Map<string, Font>();
const customCache = new Map<string, Font>();

function builtin(family: string) {
  if (!builtinCache.has(family)) {
    builtinCache.set(family, loadSync(path.join(process.cwd(), 'public/demo/fonts', builtinFiles[family as BuiltinFamily])));
  }
  return builtinCache.get(family)!;
}

export function fontBytes(font: BrandFont) {
  const base64 = font.data.split(',')[1];
  if (!base64) throw fail('fontInvalid', { family: font.family });
  return Buffer.from(base64, 'base64');
}

/** Interpreta os bytes e confirma que são mesmo uma fonte legível. */
export function parseFont(bytes: Buffer, family: string) {
  try {
    const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    if (!font.numGlyphs) throw new Error('sem glifos');
    return font;
  } catch {
    throw fail('fontInvalid', { family });
  }
}

/**
 * As famílias que uma marca pode usar. As embutidas valem para todo mundo; as demais
 * vêm do que foi enviado ou buscado no Google Fonts para aquela marca.
 */
export type FontBook = {
  has(family: string): boolean;
  get(family: string): Font;
  families(): string[];
  custom(): BrandFont[];
};

export function fontBook(fonts: BrandFont[] = []): FontBook {
  const custom = new Map<string, BrandFont>();
  for (const font of fonts) custom.set(font.family, font);

  const resolve = (family: string) => {
    if (builtinFamilies.includes(family as BuiltinFamily)) return builtin(family);
    const entry = custom.get(family);
    if (!entry) throw fail('fontNotRegistered', { name: family });
    if (!customCache.has(entry.id)) customCache.set(entry.id, parseFont(fontBytes(entry), entry.family));
    return customCache.get(entry.id)!;
  };

  return {
    has: family => builtinFamilies.includes(family as BuiltinFamily) || custom.has(family),
    get: resolve,
    families: () => [...builtinFamilies, ...custom.keys()],
    custom: () => [...custom.values()],
  };
}

/**
 * O resvg só aceita caminhos de arquivo, e o texto protegido do template não é
 * vetorizado — então as fontes da marca precisam existir em disco na hora do PNG.
 * Materializa uma vez por id e reaproveita nas próximas exportações.
 */
export async function materializeFonts(fonts:BrandFont[]){
  if(!fonts.length)return [];
  const dir=path.join(os.tmpdir(),'brand-engine-fonts');
  await mkdir(dir,{recursive:true});
  return Promise.all(fonts.map(async font=>{
    const file=path.join(dir,`${font.id}.ttf`);
    if(!existsSync(file))await writeFile(file,fontBytes(font));
    return file;
  }));
}

export function layoutText(book: FontBook, text: string, family: string, size: number, width: number, letterSpacing = 0) {
  const font = book.get(family);
  const measure = (value: string) => font.getAdvanceWidth(value, size, { kerning: true }) + Math.max(0, value.length - 1) * letterSpacing;
  const lines: string[] = [];
  let current = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (current && measure(next) > width) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  return { lines, widths: lines.map(measure), lineHeight: size * 1.08 };
}

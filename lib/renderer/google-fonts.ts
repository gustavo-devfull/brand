import 'server-only';
import { fail } from '@/lib/errors';
import { parseFont } from './fonts';

/**
 * Traz o arquivo regular de uma família do Google Fonts.
 *
 * A API `css` devolve TrueType quando nenhum User-Agent moderno é anunciado — por isso
 * o cabeçalho é omitido de propósito. O `css2` mais novo só entrega woff2, que o
 * opentype.js não interpreta.
 *
 * Só dois hosts do Google são aceitos, e nada do que o usuário digita entra numa URL
 * sem passar pelo schema de família e por `encodeURIComponent`.
 */
const stylesheetHost = 'fonts.googleapis.com';
const fileHost = 'fonts.gstatic.com';
const maxBytes = 2_000_000;

export async function fetchGoogleFont(family: string) {
  const stylesheet = await fetch(`https://${stylesheetHost}/css?family=${encodeURIComponent(family)}:400`, {
    headers: { accept: 'text/css' },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!stylesheet?.ok) throw fail('fontFetchFailed', { family });

  const css = await stylesheet.text();
  const url = /src:\s*url\((https:\/\/[^)]+)\)\s*format\('truetype'\)/.exec(css)?.[1];
  if (!url || new URL(url).host !== fileHost) throw fail('fontFetchFailed', { family });

  const file = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!file?.ok) throw fail('fontFetchFailed', { family });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw fail('fontTooLarge');
  parseFont(bytes, family); // Confirma que é mesmo uma fonte antes de guardar.
  return bytes;
}

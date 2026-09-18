export const locales = ['pt', 'en'] as const;
export type Locale = (typeof locales)[number];

/** Português é o padrão do produto; o toggle grava a escolha no cookie abaixo. */
export const defaultLocale: Locale = 'pt';

/**
 * O cookie é lido pelo servidor para semear o workspace demo e para gerar a copy
 * do agente no idioma certo. Não é httpOnly: o cliente precisa escrevê-lo.
 */
export const localeCookie = 'brand-locale';

export function parseLocale(value: string | null | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

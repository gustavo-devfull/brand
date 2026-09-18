import { pt, type Dictionary } from './pt';
import { en } from './en';
import { type Locale } from './config';

export const dictionaries: Record<Locale, Dictionary> = { pt, en };
export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
export { locales, defaultLocale, localeCookie, parseLocale, type Locale } from './config';

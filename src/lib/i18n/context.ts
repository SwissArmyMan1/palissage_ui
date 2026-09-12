import { createContext, useContext } from 'react';
import { FR } from './fr';

export type Locale = 'en' | 'fr';
export type Translate = (source: string, values?: Record<string, string | number>) => string;

export function translate(
  locale: Locale,
  source: string,
  values?: Record<string, string | number>,
): string {
  const key = source.replace(/\s+/g, ' ').trim();
  const translated = locale === 'fr' && Object.hasOwn(FR, key) ? FR[key] : undefined;
  const text =
    translated === undefined
      ? source
      : `${source.startsWith(' ') ? ' ' : ''}${translated}${source.endsWith(' ') ? ' ' : ''}`;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    values?.[name] === undefined ? match : String(values[name]),
  );
}

export const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}>({ locale: 'en', setLocale: () => {}, t: (source) => source });

export function useLocale() {
  return useContext(LocaleContext);
}

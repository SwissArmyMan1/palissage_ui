import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { LocaleContext, translate, type Locale, type Translate } from './context';

const COOKIE = 'palissage-language';
function initialLocale(): Locale {
  try {
    return document.cookie.match(/(?:^|; )palissage-language=([^;]*)/)?.[1] === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* A blocked cookie does not prevent switching in this tab. */
    }
  }, []);
  const t = useCallback<Translate>((source, values) => translate(locale, source, values), [locale]);
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'fr'
        ? 'Palissage — le vin en direct des producteurs'
        : 'Palissage — wine direct from producers';
    const description =
      locale === 'fr'
        ? 'Achetez du vin directement auprès de producteurs indépendants du Cabardès. Lots disponibles et ventes en primeur. Prototype sur Arbitrum et Robinhood Chain.'
        : 'Buy wine directly from independent producers in the Cabardès. Available lots and En Primeur sales. A prototype on Arbitrum and Robinhood Chain testnets.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

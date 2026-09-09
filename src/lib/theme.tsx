import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const COOKIE = 'palissage-theme';

/**
 * The choice is persisted in a cookie rather than localStorage so a future
 * server render can emit the right theme with no flash and no post-hydration
 * resize (doc 02 section 3). The inline script in index.html reads the same
 * cookie before first paint.
 */
function readCookie(): ThemeChoice {
  if (typeof document === 'undefined') return 'system';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === 'light' || value === 'dark' ? value : 'system';
}

function writeCookie(choice: ThemeChoice) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie =
    choice === 'system'
      ? `${COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${COOKIE}=${choice}; path=/; max-age=${oneYear}; samesite=lax`;
}

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: 'light' | 'dark';
  setChoice: (choice: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readCookie);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  const setChoice = useCallback((next: ThemeChoice) => {
    const root = document.documentElement;
    // Animating every colour on the page is what makes a theme toggle feel
    // cheap. The transition is suppressed for one frame instead — doc 05.
    root.classList.add('theme-switching');
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
    writeCookie(next);
    setChoiceState(next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('theme-switching'));
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      choice,
      resolved,
      setChoice,
      toggle: () => setChoice(resolved === 'dark' ? 'light' : 'dark'),
    }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

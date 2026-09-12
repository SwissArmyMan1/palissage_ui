import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { AppRouter } from '@/router';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

/**
 * Language, theme and the toast region are shared by every route. The
 * chain providers are a lazy layout route inside the router, so a reader who
 * never leaves the marketing pages never downloads them.
 */
export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}

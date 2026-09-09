import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { AppRouter } from '@/router';

/**
 * The theme and the toast region are the only things every route needs. The
 * chain providers are a lazy layout route inside the router, so a reader who
 * never leaves the marketing pages never downloads them.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </ThemeProvider>
  );
}

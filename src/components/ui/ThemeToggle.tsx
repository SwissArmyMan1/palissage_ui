import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      className={cn(
        'grid size-9 place-items-center rounded-md text-ink-secondary transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink',
        className,
      )}
    >
      {resolved === 'dark' ? (
        <Sun aria-hidden className="size-4" strokeWidth={1.75} />
      ) : (
        <Moon aria-hidden className="size-4" strokeWidth={1.75} />
      )}
    </button>
  );
}

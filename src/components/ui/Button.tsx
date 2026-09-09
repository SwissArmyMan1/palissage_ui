import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface CommonProps {
  kind?: ButtonKind;
  size?: ButtonSize;
  /** Renders the pending state at a stable width so the layout never jumps. */
  pending?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-md border font-medium ' +
  'transition-[background-color,border-color,color,transform] duration-fast ease-out ' +
  'disabled:cursor-not-allowed select-none whitespace-nowrap ' +
  'active:enabled:[transform:scale(calc(1-0.015*var(--motion-scale)))]';

const kinds: Record<ButtonKind, string> = {
  primary:
    'bg-accent border-accent text-ink-onaccent hover:enabled:bg-accent-hover hover:enabled:border-accent-hover ' +
    'active:enabled:bg-accent-pressed ' +
    'disabled:bg-surface-disabled disabled:border-edge-disabled disabled:text-ink-disabled',
  secondary:
    'bg-surface border-edge-strong text-ink hover:enabled:bg-surface-sunken ' +
    'disabled:bg-surface-disabled disabled:border-edge-disabled disabled:text-ink-disabled',
  ghost:
    'bg-transparent border-transparent text-accent hover:enabled:bg-accent-subtle ' +
    'disabled:text-ink-disabled',
  // Outlined in light theme; filled only inside a confirmation dialog, where the
  // copy already names the object (doc 02 §2).
  danger:
    'bg-surface border-danger text-danger hover:enabled:bg-danger-subtle ' +
    'disabled:bg-surface-disabled disabled:border-edge-disabled disabled:text-ink-disabled',
};

const sizes: Record<ButtonSize, string> = {
  // >= 44px tall for a primary touch target; >= 24px is the floor everywhere.
  md: 'min-h-[42px] px-4 text-body-sm',
  sm: 'min-h-[34px] px-3 text-body-sm',
};

/**
 * Children stay direct flex items of the button. Wrapping them in a span made
 * an icon and its label stack vertically, because the base reset sets
 * `svg { display: block }`.
 */
function content(children: React.ReactNode, pending?: boolean) {
  return (
    <>
      {pending ? (
        <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : null}
      {children}
    </>
  );
}

type ButtonProps = CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { kind = 'primary', size = 'md', pending, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(base, kinds[kind], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {content(children, pending)}
    </button>
  );
});

type LinkButtonProps = CommonProps & {
  to: string;
  state?: unknown;
  'aria-label'?: string;
};

/** A navigation target styled as a button. Never used for an action. */
export function LinkButton({
  kind = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  to,
  state,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(base, kinds[kind], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** An external link styled as a button, always marked as leaving the site. */
export function ExternalButton({
  kind = 'secondary',
  size = 'md',
  className,
  children,
  href,
}: CommonProps & { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(base, kinds[kind], sizes[size], className)}
    >
      {children}
    </a>
  );
}

import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form layout: single column, labels above, help text always visible.
 * Placeholders are never labels. Required is marked in text, not by an asterisk
 * alone. Errors say what happened *and* what to do (doc 06 §3).
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  id: providedId,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => React.ReactNode;
  className?: string;
  id?: string;
}) {
  const generated = useId();
  const id = providedId ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={id} className="block text-body-sm font-medium">
        {label}
        {required ? <span className="ml-1 font-normal text-ink-secondary">(required)</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errorId} className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-body-sm text-ink-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-md border bg-surface px-3 py-2.5 text-body ' +
  'placeholder:text-ink-secondary ' +
  'transition-[border-color] duration-fast ease-out ' +
  'disabled:bg-surface-disabled disabled:text-ink-disabled disabled:border-edge-disabled';

export const TextInput = function TextInput({
  className,
  invalid,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      className={cn(
        inputBase,
        invalid ? 'border-danger' : 'border-edge-field hover:border-ink-secondary',
        className,
      )}
    />
  );
};

export function TextArea({
  className,
  invalid,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      className={cn(
        inputBase,
        'min-h-24 resize-y',
        invalid ? 'border-danger' : 'border-edge-field hover:border-ink-secondary',
        className,
      )}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...rest}
      className={cn(
        inputBase,
        'pr-8',
        invalid ? 'border-danger' : 'border-edge-field hover:border-ink-secondary',
        className,
      )}
    >
      {children}
    </select>
  );
}

/**
 * A radio presented as a card. Persistent selection carries a shape signal as
 * well as a tint, so it is never conveyed by colour alone (doc 02 §2 v2.1).
 */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  body,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: React.ReactNode;
  body?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors duration-fast ease-out',
        checked
          ? 'border-accent bg-surface-selected'
          : 'border-edge-strong bg-surface hover:bg-surface-sunken',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0">
        <span className="block text-body font-medium">{title}</span>
        {body ? <span className="mt-1 block text-body-sm text-ink-secondary">{body}</span> : null}
      </span>
    </label>
  );
}

/**
 * Integer bottles. Up/down step by 1, Page Up/Down by 10, typed entry always
 * allowed. Submit is never disabled to signal an incomplete form.
 */
export function QuantityField({
  value,
  onChange,
  max,
  min = 1,
  label,
  hint,
  error,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  max: number;
  min?: number;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  id?: string;
}) {
  const step = (delta: number) => {
    const current = Number(value.replace(/\D/g, '')) || 0;
    const next = Math.min(Math.max(current + delta, min), max);
    onChange(String(next));
  };

  return (
    <Field label={label} hint={hint} error={error} id={id}>
      {(props) => (
        <input
          {...props}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              step(-1);
            } else if (event.key === 'PageUp') {
              event.preventDefault();
              step(10);
            } else if (event.key === 'PageDown') {
              event.preventDefault();
              step(-10);
            }
          }}
          className={cn(
            inputBase,
            'tabular-nums',
            error ? 'border-danger' : 'border-edge-field hover:border-ink-secondary',
          )}
        />
      )}
    </Field>
  );
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Confirmations only — saved, copied, submitted. Errors the user must act on are
 * inline at their cause, never here (doc 03).
 *
 * Toasts live 4–6 s, 8–10 s with an action; the timer pauses on hover, on focus
 * and when the tab is hidden.
 */
interface Toast {
  id: number;
  tone: 'status' | 'alert';
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<{ push: (toast: Omit<Toast, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }]);
      const life = toast.action ? 9000 : 5000;
      window.setTimeout(() => dismiss(id), life);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-end"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'alert' ? 'alert' : 'status'}
            className={cn(
              'toast-item pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-4 shadow-2',
              toast.tone === 'alert'
                ? 'border-danger/30 bg-danger-subtle text-danger'
                : 'border-edge-subtle bg-surface-overlay text-ink',
            )}
          >
            {toast.tone === 'alert' ? (
              <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
            )}
            <p className="min-w-0 flex-1 text-body-sm">{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="shrink-0 text-body-sm font-medium text-accent underline underline-offset-4"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="-m-1 grid size-6 shrink-0 place-items-center rounded-sm opacity-70 hover:opacity-100"
            >
              <X aria-hidden className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

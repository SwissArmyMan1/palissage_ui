import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Manual activation: some panels read the chain, so arrow keys move focus and
 * Enter/Space activates. The travelling indicator is a transform on one
 * pseudo-element, not a re-layout.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-tab-id="${value}"]`);
    if (!active) return;
    setIndicator({ x: active.offsetLeft, w: active.offsetWidth });
  }, [value, tabs]);

  const move = (delta: number) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    const node = listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${next.id}"]`);
    node?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn('tab-rail flex gap-6 border-b border-edge-subtle', className)}
      style={{ ['--tab-x' as string]: `${indicator.x}px`, ['--tab-w' as string]: `${indicator.w}px` }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${tabs[0].id}"]`)?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          listRef.current
            ?.querySelector<HTMLElement>(`[data-tab-id="${tabs[tabs.length - 1].id}"]`)
            ?.focus();
        }
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px min-h-[42px] border-b-2 border-transparent pb-2 pt-1 text-body-sm transition-colors duration-fast ease-out',
              selected ? 'font-semibold text-ink' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0} className="outline-none">
      {children}
    </div>
  );
}

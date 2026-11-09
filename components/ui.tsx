import type { KeyboardEvent, ReactNode } from 'react';

/** Joins class names, dropping falsy entries. */
export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type Tone = 'neutral' | 'info' | 'accent' | 'good' | 'warn' | 'bad';

export function Chip({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('chip', `chip-${tone}`, className)}>{children}</span>;
}

export function Callout({ tone = 'info', children, className, role }: { tone?: Exclude<Tone, 'neutral'>; children: ReactNode; className?: string; role?: string }) {
  return <div role={role} className={cx('callout', `callout-${tone}`, className)}>{children}</div>;
}

/**
 * Arrow-key movement for a tab list or radio group: one stop in the tab order,
 * arrows (plus Home and End) move both focus and selection, as the ARIA
 * patterns for those roles expect. The options must be sibling elements.
 */
export function moveSelection(event: KeyboardEvent<HTMLElement>, index: number, count: number, select: (next: number) => void, vertical = true) {
  const forward = event.key === 'ArrowRight' || (vertical && event.key === 'ArrowDown');
  const back = event.key === 'ArrowLeft' || (vertical && event.key === 'ArrowUp');
  const next = forward ? (index + 1) % count : back ? (index - 1 + count) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
  if (next === null) return;
  event.preventDefault();
  select(next);
  (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
}

/** A row of mutually exclusive choices rendered as a segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label, className }: { value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div className={cx('segmented', className)} role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => moveSelection(event, index, options.length, (next) => onChange(options[next].id), false)}
        >{option.label}</button>
      ))}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lede, action }: { eyebrow?: string; title: string; lede?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h1 mt-1">{title}</h1>
        {lede && <p className="lede mt-3 max-w-2xl">{lede}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

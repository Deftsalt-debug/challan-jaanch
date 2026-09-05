import type { ReactNode } from 'react';

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

/** A row of mutually exclusive choices rendered as a segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label, className }: { value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div className={cx('segmented', className)} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" role="tab" aria-selected={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>
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

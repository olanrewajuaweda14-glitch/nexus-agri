import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="space-y-3" id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id ? `${id}-h` : undefined} className="font-display text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {aside && <div className="text-sm text-ink-3">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 font-mono text-[10.5px] leading-4 text-ink-3">{children}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function ErrorNote({ title, detail, onRetry }: { title: string; detail?: string | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex items-start gap-3 border-clay/30 bg-clay-soft/50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-clay" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {detail && <p className="mt-0.5 text-sm text-ink-2">{detail}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost shrink-0 px-3 py-1.5 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}

export function Stat({ label, value, unit, note, tone }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: 'leaf' | 'rain' | 'sun' | 'clay' }) {
  const color = tone ? { leaf: 'text-leaf', rain: 'text-rain', sun: 'text-sun', clay: 'text-clay' }[tone] : 'text-ink';
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 flex items-baseline gap-1 ${color}`}>
        <span className="num text-2xl font-medium">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {note && <div className="mt-0.5 text-xs text-ink-3">{note}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${value === o.value ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

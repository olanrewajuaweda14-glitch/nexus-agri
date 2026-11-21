import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { CountUp } from './motion';

export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="space-y-3" id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="flex items-center justify-between gap-3">
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

export function Stat({ label, value, unit, note, tone, decimals = 0, format }: { label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: 'leaf' | 'rain' | 'sun' | 'clay'; decimals?: number; format?: (n: number) => string }) {
  const color = tone ? { leaf: 'text-leaf', rain: 'text-rain', sun: 'text-sun', clay: 'text-clay' }[tone] : 'text-ink';
  if (typeof value === 'number') value = <CountUp value={value} format={format ?? ((n) => n.toFixed(decimals))} />;
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

/**
 * Number box that lets people clear and retype freely (a plain controlled
 * <input type=number> snaps back to 0), and shows thousands separators when
 * not being edited so ₦495,000 is easy to read.
 */
export function NumberInput({ value, onChange, className = '', grouped = false, ...rest }: { value: number; onChange: (n: number) => void; className?: string; grouped?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const fmt = (n: number) => (grouped ? n.toLocaleString('en-NG', { maximumFractionDigits: 2 }) : String(n));
  const [text, setText] = useState(() => fmt(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(fmt(value));
  }, [value, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={(e) => {
        setEditing(true);
        setText(String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setEditing(false);
        setText(fmt(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        setText(raw);
        const n = parseFloat(raw);
        onChange(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
    />
  );
}

/** Ring that fills as the week's jobs are ticked off. */
export function ProgressRing({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 3.5;
  const c = 2 * Math.PI * r;
  const f = total ? done / total : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} jobs done this week`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-2)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-leaf)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }}
        />
      </svg>
      <span key={done} className={`num absolute inset-0 flex items-center justify-center text-[11px] font-medium ${complete ? 'text-leaf' : 'text-ink-2'} [animation:pop_380ms_var(--ease-spring)]`}>
        {done}/{total}
      </span>
    </div>
  );
}

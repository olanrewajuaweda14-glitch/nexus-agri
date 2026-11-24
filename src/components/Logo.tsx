/**
 * The mark: a sprout over three furrows. Forest green with a maize-gold sprout
 * on light pages; on the green navigation it turns gold so it still stands out.
 */
export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  const ground = onDark ? 'var(--color-maize)' : 'var(--color-forest)';
  const lines = onDark ? 'var(--color-forest)' : 'var(--color-forest-ink-2)';
  const sprout = onDark ? 'var(--color-forest)' : 'var(--color-maize)';
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={ground} />
        <path d="M6 22h20M6 17.5h20M6 13h20" stroke={lines} strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
        <path d="M16 25V11m0 0c0-3 2.5-5 6-5 0 3.5-2.5 5.5-6 5Zm0 3c0-2.6-2.2-4.4-5.2-4.4 0 3 2.2 4.8 5.2 4.4Z" stroke={sprout} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!compact && <span className={`text-lg font-bold tracking-tight ${onDark ? 'text-forest-ink' : 'text-ink'}`}>Nexus Agri</span>}
    </div>
  );
}

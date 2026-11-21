export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--color-leaf)" />
        <path d="M6 22h20M6 17.5h20M6 13h20" stroke="#f2ede2" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
        <path d="M16 25V11m0 0c0-3 2.5-5 6-5 0 3.5-2.5 5.5-6 5Zm0 3c0-2.6-2.2-4.4-5.2-4.4 0 3 2.2 4.8 5.2 4.4Z" stroke="#f2ede2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!compact && <span className="font-display text-lg font-semibold tracking-tight">Nexus Agri</span>}
    </div>
  );
}

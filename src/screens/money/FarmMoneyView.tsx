import { useMemo, useState } from 'react';
import { Coins, HandCoins } from 'lucide-react';
import type { Farm } from '../../lib/types';
import { allRecords } from '../../lib/records';
import { farmEntries, farmMoney, PERIODS, periodStart, type Period } from '../../lib/ledger';
import { localToday, shortDate } from '../../lib/dates';
import { naira } from '../../lib/format';
import { useHub } from '../../lib/hub';
import { useNav } from '../../lib/nav';
import { Segmented } from '../../components/ui';
import { CountUp } from '../../components/motion';

/**
 * The whole farm's money: what came in, what went out, which part of the farm
 * pays its way, and where the money goes. Only recorded entries count.
 */
export function FarmMoneyView({ farms }: { farms: Farm[] }) {
  const hub = useHub();
  const nav = useNav();
  const today = localToday();
  const [period, setPeriod] = useState<Period>('year');
  const [all, setAll] = useState(false);
  const input = useMemo(
    () => ({ farms, recordsOf: allRecords, groups: hub.groups, events: hub.events, ledger: hub.ledger, stock: hub.stock, moves: hub.moves, from: periodStart(period, today), to: today }),
    [farms, hub.groups, hub.events, hub.ledger, hub.stock, hub.moves, period, today],
  );
  const m = useMemo(() => farmMoney(input), [input]);
  const lines = useMemo(() => farmEntries(input), [input]);
  const max = Math.max(1, ...m.parts.map((p) => Math.max(p.in, p.out)));
  const shown = all ? lines : lines.slice(0, 8);
  const ahead = m.net >= 0;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">The whole farm</h1>
          <p className="mt-1 max-w-prose text-ink-2">Every field and animal group, from what you recorded. Nothing here is estimated.</p>
        </header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-bold text-ink-3">Showing</span>
          <Segmented wrap label="Period" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="eyebrow">Money in</dt>
            <dd className="num text-2xl font-bold text-leaf sm:text-3xl"><CountUp value={m.in} format={(n) => naira(n, true)} /></dd>
          </div>
          <div>
            <dt className="eyebrow">Money out</dt>
            <dd className="num text-2xl font-bold sm:text-3xl"><CountUp value={m.out} format={(n) => naira(n, true)} /></dd>
          </div>
          <div>
            <dt className="eyebrow">{ahead ? 'Ahead by' : 'Behind by'}</dt>
            <dd className={`num text-2xl font-bold sm:text-3xl ${ahead ? 'text-leaf' : 'text-clay'}`}><CountUp value={Math.abs(m.net)} format={(n) => naira(n, true)} /></dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost press" onClick={() => nav.record('spent')}>
            <Coins className="h-4 w-4" aria-hidden /> Money spent
          </button>
          <button type="button" className="btn btn-ghost press" onClick={() => nav.record('received')}>
            <HandCoins className="h-4 w-4" aria-hidden /> Money received
          </button>
        </div>
      </div>

      {m.parts.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-5 text-[17px]">
          Nothing recorded for {PERIODS.find((p) => p.value === period)!.label.toLowerCase()}. Use Record to write down what you spend and sell; it adds up here by field and by animal group.
        </p>
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="parts-h">
            <h2 id="parts-h" className="text-[21px] font-bold">Which part of the farm pays</h2>
            <ul className="divide-y divide-line-2 rounded-xl border border-line bg-card" aria-label="Money by part of the farm">
              {m.parts.map((p) => (
                <li key={p.id} className="space-y-2 px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-bold">{p.name}</span>
                    <span className={`num shrink-0 font-bold ${p.net >= 0 ? 'text-leaf' : 'text-clay'}`}>{p.net >= 0 ? '+' : '−'}{naira(Math.abs(p.net), true)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-px" aria-hidden>
                    <div className="flex h-2.5 justify-end rounded-l-full bg-line-2">
                      <div className="h-full rounded-l-full bg-soil origin-right [animation:grow-x_600ms_var(--ease-out)_both]" style={{ width: `${(p.out / max) * 100}%` }} />
                    </div>
                    <div className="flex h-2.5 rounded-r-full bg-line-2">
                      <div className="h-full rounded-r-full bg-leaf origin-left [animation:grow-x_600ms_var(--ease-out)_both]" style={{ width: `${(p.in / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[13px] text-ink-3">
                    <span>Out {naira(p.out, true)}</span>
                    <span>In {naira(p.in, true)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {m.costs.length > 0 && (
            <section className="space-y-3" aria-labelledby="costs-h">
              <h2 id="costs-h" className="text-[21px] font-bold">Where the money goes</h2>
              <ul className="space-y-3 rounded-xl border border-line bg-card p-4" aria-label="Spending by kind">
                {m.costs.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span>{c.label}</span>
                      <span className="num shrink-0 font-bold">
                        {naira(c.amount, true)} <span className="font-normal text-ink-3">{Math.round(c.share * 100)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line-2" aria-hidden>
                      <div className="h-full rounded-full bg-soil origin-left [animation:grow-x_600ms_var(--ease-out)_both]" style={{ width: `${Math.max(2, c.share * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3" aria-labelledby="lines-h">
            <h2 id="lines-h" className="text-[21px] font-bold">Latest entries</h2>
            <ul className="divide-y divide-line-2 rounded-xl border border-line bg-card" aria-label="Latest money entries">
              {shown.map((l) => (
                <li key={l.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="num w-14 shrink-0 text-sm text-ink-3">{shortDate(l.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.label}</span>
                    <span className="block truncate text-[13px] text-ink-3">{l.part}</span>
                  </span>
                  <span className={`num shrink-0 font-bold ${l.dir === 'in' ? 'text-leaf' : ''}`}>{l.dir === 'in' ? '+' : '−'}{naira(l.amount)}</span>
                </li>
              ))}
            </ul>
            {lines.length > shown.length && (
              <button type="button" className="font-bold text-leaf hover:underline" onClick={() => setAll(true)}>
                Show all {lines.length} entries
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Budget, Farm } from '../lib/types';
import { CROPS } from '../lib/crops';
import { economics, sensitivity } from '../lib/engine/economics';
import { naira } from '../lib/format';
import { KEYS, load, save } from '../lib/storage';
import { Section, Stat } from '../components/ui';

interface Stored extends Budget {
  edited: boolean;
}

const fresh = (farm: Farm): Stored => ({ ...structuredClone(CROPS[farm.crop].exampleBudget), edited: false });

export function Money({ farm }: { farm: Farm }) {
  const storageKey = KEYS.budget(`${farm.id}:${farm.crop}`);
  const [b, setB] = useState<Stored>(() => load(storageKey, fresh(farm)));
  useEffect(() => { setB(load(storageKey, fresh(farm))); }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (patch: Partial<Stored>) => {
    const next = { ...b, ...patch, edited: true };
    setB(next);
    save(storageKey, next);
  };

  const e = useMemo(() => economics(b, farm.sizeHa), [b, farm.sizeHa]);
  const grid = useMemo(() => sensitivity(b, farm.sizeHa), [b, farm.sizeHa]);
  const steps = [-30, -15, 0, 15, 30];
  const crop = CROPS[farm.crop];
  const profitable = e.profit >= 0;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="eyebrow">{crop.name} · {farm.sizeHa} ha</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {profitable ? 'Expected profit ' : 'Expected loss '}
          <span className={`num font-medium ${profitable ? 'text-leaf' : 'text-clay'}`}>{naira(Math.abs(e.profit), true)}</span>
        </h1>
        {!b.edited && (
          <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">
            These are <b>example figures</b> to show how the sums work. Prices change by the month and by market — enter what you actually pay and what buyers near you offer.
          </p>
        )}
      </header>

      <div className="card grid grid-cols-2 gap-x-6 gap-y-6 p-4 sm:grid-cols-3">
        <Stat label="Total cost" value={naira(e.totalCost, true)} note={`${naira(e.costPerHa, true)} per ha`} />
        <Stat label="Revenue" value={naira(e.revenue, true)} note={`${(b.yieldTHa * farm.sizeHa).toFixed(1)} t × ${naira(b.pricePerTon, true)}`} />
        <Stat label="Margin" value={e.marginPct != null ? Math.round(e.marginPct) : '–'} unit="%" tone={profitable ? 'leaf' : 'clay'} note="profit ÷ revenue" />
        <Stat label="Break-even yield" value={e.breakEvenYield?.toFixed(2) ?? '–'} unit="t/ha" note={e.breakEvenYield != null ? `${Math.round((e.breakEvenYield / Math.max(b.yieldTHa, 0.01)) * 100)}% of your expected yield` : undefined} />
        <Stat label="Break-even price" value={e.breakEvenPrice != null ? naira(e.breakEvenPrice, true) : '–'} unit="/t" note={e.breakEvenPrice != null ? `₦${Math.round(e.breakEvenPrice / 1000)} per kg` : undefined} />
        <Stat label="Return per ₦1" value={e.returnPerNaira?.toFixed(2) ?? '–'} note="revenue ÷ cost" />
      </div>

      <Section title="Your numbers" id="inputs">
        <div className="card divide-y divide-line-2">
          <div className="grid grid-cols-2 gap-3 p-4">
            <NumField label="Expected yield" unit="t/ha" value={b.yieldTHa} step={0.1} onChange={(v) => update({ yieldTHa: v })} />
            <NumField label="Selling price" unit="₦ per tonne" value={b.pricePerTon} step={5000} onChange={(v) => update({ pricePerTon: v })} />
          </div>
          <div className="p-4">
            <div className="eyebrow mb-2">Costs per hectare</div>
            <CostBar b={b} />
            <ul className="mt-3 space-y-2">
              {b.costs.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2">
                  <input
                    aria-label="Cost item"
                    className="field flex-1 py-2"
                    value={c.label}
                    onChange={(ev) => update({ costs: b.costs.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)) })}
                  />
                  <div className="relative w-36 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
                    <input
                      aria-label={`${c.label} amount`}
                      className="field num py-2 pl-7 text-right"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={c.amount}
                      onChange={(ev) => update({ costs: b.costs.map((x, j) => (j === i ? { ...x, amount: Number(ev.target.value) || 0 } : x)) })}
                    />
                  </div>
                  <button type="button" aria-label={`Remove ${c.label}`} className="rounded-full p-2 text-ink-3 hover:bg-paper hover:text-clay" onClick={() => update({ costs: b.costs.filter((_, j) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => update({ costs: [...b.costs, { id: `c${Date.now()}`, label: 'Other', amount: 0 }] })}>
                <Plus className="h-4 w-4" /> Add cost
              </button>
              {b.edited && (
                <button type="button" className="btn px-3 py-1.5 text-sm text-ink-3 hover:text-ink" onClick={() => { const f = fresh(farm); setB(f); save(storageKey, f); }}>
                  Reset to example
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="What if yield or price moves?" id="sensitivity" aside={`profit for ${farm.sizeHa} ha`}>
        <div className="card overflow-x-auto p-4">
          <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-sm">
            <thead>
              <tr>
                <th className="eyebrow text-left font-normal">Yield ↓ / Price →</th>
                {steps.map((s) => (
                  <th key={s} scope="col" className="eyebrow font-normal">{s > 0 ? `+${s}` : s}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i}>
                  <th scope="row" className="eyebrow text-left font-normal">
                    {steps[i] > 0 ? `+${steps[i]}` : steps[i]}% <span className="normal-case tracking-normal text-ink-3">({(b.yieldTHa * (1 + steps[i] / 100)).toFixed(1)} t)</span>
                  </th>
                  {row.map((p, j) => (
                    <td key={j} className={`num rounded-md px-1 py-2 text-[13px] ${i === 2 && j === 2 ? 'ring-2 ring-ink' : ''}`} style={{ background: heat(p, e.totalCost) }}>
                      {naira(p, true)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink-2">
            A dry spell at flowering can easily cost 30% of yield, and harvest-time prices often sit 15–30% below lean-season prices. If the bottom-left corner is a loss, the plan carries real risk — storing grain to sell later or locking in an off-taker price narrows it.
          </p>
        </div>
      </Section>
    </div>
  );
}

function heat(profit: number, cost: number) {
  const t = Math.max(-1, Math.min(1, profit / Math.max(cost, 1)));
  return t >= 0 ? `color-mix(in srgb, var(--color-leaf) ${Math.round(8 + t * 40)}%, var(--color-card))` : `color-mix(in srgb, var(--color-clay) ${Math.round(8 + -t * 45)}%, var(--color-card))`;
}

const BAR_COLORS = ['#2c6a3c', '#77502e', '#a8661a', '#2b5b89', '#6b7f3a', '#a03c27', '#8a836f', '#4d6b78'];
function CostBar({ b }: { b: Budget }) {
  const total = b.costs.reduce((s, c) => s + Math.max(0, c.amount), 0);
  if (!total) return null;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Cost breakdown">
        {b.costs.map((c, i) => c.amount > 0 && (
          <div key={c.id} style={{ width: `${(c.amount / total) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} title={`${c.label}: ${Math.round((c.amount / total) * 100)}%`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
        {b.costs.map((c, i) => c.amount > 0 && (
          <span key={c.id} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
            {c.label.split(' ')[0]} {Math.round((c.amount / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function NumField({ label, unit, value, step, onChange }: { label: string; unit: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-ink-2">{label} <span className="text-ink-3">({unit})</span></span>
      <input className="field num" type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
    </label>
  );
}

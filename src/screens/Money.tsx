import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Budget, Farm } from '../lib/types';
import { CROPS } from '../lib/crops';
import { economics, sensitivity } from '../lib/engine/economics';
import { naira } from '../lib/format';
import { KEYS, load, save } from '../lib/storage';
import { NumberInput, Section, Segmented, Stat } from '../components/ui';
import type { Insights } from '../lib/useInsights';
import { ShoppingView } from './money/ShoppingView';
import { RecordsView } from './money/RecordsView';
import { StoreView } from './money/StoreView';
import { CountUp } from '../components/motion';

interface Stored extends Budget {
  edited: boolean;
}

const fresh = (farm: Farm): Stored => ({ ...structuredClone(CROPS[farm.crop].exampleBudget), edited: false });

type View = 'budget' | 'shop' | 'records' | 'store';

export function Money({ farm, ins }: { farm: Farm; ins: Insights }) {
  const storageKey = KEYS.budget(`${farm.id}:${farm.crop}`);
  const [b, setB] = useState<Stored>(() => load(storageKey, fresh(farm)));
  useEffect(() => { setB(load(storageKey, fresh(farm))); }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState<View>('budget');
  const update = (patch: Partial<Stored>) => {
    const next = { ...b, ...patch, edited: true };
    setB(next);
    save(storageKey, next);
  };
  const reset = () => {
    const f = fresh(farm);
    setB(f);
    save(storageKey, f);
  };

  return (
    <div className="space-y-7">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          label="Money tools"
          value={view}
          onChange={setView}
          options={[
            { value: 'budget', label: 'Budget' },
            { value: 'shop', label: 'Buy list' },
            { value: 'records', label: 'Records' },
            { value: 'store', label: 'Sell or store' },
          ]}
        />
      </div>
      <div key={view} className="[animation:rise_380ms_var(--ease-out)_both]">
        {view === 'budget' && <BudgetView farm={farm} b={b} update={update} reset={reset} />}
        {view === 'shop' && <ShoppingView farm={farm} ins={ins} />}
        {view === 'records' && <RecordsView farm={farm} budget={b} />}
        {view === 'store' && <StoreView farm={farm} budget={b} />}
      </div>
    </div>
  );
}

function BudgetView({ farm, b, update, reset }: { farm: Farm; b: Stored; update: (p: Partial<Stored>) => void; reset: () => void }) {

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
          <span className={`num font-medium transition-colors duration-500 ${profitable ? 'text-leaf' : 'text-clay'}`}><CountUp value={Math.abs(e.profit)} format={(n) => naira(n, true)} /></span>
        </h1>
        {!b.edited && (
          <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">
            These are <b>example figures</b> to show how the sums work. Prices change by the month and by market — enter what you actually pay and what buyers near you offer.
          </p>
        )}
      </header>

      <div className="card grid grid-cols-2 gap-x-6 gap-y-6 p-4 sm:grid-cols-3">
        <Stat label="Total cost" value={e.totalCost} format={(n: number) => naira(n, true)} note={`${naira(e.costPerHa, true)} per ha`} />
        <Stat label="Revenue" value={e.revenue} format={(n: number) => naira(n, true)} note={`${(b.yieldTHa * farm.sizeHa).toFixed(1)} t × ${naira(b.pricePerTon, true)}`} />
        <Stat label="Margin" value={e.marginPct != null ? Math.round(e.marginPct) : '–'} unit="%" tone={profitable ? 'leaf' : 'clay'} note="profit ÷ revenue" />
        <Stat label="Break-even yield" value={e.breakEvenYield ?? '–'} decimals={2} unit="t/ha" note={e.breakEvenYield != null ? `${Math.round((e.breakEvenYield / Math.max(b.yieldTHa, 0.01)) * 100)}% of your expected yield` : undefined} />
        <Stat label="Break-even price" value={e.breakEvenPrice ?? '–'} format={(n: number) => naira(n, true)} unit="/t" note={e.breakEvenPrice != null ? `₦${Math.round(e.breakEvenPrice / 1000)} per kg` : undefined} />
        <Stat label="Return per ₦1" value={e.returnPerNaira ?? '–'} decimals={2} note="revenue ÷ cost" />
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
                <li key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_9rem_auto]">
                  <input
                    aria-label="Cost item"
                    className="field min-w-0 py-2"
                    value={c.label}
                    onChange={(ev) => update({ costs: b.costs.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)) })}
                  />
                  <div className="relative w-32 sm:w-36">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
                    <NumberInput
                      aria-label={`${c.label} amount`}
                      className="field num py-2 pl-7 text-right"
                      grouped
                      value={c.amount}
                      onChange={(n) => update({ costs: b.costs.map((x, j) => (j === i ? { ...x, amount: n } : x)) })}
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
                <button type="button" className="btn px-3 py-1.5 text-sm text-ink-3 hover:text-ink" onClick={reset}>
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
                    <td key={j} className={`fade-in num rounded-md px-1 py-2 text-[13px] transition-colors duration-500 ${i === 2 && j === 2 ? 'ring-2 ring-ink' : ''}`} style={{ background: heat(p, e.totalCost), ['--i' as string]: (i + j) * 6 }}>
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
      <div className="grow-x flex h-3 overflow-hidden rounded-full" role="img" aria-label="Cost breakdown">
        {b.costs.map((c, i) => c.amount > 0 && (
          <div key={c.id} className="transition-[width] duration-500" style={{ width: `${(c.amount / total) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} title={`${c.label}: ${Math.round((c.amount / total) * 100)}%`} />
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
      <NumberInput className="field num" grouped={step >= 1000} value={value} onChange={onChange} />
    </label>
  );
}

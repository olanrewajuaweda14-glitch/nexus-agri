import { useMemo, useState } from 'react';
import type { Budget, Farm } from '../../lib/types';
import { CROPS } from '../../lib/crops';
import { sellOrStore, STORAGE_METHODS, type StorageMethod } from '../../lib/engine/store';
import { naira } from '../../lib/format';
import { load, save } from '../../lib/storage';
import { NumberInput, Section } from '../../components/ui';
import { CountUp } from '../../components/motion';
import { MarketPrice, type useMarketPrice } from '../../components/MarketPrice';
import { seasonalForecast } from '../../lib/data/prices';
import { DryCheck } from '../../components/DryCheck';
import { seasonOf } from '../../lib/seasons';

interface Inputs {
  tonnes: number;
  priceNow: number;
  priceLater: number;
  months: number;
  method: StorageMethod['id'];
  bagCost: number;
  monthlyCostPerBag: number;
  interestPct: number;
  edited: boolean;
}

export function StoreView({ farm, budget, market }: { farm: Farm; budget: Budget; market: ReturnType<typeof useMarketPrice> }) {
  const key = `na:store:${farm.id}:${seasonOf(farm)}`;
  const crop = CROPS[farm.crop];
  const perishable = farm.crop === 'tomato' || farm.crop === 'cassava';
  const defaults: Inputs = {
    tonnes: Math.round(budget.yieldTHa * farm.sizeHa * 10) / 10,
    priceNow: budget.pricePerTon,
    priceLater: Math.round((budget.pricePerTon * 1.3) / 1000) * 1000,
    months: 4,
    method: 'hermetic',
    bagCost: 3_500,
    monthlyCostPerBag: 150,
    interestPct: 0,
    edited: false,
  };
  const [v, setV] = useState<Inputs>(() => ({ ...defaults, ...load<Partial<Inputs>>(key, {}) }));
  const set = (patch: Partial<Inputs>) => {
    const next = { ...v, ...patch, edited: true };
    setV(next);
    save(key, next);
  };
  const method = STORAGE_METHODS.find((m) => m.id === v.method)!;
  const r = useMemo(
    () => sellOrStore({ tonnes: v.tonnes, priceNow: v.priceNow, priceLater: v.priceLater, months: v.months, lossPerMonth: method.lossPerMonth, bagCost: v.bagCost, monthlyCostPerBag: v.monthlyCostPerBag, interestPerMonth: v.interestPct / 100 }),
    [v, method],
  );
  const max = Math.max(r.sellNow, r.storeNet, 1);

  if (perishable) {
    return (
      <div className="card space-y-2 p-5">
        <h1 className="text-2xl font-bold">Sell or store</h1>
        <p className="text-[15px] text-ink-2">
          {crop.name} {farm.crop === 'tomato' ? 'spoils within days' : 'roots rot within 2–3 days of lifting'}, so storing to wait for a better price doesn't work the way it does for grain.{' '}
          {farm.crop === 'cassava' ? 'Leave roots in the ground and harvest in batches as you sell, or process into garri, fufu or chips, which keep for months.' : 'Plan staggered transplanting so harvests spread over several weeks, or process into paste or dried tomato.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="eyebrow">{crop.name}, after harvest</div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {r.decision === 'store' ? (
            <>Storing could earn <span className="num font-medium text-leaf"><CountUp value={r.gain} format={(n) => naira(n, true)} /></span> more</>
          ) : r.decision === 'sell' ? (
            <>Sell now — storing loses <span className="num font-medium text-clay"><CountUp value={-r.gain} format={(n) => naira(n, true)} /></span></>
          ) : (
            <>About even — no clear gain from storing</>
          )}
        </h1>
        {!v.edited && (
          <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">
            Example figures. Put in today's price near you and what you honestly expect later — the answer depends on it.
          </p>
        )}
      </header>

      <div className="card space-y-4 p-4" role="img" aria-label={`Sell now ${naira(r.sellNow)}; store ${v.months} months ${naira(r.storeNet)}`}>
        {[
          { label: 'Sell now', value: r.sellNow, color: 'bg-ink-3', note: `${v.tonnes} t × ${naira(v.priceNow, true)}/t` },
          { label: `Store ${v.months} month${v.months === 1 ? '' : 's'}, then sell`, value: r.storeNet, color: r.decision === 'sell' ? 'bg-clay' : 'bg-leaf', note: `${r.tonnesLeft.toFixed(2)} t left × ${naira(v.priceLater, true)}/t, minus costs` },
        ].map((row, i) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{row.label}</span>
              <span className="num text-lg font-medium"><CountUp value={row.value} format={(n) => naira(n, true)} /></span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-line-2">
              <div className={`grow-x h-full rounded-full ${row.color}`} style={{ width: `${Math.max(0, (row.value / max) * 100)}%`, transition: 'width 500ms var(--ease-out)', ['--i' as string]: i }} />
            </div>
            <p className="mt-1 text-xs text-ink-3">{row.note}</p>
          </div>
        ))}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line-2 pt-3 text-sm sm:grid-cols-4">
          <div><dt className="text-ink-3">Grain lost</dt><dd className="num">{(r.lostTonnes * 1000).toFixed(0)} kg</dd></div>
          <div><dt className="text-ink-3">Storage costs</dt><dd className="num">{naira(r.storageCost)}</dd></div>
          <div><dt className="text-ink-3">Interest</dt><dd className="num">{naira(r.interestCost)}</dd></div>
          <div><dt className="text-ink-3">Break-even later price</dt><dd className="num">{r.breakEvenPrice != null ? `${naira(r.breakEvenPrice / 10)}/bag` : '–'}</dd></div>
        </dl>
        <p className="text-sm text-ink-2">
          {r.breakEvenPrice != null && (
            <>Storing only pays if a 100 kg bag fetches more than <b className="num">{naira(r.breakEvenPrice / 10)}</b> in {v.months} month{v.months === 1 ? '' : 's'} (today: {naira(v.priceNow / 10)}).</>
          )}
        </p>
      </div>

      <DryCheck />

      <Section title="What prices did in past years" id="store-market">
        <MarketPrice state={market} cropName={crop.name} />
        {market.status === 'ok' && market.summary?.seasonal && (
          <button
            type="button"
            className="btn btn-ghost press mt-1 w-full sm:w-auto"
            onClick={() => {
              const s = market.summary!;
              set({ priceNow: s.latest.perTon, priceLater: seasonalForecast(s, v.months) ?? v.priceLater });
            }}
          >
            Fill prices from today's market and past years' pattern
          </button>
        )}
      </Section>

      <Section title="Your numbers" id="store-inputs">
        <div className="card grid gap-4 p-4 sm:grid-cols-2">
          <Num label="Grain to sell or store" unit="tonnes" value={v.tonnes} onChange={(n) => set({ tonnes: n })} />
          <div className="text-sm">
            <span className="mb-1 block text-ink-2">Months in store <span className="num text-ink">{v.months}</span></span>
            <input type="range" min={1} max={8} value={v.months} onChange={(e) => set({ months: Number(e.target.value) })} className="w-full accent-[var(--color-leaf)]" aria-label="Months in store" />
          </div>
          <Num label="Price now" unit="₦ per tonne" grouped value={v.priceNow} onChange={(n) => set({ priceNow: n })} hint={`${naira(v.priceNow / 10)} per 100 kg bag`} />
          <Num label="Price you expect then" unit="₦ per tonne" grouped value={v.priceLater} onChange={(n) => set({ priceLater: n })} hint={`${naira(v.priceLater / 10)} per bag, ${v.priceNow > 0 ? Math.round((v.priceLater / v.priceNow - 1) * 100) : 0}% above today`} />
          <div className="text-sm sm:col-span-2">
            <span className="mb-1 block text-ink-2">How you'll store it</span>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Storage method">
              {STORAGE_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={v.method === m.id}
                  onClick={() => set({ method: m.id })}
                  className={`press rounded-xl border px-3 py-2.5 text-left ${v.method === m.id ? 'border-leaf bg-leaf-soft' : 'border-line bg-card hover:border-ink-3'}`}
                >
                  <span className="block font-medium">{m.label}</span>
                  <span className="text-xs text-ink-3">about {(m.lossPerMonth * 100).toFixed(1)}% lost per month</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">{method.note}</p>
          </div>
          <Num label="Bags and treatment" unit="₦ per 100 kg bag, once" grouped value={v.bagCost} onChange={(n) => set({ bagCost: n })} />
          <Num label="Store rent, guarding" unit="₦ per bag per month" grouped value={v.monthlyCostPerBag} onChange={(n) => set({ monthlyCostPerBag: n })} />
          <Num label="Interest on money you're waiting for" unit="% per month" value={v.interestPct} onChange={(n) => set({ interestPct: Math.min(20, n) })} hint="If you'd borrow to cover costs while waiting, or owe a loan now. 0 if not." />
        </div>
      </Section>

      <p className="text-xs leading-relaxed text-ink-3">
        Loss rates are typical figures for well-dried grain (below 13% moisture); damp grain spoils far faster in any store. Prices can also fall — if many farmers store and sell in the same month, the lean-season rise can be smaller than expected. Warehouse receipt schemes (e.g. through commodity exchanges) can give cash now against stored grain.
      </p>
    </div>
  );
}

function Num({ label, unit, value, onChange, grouped, hint }: { label: string; unit: string; value: number; onChange: (n: number) => void; grouped?: boolean; hint?: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-ink-2">{label} <span className="text-ink-3">({unit})</span></span>
      <NumberInput className="field num" grouped={grouped} value={value} onChange={onChange} />
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

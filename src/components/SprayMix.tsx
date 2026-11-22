import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { Farm } from '../lib/types';
import { mix, waterRateFromTest, type DoseUnit } from '../lib/engine/sprayMix';
import { load, save } from '../lib/storage';
import { NumberInput, Segmented } from './ui';

interface Saved {
  dose: number;
  unit: DoseUnit;
  per: 'ha' | 'tank';
  tankL: number;
  waterLPerHa: number;
}

const DEFAULTS: Saved = { dose: 0, unit: 'L', per: 'ha', tankL: 15, waterLPerHa: 200 };
const fmt = (n: number, unit: 'ml' | 'g') => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 1 : 2)} ${unit === 'ml' ? 'L' : 'kg'}` : `${Math.round(n)} ${unit}`);

/** How much chemical goes in each knapsack, and how many tanks the field takes. */
export function SprayMix({ farm }: { farm: Farm }) {
  const [v, setV] = useState<Saved>(() => ({ ...DEFAULTS, ...load<Partial<Saved>>('na:spraymix', {}) }));
  const [area, setArea] = useState(farm.sizeHa);
  const [calibrating, setCalibrating] = useState(false);
  const [used, setUsed] = useState(0);
  const set = (patch: Partial<Saved>) => {
    const next = { ...v, ...patch };
    setV(next);
    save('na:spraymix', next);
  };
  const r = mix({ ...v, areaHa: area });

  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf"><FlaskConical className="h-[18px] w-[18px]" aria-hidden /></span>
        <div>
          <h3 className="font-semibold">Knapsack mix calculator</h3>
          <p className="text-sm text-ink-2">Too little chemical wastes the spray; too much burns the crop and your money. Use the rate printed on the label.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-sm">
          <span className="mb-1 block text-ink-2">Label rate</span>
          <div className="flex gap-2">
            <NumberInput aria-label="Label rate" className="field num w-24" value={v.dose} onChange={(n) => set({ dose: n })} />
            <select aria-label="Rate unit" className="field w-auto" value={v.unit} onChange={(e) => set({ unit: e.target.value as DoseUnit })}>
              <option value="L">litres</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="g">grams</option>
            </select>
            <select aria-label="Rate is per" className="field w-auto" value={v.per} onChange={(e) => set({ per: e.target.value as 'ha' | 'tank' })}>
              <option value="ha">per hectare</option>
              <option value="tank">per knapsack</option>
            </select>
          </div>
        </div>
        <div className="text-sm">
          <span className="mb-1 block text-ink-2">Knapsack size</span>
          <Segmented label="Knapsack size" value={String(v.tankL)} onChange={(t) => set({ tankL: Number(t) })} options={[{ value: '15', label: '15 L' }, { value: '16', label: '16 L' }, { value: '20', label: '20 L' }]} />
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Water per hectare <span className="text-ink-3">(litres)</span></span>
          <NumberInput className="field num" value={v.waterLPerHa} onChange={(n) => set({ waterLPerHa: n })} />
          <button type="button" className="mt-1 text-xs font-medium text-leaf underline-offset-2 hover:underline" onClick={() => setCalibrating((c) => !c)}>
            {calibrating ? 'Close' : "Don't know? Test your sprayer"}
          </button>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Area to spray <span className="text-ink-3">(ha)</span></span>
          <NumberInput className="field num" value={area} onChange={setArea} />
        </label>
      </div>

      {calibrating && (
        <div className="space-y-2 rounded-lg bg-paper p-3 text-sm">
          <p>Mark out <b>10 × 10 steps</b> (about 100 m²). Fill the knapsack with plain water to a mark, spray the patch at your normal walking speed, then measure how much water you used.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-2">Water used</span>
            <NumberInput aria-label="Litres used on the test patch" className="field num w-24 py-1.5" value={used} onChange={setUsed} />
            <span className="text-ink-2">litres →</span>
            <b className="num">{Math.round(waterRateFromTest(used, 100))} L/ha</b>
            <button type="button" className="btn btn-primary px-3 py-1 text-sm" disabled={!(used > 0)} onClick={() => { set({ waterLPerHa: Math.round(waterRateFromTest(used, 100)) }); setCalibrating(false); }}>Use this</button>
          </div>
        </div>
      )}

      {r ? (
        <div className="grid gap-3 rounded-xl bg-leaf-soft/60 p-4 sm:grid-cols-3" aria-live="polite">
          <div>
            <div className="eyebrow">In each knapsack</div>
            <div className="num mt-1 text-3xl font-medium text-leaf">{fmt(r.perTank, r.smallUnit)}</div>
            <div className="text-xs text-ink-2">then top up to {v.tankL} L with clean water</div>
          </div>
          <div>
            <div className="eyebrow">Tanks for {area} ha</div>
            <div className="num mt-1 text-3xl font-medium">{r.fullTanks}{r.lastTankWaterL > 0.5 ? <span className="font-sans text-base font-normal text-ink-2"> full + 1 part tank</span> : <span className="font-sans text-base font-normal text-ink-2"> full</span>}</div>
            <div className="text-xs text-ink-2">
              {r.lastTankWaterL > 0.5 ? `last tank: ${fmt(r.lastTankProduct, r.smallUnit)} in ${Math.round(r.lastTankWaterL)} L` : `one tank covers ${Math.round(r.m2PerTank)} m²`}
            </div>
          </div>
          <div>
            <div className="eyebrow">Product to buy</div>
            <div className="num mt-1 text-3xl font-medium">{fmt(r.totalProduct, r.smallUnit)}</div>
            <div className="text-xs text-ink-2">{Math.round(r.totalWaterL)} L of water in total</div>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink-2">Enter the label rate to see how much goes in each tank.</p>
      )}

      <p className="text-xs leading-relaxed text-ink-3">
        Wear gloves, boots and a face cover. Mix only what you'll spray today. Don't spray near wells or streams, and keep children and animals out of the field for the time on the label. Triple-rinse empty containers and never reuse them for food or water.
      </p>
    </div>
  );
}

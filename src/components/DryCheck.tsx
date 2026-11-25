import { useState } from 'react';
import { CheckCircle2, Circle, Sun } from 'lucide-react';

const STEPS = [
  'Put 2–3 spoons of dry cooking salt in a clean, completely dry glass bottle with a lid.',
  'Add grain until the bottle is about one-third full. Close it tightly.',
  'Shake hard for 3–5 minutes, then let it stand for 15 minutes.',
];

/**
 * The salt-and-bottle test: a free way to tell whether grain is dry enough to
 * store. Salt absorbs moisture and sticks to the glass when grain is too damp.
 */
export function DryCheck() {
  const [result, setResult] = useState<'wet' | 'dry' | null>(null);
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun-soft text-sun"><Sun className="h-[18px] w-[18px]" aria-hidden /></span>
        <div>
          <h3 className="font-bold">Is it dry enough to store?</h3>
          <p className="text-sm text-ink-2">Grain stored damp goes mouldy and can carry aflatoxin, a poison that also gets loads rejected by buyers. Aim for below 13% moisture. No meter? Do the salt test.</p>
        </div>
      </div>
      <ol className="space-y-2 text-[15px]">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-medium">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div>
        <p className="mb-2 text-sm font-medium">What do you see?</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Salt test result">
          {([
            ['wet', 'Salt sticks to the glass'],
            ['dry', 'Salt stays loose and dry'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={result === k}
              onClick={() => setResult(k)}
              className={`press flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${result === k ? (k === 'wet' ? 'border-clay bg-clay-soft' : 'border-leaf bg-leaf-soft') : 'border-line bg-card hover:border-ink-3'}`}
            >
              {result === k ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <Circle className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />}
              {label}
            </button>
          ))}
        </div>
      </div>
      {result === 'wet' && (
        <p role="status" className="rounded-lg bg-clay-soft px-3 py-2 text-sm">
          <b>Too damp to store.</b> Spread it thinly on a tarpaulin or drying sheet — never on bare ground — in full sun, and stir it a few times a day. Cover it at night and before rain. Test again in a day or two.
        </p>
      )}
      {result === 'dry' && (
        <p role="status" className="rounded-lg bg-leaf-soft px-3 py-2 text-sm">
          <b>Dry enough to store.</b> Pick out mouldy, broken and insect-damaged grain first — one bad batch spreads. Bag it in clean bags on pallets, off the floor and away from the walls.
        </p>
      )}
    </div>
  );
}

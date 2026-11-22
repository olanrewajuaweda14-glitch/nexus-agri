import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Farm } from '../../lib/types';
import type { Insights } from '../../lib/useInsights';
import { shoppingList, shoppingTotal, type ShoppingItem } from '../../lib/engine/inputs';
import { limeRequirement } from '../../lib/engine/soil';
import { relativeDay, shortDate } from '../../lib/dates';
import { naira } from '../../lib/format';
import { load, save } from '../../lib/storage';
import { NumberInput, Section, Stat } from '../../components/ui';

const pricesKey = (farm: Farm) => `na:prices:${farm.id}`;

const qtyText = (it: ShoppingItem) => {
  if (it.bags != null) return `${it.bags} bag${it.bags === 1 ? '' : 's'}`;
  return `${it.need.toLocaleString('en-NG')} ${it.unit}`;
};

export function ShoppingView({ farm, ins }: { farm: Farm; ins: Insights }) {
  const { crop, soilSummary, today } = ins;
  const limeT = soilSummary.ph != null && soilSummary.ph < crop.phRange[0] ? limeRequirement(soilSummary.ph, crop.phRange[0], soilSummary.clayPct) : 0;
  const planted = ins.stage.dap >= 0;
  const items = useMemo(() => {
    const list = shoppingList(crop, farm, limeT);
    // Lime goes on weeks before sowing; once the crop is in, it belongs to next season's list.
    return planted ? list.map((it) => (it.id === 'lime' ? { ...it, when: 'before next season', note: `${it.note} Too late for this crop — apply before the next planting.` } : it)) : list;
  }, [crop, farm, limeT, planted]);
  const [prices, setPrices] = useState<Record<string, number>>(() => load(pricesKey(farm), {}));
  const setPrice = (id: string, n: number) => {
    const next = { ...prices, [id]: n };
    setPrices(next);
    save(pricesKey(farm), next);
  };
  const total = shoppingTotal(items, prices);
  const bags = items.reduce((s, i) => s + (i.bags ?? 0), 0);

  const share = () => {
    const lines = [
      `*Inputs for ${farm.name}* — ${crop.name}, ${farm.sizeHa} ha`,
      '',
      ...items.map((it) => `• ${it.name}: ${qtyText(it)}${it.bags != null ? ` (${it.need.toLocaleString('en-NG')} kg)` : ''}${prices[it.id] > 0 && it.buyUnits > 0 ? ` — ${naira(prices[it.id] * it.buyUnits)}` : ''}`),
      ...(total.total > 0 ? ['', `Total: ${naira(total.total)}`] : []),
      '',
      'From Nexus Agri',
    ];
    const text = lines.join('\n');
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="eyebrow">{crop.name} · {farm.sizeHa} ha · one season</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">What to buy</h1>
        <p className="max-w-xl text-[15px] text-ink-2">
          Worked out from the seed rate and fertilizer schedule for {crop.name.toLowerCase()} and the size of this field. Fertilizer is rounded up to whole 50 kg bags. Add the prices your dealer quotes to see the total.
        </p>
      </header>

      <div className="card grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-3">
        <Stat label="Fertilizer & lime" value={bags} unit={bags === 1 ? 'bag' : 'bags'} note="50 kg each" />
        <Stat label={crop.seed.unit === 'bundles' ? 'Stem bundles' : 'Seed'} value={items[0].need} unit={items[0].unit} />
        <Stat label="Total cost" value={total.total} format={(n) => (n > 0 ? naira(n, true) : '—')} note={total.priced < total.payable ? `${total.priced} of ${total.payable} items priced` : 'all items priced'} />
      </div>

      <Section title="Shopping list" id="shopping">
        <ul className="card stagger divide-y divide-line-2">
          {items.map((it, i) => {
            const line = (prices[it.id] ?? 0) * it.buyUnits;
            const late = /^(by|before) \d{4}-/.test(it.when) && it.when.split(' ')[1] < today;
            return (
              <li key={it.id} className="space-y-3 p-4" style={{ ['--i' as string]: i }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{it.name}</p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {/^(by|before) \d{4}-/.test(it.when) ? (() => {
                        const [word, date] = it.when.split(' ');
                        const rel = relativeDay(date, today);
                        return <>Needed {word} <span className={late ? 'font-medium text-clay' : ''}>{rel}</span>{rel !== shortDate(date) && <> ({shortDate(date)})</>}{late && ' — already passed'}</>;
                      })() : <>Needed {it.when}</>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num text-xl font-medium">{qtyText(it)}</div>
                    {it.bags != null && <div className="num text-xs text-ink-3">{it.need.toLocaleString('en-NG')} kg needed</div>}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-ink-2">{it.note}</p>
                {it.buyUnits > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="relative w-40">
                      <span className="sr-only">Price per {it.priceUnit} for {it.name}</span>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
                      <NumberInput className="field num py-2 pl-7 pr-3" grouped value={prices[it.id] ?? 0} onChange={(n) => setPrice(it.id, n)} />
                    </label>
                    <span className="text-sm text-ink-3">per {it.priceUnit}</span>
                    {line > 0 && <span className="num ml-auto text-sm font-medium">{naira(line)}</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={share}>
        <Share2 className="h-4 w-4" aria-hidden /> Send list to your input dealer
      </button>
      <p className="text-xs leading-relaxed text-ink-3">
        Rates are standard Nigerian extension recommendations for an average field. A soil test can cut fertilizer spending — the Field tab takes lab results. Buy sealed bags from registered dealers; fake and adulterated fertilizer is common.
      </p>
    </div>
  );
}

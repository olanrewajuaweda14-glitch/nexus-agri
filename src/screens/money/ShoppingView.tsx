import { useMemo, useState } from 'react';
import { PackagePlus, Share2 } from 'lucide-react';
import type { Farm } from '../../lib/types';
import type { Insights } from '../../lib/useInsights';
import { shoppingList, shoppingTotal, type ShoppingItem } from '../../lib/engine/inputs';
import { limeRequirement } from '../../lib/engine/soil';
import { relativeDay, shortDate } from '../../lib/dates';
import { naira } from '../../lib/format';
import { load, save } from '../../lib/storage';
import { NumberInput, Section, Stat } from '../../components/ui';
import { useHub } from '../../lib/hub';
import { addRecord } from '../../lib/records';
import { balance, findByKey, newId, qtyText as stockQty, unitText, type StockItem, type UnitId } from '../../lib/stock';
import { localToday } from '../../lib/dates';

const pricesKey = (farm: Farm) => `na:prices:${farm.id}`;

const qtyText = (it: ShoppingItem) => {
  if (it.bags != null) return `${it.bags} bag${it.bags === 1 ? '' : 's'}`;
  return `${it.need.toLocaleString('en-NG')} ${it.unit}`;
};

export function ShoppingView({ farm, ins, onRecord }: { farm: Farm; ins: Insights; onRecord?: () => void }) {
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
  const [buying, setBuying] = useState<string | null>(null);
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
        <div className="eyebrow">{crop.name}, {farm.sizeHa} ha, one season</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What to buy</h1>
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
                    <p className="font-bold">{it.name}</p>
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
                <InStore it={it} late={late} />
                {it.buyUnits > 0 && it.id !== 'inoculant' && (
                  buying === it.id ? (
                    <BoughtForm it={it} farm={farm} price={prices[it.id] ?? 0} onDone={() => setBuying(null)} />
                  ) : (
                    <button type="button" className="inline-flex items-center gap-1.5 text-sm font-bold text-leaf hover:underline" onClick={() => setBuying(it.id)}>
                      <PackagePlus className="h-4 w-4" aria-hidden /> Bought some? Add it to the store
                    </button>
                  )
                )}
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
      {onRecord && (
        <button type="button" className="ml-1 text-sm font-medium text-leaf underline-offset-2 hover:underline sm:ml-3" onClick={onRecord}>
          Bought it? Record what you paid
        </button>
      )}
      <p className="text-xs leading-relaxed text-ink-3">
        Rates are standard Nigerian extension recommendations for an average field. A soil test can cut fertilizer spending — the Field tab takes lab results. Buy sealed bags from registered dealers; fake and adulterated fertilizer is common.
      </p>
    </div>
  );
}

/** The store unit that matches a buy-list line: 50 kg bags for fertilizer and lime, the seed unit otherwise. */
const storeUnit = (it: ShoppingItem): UnitId => (it.bags != null ? 'bag50' : it.unit === 'g' ? 'g' : it.unit === 'bundles' ? 'bundles' : 'kg');
const needUnits = (it: ShoppingItem) => it.bags ?? it.need;

/** What the store already holds for this line, and what is left to buy. */
function InStore({ it, late }: { it: ShoppingItem; late: boolean }) {
  const { stock, moves } = useHub();
  const item = findByKey(stock, it.id);
  if (!item) return null;
  const have = balance(item.id, moves);
  const unit = storeUnit(it);
  const short = Math.max(0, needUnits(it) - have);
  return (
    <p className="rounded-lg bg-leaf-soft/60 px-3 py-2 text-sm">
      In your store: <b>{stockQty(have)} {unitText(unit, have)}</b>
      {!late && (short > 0 ? <>, so buy <b>{stockQty(short)}</b> more.</> : <>, enough for this season.</>)}
    </p>
  );
}

function BoughtForm({ it, farm, price, onDone }: { it: ShoppingItem; farm: Farm; price: number; onDone: () => void }) {
  const hub = useHub();
  const unit = storeUnit(it);
  const [qty, setQty] = useState(0);
  const [paid, setPaid] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(qty > 0)) return setError(`How many ${unitText(unit, 2)} did you buy?`);
    const date = localToday();
    let item = findByKey(hub.stock, it.id);
    if (!item) {
      const created: StockItem = { id: newId('s'), name: it.name, category: it.id === 'seed' ? 'seed' : 'fertilizer', unit, key: it.id, createdAt: new Date().toISOString() };
      hub.saveItem(created);
      item = created;
    }
    const amount = paid > 0 ? paid : 0;
    hub.addMove({ itemId: item.id, date, kind: 'in', qty, amount: amount || undefined, note: `For ${farm.name}` });
    if (amount) addRecord(farm, { date, kind: 'expense', category: it.id === 'seed' ? 'seed' : 'fert', label: `${it.name}: ${stockQty(qty)} ${unitText(unit, qty)}`, amount });
    onDone();
  };
  return (
    <form onSubmit={save} className="space-y-3 rounded-lg bg-paper p-3 ring-1 ring-line" aria-label={`Bought ${it.name}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-bold">How many {unitText(unit, 2)}</span>
          <NumberInput
            className="field num"
            value={qty}
            onChange={(n) => {
              setQty(n);
              if (price > 0) setPaid(Math.round(n * (it.bags != null ? price : price * (it.unit === 'g' ? 0.001 : 1))));
            }}
            aria-label={`How many ${unitText(unit, 2)}`}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold">Paid in total</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
            <NumberInput className="field num pl-7" grouped value={paid} onChange={setPaid} aria-label="Paid in total" />
          </span>
        </label>
      </div>
      <p className="text-sm text-ink-3">Goes into the store, and what you paid goes into this field's record book.</p>
      {error && <p role="alert" className="text-sm text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary px-4 py-2 text-sm">Save</button>
        <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

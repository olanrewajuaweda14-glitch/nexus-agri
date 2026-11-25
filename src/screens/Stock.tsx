import { useEffect, useState } from 'react';
import { Minus, Plus, Scale, Trash2 } from 'lucide-react';
import type { Farm } from '../lib/types';
import { CATEGORIES, UNITS, balance, isLow, newId, qtyText, unitText, type StockCategory, type StockItem, type StockMove, type UnitId } from '../lib/stock';
import { addRecord } from '../lib/records';
import { localToday, shortDate } from '../lib/dates';
import { naira } from '../lib/format';
import { useHub } from '../lib/hub';
import { NumberInput } from '../components/ui';

/** Where a purchase's cost goes, so it is not typed in twice. */
const RECORD_CATEGORY: Partial<Record<StockCategory, string>> = { fertilizer: 'fert', seed: 'seed', chemical: 'chem' };

export function Stock({ farms, openItem }: { farms: Farm[]; openItem?: string }) {
  const hub = useHub();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(openItem ?? null);
  useEffect(() => {
    if (openItem) setTimeout(() => document.getElementById(`item-${openItem}`)?.scrollIntoView({ block: 'center' }), 150);
  }, [openItem]);
  const withQty = hub.stock.map((i) => ({ item: i, qty: balance(i.id, hub.moves) }));
  const low = withQty.filter((x) => isLow(x.item, x.qty));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Store</h1>
          <p className="mt-1 max-w-prose text-ink-2">
            {hub.stock.length
              ? `${hub.stock.length} item${hub.stock.length === 1 ? '' : 's'}${low.length ? `, ${low.length} running low` : ''}. Record what comes in and goes out; the buy list takes off what you already have.`
              : 'Fertilizer, seed, chemicals, feed, medicine and harvest in store. Record what comes in and goes out; the buy list takes off what you already have.'}
          </p>
        </div>
        {!adding && (
          <button type="button" className="btn btn-accent press" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Add an item
          </button>
        )}
      </header>

      {adding && <ItemForm farms={farms} onDone={(id) => { setAdding(false); if (id) setOpen(id); }} />}

      {CATEGORIES.map((c) => {
        const list = withQty.filter((x) => x.item.category === c.id).sort((a, b) => a.item.name.localeCompare(b.item.name));
        if (!list.length) return null;
        return (
          <section key={c.id} className="space-y-3" aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="text-[21px] font-bold">{c.label}</h2>
            <ul className="divide-y divide-line-2 overflow-hidden rounded-xl border border-line bg-card">
              {list.map(({ item, qty }) => (
                <li key={item.id} id={`item-${item.id}`}>
                  <button type="button" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-paper">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.name}</span>
                      {isLow(item, qty) && <span className="text-[14px] font-bold text-sun">Running low</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-xl font-bold">{qtyText(qty)}</span>
                      <span className="block text-[13px] text-ink-3">{unitText(item.unit, qty)}</span>
                    </span>
                  </button>
                  {open === item.id && <ItemPanel item={item} qty={qty} farms={farms} />}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ItemForm({ farms, onDone }: { farms: Farm[]; onDone: (id?: string) => void }) {
  const hub = useHub();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StockCategory>('fertilizer');
  const [unit, setUnit] = useState<UnitId>('bag50');
  const [qty, setQty] = useState(0);
  const [lowAt, setLowAt] = useState(0);
  const [paid, setPaid] = useState(0);
  const [costTo, setCostTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('What is it called?');
    if (hub.stock.some((i) => i.name.toLowerCase() === name.trim().toLowerCase())) return setError('That item is already in the store. Open it to add more.');
    const item: StockItem = { id: newId('s'), name: name.trim().slice(0, 50), category, unit, lowAt: lowAt > 0 ? lowAt : undefined, createdAt: new Date().toISOString() };
    hub.saveItem(item);
    if (qty > 0) {
      const date = localToday();
      hub.addMove({ itemId: item.id, date, kind: 'in', qty, amount: paid > 0 ? paid : undefined, filed: paid > 0 && !!costTo, note: 'Starting stock' });
      if (paid > 0) recordCost(hub, farms, costTo, item, qty, paid, date);
    }
    onDone(item.id);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-card p-4" aria-label="New store item">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block font-bold">Item</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Urea, Layer mash" maxLength={50} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Kind</span>
          <select
            className="field"
            value={category}
            onChange={(e) => {
              const c = e.target.value as StockCategory;
              setCategory(c);
              setUnit(c === 'feed' ? 'bag25' : c === 'chemical' ? 'litre' : c === 'medicine' ? 'vial' : c === 'seed' ? 'kg' : c === 'produce' ? 'bag100' : 'bag50');
            }}
          >
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Counted in</span>
          <select className="field" value={unit} onChange={(e) => setUnit(e.target.value as UnitId)}>
            {UNITS.map((u) => <option key={u.id} value={u.id}>{u.many}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold">How many now</span>
          <NumberInput className="field num" value={qty} onChange={setQty} aria-label="How many now" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Warn me at <span className="font-normal text-ink-3">(optional)</span></span>
          <NumberInput className="field num" value={lowAt} onChange={setLowAt} aria-label="Warn me at" />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">What you paid <span className="font-normal text-ink-3">(optional)</span></span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
            <NumberInput className="field num pl-7" grouped value={paid} onChange={setPaid} aria-label="What you paid" />
          </span>
        </label>
      </div>
      {paid > 0 && <CostTarget farms={farms} value={costTo} onChange={setCostTo} />}
      {error && <p role="alert" className="text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary press">Add to the store</button>
        <button type="button" className="btn btn-ghost press" onClick={() => onDone()}>Cancel</button>
      </div>
    </form>
  );
}

function CostTarget({ farms, value, onChange }: { farms: Farm[]; value: string; onChange: (v: string) => void }) {
  const { groups } = useHub();
  return (
    <label className="block max-w-md">
      <span className="mb-1 block font-bold">Count the cost under</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">The whole farm's costs</option>
        {farms.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.name} record book</option>)}
        {groups.filter((g) => !g.closed).map((g) => <option key={g.id} value={`g:${g.id}`}>{g.name} costs</option>)}
      </select>
    </label>
  );
}

function recordCost(hub: ReturnType<typeof useHub>, farms: Farm[], to: string, item: StockItem, qty: number, amount: number, date: string) {
  const label = `${item.name}: ${qtyText(qty)} ${unitText(item.unit, qty)}`;
  if (to.startsWith('f:')) {
    const farm = farms.find((f) => f.id === to.slice(2));
    if (farm) addRecord(farm, { date, kind: 'expense', category: RECORD_CATEGORY[item.category] ?? 'other', label, amount });
  } else if (to.startsWith('g:')) {
    hub.addEvent(to.slice(2), { date, kind: 'cost', amount, category: item.category === 'feed' ? 'feed' : item.category === 'medicine' ? 'medicine' : 'other', note: label });
  }
}

type MoveKind = 'in' | 'out' | 'count';

function ItemPanel({ item, qty, farms }: { item: StockItem; qty: number; farms: Farm[] }) {
  const hub = useHub();
  const [mode, setMode] = useState<MoveKind | null>(null);
  const [n, setN] = useState(0);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [costTo, setCostTo] = useState('');
  const [lowAt, setLowAt] = useState(item.lowAt ?? 0);
  const [error, setError] = useState<string | null>(null);
  const history: StockMove[] = hub.moves.filter((m) => m.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 12);

  const start = (m: MoveKind) => {
    setMode(mode === m ? null : m);
    setN(m === 'count' ? qty : 0);
    setAmount(0);
    setNote('');
    setError(null);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;
    if (mode !== 'count' && !(n > 0)) return setError('Enter how many.');
    if (mode === 'out' && n > qty + 1e-9) return setError(`The store only has ${qtyText(qty)}. Use "Count" if the record is wrong.`);
    if (mode === 'count' && !(n >= 0)) return setError('Enter what you counted.');
    const date = localToday();
    hub.addMove({ itemId: item.id, date, kind: mode, qty: n, amount: mode === 'in' && amount > 0 ? amount : undefined, filed: mode === 'in' && amount > 0 && !!costTo, note: note.trim() || undefined });
    if (mode === 'in' && amount > 0) recordCost(hub, farms, costTo, item, n, amount, date);
    setMode(null);
  };

  return (
    <div className="space-y-4 border-t border-line-2 bg-paper/60 px-4 pb-4 pt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={mode === 'in'} onClick={() => start('in')} className={`btn px-3.5 py-1.5 text-sm ${mode === 'in' ? 'btn-primary' : 'btn-ghost'}`}><Plus className="h-4 w-4" aria-hidden /> Bought</button>
        <button type="button" aria-pressed={mode === 'out'} onClick={() => start('out')} className={`btn px-3.5 py-1.5 text-sm ${mode === 'out' ? 'btn-primary' : 'btn-ghost'}`}><Minus className="h-4 w-4" aria-hidden /> Used</button>
        <button type="button" aria-pressed={mode === 'count'} onClick={() => start('count')} className={`btn px-3.5 py-1.5 text-sm ${mode === 'count' ? 'btn-primary' : 'btn-ghost'}`}><Scale className="h-4 w-4" aria-hidden /> Count</button>
      </div>
      {mode && (
        <form onSubmit={save} className="space-y-3" aria-label={{ in: 'Bought', out: 'Used', count: 'Count' }[mode]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-bold">{mode === 'count' ? `How many ${unitText(item.unit, 2)} are there?` : `How many ${unitText(item.unit, 2)}`}</span>
              <NumberInput className="field num" value={n} onChange={setN} aria-label="Quantity" />
            </label>
            {mode === 'in' ? (
              <label className="block">
                <span className="mb-1 block font-bold">Paid <span className="font-normal text-ink-3">(optional)</span></span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
                  <NumberInput className="field num pl-7" grouped value={amount} onChange={setAmount} aria-label="Paid" />
                </span>
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block font-bold">{mode === 'out' ? 'Used for' : 'Note'} <span className="font-normal text-ink-3">(optional)</span></span>
                <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'out' ? 'e.g. top-dressing the back plot' : ''} maxLength={60} />
              </label>
            )}
          </div>
          {mode === 'in' && amount > 0 && <CostTarget farms={farms} value={costTo} onChange={setCostTo} />}
          {error && <p role="alert" className="text-clay">{error}</p>}
          <button type="submit" className="btn btn-primary press">Save</button>
        </form>
      )}

      {history.length > 0 && (
        <ul className="space-y-1 text-[15px]" aria-label={`${item.name} history`}>
          {history.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="num w-16 shrink-0 text-sm text-ink-3">{shortDate(m.date)}</span>
              <span className="min-w-0 flex-1">
                {m.kind === 'in' ? `+${qtyText(m.qty)} in` : m.kind === 'out' ? `−${qtyText(m.qty)} used` : `Counted ${qtyText(m.qty)}`}
                {m.amount ? `, ${naira(m.amount)}` : ''}
                {m.note ? ` (${m.note})` : ''}
              </span>
              <button type="button" onClick={() => hub.deleteMove(m.id)} className="rounded-full p-1.5 text-ink-3 hover:text-clay" aria-label="Delete this entry">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-line-2 pt-3">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Warn me at</span>
          <NumberInput className="field num w-28 py-1.5" value={lowAt} onChange={setLowAt} aria-label="Warn me at" />
        </label>
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" disabled={(item.lowAt ?? 0) === lowAt} onClick={() => hub.saveItem({ ...item, lowAt: lowAt > 0 ? lowAt : undefined })}>
          Save
        </button>
        <button
          type="button"
          className="btn ml-auto px-3 py-1.5 text-sm text-clay"
          onClick={() => confirm(`Remove ${item.name} and its history from the store?`) && hub.deleteItem(item.id)}
        >
          Remove item
        </button>
      </div>
    </div>
  );
}

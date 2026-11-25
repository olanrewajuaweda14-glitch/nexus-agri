import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, CircleCheck, CloudRain, Coins, Droplets, Egg, HandCoins, HeartCrack, Warehouse, X } from 'lucide-react';
import type { Farm } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import type { AgendaItem } from '../lib/agenda';
import type { WaterLogEntry } from '../lib/engine/water';
import { addDays, localToday } from '../lib/dates';
import { naira } from '../lib/format';
import { headCount, SPECIES, type AnimalGroup } from '../lib/livestock';
import { addRecord, removeRecord } from '../lib/records';
import type { MoneyCat } from '../lib/ledger';
import { balance, newId, qtyText, unitText, type StockCategory } from '../lib/stock';
import { useHub } from '../lib/hub';
import { AgendaList } from './Agenda';
import { NumberInput } from './ui';

import type { RecordKind as Kind } from '../lib/nav';
export interface Saved {
  text: string;
  undo: () => void;
}

const TITLE: Record<Kind, string> = {
  eggs: 'Eggs collected',
  loss: 'Animals died',
  spent: 'Money spent',
  received: 'Money received',
  rain: 'Rain at a field',
  water: 'Watered a field',
  store: 'Store in or out',
  job: 'A job is done',
};

/**
 * One place to write down anything that happened on the farm, in a few taps.
 * Each entry goes where the rest of the app already looks for it (the flock's
 * log, the field's record book, the water balance, the store), so nothing is
 * typed twice.
 */
export function RecordSheet({ farms, insights, agenda, done, toggleDone, onClose, onSaved, onOpenStore, initialKind }: {
  farms: Farm[];
  insights: Record<string, Insights>;
  agenda: AgendaItem[];
  done: Set<string>;
  toggleDone: (k: string) => void;
  onClose: () => void;
  onSaved: (s: Saved) => void;
  onOpenStore: () => void;
  initialKind?: Kind;
}) {
  const hub = useHub();
  const [kind, setKind] = useState<Kind | null>(initialKind ?? null);
  const panel = useRef<HTMLDivElement>(null);
  const groups = hub.groups.filter((g) => !g.closed);
  const layers = groups.filter((g) => SPECIES[g.species].eggs);
  const jobs = agenda.filter((a) => a.when !== 'later');

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button, input, select')?.focus();
  }, [kind]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const saved = (s: Saved) => {
    onSaved(s);
    onClose();
  };

  const tiles: { kind: Kind; Icon: typeof Egg; hint: string; show: boolean }[] = [
    { kind: 'eggs', Icon: Egg, hint: layers.length === 1 ? layers[0].name : `${layers.length} flocks`, show: layers.length > 0 },
    { kind: 'loss', Icon: HeartCrack, hint: 'Deaths and their cause', show: groups.length > 0 },
    { kind: 'spent', Icon: Coins, hint: 'Feed, fertilizer, labour…', show: true },
    { kind: 'received', Icon: HandCoins, hint: 'Sales of crops, animals, eggs', show: true },
    { kind: 'rain', Icon: CloudRain, hint: 'From your rain gauge', show: farms.length > 0 },
    { kind: 'water', Icon: Droplets, hint: 'Irrigation', show: farms.length > 0 },
    { kind: 'store', Icon: Warehouse, hint: hub.stock.length ? 'Bought or used' : 'Start your store list', show: true },
    { kind: 'job', Icon: CircleCheck, hint: jobs.length ? `${jobs.length} this week` : 'Nothing due', show: jobs.length > 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Record">
      <div className="absolute inset-0 bg-forest/55 [animation:fade_200ms_ease_both]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-2xl [animation:sheet-up_280ms_var(--ease-out)_both] sm:w-[min(560px,92vw)] sm:rounded-3xl sm:px-6 sm:pb-6"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="flex items-center gap-2 pb-3">
          {kind ? (
            <button type="button" onClick={() => setKind(null)} className="rounded-full p-2 hover:bg-card" aria-label="Back to all">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          <h2 className="flex-1 text-[22px] font-bold">{kind ? TITLE[kind] : 'What happened?'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-card" aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {!kind && (
          <ul className="grid grid-cols-2 gap-2.5">
            {tiles.filter((t) => t.show).map(({ kind: k, Icon, hint }) => (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => (k === 'store' && !hub.stock.length ? (onClose(), onOpenStore()) : setKind(k))}
                  className="press flex h-full min-h-[92px] w-full flex-col items-start gap-2 rounded-2xl border border-line bg-card p-3.5 text-left hover:border-leaf"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold leading-tight">{TITLE[k]}</span>
                    <span className="block text-[13px] leading-snug text-ink-3">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {kind === 'eggs' && <EggsForm groups={layers} onSaved={saved} />}
        {kind === 'loss' && <LossForm groups={groups} onSaved={saved} />}
        {kind === 'spent' && <MoneyForm dir="out" farms={farms} groups={groups} onSaved={saved} />}
        {kind === 'received' && <MoneyForm dir="in" farms={farms} groups={groups} onSaved={saved} />}
        {(kind === 'rain' || kind === 'water') && <WaterForm kind={kind} farms={farms} insights={insights} onSaved={saved} />}
        {kind === 'store' && <StoreForm farms={farms} groups={groups} onSaved={saved} />}
        {kind === 'job' && (
          <div className="space-y-3">
            <p className="text-ink-2">Tick what you have done. Tap a job to open it.</p>
            <AgendaList items={jobs} farms={farms} done={done} toggleDone={toggleDone} label="Jobs this week" />
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Bits ---------------------------------- */

function Field({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold">{label}</span>
      {children}
      {note && <span className="mt-1 block text-sm text-ink-3">{note}</span>}
    </label>
  );
}

function Day({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = localToday();
  const yesterday = addDays(today, -1);
  return (
    <fieldset>
      <legend className="mb-1 font-bold">When</legend>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { d: today, label: 'Today' },
          { d: yesterday, label: 'Yesterday' },
        ].map((o) => (
          <button key={o.d} type="button" aria-pressed={value === o.d} onClick={() => onChange(o.d)} className={`rounded-full border-2 px-3.5 py-1.5 font-bold ${value === o.d ? 'border-leaf bg-leaf-soft' : 'border-line bg-card'}`}>
            {o.label}
          </button>
        ))}
        <input className="field num w-auto py-1.5" type="date" value={value} max={today} onChange={(e) => onChange(e.target.value)} aria-label="Pick a day" />
      </div>
    </fieldset>
  );
}

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={`rounded-full border-2 px-3.5 py-1.5 font-bold ${value === o.value ? 'border-leaf bg-leaf-soft' : 'border-line bg-card'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Naira({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-ink-3">₦</span>
      <NumberInput className="field num py-3 pl-8 text-xl font-bold" grouped value={value} onChange={onChange} aria-label={label} />
    </span>
  );
}

function Actions({ error }: { error: string | null }) {
  return (
    <>
      {error && <p role="alert" className="text-clay">{error}</p>}
      <button type="submit" className="btn btn-primary press w-full py-3 text-base">Save</button>
    </>
  );
}

function GroupSelect({ groups, value, onChange }: { groups: AnimalGroup[]; value: string; onChange: (id: string) => void }) {
  if (groups.length < 2) return null;
  return (
    <Field label="Which group">
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </Field>
  );
}

/* --------------------------------- Forms --------------------------------- */

function EggsForm({ groups, onSaved }: { groups: AnimalGroup[]; onSaved: (s: Saved) => void }) {
  const hub = useHub();
  const [gid, setGid] = useState(groups[0].id);
  const [date, setDate] = useState(localToday());
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const g = groups.find((x) => x.id === gid)!;
  const events = hub.events[gid] ?? [];
  const hens = headCount(g, events, date);
  const already = events.filter((e) => e.kind === 'eggs' && e.date === date).reduce((s, e) => s + (e.count ?? 0), 0);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(count > 0)) return setError('Enter how many eggs you collected.');
    if (already + count > hens * 1.05) return setError(`That makes ${already + count} eggs from ${hens} hens in one day. Check the number.`);
    const ev = hub.addEvent(gid, { date, kind: 'eggs', count: Math.round(count) });
    onSaved({ text: `Saved ${Math.round(count)} eggs for ${g.name}`, undo: () => hub.deleteEvent(gid, ev.id) });
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Eggs collected">
      <GroupSelect groups={groups} value={gid} onChange={setGid} />
      <Field label="How many eggs" note={count > 0 && hens > 0 ? `${Math.round(((already + count) / hens) * 100)}% of ${hens} hens, ${qtyText(Math.floor(((already + count) / 30) * 4) / 4)} crates` : `${hens} hens in ${g.name}`}>
        <NumberInput className="field num py-3 text-xl font-bold" inputMode="numeric" value={count} onChange={setCount} aria-label="How many eggs" />
      </Field>
      {already > 0 && <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">Already {already} recorded for this day. This adds to it (morning and evening collections).</p>}
      <Day value={date} onChange={setDate} />
      <Actions error={error} />
    </form>
  );
}

const CAUSES = ['Sickness', 'Heat', 'Predator or theft', 'Accident', 'Not known'];

function LossForm({ groups, onSaved }: { groups: AnimalGroup[]; onSaved: (s: Saved) => void }) {
  const hub = useHub();
  const [gid, setGid] = useState(groups[0].id);
  const [date, setDate] = useState(localToday());
  const [count, setCount] = useState(0);
  const [cause, setCause] = useState(CAUSES[0]);
  const [error, setError] = useState<string | null>(null);
  const g = groups.find((x) => x.id === gid)!;
  const sp = SPECIES[g.species];
  const have = headCount(g, hub.events[gid] ?? [], date);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(count > 0)) return setError(`How many ${sp.many} died?`);
    if (count > have) return setError(`${g.name} only has ${have} ${have === 1 ? sp.one : sp.many} on that day.`);
    const ev = hub.addEvent(gid, { date, kind: 'died', count: Math.round(count), note: cause });
    onSaved({ text: `Recorded ${Math.round(count)} ${count === 1 ? sp.one : sp.many} lost from ${g.name}`, undo: () => hub.deleteEvent(gid, ev.id) });
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Animals died">
      <GroupSelect groups={groups} value={gid} onChange={setGid} />
      <Field label={`How many ${sp.many}`} note={`${have} in ${g.name}`}>
        <NumberInput className="field num py-3 text-xl font-bold" inputMode="numeric" value={count} onChange={setCount} aria-label={`How many ${sp.many} died`} />
      </Field>
      <Chips label="What happened" value={cause} options={CAUSES.map((c) => ({ value: c, label: c }))} onChange={setCause} />
      <Day value={date} onChange={setDate} />
      <Actions error={error} />
    </form>
  );
}

type SpendChip = 'seed' | 'fert' | 'chem' | 'labour' | 'feed' | 'medicine' | 'transport' | 'tools' | 'other';
const SPEND: { value: SpendChip; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'fert', label: 'Fertilizer' },
  { value: 'seed', label: 'Seed' },
  { value: 'chem', label: 'Chemicals' },
  { value: 'labour', label: 'Labour' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'transport', label: 'Transport' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
];
type SaleChip = 'crop' | 'animals' | 'eggs' | 'other';

function MoneyForm({ dir, farms, groups, onSaved }: { dir: 'in' | 'out'; farms: Farm[]; groups: AnimalGroup[]; onSaved: (s: Saved) => void }) {
  const hub = useHub();
  const [date, setDate] = useState(localToday());
  const [amount, setAmount] = useState(0);
  const [what, setWhat] = useState<SpendChip | null>(null);
  const [sale, setSale] = useState<SaleChip | null>(null);
  const [part, setPart] = useState('');
  const [count, setCount] = useState(0);
  const [kg, setKg] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const layers = groups.filter((g) => SPECIES[g.species].eggs);

  // A sensible "for which part of the farm", picked from what the money was for.
  const suggest = (w: SpendChip | SaleChip): string => {
    if (w === 'feed' || w === 'medicine' || w === 'animals') return groups[0] ? `g:${groups[0].id}` : 'farm';
    if (w === 'eggs') return layers[0] ? `g:${layers[0].id}` : groups[0] ? `g:${groups[0].id}` : 'farm';
    if (w === 'seed' || w === 'fert' || w === 'chem' || w === 'crop') return farms[0] ? `f:${farms[0].id}` : 'farm';
    return 'farm';
  };
  const partOptions = useMemo(
    () => [
      ...farms.map((f) => ({ value: `f:${f.id}`, label: f.name })),
      ...groups.map((g) => ({ value: `g:${g.id}`, label: g.name })),
      { value: 'farm', label: 'The whole farm' },
    ],
    [farms, groups],
  );
  const group = part.startsWith('g:') ? groups.find((g) => g.id === part.slice(2)) : undefined;
  const farm = part.startsWith('f:') ? farms.find((f) => f.id === part.slice(2)) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(amount > 0)) return setError('Enter the amount in naira.');
    if (dir === 'out' && !what) return setError('Pick what the money was for.');
    if (dir === 'in' && !sale) return setError('Pick what was sold.');
    if (!part) return setError('Pick which part of the farm it belongs to.');
    if (dir === 'in' && sale === 'animals' && group && !(count > 0)) return setError(`How many ${SPECIES[group.species].many} were sold?`);
    if (group && dir === 'in' && sale === 'animals' && count > headCount(group, hub.events[group.id] ?? [], date)) return setError(`${group.name} does not have that many.`);
    const label = dir === 'out' ? SPEND.find((s) => s.value === what)!.label : { crop: 'Crop sale', animals: 'Animals sold', eggs: 'Eggs', other: 'Other produce' }[sale!];
    const filed = fileMoney(hub, farms, groups, { dir, part, date, amount, spend: what ?? undefined, sale: sale ?? undefined, count, kg, label: note.trim() || label });
    onSaved({ text: `${dir === 'out' ? 'Spent' : 'Received'} ${naira(amount)}: ${note.trim() || label}, ${filed.where}`, undo: filed.undo });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={dir === 'out' ? 'Money spent' : 'Money received'}>
      <Field label={dir === 'out' ? 'How much' : 'How much was paid to you'}>
        <Naira value={amount} onChange={setAmount} label="Amount in naira" />
      </Field>
      {dir === 'out' ? (
        <Chips label="What for" value={what} options={SPEND} onChange={(w) => { setWhat(w); setPart(suggest(w)); }} />
      ) : (
        <Chips
          label="What was sold"
          value={sale}
          options={[
            ...(farms.length ? [{ value: 'crop' as const, label: 'Crops' }] : []),
            ...(groups.length ? [{ value: 'animals' as const, label: 'Animals' }] : []),
            ...(layers.length ? [{ value: 'eggs' as const, label: 'Eggs' }] : []),
            { value: 'other' as const, label: 'Something else' },
          ]}
          onChange={(w) => { setSale(w); setPart(suggest(w)); }}
        />
      )}
      {(what || sale) && (
        <Field label="Which part of the farm" note={partNote(part)}>
          <select className="field" value={part} onChange={(e) => setPart(e.target.value)}>
            {partOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      )}
      {dir === 'in' && sale === 'animals' && group && (
        <Field label={`How many ${SPECIES[group.species].many}`}>
          <NumberInput className="field num" inputMode="numeric" value={count} onChange={setCount} aria-label={`How many ${SPECIES[group.species].many} sold`} />
        </Field>
      )}
      {dir === 'in' && sale === 'crop' && farm && (
        <Field label="How much was sold (kg)" note="Optional. With it, the record book works out your price per bag.">
          <NumberInput className="field num" value={kg} onChange={setKg} aria-label="Kilograms sold" />
        </Field>
      )}
      <Field label="Note (optional)">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder={dir === 'out' ? 'e.g. 4 bags of layer mash' : 'e.g. to the aggregator at Bodija'} />
      </Field>
      <Day value={date} onChange={setDate} />
      <Actions error={error} />
    </form>
  );
}

const partNote = (part: string) =>
  part.startsWith('f:') ? "Goes into that field's record book." : part.startsWith('g:') ? "Goes into that group's money." : part === 'farm' ? 'For money that belongs to no one field or group.' : '';

type HubApi = ReturnType<typeof useHub>;

/**
 * Files money where the rest of the app looks for it: a field's record book,
 * a group's log, or the farm ledger. Returns where it went and how to undo it.
 */
function fileMoney(
  hub: HubApi,
  farms: Farm[],
  groups: AnimalGroup[],
  o: { dir: 'in' | 'out'; part: string; date: string; amount: number; spend?: SpendChip; sale?: SaleChip; count?: number; kg?: number; label: string },
): { where: string; undo: () => void } {
  const farm = o.part.startsWith('f:') ? farms.find((f) => f.id === o.part.slice(2)) : undefined;
  const group = o.part.startsWith('g:') ? groups.find((g) => g.id === o.part.slice(2)) : undefined;
  if (farm) {
    const cat = o.dir === 'out' ? ({ seed: 'seed', fert: 'fert', chem: 'chem', labour: 'labour', transport: 'haul' } as Record<string, string>)[o.spend ?? ''] ?? 'other' : undefined;
    const r = addRecord(farm, { date: o.date, kind: o.dir === 'out' ? 'expense' : 'sale', category: cat, label: o.label, amount: o.amount, kg: o.kg && o.kg > 0 ? o.kg : undefined });
    return { where: farm.name, undo: () => removeRecord(farm, r.id) };
  }
  if (group) {
    const ev =
      o.dir === 'out'
        ? hub.addEvent(group.id, { date: o.date, kind: 'cost', amount: o.amount, category: o.spend === 'feed' ? 'feed' : o.spend === 'medicine' ? 'medicine' : 'other', note: o.label })
        : o.sale === 'animals'
          ? hub.addEvent(group.id, { date: o.date, kind: 'sold', count: Math.round(o.count ?? 0), amount: o.amount })
          : hub.addEvent(group.id, { date: o.date, kind: 'income', amount: o.amount, note: o.label });
    return { where: group.name, undo: () => hub.deleteEvent(group.id, ev.id) };
  }
  const l = hub.addLedger({ date: o.date, kind: o.dir, amount: o.amount, category: o.dir === 'out' ? ((o.spend ?? 'other') as MoneyCat) : 'other', note: o.label });
  return { where: 'the whole farm', undo: () => hub.deleteLedger(l.id) };
}

function WaterForm({ kind, farms, insights, onSaved }: { kind: 'rain' | 'water'; farms: Farm[]; insights: Record<string, Insights>; onSaved: (s: Saved) => void }) {
  const [fid, setFid] = useState(farms[0].id);
  const [date, setDate] = useState(localToday());
  const [text, setText] = useState('');
  const [full, setFull] = useState(true);
  const [mm, setMm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ins = insights[fid];
  const farm = farms.find((f) => f.id === fid)!;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ins) return setError('This field is still loading. Try again in a moment.');
    let entry: WaterLogEntry;
    if (kind === 'rain') {
      const v = text.trim() === '' ? NaN : Number(text.trim().replace(',', '.'));
      if (text.trim() === '') return setError('Enter the gauge reading in mm (0 if it stayed dry), or pick the closest.');
      if (!(v >= 0) || v > 400) return setError('Enter the rain as a number of mm, like 12.');
      entry = { id: newId('w'), date, kind: 'rain', mm: v };
    } else {
      if (!full && !(mm > 0 && mm <= 200)) return setError('Enter how many mm you applied (up to 200).');
      entry = { id: newId('w'), date, kind: 'irrigation', ...(full ? { full: true } : { mm }) };
    }
    const before = ins.waterLog;
    ins.setWaterLog([...before, entry]);
    onSaved({
      text: kind === 'rain' ? `Saved ${entry.mm} mm of rain at ${farm.name}` : `Saved watering at ${farm.name}`,
      undo: () => ins.setWaterLog(before.filter((x) => x.id !== entry.id)),
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label={kind === 'rain' ? 'Rain at a field' : 'Watered a field'}>
      {farms.length > 1 && (
        <Field label="Which field">
          <select className="field" value={fid} onChange={(e) => setFid(e.target.value)}>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
      )}
      {kind === 'rain' ? (
        <>
          <Field label="Rain gauge reading (mm)" note="0 if it stayed dry. It replaces the weather model's rain for that day.">
            <input className="field num py-3 text-xl font-bold" type="text" inputMode="decimal" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} aria-label="Rain in mm" placeholder="mm" />
          </Field>
          <div className="flex flex-wrap gap-2" aria-label="No gauge? Pick the closest">
            {([['Light shower', 3], ['Steady rain', 10], ['Heavy storm', 30]] as const).map(([label, v]) => (
              <button key={label} type="button" aria-pressed={text === String(v)} onClick={() => setText(String(v))} className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${text === String(v) ? 'border-rain bg-rain-soft text-rain' : 'border-line bg-card text-ink-2'}`}>
                {label} ≈ {v} mm
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Chips label="How much" value={full ? 'full' : 'mm'} options={[{ value: 'full', label: 'Watered fully' }, { value: 'mm', label: 'Amount in mm' }]} onChange={(v) => setFull(v === 'full')} />
          {!full && (
            <Field label="Millimetres applied" note={mm > 0 ? `${Math.round(mm * farm.sizeHa * 10_000).toLocaleString('en-NG')} litres on ${farm.sizeHa} ha` : `1 mm on ${farm.sizeHa} ha is ${Math.round(farm.sizeHa * 10_000).toLocaleString('en-NG')} litres`}>
              <NumberInput className="field num" value={mm} onChange={setMm} aria-label="Irrigation in mm" />
            </Field>
          )}
        </>
      )}
      <Day value={date} onChange={setDate} />
      <Actions error={error} />
    </form>
  );
}

const STOCK_SPEND: Record<StockCategory, SpendChip> = { fertilizer: 'fert', seed: 'seed', chemical: 'chem', feed: 'feed', medicine: 'medicine', produce: 'other', other: 'other' };

function StoreForm({ farms, groups, onSaved }: { farms: Farm[]; groups: AnimalGroup[]; onSaved: (s: Saved) => void }) {
  const hub = useHub();
  const [itemId, setItemId] = useState(hub.stock[0].id);
  const [dir, setDir] = useState<'in' | 'out'>('out');
  const [qty, setQty] = useState(0);
  const [paid, setPaid] = useState(0);
  const [part, setPart] = useState('farm');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const item = hub.stock.find((i) => i.id === itemId)!;
  const have = balance(item.id, hub.moves);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(qty > 0)) return setError('Enter how many.');
    if (dir === 'out' && qty > have + 1e-9) return setError(`The store only has ${qtyText(have)} ${unitText(item.unit, have)}.`);
    const date = localToday();
    const label = `${item.name}: ${qtyText(qty)} ${unitText(item.unit, qty)}`;
    // Money for the whole farm stays on the store entry (and is counted from there); anything else is filed once, where it belongs.
    const filed = dir === 'in' && paid > 0 && part !== 'farm' ? fileMoney(hub, farms, groups, { dir: 'out', part, date, amount: paid, spend: STOCK_SPEND[item.category], label }) : null;
    const m = hub.addMove({ itemId, date, kind: dir, qty, amount: dir === 'in' && paid > 0 ? paid : undefined, filed: !!filed, note: note.trim() || undefined });
    onSaved({
      text: `${dir === 'in' ? 'Added' : 'Took out'} ${qtyText(qty)} ${unitText(item.unit, qty)} of ${item.name}`,
      undo: () => {
        hub.deleteMove(m.id);
        filed?.undo();
      },
    });
  };
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Store in or out">
      <Field label="Item" note={`${qtyText(have)} ${unitText(item.unit, have)} in the store`}>
        <select className="field" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {hub.stock.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Chips label="In or out" value={dir} options={[{ value: 'out', label: 'Used or sold' }, { value: 'in', label: 'Bought or harvested' }]} onChange={setDir} />
      <Field label={`How many ${unitText(item.unit, 2)}`}>
        <NumberInput className="field num py-3 text-xl font-bold" value={qty} onChange={setQty} aria-label="Quantity" />
      </Field>
      {dir === 'in' && (
        <Field label="Paid (optional)">
          <Naira value={paid} onChange={setPaid} label="Paid" />
        </Field>
      )}
      {dir === 'in' && paid > 0 && (
        <Field label="Count the cost under" note={partNote(part)}>
          <select className="field" value={part} onChange={(e) => setPart(e.target.value)}>
            {farms.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.name}</option>)}
            {groups.map((g) => <option key={g.id} value={`g:${g.id}`}>{g.name}</option>)}
            <option value="farm">The whole farm</option>
          </select>
        </Field>
      )}
      <Field label="Note (optional)">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder={dir === 'out' ? 'e.g. fed to Pen A' : 'e.g. from the dealer'} />
      </Field>
      <Actions error={error} />
    </form>
  );
}

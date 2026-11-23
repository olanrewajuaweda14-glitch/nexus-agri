import { useMemo, useState } from 'react';
import { Download, Printer, Trash2 } from 'lucide-react';
import type { Budget, Farm } from '../../lib/types';
import { CROPS } from '../../lib/crops';
import { loadRecords, recordsKey, summarize, toCsv, type FarmRecord, type RecordKind } from '../../lib/records';
import { useNav } from '../../lib/nav';
import { localToday, shortDate } from '../../lib/dates';
import { naira } from '../../lib/format';
import { KEYS, load, save } from '../../lib/storage';
import { NumberInput, Section, Segmented, Stat } from '../../components/ui';

const KIND_LABEL: Record<RecordKind, string> = { expense: 'Spent', harvest: 'Harvested', sale: 'Sold' };

export function RecordsView({ farm, budget }: { farm: Farm; budget: Budget }) {
  const key = recordsKey(farm);
  const crop = CROPS[farm.crop];
  const [records, setRecords] = useState<FarmRecord[]>(() => load(key, []));
  const commit = (next: FarmRecord[]) => {
    setRecords(next);
    save(key, next);
  };
  const s = useMemo(() => summarize(records, budget, farm.sizeHa), [records, budget, farm.sizeHa]);
  const sorted = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [records]);

  const download = () => downloadCsv(farm, crop.name, budget, records);
  const nav = useNav();
  const past = [...(farm.history ?? [])].reverse();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="eyebrow">{crop.name} · planted {shortDate(farm.plantingDate)} · {farm.sizeHa} ha</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Farm record book</h1>
        <p className="max-w-xl text-[15px] text-ink-2">
          Write down what you spend, harvest and sell as it happens. You'll know your real profit — and have the record banks, cooperatives and input-credit schemes ask for.
        </p>
      </header>

      <div className="card grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-4">
        <Stat label="Spent so far" value={s.spent} format={(n) => naira(n, true)} note={`plan: ${naira(s.planned, true)}`} tone={s.spent > s.planned && s.planned > 0 ? 'clay' : undefined} />
        <Stat label="Harvested" value={s.harvestedKg / 1000} decimals={2} unit="t" note={s.yieldTHa != null ? `${s.yieldTHa.toFixed(2)} t/ha (plan ${budget.yieldTHa})` : `plan ${s.expectedTonnes.toFixed(1)} t`} />
        <Stat label="Sales" value={s.sales} format={(n) => naira(n, true)} note={s.avgPricePerTon != null ? `avg ${naira(s.avgPricePerTon, true)}/t` : 'nothing sold yet'} />
        <Stat label="Cash so far" value={s.cashSoFar} format={(n) => naira(n, true)} tone={s.cashSoFar >= 0 ? 'leaf' : 'clay'} note={s.unsoldKg > 0 ? `${(s.unsoldKg / 1000).toFixed(2)} t still unsold` : 'sales minus spending'} />
      </div>

      <AddRecord budget={budget} onAdd={(r) => commit([...records, r])} />

      {s.spent > 0 && (
        <Section title="Spending against plan" id="vs-plan">
          <ul className="card space-y-3 p-4">
            {s.byCategory.filter((c) => c.spent > 0 || c.planned > 0).map((c, i) => {
              const max = Math.max(c.planned, c.spent, 1);
              const over = c.planned > 0 && c.spent > c.planned;
              return (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{c.label}</span>
                    <span className={`num ${over ? 'text-clay' : 'text-ink-2'}`}>{naira(c.spent, true)} <span className="text-ink-3">/ {c.planned > 0 ? naira(c.planned, true) : 'unplanned'}</span></span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-line-2">
                    {c.planned > 0 && <div className="absolute inset-y-0 left-0 rounded-full border border-ink-3/40" style={{ width: `${(c.planned / max) * 100}%` }} />}
                    <div className={`grow-x absolute inset-y-0 left-0 rounded-full ${over ? 'bg-clay' : 'bg-leaf'}`} style={{ width: `${(c.spent / max) * 100}%`, ['--i' as string]: i }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Entries" id="entries" aside={records.length ? `${records.length}` : undefined}>
        {sorted.length === 0 ? (
          <p className="card p-5 text-[15px] text-ink-2">No entries yet. Start with what you've already spent this season — seed, fertilizer, land preparation. Quicker from now on: tick a job off on the Plan tab and it asks what it cost.</p>
        ) : (
          <ul className="card divide-y divide-line-2">
            {sorted.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${r.kind === 'expense' ? 'bg-clay' : r.kind === 'sale' ? 'bg-leaf' : 'bg-sun'}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.label}</p>
                  <p className="text-xs text-ink-3">
                    {shortDate(r.date)} · {KIND_LABEL[r.kind]}
                    {r.kind === 'expense' && r.category ? ` · ${budget.costs.find((c) => c.id === r.category)?.label ?? 'Other'}` : ''}
                    {r.kg ? ` · ${r.kg.toLocaleString('en-NG')} kg` : ''}
                  </p>
                </div>
                {r.amount != null && <span className={`num shrink-0 text-sm font-medium ${r.kind === 'expense' ? 'text-clay' : 'text-leaf'}`}>{r.kind === 'expense' ? '−' : '+'}{naira(r.amount)}</span>}
                <button
                  type="button"
                  className="shrink-0 rounded-full p-2 text-ink-3 hover:bg-paper hover:text-clay"
                  aria-label={`Delete "${r.label}"`}
                  onClick={() => confirm(`Delete "${r.label}"?`) && commit(records.filter((x) => x.id !== r.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {records.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost press" onClick={download}>
            <Download className="h-4 w-4" aria-hidden /> Download spreadsheet
          </button>
          <button type="button" className="btn btn-ghost press" onClick={() => printRecord(farm, crop.name, budget, sorted, s)}>
            <Printer className="h-4 w-4" aria-hidden /> Print or save as PDF
          </button>
        </div>
      )}
      <p className="text-xs text-ink-3">
        Records are saved on this phone for this season. Back them up now and then (Back up or move phones, in the farm menu at the top) so a lost phone doesn't lose your season.
      </p>
      {records.length > 0 && (
        <button type="button" className="text-sm font-medium text-leaf underline-offset-2 hover:underline" onClick={nav.startSeason}>
          Finished this season? Start the next one →
        </button>
      )}

      {past.length > 0 && (
        <Section title="Past seasons" id="past-seasons" aside={`${past.length}`}>
          <ul className="space-y-2">
            {past.map((h) => {
              const seasonFarm: Farm = { ...farm, crop: h.crop, plantingDate: h.plantingDate, maturity: h.maturity, sizeHa: h.sizeHa, seasonId: h.seasonId };
              const name = CROPS[h.crop].name;
              const recs = () => loadRecords(farm, h.seasonId);
              const pastBudget = load(KEYS.budget(`${farm.id}:${h.crop}`), CROPS[h.crop].exampleBudget);
              const cash = h.sales - h.spent;
              return (
                <li key={h.seasonId} className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{name} <span className="font-normal text-ink-3">· planted {shortDate(h.plantingDate)} {h.plantingDate.slice(0, 4)} · {h.sizeHa} ha</span></p>
                    <p className={`num text-sm font-medium ${cash > 0 ? 'text-leaf' : cash < 0 ? 'text-clay' : 'text-ink-3'}`}>{cash > 0 ? '+' : cash < 0 ? '−' : ''}{naira(Math.abs(cash), true)} cash</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div><dt className="text-ink-3">Yield</dt><dd className="num">{h.harvestedKg > 0 ? `${(h.harvestedKg / 1000 / Math.max(h.sizeHa, 0.01)).toFixed(2)} t/ha` : '—'}</dd></div>
                    <div><dt className="text-ink-3">Spent</dt><dd className="num">{naira(h.spent, true)}</dd></div>
                    <div><dt className="text-ink-3">Sales</dt><dd className="num">{naira(h.sales, true)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => downloadCsv(seasonFarm, name, pastBudget, recs())}>
                      <Download className="h-4 w-4" aria-hidden /> Spreadsheet
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => {
                        const r = recs();
                        printRecord(seasonFarm, name, pastBudget, [...r].sort((a, b) => b.date.localeCompare(a.date)), summarize(r, pastBudget, h.sizeHa));
                      }}
                    >
                      <Printer className="h-4 w-4" aria-hidden /> Print
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}

function AddRecord({ budget, onAdd }: { budget: Budget; onAdd: (r: FarmRecord) => void }) {
  const [kind, setKind] = useState<RecordKind>('expense');
  const [date, setDate] = useState(localToday());
  const [category, setCategory] = useState(budget.costs[0]?.id ?? 'other');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState(0);
  const [qty, setQty] = useState(0);
  const [unit, setUnit] = useState<'kg' | 'bag'>('bag');
  const [error, setError] = useState<string | null>(null);

  const kg = unit === 'bag' ? qty * 100 : qty;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem =
      !date ? 'Enter the date.'
      : date > localToday() ? 'The date is in the future.'
      : kind !== 'harvest' && amount <= 0 ? 'Enter the amount in naira.'
      : kind !== 'expense' && kg <= 0 ? 'Enter how much.'
      : null;
    if (problem) return setError(problem);
    setError(null);
    const fallback = kind === 'expense' ? budget.costs.find((c) => c.id === category)?.label ?? 'Expense' : kind === 'harvest' ? 'Harvest' : 'Sale';
    onAdd({
      id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      date,
      kind,
      category: kind === 'expense' ? category : undefined,
      label: label.trim() || fallback,
      amount: kind === 'harvest' ? undefined : amount,
      kg: kind === 'expense' ? undefined : Math.round(kg),
    });
    setLabel('');
    setAmount(0);
    setQty(0);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-4" aria-label="Add an entry">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Add an entry</h2>
        <Segmented label="Entry type" value={kind} onChange={(k) => { setKind(k); setError(null); }} options={[{ value: 'expense', label: 'Spent' }, { value: 'harvest', label: 'Harvested' }, { value: 'sale', label: 'Sold' }]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Date</span>
          <input className="field num" type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />
        </label>
        {kind === 'expense' && (
          <label className="text-sm">
            <span className="mb-1 block text-ink-2">What for</span>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {budget.costs.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              <option value="other">Other</option>
            </select>
          </label>
        )}
        {kind !== 'expense' && (
          <div className="text-sm">
            <span className="mb-1 block text-ink-2">How much</span>
            <div className="flex gap-2">
              <NumberInput aria-label="Quantity" className="field num flex-1" value={qty} onChange={setQty} />
              <Segmented label="Unit" value={unit} onChange={setUnit} options={[{ value: 'bag', label: '100 kg bags' }, { value: 'kg', label: 'kg' }]} />
            </div>
          </div>
        )}
        <label className="text-sm">
          <span className="mb-1 block text-ink-2">Details <span className="text-ink-3">(optional)</span></span>
          <input className="field" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder={kind === 'expense' ? 'e.g. 16 bags NPK 15-15-15' : kind === 'harvest' ? 'e.g. Shelled, dried' : 'e.g. Sold to aggregator at Bodija'} />
        </label>
        {kind !== 'harvest' && (
          <label className="text-sm">
            <span className="mb-1 block text-ink-2">{kind === 'expense' ? 'Amount paid' : 'Total received'}</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
              <NumberInput aria-label={kind === 'expense' ? 'Amount paid' : 'Total received'} className="field num pl-7" grouped value={amount} onChange={setAmount} />
            </span>
          </label>
        )}
      </div>
      {kind === 'sale' && amount > 0 && kg > 0 && <p className="text-sm text-ink-2">That's {naira((amount / kg) * 100)} per 100 kg bag ({naira((amount / kg) * 1000, true)}/t).</p>}
      {error && <p role="alert" className="text-sm text-clay">{error}</p>}
      <button type="submit" className="btn btn-primary press">Add {KIND_LABEL[kind].toLowerCase()}</button>
    </form>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A clean one-page record in a new window, ready to print or save as PDF. */
function downloadCsv(farm: Farm, cropName: string, budget: Budget, records: FarmRecord[]) {
  const blob = new Blob([toCsv(records, farm, cropName, budget)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${farm.name.replace(/[^\w-]+/g, '-').toLowerCase()}-records-${farm.plantingDate}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function printRecord(farm: Farm, cropName: string, budget: Budget, records: FarmRecord[], s: ReturnType<typeof summarize>) {
  const w = window.open('', '_blank');
  if (!w) return alert('Allow pop-ups for this site to print the record.');
  const rows = [...records].reverse().map((r) => `<tr><td>${r.date}</td><td>${KIND_LABEL[r.kind]}</td><td>${esc(r.kind === 'expense' ? budget.costs.find((c) => c.id === r.category)?.label ?? 'Other' : '')}</td><td>${esc(r.label)}</td><td class="n">${r.kg ? r.kg.toLocaleString('en-NG') : ''}</td><td class="n">${r.amount != null ? (r.kind === 'expense' ? '−' : '') + naira(r.amount) : ''}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(farm.name)} — farm record</title>
<style>body{font:14px/1.45 system-ui,sans-serif;color:#1d1b16;margin:32px}h1{font:600 22px Georgia,serif;margin:0}p{margin:4px 0;color:#55503f}
table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd4c1}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8a836f}.n{text-align:right;font-variant-numeric:tabular-nums}
.sum{display:flex;gap:28px;margin-top:16px}.sum div b{display:block;font-size:18px}footer{margin-top:24px;font-size:11px;color:#8a836f}</style></head><body>
<h1>${esc(farm.name)}</h1><p>${esc(cropName)} · ${farm.sizeHa} ha · planted ${farm.plantingDate}${farm.placeName ? ' · ' + esc(farm.placeName) : ''}</p>
<div class="sum"><div>Spent<b>${naira(s.spent)}</b></div><div>Harvested<b>${(s.harvestedKg / 1000).toFixed(2)} t</b></div><div>Sales<b>${naira(s.sales)}</b></div><div>Cash so far<b>${naira(s.cashSoFar)}</b></div></div>
<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Details</th><th class="n">kg</th><th class="n">Naira</th></tr></thead><tbody>${rows}</tbody></table>
<footer>Printed ${new Date().toLocaleDateString('en-GB')} from Nexus Agri.</footer>
<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

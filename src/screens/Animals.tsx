import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Farm } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { addDays, daysBetween, localToday, relativeDay, shortDate } from '../lib/dates';
import { naira } from '../lib/format';
import {
  ageOn, ageText, eggStats, feedNeed, headCount, healthSchedule, heatDays, lastWeight, money, SPECIES, withdrawals,
  type AnimalEvent, type AnimalEventKind, type AnimalGroup, type ScheduledStep, type SpeciesId,
} from '../lib/livestock';
import { newId, qtyText } from '../lib/stock';
import { useHub } from '../lib/hub';
import { useNav } from '../lib/nav';
import { NumberInput } from '../components/ui';
import { SpeciesIcon } from '../components/SpeciesIcon';

type View = { kind: 'list' } | { kind: 'group'; id: string } | { kind: 'add' } | { kind: 'edit'; id: string };

export function Animals({ farms, insights, openGroup, startAdding }: { farms: Farm[]; insights: Record<string, Insights>; openGroup?: string; startAdding: boolean }) {
  const hub = useHub();
  const [view, setView] = useState<View>(() =>
    openGroup && hub.groups.some((g) => g.id === openGroup) ? { kind: 'group', id: openGroup } : startAdding ? { kind: 'add' } : { kind: 'list' },
  );
  const show = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  if (view.kind === 'add' || view.kind === 'edit') {
    const initial = view.kind === 'edit' ? hub.groups.find((g) => g.id === view.id) : undefined;
    return (
      <GroupForm
        initial={initial}
        farms={farms}
        onCancel={() => show(initial ? { kind: 'group', id: initial.id } : { kind: 'list' })}
        onSave={(g, cost) => {
          hub.saveGroup(g);
          if (cost > 0 && !initial) hub.addEvent(g.id, { date: g.startDate, kind: 'cost', amount: cost, category: 'animals', note: `Bought ${g.startCount} ${SPECIES[g.species].many}` });
          show({ kind: 'group', id: g.id });
        }}
      />
    );
  }
  if (view.kind === 'group') {
    const g = hub.groups.find((x) => x.id === view.id);
    if (g) return <GroupDetail group={g} farms={farms} insights={insights} onBack={() => show({ kind: 'list' })} onEdit={() => show({ kind: 'edit', id: g.id })} />;
  }
  return <GroupList onOpen={(id) => show({ kind: 'group', id })} onAdd={() => show({ kind: 'add' })} />;
}

/* --------------------------------- List ---------------------------------- */

function GroupList({ onOpen, onAdd }: { onOpen: (id: string) => void; onAdd: () => void }) {
  const hub = useHub();
  const today = localToday();
  const open = hub.groups.filter((g) => !g.closed);
  const closed = hub.groups.filter((g) => g.closed);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Animals</h1>
          <p className="mt-1 max-w-prose text-ink-2">Each flock, herd or pond with its count, health work, eggs, feed and money.</p>
        </div>
        <button type="button" className="btn btn-accent press" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add animals
        </button>
      </header>

      {!open.length && (
        <div className="rounded-xl border border-line bg-card p-6">
          <p className="text-[17px]">No animals yet. Add a flock of layers or broilers, goats, sheep, pigs, cattle or a catfish pond, and the app works out vaccinations, feed and when to sell from their age.</p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {open.map((g) => {
          const ev = hub.events[g.id] ?? [];
          const sp = SPECIES[g.species];
          const n = headCount(g, ev, today);
          const sched = healthSchedule(g, ev, today);
          const late = sched.filter((s) => s.status === 'overdue').length;
          const due = sched.filter((s) => s.status === 'due').length;
          const eggs = sp.eggs ? eggStats(g, ev, today) : null;
          return (
            <li key={g.id}>
              <button type="button" onClick={() => onOpen(g.id)} className="card press lift flex w-full items-start gap-3 p-4 text-left">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                  <SpeciesIcon species={g.species} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{g.name}</span>
                  <span className="block text-ink-2">
                    <b className="num text-ink">{n}</b> {n === 1 ? sp.one : sp.many}, {ageText(ageOn(g, today))} old
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5 text-[13px] font-bold">
                    {late > 0 && <span className="rounded-full bg-clay-soft px-2 py-0.5 text-clay">{late} overdue</span>}
                    {due > 0 && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-sun">{due} due now</span>}
                    {eggs?.today != null && <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2">{eggs.today} eggs today</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {closed.length > 0 && (
        <details className="text-ink-2">
          <summary className="cursor-pointer font-bold text-ink">Finished groups ({closed.length})</summary>
          <ul className="mt-2 space-y-1">
            {closed.map((g) => (
              <li key={g.id}>
                <button type="button" className="text-left hover:underline" onClick={() => onOpen(g.id)}>{g.name}, {SPECIES[g.species].name.toLowerCase()} from {shortDate(g.startDate)}</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* --------------------------------- Form ---------------------------------- */

const SPECIES_ORDER: SpeciesId[] = ['layer', 'broiler', 'goat', 'sheep', 'pig', 'cattle', 'catfish'];

function GroupForm({ initial, farms, onSave, onCancel }: { initial?: AnimalGroup; farms: Farm[]; onSave: (g: AnimalGroup, cost: number) => void; onCancel: () => void }) {
  const today = localToday();
  const hub = useHub();
  const [species, setSpecies] = useState<SpeciesId>(initial?.species ?? 'layer');
  const sp = SPECIES[species];
  const [name, setName] = useState(initial?.name ?? '');
  const [count, setCount] = useState(initial?.startCount ?? 0);
  const [ageDays, setAgeDays] = useState(initial?.ageAtStart ?? sp.startAges[0].days);
  const [ageWeeks, setAgeWeeks] = useState(Math.round((initial?.ageAtStart ?? sp.startAges[0].days) / 7));
  const [custom, setCustom] = useState(initial ? !sp.startAges.some((a) => a.days === initial.ageAtStart) : false);
  const [start, setStart] = useState(initial?.startDate ?? today);
  const [fieldId, setFieldId] = useState(initial ? initial.fieldId ?? '' : farms[0]?.id ?? '');
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pick = (s: SpeciesId) => {
    setSpecies(s);
    setAgeDays(SPECIES[s].startAges[0].days);
    setAgeWeeks(Math.round(SPECIES[s].startAges[0].days / 7));
    setCustom(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const age = custom ? ageWeeks * 7 : ageDays;
    if (!(count > 0)) return setError(`How many ${sp.many} are there?`);
    if (count > 1_000_000) return setError('That number looks too large. Check it.');
    if (!start || start > today) return setError('Pick the day they arrived: today or earlier.');
    if (!(age >= 0) || age > 365 * 15) return setError('Check the age.');
    const auto = `${sp.name} ${hub.groups.filter((g) => g.species === species).length + 1}`;
    onSave(
      {
        id: initial?.id ?? newId('g'),
        species,
        name: name.trim() || initial?.name || auto,
        startDate: start,
        ageAtStart: age,
        startCount: Math.round(count),
        fieldId: fieldId || undefined,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
        closed: initial?.closed,
      },
      cost,
    );
  };

  return (
    <form onSubmit={submit} className="space-y-8" aria-label={initial ? `Edit ${initial.name}` : 'Add animals'}>
      <header>
        <h1 className="text-[32px] font-bold leading-tight">{initial ? `Edit ${initial.name}` : 'Add animals'}</h1>
        <p className="mt-1 max-w-prose text-ink-2">Vaccinations, feed and selling time are worked out from the kind of animal and its age.</p>
      </header>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-[21px] font-bold">What kind?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kind of animal">
          {SPECIES_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={species === id}
              disabled={!!initial}
              onClick={() => pick(id)}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left font-bold transition-colors disabled:opacity-60 ${species === id ? 'border-leaf bg-leaf-soft' : 'border-line bg-card hover:border-ink-3'}`}
            >
              <SpeciesIcon species={id} className="h-5 w-5 text-leaf" />
              {SPECIES[id].name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold">How many {sp.many}{initial ? ' at the start' : ''}?</span>
          <NumberInput className="field num" value={count} onChange={setCount} aria-label={`Number of ${sp.many}`} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Name <span className="font-normal text-ink-3">(optional)</span></span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. Pen A ${sp.name.toLowerCase()}`} maxLength={40} />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">How old were they when you got them?</legend>
        <div className="flex flex-wrap gap-2">
          {sp.startAges.map((a) => (
            <button
              key={a.label}
              type="button"
              aria-pressed={!custom && ageDays === a.days}
              onClick={() => {
                setCustom(false);
                setAgeDays(a.days);
              }}
              className={`rounded-full border-2 px-3.5 py-1.5 font-bold ${!custom && ageDays === a.days ? 'border-leaf bg-leaf-soft' : 'border-line bg-card'}`}
            >
              {a.label}
            </button>
          ))}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={`rounded-full border-2 px-3.5 py-1.5 font-bold ${custom ? 'border-leaf bg-leaf-soft' : 'border-line bg-card'}`}>
            Other age
          </button>
        </div>
        {custom && (
          <label className="mt-3 flex items-center gap-2">
            <NumberInput className="field num w-24" value={ageWeeks} onChange={setAgeWeeks} aria-label="Age in weeks" />
            <span>weeks old</span>
          </label>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold">Day they arrived</span>
          <input className="field num" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Where are they kept?</span>
          <select className="field" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {farms.map((f) => <option key={f.id} value={f.id}>Near {f.name}</option>)}
            <option value="">Somewhere else</option>
          </select>
          <span className="mt-1 block text-sm text-ink-3">Used for heat warnings from that place's forecast.</span>
        </label>
      </div>

      {!initial && (
        <label className="block max-w-xs">
          <span className="mb-1 block font-bold">What did they cost? <span className="font-normal text-ink-3">(optional)</span></span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
            <NumberInput className="field num pl-7" grouped value={cost} onChange={setCost} aria-label="Cost in naira" />
          </span>
        </label>
      )}

      {error && <p role="alert" className="text-clay">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary press">{initial ? 'Save changes' : `Add ${sp.many}`}</button>
        <button type="button" className="btn btn-ghost press" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* -------------------------------- Detail --------------------------------- */

const LOGS: { kind: AnimalEventKind; label: string; only?: (s: SpeciesId) => boolean }[] = [
  { kind: 'eggs', label: 'Eggs collected', only: (s) => SPECIES[s].eggs === true },
  { kind: 'died', label: 'Losses' },
  { kind: 'sold', label: 'Sold' },
  { kind: 'income', label: 'Produce sold' },
  { kind: 'added', label: 'Added' },
  { kind: 'eaten', label: 'For home' },
  { kind: 'weight', label: 'Weight' },
  { kind: 'health', label: 'Treatment' },
  { kind: 'cost', label: 'Spent' },
];

function GroupDetail({ group, farms, insights, onBack, onEdit }: { group: AnimalGroup; farms: Farm[]; insights: Record<string, Insights>; onBack: () => void; onEdit: () => void }) {
  const hub = useHub();
  const nav = useNav();
  const today = localToday();
  const events = useMemo(() => hub.events[group.id] ?? [], [hub.events, group.id]);
  const sp = SPECIES[group.species];
  const n = headCount(group, events, today);
  const age = ageOn(group, today);
  const sched = healthSchedule(group, events, today);
  const wd = withdrawals(events, today);
  const feed = feedNeed(group, events, today);
  const m = money(events);
  const field = farms.find((f) => f.id === group.fieldId);
  const forecast = field ? insights[field.id]?.forecast : null;
  const hot = heatDays(group, forecast?.daily ?? null, today);
  const [log, setLog] = useState<AnimalEventKind | null>(null);
  const [stepDone, setStepDone] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState(false);
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const recent = allRecords ? sorted : sorted.slice(0, 10);

  return (
    <div className="space-y-10">
      <div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 font-bold text-leaf">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All animals
        </button>
        <header className="mt-4 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
            <SpeciesIcon species={group.species} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[30px] font-bold leading-tight">{group.name}</h1>
            <p className="text-[17px] text-ink-2">
              <b className="num text-ink">{n}</b> {n === 1 ? sp.one : sp.many}, {ageText(age)} old{field ? `, near ${field.name}` : ''}
            </p>
            {group.closed && <p className="mt-1 font-bold text-sun">Finished group</p>}
          </div>
          <button type="button" onClick={onEdit} className="rounded-full p-2 text-ink-3 hover:bg-card hover:text-ink" aria-label={`Edit ${group.name}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </header>
      </div>

      {wd.length > 0 && (
        <div role="status" className="rounded-xl border border-clay/30 bg-clay-soft/60 p-4">
          {wd.map((w) => (
            <p key={w.event.id}>
              <b>{w.event.product || 'Treatment'}</b> on {shortDate(w.event.date)}: {w.meatUntil && <>do not sell or eat meat before <b>{shortDate(w.meatUntil)}</b>. </>}
              {w.eggsUntil && <>Do not sell or eat eggs before <b>{shortDate(w.eggsUntil)}</b>.</>}
            </p>
          ))}
        </div>
      )}

      {hot.length > 0 && (
        <div className="rounded-xl border border-maize bg-sun-soft p-4">
          <p className="font-bold">Hot days ahead: {hot.map((h) => `${relativeDay(h.date, today)} ${Math.round(h.tMax)} °C`).join(', ')}</p>
          <p className="mt-1 text-ink-2">{sp.heatAdvice}</p>
        </div>
      )}

      <section aria-labelledby="log-h" className="space-y-3" id="log">
        <h2 id="log-h" className="text-[21px] font-bold">Record something</h2>
        <div className="flex flex-wrap gap-2">
          {LOGS.filter((l) => !l.only || l.only(group.species)).map((l) => (
            <button
              key={l.kind}
              type="button"
              aria-pressed={log === l.kind}
              onClick={() => setLog(log === l.kind ? null : l.kind)}
              className={`rounded-full border-2 px-3.5 py-1.5 font-bold ${log === l.kind ? 'border-forest bg-forest text-forest-ink' : 'border-line bg-card hover:border-ink-3'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {log && <LogForm key={log} kind={log} group={group} events={events} onDone={() => setLog(null)} />}
      </section>

      <section aria-labelledby="health-h" className="space-y-3">
        <h2 id="health-h" className="text-[21px] font-bold">Health schedule</h2>
        <ul className="divide-y divide-line-2 overflow-hidden rounded-xl border border-line bg-card">
          {sched.filter((s) => s.status !== 'before').map((s) => (
            <li key={s.step.id} className="px-4 py-3.5">
              <StepRow s={s} today={today} onDone={() => setStepDone(stepDone === s.step.id ? null : s.step.id)} open={stepDone === s.step.id} />
              {stepDone === s.step.id && (
                <LogForm kind="health" group={group} events={events} stepId={s.step.id} stepTitle={s.step.title} onDone={() => setStepDone(null)} />
              )}
            </li>
          ))}
        </ul>
        {sched.some((s) => s.status === 'before') && (
          <p className="text-sm text-ink-3">
            {sched.filter((s) => s.status === 'before').map((s) => s.step.title).join(', ')}: due before you got them. Ask the seller or hatchery for the record.
          </p>
        )}
      </section>

      {sp.eggs && <EggPanel group={group} events={events} today={today} />}

      <section aria-labelledby="feed-h" className="space-y-3">
        <h2 id="feed-h" className="text-[21px] font-bold">Feed and care</h2>
        <div className="rounded-xl border border-line bg-card p-4">
          {feed ? (
            <>
              <p className="text-[17px]">
                <b>{feed.feed}</b>: about <b className="num">{feed.kgPerDay < 10 ? feed.kgPerDay.toFixed(1) : Math.round(feed.kgPerDay)} kg a day</b> for {feed.head} {feed.head === 1 ? sp.one : sp.many}, so{' '}
                <b className="num">{qtyText(Math.ceil(feed.bags25 * 4) / 4)} bags (25 kg)</b> this week.
              </p>
              <p className="mt-1 text-sm text-ink-3">{feed.note ?? `About ${Math.round(feed.gPerDay)} g per ${sp.one} a day, typical for this age. Hot weather lowers it.`}</p>
            </>
          ) : group.species === 'catfish' ? (
            <p>Weigh a sample of fish (use "Weight" above) and the daily feed is worked out from it.</p>
          ) : null}
          <p className={feed || group.species === 'catfish' ? 'mt-3 text-ink-2' : 'text-ink-2'}>{sp.care}</p>
          {sp.marketDays && (
            <p className="mt-3 text-ink-2">
              {age < sp.marketDays[0] ? `Usual selling age ${Math.round(sp.marketDays[0] / 7)}–${Math.round(sp.marketDays[1] / 7)} weeks: about ${sp.marketDays[0] - age} days to go.` : age <= sp.marketDays[1] ? 'At the usual selling age now.' : 'Past the usual selling age: feed costs keep rising while growth slows.'}
              {group.species === 'catfish' && lastWeight(events) && ` Last average weight ${Math.round(lastWeight(events)!.kg! * 1000)} g.`}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="money-h" className="space-y-3">
        <h2 id="money-h" className="text-[21px] font-bold">Money</h2>
        <dl className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-card p-4">
          <div><dt className="eyebrow">Spent</dt><dd className="num text-xl font-bold">{naira(m.spent, true)}</dd></div>
          <div><dt className="eyebrow">Received</dt><dd className="num text-xl font-bold">{naira(m.received, true)}</dd></div>
          <div><dt className="eyebrow">So far</dt><dd className={`num text-xl font-bold ${m.net < 0 ? 'text-clay' : 'text-leaf'}`}>{m.net < 0 ? '−' : '+'}{naira(Math.abs(m.net), true)}</dd></div>
        </dl>
        {n > 0 && m.spent > 0 && <p className="text-sm text-ink-3">Cost so far per {sp.one} still here: {naira(Math.round(m.spent / n))}.</p>}
      </section>

      <section aria-labelledby="history-h" className="space-y-3">
        <h2 id="history-h" className="text-[21px] font-bold">Record</h2>
        {recent.length === 0 ? (
          <p className="text-ink-2">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line-2 rounded-xl border border-line bg-card" aria-label="Record">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="num w-16 shrink-0 text-sm text-ink-3">{shortDate(e.date)}</span>
                <span className="min-w-0 flex-1">{describe(e, group)}</span>
                <button type="button" onClick={() => hub.deleteEvent(group.id, e.id)} className="rounded-full p-2 text-ink-3 hover:bg-paper hover:text-clay" aria-label="Delete this entry">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {sorted.length > recent.length && (
          <button type="button" className="font-bold text-leaf hover:underline" onClick={() => setAllRecords(true)}>
            Show all {sorted.length} entries
          </button>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-line pt-6">
        <button type="button" className="btn btn-ghost press" onClick={() => nav.go('ask', { ask: `About my ${sp.many} (${group.name}, ${n} ${sp.many}, ${ageText(age)} old): ` })}>
          Ask the advisor about them
        </button>
        <button type="button" className="btn btn-ghost press" onClick={() => hub.saveGroup({ ...group, closed: !group.closed })}>
          {group.closed ? 'Reopen this group' : 'Mark as finished (all sold)'}
        </button>
        <button
          type="button"
          className="btn press text-clay"
          onClick={() => {
            if (confirm(`Delete ${group.name} and its whole record? This cannot be undone.`)) {
              hub.deleteGroup(group.id);
              onBack();
            }
          }}
        >
          Delete group
        </button>
      </div>
    </div>
  );
}

function StepRow({ s, today, onDone, open }: { s: ScheduledStep; today: string; onDone: () => void; open: boolean }) {
  const chip: [string, string] =
    s.status === 'overdue' ? ['bg-clay-soft text-clay', 'Overdue']
    : s.status === 'due' ? ['bg-sun-soft text-sun', 'Due now']
    : s.status === 'upcoming' ? ['bg-paper text-ink-2', (() => { const d = daysBetween(today, s.start); return d === 1 ? 'Tomorrow' : `In ${d} days`; })()]
    : s.status === 'missed' ? ['bg-paper text-ink-3', 'Missed']
    : s.status === 'done' && s.doneOn ? ['bg-leaf-soft text-leaf', `Done ${shortDate(s.doneOn)}`]
    : ['', ''];
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{s.step.title}</p>
        <p className="mt-0.5 text-[14px] text-ink-2">
          <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[13px] font-bold ${chip[0]}`}>{chip[1]}</span>
          {s.status === 'missed' ? 'Ask your vet whether to give it now.' : s.status !== 'done' ? `${shortDate(s.start)} to ${shortDate(s.end)}` : s.step.repeatDays ? `Next from ${shortDate(s.start)}` : ''}
          {s.doneOn && s.status !== 'done' && `, last done ${shortDate(s.doneOn)}`}
        </p>
        <details className="mt-1 text-[15px] text-ink-2">
          <summary className="cursor-pointer text-sm font-bold text-ink-3">How</summary>
          <p className="mt-1">{s.step.how}</p>
          <p className="mt-1 text-sm text-ink-3">{s.step.source}{s.step.checkWithVet ? '. Timing varies by product.' : ''}</p>
        </details>
      </div>
      {s.status !== 'done' && (
        <button
          type="button"
          onClick={onDone}
          aria-expanded={open}
          aria-label={`Mark "${s.step.title}" as done`}
          className={`btn shrink-0 px-3 py-1.5 text-sm ${!open && (s.status === 'due' || s.status === 'overdue') ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Check className="h-4 w-4" aria-hidden /> Done
        </button>
      )}
    </div>
  );
}

function describe(e: AnimalEvent, g: AnimalGroup): string {
  const sp = SPECIES[g.species];
  const animals = (n = 0) => `${n} ${n === 1 ? sp.one : sp.many}`;
  const paid = e.amount ? ` for ${naira(e.amount)}` : '';
  switch (e.kind) {
    case 'eggs': return `${e.count} eggs collected`;
    case 'died': return `${animals(e.count)} died${e.note ? `: ${e.note}` : ''}`;
    case 'sold': return `${animals(e.count)} sold${paid}`;
    case 'eaten': return `${animals(e.count)} for home use`;
    case 'added': return `${animals(e.count)} added${paid}`;
    case 'weight': return `Average weight ${e.kg! < 1 ? `${Math.round(e.kg! * 1000)} g` : `${e.kg} kg`}`;
    case 'income': return `${e.note || 'Produce'} sold${paid}`;
    case 'cost': return `${e.note || { feed: 'Feed', medicine: 'Medicine', animals: 'Buying the animals', other: 'Other costs' }[e.category ?? 'other']}${paid}`;
    case 'health': {
      const step = e.stepId ? sp.health.find((s) => s.id === e.stepId)?.title : null;
      return `${step ?? 'Treatment'}${e.product ? `: ${e.product}` : ''}${paid}${e.note ? ` (${e.note})` : ''}`;
    }
  }
}

/* ------------------------------- Log forms ------------------------------- */

const CAUSES = ['Sickness', 'Heat', 'Predator or theft', 'Accident', 'Not known'];

function LogForm({ kind, group, events, stepId, stepTitle, onDone }: { kind: AnimalEventKind; group: AnimalGroup; events: AnimalEvent[]; stepId?: string; stepTitle?: string; onDone: () => void }) {
  const hub = useHub();
  const today = localToday();
  const sp = SPECIES[group.species];
  const [date, setDate] = useState(today);
  const [count, setCount] = useState(0);
  const [amount, setAmount] = useState(0);
  const [kg, setKg] = useState(0);
  const [weighed, setWeighed] = useState(0);
  const [product, setProduct] = useState('');
  const [meatDays, setMeatDays] = useState(0);
  const [eggDays, setEggDays] = useState(0);
  const [note, setNote] = useState(kind === 'died' ? CAUSES[0] : '');
  const [category, setCategory] = useState<'feed' | 'medicine' | 'other'>('feed');
  const [error, setError] = useState<string | null>(null);
  const have = headCount(group, events, date);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || date > today) return setError('Pick today or an earlier day.');
    if (date < addDays(group.startDate, -1) && kind !== 'cost') return setError(`That is before this group started (${shortDate(group.startDate)}).`);
    const base = { date, note: note.trim() || undefined };
    let entry: Omit<AnimalEvent, 'id'>;
    switch (kind) {
      case 'eggs':
        if (!(count >= 0) || count === 0) return setError('Enter how many eggs you collected.');
        if (count > have * 1.05) return setError(`That is more eggs than hens (${have}). Check the number.`);
        entry = { ...base, kind, count: Math.round(count) };
        break;
      case 'died':
      case 'sold':
      case 'eaten':
        if (!(count > 0)) return setError(`How many ${sp.many}?`);
        if (count > have) return setError(`There ${have === 1 ? 'is' : 'are'} only ${have} ${have === 1 ? sp.one : sp.many} on that day.`);
        entry = { ...base, kind, count: Math.round(count), amount: kind === 'sold' && amount > 0 ? amount : undefined };
        break;
      case 'added':
        if (!(count > 0)) return setError(`How many ${sp.many} were added?`);
        entry = { ...base, kind, count: Math.round(count), amount: amount > 0 ? amount : undefined };
        break;
      case 'weight': {
        const avg = group.species === 'catfish' && weighed > 0 ? kg / weighed : kg;
        if (!(avg > 0)) return setError(group.species === 'catfish' ? 'Enter the total weight and how many fish you weighed.' : 'Enter the average weight.');
        if (avg > 1500) return setError('That weight looks too large. Use kg.');
        entry = { ...base, kind, kg: Math.round(avg * 1000) / 1000 };
        break;
      }
      case 'income':
        if (!(amount > 0)) return setError('Enter what you received.');
        entry = { ...base, kind, amount, note: note.trim() || (sp.eggs ? 'Eggs' : 'Produce') };
        break;
      case 'cost':
        if (!(amount > 0)) return setError('Enter what you spent.');
        entry = { ...base, kind, amount, category };
        break;
      case 'health':
        if (!stepId && !product.trim()) return setError('Which medicine or vaccine?');
        if (meatDays > 365 || eggDays > 365) return setError('Check the withdrawal days on the label.');
        entry = { ...base, kind, stepId, product: product.trim() || undefined, meatDays: meatDays || undefined, eggDays: eggDays || undefined, amount: amount > 0 ? amount : undefined };
        break;
    }
    hub.addEvent(group.id, entry);
    onDone();
  };

  const money = (label: string) => (
    <label className="block">
      <span className="mb-1 block font-bold">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>
        <NumberInput className="field num pl-7" grouped value={amount} onChange={setAmount} aria-label={label} />
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="mt-3 space-y-4 rounded-xl bg-paper p-4 ring-1 ring-line" aria-label={stepTitle ? `Done: ${stepTitle}` : `Record ${kind}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold">Day</span>
          <input className="field num" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        {(kind === 'eggs' || kind === 'died' || kind === 'sold' || kind === 'eaten' || kind === 'added') && (
          <label className="block">
            <span className="mb-1 block font-bold">{kind === 'eggs' ? 'Eggs collected' : `How many ${sp.many}`}</span>
            <NumberInput className="field num" value={count} onChange={setCount} aria-label={kind === 'eggs' ? 'Eggs collected' : `How many ${sp.many}`} />
            {kind === 'eggs' && count > 0 && have > 0 && <span className="mt-1 block text-sm text-ink-3">{Math.round((count / have) * 100)}% of {have} hens, {qtyText(Math.floor((count / 30) * 4) / 4)} crates</span>}
          </label>
        )}
        {kind === 'died' && (
          <label className="block">
            <span className="mb-1 block font-bold">What happened?</span>
            <select className="field" value={note} onChange={(e) => setNote(e.target.value)}>
              {CAUSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        )}
        {(kind === 'sold' || kind === 'added') && money(kind === 'sold' ? 'Total received' : 'Total paid (optional)')}
        {kind === 'income' && (
          <>
            <label className="block">
              <span className="mb-1 block font-bold">What was sold</span>
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={sp.eggs ? 'e.g. 20 crates of eggs' : 'e.g. manure, milk'} maxLength={60} />
            </label>
            {money('Total received')}
          </>
        )}
        {kind === 'cost' && (
          <>
            <label className="block">
              <span className="mb-1 block font-bold">For</span>
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="feed">Feed</option>
                <option value="medicine">Medicine and vaccines</option>
                <option value="other">Other (labour, housing, transport)</option>
              </select>
            </label>
            {money('Amount spent')}
          </>
        )}
        {kind === 'weight' && (
          group.species === 'catfish' ? (
            <>
              <label className="block">
                <span className="mb-1 block font-bold">Total weight of the sample (kg)</span>
                <NumberInput className="field num" value={kg} onChange={setKg} aria-label="Total weight in kg" />
              </label>
              <label className="block">
                <span className="mb-1 block font-bold">Number of fish weighed</span>
                <NumberInput className="field num" value={weighed} onChange={setWeighed} aria-label="Number of fish weighed" />
                {kg > 0 && weighed > 0 && <span className="mt-1 block text-sm text-ink-3">Average {Math.round((kg / weighed) * 1000)} g</span>}
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-1 block font-bold">Average weight (kg)</span>
              <NumberInput className="field num" value={kg} onChange={setKg} aria-label="Average weight in kg" />
            </label>
          )
        )}
        {kind === 'health' && (
          <>
            <label className="block">
              <span className="mb-1 block font-bold">{stepId ? 'Vaccine or medicine used' : 'Medicine or vaccine'} {stepId && <span className="font-normal text-ink-3">(optional)</span>}</span>
              <input className="field" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Name on the pack" maxLength={60} />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold">Withdrawal, meat (days)</span>
              <NumberInput className="field num" value={meatDays} onChange={setMeatDays} aria-label="Meat withdrawal days" />
              <span className="mt-1 block text-sm text-ink-3">Copy it from the label. 0 if none.</span>
            </label>
            {sp.eggs && (
              <label className="block">
                <span className="mb-1 block font-bold">Withdrawal, eggs (days)</span>
                <NumberInput className="field num" value={eggDays} onChange={setEggDays} aria-label="Egg withdrawal days" />
              </label>
            )}
            {money('Cost (optional)')}
            {!stepId && (
              <label className="block">
                <span className="mb-1 block font-bold">Why <span className="font-normal text-ink-3">(optional)</span></span>
                <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. coughing, bloody droppings" maxLength={80} />
              </label>
            )}
          </>
        )}
      </div>
      {error && <p role="alert" className="text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary press">Save</button>
        <button type="button" className="btn btn-ghost press" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

/* ---------------------------------- Eggs --------------------------------- */

function EggPanel({ group, events, today }: { group: AnimalGroup; events: AnimalEvent[]; today: string }) {
  const s = eggStats(group, events, today);
  const change = s.rate7 != null && s.ratePrev7 != null && s.ratePrev7 > 0 ? s.rate7 / s.ratePrev7 - 1 : null;
  return (
    <section aria-labelledby="eggs-h" className="space-y-3">
      <h2 id="eggs-h" className="text-[21px] font-bold">Eggs</h2>
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p>
            <span className="eyebrow block">Laying this week</span>
            <span className="num text-3xl font-bold">{s.rate7 != null ? `${Math.round(s.rate7 * 100)}%` : '–'}</span>
          </p>
          {change != null && (
            <p className={`font-bold ${change <= -0.1 ? 'text-clay' : change >= 0 ? 'text-leaf' : 'text-ink-2'}`}>
              {change >= 0 ? '+' : '−'}{Math.abs(Math.round(change * 100))}% on last week
            </p>
          )}
          {s.today != null && <p className="text-ink-2">{s.today} eggs today</p>}
        </div>
        <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label={`Eggs per hen over the last 14 days: ${s.days.map((d) => (d.rate != null ? `${Math.round(d.rate * 100)}%` : 'not logged')).join(', ')}`}>
          {s.days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t-[3px] origin-bottom [animation:grow-y_500ms_var(--ease-out)_both] ${d.rate == null ? 'bg-line-2' : d.date === today ? 'bg-maize' : 'bg-leaf'}`}
                style={{ height: d.rate == null ? '4px' : `${Math.max(4, Math.min(100, d.rate * 100))}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[12px] text-ink-3">
          <span>{shortDate(s.days[0].date)}</span>
          <span>Today</span>
        </div>
        {s.rate7 == null && <p className="mt-3 text-sm text-ink-3">Log eggs on at least 3 days to see the laying rate.</p>}
      </div>
    </section>
  );
}

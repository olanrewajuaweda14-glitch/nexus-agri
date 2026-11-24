import { HeartPulse, MessageCircle, Plus } from 'lucide-react';
import type { AgendaItem } from '../lib/agenda';
import type { Farm } from '../lib/types';
import { addDays, localToday, shortDate } from '../lib/dates';
import { healthSchedule, SPECIES, withdrawals } from '../lib/livestock';
import { useHub } from '../lib/hub';
import { useNav } from '../lib/nav';
import { AgendaList } from '../components/Agenda';
import { SpeciesIcon } from '../components/SpeciesIcon';

/** Health work across every animal group: what is due, what is running, what was lost. */
export function Health({ agenda, farms, done, toggleDone }: { agenda: AgendaItem[]; farms: Farm[]; done: Set<string>; toggleDone: (k: string) => void }) {
  const hub = useHub();
  const nav = useNav();
  const today = localToday();
  const groups = hub.groups.filter((g) => !g.closed);
  const animal = agenda.filter((a) => a.source === 'animal');
  const now = animal.filter((a) => a.when === 'overdue' || a.when === 'today');
  const soon = animal.filter((a) => a.when === 'week' || a.when === 'later');
  const running = groups.flatMap((g) => withdrawals(hub.events[g.id] ?? [], today).map((w) => ({ g, ...w })));
  const missed = groups.flatMap((g) => healthSchedule(g, hub.events[g.id] ?? [], today).filter((s) => s.status === 'missed').map((s) => ({ g, s })));
  const monthAgo = addDays(today, -30);
  const losses = groups
    .map((g) => ({ g, n: (hub.events[g.id] ?? []).filter((e) => e.kind === 'died' && e.date >= monthAgo).reduce((s, e) => s + (e.count ?? 0), 0) }))
    .filter((x) => x.n > 0);

  if (!groups.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-[32px] font-bold leading-tight">Animal health</h1>
        <div className="rounded-xl border border-line bg-card p-6">
          <HeartPulse className="h-8 w-8 text-leaf" aria-hidden />
          <p className="mt-3 max-w-prose text-[17px]">Add your birds, goats, pigs, cattle or fish and their vaccination and deworming dates are worked out from their age, with reminders here.</p>
          <button type="button" className="btn btn-primary press mt-4" onClick={() => nav.go('animals', { addGroup: true })}>
            <Plus className="h-4 w-4" aria-hidden /> Add animals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[32px] font-bold leading-tight">Animal health</h1>
        <p className="mt-1 max-w-prose text-ink-2">
          Vaccinations and deworming worked out from each group's age. Tick one off when it is done; repeats count from that day. Your vet's or hatchery's schedule comes first.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="h-now">
        <h2 id="h-now" className="text-[21px] font-bold">Due now</h2>
        <AgendaList items={now} farms={farms} done={done} toggleDone={toggleDone} label="Health work due now" empty="Nothing due today." />
      </section>

      {running.length > 0 && (
        <section className="space-y-3" aria-labelledby="h-wd">
          <h2 id="h-wd" className="text-[21px] font-bold">Do not sell or eat yet</h2>
          <ul className="space-y-2">
            {running.map(({ g, event, meatUntil, eggsUntil }) => (
              <li key={event.id} className="flex gap-3 rounded-xl border border-clay/30 bg-clay-soft/60 p-3.5">
                <SpeciesIcon species={g.species} className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
                <div>
                  <p className="font-bold">{g.name}: {event.product || 'treatment'} on {shortDate(event.date)}</p>
                  <p className="text-ink-2">
                    {meatUntil && <>Meat: not before {shortDate(meatUntil)}. </>}
                    {eggsUntil && <>Eggs: not before {shortDate(eggsUntil)}.</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {soon.length > 0 && (
        <section className="space-y-3" aria-labelledby="h-soon">
          <h2 id="h-soon" className="text-[21px] font-bold">Coming up</h2>
          <AgendaList items={soon} farms={farms} done={done} toggleDone={toggleDone} label="Health work coming up" />
        </section>
      )}

      {(missed.length > 0 || losses.length > 0) && (
        <section className="space-y-3" aria-labelledby="h-look">
          <h2 id="h-look" className="text-[21px] font-bold">Worth a word with your vet</h2>
          <ul className="divide-y divide-line-2 rounded-xl border border-line bg-card">
            {losses.map(({ g, n }) => (
              <li key={`l${g.id}`} className="flex items-center gap-3 px-4 py-3">
                <SpeciesIcon species={g.species} className="h-5 w-5 shrink-0 text-ink-3" />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => nav.go('animals', { groupId: g.id })}>
                  <span className="block font-bold">{g.name}</span>
                  <span className="text-ink-2">{n} {n === 1 ? SPECIES[g.species].one : SPECIES[g.species].many} died in the last 30 days</span>
                </button>
              </li>
            ))}
            {missed.map(({ g, s }) => (
              <li key={`m${g.id}${s.step.id}`} className="flex items-center gap-3 px-4 py-3">
                <SpeciesIcon species={g.species} className="h-5 w-5 shrink-0 text-ink-3" />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => nav.go('animals', { groupId: g.id })}>
                  <span className="block font-bold">{g.name}: {s.step.title}</span>
                  <span className="text-ink-2">Missed (was due by {shortDate(s.end)}). Ask whether to give it now.</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => nav.go('ask', { ask: 'Some of my animals look sick: ' })}
        className="flex w-full items-center gap-4 rounded-xl bg-forest p-4 text-left text-forest-ink press"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maize text-forest">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-lg font-bold">Describe a sick animal to the advisor</span>
          <span className="block text-forest-ink-2">Say what you see: how it stands, eats, breathes, its droppings. It answers with what to check and when to call a vet.</span>
        </span>
      </button>
    </div>
  );
}

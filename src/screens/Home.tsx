import { CloudRain, MessageCircle, Plus, Sprout, Thermometer, Warehouse } from 'lucide-react';
import type { Farm } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import type { AgendaItem, Alert } from '../lib/agenda';
import { formatWindow } from '../lib/engine/plan';
import { ageOn, ageText, eggStats, headCount, SPECIES, type AnimalGroup, type AnimalEvent } from '../lib/livestock';
import { balance, isLow } from '../lib/stock';
import { allRecords } from '../lib/records';
import { farmMoney, periodStart } from '../lib/ledger';
import { CROPS } from '../lib/crops';
import { localToday, weekdayLong } from '../lib/dates';
import { naira } from '../lib/format';
import { isSample, useHub } from '../lib/hub';
import { useNav } from '../lib/nav';
import { AgendaList } from '../components/Agenda';
import { WeekCard } from '../components/WeekCard';
import { ListenButton } from '../components/ListenButton';
import { AlertRow } from './Alerts';
import { CropGlyph } from '../components/CropGlyph';
import { SpeciesIcon } from '../components/SpeciesIcon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function greeting(hour: number) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function Home({ farms, insights, agenda, alerts, done, toggleDone, onClearSample }: {
  farms: Farm[];
  insights: Record<string, Insights>;
  agenda: AgendaItem[];
  alerts: Alert[];
  done: Set<string>;
  toggleDone: (k: string) => void;
  onClearSample: () => void;
}) {
  const hub = useHub();
  const nav = useNav();
  const today = localToday();
  const firstName = hub.profile.farmerName?.split(/\s+/)[0];
  const main = farms[0] ? insights[farms[0].id] : null;
  const place = farms.find((f) => f.placeName)?.placeName;
  const now = agenda.filter((a) => a.when !== 'later');
  const shown = now.slice(0, 6);
  const pressing = alerts.filter((a) => a.severity !== 'info');
  const hasSample = farms.some((f) => isSample(f.id)) || hub.groups.some((g) => isSample(g.id)) || hub.stock.some((s) => isSample(s.id));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[32px] font-bold leading-tight sm:text-[38px]">
          {greeting(new Date().getHours())}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-[17px] text-ink-2">
          {weekdayLong(today)} {Number(today.slice(8, 10))} {MONTHS[Number(today.slice(5, 7)) - 1]}{place ? `, ${place}` : ''}
        </p>
        {main && <WeatherLine ins={main} fieldName={farms.length > 1 ? farms[0].name : null} />}
        <div className="mt-3">
          <ListenButton compact label="Listen to today" text={spokenDay({ firstName, main, now, pressing })} />
        </div>
      </header>

      {pressing.length > 0 && (
        <section aria-labelledby="attention-h" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="attention-h" className="text-[21px] font-bold">Needs attention</h2>
            <button type="button" className="font-bold text-leaf hover:underline" onClick={() => nav.go('alerts')}>
              All alerts ({alerts.length})
            </button>
          </div>
          <ul className="space-y-2">
            {pressing.slice(0, 3).map((a) => <AlertRow key={a.id} alert={a} compact />)}
          </ul>
        </section>
      )}

      <section aria-labelledby="work-h" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="work-h" className="text-[21px] font-bold">This week's work</h2>
          <div className="flex gap-4">
            <button type="button" className="inline-flex items-center gap-1 font-bold text-leaf hover:underline" onClick={() => nav.go('tasks', { addTask: true })}>
              <Plus className="h-4 w-4" aria-hidden /> Add a task
            </button>
          </div>
        </div>
        <AgendaList
          items={shown}
          farms={farms}
          done={done}
          toggleDone={toggleDone}
          label="This week's work"
          empty={farms.length || hub.groups.length ? 'Nothing due this week. Walk the field and look at the animals anyway.' : undefined}
        />
        {now.length > shown.length && (
          <button type="button" className="font-bold text-leaf hover:underline" onClick={() => nav.go('tasks')}>
            See all {now.length} jobs for this week
          </button>
        )}
      </section>

      <section aria-labelledby="farm-h" className="space-y-3">
        <h2 id="farm-h" className="text-[21px] font-bold">Your farm</h2>
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <FieldRows farms={farms} insights={insights} />
          <AnimalRows groups={hub.groups} events={hub.events} today={today} />
          <StoreRow />
          <MoneyRow farms={farms} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn btn-ghost press" onClick={nav.addField}>
            <Sprout className="h-4 w-4" aria-hidden /> Add a field
          </button>
          <button type="button" className="btn btn-ghost press" onClick={() => nav.go('animals', { addGroup: true })}>
            <Plus className="h-4 w-4" aria-hidden /> Add animals
          </button>
        </div>
      </section>

      <WeekCard farms={farms} insights={insights} />

      <button type="button" onClick={() => nav.go('ask')} className="flex w-full items-center gap-4 rounded-xl bg-forest p-4 text-left text-forest-ink press">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maize text-forest">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-lg font-bold">Ask the advisor</span>
          <span className="block text-forest-ink-2">A sick animal, a pest, a yellow leaf: ask in English, Pidgin, Hausa, Yorùbá or Igbo.</span>
        </span>
      </button>

      {hasSample && (
        <div className="rounded-xl border border-dashed border-ink-3 p-4">
          <p className="font-bold">You are looking at sample data</p>
          <p className="mt-1 text-ink-2">The sample field, animals and store items show how the app works. Remove them when you are ready to put in your own.</p>
          <button
            type="button"
            className="btn btn-ghost press mt-3"
            onClick={() => {
              if (confirm('Remove the sample field, sample animals and sample store items? Your own records stay.')) onClearSample();
            }}
          >
            Remove sample data
          </button>
        </div>
      )}
    </div>
  );
}

/** Today's weather at the first field, in one line a farmer can act on. */
function WeatherLine({ ins, fieldName }: { ins: Insights; fieldName: string | null }) {
  const w = ins.forecast;
  if (!w) return null;
  const i = w.daily.time.indexOf(ins.today);
  if (i < 0) return null;
  const hi = w.daily.tMax[i];
  const lo = w.daily.tMin[i];
  const prob = w.daily.precipProb[i] ?? 0;
  const rain = w.daily.precip[i] ?? 0;
  const spray = ins.derived.spray?.next;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-card px-4 py-3 text-[16px] ring-1 ring-line">
      {fieldName && <span className="w-full text-sm text-ink-3">Weather at {fieldName}</span>}
      <span className="inline-flex items-center gap-1.5">
        <Thermometer className="h-5 w-5 text-clay" aria-hidden />
        <b className="num">{hi != null ? Math.round(hi) : '–'}°</b>
        <span className="num text-ink-2">/ {lo != null ? Math.round(lo) : '–'}°</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CloudRain className="h-5 w-5 text-rain" aria-hidden />
        <b className="num">{prob}%</b>
        <span className="text-ink-2">chance of rain{rain >= 1 ? `, about ${Math.round(rain)} mm` : ''}</span>
      </span>
      <span className="text-ink-2">{spray ? <>Next spray window: <b className="text-ink">{formatWindow(spray, ins.today)}</b></> : 'No safe spray window in the next 3 days'}</span>
    </div>
  );
}

function Row({ onClick, icon, title, sub, aside, tone }: { onClick: () => void; icon: React.ReactNode; title: string; sub: string; aside?: string; tone?: 'clay' | 'sun' }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-leaf-soft text-leaf">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{title}</span>
          <span className="block truncate text-[14px] text-ink-2">{sub}</span>
        </span>
        {aside && <span className={`shrink-0 text-right text-[14px] font-bold ${tone === 'clay' ? 'text-clay' : tone === 'sun' ? 'text-sun' : 'text-ink-2'}`}>{aside}</span>}
      </button>
    </li>
  );
}

function FieldRows({ farms, insights }: { farms: Farm[]; insights: Record<string, Insights> }) {
  const nav = useNav();
  if (!farms.length) return null;
  return (
    <ul className="divide-y divide-line-2 border-b border-line-2" aria-label="Fields">
      {farms.map((f) => {
        const ins = insights[f.id];
        if (!ins) return null;
        const st = ins.stage;
        const next = ins.derived.openPlan.find((a) => a.checkable);
        const status = st.status === 'not-planted' ? `planting in ${-st.dap} days` : st.status === 'mature' ? 'mature, ready to harvest' : `day ${st.dap}, ${st.name.toLowerCase()}`;
        return (
          <Row
            key={f.id}
            onClick={() => nav.openField(f.id, 'today')}
            icon={<CropGlyph crop={ins.crop} dap={Math.max(st.dap, 0)} size={40} animate={false} />}
            title={f.name}
            sub={`${CROPS[f.crop].name}, ${status}`}
            aside={next ? next.title : undefined}
            tone={next?.priority === 'now' ? 'clay' : undefined}
          />
        );
      })}
    </ul>
  );
}

function groupLine(g: AnimalGroup, events: AnimalEvent[], today: string): { sub: string; aside?: string } {
  const sp = SPECIES[g.species];
  const n = headCount(g, events, today);
  const sub = `${n} ${n === 1 ? sp.one : sp.many}, ${ageText(ageOn(g, today))} old`;
  if (sp.eggs) {
    const e = eggStats(g, events, today);
    if (e.today != null) return { sub, aside: `${e.today} eggs today` };
    if (e.rate7 != null) return { sub, aside: `${Math.round(e.rate7 * 100)}% laying` };
  }
  if (sp.marketDays) {
    const age = ageOn(g, today);
    if (age >= sp.marketDays[0]) return { sub, aside: 'Ready to sell' };
    if (sp.marketDays[0] - age <= 21) return { sub, aside: `Sell in ${sp.marketDays[0] - age} days` };
  }
  return { sub };
}

function AnimalRows({ groups, events, today }: { groups: AnimalGroup[]; events: Record<string, AnimalEvent[]>; today: string }) {
  const nav = useNav();
  const open = groups.filter((g) => !g.closed);
  if (!open.length) return null;
  return (
    <ul className="divide-y divide-line-2 border-b border-line-2" aria-label="Animals">
      {open.map((g) => {
        const line = groupLine(g, events[g.id] ?? [], today);
        return <Row key={g.id} onClick={() => nav.go('animals', { groupId: g.id })} icon={<SpeciesIcon species={g.species} />} title={g.name} sub={line.sub} aside={line.aside} />;
      })}
    </ul>
  );
}

function StoreRow() {
  const { stock, moves } = useHub();
  const nav = useNav();
  if (!stock.length) return null;
  const low = stock.filter((i) => isLow(i, balance(i.id, moves)));
  return (
    <ul className="border-b border-line-2">
      <Row
        onClick={() => nav.go('store')}
        icon={<Warehouse className="h-5 w-5" aria-hidden />}
        title="Store"
        sub={`${stock.length} item${stock.length === 1 ? '' : 's'} in stock`}
        aside={low.length ? `${low.length} running low` : undefined}
        tone={low.length ? 'sun' : undefined}
      />
    </ul>
  );
}

/** This year's money for the whole farm: the same sums as the Money screen opens on. */
function MoneyRow({ farms }: { farms: Farm[] }) {
  const nav = useNav();
  const hub = useHub();
  const today = localToday();
  if (!farms.length && !hub.groups.length) return null;
  const m = farmMoney({ farms, recordsOf: allRecords, groups: hub.groups, events: hub.events, ledger: hub.ledger, stock: hub.stock, moves: hub.moves, from: periodStart('year', today), to: today });
  return (
    <ul>
      <Row
        onClick={() => nav.go('money')}
        icon={<span className="text-lg font-bold">₦</span>}
        title="Money this year"
        sub={m.in || m.out ? `In ${naira(m.in, true)}, out ${naira(m.out, true)}` : 'Nothing recorded yet this year'}
        aside={m.in || m.out ? `${m.net >= 0 ? '+' : '−'}${naira(Math.abs(m.net), true)}` : undefined}
        tone={m.net < 0 ? 'clay' : undefined}
      />
    </ul>
  );
}


/** Today in plain sentences for the phone's voice: no symbols, units spelled out. */
function spokenDay({ firstName, main, now, pressing }: { firstName?: string; main: Insights | null; now: AgendaItem[]; pressing: Alert[] }) {
  const parts = [`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ''}.`];
  const w = main?.forecast;
  const i = w ? w.daily.time.indexOf(main!.today) : -1;
  if (w && i >= 0) {
    const hi = w.daily.tMax[i];
    const prob = w.daily.precipProb[i] ?? 0;
    parts.push(`Today, up to ${hi != null ? Math.round(hi) : 'unknown'} degrees, with a ${prob} percent chance of rain.`);
  }
  const jobs = now.filter((a) => a.when === 'overdue' || a.when === 'today');
  if (jobs.length) parts.push(`${jobs.length === 1 ? 'One job' : `${jobs.length} jobs`} for today: ${jobs.slice(0, 4).map((a) => `${a.title}${a.where ? `, ${a.where}` : ''}`).join('. ')}.`);
  else parts.push('Nothing is due today.');
  if (pressing.length) parts.push(`${pressing.length === 1 ? 'One thing needs' : `${pressing.length} things need`} attention: ${pressing.slice(0, 3).map((a) => a.title).join('. ')}.`);
  return parts.join(' ').replace(/₦/g, 'naira ').replace(/°C?/g, ' degrees').replace(/(\d) ?mm\b/g, '$1 millimetres').replace(/(\d) ?kg\b/g, '$1 kilograms');
}

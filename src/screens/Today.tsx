import { CalendarPlus, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { seasonEvents, toIcs } from '../lib/calendar';
import type { Farm, PlanAction, Priority } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { key, formatWindow, seasonAhead } from '../lib/engine/plan';
import { daysBetween, shortDate, weekdayLong } from '../lib/dates';
import { ActionCard, PRIORITY_TONE } from '../components/ActionCard';
import { CropTimeline, WeekStrip } from '../components/charts';
import { ErrorNote, ProgressRing, Section, Skeleton } from '../components/ui';
import { FarmSky } from '../components/FarmSky';
import { CropGlyph } from '../components/CropGlyph';
import { CountUp } from '../components/motion';
import { ListenButton } from '../components/ListenButton';
import { PlanTranslation } from '../components/PlanTranslation';
import { planText } from '../lib/translate';
import { farmNow } from '../lib/useInsights';
import { useNav } from '../lib/nav';
import { loadRecords, summarize } from '../lib/records';
import { KEYS, load } from '../lib/storage';
import { CROPS } from '../lib/crops';
import { naira } from '../lib/format';

interface Props {
  farm: Farm;
  ins: Insights;
  done: Set<string>;
  toggleDone: (k: string) => void;
}

export function Today({ farm, ins, done, toggleDone }: Props) {
  const [calNote, setCalNote] = useState<string | null>(null);
  const offsetSec = ins.weather.data?.utcOffsetSeconds ?? 3600;
  const { crop, stage, weather, derived, today, forecast } = ins;
  const plan = derived.plan;
  const isDone = (a: PlanAction) => done.has(key(farm, a.id));
  const open = plan.filter((a) => !isDone(a));
  const count = (p: Priority) => open.filter((a) => a.priority === p).length;
  const checkable = plan.filter((a) => a.checkable);
  const loading = !forecast && (weather.status === 'loading' || weather.status === 'idle');
  const ahead = stage.status === 'growing' ? seasonAhead(farm, crop, today, done).slice(0, 5) : [];
  const englishText = useMemo(
    () => planText({ cropName: crop.name, stage: { status: stage.status, dap: stage.dap, name: stage.name }, today, plan, labels: { now: PRIORITY_TONE.now.label, week: PRIORITY_TONE.week.label, watch: PRIORITY_TONE.watch.label } }),
    [crop.name, stage.status, stage.dap, stage.name, today, plan],
  );

  return (
    <div className="space-y-8">
      <header className="card overflow-hidden">
        {forecast && derived.spray && <FarmSky weather={forecast} spray={derived.spray} today={today} nowIso={farmNow(forecast)} />}
        <div className="flex items-end gap-3 px-4 pt-4 sm:gap-5">
          <div className="-mb-1 shrink-0">
            <CropGlyph crop={crop} dap={stage.dap} size={92} />
          </div>
          <div className="min-w-0 pb-1">
            <div className="eyebrow truncate">
              {weekdayLong(today)} {shortDate(today)}
              {farm.placeName ? `, ${farm.placeName}` : ''}
            </div>
            <h1 className="mt-1 text-[30px] font-bold leading-[1.05] tracking-tight sm:text-[42px]">
              {stage.status === 'not-planted' ? (
                <>{crop.name}, planting in {-stage.dap} day{stage.dap === -1 ? '' : 's'}</>
              ) : stage.status === 'mature' ? (
                <>{crop.name} is mature</>
              ) : (
                <>
                  {crop.name}, day <span className="num font-medium"><CountUp value={stage.dap} /></span>
                </>
              )}
            </h1>
          </div>
        </div>
        <div className="space-y-4 px-4 pb-4 pt-3">
          <p className="max-w-xl text-[15px] text-ink-2">
            <strong className="font-bold text-ink">{stage.name}.</strong> {stage.note}
            {stage.nextName && stage.daysToNext != null && stage.status === 'growing' && (
              <> {stage.nextName} in about {stage.daysToNext} day{stage.daysToNext === 1 ? '' : 's'}.</>
            )}
          </p>
          {stage.status !== 'not-planted' && <CropTimeline crop={crop} dap={stage.dap} />}
        </div>
      </header>

      {stage.status === 'mature' && <SeasonWrapUp farm={farm} cropName={crop.name} />}

      <ForecastNotice ins={ins} />

      <Section
        title="This week's plan"
        id="plan"
        aside={
          !loading && plan.length > 0 ? (
            <span className="flex items-center gap-3">
              <span className="hidden sm:inline">
                {count('now') > 0 && <b className="font-bold text-clay">{count('now')} now</b>}
                {count('now') > 0 && count('week') > 0 && ', '}
                {count('week') > 0 && <span>{count('week')} this week</span>}
              </span>
              {checkable.length > 0 && <ProgressRing done={checkable.length - checkable.filter((a) => !isDone(a)).length} total={checkable.length} />}
            </span>
          ) : null
        }
      >
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading plan">
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
          </div>
        ) : plan.length === 0 ? (
          <div className="card p-5 text-[15px] text-ink-2">
            {stage.status === 'mature'
              ? 'No more field jobs this season. Finish your harvest records above, then start the next season.'
              : 'Nothing scheduled this week. A walk through the field to check for pests and weeds is still worth it.'}
          </div>
        ) : (
          <div className="space-y-5">
            {(['now', 'week', 'watch'] as Priority[]).map((p) => {
              // Finished jobs sink to the bottom of their group.
              const items = plan.filter((a) => a.priority === p).sort((x, y) => Number(isDone(x)) - Number(isDone(y)));
              if (!items.length) return null;
              return (
                <div key={p} className="stagger space-y-2">
                  <h3 className={`eyebrow w-fit rounded px-1.5 py-0.5 ${PRIORITY_TONE[p].chip}`}>{PRIORITY_TONE[p].label}</h3>
                  {items.map((a, i) => (
                    <div key={a.id} style={{ ['--i' as string]: i + 1 }}>
                      <ActionCard action={a} farm={farm} offsetSec={offsetSec} done={isDone(a)} onToggle={() => toggleDone(key(farm, a.id))} defaultOpen={p === 'now' && i === 0 && !isDone(a)} />
                    </div>
                  ))}
                </div>
              );
            })}
            {open.length > 0 && <PlanTranslation farm={farm} text={englishText} open={open} />}
          </div>
        )}
      </Section>

      {forecast && derived.spray && (
        <Section title="Next 8 days" id="week" aside={<span>rain in mm, chance, high and low</span>}>
          <div className="card p-3">
            <WeekStrip weather={forecast} today={today} spray={derived.spray} />
            <p className="mt-2 border-t border-line-2 px-1 pt-3 text-sm text-ink-2">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-leaf align-middle" aria-hidden />
              {derived.spray.next ? (
                <>Next spray window <b className="font-bold text-ink">{formatWindow(derived.spray.next, today)}</b></>
              ) : (
                <>No safe spray window in the next 72 hours.</>
              )}
            </p>
          </div>
        </Section>
      )}

      {ahead.length > 0 && (
        <Section title="Later this season" id="ahead">
          <ol className="card stagger divide-y divide-line-2">
            {ahead.map((t, idx) => {
              const inDays = daysBetween(today, t.start);
              return (
                <li key={t.id} className="flex items-baseline gap-4 px-4 py-3" style={{ ['--i' as string]: idx }}>
                  <span className="num w-16 shrink-0 text-sm text-ink-2">{shortDate(t.start)}</span>
                  <span className="min-w-0 flex-1 text-[15px]">{t.title}</span>
                  <span className="shrink-0 text-xs text-ink-3">in {inDays < 14 ? `${inDays} days` : `${Math.round(inDays / 7)} weeks`}</span>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      {!loading && (open.length > 0 || stage.status !== 'mature') && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {open.length > 0 && <ListenButton text={spokenPlan(ins, open)} label="Listen to this week's plan" />}
            {open.length > 0 && (
              <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={() => sharePlan(farm, ins, open)}>
                <Share2 className="h-4 w-4" aria-hidden /> Send this plan on WhatsApp
              </button>
            )}
            {stage.status !== 'mature' && (
              <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={() => setCalNote(saveSeasonCalendar(farm, ins, done))}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> Put the season in my calendar
              </button>
            )}
          </div>
          {calNote && <p role="status" className="text-sm text-ink-2">{calNote}</p>}
        </div>
      )}
    </div>
  );
}

/** After maturity: the season's totals and a clear way into the next one. */
function SeasonWrapUp({ farm, cropName }: { farm: Farm; cropName: string }) {
  const { go, startSeason } = useNav();
  const budget = load(KEYS.budget(`${farm.id}:${farm.crop}`), CROPS[farm.crop].exampleBudget);
  const s = summarize(loadRecords(farm), budget, farm.sizeHa);
  return (
    <section className="card space-y-4 border-leaf/40 bg-leaf-soft/40 p-4" aria-labelledby="wrapup-h">
      <div>
        <h2 id="wrapup-h" className="text-xl font-bold">{cropName} season: wrapping up</h2>
        <p className="mt-1 text-[15px] text-ink-2">
          Record your harvest and sales, then start the next season. This season's totals are kept as your farm's track record.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-ink-3">Harvested</dt><dd className="num text-lg font-medium">{s.harvestedKg > 0 ? `${(s.harvestedKg / 1000).toFixed(2)} t` : '—'}</dd></div>
        <div><dt className="text-ink-3">Spent</dt><dd className="num text-lg font-medium">{naira(s.spent, true)}</dd></div>
        <div><dt className="text-ink-3">Sales</dt><dd className="num text-lg font-medium">{naira(s.sales, true)}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost press" onClick={() => go('money', { money: 'records' })}>Record harvest or sales</button>
        <button type="button" className="btn btn-primary press" onClick={startSeason}>Start next season</button>
      </div>
    </section>
  );
}

function ForecastNotice({ ins }: { ins: Insights }) {
  const { weather, forecast } = ins;
  if (weather.status === 'error') {
    return (
      <ErrorNote
        title="Couldn't load the forecast"
        detail={`${weather.error ?? ''} Calendar jobs are shown below without weather timing. Check the soil and sky before fertilizing or spraying.`}
        onRetry={ins.refresh}
      />
    );
  }
  if (weather.data && !forecast) {
    return (
      <ErrorNote
        title="Saved forecast is out of date"
        detail="The last forecast on this phone no longer covers today. Connect to the internet and refresh to get timing advice."
        onRetry={ins.refresh}
      />
    );
  }
  if (weather.stale && weather.savedAt) {
    return (
      <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm text-ink">
        Offline — using the forecast saved {new Date(weather.savedAt).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Refresh when you have signal.
      </p>
    );
  }
  return null;
}

/** Plain sentences for text-to-speech: no symbols, units spelled out. */
function spokenPlan(ins: Insights, actions: PlanAction[]) {
  const say = (t: string) => t.replace(/·/g, ',').replace(/–/g, ' to ').replace(/(\d) ?mm\b/g, '$1 millimetres').replace(/(\d) ?kg\b/g, '$1 kilograms').replace(/\bha\b/g, 'hectares').replace(/°C/g, ' degrees');
  const head = ins.stage.status === 'growing' ? `${ins.crop.name}, day ${ins.stage.dap}. ${ins.stage.name}.` : `${ins.crop.name}. ${ins.stage.name}.`;
  const now = actions.filter((a) => a.priority === 'now');
  const week = actions.filter((a) => a.priority === 'week');
  const parts = [head];
  if (now.length) parts.push(`Do now: ${now.map((a) => `${a.title}, ${a.when}.`).join(' ')}`);
  if (week.length) parts.push(`This week: ${week.map((a) => `${a.title}, ${a.when}.`).join(' ')}`);
  const first = now[0] ?? week[0];
  if (first?.how) parts.push(`For ${first.title.toLowerCase()}: ${first.how}`);
  if (ins.derived.spray?.next) parts.push(`Next safe spray window: ${formatWindow(ins.derived.spray.next, ins.today)}.`);
  return say(parts.join(' '));
}

/** Downloads the rest of the season as a calendar file and says what to do with it. */
function saveSeasonCalendar(farm: Farm, ins: Insights, done: Set<string>): string {
  const events = seasonEvents(farm, ins.crop, ins.today, done);
  if (!events.length) return 'No field jobs left to remind you about this season.';
  const ics = toIcs(events, `Nexus Agri — ${farm.name}`, ins.weather.data?.utcOffsetSeconds ?? 3600);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = `nexus-agri-${farm.name.replace(/[^\w-]+/g, '-').toLowerCase()}-season.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return `Saved ${events.length} reminders. Open the downloaded file to add them to your calendar (each one alerts you at 7 am). If your phone can't open it, use "Remind me" on each job instead.`;
}

function sharePlan(farm: Farm, ins: Insights, actions: PlanAction[]) {
  const lines = [
    `*${farm.name}* — ${ins.crop.name}, day ${ins.stage.dap} (${ins.stage.name})`,
    `Plan for the week of ${shortDate(ins.today)}:`,
    '',
    ...actions.filter((a) => a.priority !== 'watch').map((a) => `${a.priority === 'now' ? '🔴' : '🟠'} ${a.title} — ${a.when}${a.how ? `\n   ${a.how}` : ''}`),
    '',
    'From Nexus Agri',
  ];
  const text = lines.join('\n');
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}

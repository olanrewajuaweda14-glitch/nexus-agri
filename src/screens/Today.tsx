import { Share2 } from 'lucide-react';
import type { Farm, PlanAction, Priority } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { key, formatWindow } from '../lib/engine/plan';
import { shortDate, weekdayLong } from '../lib/dates';
import { ActionCard, PRIORITY_TONE } from '../components/ActionCard';
import { CropTimeline, WeekStrip } from '../components/charts';
import { ErrorNote, Section, Skeleton } from '../components/ui';

interface Props {
  farm: Farm;
  ins: Insights;
  done: Set<string>;
  toggleDone: (k: string) => void;
}

export function Today({ farm, ins, done, toggleDone }: Props) {
  const { crop, stage, weather, derived, today } = ins;
  const plan = derived?.plan ?? [];
  const isDone = (a: PlanAction) => done.has(key(farm, a.id));
  const open = plan.filter((a) => !isDone(a));
  const count = (p: Priority) => open.filter((a) => a.priority === p).length;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="eyebrow">
          {weekdayLong(today)} {shortDate(today)}
          {farm.placeName ? ` · ${farm.placeName}` : ''}
        </div>
        <div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            {stage.status === 'not-planted' ? (
              <>{crop.name}, planting in {-stage.dap} days</>
            ) : stage.status === 'mature' ? (
              <>{crop.name} is mature</>
            ) : (
              <>
                {crop.name}, day <span className="num font-medium">{stage.dap}</span>
              </>
            )}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-2">
            <strong className="font-semibold text-ink">{stage.name}.</strong> {stage.note}
            {stage.nextName && stage.daysToNext != null && stage.status === 'growing' && (
              <> {stage.nextName} in about {stage.daysToNext} day{stage.daysToNext === 1 ? '' : 's'}.</>
            )}
          </p>
        </div>
        {stage.status !== 'not-planted' && <CropTimeline crop={crop} dap={stage.dap} />}
      </header>

      {weather.status === 'error' && !weather.data && (
        <ErrorNote
          title="Couldn't load the weather for this farm"
          detail={`${weather.error} The plan needs the forecast to time fertilizer, spraying and water. Calendar tasks still apply.`}
          onRetry={ins.refresh}
        />
      )}
      {weather.stale && weather.data && (
        <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm text-ink">
          Offline — showing the forecast saved {new Date(weather.savedAt!).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}. Reconnect to update.
        </p>
      )}

      <Section
        title="This week's plan"
        id="plan"
        aside={
          derived && open.length > 0 ? (
            <span>
              {count('now') > 0 && <b className="font-semibold text-clay">{count('now')} now</b>}
              {count('now') > 0 && count('week') > 0 && ' · '}
              {count('week') > 0 && <span>{count('week')} this week</span>}
            </span>
          ) : null
        }
      >
        {!derived && weather.status !== 'error' ? (
          <div className="space-y-2">
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
            <Skeleton className="h-[74px]" />
          </div>
        ) : plan.length === 0 ? (
          <div className="card p-5 text-ink-2">Nothing scheduled for this week. Walk the field and check for pests and weeds.</div>
        ) : (
          <div className="space-y-5">
            {(['now', 'week', 'watch'] as Priority[]).map((p) => {
              const items = plan.filter((a) => a.priority === p);
              if (!items.length) return null;
              return (
                <div key={p} className="space-y-2">
                  <h3 className={`eyebrow inline-block rounded px-1.5 py-0.5 ${PRIORITY_TONE[p].chip}`}>{PRIORITY_TONE[p].label}</h3>
                  {items.map((a, i) => (
                    <ActionCard key={a.id} action={a} done={isDone(a)} onToggle={() => toggleDone(key(farm, a.id))} defaultOpen={p === 'now' && i === 0} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {weather.data && (
        <Section title="Next 8 days" id="week" aside={<span>rain mm · chance · high/low</span>}>
          <div className="card p-3">
            <WeekStrip weather={weather.data} spray={derived?.spray} />
            {derived && (
              <p className="mt-2 border-t border-line-2 px-1 pt-3 text-sm text-ink-2">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-leaf align-middle" />
                {derived.spray.next ? (
                  <>Next spray window <b className="font-semibold text-ink">{formatWindow(derived.spray.next, today)}</b></>
                ) : (
                  <>No safe spray window in the next 72 hours.</>
                )}
              </p>
            )}
          </div>
        </Section>
      )}

      {derived && open.length > 0 && (
        <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => sharePlan(farm, ins, open)}>
          <Share2 className="h-4 w-4" aria-hidden /> Send this plan on WhatsApp
        </button>
      )}
    </div>
  );
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

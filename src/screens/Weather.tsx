import type { Insights } from '../lib/useInsights';
import { farmNow } from '../lib/useInsights';
import { shortDate, weekday } from '../lib/dates';
import { ago, wmo } from '../lib/format';
import { formatWindow } from '../lib/engine/plan';
import { mainBlocker } from '../lib/engine/spray';
import { MonthlyRain, SprayStrip } from '../components/charts';
import { ErrorNote, Section, Skeleton, SourceTag, Stat } from '../components/ui';

export function Weather({ ins }: { ins: Insights }) {
  const { weather, climate, derived, today } = ins;
  const w = ins.forecast;

  if (!w) {
    return weather.status === 'error' || weather.data ? (
      <ErrorNote
        title={weather.data ? 'Saved forecast is out of date' : 'Weather unavailable'}
        detail={weather.data ? 'The forecast saved on this phone no longer covers today. Refresh when you have signal.' : weather.error}
        onRetry={ins.refresh}
      />
    ) : (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const nowIso = farmNow(w);
  const hi = Math.max(0, w.hourly.time.findIndex((t) => t >= nowIso.slice(0, 13)));
  const ti = Math.max(0, w.daily.time.indexOf(today));
  const days = w.daily.time.slice(ti, ti + 8).map((d, k) => ({ d, i: ti + k }));
  const spray = derived.spray;
  const blocker = spray ? mainBlocker(spray.hours) : null;
  const month = Number(today.slice(5, 7)) - 1;

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Right now at the farm</div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat label="Temperature" value={Math.round(w.hourly.temp[hi] ?? 0)} unit="°C" />
          <Stat label="Humidity" value={Math.round(w.hourly.rh[hi] ?? 0)} unit="%" />
          <Stat label="Wind" value={Math.round(w.hourly.wind[hi] ?? 0)} unit="km/h" note={`gusts ${Math.round(w.hourly.gust[hi] ?? 0)}`} />
          <Stat label="Rain today" value={(w.daily.precip[ti] ?? 0).toFixed(1)} unit="mm" tone="rain" note={`${w.daily.precipProb[ti] ?? 0}% chance`} />
        </div>
      </header>

      {spray && (
        <Section title="Spray windows" id="spray" aside="next 72 h">
          <div className="card space-y-4 p-4">
            <p className="text-[15px]">
              {spray.next ? (
                <>
                  Best next window: <b className="font-semibold">{formatWindow(spray.next, today)}</b>
                  {spray.windows.length > 1 && <span className="text-ink-2"> · {spray.windows.length - 1} more in the next 3 days</span>}
                </>
              ) : (
                <>No safe window in the next 3 days{blocker ? <> — mainly <b className="font-semibold">{blocker}</b></> : null}.</>
              )}
            </p>
            <SprayStrip hours={spray.hours} />
            <details className="text-sm text-ink-2">
              <summary className="cursor-pointer font-medium text-ink">What counts as a safe hour?</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Wind 3–15 km/h. Dead calm is not safe: temperature inversions carry fine spray droplets off-target.</li>
                <li>No rain that hour or in the 4 hours after, so the product dries onto the leaf.</li>
                <li>Below 30 °C and above 40% humidity, so droplets do not evaporate before landing.</li>
                <li>Daylight only.</li>
              </ul>
              <p className="mt-2">Always follow the product label if it is stricter.</p>
            </details>
          </div>
        </Section>
      )}

      <Section title="8-day forecast" id="forecast">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {['Day', 'Sky', 'Rain', 'Chance', 'High / low', 'Wind max', 'ET₀'].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-3 py-2.5 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(({ d, i }, k) => (
                <tr key={d} className="border-b border-line-2 last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">{k === 0 ? 'Today' : weekday(d)}</th>
                  <td className="px-3 py-2.5 text-ink-2">{wmo(w.daily.code[i])}</td>
                  <td className="num px-3 py-2.5 text-rain">{(w.daily.precip[i] ?? 0).toFixed(1)} mm</td>
                  <td className="num px-3 py-2.5 text-ink-2">{w.daily.precipProb[i] ?? '–'}%</td>
                  <td className="num px-3 py-2.5">{Math.round(w.daily.tMax[i] ?? 0)}° <span className="text-ink-3">/ {Math.round(w.daily.tMin[i] ?? 0)}°</span></td>
                  <td className="num px-3 py-2.5 text-ink-2">{Math.round(w.daily.windMax[i] ?? 0)} km/h</td>
                  <td className="num px-3 py-2.5 text-ink-2">{(w.daily.et0[i] ?? 0).toFixed(1)} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-3">ET₀ is how much water a reference grass crop would lose that day. Your crop uses ET₀ × its crop coefficient — see the Field tab.</p>
      </Section>

      <Section title="Rainfall against normal" id="climate">
        {climate.data ? (
          <div className="card space-y-5 p-4">
            <div className="grid grid-cols-2 gap-6">
              <Stat label={`30 days to ${shortDate(climate.data.windowEnd)}`} value={climate.data.last30Mm} unit="mm" tone="rain" />
              <Stat
                label={`${climate.data.years.length}-year average`}
                value={climate.data.last30NormalMm}
                unit="mm"
                note={climate.data.last30NormalMm > 0 ? `${Math.round((climate.data.last30Mm / climate.data.last30NormalMm) * 100)}% of normal` : 'dry season — little rain is normal'}
              />
            </div>
            <div>
              <div className="eyebrow mb-2">Average rain by month, mm ({climate.data.years[0]}–{climate.data.years[climate.data.years.length - 1]})</div>
              <MonthlyRain normals={climate.data.monthlyNormalMm} month={month} />
            </div>
            <p className="text-xs text-ink-3">Reanalysis data runs about 5 days behind, so the window ends {shortDate(climate.data.windowEnd)}.</p>
          </div>
        ) : climate.status === 'error' ? (
          <ErrorNote title="Historical rainfall unavailable" detail={climate.error} />
        ) : (
          <Skeleton className="h-56" />
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <SourceTag>Open-Meteo forecast (best-match models)</SourceTag>
        <SourceTag>ERA5 reanalysis</SourceTag>
        <span>Updated {ago(weather.savedAt)} · grid point {w.lat.toFixed(2)}, {w.lng.toFixed(2)}</span>
      </div>
    </div>
  );
}

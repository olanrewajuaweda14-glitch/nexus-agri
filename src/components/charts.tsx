import type { CropDef } from '../lib/crops';
import type { WeatherBundle } from '../lib/types';
import type { WaterBalance } from '../lib/engine/water';
import type { SprayHour, SprayOutlook } from '../lib/engine/spray';
import { hourLabel, monthName, shortDate, weekday } from '../lib/dates';

/* ------------------------------- Crop timeline ------------------------------- */

export function CropTimeline({ crop, dap }: { crop: CropDef; dap: number }) {
  const total = crop.maturityDays;
  const stages = crop.stages;
  const pos = Math.max(0, Math.min(1, dap / total));
  return (
    <div>
      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line-2" aria-hidden>
          {stages.map((s, i) => {
            const end = stages[i + 1]?.startDap ?? total;
            const w = ((Math.min(end, total) - s.startDap) / total) * 100;
            const filled = dap >= end ? 1 : dap <= s.startDap ? 0 : (dap - s.startDap) / (end - s.startDap);
            return (
              <div key={s.name} className="relative h-full border-r-2 border-card last:border-r-0" style={{ width: `${w}%` }}>
                <div className="grow-x absolute inset-y-0 left-0 bg-leaf" style={{ width: `${filled * 100}%`, ['--i' as string]: i }} />
              </div>
            );
          })}
        </div>
        {dap >= 0 && (
          <div className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-ink [animation:fade_400ms_ease_both_900ms]" style={{ left: `${pos * 100}%` }} aria-hidden />
        )}
      </div>
      <ol className="mt-2 hidden justify-between text-[11px] text-ink-3 sm:flex" aria-label="Growth stages">
        {stages.map((s) => (
          <li key={s.name} className={`truncate ${dap >= s.startDap ? 'text-ink-2' : ''}`} style={{ maxWidth: `${100 / stages.length}%` }}>
            <span className="num">d{s.startDap}</span> {s.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* --------------------------------- Week strip -------------------------------- */

export function WeekStrip({ weather, today, spray }: { weather: WeatherBundle; today: string; spray?: SprayOutlook }) {
  const { daily } = weather;
  const idx = Math.max(0, daily.time.findIndex((d) => d === today));
  const days = daily.time.slice(idx, idx + 8).map((date, k) => {
    const i = idx + k;
    return { date, rain: daily.precip[i] ?? 0, prob: daily.precipProb[i] ?? 0, tMax: daily.tMax[i], tMin: daily.tMin[i] };
  });
  const windowDays = new Set((spray?.windows ?? []).map((w) => w.start.slice(0, 10)));
  const sprayUntil = spray?.hours[spray.hours.length - 1]?.time.slice(0, 10) ?? '';
  const scale = Math.max(20, ...days.map((d) => d.rain));

  return (
    <ol className="grid grid-cols-8 gap-1" aria-label="8-day forecast">
      {days.map((d, k) => (
        <li
          key={d.date}
          className={`flex flex-col items-center rounded-lg px-0.5 py-2 ${k === 0 ? 'bg-paper' : ''}`}
          aria-label={`${k === 0 ? 'Today' : weekday(d.date)}: ${d.rain} mm rain, ${d.prob}% chance, high ${d.tMax ?? '?'}°, low ${d.tMin ?? '?'}°${windowDays.has(d.date) ? ', spray window' : ''}`}
        >
          <div className={`text-[11px] font-medium ${k === 0 ? 'text-ink' : 'text-ink-3'}`}>{k === 0 ? 'Today' : weekday(d.date)}</div>
          <div className="relative mt-1.5 flex h-14 w-full items-end justify-center" aria-hidden>
            <div
              className="grow-y w-3 rounded-t-sm bg-rain"
              style={{ height: `${Math.max(d.rain > 0 ? 6 : 2, (d.rain / scale) * 100)}%`, opacity: d.rain > 0 ? 0.35 + (d.prob / 100) * 0.65 : 0.15, ['--i' as string]: k }}
            />
          </div>
          <div className="num mt-1 text-[11px] text-rain">{d.rain >= 1 ? Math.round(d.rain) : d.rain > 0 ? '<1' : '0'}</div>
          <div className="num text-[10px] text-ink-3">{d.prob}%</div>
          <div className="num mt-1 text-[12px] text-ink">{d.tMax != null ? Math.round(d.tMax) : '–'}°</div>
          <div className="num text-[10px] text-ink-3">{d.tMin != null ? Math.round(d.tMin) : '–'}°</div>
          {spray && d.date <= sprayUntil && (
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ background: windowDays.has(d.date) ? 'var(--color-leaf)' : 'var(--color-line)' }} title={windowDays.has(d.date) ? 'Spray window' : 'No spray window'} />
          )}
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------- Spray strip -------------------------------- */

const SPRAY_COLOR = { good: 'var(--color-leaf)', fair: '#9cbf8f', no: 'var(--color-line-2)' } as const;

export function SprayStrip({ hours }: { hours: SprayHour[] }) {
  const days: { date: string; hours: SprayHour[] }[] = [];
  for (const h of hours) {
    const d = h.time.slice(0, 10);
    if (!days.length || days[days.length - 1].date !== d) days.push({ date: d, hours: [] });
    days[days.length - 1].hours.push(h);
  }
  return (
    <div className="space-y-2">
      {days.slice(0, 4).map((d, di) => (
        <div key={d.date} className="flex items-center gap-3">
          <div className="w-12 shrink-0 text-xs text-ink-2">{weekday(d.date)}</div>
          <div className="relative flex h-6 flex-1 gap-px" role="list" aria-label={`Spray conditions ${shortDate(d.date)}`}>
            {Array.from({ length: 24 }, (_, hr) => {
              const h = d.hours.find((x) => Number(x.time.slice(11, 13)) === hr);
              return (
                <div
                  role="listitem"
                  key={hr}
                  className="fade-in flex-1 first:rounded-l last:rounded-r"
                  style={{ background: h ? SPRAY_COLOR[h.status] : 'transparent', ['--i' as string]: di * 24 + hr }}
                  title={h ? `${hourLabel(h.time)}: ${h.status === 'no' ? 'no — ' : h.status === 'fair' ? 'possible — ' : 'good'}${h.reasons.join(', ')}` : undefined}
                  aria-label={h ? `${hourLabel(h.time)} ${h.status}` : undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pl-15 text-[10px] text-ink-3">
        <div className="flex flex-1 justify-between num">
          <span>12am</span><span>6am</span><span>noon</span><span>6pm</span><span>12am</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 pt-1 text-xs text-ink-2">
        <Legend color={SPRAY_COLOR.good} label="Good" />
        <Legend color={SPRAY_COLOR.fair} label="Possible (light wind / dry air)" />
        <Legend color={SPRAY_COLOR.no} label="Don't spray" border />
      </div>
    </div>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${border ? 'border border-line' : ''}`} style={{ background: color }} />
      {label}
    </span>
  );
}

/* -------------------------------- Water chart -------------------------------- */

export function WaterChart({ water }: { water: WaterBalance }) {
  const W = 460;
  const H = 230;
  const pad = { l: 30, r: 6, t: 16, b: 50 };
  const days = water.days;
  const n = days.length;
  const maxTaw = Math.max(...days.map((d) => d.taw), 1);
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const yTop = pad.t;
  const yBase = H - pad.b;
  const y = (mm: number) => yBase - (mm / maxTaw) * (yBase - yTop);
  const rainMax = Math.max(20, ...days.map((d) => d.rain));
  const rainY = (mm: number) => (mm / rainMax) * 30;
  const barW = Math.max(4, (W - pad.l - pad.r) / n - 3);

  const avail = days.map((d, i) => [x(i), y(d.taw - d.depletion)] as const);
  const area = `M${x(0)},${yBase} ${avail.map(([a, b]) => `L${a},${b}`).join(' ')} L${x(n - 1)},${yBase} Z`;
  const line = avail.map(([a, b], i) => `${i ? 'L' : 'M'}${a},${b}`).join(' ');
  const stress = days.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.taw - d.raw)}`).join(' ');
  const full = days.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.taw)}`).join(' ');
  const tx = x(water.todayIndex);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Root-zone water over the last 30 days and next 7">
      <defs>
        <pattern id="fc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--color-rain-soft)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-card)" strokeWidth="2" />
        </pattern>
        <clipPath id="past"><rect x="0" y="0" width={tx} height={H} /></clipPath>
        <clipPath id="future"><rect x={tx} y="0" width={W - tx} height={H} /></clipPath>
      </defs>

      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(maxTaw * f)} y2={y(maxTaw * f)} stroke="var(--color-line-2)" />
          <text x={pad.l - 6} y={y(maxTaw * f) + 4} textAnchor="end" className="num" fontSize="12" fill="var(--color-ink-3)">{Math.round(maxTaw * f)}</text>
        </g>
      ))}

      <g className="[animation:fade_900ms_ease_both_500ms]">
        <path d={area} fill="var(--color-rain-soft)" clipPath="url(#past)" />
        <path d={area} fill="url(#fc-hatch)" clipPath="url(#future)" />
      </g>
      <path d={full} fill="none" stroke="var(--color-ink-3)" strokeWidth="1" strokeDasharray="2 3" />
      <path d={stress} fill="none" stroke="var(--color-clay)" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={line} fill="none" stroke="var(--color-rain)" strokeWidth="2" pathLength={1} className="draw" />

      {days.map((d, i) => (d.irrigation || d.refilled) && (
        <g key={`irr-${d.date}`}>
          <rect x={x(i) - barW / 2} y={H - 18 - 30} width={barW} height={30} fill="var(--color-leaf)" opacity=".85" rx="1" className="grow-y" style={{ transformBox: 'fill-box' }} />
          <title>{d.refilled ? 'Irrigated fully (your log)' : `Irrigated ${d.irrigation} mm (your log)`}</title>
        </g>
      ))}
      {days.map((d, i) => d.observed && (
        <circle key={`obs-${d.date}`} cx={x(i)} cy={H - 18 - rainY(d.rain) - 5} r="2.5" fill="var(--color-rain)">
          <title>{`Your gauge: ${d.rain} mm`}</title>
        </circle>
      ))}
      {days.map((d, i) => d.rain > 0.5 && (
        <rect key={d.date} x={x(i) - barW / 2} y={H - 18 - rainY(d.rain)} width={barW} height={rainY(d.rain)} fill="var(--color-rain)" opacity={d.forecast ? 0.45 : 0.85} rx="1" className="grow-y" style={{ transformBox: 'fill-box', ['--i' as string]: i * 0.5 }} />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - 18} y2={H - 18} stroke="var(--color-line)" />

      <line x1={tx} x2={tx} y1={yTop - 4} y2={H - 18} stroke="var(--color-ink)" strokeWidth="1.25" />
      <text x={tx} y={H - 3} textAnchor="middle" fontSize="13" fill="var(--color-ink)" fontWeight="600">today</text>
      <text x={x(0)} y={H - 3} fontSize="12" fill="var(--color-ink-3)">{shortDate(days[0].date)}</text>
      <text x={x(n - 1)} y={H - 3} textAnchor="end" fontSize="12" fill="var(--color-ink-3)">{shortDate(days[n - 1].date)}</text>
      <text x={pad.l + 4} y={y(maxTaw) - 3} fontSize="12" fill="var(--color-ink-3)">full (field capacity)</text>
    </svg>
  );
}

/* -------------------------------- Monthly rain ------------------------------- */

export function MonthlyRain({ normals, month }: { normals: number[]; month: number }) {
  const max = Math.max(...normals, 1);
  return (
    <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Average monthly rainfall">
      {normals.map((v, m) => (
        <div key={m} className="flex h-full flex-1 flex-col items-center justify-end">
          <span className={`num mb-1 text-[10px] ${m === month ? 'text-ink' : 'text-ink-3'}`}>{v}</span>
          <div className="grow-y w-full rounded-t-sm" style={{ height: `${(v / max) * 75}%`, minHeight: 2, background: m === month ? 'var(--color-rain)' : 'var(--color-rain-soft)', ['--i' as string]: m }} />
          <span className={`mt-1 text-[10px] ${m === month ? 'font-bold text-ink' : 'text-ink-3'}`}>{monthName(m)[0]}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Forecast rows ------------------------------- */

/**
 * One row per day: expected rain as a bar (opacity = chance) and the day's
 * temperature range placed on a shared week-wide scale, so warm and cool days
 * read at a glance without a table.
 */
export function ForecastRows({ weather, today, label }: { weather: WeatherBundle; today: string; label: (code: number | null) => string }) {
  const d = weather.daily;
  const i0 = Math.max(0, d.time.indexOf(today));
  const rows = d.time.slice(i0, i0 + 8).map((date, k) => {
    const i = i0 + k;
    return { date, k, rain: d.precip[i] ?? 0, prob: d.precipProb[i] ?? 0, lo: d.tMin[i] ?? 0, hi: d.tMax[i] ?? 0, wind: d.windMax[i] ?? 0, et0: d.et0[i] ?? 0, code: d.code[i] };
  });
  const tMin = Math.floor(Math.min(...rows.map((r) => r.lo)));
  const tMax = Math.ceil(Math.max(...rows.map((r) => r.hi)));
  const span = Math.max(1, tMax - tMin);
  const rainMax = Math.max(20, ...rows.map((r) => r.rain));

  return (
    <ol className="card stagger divide-y divide-line-2">
      {rows.map((r) => (
        <li key={r.date} className="grid grid-cols-[3.25rem_1fr_1.15fr] items-center gap-3 px-3 py-2.5 sm:grid-cols-[4rem_8rem_1fr_1.3fr] sm:px-4" style={{ ['--i' as string]: r.k }}>
          <div className={`text-sm ${r.k === 0 ? 'font-bold' : 'font-medium'}`}>{r.k === 0 ? 'Today' : weekday(r.date)}</div>
          <div className="hidden truncate text-sm text-ink-2 sm:block">{label(r.code)}</div>
          <div className="flex min-w-0 items-center gap-2" aria-label={`${r.rain.toFixed(1)} mm rain, ${r.prob}% chance`}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rain-soft/60">
              <div className="grow-x h-full rounded-full bg-rain" style={{ width: `${Math.max(r.rain > 0 ? 4 : 0, (r.rain / rainMax) * 100)}%`, opacity: 0.35 + (r.prob / 100) * 0.65, ['--i' as string]: r.k }} />
            </div>
            <span className="num shrink-0 whitespace-nowrap text-right text-xs text-ink-2">
              <span className="text-rain">{r.rain >= 1 ? Math.round(r.rain) : r.rain > 0 ? '<1' : '0'}</span>
              <span className="text-ink-3">mm</span> <span className="inline-block w-7">{r.prob}%</span>
            </span>
          </div>
          <div className="flex items-center gap-2" aria-label={`Low ${Math.round(r.lo)}°, high ${Math.round(r.hi)}°`}>
            <span className="num w-6 shrink-0 text-right text-xs text-ink-3">{Math.round(r.lo)}°</span>
            <div className="relative h-2 flex-1 rounded-full bg-line-2">
              <div
                className="grow-x absolute inset-y-0 rounded-full"
                style={{
                  left: `${((r.lo - tMin) / span) * 100}%`,
                  width: `${Math.max(6, ((r.hi - r.lo) / span) * 100)}%`,
                  background: 'linear-gradient(90deg, #d9b25a, #c0643a)',
                  ['--i' as string]: r.k,
                }}
              />
            </div>
            <span className="num w-7 shrink-0 text-xs font-medium">{Math.round(r.hi)}°</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------ Root-zone tank ------------------------------- */

/** Soil column filled to today's plant-available water, with the crop's stress line. */
export function RootZoneTank({ available, stressAt, rootCm }: { available: number; stressAt: number; rootCm: number }) {
  const W = 96;
  const H = 168;
  const top = 26;
  const bottom = H - 6;
  const h = bottom - top;
  const fillY = bottom - h * Math.max(0, Math.min(1, available));
  const stressY = bottom - h * stressAt;
  const stressed = available < stressAt;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Root zone ${Math.round(available * 100)}% full; stress below ${Math.round(stressAt * 100)}%`} className="shrink-0">
      <defs>
        <clipPath id="tank-clip"><rect x="8" y={top} width={W - 16} height={h} rx="10" /></clipPath>
        <linearGradient id="tank-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stressed ? '#d38b62' : '#7fa6c9'} />
          <stop offset="100%" stopColor={stressed ? '#a03c27' : 'var(--color-rain)'} />
        </linearGradient>
        <pattern id="tank-soil" width="12" height="10" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill="var(--color-soil)" opacity=".25" />
          <circle cx="9" cy="8" r=".8" fill="var(--color-soil)" opacity=".2" />
        </pattern>
      </defs>
      {/* little plant on the surface */}
      <path d={`M${W / 2} ${top} v-14 m0 6 q-8 -2 -11 -9 m11 5 q8 -2 10 -10`} stroke="var(--color-leaf)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g clipPath="url(#tank-clip)">
        <rect x="8" y={top} width={W - 16} height={h} fill="#efe5d2" />
        <rect x="8" y={top} width={W - 16} height={h} fill="url(#tank-soil)" />
        <g className="grow-y" style={{ transformBox: 'fill-box', ['--i' as string]: 4 }}>
          <rect x="8" y={fillY} width={W - 16} height={bottom - fillY} fill="url(#tank-water)" opacity=".85" />
          <path d={`M8 ${fillY} q10 -3 20 0 t20 0 t20 0 t20 0`} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" />
        </g>
        {/* roots */}
        <path d={`M${W / 2} ${top} v${Math.min(h - 8, (rootCm / 100) * h)} M${W / 2} ${top + 10} q-10 8 -14 22 M${W / 2} ${top + 18} q12 8 14 26`} stroke="var(--color-soil)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".7" pathLength={1} className="draw" />
      </g>
      <rect x="8" y={top} width={W - 16} height={h} rx="10" fill="none" stroke="var(--color-line)" strokeWidth="1.5" />
      <line x1="2" x2={W - 2} y1={stressY} y2={stressY} stroke="var(--color-clay)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={W - 2} y={stressY - 4} textAnchor="end" fontSize="9" fill="var(--color-clay)">stress</text>
    </svg>
  );
}

import type { WeatherBundle } from '../lib/types';
import type { SprayOutlook } from '../lib/engine/spray';
import { formatWindow } from '../lib/engine/plan';
import { hourLabel } from '../lib/dates';
import { wmo } from '../lib/format';
import { CountUp } from './motion';

/**
 * The sky over the farm right now. The background follows the real local time
 * (night, dawn, day, dusk); the arc spans today's daylight hours with the
 * safe-to-spray hours marked; the sun sits at the current hour; rain streaks
 * fall only when it is raining there now. Nothing here is decorative filler —
 * each mark is a forecast value.
 */

type Phase = 'night' | 'dawn' | 'day' | 'dusk';

const SKY: Record<Phase, { from: string; to: string; ink: string; sub: string }> = {
  night: { from: '#1c2534', to: '#2f3b52', ink: '#f2ede2', sub: '#b9c0cc' },
  dawn: { from: '#f2d4b8', to: '#efe6d6', ink: '#1d1b16', sub: '#5f5747' },
  day: { from: '#d9e6ee', to: '#f1ece1', ink: '#1d1b16', sub: '#55503f' },
  dusk: { from: '#efc79a', to: '#f0e3cd', ink: '#1d1b16', sub: '#5f5747' },
};

const W = 340;
const H = 122;
const CX = W / 2;
const CY = 96;
const RX = 150;
const RY = 80;

const pt = (f: number) => {
  const a = Math.PI * (1 - f);
  return [CX + RX * Math.cos(a), CY - RY * Math.sin(a)] as const;
};
const arc = (f0: number, f1: number) => {
  const [x0, y0] = pt(f0);
  const [x1, y1] = pt(f1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${RX} ${RY} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function FarmSky({ weather, spray, today, nowIso, standalone = false }: { weather: WeatherBundle; spray: SprayOutlook; today: string; nowIso: string; standalone?: boolean }) {
  const h = weather.hourly;
  const nowHour = nowIso.slice(0, 13);
  const found = h.time.findIndex((t) => t.slice(0, 13) >= nowHour);
  const iNow = found < 0 ? Math.max(0, h.time.length - 1) : found;
  const todayIdx = h.time.map((t, i) => [t, i] as const).filter(([t]) => t.startsWith(today));
  const daylight = todayIdx.filter(([, i]) => h.isDay[i] === 1);
  const dayStart = daylight.length ? Number(daylight[0][0].slice(11, 13)) : 6;
  const dayEnd = daylight.length ? Number(daylight[daylight.length - 1][0].slice(11, 13)) + 1 : 19;
  const span = Math.max(1, dayEnd - dayStart);

  const localHour = Number(nowIso.slice(11, 13)) + Number(nowIso.slice(14, 16)) / 60;
  const isDay = h.isDay[iNow] === 1;
  const phase: Phase = !isDay ? 'night' : localHour < dayStart + 1.5 ? 'dawn' : localHour > dayEnd - 1.5 ? 'dusk' : 'day';
  const raining = (h.precip[iNow] ?? 0) >= 0.2 || (h.precipProb[iNow] ?? 0) >= 60;
  const sky = SKY[phase];
  const di = weather.daily.time.indexOf(today);
  const code = weather.daily.code[di] ?? null;

  const sprayByHour = new Map(spray.hours.map((s) => [s.time.slice(0, 13), s]));
  const segs = Array.from({ length: span }, (_, k) => {
    const hr = dayStart + k;
    const key = `${today}T${String(hr).padStart(2, '0')}`;
    const s = sprayByHour.get(key);
    const past = hr + 1 <= localHour;
    return { k, hr, status: s?.status ?? (past ? 'past' : 'no'), past };
  });

  const sunF = Math.max(0, Math.min(1, (localHour - dayStart) / span));
  const [sx, sy] = pt(sunF);
  const nowSpray = spray.hours[0];
  const verdict = !isDay
    ? spray.next
      ? { tone: 'muted', next: undefined as string | undefined, text: `Dark now · next spray window ${lower(formatWindow(spray.next, today))}` }
      : { tone: 'muted', next: undefined as string | undefined, text: 'Dark now · no safe spray window in the next 3 days' }
    : nowSpray?.status === 'good'
      ? { tone: 'good', text: 'Good hour to spray', next: spray.windows[0] ? `Window runs ${lower(formatWindow(spray.windows[0], today)).replace(/^today /, '')}` : undefined }
      : nowSpray?.status === 'fair'
        ? { tone: 'fair', text: `Spraying possible: ${nowSpray.reasons.join(', ')}`, next: undefined as string | undefined }
        : { tone: 'bad', text: `Don't spray now: ${nowSpray?.reasons.filter((r) => r !== 'dark').join(', ') || 'conditions unsafe'}`, next: spray.next ? `Next window ${lower(formatWindow(spray.next, today))}` : 'No safe window in 3 days' };

  const temp = h.temp[iNow] ?? 0;

  return (
    <div
      className={`relative overflow-hidden ${standalone ? 'rounded-[14px] border border-line' : 'rounded-t-[14px]'}`}
      style={{ background: `linear-gradient(180deg, ${sky.from} 0%, ${sky.to} 100%)`, color: sky.ink }}
    >
      {raining && <Rain dark={phase === 'night'} />}
      {phase === 'night' && <Stars />}

      <div className="relative px-4 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="num text-[46px] font-medium leading-none tracking-tight">
                <CountUp value={temp} />
              </span>
              <span className="text-lg" style={{ color: sky.sub }}>°C</span>
            </div>
            <p className="mt-1.5 text-sm font-medium">{raining ? 'Raining now' : wmo(code)}</p>
          </div>
          <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-right text-xs" style={{ color: sky.sub }}>
            <dt>Wind</dt>
            <dd className="num" style={{ color: sky.ink }}>{Math.round(h.wind[iNow] ?? 0)} km/h</dd>
            <dt>Humidity</dt>
            <dd className="num" style={{ color: sky.ink }}>{Math.round(h.rh[iNow] ?? 0)}%</dd>
            <dt>Rain today</dt>
            <dd className="num" style={{ color: sky.ink }}>{(weather.daily.precip[di] ?? 0).toFixed(1)} mm</dd>
          </dl>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mt-1 h-auto w-full max-w-[440px]" aria-hidden>
          <defs>
            <radialGradient id="sun-g">
              <stop offset="0%" stopColor="#ffd27a" stopOpacity=".9" />
              <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* daylight track */}
          <path d={arc(0, 1)} fill="none" stroke={phase === 'night' ? 'rgb(255 255 255 / .12)' : 'rgb(29 27 22 / .07)'} strokeWidth="8" strokeLinecap="round" />
          {/* part of the day already gone */}
          {isDay && sunF > 0.01 && <path d={arc(0, sunF)} fill="none" stroke="rgb(29 27 22 / .16)" strokeWidth="8" strokeLinecap="round" pathLength={1} className="draw" style={{ animationDuration: '900ms' }} />}
          {segs.filter((s) => !s.past && (s.status === 'good' || s.status === 'fair')).map((s) => (
            <path
              key={s.k}
              d={arc(s.k / span + 0.004, (s.k + 1) / span - 0.004)}
              fill="none"
              stroke={s.status === 'good' ? 'var(--color-leaf)' : '#8fb582'}
              strokeWidth="8"
              className="fade-in"
              style={{ ['--i' as string]: s.k * 4 }}
            />
          ))}
          {/* hour ticks every 3 h */}
          {/* horizon with hour marks */}
          <line x1={6} x2={W - 6} y1={CY} y2={CY} stroke={sky.sub} strokeOpacity=".4" strokeWidth="1" />
          {[dayStart, 9, 12, 15, dayEnd]
            .filter((hr, i, all) => hr >= dayStart && hr <= dayEnd && all.indexOf(hr) === i && (hr === dayStart || hr === dayEnd || hr === 12 || (hr - dayStart >= 3 && dayEnd - hr >= 3)))
            .map((hr) => ({ f: (hr - dayStart) / span, hr }))
            .map(({ f, hr }) => {
            const [x] = pt(f);
            const isNoon = hr === 12;
            return (
              <g key={hr}>
                <line x1={x} x2={x} y1={CY} y2={CY + 4} stroke={sky.sub} strokeOpacity=".5" />
                <text x={Math.min(W - 12, Math.max(12, x))} y={CY + 17} textAnchor="middle" fontSize="10.5" fill={sky.sub} fontWeight={isNoon ? 600 : 400} className="num">
                  {hourLabel(`${today}T${String(hr).padStart(2, '0')}`).replace(' ', '')}
                </text>
              </g>
            );
          })}
          {isDay ? (
            <g className="[animation:rise_900ms_var(--ease-out)_both_300ms]">
              <circle cx={sx} cy={sy} r="20" fill="url(#sun-g)" className="[animation:sun-glow_4s_ease-in-out_infinite]" style={{ transformOrigin: `${sx}px ${sy}px` }} />
              <circle cx={sx} cy={sy} r="8" fill="#f5b83d" stroke="#fff" strokeWidth="2" />
            </g>
          ) : (
            <g>
              <circle cx={CX} cy={CY - 40} r="11" fill="#e9e4d6" />
              <circle cx={CX + 5} cy={CY - 44} r="10" fill={sky.from} />
            </g>
          )}
        </svg>
      </div>

      <div
        className={`relative flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t px-4 py-2.5 text-sm font-medium ${phase === 'night' ? 'border-white/10' : 'border-ink/10'}`}
        role="status"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${verdict.tone === 'good' ? 'bg-leaf beacon' : verdict.tone === 'fair' ? 'bg-[#8fb582]' : verdict.tone === 'bad' ? 'bg-clay' : 'bg-white/50'}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">{verdict.text}</span>
        {verdict.next && <span className="w-full pl-4 text-xs font-normal sm:ml-auto sm:w-auto sm:pl-0" style={{ color: sky.sub }}>{verdict.next}</span>}
      </div>
    </div>
  );
}

function Rain({ dark }: { dark: boolean }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <pattern id="rain-p" width="22" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <line x1="4" y1="0" x2="4" y2="12" stroke={dark ? '#9fb3cc' : '#5b7fa3'} strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
          <line x1="15" y1="17" x2="15" y2="27" stroke={dark ? '#9fb3cc' : '#5b7fa3'} strokeWidth="1" strokeLinecap="round" opacity=".4" />
        </pattern>
      </defs>
      <rect x="-20%" y="-50%" width="140%" height="200%" fill="url(#rain-p)" className="[animation:rainfall_900ms_linear_infinite]" />
    </svg>
  );
}

function Stars() {
  const stars = [[30, 22], [80, 40], [130, 18], [210, 30], [262, 16], [300, 44], [180, 54], [52, 64]];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 340 200" preserveAspectRatio="xMidYMin slice" aria-hidden>
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.3} fill="#fff" opacity={0.5 + (i % 3) * 0.15} />
      ))}
    </svg>
  );
}

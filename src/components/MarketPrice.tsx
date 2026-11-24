import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import type { CropId } from '../lib/types';
import type { PriceSummary } from '../lib/data/prices';
import { getPrices } from '../lib/data/api';
import { monthName } from '../lib/dates';
import { naira } from '../lib/format';
import { Skeleton, SourceTag } from './ui';

type State = { status: 'loading' } | { status: 'ok'; summary: PriceSummary | null; stale: boolean } | { status: 'error'; message: string };

export function useMarketPrice(crop: CropId, lat: number, lng: number) {
  const [s, setS] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setS({ status: 'loading' });
    getPrices(crop, lat, lng)
      .then((r) => alive && setS({ status: 'ok', summary: r.summary, stale: r.stale }))
      .catch((e: Error) => alive && setS({ status: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [crop, lat, lng]);
  return s;
}

const monthLabel = (ym: string) => `${monthName(Number(ym.slice(5, 7)) - 1)} ${ym.slice(0, 4)}`;

/** Latest monitored price at the nearest market, its trend, and the usual seasonal swing. */
export function MarketPrice({ state, cropName, onUse, usedPrice }: { state: State; cropName: string; onUse?: (perTon: number) => void; usedPrice?: number }) {
  if (state.status === 'loading') return <Skeleton className="h-40" />;
  if (state.status === 'error') {
    return (
      <div className="card flex gap-3 p-4 text-sm text-ink-2">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        <p>Market prices aren't available right now. {state.message}</p>
      </div>
    );
  }
  const s = state.summary;
  if (!s) {
    return (
      <div className="card flex gap-3 p-4 text-sm text-ink-2">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" aria-hidden />
        <p>No monitored market reports {cropName.toLowerCase()} prices near you yet. Ask buyers at your nearest market and enter the price yourself.</p>
      </div>
    );
  }

  const vals = s.history.map((h) => h.perTon);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const year = s.history.length > 12 ? s.history[s.history.length - 13] : null;
  const change = year ? Math.round((s.latest.perTon / year.perTon - 1) * 100) : null;
  const low = s.seasonal ? s.seasonal.indexOf(Math.min(...s.seasonal)) : null;
  const high = s.seasonal ? s.seasonal.indexOf(Math.max(...s.seasonal)) : null;
  const swing = s.seasonal && low != null && high != null ? Math.round((s.seasonal[high] / s.seasonal[low] - 1) * 100) : null;
  const W = 300;
  const H = 56;
  const pts = s.history.map((h, i) => `${(i / Math.max(1, s.history.length - 1)) * W},${H - 4 - ((h.perTon - lo) / Math.max(1, hi - lo)) * (H - 8)}`).join(' ');

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{s.pricetype}, {s.commodity}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-3xl font-medium">{naira(s.latest.perTon / 10)}</span>
            <span className="text-sm text-ink-3">per 100 kg bag</span>
          </div>
          <p className="mt-0.5 text-sm text-ink-2">
            {s.market}, {s.admin1}, {s.distanceKm < 5 ? 'near you' : `${s.distanceKm} km away`}, {monthLabel(s.latest.month)}
            {change != null && <span className={change >= 0 ? 'text-leaf' : 'text-clay'}>, {change >= 0 ? '+' : ''}{change}% on a year ago</span>}
          </p>
        </div>
        {onUse && (
          <button type="button" className="btn btn-ghost press px-3 py-1.5 text-sm" onClick={() => onUse(s.latest.perTon)} disabled={usedPrice === s.latest.perTon}>
            {usedPrice === s.latest.perTon ? 'Using this price' : `Use ${naira(s.latest.perTon, true)}/t`}
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" role="img" aria-label={`Price over the last ${s.history.length} months, from ${naira(lo / 10)} to ${naira(hi / 10)} per bag`}>
        <polyline points={pts} fill="none" stroke="var(--color-leaf)" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1} className="draw" />
      </svg>
      <div className="flex justify-between text-[11px] text-ink-3">
        <span>{monthLabel(s.history[0].month)}</span>
        <span>{naira(lo / 10, true)} – {naira(hi / 10, true)} per bag</span>
        <span>{monthLabel(s.latest.month)}</span>
      </div>

      {s.seasonal && low != null && high != null && swing != null && (
        <p className="rounded-lg bg-paper px-3 py-2 text-sm">
          In past years {cropName.toLowerCase()} here was usually cheapest in <b>{monthName(low)}</b> and dearest in <b>{monthName(high)}</b>, about <b>{swing}%</b> apart
          {s.seasonalSource !== 'market' && <span className="text-ink-3"> ({s.seasonalSource === 'state' ? 'pattern from markets in the same state' : 'national pattern'})</span>}.
        </p>
      )}
      {s.nearby.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-2">Other markets</summary>
          <ul className="mt-2 space-y-1">
            {s.nearby.map((n) => (
              <li key={n.market} className="flex justify-between gap-3">
                <span>{n.market}, {n.admin1} <span className="text-ink-3">· {n.distanceKm} km</span></span>
                <span className="num">{naira(n.perTon / 10)}/bag</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <SourceTag>WFP market monitoring</SourceTag>
        {s.ageMonths > 2 && <span className="text-sun">Latest report is {s.ageMonths} months old.</span>}
        {state.stale && <span>Offline copy.</span>}
        <span>{s.pricetype === 'Wholesale' ? 'Market wholesale price — farm-gate offers are usually lower.' : 'Retail price — traders pay farmers less.'}</span>
      </div>
    </div>
  );
}

import { ArrowRight, CloudRain, Droplets, Plus, SprayCan, Sprout } from 'lucide-react';
import { Logo } from '../components/Logo';
import { CropGlyph } from '../components/CropGlyph';
import { CROPS, scaledCrop } from '../lib/crops';
import type { Farm } from '../lib/types';
import { stageFor } from '../lib/engine/stage';
import { localToday } from '../lib/dates';

/** One maize season, drawn from the real crop table: the jobs the app would hand you at each point. */
const SEASON = [
  { dap: -1, job: 'Wait for the rains', day: 'Before sowing' },
  { dap: 12, job: 'Basal NPK', day: 'Day 12' },
  { dap: 34, job: 'Top-dress urea', day: 'Day 34' },
  { dap: 58, job: 'Watch water & heat', day: 'Day 58' },
  { dap: 116, job: 'Harvest & dry', day: 'Day 116' },
];

export function Welcome({ farms = [], onStart, onSample, onContinue, onBackup }: { farms?: Farm[]; onStart: () => void; onSample: () => void; onContinue?: (id: string) => void; onBackup?: () => void }) {
  const hasSample = farms.some((f) => f.id === 'sample');
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
      <div className="[animation:fade_500ms_ease_both]"><Logo /></div>
      <main className="mt-12 flex-1 sm:mt-16">
        <h1 className="font-display text-[44px] font-semibold leading-[1] tracking-tight sm:text-7xl">
          <span className="block [animation:rise_700ms_var(--ease-out)_both_80ms]">What your farm</span>
          <span className="block [animation:rise_700ms_var(--ease-out)_both_160ms]">needs <span className="relative inline-block text-leaf">
            this week.
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2.5 w-full sm:-bottom-2.5" aria-hidden>
              <path d="M2 8 Q50 2 100 7 T198 5" fill="none" stroke="var(--color-sun)" strokeWidth="3" strokeLinecap="round" pathLength={1} className="draw" style={{ animationDelay: '700ms' }} />
            </svg>
          </span></span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 [animation:rise_700ms_var(--ease-out)_both_260ms]">
          Put your field on the map and tell us what you planted. Nexus Agri reads the forecast, the soil and your crop's growth stage, and gives you a short list of jobs — with the day to do each one and the reason why.
        </p>
        {farms.length > 0 && onContinue ? (
          <div className="mt-8 space-y-3 [animation:rise_700ms_var(--ease-out)_both_340ms]">
            <p className="eyebrow">Your fields</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {farms.map((f) => {
                const st = stageFor(scaledCrop(f.crop, f.maturity), f.plantingDate, localToday());
                return (
                  <li key={f.id}>
                    <button type="button" onClick={() => onContinue(f.id)} className="card press lift flex w-full items-center gap-3 p-4 text-left">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{f.name}</span>
                        <span className="block truncate text-sm text-ink-2">
                          {CROPS[f.crop].name} · {st.status === 'not-planted' ? `planting in ${-st.dap} days` : st.status === 'mature' ? 'mature' : `day ${st.dap}, ${st.name.toLowerCase()}`}
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-leaf" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-ghost press" onClick={onStart}><Plus className="h-4 w-4" aria-hidden /> Add a field</button>
              {!hasSample && <button type="button" className="btn press text-ink-2 hover:text-ink" onClick={onSample}>Try a sample farm</button>}
              {onBackup && <button type="button" className="btn press text-ink-2 hover:text-ink" onClick={onBackup}>Back up or move phones</button>}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3 [animation:rise_700ms_var(--ease-out)_both_340ms]">
            <button type="button" className="btn btn-primary press px-6 py-3 text-base shadow-[0_8px_24px_-12px_var(--color-leaf)]" onClick={onStart}>Set up my farm</button>
            <button type="button" className="btn btn-ghost press px-6 py-3 text-base" onClick={onSample}>Try a sample farm</button>
            {onBackup && (
              <button type="button" className="btn press w-full text-sm text-ink-2 hover:text-ink sm:w-auto" onClick={onBackup}>
                New phone? Restore from a backup
              </button>
            )}
          </div>
        )}

        <figure className="mt-14 [animation:fade_800ms_ease_both_400ms]" aria-label="A maize season from sowing to harvest">
          <div className="relative">
            <div className="grid grid-cols-5 items-end">
              {SEASON.map((s, i) => (
                <div key={s.dap} className="flex justify-center [animation:rise_700ms_var(--ease-out)_both]" style={{ animationDelay: `${500 + i * 160}ms` }}>
                  <CropGlyph crop={CROPS.maize} dap={s.dap} size={i === 0 ? 54 : 58 + i * 8} />
                </div>
              ))}
            </div>
            <div className="mt-1 h-[3px] rounded-full bg-gradient-to-r from-soil/30 via-soil/60 to-soil/30" />
          </div>
          <ol className="mt-3 grid grid-cols-5 text-center">
            {SEASON.map((s, i) => (
              <li key={s.dap} className="px-1 [animation:fade_600ms_ease_both]" style={{ animationDelay: `${700 + i * 160}ms` }}>
                <div className="num text-[10px] uppercase tracking-wider text-ink-3">{s.day}</div>
                <div className="mt-0.5 text-[12px] font-medium leading-tight sm:text-sm">{s.job}</div>
              </li>
            ))}
          </ol>
        </figure>

        <ul className="stagger mt-16 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {[
            { I: Sprout, t: 'Fertilizer on the right day', d: 'Top-dress when the soil is moist, not the day before a storm washes it away — with the bag count for your field size.' },
            { I: SprayCan, t: 'Hour-by-hour spray windows', d: 'Wind, rain and heat checked for the next 3 days so chemicals land on the crop.' },
            { I: Droplets, t: 'Water in the root zone', d: 'A daily soil-water balance tells you when stress starts — and when irrigating is wasted.' },
            { I: CloudRain, t: 'Works on a weak signal', d: 'Small downloads, and the last plan stays on your phone when the network drops.' },
          ].map(({ I, t, d }, i) => (
            <li key={t} className="flex gap-3.5" style={{ ['--i' as string]: i + 10 }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                <I className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <footer className="mt-16 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
        Weather: Open-Meteo. Soil: ISRIC SoilGrids. Water maths: FAO Irrigation Paper 56. Timings: standard Nigerian extension practice. Your farm data stays on this device.
      </footer>
    </div>
  );
}

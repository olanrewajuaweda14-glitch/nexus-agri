import { CloudRain, Droplets, SprayCan, Sprout } from 'lucide-react';
import { Logo } from '../components/Logo';

export function Welcome({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 pb-10 pt-8 sm:pt-14">
      <Logo />
      <main className="mt-14 flex-1 sm:mt-20">
        <h1 className="font-display text-[42px] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
          What your farm needs
          <br />
          <span className="text-leaf">this week.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
          Put your field on the map and tell us what you planted. Nexus Agri reads the forecast, the soil and your crop's growth stage, and gives you a short list of jobs — with the day to do each one and the reason why.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary px-6 py-3 text-base" onClick={onStart}>Set up my farm</button>
          <button type="button" className="btn btn-ghost px-6 py-3 text-base" onClick={onSample}>Try a sample farm</button>
        </div>

        <ul className="mt-16 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {[
            { I: Sprout, t: 'Fertilizer on the right day', d: 'Top-dress when the soil is moist, not the day before a storm washes it away.' },
            { I: SprayCan, t: 'Hour-by-hour spray windows', d: 'Wind, rain and heat checked for the next 3 days so chemicals land on the crop.' },
            { I: Droplets, t: 'Water in the root zone', d: 'A daily soil-water balance tells you when stress starts — and when irrigating is wasted.' },
            { I: CloudRain, t: 'Works on a weak signal', d: 'Small downloads, and the last plan stays on your phone when the network drops.' },
          ].map(({ I, t, d }) => (
            <li key={t} className="flex gap-3">
              <I className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-[15px] text-ink-2">{d}</p>
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

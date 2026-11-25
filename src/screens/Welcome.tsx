import { CloudRain, Egg, Plus, Sprout, Warehouse } from 'lucide-react';
import { Logo } from '../components/Logo';
import { CropGlyph } from '../components/CropGlyph';
import { CROPS } from '../lib/crops';

/** One maize season, drawn from the real crop table: the jobs the app would hand you at each point. */
const SEASON = [
  { dap: -1, job: 'Wait for the rains', day: 'Before sowing' },
  { dap: 12, job: 'Basal NPK', day: 'Day 12' },
  { dap: 34, job: 'Top-dress urea', day: 'Day 34' },
  { dap: 58, job: 'Watch water and heat', day: 'Day 58' },
  { dap: 116, job: 'Harvest and dry', day: 'Day 116' },
];

const POINTS = [
  { I: Sprout, t: 'Crop jobs on the right day', d: 'Fertilizer when the soil is moist and no storm is coming, sprays in a calm window, water before the crop is stressed. With the bag count for your field.' },
  { I: Egg, t: 'Animal health on time', d: 'Vaccinations and deworming worked out from each flock or herd’s age, eggs and losses tracked, and a warning when production drops or heat is coming.' },
  { I: Warehouse, t: 'The store and the money', d: 'What is in stock, what to buy, what was spent and sold. Everything stays on your phone, with a backup you can send to WhatsApp.' },
  { I: CloudRain, t: 'Works on a weak signal', d: 'Small downloads, the last forecast kept for when the network drops, and answers in Pidgin, Hausa, Yorùbá or Igbo.' },
];

export function Welcome({ onStart, onAnimals, onSample, onBackup }: { onStart: () => void; onAnimals: () => void; onSample: () => void; onBackup: () => void }) {
  return (
    <div className="min-h-dvh">
      <section className="bg-forest text-forest-ink">
        <div className="mx-auto max-w-4xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
          <div className="[animation:fade_500ms_ease_both]"><Logo onDark /></div>
          <h1 className="mt-12 max-w-3xl text-[44px] font-bold leading-[1.02] tracking-tight sm:mt-16 sm:text-[72px]">
            <span className="block [animation:rise_700ms_var(--ease-out)_both_80ms]">What your farm</span>
            <span className="block [animation:rise_700ms_var(--ease-out)_both_160ms]">needs this week.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest-ink-2 [animation:rise_700ms_var(--ease-out)_both_260ms]">
            Put your fields on the map and add your animals. Nexus Agri reads the forecast, the soil, each crop’s growth stage and each flock’s age, and gives you a short list of jobs: the day to do each one and the reason why.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 [animation:rise_700ms_var(--ease-out)_both_340ms]">
            <button type="button" className="btn btn-accent press px-6 py-3 text-base" onClick={onStart}>
              <Sprout className="h-5 w-5" aria-hidden /> Add a field
            </button>
            <button type="button" className="btn press border-2 border-forest-ink-2 px-6 py-3 text-base text-forest-ink hover:border-forest-ink" onClick={onAnimals}>
              <Plus className="h-5 w-5" aria-hidden /> Add animals
            </button>
            <button type="button" className="btn press px-4 py-3 text-base text-forest-ink-2 underline-offset-4 hover:text-forest-ink hover:underline" onClick={onSample}>
              Try a sample farm
            </button>
          </div>
          <button type="button" className="mt-4 text-sm font-bold text-forest-ink-2 underline-offset-4 hover:text-forest-ink hover:underline" onClick={onBackup}>
            New phone? Restore from a backup
          </button>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-5 pb-10 sm:px-8">
        <figure className="mt-12 [animation:fade_800ms_ease_both_400ms]" aria-label="A maize season from sowing to harvest">
          <div className="grid grid-cols-5 items-end">
            {SEASON.map((s, i) => (
              <div key={s.dap} className="flex justify-center [animation:rise_700ms_var(--ease-out)_both]" style={{ animationDelay: `${500 + i * 160}ms` }}>
                <CropGlyph crop={CROPS.maize} dap={s.dap} size={i === 0 ? 54 : 58 + i * 8} />
              </div>
            ))}
          </div>
          <div className="mt-1 h-[3px] rounded-full bg-soil/40" />
          <ol className="mt-3 grid grid-cols-5 text-center">
            {SEASON.map((s, i) => (
              <li key={s.dap} className="px-1 [animation:fade_600ms_ease_both]" style={{ animationDelay: `${700 + i * 160}ms` }}>
                <div className="num text-[12px] text-ink-3">{s.day}</div>
                <div className="mt-0.5 text-[13px] font-bold leading-tight sm:text-[15px]">{s.job}</div>
              </li>
            ))}
          </ol>
        </figure>

        <ul className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {POINTS.map(({ I, t, d }) => (
            <li key={t} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
                <I className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-bold">{t}</p>
                <p className="mt-1 leading-relaxed text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <footer className="mx-auto max-w-4xl border-t border-line px-5 py-5 text-sm leading-relaxed text-ink-3 sm:px-8">
        Weather from Open-Meteo, soil from ISRIC SoilGrids, water maths from FAO Irrigation Paper 56. Crop timings follow Nigerian extension practice; animal schedules follow NVRI Vom and common Nigerian practice, and your vet's advice comes first. Your records stay on this device.
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { CloudRain, Droplets, Trash2 } from 'lucide-react';
import type { WaterLogEntry } from '../lib/engine/water';
import { addDays, relativeDay } from '../lib/dates';
import { NumberInput, Segmented } from './ui';

/**
 * What actually fell or was applied at the field. Model rainfall is a grid
 * estimate that can miss a storm over one farm entirely, and the model never
 * knows about irrigation — this closes both gaps.
 */
export function WaterLog({ entries, onChange, today, sizeHa }: { entries: WaterLogEntry[]; onChange: (next: WaterLogEntry[]) => void; today: string; sizeHa: number }) {
  const [kind, setKind] = useState<WaterLogEntry['kind']>('rain');
  const [date, setDate] = useState(today);
  const [mm, setMm] = useState(0);
  // Rain starts empty: an untouched box must not be logged as "0 mm" and wipe out the model's rain.
  const [rainText, setRainText] = useState('');
  const [full, setFull] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const oldest = addDays(today, -30);
  const recent = [...entries].filter((e) => e.date >= oldest).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const rain = rainText.trim() === '' ? NaN : Number(rainText.trim().replace(',', '.'));
    const problem =
      !date || date > today ? 'Pick today or an earlier day.'
      : date < oldest ? 'Only the last 30 days count towards the water balance.'
      : kind === 'rain' && rainText.trim() === '' ? 'Enter the gauge reading in mm (0 if it stayed dry), or pick the closest below.'
      : kind === 'rain' && !(rain >= 0) ? 'Enter the rain as a number of mm, like 12.'
      : kind === 'rain' && rain > 400 ? 'That is more rain than falls in a day. Check the gauge reading.'
      : kind === 'irrigation' && !full && !(mm > 0) ? 'Enter how many mm you applied.'
      : kind === 'irrigation' && !full && mm > 200 ? 'That is more water than a field takes in a day. Check the amount.'
      : null;
    if (problem) return setError(problem);
    setError(null);
    onChange([
      ...entries,
      {
        id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        date,
        kind,
        ...(kind === 'rain' ? { mm: rain } : full ? { full: true } : { mm }),
      },
    ]);
    setMm(0);
    setRainText('');
  };

  return (
    <div className="space-y-4" id="water-log">
      <form onSubmit={add} className="space-y-3 rounded-xl bg-paper p-3" aria-label="Log rain or irrigation">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">What happened at your field?</h3>
          <Segmented label="Log type" value={kind} onChange={(k) => { setKind(k); setError(null); }} options={[{ value: 'rain', label: 'Rain' }, { value: 'irrigation', label: 'Irrigation' }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-2">Day</span>
            <input className="field num" type="date" value={date} min={oldest} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          {kind === 'rain' ? (
            <div className="text-sm">
              <span className="mb-1 block text-ink-2">Rain gauge reading <span className="text-ink-3">(mm; 0 if it stayed dry)</span></span>
              <input aria-label="Rain in mm" className="field num" type="text" inputMode="decimal" autoComplete="off" placeholder="mm" value={rainText} onChange={(e) => setRainText(e.target.value)} />
              <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="No gauge? Pick the closest">
                {([['Light shower', 3], ['Steady rain', 10], ['Heavy storm', 30]] as const).map(([label, v]) => (
                  <button key={label} type="button" aria-pressed={rainText === String(v)} onClick={() => setRainText(String(v))} className={`rounded-full border px-2.5 py-1 text-xs ${rainText === String(v) ? 'border-rain bg-rain-soft text-rain' : 'border-line bg-card text-ink-2 hover:border-ink-3'}`}>
                    {label} ≈ {v} mm
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-sm">
              <span className="block text-ink-2">How much?</span>
              <Segmented label="Irrigation amount" value={full ? 'full' : 'mm'} onChange={(v) => setFull(v === 'full')} options={[{ value: 'full', label: 'Watered fully' }, { value: 'mm', label: 'Amount in mm' }]} />
              {!full && (
                <>
                  <NumberInput aria-label="Irrigation in mm" className="field num" value={mm} onChange={setMm} />
                  <span className="block text-xs text-ink-3">{mm > 0 ? `${mm} mm on ${sizeHa} ha = ${Math.round(mm * sizeHa * 10_000).toLocaleString('en-NG')} litres.` : `1 mm on your ${sizeHa} ha is ${Math.round(sizeHa * 10_000).toLocaleString('en-NG')} litres.`}</span>
                </>
              )}
              {full && <span className="block text-xs text-ink-3">Soil wet right through the root zone.</span>}
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-clay">{error}</p>}
        <button type="submit" className="btn btn-primary press px-4 py-2 text-sm">Add to the water balance</button>
      </form>

      {recent.length > 0 && (
        <ul className="divide-y divide-line-2 rounded-xl border border-line-2" aria-label="Your water log">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              {e.kind === 'rain' ? <CloudRain className="h-4 w-4 shrink-0 text-rain" aria-hidden /> : <Droplets className="h-4 w-4 shrink-0 text-leaf" aria-hidden />}
              <span className="flex-1">
                {e.kind === 'rain' ? `Rain: ${e.mm} mm (your gauge)` : e.full ? 'Irrigated fully' : `Irrigated ${e.mm} mm`}
                <span className="text-ink-3">, {relativeDay(e.date, today)}</span>
              </span>
              <button type="button" aria-label="Delete this entry" className="rounded-full p-1.5 text-ink-3 hover:bg-paper hover:text-clay" onClick={() => onChange(entries.filter((x) => x.id !== e.id))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

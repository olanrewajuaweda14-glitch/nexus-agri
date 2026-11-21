import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { Farm, SoilSummary } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { textureClass } from '../lib/engine/soil';
import { relativeDay } from '../lib/dates';
import { WaterChart } from '../components/charts';
import { ErrorNote, Section, Skeleton, SourceTag, Stat } from '../components/ui';

export function Field({ farm, ins, onUpdateFarm }: { farm: Farm; ins: Insights; onUpdateFarm: (patch: Partial<Farm>) => void }) {
  const { derived, soil, soilSummary, limits, findings, crop, stage, today } = ins;
  const water = derived.water;
  const hasLab = !!farm.labSoil && Object.values(farm.labSoil).some((v) => v != null);

  return (
    <div className="space-y-10">
      <Section title="Water in the root zone" id="water">
        {!water ? (
          ins.weather.status === 'error' || ins.weather.data ? (
            <ErrorNote title="The water balance needs a current forecast" detail={ins.weather.error ?? 'The forecast saved on this phone no longer covers today.'} onRetry={ins.refresh} />
          ) : (
            <Skeleton className="h-72" />
          )
        ) : (
          <div className="card space-y-5 p-4">
            {farm.crop === 'rice' && farm.water === 'irrigated' && (
              <p className="rounded-lg bg-rain-soft px-3 py-2 text-sm">For flooded paddy rice, keep 2–5 cm of standing water. This balance applies to upland or rainfed rice.</p>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Stat
                label="Available water"
                value={Math.round(water.availableNow * 100)}
                unit="%"
                tone={water.stressedNow ? 'clay' : water.availableNow < 1 - crop.p + 0.1 ? 'sun' : 'rain'}
                note={water.stressedNow ? 'below stress line' : `stress below ${Math.round((1 - crop.p) * 100)}%`}
              />
              <Stat label="Short of full" value={Math.round(water.depletionNow)} unit="mm" note={`of ${Math.round(water.tawNow)} mm the roots can reach`} />
              <Stat label="Crop use, next 7 d" value={Math.round(water.etcNext7)} unit="mm" note={`Kc ${stage.kc.toFixed(2)} × ET₀`} />
              <Stat label="Useful rain, next 7 d" value={Math.round(water.rainNext7)} unit="mm" tone="rain" note="weighted by chance" />
            </div>
            <WaterChart water={water} />
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
              <Key swatch="bg-rain-soft border border-rain" label="Water the roots can use" />
              <span className="inline-flex items-center gap-1.5"><svg width="16" height="4" aria-hidden><line x1="0" y1="2" x2="16" y2="2" stroke="var(--color-clay)" strokeWidth="2" strokeDasharray="4 3" /></svg>Stress line — crop slows below this</span>
              <Key swatch="bg-rain" label="Daily rain" />
            </div>
            <p className="text-sm text-ink-2">
              {water.stressedNow
                ? `The crop is already under water stress.`
                : water.stressDate
                  ? `At this rate the crop reaches the stress line ${relativeDay(water.stressDate, today)}.`
                  : `No water stress expected in the next 7 days.`}{' '}
              Roots now reach about {Math.round(stage.rootDepthM * 100)} cm; this soil holds {limits.awcMmPerM} mm of usable water per metre.
            </p>
            <details className="text-sm text-ink-2">
              <summary className="cursor-pointer font-medium text-ink">How this is worked out</summary>
              <p className="mt-2">
                A daily soil-water balance (FAO Irrigation Paper 56). Each day the crop uses ET₀ × Kc from the weather model, and rain over 2 mm refills the root zone.
                It starts 30 days ago from {water.initialisedFromModel ? 'the weather model’s soil moisture' : 'an assumed half-full profile'} and runs 7 days ahead on the forecast, weighting forecast rain by its probability.
                Water-holding limits come from {limits.estimated ? 'typical sandy-loam values' : 'your soil’s sand, clay and organic carbon (Saxton & Rawls 2006)'}.
              </p>
              <p className="mt-2">It does not know about irrigation you have applied, so after irrigating treat the root zone as full.</p>
            </details>
          </div>
        )}
      </Section>

      <Section title="Soil" id="soil" aside={hasLab ? 'lab results + SoilGrids' : 'SoilGrids estimate, 0–30 cm'}>
        {soil.status === 'loading' && !soil.data ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="space-y-4">
            {soil.status === 'error' && !soil.data && (
              <ErrorNote title="SoilGrids estimate unavailable" detail={`${soil.error} You can still enter lab results below.`} onRetry={ins.refresh} />
            )}
            <div className="card grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-3">
              <Stat label="pH (water)" value={soilSummary.ph?.toFixed(1) ?? '–'} note={`${crop.name} likes ${crop.phRange[0]}–${crop.phRange[1]}`} />
              <Stat label="Texture" value={<span className="font-sans text-lg">{textureClass(soilSummary.sandPct, soilSummary.clayPct)}</span>} note={soilSummary.sandPct != null ? `${soilSummary.sandPct}% sand · ${soilSummary.clayPct}% clay` : undefined} />
              <Stat label="Organic carbon" value={soilSummary.socGKg != null ? (soilSummary.socGKg / 10).toFixed(2) : '–'} unit="%" />
              <Stat label="Total nitrogen" value={soilSummary.nitrogenGKg?.toFixed(2) ?? '–'} unit="g/kg" />
              <Stat label="CEC" value={soilSummary.cecCmolKg?.toFixed(1) ?? '–'} unit="cmol/kg" note="nutrient-holding capacity" />
              <Stat label="Usable water" value={limits.awcMmPerM} unit="mm/m" note={limits.estimated ? 'typical value' : 'from texture + carbon'} />
            </div>

            {findings.length > 0 && (
              <ul className="space-y-2">
                {findings.map((f) => (
                  <li key={f.id} className="card flex gap-3 p-4">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${{ good: 'bg-leaf', warn: 'bg-sun', bad: 'bg-clay', info: 'bg-rain' }[f.tone]}`} aria-hidden />
                    <div>
                      <p className="font-semibold">{f.title}</p>
                      <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{f.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs leading-relaxed text-ink-3">
              SoilGrids values are machine-learning estimates on a 250 m grid, built from soil profiles and satellite covariates. They describe the area, not your exact field — useful for a first look, not a replacement for a soil test. <SourceTag>ISRIC SoilGrids 2.0</SourceTag>
            </p>

            <LabForm farm={farm} onSave={(lab) => onUpdateFarm({ labSoil: lab })} />
          </div>
        )}
      </Section>
    </div>
  );
}

function Key({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-4 rounded-sm ${swatch}`} aria-hidden />
      {label}
    </span>
  );
}

const LAB_FIELDS: { k: keyof SoilSummary; label: string; unit: string; step: string }[] = [
  { k: 'ph', label: 'pH (water)', unit: '', step: '0.1' },
  { k: 'sandPct', label: 'Sand', unit: '%', step: '1' },
  { k: 'clayPct', label: 'Clay', unit: '%', step: '1' },
  { k: 'socGKg', label: 'Organic carbon', unit: 'g/kg', step: '0.1' },
  { k: 'nitrogenGKg', label: 'Total N', unit: 'g/kg', step: '0.01' },
  { k: 'cecCmolKg', label: 'CEC', unit: 'cmol/kg', step: '0.1' },
];

function LabForm({ farm, onSave }: { farm: Farm; onSave: (lab: Partial<SoilSummary> | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(LAB_FIELDS.map((f) => [f.k, farm.labSoil?.[f.k] != null ? String(farm.labSoil[f.k]) : ''])),
  );

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        <FlaskConical className="h-4 w-4" aria-hidden /> {farm.labSoil ? 'Edit lab results' : 'Have a soil test? Enter lab results'}
      </button>
    );
  }

  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lab: Partial<SoilSummary> = {};
    for (const f of LAB_FIELDS) {
      const v = parseFloat(vals[f.k]);
      if (Number.isFinite(v)) (lab as any)[f.k] = v;
    }
    const problem =
      lab.ph != null && (lab.ph < 3 || lab.ph > 10) ? 'pH should be between 3 and 10.'
      : (lab.sandPct ?? 0) + (lab.clayPct ?? 0) > 100 ? 'Sand and clay together cannot be more than 100%.'
      : Object.values(lab).some((v) => (v as number) < 0) ? 'Values cannot be negative.'
      : lab.socGKg != null && lab.socGKg > 150 ? 'Organic carbon looks too high — enter it in g/kg (1% = 10 g/kg).'
      : null;
    if (problem) return setError(problem);
    setError(null);
    onSave(Object.keys(lab).length ? lab : undefined);
    setOpen(false);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-4">
      <p className="text-sm text-ink-2">Lab values replace the SoilGrids estimate. Leave a box empty to keep the estimate. Organic carbon in g/kg = % × 10.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LAB_FIELDS.map((f) => (
          <label key={f.k} className="text-sm">
            <span className="mb-1 block text-ink-2">{f.label} {f.unit && <span className="text-ink-3">({f.unit})</span>}</span>
            <input className="field num" inputMode="decimal" type="number" step={f.step} value={vals[f.k]} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })} />
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-clay">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">Save</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        {farm.labSoil && (
          <button type="button" className="btn ml-auto text-clay" onClick={() => { onSave(undefined); setOpen(false); }}>Clear lab results</button>
        )}
      </div>
    </form>
  );
}

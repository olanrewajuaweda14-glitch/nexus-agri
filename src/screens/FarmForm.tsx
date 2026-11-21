import { useRef, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import type { CropId, Farm, Maturity, WaterSource } from '../lib/types';
import { CROP_LIST, CROPS } from '../lib/crops';
import { localToday } from '../lib/dates';
import { getPlace } from '../lib/data/api';
import { MapPicker } from '../components/MapPicker';
import { Segmented } from '../components/ui';

const ACRE = 0.404686;

export function FarmForm({ initial, onSave, onCancel, onDelete }: { initial?: Farm; onSave: (f: Farm) => void; onCancel?: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [crop, setCrop] = useState<CropId>(initial?.crop ?? 'maize');
  const [planting, setPlanting] = useState(initial?.plantingDate ?? localToday());
  const [maturity, setMaturity] = useState<Maturity>(initial?.maturity ?? 'medium');
  const [unit, setUnit] = useState<'ha' | 'acre'>('ha');
  const [size, setSize] = useState(String(initial?.sizeHa ?? 1));
  const [water, setWater] = useState<WaterSource>(initial?.water ?? 'rainfed');
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const lookup = useRef(0);
  const setPoint = (lat: number, lng: number) => {
    setPt({ lat, lng });
    // Drop the old name straight away so a failed lookup can't leave the previous place's name on a new pin.
    setPlaceName('');
    const id = ++lookup.current;
    getPlace(lat, lng).then((name) => {
      if (name && id === lookup.current) setPlaceName(name);
    });
  };

  const locate = () => {
    if (!navigator.geolocation) return setLocErr('This device cannot share its location.');
    setLocating(true);
    setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setPoint(p.coords.latitude, p.coords.longitude);
      },
      (e) => {
        setLocating(false);
        setLocErr(e.code === e.PERMISSION_DENIED ? 'Location permission was refused. Tap the map instead.' : 'Could not get a GPS fix. Tap the map instead.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const sizeNum = parseFloat(size);
  const sizeHa = unit === 'ha' ? sizeNum : sizeNum * ACRE;
  const valid = !!pt && name.trim().length > 0 && Number.isFinite(sizeHa) && sizeHa > 0 && !!planting;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !pt) return;
    onSave({
      id: initial?.id ?? `f${Date.now().toString(36)}`,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      labSoil: initial?.labSoil,
      name: name.trim(),
      lat: Math.round(pt.lat * 1e5) / 1e5,
      lng: Math.round(pt.lng * 1e5) / 1e5,
      placeName: placeName || undefined,
      crop,
      plantingDate: planting,
      maturity,
      sizeHa: Math.round(sizeHa * 100) / 100,
      water,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      <Field n={1} label="Where is the field?">
        <MapPicker lat={pt?.lat ?? 9.08} lng={pt?.lng ?? 8.68} hasPoint={!!pt} onChange={setPoint} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} I'm standing in the field
          </button>
          <span className="text-sm text-ink-2">
            {pt ? (
              <>
                {placeName && <b className="font-medium text-ink">{placeName} · </b>}
                <span className="num">{pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}</span>
              </>
            ) : (
              'Tap the map on your field, or use GPS.'
            )}
          </span>
        </div>
        {locErr && <p className="mt-1 text-sm text-clay">{locErr}</p>}
      </Field>

      <Field n={2} label="What's growing?">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Crop">
          {CROP_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={crop === c.id}
              onClick={() => setCrop(c.id)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${crop === c.id ? 'border-leaf bg-leaf-soft' : 'border-line bg-card hover:border-ink-3'}`}
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-ink-3">{c.maturityDays} days</div>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-2">{CROPS[crop].plantingLabel}</span>
            <input className="field num" type="date" value={planting} onChange={(e) => setPlanting(e.target.value)} required />
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-ink-2">Variety</span>
            <Segmented label="Variety maturity" value={maturity} onChange={setMaturity} options={[{ value: 'early', label: 'Early' }, { value: 'medium', label: 'Medium' }, { value: 'late', label: 'Late' }]} />
          </div>
        </div>
      </Field>

      <Field n={3} label="Size and water">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-sm">
            <span className="mb-1 block text-ink-2">Field size</span>
            <div className="flex gap-2">
              <input className="field num flex-1" type="number" inputMode="decimal" min="0.01" step="0.01" value={size} onChange={(e) => setSize(e.target.value)} aria-label="Field size" />
              <Segmented label="Unit" value={unit} onChange={setUnit} options={[{ value: 'ha', label: 'ha' }, { value: 'acre', label: 'acres' }]} />
            </div>
            {unit === 'acre' && Number.isFinite(sizeHa) && <span className="mt-1 block text-xs text-ink-3">= {sizeHa.toFixed(2)} ha</span>}
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-ink-2">Water</span>
            <Segmented label="Water source" value={water} onChange={setWater} options={[{ value: 'rainfed', label: 'Rain only' }, { value: 'irrigated', label: 'Can irrigate' }]} />
          </div>
        </div>
      </Field>

      <Field n={4} label="Name it">
        <input className="field" placeholder="e.g. Back plot by the stream" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={!valid}>{initial ? 'Save changes' : 'Build my plan'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        {onDelete && (
          <button type="button" className="btn ml-auto text-clay hover:bg-clay-soft" onClick={() => confirm(`Delete "${initial?.name}"? This removes its plan and saved data from this device.`) && onDelete()}>
            Delete farm
          </button>
        )}
      </div>
      {!valid && <p className="text-sm text-ink-3">{!pt ? 'Place the field on the map to continue.' : !name.trim() ? 'Give the field a name to continue.' : ''}</p>}
    </form>
  );
}

function Field({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2.5">
        <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper">{n}</span>
        <span className="font-display text-xl font-semibold">{label}</span>
      </legend>
      {children}
    </fieldset>
  );
}

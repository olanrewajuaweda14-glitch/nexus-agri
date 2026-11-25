import { useEffect, useRef, useState } from 'react';
import { Crosshair, Footprints, Loader2, Ruler, Undo2 } from 'lucide-react';
import type { CropId, Farm, Maturity, WaterSource } from '../lib/types';
import { CROP_LIST, CROPS } from '../lib/crops';
import { daysBetween, localToday } from '../lib/dates';
import { getPlace } from '../lib/data/api';
import { seasonOf } from '../lib/seasons';
import { MapPicker } from '../components/MapPicker';
import { Segmented } from '../components/ui';
import { AREA_UNITS, centroid, distance, perimeter, polygonArea, selfIntersects, type LatLng } from '../lib/geo';

const ACRE = 0.404686;

export function FarmForm({ initial, mode = initial ? 'edit' : 'new', onSave, onCancel, onDelete }: { initial?: Farm; mode?: 'new' | 'edit' | 'season'; onSave: (f: Farm) => void; onCancel?: () => void; onDelete?: () => void }) {
  const nextSeason = mode === 'season';
  const [name, setName] = useState(initial?.name ?? '');
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [crop, setCrop] = useState<CropId>(initial?.crop ?? 'maize');
  const [planting, setPlanting] = useState(nextSeason ? localToday() : initial?.plantingDate ?? localToday());
  const [maturity, setMaturity] = useState<Maturity>(initial?.maturity ?? 'medium');
  const [unit, setUnit] = useState<'ha' | 'acre'>('ha');
  const [size, setSize] = useState(String(initial?.sizeHa ?? 1));
  const [water, setWater] = useState<WaterSource>(initial?.water ?? 'rainfed');
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [boundary, setBoundary] = useState<LatLng[]>(initial?.boundary ?? []);
  const [measuring, setMeasuring] = useState(false);
  const before = useRef<LatLng[]>([]);
  const [walk, setWalk] = useState<{ id: number; pos: LatLng | null; accuracy: number | null } | null>(null);
  const watchId = useRef<number | null>(null);
  // Stop GPS only when the form closes — not on every position update.
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const areaM2 = polygonArea(boundary);
  const crossed = selfIntersects(boundary);

  const startMeasuring = () => {
    before.current = boundary;
    setBoundary([]);
    setMeasuring(true);
  };
  const stopWalking = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWalk(null);
  };
  const startWalking = () => {
    if (!navigator.geolocation) return setLocErr('This device cannot share its location.');
    setBoundary([]);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here: LatLng = [p.coords.latitude, p.coords.longitude];
        setWalk((w) => (w ? { ...w, pos: here, accuracy: p.coords.accuracy } : w));
        // Only keep confident fixes, and only once you've moved a few metres.
        if (p.coords.accuracy > 20) return;
        setBoundary((b) => (b.length && distance(b[b.length - 1], here) < 5 ? b : [...b, here]));
      },
      (e) => {
        setLocErr(e.code === e.PERMISSION_DENIED ? 'Location permission was refused. Tap the corners on the map instead.' : 'Lost the GPS signal. Tap the corners on the map instead.');
        stopWalking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    watchId.current = id;
    setWalk({ id, pos: null, accuracy: null });
  };
  const finishMeasuring = () => {
    stopWalking();
    setMeasuring(false);
    if (boundary.length >= 3 && !crossed) {
      setUnit('ha');
      setSize(String(Math.round((areaM2 / AREA_UNITS.ha) * 100) / 100));
      const c = centroid(boundary);
      if (!pt) setPoint(c[0], c[1]);
    }
  };
  const cancelMeasuring = () => {
    stopWalking();
    setBoundary(before.current);
    setMeasuring(false);
  };

  const lookup = useRef(0);
  const setPoint = (lat: number, lng: number) => {
    setPt({ lat, lng });
    // Drop the old name straight away so a failed lookup can't leave the previous place's name on a new pin.
    setPlaceName('');
    const id = ++lookup.current;
    // Wait until the pin settles: OpenStreetMap allows about one lookup per second.
    window.setTimeout(() => {
      if (id !== lookup.current) return;
      getPlace(lat, lng).then((name) => {
        if (name && id === lookup.current) setPlaceName(name);
      });
    }, 700);
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
  const plantingOffset = planting ? daysBetween(localToday(), planting) : NaN;
  const dateProblem = !planting || !Number.isFinite(plantingOffset)
    ? 'Enter the planting date.'
    : plantingOffset > 365
      ? 'That planting date is more than a year away — check the year.'
      : plantingOffset < -730
        ? 'That planting date is more than two years ago — check the year.'
        : null;
  const sizeProblem = !Number.isFinite(sizeHa) || sizeHa <= 0 ? 'Enter the field size.' : sizeHa > 5000 ? 'That is over 5,000 ha — check the size and unit.' : null;
  const valid = !!pt && name.trim().length > 0 && !dateProblem && !sizeProblem;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !pt) return;
    onSave({
      id: initial?.id ?? `f${Date.now().toString(36)}`,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      labSoil: initial?.labSoil,
      // An edit is a correction to the same season: pin its id so records and
      // ticked jobs filed under it survive a changed planting date.
      seasonId: initial ? seasonOf(initial) : undefined,
      history: initial?.history,
      boundary: boundary.length >= 3 && !crossed ? boundary.map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6] as [number, number]) : undefined,
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
        <MapPicker lat={pt?.lat ?? 9.08} lng={pt?.lng ?? 8.68} hasPoint={!!pt} onChange={setPoint} boundary={boundary} measuring={measuring && !walk} onBoundary={setBoundary} position={walk?.pos ?? null} />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} I'm standing in the field
          </button>
          <span className="text-sm text-ink-2">
            {pt ? (
              <>
                {placeName && <b className="font-medium text-ink">{placeName}, </b>}
                <span className="num">{pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}</span>
              </>
            ) : (
              'Tap the map on your field, or use GPS.'
            )}
          </span>
        </div>
        {locErr && <p className="mt-1 text-sm text-clay">{locErr}</p>}

        {pt && !measuring && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
            <Ruler className="h-4 w-4 shrink-0 text-leaf" aria-hidden />
            <span className="min-w-0 flex-1 text-sm">
              {boundary.length >= 3 ? (
                <>Measured: <b className="num">{(areaM2 / AREA_UNITS.ha).toFixed(2)} ha</b> <span className="text-ink-3">({(areaM2 / AREA_UNITS.acre).toFixed(2)} acres)</span></>
              ) : (
                <>Not sure of the size? Most people guess wrong — and fertilizer amounts follow the guess.</>
              )}
            </span>
            <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={startMeasuring}>
              {boundary.length >= 3 ? 'Measure again' : 'Measure the field'}
            </button>
          </div>
        )}

        {measuring && (
          <div className="mt-3 space-y-3 rounded-xl border border-sun/50 bg-sun-soft/50 p-3" aria-live="polite">
            <p className="text-sm">
              {walk
                ? <>Walk slowly along the edge of the field and come back to where you started. {walk.accuracy != null && <span className="text-ink-2">GPS accuracy ±{Math.round(walk.accuracy)} m{walk.accuracy > 20 ? ' — waiting for a better signal' : ''}.</span>}</>
                : <>Tap each corner of the field on the map, going round in order. Drag a corner to adjust it.</>}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-card px-2 py-1.5"><div className="num text-lg font-medium">{(areaM2 / AREA_UNITS.ha).toFixed(2)}</div><div className="text-[11px] text-ink-3">hectares</div></div>
              <div className="rounded-lg bg-card px-2 py-1.5"><div className="num text-lg font-medium">{(areaM2 / AREA_UNITS.acre).toFixed(2)}</div><div className="text-[11px] text-ink-3">acres</div></div>
              <div className="rounded-lg bg-card px-2 py-1.5"><div className="num text-lg font-medium">{Math.round(areaM2 / AREA_UNITS.plot)}</div><div className="text-[11px] text-ink-3">plots (50×100 ft)</div></div>
            </div>
            <p className="text-xs text-ink-2">{boundary.length} corner{boundary.length === 1 ? '' : 's'}, boundary {Math.round(perimeter(boundary))} m</p>
            {crossed && <p role="alert" className="text-sm text-clay">The boundary crosses itself. Undo and tap the corners in order around the field.</p>}
            {!crossed && areaM2 > 20 * AREA_UNITS.ha && <p className="text-sm text-sun">That's over 20 ha — larger than most single fields. Zoom in and check the corners are on this field's edges.</p>}
            <div className="flex flex-wrap gap-2">
              {!walk && (
                <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setBoundary((b) => b.slice(0, -1))} disabled={!boundary.length}>
                  <Undo2 className="h-4 w-4" aria-hidden /> Undo
                </button>
              )}
              <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={walk ? stopWalking : startWalking}>
                <Footprints className="h-4 w-4" aria-hidden /> {walk ? 'Stop walking' : 'Walk the edge with GPS'}
              </button>
              <button type="button" className="btn btn-primary px-4 py-1.5 text-sm" onClick={finishMeasuring} disabled={boundary.length < 3 || crossed}>
                Use {(areaM2 / AREA_UNITS.ha).toFixed(2)} ha
              </button>
              <button type="button" className="btn px-3 py-1.5 text-sm text-ink-3 hover:text-ink" onClick={cancelMeasuring}>Cancel</button>
            </div>
          </div>
        )}
      </Field>

      <Field n={2} label={nextSeason ? 'What are you planting next?' : "What's growing?"}>
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
              <div className="font-bold">{c.name}</div>
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
        <button type="submit" className="btn btn-primary" disabled={!valid}>{nextSeason ? 'Start the new season' : initial ? 'Save changes' : 'Build my plan'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        {onDelete && (
          <button type="button" className="btn ml-auto text-clay hover:bg-clay-soft" onClick={() => confirm(`Delete "${initial?.name}"? This removes its plan and saved data from this device.`) && onDelete()}>
            Delete farm
          </button>
        )}
      </div>
      {!valid && (
        <p className="text-sm text-ink-3" role="status">
          {!pt ? 'Place the field on the map to continue.' : dateProblem ?? sizeProblem ?? (!name.trim() ? 'Give the field a name to continue.' : '')}
        </p>
      )}
    </form>
  );
}

function Field({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2.5">
        <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper">{n}</span>
        <span className="text-xl font-bold">{label}</span>
      </legend>
      {children}
    </fieldset>
  );
}

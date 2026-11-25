import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Farm } from './lib/types';
import { KEYS, load, remove, removeByPrefix, save } from './lib/storage';
import { localToday } from './lib/dates';
import { useFieldInsights } from './lib/useInsights';
import { CROPS } from './lib/crops';
import { HubProvider, isSample, useHub } from './lib/hub';
import { SAMPLE_FARM, sampleHub } from './lib/sample';
import { loadRecords } from './lib/records';
import { summarizeSeason, startNextSeason } from './lib/seasons';
import { Logo } from './components/Logo';
import { Welcome } from './screens/Welcome';
import { Backup } from './screens/Backup';
import { Shell } from './Shell';
import type { Intent } from './lib/nav';

// The farm form carries Leaflet (~45 KB gzip); load it only when a field is being set up.
const FarmForm = lazy(() => import('./screens/FarmForm').then((m) => ({ default: m.FarmForm })));

const clearHash = () => {
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
};

/**
 * True on a fresh open of the app (new tab, home-screen launch), false on a
 * reload within the same tab. Worked out once per page load — outside React,
 * because StrictMode runs state initialisers twice. A fresh open always starts
 * on Home; a reload keeps your place.
 */
const FRESH_OPEN = (() => {
  try {
    if (sessionStorage.getItem('na:session')) return false;
    sessionStorage.setItem('na:session', '1');
  } catch {
    /* storage blocked: treat every load as a fresh open */
  }
  return true;
})();
if (FRESH_OPEN) clearHash();

export function App() {
  return (
    <HubProvider>
      <FarmApp />
    </HubProvider>
  );
}

type Mode = 'welcome' | 'app' | 'new' | 'edit' | 'season' | 'backup';

function FarmApp() {
  const hub = useHub();
  const [farms, setFarms] = useState<Farm[]>(() => load(KEYS.farms, []));
  const [activeId, setActiveId] = useState<string | null>(() => load(KEYS.active, null));
  const hasData = farms.length > 0 || hub.groups.length > 0;
  const [mode, setMode] = useState<Mode>(() => (hasData ? 'app' : 'welcome'));
  // Where Cancel on the add-field form and Back on the backup page return to.
  const [from, setFrom] = useState<'welcome' | 'app'>('app');
  const [done, setDone] = useState<Set<string>>(() => new Set(load<string[]>(KEYS.done, [])));
  const [landing, setLanding] = useState<Intent | undefined>();
  const insights = useFieldInsights(farms, done);

  // Each mode is its own page (a form, the backup screen): open it at the top,
  // not at the scroll position of the page the button was on.
  const firstMode = useRef(true);
  useLayoutEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [mode]);

  useEffect(() => { save(KEYS.farms, farms); }, [farms]);
  useEffect(() => { save(KEYS.active, activeId); }, [activeId]);

  const field = farms.find((f) => f.id === activeId) ?? farms[0] ?? null;

  const toggleDone = useCallback((k: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      save(KEYS.done, [...next].slice(-500));
      return next;
    });
  }, []);

  const upsert = (f: Farm) => {
    setFarms((fs) => (fs.some((x) => x.id === f.id) ? fs.map((x) => (x.id === f.id ? f : x)) : [...fs, f]));
    setActiveId(f.id);
    setMode('app');
  };

  /** Files the current season (with its record-book totals) and opens the next one. */
  const saveNextSeason = (current: Farm, next: Farm) => {
    const budget = load(KEYS.budget(`${current.id}:${current.crop}`), CROPS[current.crop].exampleBudget);
    const summary = summarizeSeason(current, loadRecords(current), budget, localToday());
    upsert(startNextSeason(current, next, summary));
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#plan`);
  };

  const forgetField = (id: string) => {
    [KEYS.chat(id), `na:prices:${id}`, `na:waterlog:${id}`].forEach(remove);
    removeByPrefix(KEYS.budget(`${id}:`), `na:records:${id}:`, `na:store:${id}:`, `na:cache:plan-tr:${id}:`);
    setDone((prev) => {
      const next = new Set([...prev].filter((k) => !k.startsWith(`${id}:`)));
      save(KEYS.done, [...next]);
      return next;
    });
  };

  const startSample = () => {
    clearHash();
    if (!farms.some((f) => f.id === 'sample')) setFarms((fs) => [...fs, SAMPLE_FARM()]);
    setActiveId('sample');
    hub.importData(sampleHub());
    setMode('app');
  };

  const clearSample = () => {
    if (farms.some((f) => f.id === 'sample')) {
      forgetField('sample');
      setFarms((fs) => fs.filter((f) => f.id !== 'sample'));
      if (activeId === 'sample') setActiveId(null);
    }
    hub.groups.filter((g) => isSample(g.id)).forEach((g) => hub.deleteGroup(g.id));
    hub.stock.filter((i) => isSample(i.id)).forEach((i) => hub.deleteItem(i.id));
    clearHash();
    const left = farms.some((f) => !isSample(f.id)) || hub.groups.some((g) => !isSample(g.id));
    if (!left) setMode('welcome');
  };

  if (mode === 'backup') {
    return <Backup onBack={() => setMode(hasData ? from : 'welcome')} />;
  }

  if (mode === 'welcome') {
    return (
      <Welcome
        onStart={() => {
          setFrom('welcome');
          setMode('new');
        }}
        onAnimals={() => {
          history.replaceState(null, '', `${window.location.pathname}${window.location.search}#animals`);
          setLanding({ addGroup: true });
          setMode('app');
        }}
        onSample={startSample}
        onBackup={() => {
          setFrom('welcome');
          setMode('backup');
        }}
      />
    );
  }

  if (mode === 'new' || mode === 'edit' || mode === 'season') {
    const editing = mode === 'edit' || mode === 'season' ? field ?? undefined : undefined;
    const season = mode === 'season' && !!field;
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <Logo />
        <h1 className="mb-8 mt-8 text-3xl font-bold leading-tight sm:text-4xl">{season ? `Next season on ${editing!.name}` : editing ? `Edit ${editing.name}` : 'Add a field'}</h1>
        {season && (
          <p className="-mt-5 mb-8 max-w-xl text-[16px] text-ink-2">
            This season's record book and totals are filed under the farm's track record, and the new season starts with a fresh plan and record book. The field's location and size stay the same.
          </p>
        )}
        <Suspense fallback={<div className="skeleton h-80" />}>
          <FarmForm
            key={`${editing?.id ?? 'new'}:${mode}`}
            initial={editing}
            mode={season ? 'season' : undefined}
            onSave={(f) => {
              if (season && field) saveNextSeason(field, f);
              else {
                if (!editing) history.replaceState(null, '', `${window.location.pathname}${window.location.search}#plan`);
                upsert(f);
              }
            }}
            onCancel={() => setMode(editing ? 'app' : hasData ? 'app' : from)}
            onDelete={
              editing && !season
                ? () => {
                    setFarms((fs) => fs.filter((x) => x.id !== editing.id));
                    forgetField(editing.id);
                    setActiveId(null);
                    // Nothing left on the phone: back to the start.
                    setMode(farms.length > 1 || hub.groups.length > 0 ? 'app' : 'welcome');
                  }
                : undefined
            }
          />
        </Suspense>
      </div>
    );
  }

  return (
    <Shell
      farms={farms}
      field={field}
      insights={insights}
      done={done}
      toggleDone={toggleDone}
      onSwitchField={setActiveId}
      onAddField={() => {
        setFrom('app');
        setMode('new');
      }}
      onEditField={() => setMode('edit')}
      onNewSeason={() => setMode('season')}
      onBackup={() => {
        setFrom('app');
        setMode('backup');
      }}
      onUpdateField={(patch) => field && upsert({ ...field, ...patch })}
      onClearSample={clearSample}
      initialIntent={landing}
    />
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronDown, CloudSun, Coins, Layers, MessageCircle, Pencil, Plus, RefreshCw, WifiOff } from 'lucide-react';
import type { Farm } from './lib/types';
import { KEYS, load, remove, removeByPrefix, save } from './lib/storage';
import { addDays, localToday } from './lib/dates';
import { useInsights } from './lib/useInsights';
import { ago } from './lib/format';
import { CROPS } from './lib/crops';
import { Logo } from './components/Logo';
import { Welcome } from './screens/Welcome';
import { Today } from './screens/Today';
import { Weather } from './screens/Weather';
import { Field } from './screens/Field';
import { Money } from './screens/Money';
import { Ask } from './screens/Ask';

// The farm form carries Leaflet (~45 KB gzip); load it only when a field is being set up.
const FarmForm = lazy(() => import('./screens/FarmForm').then((m) => ({ default: m.FarmForm })));

import { NavContext, type Intent } from './lib/nav';

type Tab = 'today' | 'weather' | 'field' | 'money' | 'ask';
const TABS: { id: Tab; label: string; Icon: typeof CalendarCheck }[] = [
  { id: 'today', label: 'Plan', Icon: CalendarCheck },
  { id: 'weather', label: 'Weather', Icon: CloudSun },
  { id: 'field', label: 'Field', Icon: Layers },
  { id: 'money', label: 'Money', Icon: Coins },
  { id: 'ask', label: 'Ask', Icon: MessageCircle },
];

const clearHash = () => {
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
};

/**
 * True on a fresh open of the app (new tab, home-screen launch), false on a
 * reload within the same tab. Worked out once per page load — outside React,
 * because StrictMode runs state initialisers twice.
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

const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? 'today') as Tab;
};

export const SAMPLE_FARM = (): Farm => ({
  id: 'sample',
  name: 'Sample: maize near Ibadan',
  lat: 7.4258,
  lng: 3.9318,
  placeName: 'Ibadan, Oyo State',
  crop: 'maize',
  plantingDate: addDays(localToday(), -38),
  maturity: 'medium',
  sizeHa: 2,
  water: 'rainfed',
  createdAt: new Date().toISOString(),
});

export function App() {
  const [farms, setFarms] = useState<Farm[]>(() => load(KEYS.farms, []));
  const [activeId, setActiveId] = useState<string | null>(() => load(KEYS.active, null));
  // A fresh open always starts on the welcome page; a reload keeps your place.
  const [mode, setMode] = useState<'welcome' | 'app' | 'new' | 'edit'>(FRESH_OPEN ? 'welcome' : 'app');
  // Where Cancel on the add-field form returns to.
  const [formFrom, setFormFrom] = useState<'welcome' | 'app'>('app');
  const goHome = () => {
    clearHash();
    setMode('welcome');
    window.scrollTo({ top: 0 });
  };
  const openFarm = (id: string) => {
    clearHash(); // land on the Plan tab, not wherever you were last time
    setActiveId(id);
    setMode('app');
    window.scrollTo({ top: 0 });
  };
  const [done, setDone] = useState<Set<string>>(() => new Set(load<string[]>(KEYS.done, [])));

  useEffect(() => { save(KEYS.farms, farms); }, [farms]);
  useEffect(() => { save(KEYS.active, activeId); }, [activeId]);

  const farm = farms.find((f) => f.id === activeId) ?? farms[0] ?? null;

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

  if (mode === 'welcome' || (!farm && mode === 'app')) {
    return (
      <Welcome
        farms={farms}
        onStart={() => {
          setFormFrom('welcome');
          setMode('new');
        }}
        onSample={() => {
          clearHash();
          upsert(farms.find((f) => f.id === 'sample') ?? SAMPLE_FARM());
        }}
        onContinue={openFarm}
      />
    );
  }

  if (mode === 'new' || mode === 'edit' || !farm) {
    const editing = mode === 'edit' ? farm ?? undefined : undefined;
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <Logo />
        <h1 className="mb-8 mt-8 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{editing ? `Edit ${editing.name}` : 'Add a field'}</h1>
        <Suspense fallback={<div className="skeleton h-80" />}>
        <FarmForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSave={upsert}
          onCancel={() => setMode(editing ? 'app' : formFrom)}
          onDelete={
            editing
              ? () => {
                  setFarms((fs) => fs.filter((x) => x.id !== editing.id));
                  remove(KEYS.chat(editing.id));
                  removeByPrefix(KEYS.budget(`${editing.id}:`), `na:records:${editing.id}:`, `na:prices:${editing.id}`, `na:store:${editing.id}:`);
                  setDone((prev) => {
                    const next = new Set([...prev].filter((k) => !k.startsWith(`${editing.id}:`)));
                    save(KEYS.done, [...next]);
                    return next;
                  });
                  setActiveId(null);
                  setMode('app');
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
      key={farm.id}
      farm={farm}
      farms={farms}
      done={done}
      toggleDone={toggleDone}
      onSwitch={setActiveId}
      onAdd={() => {
        setFormFrom('app');
        setMode('new');
      }}
      onEdit={() => setMode('edit')}
      onUpdateFarm={(patch) => upsert({ ...farm, ...patch })}
      onHome={goHome}
    />
  );
}

interface ShellProps {
  farm: Farm;
  farms: Farm[];
  done: Set<string>;
  toggleDone: (k: string) => void;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  onUpdateFarm: (patch: Partial<Farm>) => void;
  onHome: () => void;
}

function Shell({ farm, farms, done, toggleDone, onSwitch, onAdd, onEdit, onUpdateFarm, onHome }: ShellProps) {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  // Landing instructions from the screen that sent you here; `visit` remounts
  // the target screen so it picks them up even if it is already open.
  const [intent, setIntent] = useState<Intent | null>(null);
  const [visit, setVisit] = useState(0);
  const ins = useInsights(farm, done);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onHash = () => {
      setIntent(null);
      setTab(tabFromHash());
    };
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const go = (t: Tab, next?: Intent) => {
    setIntent(next ?? null);
    if (t !== tab) {
      if (t === 'today') history.replaceState(null, '', window.location.pathname + window.location.search);
      else history.pushState(null, '', `#${t}`);
      setTab(t);
    }
    setVisit((v) => v + 1);
    if (next?.scrollTo) {
      const id = next.scrollTo;
      // Wait for the screen to render, then bring the target into view.
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } else window.scrollTo({ top: 0 });
  };

  const loading = ins.weather.status === 'loading';
  const screen = useMemo(() => {
    switch (tab) {
      case 'weather':
        return <Weather farm={farm} ins={ins} />;
      case 'field':
        return <Field farm={farm} ins={ins} onUpdateFarm={onUpdateFarm} />;
      case 'money':
        return <Money farm={farm} ins={ins} initialView={intent?.money} />;
      case 'ask':
        return <Ask farm={farm} ins={ins} initialQuestion={intent?.ask} initialMode={intent?.askMode} />;
      default:
        return <Today farm={farm} ins={ins} done={done} toggleDone={toggleDone} />;
    }
  }, [tab, farm, ins, done, toggleDone, onUpdateFarm, intent]);

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop rail */}
      <nav className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-3 py-5 md:flex" aria-label="Main">
        <button type="button" onClick={onHome} className="rounded-lg px-2 py-1 text-left hover:bg-card" aria-label="Nexus Agri — home page"><Logo /></button>
        <ul className="relative mt-8 space-y-0.5">
          <li aria-hidden className="pointer-events-none absolute inset-x-0 top-0.5 h-11 rounded-lg bg-ink transition-transform duration-[380ms]" style={{ transform: `translateY(${TABS.findIndex((t) => t.id === tab) * 46}px)`, transitionTimingFunction: 'var(--ease-out)' }} />
          {TABS.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`relative flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors duration-300 ${tab === id ? 'text-paper' : 'text-ink-2 hover:bg-card/70 hover:text-ink'}`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto px-2 text-xs leading-relaxed text-ink-3">
          Data stays on this device.
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 sm:px-6">
            <button type="button" onClick={onHome} className="rounded-lg p-0.5 md:hidden" aria-label="Nexus Agri — home page"><Logo compact /></button>
            <FarmSwitcher farm={farm} farms={farms} onSwitch={onSwitch} onAdd={onAdd} />
            <button type="button" onClick={onEdit} className="rounded-full p-2 text-ink-3 hover:bg-card hover:text-ink" aria-label={`Edit ${farm.name}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-ink-3">
              {!online && <WifiOff className="h-3.5 w-3.5 text-sun" aria-label="Offline" />}
              <span className="hidden sm:inline">{ins.weather.savedAt ? `Updated ${ago(ins.weather.savedAt)}` : ''}</span>
              <button type="button" onClick={ins.refresh} disabled={loading} className="rounded-full p-2 hover:bg-card hover:text-ink" aria-label="Refresh data">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
          <NavContext.Provider value={{ go }}>
            <div key={`${tab}:${visit}`} className="page-enter">{screen}</div>
          </NavContext.Provider>
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
        <ul className="relative mx-auto flex max-w-md">
          <li aria-hidden className="pointer-events-none absolute top-1 h-[3px] w-[20%] transition-transform duration-[380ms]" style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)`, transitionTimingFunction: 'var(--ease-out)' }}>
            <span className="mx-auto block h-full w-8 rounded-full bg-leaf" />
          </li>
          {TABS.map(({ id, label, Icon }) => (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium transition-colors duration-300 ${tab === id ? 'text-leaf' : 'text-ink-3'}`}
              >
                <Icon className="h-5 w-5" strokeWidth={tab === id ? 2.4 : 1.8} aria-hidden />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function FarmSwitcher({ farm, farms, onSwitch, onAdd }: { farm: Farm; farms: Farm[]; onSwitch: (id: string) => void; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-w-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-card">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-tight">{farm.name}</span>
          <span className="block truncate text-xs text-ink-3">{CROPS[farm.crop].name} · {farm.sizeHa} ha{farm.placeName ? ` · ${farm.placeName}` : ''}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <EscapeToClose onClose={() => setOpen(false)} />
          <ul role="listbox" className="card absolute left-0 top-full z-40 mt-1 w-72 overflow-hidden p-1 shadow-lg">
            {farms.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.id === farm.id}
                  onClick={() => { onSwitch(f.id); setOpen(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left hover:bg-paper ${f.id === farm.id ? 'bg-paper' : ''}`}
                >
                  <span className="block font-medium">{f.name}</span>
                  <span className="block text-xs text-ink-3">{CROPS[f.crop].name} · {f.sizeHa} ha</span>
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-line-2 pt-1">
              <button type="button" onClick={() => { setOpen(false); onAdd(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-leaf hover:bg-paper">
                <Plus className="h-4 w-4" /> Add a field
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

function EscapeToClose({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return null;
}

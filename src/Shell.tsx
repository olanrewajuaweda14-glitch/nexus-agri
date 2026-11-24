import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Banknote, Bell, ChevronDown, HardDriveDownload, HeartPulse, House, ListChecks, Menu, MessageCircle, PawPrint, Pencil, Plus, RefreshCw, Sprout, Warehouse, WifiOff, X,
} from 'lucide-react';
import type { Farm } from './lib/types';
import type { Insights } from './lib/useInsights';
import { useHub, type Profile } from './lib/hub';
import { activeAlerts, badgeCount, buildAgenda, buildAlerts, type FieldView, type GroupView } from './lib/agenda';
import { CROP_TABS, NavContext, type Intent, type Tab } from './lib/nav';
import { LAST_BACKUP_KEY } from './lib/backup';
import { CROPS } from './lib/crops';
import { localToday } from './lib/dates';
import { ago } from './lib/format';
import { load } from './lib/storage';
import { Logo } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Today } from './screens/Today';
import { Weather } from './screens/Weather';
import { Field } from './screens/Field';
import { Money } from './screens/Money';
import { Ask } from './screens/Ask';
import { Home } from './screens/Home';
import { Tasks } from './screens/Tasks';
import { Animals } from './screens/Animals';
import { Health } from './screens/Health';
import { Stock } from './screens/Stock';
import { Alerts } from './screens/Alerts';

const HASH: Record<Tab, string> = {
  home: '', tasks: 'tasks', today: 'plan', weather: 'weather', field: 'field', animals: 'animals', health: 'health', store: 'store', money: 'money', ask: 'ask', alerts: 'alerts',
};
export const tabFromHash = (): Tab => {
  const h = window.location.hash.slice(1);
  return ((Object.entries(HASH) as [Tab, string][]).find(([, v]) => v === h && v)?.[0] ?? 'home') as Tab;
};

type Section = { id: Tab; label: string; Icon: typeof House };
const SECTIONS: Section[] = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'tasks', label: 'Tasks', Icon: ListChecks },
  { id: 'today', label: 'Crops', Icon: Sprout },
  { id: 'animals', label: 'Animals', Icon: PawPrint },
  { id: 'health', label: 'Health', Icon: HeartPulse },
  { id: 'store', label: 'Store', Icon: Warehouse },
  { id: 'money', label: 'Money', Icon: Banknote },
  { id: 'ask', label: 'Ask the advisor', Icon: MessageCircle },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
];
const BAR: Tab[] = ['home', 'today', 'animals', 'money'];
const TITLES: Record<Tab, string> = {
  home: 'Home', tasks: 'Tasks', today: 'Crops', weather: 'Crops', field: 'Crops', animals: 'Animals', health: 'Health', store: 'Store', money: 'Money', ask: 'Ask the advisor', alerts: 'Alerts',
};
const sectionOf = (t: Tab): Tab => (CROP_TABS.includes(t) ? 'today' : t);

export interface ShellProps {
  farms: Farm[];
  field: Farm | null;
  insights: Record<string, Insights>;
  done: Set<string>;
  toggleDone: (k: string) => void;
  onSwitchField: (id: string) => void;
  onAddField: () => void;
  onEditField: () => void;
  onNewSeason: () => void;
  onBackup: () => void;
  onUpdateField: (patch: Partial<Farm>) => void;
  onClearSample: () => void;
  /** Where to land on first show, e.g. straight into the add-animals form from the welcome page. */
  initialIntent?: Intent;
}

export function Shell(p: ShellProps) {
  const { farms, field, insights, done } = p;
  const hub = useHub();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  // Landing instructions from the screen that sent you here; `visit` remounts
  // the target screen so it picks them up even if it is already open.
  const [intent, setIntent] = useState<Intent | null>(p.initialIntent ?? null);
  const [visit, setVisit] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const today = localToday();

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

  const go = useCallback(
    (t: Tab, next?: Intent) => {
      setDrawer(false);
      setIntent(next ?? null);
      if (t !== tab) {
        if (t === 'home') history.replaceState(null, '', window.location.pathname + window.location.search);
        else history.pushState(null, '', `#${HASH[t]}`);
        setTab(t);
      }
      setVisit((v) => v + 1);
      if (next?.scrollTo) {
        const id = next.scrollTo;
        // Wait for the screen to render, then bring the target into view.
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      } else window.scrollTo({ top: 0 });
    },
    [tab],
  );
  const openField = useCallback(
    (fieldId: string, t: Tab = 'today', next?: Intent) => {
      if (fieldId !== field?.id) p.onSwitchField(fieldId);
      go(t, next);
    },
    [field?.id, go, p],
  );
  const nav = useMemo(
    () => ({ go, openField, startSeason: p.onNewSeason, addField: p.onAddField, backup: p.onBackup }),
    [go, openField, p.onNewSeason, p.onAddField, p.onBackup],
  );

  const fields: FieldView[] = useMemo(
    () => farms.filter((f) => insights[f.id]).map((f) => ({ farm: f, plan: insights[f.id].derived.plan, today: insights[f.id].today, crop: insights[f.id].crop, forecast: insights[f.id].forecast })),
    [farms, insights],
  );
  const groups: GroupView[] = useMemo(() => hub.groups.map((g) => ({ group: g, events: hub.events[g.id] ?? [] })), [hub.groups, hub.events]);
  const agenda = useMemo(() => buildAgenda({ fields, groups, tasks: hub.tasks, done, today }), [fields, groups, hub.tasks, done, today]);
  const { alerts, hiddenAlerts } = useMemo(() => {
    const created = [...farms.filter((f) => !f.id.startsWith('sample')).map((f) => f.createdAt), ...hub.groups.filter((g) => !g.id.startsWith('sample')).map((g) => g.createdAt)].sort()[0];
    const all = buildAlerts({ fields, groups, stock: hub.stock, moves: hub.moves, done, today, lastBackup: load<string | null>(LAST_BACKUP_KEY, null), since: created?.slice(0, 10) ?? null });
    const active = activeAlerts(all, hub.dismissed);
    return { alerts: active, hiddenAlerts: all.length - active.length };
  }, [fields, groups, hub.stock, hub.moves, hub.dismissed, done, today, farms, hub.groups]);
  const badge = badgeCount(alerts);
  const counts: Partial<Record<Tab, number>> = {
    tasks: agenda.filter((a) => a.when === 'overdue' || a.when === 'today').length,
    health: agenda.filter((a) => a.source === 'animal' && (a.when === 'overdue' || a.when === 'today')).length,
    alerts: badge,
  };

  const ins = field ? insights[field.id] : null;
  const place = farms.find((f) => f.placeName)?.placeName ?? null;
  const isCrop = CROP_TABS.includes(tab);
  const needsField = isCrop || tab === 'money';
  const wide = !needsField && tab !== 'ask';

  const screen = (() => {
    switch (tab) {
      case 'home':
        return <Home farms={farms} insights={insights} agenda={agenda} alerts={alerts} done={done} toggleDone={p.toggleDone} onClearSample={p.onClearSample} />;
      case 'tasks':
        return <Tasks agenda={agenda} farms={farms} done={done} toggleDone={p.toggleDone} startAdding={!!intent?.addTask} />;
      case 'animals':
        return <Animals farms={farms} insights={insights} openGroup={intent?.groupId} startAdding={!!intent?.addGroup} />;
      case 'health':
        return <Health agenda={agenda} farms={farms} done={done} toggleDone={p.toggleDone} />;
      case 'store':
        return <Stock farms={farms} openItem={intent?.itemId} />;
      case 'alerts':
        return <Alerts alerts={alerts} hidden={hiddenAlerts} />;
      case 'ask':
        return <Ask farm={field} ins={ins} initialQuestion={intent?.ask} initialMode={intent?.askMode} />;
    }
    if (!field || !ins) return <NoFields onAdd={p.onAddField} money={tab === 'money'} />;
    switch (tab) {
      case 'weather':
        return <Weather farm={field} ins={ins} />;
      case 'field':
        return <Field farm={field} ins={ins} onUpdateFarm={p.onUpdateField} />;
      case 'money':
        return <Money farm={field} ins={ins} initialView={intent?.money} />;
      default:
        return <Today farm={field} ins={ins} done={done} toggleDone={p.toggleDone} />;
    }
  })();

  return (
    <NavContext.Provider value={nav}>
      <div className="min-h-dvh lg:flex">
        {/* Computer: the whole farm in a sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-forest text-forest-ink lg:flex">
          <button type="button" onClick={() => go('home')} className="mx-4 mt-5 rounded-lg px-2 py-1 text-left hover:bg-forest-2" aria-label="Nexus Agri home">
            <Logo onDark />
          </button>
          <nav aria-label="Main" className="mt-6 flex-1 overflow-y-auto px-3">
            <NavList tab={tab} counts={counts} go={go} />
          </nav>
          <FarmCard className="m-3" place={place} />
        </aside>

        <div className="min-w-0 flex-1" inert={drawer}>
          {/* Phone: green band with the bell */}
          <header className="sticky top-0 z-30 bg-forest text-forest-ink pt-[env(safe-area-inset-top)] lg:hidden">
            <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3">
              <button type="button" onClick={() => go('home')} className="rounded-lg p-1" aria-label="Nexus Agri home">
                <Logo compact onDark />
              </button>
              <p className="min-w-0 flex-1 truncate text-lg font-bold">{tab === 'home' ? hub.profile.farmName ?? 'Nexus Agri' : TITLES[tab]}</p>
              {!online && <WifiOff className="h-4 w-4 text-maize" aria-label="Offline" />}
              <BellButton count={badge} onClick={() => go('alerts')} active={tab === 'alerts'} />
            </div>
          </header>

          {(needsField && field && ins) && (
            <FieldBar farms={farms} field={field} ins={ins} tab={tab} go={go} onSwitch={p.onSwitchField} onAdd={p.onAddField} onEdit={p.onEditField} onBackup={p.onBackup} />
          )}

          <main className={`mx-auto px-4 pb-32 pt-6 sm:px-6 lg:pb-16 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}>
            <div key={`${tab}:${visit}:${field?.id ?? ''}`} className="page-enter">
              <ErrorBoundary onHome={() => go('home')}>{screen}</ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Phone: the four places farmers go most, and the full menu */}
        <nav className="fixed inset-x-0 bottom-0 z-30 bg-forest pb-[env(safe-area-inset-bottom)] text-forest-ink lg:hidden" aria-label="Main" inert={drawer}>
          <ul className="mx-auto flex max-w-md px-1">
            {BAR.map((id) => {
              const s = SECTIONS.find((x) => x.id === id)!;
              const on = sectionOf(tab) === id;
              return (
                <li key={id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(id)}
                    aria-current={on ? 'page' : undefined}
                    className="flex w-full flex-col items-center gap-1 pb-2 pt-2 text-[12px] font-bold"
                  >
                    <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${on ? 'bg-maize text-forest' : 'text-forest-ink-2'}`}>
                      <s.Icon className="h-5 w-5" strokeWidth={on ? 2.4 : 2} aria-hidden />
                    </span>
                    <span className={on ? 'text-forest-ink' : 'text-forest-ink-2'}>{id === 'today' ? 'Crops' : s.label}</span>
                  </button>
                </li>
              );
            })}
            <li className="flex-1">
              <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} className="flex w-full flex-col items-center gap-1 pb-2 pt-2 text-[12px] font-bold">
                <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${!BAR.includes(sectionOf(tab)) ? 'bg-maize text-forest' : 'text-forest-ink-2'}`}>
                  <Menu className="h-5 w-5" aria-hidden />
                </span>
                <span className={!BAR.includes(sectionOf(tab)) ? 'text-forest-ink' : 'text-forest-ink-2'}>Menu</span>
              </button>
            </li>
          </ul>
        </nav>

        {drawer && (
          <Drawer onClose={() => setDrawer(false)}>
            <NavList tab={tab} counts={counts} go={go} />
            <div className="mt-4 space-y-1 border-t border-forest-2 pt-4">
              <button type="button" onClick={() => { setDrawer(false); p.onAddField(); }} className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left font-bold text-forest-ink-2 hover:bg-forest-2 hover:text-forest-ink">
                <Plus className="h-5 w-5" aria-hidden /> Add a field
              </button>
              <button type="button" onClick={() => { setDrawer(false); p.onBackup(); }} className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left font-bold text-forest-ink-2 hover:bg-forest-2 hover:text-forest-ink">
                <HardDriveDownload className="h-5 w-5" aria-hidden /> Back up or move phones
              </button>
            </div>
            <FarmCard className="mt-6" place={place} />
          </Drawer>
        )}
      </div>
    </NavContext.Provider>
  );
}

function NavList({ tab, counts, go }: { tab: Tab; counts: Partial<Record<Tab, number>>; go: (t: Tab) => void }) {
  return (
    <ul className="space-y-1">
      {SECTIONS.map(({ id, label, Icon }) => {
        const on = sectionOf(tab) === id;
        const n = counts[id] ?? 0;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => go(id)}
              aria-current={on ? 'page' : undefined}
              aria-label={n > 0 ? `${label}: ${n} need attention` : undefined}
              className={`flex h-12 w-full items-center gap-3.5 rounded-full px-4 text-left text-[16px] font-bold transition-colors duration-200 ${on ? 'bg-maize text-forest' : 'text-forest-ink hover:bg-forest-2'}`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={on ? 2.4 : 2} aria-hidden />
              <span className="flex-1">{label}</span>
              {n > 0 && (
                <span className={`num min-w-6 rounded-full px-1.5 text-center text-[13px] leading-6 ${on ? 'bg-forest text-maize' : id === 'alerts' ? 'bg-clay text-white' : 'bg-forest-2 text-forest-ink'}`} aria-hidden>
                  {n}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BellButton({ count, onClick, active }: { count: number; onClick: () => void; active: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`relative rounded-full p-2.5 ${active ? 'bg-maize text-forest' : 'hover:bg-forest-2'}`} aria-label={count ? `Alerts: ${count} need attention` : 'Alerts'}>
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="num absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-clay px-1 text-center text-[12px] font-bold leading-5 text-white ring-2 ring-forest" aria-hidden>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

/** The farm's name and the farmer's, at the foot of the menu. Tap to change them. */
function FarmCard({ className = '', place }: { className?: string; place: string | null }) {
  const { profile, setProfile, groups } = useHub();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  if (editing) {
    return (
      <form
        className={`space-y-3 rounded-2xl border border-forest-2 p-4 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          setProfile(draft);
          setEditing(false);
        }}
        aria-label="Farm details"
      >
        <label className="block text-sm text-forest-ink-2">
          Farm name
          <input className="field mt-1" value={draft.farmName ?? ''} onChange={(e) => setDraft({ ...draft, farmName: e.target.value })} placeholder="e.g. Adebayo Farms" maxLength={60} />
        </label>
        <label className="block text-sm text-forest-ink-2">
          Your name
          <input className="field mt-1" value={draft.farmerName ?? ''} onChange={(e) => setDraft({ ...draft, farmerName: e.target.value })} placeholder="e.g. Bola Adebayo" maxLength={60} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-accent px-4 py-2 text-sm">Save</button>
          <button type="button" className="btn px-4 py-2 text-sm text-forest-ink-2 hover:text-forest-ink" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </form>
    );
  }
  return (
    <div className={`rounded-2xl border border-forest-2 p-4 ${className}`}>
      <p className="text-sm text-forest-ink-2">Farm</p>
      <p className="mt-0.5 text-lg font-bold leading-snug text-maize">{profile.farmName ?? 'Name your farm'}</p>
      {profile.farmerName && <p className="text-forest-ink">{profile.farmerName}</p>}
      {place && <p className="mt-0.5 text-sm text-forest-ink-2">{place}{groups.length ? `, ${groups.length} animal group${groups.length === 1 ? '' : 's'}` : ''}</p>}
      <button
        type="button"
        onClick={() => {
          setDraft(profile);
          setEditing(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-forest-ink-2 hover:text-forest-ink"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden /> {profile.farmName ? 'Edit farm details' : 'Add farm details'}
      </button>
    </div>
  );
}

function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-forest/50 [animation:fade_200ms_ease_both]" onClick={onClose} aria-hidden />
      <div className="absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col overflow-y-auto bg-forest px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-forest-ink shadow-2xl [animation:drawer-in_260ms_var(--ease-out)_both]">
        <div className="mb-4 flex items-center justify-between px-2">
          <Logo onDark />
          <button ref={close} type="button" onClick={onClose} className="rounded-full p-2 hover:bg-forest-2" aria-label="Close menu">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CROP_SUBTABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Plan' },
  { id: 'weather', label: 'Weather' },
  { id: 'field', label: 'Soil and water' },
];

/** Which field the crop screens are about, how fresh its data is, and the crop screens themselves. */
function FieldBar({ farms, field, ins, tab, go, onSwitch, onAdd, onEdit, onBackup }: {
  farms: Farm[]; field: Farm; ins: Insights; tab: Tab; go: (t: Tab) => void; onSwitch: (id: string) => void; onAdd: () => void; onEdit: () => void; onBackup: () => void;
}) {
  const loading = ins.weather.status === 'loading';
  return (
    <div className="sticky top-14 z-20 border-b border-line bg-paper/95 backdrop-blur lg:top-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center gap-1 pt-2">
          <FieldSwitcher field={field} farms={farms} onSwitch={onSwitch} onAdd={onAdd} onBackup={onBackup} />
          <button type="button" onClick={onEdit} className="rounded-full p-2 text-ink-3 hover:bg-card hover:text-ink" aria-label={`Edit ${field.name}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-1 text-xs text-ink-3">
            <span className="hidden sm:inline">{ins.weather.savedAt ? `Updated ${ago(ins.weather.savedAt)}` : ''}</span>
            <button type="button" onClick={ins.refresh} disabled={loading} className="rounded-full p-2 hover:bg-card hover:text-ink" aria-label="Refresh data">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {CROP_TABS.includes(tab) && (
          <div className="-mb-px flex gap-5" role="tablist" aria-label="Crop screens">
            {CROP_SUBTABS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={tab === s.id}
                onClick={() => go(s.id)}
                className={`border-b-[3px] pb-2 pt-1.5 text-[15px] font-bold transition-colors ${tab === s.id ? 'border-leaf text-ink' : 'border-transparent text-ink-3 hover:text-ink'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {!CROP_TABS.includes(tab) && <div className="h-2" />}
      </div>
    </div>
  );
}

function FieldSwitcher({ field, farms, onSwitch, onAdd, onBackup }: { field: Farm; farms: Farm[]; onSwitch: (id: string) => void; onAdd: () => void; onBackup: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  return (
    <div className="relative min-w-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox" className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-card">
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-bold leading-tight">{field.name}</span>
          <span className="block truncate text-[13px] text-ink-3">{CROPS[field.crop].name}, {field.sizeHa} ha{field.placeName ? `, ${field.placeName}` : ''}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <ul role="listbox" className="card absolute left-0 top-full z-40 mt-1 w-72 overflow-hidden p-1 shadow-lg">
            {farms.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.id === field.id}
                  onClick={() => {
                    onSwitch(f.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left hover:bg-paper ${f.id === field.id ? 'bg-paper' : ''}`}
                >
                  <span className="block font-bold">{f.name}</span>
                  <span className="block text-[13px] text-ink-3">{CROPS[f.crop].name}, {f.sizeHa} ha</span>
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-line-2 pt-1">
              <button type="button" onClick={() => { setOpen(false); onAdd(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-bold text-leaf hover:bg-paper">
                <Plus className="h-4 w-4" /> Add a field
              </button>
              <button type="button" onClick={() => { setOpen(false); onBackup(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-bold text-ink-2 hover:bg-paper hover:text-ink">
                <HardDriveDownload className="h-4 w-4" /> Back up or move phones
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

function NoFields({ onAdd, money }: { onAdd: () => void; money: boolean }) {
  return (
    <div className="card space-y-3 p-6">
      <Sprout className="h-8 w-8 text-leaf" aria-hidden />
      <h1 className="text-2xl font-bold">{money ? 'Crop money needs a field' : 'No fields yet'}</h1>
      <p className="max-w-prose text-ink-2">
        {money
          ? 'Budgets, the buy list and the record book work per field. Money for animals is kept with each group under Animals.'
          : 'Put a field on the map and say what you planted. The plan, spray windows and water balance are worked out from its weather and soil.'}
      </p>
      <button type="button" className="btn btn-primary" onClick={onAdd}>
        <Plus className="h-4 w-4" aria-hidden /> Add a field
      </button>
    </div>
  );
}

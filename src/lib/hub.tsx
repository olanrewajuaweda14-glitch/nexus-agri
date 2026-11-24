/**
 * Farm-wide records that are not tied to one field: the farm's name, animal
 * groups and their logs, the store, the farmer's own tasks and dismissed
 * alerts. Everything is saved on the phone under "na:" keys, so backups pick
 * it up without extra work.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { load, remove, save } from './storage';
import { ANIMALS_KEY, eventsKey, type AnimalEvent, type AnimalGroup } from './livestock';
import { MOVES_KEY, STOCK_KEY, newId, type StockItem, type StockMove } from './stock';
import { completeTask, pruneTasks, TASKS_KEY, type OwnTask } from './tasks';
import { DISMISSED_KEY, pruneDismissed } from './agenda';
import { localToday } from './dates';

export interface Profile {
  farmName?: string;
  farmerName?: string;
}
export const PROFILE_KEY = 'na:profile';

export interface Hub {
  profile: Profile;
  setProfile: (p: Profile) => void;

  groups: AnimalGroup[];
  events: Record<string, AnimalEvent[]>;
  saveGroup: (g: AnimalGroup) => void;
  deleteGroup: (id: string) => void;
  addEvent: (groupId: string, e: Omit<AnimalEvent, 'id'>) => AnimalEvent;
  deleteEvent: (groupId: string, eventId: string) => void;

  stock: StockItem[];
  moves: StockMove[];
  saveItem: (i: StockItem) => void;
  deleteItem: (id: string) => void;
  addMove: (m: Omit<StockMove, 'id'>) => StockMove;
  deleteMove: (id: string) => void;

  tasks: OwnTask[];
  saveTask: (t: OwnTask) => void;
  deleteTask: (id: string) => void;
  tickTask: (id: string) => void;
  untickTask: (id: string) => void;

  dismissed: Record<string, string>;
  dismiss: (alertId: string) => void;
  undismissAll: () => void;

  /** Adds groups (with their logs), store items and moves that are not there yet, e.g. the sample farm. */
  importData: (d: { groups: AnimalGroup[]; events: Record<string, AnimalEvent[]>; stock: StockItem[]; moves: StockMove[] }) => void;
}

const HubContext = createContext<Hub | null>(null);

export function useHub(): Hub {
  const h = useContext(HubContext);
  if (!h) throw new Error('useHub outside HubProvider');
  return h;
}

/** Ids that start with "sample" belong to the sample farm and can be cleared in one go. */
export const isSample = (id: string) => id.startsWith('sample');

export function HubProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(() => load(PROFILE_KEY, {}));
  const [groups, setGroups] = useState<AnimalGroup[]>(() => load(ANIMALS_KEY, []));
  const [events, setEvents] = useState<Record<string, AnimalEvent[]>>(() =>
    Object.fromEntries(load<AnimalGroup[]>(ANIMALS_KEY, []).map((g) => [g.id, load<AnimalEvent[]>(eventsKey(g.id), [])])),
  );
  const [stock, setStock] = useState<StockItem[]>(() => load(STOCK_KEY, []));
  const [moves, setMoves] = useState<StockMove[]>(() => load(MOVES_KEY, []));
  const [tasks, setTasks] = useState<OwnTask[]>(() => pruneTasks(load(TASKS_KEY, []), localToday()));
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => pruneDismissed(load(DISMISSED_KEY, {}), localToday()));

  const setProfile = useCallback((p: Profile) => {
    const clean = { farmName: p.farmName?.trim() || undefined, farmerName: p.farmerName?.trim() || undefined };
    save(PROFILE_KEY, clean);
    setProfileState(clean);
  }, []);

  const saveGroup = useCallback((g: AnimalGroup) => {
    setGroups((all) => {
      const next = all.some((x) => x.id === g.id) ? all.map((x) => (x.id === g.id ? g : x)) : [...all, g];
      save(ANIMALS_KEY, next);
      return next;
    });
    setEvents((all) => (all[g.id] ? all : { ...all, [g.id]: [] }));
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups((all) => {
      const next = all.filter((x) => x.id !== id);
      save(ANIMALS_KEY, next);
      return next;
    });
    setEvents(({ [id]: _gone, ...rest }) => rest);
    remove(eventsKey(id));
    setTasks((all) => {
      const next = all.map((t) => (t.groupId === id ? { ...t, groupId: undefined } : t));
      save(TASKS_KEY, next);
      return next;
    });
  }, []);

  const addEvent = useCallback((groupId: string, e: Omit<AnimalEvent, 'id'>) => {
    const entry: AnimalEvent = { id: newId('e'), ...e };
    setEvents((all) => {
      const list = [...(all[groupId] ?? []), entry];
      save(eventsKey(groupId), list);
      return { ...all, [groupId]: list };
    });
    return entry;
  }, []);

  const deleteEvent = useCallback((groupId: string, eventId: string) => {
    setEvents((all) => {
      const list = (all[groupId] ?? []).filter((x) => x.id !== eventId);
      save(eventsKey(groupId), list);
      return { ...all, [groupId]: list };
    });
  }, []);

  const saveItem = useCallback((i: StockItem) => {
    setStock((all) => {
      const next = all.some((x) => x.id === i.id) ? all.map((x) => (x.id === i.id ? i : x)) : [...all, i];
      save(STOCK_KEY, next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setStock((all) => {
      const next = all.filter((x) => x.id !== id);
      save(STOCK_KEY, next);
      return next;
    });
    setMoves((all) => {
      const next = all.filter((m) => m.itemId !== id);
      save(MOVES_KEY, next);
      return next;
    });
  }, []);

  const addMove = useCallback((m: Omit<StockMove, 'id'>) => {
    const entry: StockMove = { id: newId('m'), ...m };
    setMoves((all) => {
      const next = [...all, entry];
      save(MOVES_KEY, next);
      return next;
    });
    return entry;
  }, []);

  const deleteMove = useCallback((id: string) => {
    setMoves((all) => {
      const next = all.filter((m) => m.id !== id);
      save(MOVES_KEY, next);
      return next;
    });
  }, []);

  const writeTasks = (fn: (all: OwnTask[]) => OwnTask[]) =>
    setTasks((all) => {
      const next = fn(all);
      save(TASKS_KEY, next);
      return next;
    });
  const saveTask = useCallback((t: OwnTask) => writeTasks((all) => (all.some((x) => x.id === t.id) ? all.map((x) => (x.id === t.id ? t : x)) : [...all, t])), []);
  const deleteTask = useCallback((id: string) => writeTasks((all) => all.filter((x) => x.id !== id)), []);
  const tickTask = useCallback((id: string) => writeTasks((all) => all.map((x) => (x.id === id ? completeTask(x, localToday()) : x))), []);
  const untickTask = useCallback((id: string) => writeTasks((all) => all.map((x) => (x.id === id ? { ...x, doneOn: undefined } : x))), []);

  const dismiss = useCallback((alertId: string) => {
    setDismissed((d) => {
      const next = { ...d, [alertId]: localToday() };
      save(DISMISSED_KEY, next);
      return next;
    });
  }, []);
  const undismissAll = useCallback(() => {
    save(DISMISSED_KEY, {});
    setDismissed({});
  }, []);

  const importData = useCallback((d: { groups: AnimalGroup[]; events: Record<string, AnimalEvent[]>; stock: StockItem[]; moves: StockMove[] }) => {
    setGroups((all) => {
      const fresh = d.groups.filter((g) => !all.some((x) => x.id === g.id));
      const next = [...all, ...fresh];
      save(ANIMALS_KEY, next);
      return next;
    });
    setEvents((all) => {
      const next = { ...all };
      for (const [id, list] of Object.entries(d.events)) {
        if (next[id]?.length) continue;
        next[id] = list;
        save(eventsKey(id), list);
      }
      return next;
    });
    setStock((all) => {
      const next = [...all, ...d.stock.filter((i) => !all.some((x) => x.id === i.id))];
      save(STOCK_KEY, next);
      return next;
    });
    setMoves((all) => {
      const next = [...all, ...d.moves.filter((m) => !all.some((x) => x.id === m.id))];
      save(MOVES_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<Hub>(
    () => ({
      profile, setProfile, groups, events, saveGroup, deleteGroup, addEvent, deleteEvent,
      stock, moves, saveItem, deleteItem, addMove, deleteMove,
      tasks, saveTask, deleteTask, tickTask, untickTask, dismissed, dismiss, undismissAll, importData,
    }),
    [profile, setProfile, groups, events, saveGroup, deleteGroup, addEvent, deleteEvent, stock, moves, saveItem, deleteItem, addMove, deleteMove, tasks, saveTask, deleteTask, tickTask, untickTask, dismissed, dismiss, undismissAll, importData],
  );
  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

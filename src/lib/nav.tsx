import { createContext, useContext } from 'react';

/** Every screen in the app. "today", "weather" and "field" are the crop screens for the chosen field. */
export type Tab = 'home' | 'tasks' | 'today' | 'weather' | 'field' | 'animals' | 'health' | 'store' | 'money' | 'ask' | 'alerts';
export type MoneyView = 'budget' | 'shop' | 'records' | 'store';

export const CROP_TABS: Tab[] = ['today', 'weather', 'field'];

/** Where to land inside a screen when another screen sends you there. */
export interface Intent {
  money?: MoneyView;
  /** Element id to scroll into view after the screen opens. */
  scrollTo?: string;
  /** Advisor: question to pre-fill (not sent until the farmer taps Send). */
  ask?: string;
  askMode?: 'ask' | 'photo';
  /** Animals: open this group. */
  groupId?: string;
  /** Animals: open the form for a new group. */
  addGroup?: boolean;
  /** Store: open this item. */
  itemId?: string;
  /** Tasks: open the new-task form. */
  addTask?: boolean;
}

export interface Nav {
  go: (tab: Tab, intent?: Intent) => void;
  /** Switches the chosen field, then opens a crop screen for it. */
  openField: (fieldId: string, tab?: Tab, intent?: Intent) => void;
  /** Opens the form that files this season and starts the next one on the same field. */
  startSeason: () => void;
  addField: () => void;
  backup: () => void;
}

export const NavContext = createContext<Nav>({ go: () => {}, openField: () => {}, startSeason: () => {}, addField: () => {}, backup: () => {} });
export const useNav = () => useContext(NavContext);

import { createContext, useContext } from 'react';

export type Tab = 'today' | 'weather' | 'field' | 'money' | 'ask';
export type MoneyView = 'budget' | 'shop' | 'records' | 'store';

/** Where to land inside a screen when another screen sends you there. */
export interface Intent {
  money?: MoneyView;
  /** Element id to scroll into view after the screen opens. */
  scrollTo?: string;
  /** Advisor: question to pre-fill (not sent until the farmer taps Send). */
  ask?: string;
  askMode?: 'ask' | 'photo';
}

export interface Nav {
  go: (tab: Tab, intent?: Intent) => void;
  /** Opens the form that files this season and starts the next one on the same field. */
  startSeason: () => void;
}

export const NavContext = createContext<Nav>({ go: () => {}, startSeason: () => {} });
export const useNav = () => useContext(NavContext);

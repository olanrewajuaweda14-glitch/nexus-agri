/**
 * Everything the farmer entered lives in this browser's storage. A backup is
 * one JSON file of it, to keep on WhatsApp or Google Drive and restore on a
 * new phone. Cached weather, soil and prices are left out (they reload).
 */

export const BACKUP_APP = 'nexus-agri';
export const BACKUP_VERSION = 1;
export const LAST_BACKUP_KEY = 'na:lastBackup';

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface BackupSummary {
  farms: string[];
  records: number;
  pastSeasons: number;
  /** Animal groups, by name. */
  animals: string[];
  stockItems: number;
  exportedAt: string;
}

type Store = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;

/** Keys worth saving: the app's own, minus caches and bookkeeping. */
export const isUserKey = (k: string) => k.startsWith('na:') && !k.startsWith('na:cache:') && k !== LAST_BACKUP_KEY;

export function collectBackup(store: Store, now = new Date()): Backup {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !isUserKey(k)) continue;
    const raw = store.getItem(k);
    if (raw == null) continue;
    try {
      data[k] = JSON.parse(raw);
    } catch {
      /* skip anything that isn't ours */
    }
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function summarizeBackup(b: Backup): BackupSummary {
  const farms = Array.isArray(b.data['na:farms']) ? (b.data['na:farms'] as { name?: unknown; history?: unknown[] }[]) : [];
  let records = 0;
  for (const [k, v] of Object.entries(b.data)) if (k.startsWith('na:records:') && Array.isArray(v)) records += v.length;
  return {
    farms: farms.map((f) => String(f?.name ?? 'Unnamed field')),
    records,
    pastSeasons: farms.reduce((s, f) => s + (Array.isArray(f?.history) ? f.history.length : 0), 0),
    animals: Array.isArray(b.data['na:animals']) ? (b.data['na:animals'] as { name?: unknown }[]).map((g) => String(g?.name ?? 'Animals')) : [],
    stockItems: Array.isArray(b.data['na:stock']) ? (b.data['na:stock'] as unknown[]).length : 0,
    exportedAt: b.exportedAt,
  };
}

/** Checks a file before anything on the phone is touched. */
export function parseBackup(text: string): { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: string } {
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a Nexus Agri backup (it can't be read)." };
  }
  if (!j || j.app !== BACKUP_APP || typeof j.data !== 'object' || j.data === null || Array.isArray(j.data)) {
    return { ok: false, error: "This file isn't a Nexus Agri backup." };
  }
  if (typeof j.version !== 'number' || j.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Nexus Agri. Update the app, then try again.' };
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(j.data as Record<string, unknown>)) if (isUserKey(k)) data[k] = v;
  if (!Array.isArray(data['na:farms']) && !Array.isArray(data['na:animals'])) return { ok: false, error: 'This backup has no fields or animals in it.' };
  const backup: Backup = { app: BACKUP_APP, version: j.version, exportedAt: String(j.exportedAt ?? ''), data };
  return { ok: true, backup, summary: summarizeBackup(backup) };
}

/** Replaces everything the farmer entered on this phone with the backup's contents. */
export function restoreBackup(backup: Backup, store: Store) {
  const existing: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith('na:')) existing.push(k);
  }
  existing.forEach((k) => store.removeItem(k));
  for (const [k, v] of Object.entries(backup.data)) store.setItem(k, JSON.stringify(v));
}

export const backupFileName = (now = new Date()) => `nexus-agri-backup-${now.toISOString().slice(0, 10)}.json`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 fields (Back plot, River plot), 2 animal groups (Layers, Goats), 12 store items, 5 record-book entries" */
export function describeSummary(s: BackupSummary) {
  const parts: string[] = [];
  if (s.farms.length) parts.push(`${plural(s.farms.length, 'field', 'fields')} (${s.farms.join(', ')})`);
  if (s.animals.length) parts.push(`${plural(s.animals.length, 'animal group', 'animal groups')} (${s.animals.join(', ')})`);
  if (s.stockItems) parts.push(plural(s.stockItems, 'store item', 'store items'));
  parts.push(plural(s.records, 'record-book entry', 'record-book entries'));
  if (s.pastSeasons) parts.push(plural(s.pastSeasons, 'past season', 'past seasons'));
  return parts.join(', ');
}

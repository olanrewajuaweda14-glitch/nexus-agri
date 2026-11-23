import { describe, expect, it } from 'vitest';
import { collectBackup, parseBackup, restoreBackup } from '../src/lib/backup';

/** In-memory stand-in for localStorage. */
function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    dump: () => Object.fromEntries(m),
  };
}

const farms = [{ id: 'f1', name: 'Back plot', history: [{ seasonId: 's0' }] }, { id: 'f2', name: 'River field' }];
const phone = () => memStore({
  'na:farms': JSON.stringify(farms),
  'na:active': JSON.stringify('f1'),
  'na:records:f1:2026-04-10': JSON.stringify([{ id: '1' }, { id: '2' }]),
  'na:records:f1:s0': JSON.stringify([{ id: '3' }]),
  'na:waterlog:f1': JSON.stringify([{ id: 'w', date: '2026-11-20', kind: 'irrigation', full: true }]),
  'na:cache:weather:7.4,3.9': JSON.stringify({ big: 'cached forecast' }),
  'na:lastBackup': JSON.stringify('2026-11-01T00:00:00Z'),
  'other-site-key': 'x',
});

describe('backup and restore', () => {
  it('collects what the farmer entered, without caches', () => {
    const b = collectBackup(phone(), new Date('2026-11-23T08:00:00Z'));
    expect(Object.keys(b.data).sort()).toEqual(['na:active', 'na:farms', 'na:records:f1:2026-04-10', 'na:records:f1:s0', 'na:waterlog:f1']);
    expect(b.exportedAt).toBe('2026-11-23T08:00:00.000Z');
  });

  it('round-trips onto a new phone and reports what is inside', () => {
    const text = JSON.stringify(collectBackup(phone()));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.summary).toMatchObject({ farms: ['Back plot', 'River field'], records: 3, pastSeasons: 1 });

    const newPhone = memStore({ 'na:farms': JSON.stringify([{ id: 'x', name: 'Old test' }]), 'na:cache:soil:1,1': '{}' });
    restoreBackup(parsed.backup, newPhone);
    const d = newPhone.dump();
    expect(JSON.parse(d['na:farms']).map((f: { name: string }) => f.name)).toEqual(['Back plot', 'River field']);
    expect(JSON.parse(d['na:records:f1:s0'])).toHaveLength(1);
    expect(d['na:cache:soil:1,1']).toBeUndefined(); // stale caches cleared too
  });

  it('refuses files that are not backups, before touching anything', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'something-else', data: {} }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ app: 'nexus-agri', version: 1, data: { 'na:active': 'f1' } }))).toMatchObject({ ok: false, error: expect.stringMatching(/no fields/) });
    expect(parseBackup(JSON.stringify({ app: 'nexus-agri', version: 99, data: { 'na:farms': [] } }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('ignores foreign keys smuggled into a backup', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'nexus-agri', version: 1, exportedAt: 'x', data: { 'na:farms': [], 'evil': 1, 'na:cache:weather:1,1': {} } }));
    expect(parsed.ok && Object.keys(parsed.backup.data)).toEqual(['na:farms']);
  });
});

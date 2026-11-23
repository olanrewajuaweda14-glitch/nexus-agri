import { useState } from 'react';
import { ArrowLeft, Download, Share2, Upload } from 'lucide-react';
import { backupFileName, collectBackup, LAST_BACKUP_KEY, parseBackup, restoreBackup, type Backup as BackupFile, type BackupSummary } from '../lib/backup';
import { load, save } from '../lib/storage';
import { Logo } from '../components/Logo';

const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

export function Backup({ onBack }: { onBack: () => void }) {
  const [last, setLast] = useState<string | null>(() => load<string | null>(LAST_BACKUP_KEY, null));
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const makeFile = () => {
    const b = collectBackup(localStorage);
    return new File([JSON.stringify(b)], backupFileName(), { type: 'application/json' });
  };
  const markSaved = () => {
    const now = new Date().toISOString();
    save(LAST_BACKUP_KEY, now);
    setLast(now);
  };

  const download = () => {
    const file = makeFile();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    markSaved();
    setNote(`Saved ${file.name}. Keep it somewhere safe off this phone — send it to yourself on WhatsApp or put it in Google Drive.`);
  };

  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
  const share = async () => {
    const file = makeFile();
    try {
      await navigator.share({ files: [file], title: 'Nexus Agri backup', text: 'My Nexus Agri farm records backup' });
      markSaved();
      setNote('Backup shared. Keep that message or file — it is how you get your records back.');
    } catch {
      /* cancelled */
    }
  };

  const choose = async (f: File | undefined) => {
    setError(null);
    setPending(null);
    if (!f) return;
    if (f.size > 8_000_000) return setError('That file is too large to be a Nexus Agri backup.');
    const r = parseBackup(await f.text());
    if (!r.ok) return setError(r.error);
    setPending({ backup: r.backup, summary: r.summary });
  };

  const restore = () => {
    if (!pending) return;
    if (!confirm('Replace everything on this phone with this backup? Fields and records currently on this phone will be removed.')) return;
    restoreBackup(pending.backup, localStorage);
    window.location.hash = '';
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-16 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Logo />
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
      </div>
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Back up or move to a new phone</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Your fields, plans, ticked jobs, budgets, record books, past seasons and water log are saved only on this phone. A backup puts all of it in one small file.
        </p>
      </header>

      <section className="card space-y-4 p-4" aria-labelledby="save-h">
        <div>
          <h2 id="save-h" className="font-display text-xl font-semibold">Save a backup</h2>
          <p className="mt-1 text-sm text-ink-2">Last backup: <b className="font-medium text-ink">{ago(last)}</b></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShareFiles && (
            <button type="button" className="btn btn-primary press" onClick={share}>
              <Share2 className="h-4 w-4" aria-hidden /> Send to WhatsApp or Drive
            </button>
          )}
          <button type="button" className={`btn press ${canShareFiles ? 'btn-ghost' : 'btn-primary'}`} onClick={download}>
            <Download className="h-4 w-4" aria-hidden /> Download backup file
          </button>
        </div>
        {note && <p role="status" className="rounded-lg bg-leaf-soft/60 px-3 py-2 text-sm">{note}</p>}
      </section>

      <section className="card space-y-4 p-4" aria-labelledby="restore-h">
        <div>
          <h2 id="restore-h" className="font-display text-xl font-semibold">Restore from a backup</h2>
          <p className="mt-1 text-sm text-ink-2">On a new phone: open this page, choose the backup file, and everything comes back.</p>
        </div>
        <label className="btn btn-ghost press w-fit cursor-pointer">
          <Upload className="h-4 w-4" aria-hidden /> Choose backup file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} aria-label="Backup file" />
        </label>
        {error && <p role="alert" className="text-sm text-clay">{error}</p>}
        {pending && (
          <div className="space-y-3 rounded-xl bg-paper p-3 text-sm">
            <p>
              Backup from <b>{pending.summary.exportedAt ? new Date(pending.summary.exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date'}</b>:{' '}
              {pending.summary.farms.length} field{pending.summary.farms.length === 1 ? '' : 's'} ({pending.summary.farms.join(', ')}), {pending.summary.records} record-book entr{pending.summary.records === 1 ? 'y' : 'ies'}
              {pending.summary.pastSeasons > 0 && `, ${pending.summary.pastSeasons} past season${pending.summary.pastSeasons === 1 ? '' : 's'}`}.
            </p>
            <button type="button" className="btn btn-primary press" onClick={restore}>Replace this phone's data with this backup</button>
          </div>
        )}
      </section>
    </div>
  );
}

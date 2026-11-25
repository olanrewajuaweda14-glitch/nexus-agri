import { useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import type { AgendaItem, When } from '../lib/agenda';
import type { Farm } from '../lib/types';
import type { OwnTask, Repeat } from '../lib/tasks';
import { localToday, shortDate } from '../lib/dates';
import { newId } from '../lib/stock';
import { useHub } from '../lib/hub';
import { AgendaList } from '../components/Agenda';
import { Segmented } from '../components/ui';

type Filter = 'all' | 'crop' | 'animal' | 'own';
const GROUPS: { when: When; title: string }[] = [
  { when: 'overdue', title: 'Overdue' },
  { when: 'today', title: 'Today' },
  { when: 'week', title: 'This week' },
  { when: 'later', title: 'Next 30 days' },
];

export function Tasks({ agenda, farms, done, toggleDone, startAdding }: { agenda: AgendaItem[]; farms: Farm[]; done: Set<string>; toggleDone: (k: string) => void; startAdding: boolean }) {
  const hub = useHub();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(startAdding);
  const list = filter === 'all' ? agenda : agenda.filter((a) => a.source === filter);
  const finished = hub.tasks.filter((t) => t.doneOn).sort((a, b) => b.doneOn!.localeCompare(a.doneOn!));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Tasks</h1>
          <p className="mt-1 max-w-prose text-ink-2">Crop jobs from every field, the animals' health work and your own tasks, in one list.</p>
        </div>
        {!adding && (
          <button type="button" className="btn btn-accent press" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Add a task
          </button>
        )}
      </header>

      {adding && <TaskForm farms={farms} onDone={() => setAdding(false)} />}

      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'crop', label: 'Crops' },
          { value: 'animal', label: 'Animals' },
          { value: 'own', label: 'Mine' },
        ]}
      />

      {list.length === 0 && <p className="text-[17px] text-ink-2">Nothing to do in the next 30 days{filter === 'all' ? '' : ' here'}.</p>}
      {GROUPS.map(({ when, title }) => {
        const items = list.filter((a) => a.when === when);
        if (!items.length) return null;
        return (
          <section key={when} className="space-y-3" aria-labelledby={`tasks-${when}`}>
            <h2 id={`tasks-${when}`} className={`text-[21px] font-bold ${when === 'overdue' ? 'text-clay' : ''}`}>
              {title} <span className="num font-normal text-ink-3">{items.length}</span>
            </h2>
            <AgendaList items={items} farms={farms} done={done} toggleDone={toggleDone} label={title} />
          </section>
        );
      })}

      {finished.length > 0 && (filter === 'all' || filter === 'own') && (
        <section className="space-y-3" aria-labelledby="tasks-done">
          <h2 id="tasks-done" className="text-[21px] font-bold">Finished this week</h2>
          <ul className="divide-y divide-line-2 rounded-xl border border-line bg-card">
            {finished.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-ink-2 line-through decoration-ink-3">{t.title}</span>
                  <span className="text-[14px] text-ink-3">Done {shortDate(t.doneOn!)}</span>
                </span>
                <button type="button" onClick={() => hub.untickTask(t.id)} className="inline-flex items-center gap-1 text-sm font-bold text-leaf">
                  <Undo2 className="h-4 w-4" aria-hidden /> Not done
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskForm({ farms, onDone }: { farms: Farm[]; onDone: () => void }) {
  const hub = useHub();
  const today = localToday();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(today);
  const [repeat, setRepeat] = useState<Repeat | ''>('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Say what needs doing.');
    if (!due) return setError('Pick the day it is due.');
    const t: OwnTask = {
      id: newId('t'),
      title: title.trim().slice(0, 120),
      due,
      repeat: repeat || undefined,
      fieldId: link.startsWith('f:') ? link.slice(2) : undefined,
      groupId: link.startsWith('g:') ? link.slice(2) : undefined,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    hub.saveTask(t);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-card p-4" aria-label="New task">
      <label className="block">
        <span className="mb-1 block font-bold">What needs doing?</span>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix the pen door, pay the labourers" maxLength={120} autoFocus />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold">Due</span>
          <input className="field num" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Repeat</span>
          <select className="field" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat | '')}>
            <option value="">Just once</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">For</span>
          <select className="field" value={link} onChange={(e) => setLink(e.target.value)}>
            <option value="">The whole farm</option>
            {farms.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.name}</option>)}
            {hub.groups.filter((g) => !g.closed).map((g) => <option key={g.id} value={`g:${g.id}`}>{g.name}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-bold">Note <span className="font-normal text-ink-3">(optional)</span></span>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </label>
      {error && <p role="alert" className="text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary press">Save task</button>
        <button type="button" className="btn btn-ghost press" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

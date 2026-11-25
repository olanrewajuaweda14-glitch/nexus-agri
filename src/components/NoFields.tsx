import { Plus, Sprout } from 'lucide-react';

/** What the crop and field-money screens show before any field is set up. */
export function NoFields({ onAdd, money = false }: { onAdd: () => void; money?: boolean }) {
  return (
    <div className="card space-y-3 p-6">
      <Sprout className="h-8 w-8 text-leaf" aria-hidden />
      {money ? <h2 className="text-2xl font-bold">Crop money needs a field</h2> : <h1 className="text-2xl font-bold">No fields yet</h1>}
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

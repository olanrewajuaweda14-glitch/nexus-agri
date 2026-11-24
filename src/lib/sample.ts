/**
 * The sample farm: one maize field, a laying flock and a few goats, and a
 * store with something running low, so every screen has something real to
 * show. All ids start with "sample" and can be removed in one go.
 */
import type { Farm } from './types';
import { addDays, localToday } from './dates';
import type { AnimalEvent, AnimalGroup } from './livestock';
import type { StockItem, StockMove } from './stock';

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

export function sampleHub(): { groups: AnimalGroup[]; events: Record<string, AnimalEvent[]>; stock: StockItem[]; moves: StockMove[] } {
  const today = localToday();
  const d = (n: number) => addDays(today, -n);
  const created = new Date().toISOString();
  const layers: AnimalGroup = { id: 'sample-layers', species: 'layer', name: 'Sample layers', startDate: d(70), ageAtStart: 126, startCount: 300, fieldId: 'sample', createdAt: created };
  const goats: AnimalGroup = { id: 'sample-goats', species: 'goat', name: 'Sample goats', startDate: d(200), ageAtStart: 365, startCount: 8, fieldId: 'sample', createdAt: created };

  let i = 0;
  const e = (x: Omit<AnimalEvent, 'id'>): AnimalEvent => ({ id: `sample-e${String(i++).padStart(3, '0')}`, ...x });
  const layerEvents: AnimalEvent[] = [
    e({ date: d(70), kind: 'cost', amount: 1_050_000, category: 'other', note: 'Bought 300 point-of-lay pullets' }),
    e({ date: d(70), kind: 'health', stepId: 'worms', product: 'Piperazine' }),
    e({ date: d(70), kind: 'health', stepId: 'kom2', product: 'Komarov (NVRI)' }),
    e({ date: d(21), kind: 'health', stepId: 'ndlay', product: 'La Sota (NVRI)' }),
    e({ date: d(40), kind: 'cost', amount: 312_000, category: 'feed', note: 'Layer mash, 24 bags' }),
    e({ date: d(12), kind: 'cost', amount: 260_000, category: 'feed', note: 'Layer mash, 20 bags' }),
    e({ date: d(30), kind: 'died', count: 2, note: 'Not known' }),
    e({ date: d(9), kind: 'income', amount: 252_000, note: '60 crates of eggs' }),
    e({ date: d(2), kind: 'income', amount: 234_000, note: '55 crates of eggs' }),
  ];
  // Laying well, around 88% of 298 hens.
  const pattern = [266, 262, 270, 259, 264, 268, 261, 263, 267, 258, 265, 262, 260, 264];
  pattern.forEach((n, k) => layerEvents.push(e({ date: d(13 - k), kind: 'eggs', count: n })));

  const goatEvents: AnimalEvent[] = [
    e({ date: d(200), kind: 'cost', amount: 480_000, category: 'other', note: 'Bought 8 West African Dwarf goats' }),
    e({ date: d(198), kind: 'health', stepId: 'ppr', product: 'PPR vaccine (NVRI)' }),
    e({ date: d(96), kind: 'health', stepId: 'worms', product: 'Albendazole' }),
    e({ date: d(34), kind: 'added', count: 3, note: 'Kids born' }),
    e({ date: d(15), kind: 'sold', count: 2, amount: 170_000 }),
  ];

  const stock: StockItem[] = [
    { id: 'sample-urea', name: 'Urea', category: 'fertilizer', unit: 'bag50', key: 'fert:urea', lowAt: 2, createdAt: created },
    { id: 'sample-npk', name: 'NPK 15-15-15', category: 'fertilizer', unit: 'bag50', key: 'fert:NPK 15-15-15', createdAt: created },
    { id: 'sample-mash', name: 'Layer mash', category: 'feed', unit: 'bag25', lowAt: 10, createdAt: created },
    { id: 'sample-lasota', name: 'La Sota vaccine (200 doses)', category: 'medicine', unit: 'vial', createdAt: created },
  ];
  const moves: StockMove[] = [
    { id: 'sample-m001', itemId: 'sample-urea', date: d(20), kind: 'in', qty: 4, amount: 168_000, note: 'From the dealer in Bodija' },
    { id: 'sample-m002', itemId: 'sample-npk', date: d(45), kind: 'in', qty: 16, amount: 640_000 },
    { id: 'sample-m003', itemId: 'sample-npk', date: d(36), kind: 'out', qty: 16, note: 'Basal NPK on the sample field' },
    { id: 'sample-m004', itemId: 'sample-mash', date: d(12), kind: 'in', qty: 20, amount: 260_000 },
    { id: 'sample-m005', itemId: 'sample-mash', date: d(1), kind: 'out', qty: 13, note: 'Fed to the layers' },
    { id: 'sample-m006', itemId: 'sample-lasota', date: d(25), kind: 'in', qty: 3, amount: 4_500 },
    { id: 'sample-m007', itemId: 'sample-lasota', date: d(21), kind: 'out', qty: 2, note: 'Layer booster' },
  ];
  return { groups: [layers, goats], events: { [layers.id]: layerEvents, [goats.id]: goatEvents }, stock, moves };
}

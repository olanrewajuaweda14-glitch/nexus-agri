import type { CropDef } from '../crops';
import type { Farm } from '../types';
import { addDays } from '../dates';

export interface ShoppingItem {
  id: string;
  name: string;
  /** Quantity actually needed for the field. */
  need: number;
  unit: 'kg' | 'g' | 'bundles';
  /** Whole 50 kg bags to buy (fertilizer and lime only). */
  bags?: number;
  /** What the price box is "per". */
  priceUnit: 'bag' | 'kg' | 'bundle';
  /** How many price units to pay for. */
  buyUnits: number;
  when: string;
  note: string;
}

const BAG_KG = 50;
const whole = (n: number) => Math.ceil(n - 1e-9);

/**
 * Everything to buy for one season on this field, from the crop's own seed
 * rate and fertilizer schedule scaled to the farm size, plus lime when the
 * soil needs it. Fertilizer is rounded up to whole 50 kg bags because that is
 * how dealers sell it.
 */
export function shoppingList(crop: CropDef, farm: Farm, limeTPerHa = 0): ShoppingItem[] {
  const ha = Math.max(0, farm.sizeHa);
  const items: ShoppingItem[] = [];
  const date = (dap: number) => addDays(farm.plantingDate, dap);

  const s = crop.seed;
  const seedNeed = s.unit === 'g' ? Math.ceil((s.perHa * ha) / 10) * 10 : s.unit === 'bundles' ? whole(s.perHa * ha) : whole(s.perHa * ha);
  items.push({
    id: 'seed',
    name: s.item,
    need: seedNeed,
    unit: s.unit,
    priceUnit: s.unit === 'bundles' ? 'bundle' : 'kg',
    buyUnits: s.unit === 'g' ? seedNeed / 1000 : seedNeed,
    when: `before ${date(0)}`,
    note: `${s.perHa} ${s.unit}/ha. ${s.note}`,
  });

  if (crop.legume) {
    items.push({
      id: 'inoculant',
      name: 'Legume inoculant (rhizobium)',
      need: seedNeed,
      unit: 'kg',
      priceUnit: 'kg',
      buyUnits: 0,
      when: 'on sowing day',
      note: `Enough sachets to treat ${seedNeed} kg of seed — check the treatment rate on the pack. Keep it cool and out of the sun.`,
    });
  }

  // Group fertilizer doses by product (rice gets urea twice, for example).
  const byProduct = new Map<string, { kgPerHa: number; uses: string[]; firstDap: number }>();
  for (const t of crop.tasks) {
    if (!t.dose) continue;
    const e = byProduct.get(t.dose.product) ?? { kgPerHa: 0, uses: [], firstDap: t.fromDap };
    e.kgPerHa += t.dose.kgPerHa;
    e.uses.push(`${t.dose.kgPerHa} kg/ha at day ${t.fromDap}–${t.toDap}`);
    e.firstDap = Math.min(e.firstDap, t.fromDap);
    byProduct.set(t.dose.product, e);
  }
  for (const [product, e] of byProduct) {
    const kg = e.kgPerHa * ha;
    const bags = whole(kg / BAG_KG);
    items.push({
      id: `fert:${product}`,
      name: product.charAt(0).toUpperCase() + product.slice(1),
      need: Math.round(kg),
      unit: 'kg',
      bags,
      priceUnit: 'bag',
      buyUnits: bags,
      when: `by ${date(e.firstDap)}`,
      note: e.uses.join('; ') + '.',
    });
  }

  if (limeTPerHa > 0) {
    const kg = limeTPerHa * 1000 * ha;
    const bags = whole(kg / BAG_KG);
    items.push({
      id: 'lime',
      name: 'Agricultural lime',
      need: Math.round(kg),
      unit: 'kg',
      bags,
      priceUnit: 'bag',
      buyUnits: bags,
      when: `by ${date(-42)}`,
      note: `${limeTPerHa} t/ha, worked in 4–6 weeks before planting. Estimate from soil pH — confirm with a soil test.`,
    });
  }
  return items;
}

export function shoppingTotal(items: ShoppingItem[], prices: Record<string, number>) {
  let total = 0;
  let priced = 0;
  for (const it of items) {
    const p = prices[it.id];
    if (p > 0 && it.buyUnits > 0) {
      total += p * it.buyUnits;
      priced++;
    }
  }
  return { total, priced, payable: items.filter((i) => i.buyUnits > 0).length };
}

import type { Budget, Farm, SeasonSummary } from './types';
import { summarize, type FarmRecord } from './records';

/**
 * The id a season's records, ticked jobs and storage plan are filed under.
 * Farms created before seasons existed have no `seasonId`; for them it is the
 * planting date, which is exactly what their saved data is already keyed by.
 */
export const seasonOf = (farm: Pick<Farm, 'seasonId' | 'plantingDate'>) => farm.seasonId ?? farm.plantingDate;

export function summarizeSeason(farm: Farm, records: FarmRecord[], budget: Budget, endedAt: string): SeasonSummary {
  const s = summarize(records, budget, farm.sizeHa);
  return {
    seasonId: seasonOf(farm),
    crop: farm.crop,
    plantingDate: farm.plantingDate,
    maturity: farm.maturity,
    sizeHa: farm.sizeHa,
    endedAt,
    spent: s.spent,
    sales: s.sales,
    harvestedKg: s.harvestedKg,
    soldKg: s.soldKg,
  };
}

/** Files the finished season into the farm's history and opens a fresh one for `next`. */
export function startNextSeason(current: Farm, next: Farm, summary: SeasonSummary, newId = `s${Date.now().toString(36)}`): Farm {
  return { ...next, id: current.id, seasonId: newId, history: [...(current.history ?? []), summary] };
}

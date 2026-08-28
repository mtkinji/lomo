import type { MealTimingIntent } from './mealPlanContracts.ts';

export type ReviewedMealPlanOccasion = {
  id: string;
  title: string | null;
  placementDate: string | null;
  timing: MealTimingIntent;
  notEatingPersonIds: string[];
  dishes: Array<{ id: string; candidateId: string; dinerPersonIds: string[]; servings: number | null }>;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function date(value: unknown): string | null {
  const parsed = text(value);
  return parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed) && Number.isFinite(Date.parse(`${parsed}T00:00:00Z`)) ? parsed : null;
}
function timing(value: unknown): MealTimingIntent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.kind === 'flexible') return { kind: 'flexible' };
  const mealPeriod = ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(input.mealPeriod))
    ? input.mealPeriod as 'breakfast' | 'lunch' | 'dinner' | 'snack' : null;
  if (input.kind === 'occasion') {
    const selectedDate = date(input.date);
    return selectedDate && mealPeriod ? { kind: 'occasion', date: selectedDate, mealPeriod } : null;
  }
  if (input.kind === 'coverage' && Array.isArray(input.dates)) {
    const dates = input.dates.map(date);
    const label = text(input.label);
    return dates.length > 0 && dates.length <= 31 && dates.every((item): item is string => !!item)
      && new Set(dates).size === dates.length && mealPeriod && label && label.length <= 120
      ? { kind: 'coverage', dates, mealPeriod, label } : null;
  }
  return null;
}

export function parseReviewedMealPlanOccasions(value: unknown, context: {
  candidateIds: readonly string[];
  eligiblePersonIds: readonly string[];
}): ReviewedMealPlanOccasion[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 60) return null;
  const candidates = new Set(context.candidateIds);
  const eligiblePeople = new Set(context.eligiblePersonIds);
  const occasionIds = new Set<string>();
  const dishIds = new Set<string>();
  const result: ReviewedMealPlanOccasion[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const input = raw as Record<string, unknown>;
    const id = text(input.id); const selectedTiming = timing(input.timing);
    const title = input.title === null ? null : text(input.title);
    const placementDate = input.placementDate === null ? null : date(input.placementDate);
    const notEatingPersonIds = Array.isArray(input.notEatingPersonIds)
      ? input.notEatingPersonIds.map(text) : [];
    if (!id || occasionIds.has(id) || !selectedTiming
      || (input.title !== null && (!title || title.length > 160))
      || (input.placementDate !== null && !placementDate)
      || notEatingPersonIds.some((personId) => !personId || !eligiblePeople.has(personId))
      || new Set(notEatingPersonIds).size !== notEatingPersonIds.length
      || !Array.isArray(input.dishes) || input.dishes.length < 1 || input.dishes.length > 20) return null;
    occasionIds.add(id);
    const dishes: ReviewedMealPlanOccasion['dishes'] = [];
    for (const rawDish of input.dishes) {
      if (!rawDish || typeof rawDish !== 'object' || Array.isArray(rawDish)) return null;
      const dish = rawDish as Record<string, unknown>;
      const dishId = text(dish.id); const candidateId = text(dish.candidateId);
      const dinerPersonIds = Array.isArray(dish.dinerPersonIds) ? dish.dinerPersonIds.map(text) : [];
      const servings = dish.servings === null ? null : Number(dish.servings);
      if (!dishId || dishIds.has(dishId) || !candidateId || !candidates.has(candidateId)
        || dinerPersonIds.length < 1 || dinerPersonIds.length > 24
        || dinerPersonIds.some((personId) => !personId || !eligiblePeople.has(personId))
        || new Set(dinerPersonIds).size !== dinerPersonIds.length
        || dinerPersonIds.some((personId) => notEatingPersonIds.includes(personId))
        || (servings !== null && (!Number.isFinite(servings) || servings <= 0))) return null;
      dishIds.add(dishId);
      dishes.push({ id: dishId, candidateId, dinerPersonIds: dinerPersonIds as string[], servings });
    }
    result.push({ id, title, placementDate, timing: selectedTiming,
      notEatingPersonIds: notEatingPersonIds as string[], dishes });
  }
  return result;
}

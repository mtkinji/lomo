import type { MealPeriod, MealTimingIntent } from './mealPlanContracts';

export type MealCommitment = {
  candidateId: string;
  timing: MealTimingIntent;
};

const ISO_LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertLocalDate(value: string): void {
  if (!ISO_LOCAL_DATE.test(value)) throw new Error('Choose a valid date.');
  const date = new Date(`${value}T12:00:00`);
  const roundTrip = Number.isNaN(date.getTime()) ? '' : [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  if (roundTrip !== value) {
    throw new Error('Choose a valid date.');
  }
}

export function normalizeMealTiming(timing: MealTimingIntent): MealTimingIntent {
  if (timing.kind === 'flexible') return { kind: 'flexible' };
  if (timing.kind === 'occasion') {
    assertLocalDate(timing.date);
    return { kind: 'occasion', date: timing.date, mealPeriod: timing.mealPeriod };
  }
  const dates = [...new Set(timing.dates)];
  dates.forEach(assertLocalDate);
  dates.sort();
  if (!dates.length) throw new Error('Choose at least one coverage day.');
  const label = timing.label.trim();
  if (!label) throw new Error('Name what covers these meals.');
  if (label.length > 120) throw new Error('Keep the coverage name under 120 characters.');
  return { kind: 'coverage', dates, mealPeriod: timing.mealPeriod, label };
}

function periodLabel(value: MealPeriod): string {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function formatMealTiming(timingInput: MealTimingIntent): string {
  const timing = normalizeMealTiming(timingInput);
  if (timing.kind === 'flexible') return 'Flexible';
  if (timing.kind === 'coverage') {
    const dayLabel = timing.dates.length === 1 ? '1 day' : `${timing.dates.length} days`;
    return `${timing.label} · ${dayLabel} · ${periodLabel(timing.mealPeriod)}`;
  }
  const date = new Date(`${timing.date}T12:00:00`);
  const label = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  return `${label} · ${periodLabel(timing.mealPeriod)}`;
}

export function buildMealCommitmentOccasions(input: {
  commitments: MealCommitment[];
  dinerPersonIds: string[];
  defaultServings: number;
  selectedServingsByCandidateId?: ReadonlyMap<string, number>;
  createId(): string;
}): Array<{
  id: string;
  title: string | null;
  placementDate: string | null;
  timing: MealTimingIntent;
  notEatingPersonIds: string[];
  dishes: Array<{ id: string; candidateId: string; dinerPersonIds: string[]; servings: number }>;
}> {
  if (!input.dinerPersonIds.length) throw new Error('Choose usual diners first.');
  return input.commitments.map((commitment) => {
    const timing = normalizeMealTiming(commitment.timing);
    return {
      id: input.createId(),
      title: timing.kind === 'coverage' ? timing.label : null,
      placementDate: timing.kind === 'occasion' ? timing.date : null,
      timing,
      notEatingPersonIds: [],
      dishes: [{
        id: input.createId(),
        candidateId: commitment.candidateId,
        dinerPersonIds: [...input.dinerPersonIds],
        servings: input.selectedServingsByCandidateId?.get(commitment.candidateId)
          ?? Math.max(input.defaultServings, input.dinerPersonIds.length),
      }],
    };
  });
}

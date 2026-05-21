export type ChapterCadence = 'weekly' | 'monthly' | 'yearly' | 'manual';

export function countQuoteableActivityTitles(activityTitles: string[]): number {
  return activityTitles.filter((title) => title.trim().length >= 3).length;
}

export function resolveQuotedTitleRequirement(params: {
  cadence: ChapterCadence;
  strict: boolean;
  quoteableActivityTitleCount: number;
}): number {
  const available = Math.max(0, Math.floor(params.quoteableActivityTitleCount));
  if (available === 0) return 0;

  const base = params.cadence === 'weekly' || params.cadence === 'manual'
    ? 2
    : params.strict
      ? 5
      : 4;

  return Math.min(base, available);
}

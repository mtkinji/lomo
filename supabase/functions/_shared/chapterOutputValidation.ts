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

export function findMismatchedCompletionCount(
  text: string,
  completedActivityCount: number | null | undefined,
): number | null {
  if (typeof completedActivityCount !== 'number' || !Number.isFinite(completedActivityCount)) {
    return null;
  }

  const patterns = [
    /\b(\d+)\s+(?:activities|activity|tasks|task|items|item)\s+(?:were\s+|was\s+)?(?:completed|closed|finished|done)\b/gi,
    /\b(?:completed|closed|finished)\s+(\d+)\s+(?:activities|activity|tasks|task|items|item)\b/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(text)) !== null) {
      const count = Number.parseInt(match[1] ?? '', 10);
      if (Number.isFinite(count) && count !== completedActivityCount) {
        return count;
      }
    }
  }

  return null;
}

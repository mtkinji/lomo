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
    ? 1
    : params.strict
      ? 5
      : 4;

  return Math.min(base, available);
}

export function resolveCitedExampleRequirement(params: {
  cadence: ChapterCadence;
  strict: boolean;
}): number {
  if (params.cadence === 'weekly' || params.cadence === 'manual') return 4;
  return params.strict ? 6 : 4;
}

export function shouldRequireVerbatimUserNote(cadence: ChapterCadence): boolean {
  return cadence === 'monthly' || cadence === 'yearly';
}

export function allowedUnanchoredStoryParagraphs(cadence: ChapterCadence): number {
  return cadence === 'weekly' || cadence === 'manual' ? 1 : 0;
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

export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function paragraphHasAnchor(params: {
  paragraph: string;
  arcTitles: string[];
  goalTitles: string[];
  activityTitles: string[];
}): boolean {
  const { paragraph, arcTitles, goalTitles, activityTitles } = params;
  if (paragraph.startsWith('## ') || paragraph.startsWith('# ')) return true;
  if (/\d/.test(paragraph)) return true;
  if (/[\u201C"][^\u201D"]{3,}[\u201D"]/.test(paragraph)) return true;

  const lower = paragraph.toLowerCase();
  const titleAppears = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return false;
    return lower.includes(trimmed.toLowerCase());
  };

  if (arcTitles.some(titleAppears)) return true;
  if (goalTitles.some(titleAppears)) return true;
  if (activityTitles.some(titleAppears)) return true;

  return false;
}

export function countQuotedTitles(body: string, activityTitles: string[]): number {
  let count = 0;
  for (const title of activityTitles) {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (body.includes(`"${trimmed}"`) || body.includes(`\u201C${trimmed}\u201D`)) {
      count += 1;
    }
  }
  return count;
}

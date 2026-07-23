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
  availableExampleCount?: number;
}): number {
  const base = params.cadence === 'weekly' || params.cadence === 'manual'
    ? 2
    : params.strict
      ? 6
      : 4;
  if (typeof params.availableExampleCount !== 'number') return base;
  const available = Number.isFinite(params.availableExampleCount)
    ? Math.max(0, Math.floor(params.availableExampleCount))
    : 0;
  return Math.min(base, available);
}

export function buildValidationRepairInstruction(error: string | null | undefined): string {
  const raw = typeof error === 'string' ? error.trim() : '';
  if (!raw) return '';
  const lc = raw.toLowerCase();
  const instructions: string[] = [`Validator rejected the previous output: ${raw}`];

  if (lc.includes('metrics.health is not attached')) {
    instructions.push(
      'metrics.health is absent. Do not mention sleep, steps, walking, workouts, mindfulness, meditation, or active minutes anywhere in sections.signal.caption or story.body.',
    );
  }
  if (lc.includes('sections.signal.caption must include at least one number')) {
    instructions.push(
      'Rewrite sections.signal.caption to include at least one exact number from metrics while keeping the same story hook.',
    );
  }
  if (lc.includes('sections.signal.caption must quote at least one activity title')) {
    instructions.push(
      'Rewrite sections.signal.caption so it quotes one activity title exactly as it appears in evidence.activities_full.',
    );
  }
  if (lc.includes('citations.examples_used must include at least')) {
    instructions.push(
      'Fill citations.examples_used with valid activity_id values from evidence.noteworthy_examples first, then evidence.activities_full if more cited examples are needed.',
    );
  }
  if (lc.includes('lacks a concrete anchor')) {
    instructions.push(
      'Repair every story.body paragraph after the opening so it contains a number from metrics, a quoted activity title, or an exact Arc or Goal title.',
    );
  }
  if (lc.includes('banned word') || lc.includes('banned phrase')) {
    instructions.push(
      'Remove the banned generic language instead of replacing it with another abstract praise phrase.',
    );
  }
  if (lc.includes('invalid json')) {
    instructions.push(
      'Return one complete valid JSON object with no markdown fences. Use a shorter story.body if needed so the JSON closes cleanly.',
    );
  }

  return instructions.join(' ');
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

export function stripGroundedTextForHealthScan(params: {
  text: string;
  activityTitles: string[];
  arcTitles: string[];
  goalTitles: string[];
}): string {
  let out = typeof params.text === 'string' ? params.text : '';
  out = out.replace(/"[^"]*"/g, ' ');
  out = out.replace(/\u201C[^\u201D]*\u201D/g, ' ');

  for (const title of [...params.activityTitles, ...params.arcTitles, ...params.goalTitles]) {
    const trimmed = title.trim();
    if (trimmed.length < 3) continue;
    out = out.replace(new RegExp(escapeRegExp(trimmed), 'gi'), ' ');
  }

  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

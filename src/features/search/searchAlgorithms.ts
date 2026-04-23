import type { Activity, Arc, Goal } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';

function toSearchable(text: string | null | undefined): string {
  return String(text ?? '').trim().toLowerCase();
}

function safeDateMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function getRecencyScore(iso: string | null | undefined): number {
  const ms = safeDateMs(iso);
  if (!ms) return 0;
  const days = Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days <= 3) return 1;
  if (days <= 7) return 0.8;
  if (days <= 14) return 0.6;
  if (days <= 30) return 0.4;
  return 0.2;
}

function tokensFor(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// ---------------- Arcs ----------------

export type ArcSearchArgs = {
  arcs: Arc[];
  query: string;
  includeClosed: boolean;
};

function scoreArcQueryMatch(arc: Arc, query: string): number {
  const q = toSearchable(query);
  if (!q) return 0;
  const name = toSearchable(arc.name);
  const narrative = toSearchable(arc.narrative);

  let score = 0;
  if (name.includes(q)) score += 10;
  if (narrative.includes(q)) score += 3;

  const tokens = tokensFor(q);
  if (tokens.length > 1) {
    tokens.forEach((token) => {
      if (name.includes(token)) score += 2;
      if (narrative.includes(token)) score += 0.5;
    });
  }
  return score;
}

export function searchArcs({ arcs, query, includeClosed }: ArcSearchArgs): Arc[] {
  const q = query.trim();
  if (!q) return [];
  return arcs
    .filter((a) => includeClosed || a.status !== 'archived')
    .map((arc) => ({
      arc,
      matchScore: scoreArcQueryMatch(arc, q),
      recency: getRecencyScore(arc.updatedAt ?? arc.createdAt),
    }))
    .filter((row) => row.matchScore > 0)
    .sort((a, b) => b.matchScore + b.recency * 0.25 - (a.matchScore + a.recency * 0.25))
    .map((row) => row.arc);
}

export function getRecentArcs({
  arcs,
  includeClosed,
  limit = 5,
}: {
  arcs: Arc[];
  includeClosed: boolean;
  limit?: number;
}): Arc[] {
  return arcs
    .filter((a) => includeClosed || a.status !== 'archived')
    .slice()
    .sort((a, b) => (safeDateMs(b.updatedAt) ?? 0) - (safeDateMs(a.updatedAt) ?? 0))
    .slice(0, limit);
}

// ---------------- Goals ----------------

export type GoalSearchArgs = {
  goals: Goal[];
  query: string;
  includeClosed: boolean;
  arcNameById?: Record<string, string>;
};

function scoreGoalQueryMatch(
  goal: Goal,
  query: string,
  arcName: string | undefined,
): number {
  const q = toSearchable(query);
  if (!q) return 0;
  const title = toSearchable(goal.title);
  const description = toSearchable(goal.description);
  const arc = toSearchable(arcName);

  let score = 0;
  if (title.includes(q)) score += 10;
  if (description.includes(q)) score += 4;
  if (arc.includes(q)) score += 3;

  const tokens = tokensFor(q);
  if (tokens.length > 1) {
    tokens.forEach((token) => {
      if (title.includes(token)) score += 2;
      if (description.includes(token)) score += 0.5;
      if (arc.includes(token)) score += 0.5;
    });
  }
  return score;
}

function isGoalClosed(goal: Goal): boolean {
  return goal.status === 'completed' || goal.status === 'archived';
}

export function searchGoals({
  goals,
  query,
  includeClosed,
  arcNameById,
}: GoalSearchArgs): Goal[] {
  const q = query.trim();
  if (!q) return [];
  return goals
    .filter((g) => includeClosed || !isGoalClosed(g))
    .map((goal) => {
      const arcName = goal.arcId ? arcNameById?.[goal.arcId] : undefined;
      const matchScore = scoreGoalQueryMatch(goal, q, arcName);
      return {
        goal,
        matchScore,
        recency: getRecencyScore(goal.updatedAt ?? goal.createdAt),
      };
    })
    .filter((row) => row.matchScore > 0)
    .sort((a, b) => b.matchScore + b.recency * 0.25 - (a.matchScore + a.recency * 0.25))
    .map((row) => row.goal);
}

export function getRecentGoals({
  goals,
  includeClosed,
  limit = 5,
}: {
  goals: Goal[];
  includeClosed: boolean;
  limit?: number;
}): Goal[] {
  return goals
    .filter((g) => includeClosed || !isGoalClosed(g))
    .slice()
    .sort((a, b) => (safeDateMs(b.updatedAt) ?? 0) - (safeDateMs(a.updatedAt) ?? 0))
    .slice(0, limit);
}

// ---------------- Chapters ----------------

export type ChapterSearchArgs = {
  chapters: ChapterRow[];
  query: string;
};

/**
 * Flatten the LLM-authored chapter narrative into a single capped string so we
 * can do cheap substring matching without paying for huge field scans. We cap
 * to ~800 chars of story/signal body because those sections carry most of the
 * product value; matching further into the JSON gives diminishing returns and
 * risks scoring noise (e.g. raw arc ids).
 */
export function flattenChapterNarrative(output: any): string {
  if (!output || typeof output !== 'object') return '';
  const parts: string[] = [];
  if (typeof output.title === 'string') parts.push(output.title);
  if (typeof output.dek === 'string') parts.push(output.dek);
  if (Array.isArray(output.sections)) {
    for (const section of output.sections) {
      if (!section || typeof section !== 'object') continue;
      if (typeof section.caption === 'string') parts.push(section.caption);
      if (typeof section.body === 'string') parts.push(section.body);
    }
  }
  if (parts.length === 0) return '';
  const joined = parts.join(' ');
  return joined.length > 800 ? joined.slice(0, 800) : joined;
}

function scoreChapterQueryMatch(row: ChapterRow, query: string): number {
  const q = toSearchable(query);
  if (!q) return 0;
  const title = toSearchable(row?.output_json?.title ?? '');
  const dek = toSearchable(row?.output_json?.dek ?? '');
  const narrative = toSearchable(flattenChapterNarrative(row.output_json));
  const periodKey = toSearchable(row.period_key);
  const note = toSearchable(row.user_note);

  let score = 0;
  if (title.includes(q)) score += 10;
  if (dek.includes(q)) score += 6;
  if (note.includes(q)) score += 5;
  if (narrative.includes(q)) score += 3;
  if (periodKey.includes(q)) score += 2;

  const tokens = tokensFor(q);
  if (tokens.length > 1) {
    tokens.forEach((token) => {
      if (title.includes(token)) score += 2;
      if (dek.includes(token)) score += 1;
      if (narrative.includes(token)) score += 0.5;
      if (note.includes(token)) score += 1;
    });
  }
  return score;
}

export function searchChapters({ chapters, query }: ChapterSearchArgs): ChapterRow[] {
  const q = query.trim();
  if (!q) return [];
  return chapters
    .filter((c) => c.status === 'ready')
    .map((row) => ({
      row,
      matchScore: scoreChapterQueryMatch(row, q),
      recency: getRecencyScore(row.period_start),
    }))
    .filter((entry) => entry.matchScore > 0)
    .sort((a, b) => b.matchScore + b.recency * 0.25 - (a.matchScore + a.recency * 0.25))
    .map((row) => row.row);
}

export function getRecentChapters({
  chapters,
  limit = 5,
}: {
  chapters: ChapterRow[];
  limit?: number;
}): ChapterRow[] {
  return chapters
    .filter((c) => c.status === 'ready')
    .slice()
    .sort(
      (a, b) => (safeDateMs(b.period_start) ?? 0) - (safeDateMs(a.period_start) ?? 0),
    )
    .slice(0, limit);
}

// ---------------- Unified helpers ----------------

export type GlobalSearchScope = 'activities' | 'goals' | 'arcs' | 'chapters';

export const ALL_GLOBAL_SEARCH_SCOPES: readonly GlobalSearchScope[] = [
  'activities',
  'goals',
  'arcs',
  'chapters',
] as const;

/**
 * Compact, human-friendly label for a Chapter search row, used as the
 * inline meta string (e.g. "Week of Apr 14").
 */
export function formatChapterPeriodLabel(row: ChapterRow): string {
  const start = safeDateMs(row.period_start);
  if (!start) return row.period_key || 'Chapter';
  try {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return `Week of ${fmt.format(new Date(start))}`;
  } catch {
    return row.period_key || 'Chapter';
  }
}

/**
 * Short, non-jargon-y "X days ago" string for list metadata.
 */
export function formatRelativeDays(iso: string | null | undefined): string | undefined {
  const ms = safeDateMs(iso);
  if (!ms) return undefined;
  const days = Math.round((Date.now() - ms) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Picks the best activity-shaped "include completed" field out of the three
 * candidate stores, to let callers stay resilient while the store schema
 * migrates.
 */
export function activityPassesIncludeCompleted(
  activity: Activity,
  includeCompleted: boolean,
): boolean {
  if (includeCompleted) return true;
  return activity.status !== 'done' && activity.status !== 'cancelled';
}

import type { Activity } from '../../domain/types';

type SearchArgs = {
  activities: Activity[];
  query: string;
  goalTitleById?: Record<string, string>;
};

type RecommendArgs = {
  activities: Activity[];
  goalTitleById?: Record<string, string>;
  limit?: number;
};

const DEFAULT_RECOMMENDATION_LIMIT = 12;

function toSearchable(text: string | null | undefined): string {
  return String(text ?? '').trim().toLowerCase();
}

function safeDateMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function getRecencyScore(activity: Activity): number {
  const updatedMs = safeDateMs(activity.updatedAt) ?? safeDateMs(activity.createdAt);
  if (!updatedMs) return 0;
  const days = Math.max(0, (Date.now() - updatedMs) / (1000 * 60 * 60 * 24));
  if (days <= 3) return 1;
  if (days <= 7) return 0.8;
  if (days <= 14) return 0.6;
  if (days <= 30) return 0.4;
  return 0.2;
}

function getFrequencyScore(activity: Activity): number {
  const rule = activity.repeatRule;
  if (!rule) return 0;
  if (rule === 'daily') return 1;
  if (rule === 'weekdays') return 0.9;
  if (rule === 'weekly') return 0.7;
  if (rule === 'monthly') return 0.4;
  if (rule === 'yearly') return 0.2;
  if (rule === 'custom') {
    const cadence = activity.repeatCustom?.cadence;
    const interval = activity.repeatCustom?.interval ?? 1;
    if (cadence === 'days') return Math.min(1, 1 / Math.max(1, interval));
    if (cadence === 'weeks') return Math.min(1, 0.8 / Math.max(1, interval));
    if (cadence === 'months') return Math.min(1, 0.5 / Math.max(1, interval));
    if (cadence === 'years') return Math.min(1, 0.25 / Math.max(1, interval));
  }
  return 0;
}

function getStarredScore(activity: Activity): number {
  return activity.priority === 1 ? 1 : 0;
}

function getPriorityScore(activity: Activity): number {
  if (!activity.priority) return 0;
  if (activity.priority === 1) return 1;
  if (activity.priority === 2) return 0.6;
  return 0.3;
}

function getDueSoonScore(activity: Activity): number {
  const dueMs = safeDateMs(activity.scheduledDate) ?? safeDateMs(activity.reminderAt);
  if (!dueMs) return 0;
  const daysUntil = (dueMs - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntil <= 0.5) return 1;
  if (daysUntil <= 3) return 0.7;
  if (daysUntil <= 7) return 0.4;
  return 0.1;
}

function getStatusMultiplier(activity: Activity): number {
  switch (activity.status) {
    case 'done':
      return 0.4;
    case 'skipped':
    case 'cancelled':
      return 0.2;
    default:
      return 1;
  }
}

function getRecommendationScore(activity: Activity): number {
  const recency = getRecencyScore(activity);
  const frequency = getFrequencyScore(activity);
  const starred = getStarredScore(activity);
  const priority = getPriorityScore(activity);
  const dueSoon = getDueSoonScore(activity);
  const weighted =
    recency * 0.3 +
    frequency * 0.2 +
    starred * 0.25 +
    priority * 0.15 +
    dueSoon * 0.1;
  return weighted * getStatusMultiplier(activity);
}

function scoreQueryMatch(args: {
  activity: Activity;
  query: string;
  goalTitle?: string;
}): number {
  const q = toSearchable(args.query);
  if (!q) return 0;
  const title = toSearchable(args.activity.title);
  const notes = toSearchable(args.activity.notes);
  const tags = toSearchable(args.activity.tags?.join(' '));
  const goalTitle = toSearchable(args.goalTitle);

  let score = 0;
  if (title.includes(q)) score += 10;
  if (goalTitle.includes(q)) score += 6;
  if (tags.includes(q)) score += 4;
  if (notes.includes(q)) score += 2;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    tokens.forEach((token) => {
      if (title.includes(token)) score += 2;
      if (goalTitle.includes(token)) score += 1;
      if (tags.includes(token)) score += 1;
      if (notes.includes(token)) score += 0.5;
    });
  }

  return score;
}

export function searchActivities({ activities, query, goalTitleById }: SearchArgs): Activity[] {
  const q = query.trim();
  if (!q) return [];
  return activities
    .map((activity) => {
      const goalTitle = activity.goalId ? goalTitleById?.[activity.goalId] : undefined;
      const matchScore = scoreQueryMatch({ activity, query: q, goalTitle });
      const tiebreaker = getRecencyScore(activity);
      return { activity, score: matchScore + tiebreaker * 0.25 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.activity);
}

export function getRecommendedActivities({
  activities,
  limit = DEFAULT_RECOMMENDATION_LIMIT,
}: RecommendArgs): Activity[] {
  const ranked = activities
    .map((activity) => ({ activity, score: getRecommendationScore(activity) }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return [];
  const hasSignal = ranked[0]?.score > 0;
  if (!hasSignal) {
    return activities
      .slice()
      .sort((a, b) => (safeDateMs(b.updatedAt) ?? 0) - (safeDateMs(a.updatedAt) ?? 0))
      .slice(0, limit);
  }
  return ranked.slice(0, limit).map((row) => row.activity);
}


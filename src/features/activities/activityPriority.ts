import type {
  Activity,
  ActivityPriorityReasonCode,
  ActivityPriorityState,
  Goal,
} from '../../domain/types';

const CLOSED_STATUSES = new Set(['done', 'skipped', 'cancelled']);
const DEFAULT_RECOMMENDED_LIMIT = 3;
const RANK_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const RANK_BASE = RANK_ALPHABET.length;

export type RankedActivity = {
  activity: Activity;
  score: number;
  reasonCodes: ActivityPriorityReasonCode[];
};

export type InferredActivityPriorityMetadata = {
  priorityState: ActivityPriorityState;
  priorityRankKey: string;
  priorityRankSource: 'inferred';
  priorityReasonCodes: ActivityPriorityReasonCode[];
};

export type RecommendedModuleEligibility = {
  showRecommended: boolean;
  isKanbanLayout: boolean;
  hasFilters: boolean;
  hasGrouping: boolean;
};

const REASON_LABELS: Partial<Record<ActivityPriorityReasonCode, string>> = {
  due_today: 'Due today',
  due_soon: 'Due soon',
  reminder_soon: 'Reminder soon',
  explicit_priority: 'Starred',
  goal_priority: 'Important goal',
  started: 'Already started',
  has_steps: 'Has steps',
  recently_updated: 'Recently updated',
  scheduled_later: 'Scheduled later',
  later: 'Later',
  waiting: 'Waiting',
  needs_review: 'Needs review',
  moved_by_user: 'Moved by you',
};

const REASON_PRIORITY: ActivityPriorityReasonCode[] = [
  'due_today',
  'reminder_soon',
  'due_soon',
  'explicit_priority',
  'goal_priority',
  'started',
  'has_steps',
  'recently_updated',
  'scheduled_later',
  'waiting',
  'needs_review',
  'later',
  'moved_by_user',
];

function isPriorityState(value: unknown): value is ActivityPriorityState {
  return value === 'active' || value === 'later' || value === 'waiting' || value === 'needs_review';
}

export function getActivityPriorityState(activity: Activity): ActivityPriorityState {
  return isPriorityState(activity.priorityState) ? activity.priorityState : 'active';
}

export function getActivityPriorityReasonLabel(reasonCodes: ActivityPriorityReasonCode[]): string | null {
  const reason = REASON_PRIORITY.find((code) => reasonCodes.includes(code));
  return reason ? REASON_LABELS[reason] ?? null : null;
}

export function canShowRecommendedModule(params: RecommendedModuleEligibility): boolean {
  return (
    params.showRecommended &&
    !params.isKanbanLayout &&
    !params.hasFilters &&
    !params.hasGrouping
  );
}

function toGoalById(goals: Goal[]): Map<string, Goal> {
  return new Map(goals.map((goal) => [goal.id, goal]));
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function parseDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const ms = parseDateMs(value);
  return ms === null ? null : toDateKey(new Date(ms));
}

function daysUntil(value: string | null | undefined, now: Date): number | null {
  const dateKey = parseDateKey(value);
  if (dateKey) {
    const dateMs = Date.parse(`${dateKey}T00:00:00`);
    if (Number.isFinite(dateMs)) {
      const todayMs = Date.parse(`${toDateKey(now)}T00:00:00`);
      return (dateMs - todayMs) / (1000 * 60 * 60 * 24);
    }
  }

  const ms = parseDateMs(value);
  if (ms === null) return null;
  return (ms - now.getTime()) / (1000 * 60 * 60 * 24);
}

function recencyScore(activity: Activity, now: Date): number {
  const updatedMs = parseDateMs(activity.updatedAt) ?? parseDateMs(activity.createdAt);
  if (updatedMs === null) return 0;
  const days = Math.max(0, (now.getTime() - updatedMs) / (1000 * 60 * 60 * 24));
  if (days <= 1) return 8;
  if (days <= 3) return 6;
  if (days <= 7) return 4;
  if (days <= 14) return 2;
  return 0;
}

function addReason(reasons: ActivityPriorityReasonCode[], reason: ActivityPriorityReasonCode) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function scoreActivity(params: {
  activity: Activity;
  goal: Goal | undefined;
  now: Date;
}): RankedActivity {
  const { activity, goal, now } = params;
  const reasons: ActivityPriorityReasonCode[] = [];
  let score = 0;
  const state = getActivityPriorityState(activity);

  if (state !== 'active') {
    addReason(reasons, state);
    return { activity, score: -1000, reasonCodes: reasons };
  }

  if (CLOSED_STATUSES.has(activity.status)) {
    return { activity, score: -1000, reasonCodes: reasons };
  }

  if (activity.priority) {
    score += activity.priority === 1 ? 100 : activity.priority === 2 ? 60 : 30;
    addReason(reasons, 'explicit_priority');
  }

  if (goal?.priority) {
    score += goal.priority === 1 ? 80 : goal.priority === 2 ? 45 : 20;
    addReason(reasons, 'goal_priority');
  }

  const scheduledDays = daysUntil(activity.scheduledDate ?? activity.scheduledAt ?? null, now);
  if (scheduledDays !== null) {
    if (scheduledDays <= 0) {
      score += 70;
      addReason(reasons, 'due_today');
    } else if (scheduledDays <= 3) {
      score += 45;
      addReason(reasons, 'due_soon');
    } else if (scheduledDays > 3) {
      score -= Math.min(20, scheduledDays);
      addReason(reasons, 'scheduled_later');
    }
  }

  const reminderDays = daysUntil(activity.reminderAt ?? null, now);
  if (reminderDays !== null && reminderDays <= 3) {
    score += reminderDays <= 0 ? 55 : 35;
    addReason(reasons, 'reminder_soon');
  }

  if (activity.startedAt) {
    score += 25;
    addReason(reasons, 'started');
  }

  if ((activity.steps ?? []).length > 0) {
    score += 10;
    addReason(reasons, 'has_steps');
  }

  if (!activity.goalId) {
    score -= 8;
    addReason(reasons, 'unanchored');
  }

  const recent = recencyScore(activity, now);
  if (recent > 0) {
    score += recent;
    addReason(reasons, 'recently_updated');
  }

  return { activity, score, reasonCodes: reasons };
}

export function rankActivitiesBySmartOrder(params: {
  activities: Activity[];
  goals: Goal[];
  now: Date;
}): RankedActivity[] {
  const goalById = toGoalById(params.goals);
  return params.activities
    .map((activity) =>
      scoreActivity({
        activity,
        goal: activity.goalId ? goalById.get(activity.goalId) : undefined,
        now: params.now,
      }),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rankA = a.activity.priorityRankKey;
      const rankB = b.activity.priorityRankKey;
      if (rankA && rankB && rankA !== rankB) return rankA.localeCompare(rankB);
      if (rankA && !rankB) return -1;
      if (!rankA && rankB) return 1;
      return (a.activity.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.activity.orderIndex ?? Number.MAX_SAFE_INTEGER);
    });
}

export function getRecommendedPriorityActivities(params: {
  activities: Activity[];
  goals: Goal[];
  now: Date;
  limit?: number;
}): RankedActivity[] {
  const limit = params.limit ?? DEFAULT_RECOMMENDED_LIMIT;
  return rankActivitiesBySmartOrder(params)
    .filter((row) => row.score > 0)
    .filter((row) => getActivityPriorityState(row.activity) === 'active')
    .filter((row) => !CLOSED_STATUSES.has(row.activity.status))
    .slice(0, limit);
}

export function inferPriorityMetadataForActivity(params: {
  activity: Activity;
  goals: Goal[];
  now: Date;
}): InferredActivityPriorityMetadata {
  const ranked = rankActivitiesBySmartOrder({
    activities: [params.activity],
    goals: params.goals,
    now: params.now,
  })[0];
  return {
    priorityState: getActivityPriorityState(params.activity),
    priorityRankKey: params.activity.priorityRankKey ?? createRankKeyBetween(null, null),
    priorityRankSource: 'inferred',
    priorityReasonCodes: ranked?.reasonCodes ?? [],
  };
}

function rankIndex(char: string | undefined, fallback: number): number {
  if (char === undefined) return fallback;
  const index = RANK_ALPHABET.indexOf(char);
  return index >= 0 ? index : fallback;
}

export function createRankKeyBetween(before: string | null, after: string | null): string {
  const lower = before ?? '';
  const upper = after ?? '';
  let prefix = '';
  let index = 0;

  for (;;) {
    const lowerIndex = rankIndex(lower[index], before === null || index >= lower.length ? -1 : 0);
    const upperIndex = rankIndex(upper[index], after === null || index >= upper.length ? RANK_BASE : RANK_BASE);

    if (upperIndex - lowerIndex > 1) {
      const mid = Math.floor((lowerIndex + upperIndex) / 2);
      return `${prefix}${RANK_ALPHABET[mid]}`;
    }

    prefix += lower[index] ?? RANK_ALPHABET[Math.max(0, lowerIndex)];
    index += 1;
  }
}

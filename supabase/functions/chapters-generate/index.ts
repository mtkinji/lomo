// Chapters generator (Supabase Edge Function)
//
// Intended usage:
// - Schedule daily via Supabase Cron (GET).
// - Manual trigger via POST:
//   - { templateId?: string } to run for one template
//   - { userId?: string } (optional; service/admin use only)
//
// Posture:
// - Client cannot write chapters directly (RLS denies writes); this function uses service role.
// - For manual triggers from the app, caller should include Authorization: Bearer <user jwt>.
//
// Env:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
//
// Notes:
// - AI generation is performed directly from this function using OPENAI_API_KEY.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { DateTime } from 'npm:luxon@3.5.0';
import { getSupabaseAdmin, json, requireUserId } from '../_shared/calendarUtils.ts';
import { buildChapterDigestEmail } from '../_shared/emailTemplates.ts';
import { buildUnsubscribeHeaders } from '../_shared/emailUnsubscribe.ts';
import { sendEmailViaResend } from '../_shared/emailSend.ts';
import { computeChapterRecommendations as sharedComputeChapterRecommendations } from '../_shared/chapterRecommendations.ts';
import type { ChapterRecommendation } from '../_shared/chapterRecommendations.ts';
import {
  computeChapterHealthBlock,
  containsHealthKeyword,
} from '../_shared/chapterHealth.ts';
import type {
  ChapterHealthBlock,
  HealthDailyRow,
} from '../_shared/chapterHealth.ts';

type Cadence = 'weekly' | 'monthly' | 'yearly' | 'manual';
type TemplateKind = 'reflection' | 'report';

type FilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'nexists' | 'in';
type FilterGroupLogic = 'and' | 'or';
type ActivityFilterableField =
  | 'status'
  | 'tags'
  | 'goalId'
  | 'arcId'
  | 'type'
  | 'priority'
  | 'difficulty'
  | 'scheduledDate'
  | 'scheduledAt'
  | 'createdAt'
  | 'updatedAt'
  | 'completedAt'
  | 'title';

type FilterCondition = {
  id?: string;
  field: ActivityFilterableField;
  operator: FilterOperator;
  value?: string | number | boolean | string[];
};

type FilterGroup = {
  logic: FilterGroupLogic;
  conditions: FilterCondition[];
};

type Activity = {
  id: string;
  title?: string;
  type?: string;
  status: string;
  tags?: string[];
  goalId?: string | null;
  arcId?: string | null;
  priority?: number | null;
  difficulty?: string | null;
  scheduledDate?: string | null;
  scheduledAt?: string | null;
  actualMinutes?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  notes?: string | null;
};

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  kind: TemplateKind;
  cadence: Cadence;
  timezone: string;
  filter_json: unknown;
  filter_group_logic: FilterGroupLogic;
  email_enabled: boolean;
  email_recipient: string | null;
  detail_level: string | null;
  tone: string | null;
  enabled: boolean;
};

type Period = { start: DateTime; end: DateTime; key: string };

function safeJson<T>(v: unknown, fallback: T): T {
  try {
    if (v === null || v === undefined) return fallback;
    // supabase-js returns jsonb as object already; but some callers may pass string.
    if (typeof v === 'string') return (JSON.parse(v) as T) ?? fallback;
    return v as T;
  } catch {
    return fallback;
  }
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function clampText(raw: unknown, maxLen: number): string {
  const s = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

function validZoneOrUtc(zoneRaw: unknown): string {
  const z = typeof zoneRaw === 'string' ? zoneRaw.trim() : '';
  if (!z) return 'UTC';
  const dt = DateTime.now().setZone(z);
  return dt.isValid ? z : 'UTC';
}

function lastCompletePeriod(params: { cadence: Cadence; timezone: string; now?: DateTime }): Period | null {
  const tz = validZoneOrUtc(params.timezone);
  const now = (params.now ?? DateTime.now()).setZone(tz);

  if (params.cadence === 'manual') {
    return null;
  }

  if (params.cadence === 'weekly') {
    // ISO week: Monday (1) .. Sunday (7)
    const currentWeekStart = DateTime.fromObject(
      { weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: tz }
    );
    const start = currentWeekStart.minus({ weeks: 1 });
    const end = currentWeekStart;
    const key = `${start.weekYear}-W${String(start.weekNumber).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'monthly') {
    const currentMonthStart = now.startOf('month');
    const start = currentMonthStart.minus({ months: 1 });
    const end = currentMonthStart;
    const key = `${start.year}-${String(start.month).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'yearly') {
    const currentYearStart = now.startOf('year');
    const start = currentYearStart.minus({ years: 1 });
    const end = currentYearStart;
    const key = `${start.year}`;
    return { start, end, key };
  }

  return null;
}

function nthCompletePeriod(params: { cadence: Cadence; timezone: string; offset: number; now?: DateTime }): Period | null {
  const off = Math.max(0, Math.floor(params.offset ?? 0));
  const tz = validZoneOrUtc(params.timezone);
  const now = (params.now ?? DateTime.now()).setZone(tz);

  if (params.cadence === 'manual') {
    return null;
  }

  if (params.cadence === 'weekly') {
    const currentWeekStart = DateTime.fromObject(
      { weekYear: now.weekYear, weekNumber: now.weekNumber, weekday: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: tz }
    );
    const end = currentWeekStart.minus({ weeks: off });
    const start = currentWeekStart.minus({ weeks: off + 1 });
    const key = `${start.weekYear}-W${String(start.weekNumber).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'monthly') {
    const currentMonthStart = now.startOf('month');
    const end = currentMonthStart.minus({ months: off });
    const start = currentMonthStart.minus({ months: off + 1 });
    const key = `${start.year}-${String(start.month).padStart(2, '0')}`;
    return { start, end, key };
  }

  if (params.cadence === 'yearly') {
    const currentYearStart = now.startOf('year');
    const end = currentYearStart.minus({ years: off });
    const start = currentYearStart.minus({ years: off + 1 });
    const key = `${start.year}`;
    return { start, end, key };
  }

  return null;
}

function parseManualRange(params: {
  timezone: string;
  startDate: string; // YYYY-MM-DD (or any ISO date)
  endDate: string; // YYYY-MM-DD (exclusive end)
}): Period | null {
  const tz = validZoneOrUtc(params.timezone);
  const startRaw = DateTime.fromISO(params.startDate, { zone: tz });
  const endRaw = DateTime.fromISO(params.endDate, { zone: tz });
  if (!startRaw.isValid || !endRaw.isValid) return null;
  const start = startRaw.startOf('day');
  const end = endRaw.startOf('day');
  if (end <= start) return null;

  // Allow selecting "through today" by using end=tomorrow (exclusive).
  const now = DateTime.now().setZone(tz);
  const latestAllowedEnd = now.startOf('day').plus({ days: 1 });
  if (end > latestAllowedEnd.plus({ minutes: 5 })) return null;

  const days = Math.ceil(end.diff(start, 'days').days);
  if (!Number.isFinite(days) || days <= 0 || days > 365) return null;

  const key = `${start.toFormat('yyyyLLdd')}_${end.toFormat('yyyyLLdd')}`;
  return { start, end, key };
}

function pickActivityTimeIso(a: Activity): string | null {
  const candidates = [a.completedAt, a.startedAt, a.updatedAt, a.createdAt]
    .map((s) => (typeof s === 'string' ? s : null))
    .filter(Boolean) as string[];
  return candidates.length > 0 ? candidates[0] : null;
}

function isIsoWithin(iso: string | null, start: DateTime, end: DateTime): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  // Treat ISO timestamps as absolute instants; compare to period instants.
  return ms >= start.toMillis() && ms < end.toMillis();
}

function parseIsoMs(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function toLocalDateKey(iso: string | null, tz: string): string | null {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (!dt.isValid) return null;
  return dt.toISODate(); // YYYY-MM-DD
}

function isDoneStatus(statusRaw: unknown): boolean {
  const s = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : '';
  return s === 'done';
}

function matchesCondition(activity: Activity, condition: FilterCondition): boolean {
  const { field, operator, value } = condition;
  const activityValue = (activity as any)[field];

  switch (operator) {
    case 'eq':
      return activityValue === value;
    case 'neq':
      return activityValue !== value;
    case 'contains': {
      if (value === undefined || value === null || value === '') return false;
      if (typeof activityValue === 'string') {
        return activityValue.toLowerCase().includes(String(value).toLowerCase());
      }
      if (Array.isArray(activityValue)) {
        return activityValue.some((v) => String(v).toLowerCase().includes(String(value).toLowerCase()));
      }
      return false;
    }
    case 'gt':
      return activityValue > value;
    case 'lt':
      return activityValue < value;
    case 'gte':
      return activityValue >= value;
    case 'lte':
      return activityValue <= value;
    case 'exists':
      return activityValue !== null && activityValue !== undefined && activityValue !== '';
    case 'nexists':
      return activityValue === null || activityValue === undefined || activityValue === '';
    case 'in':
      if (Array.isArray(value)) {
        if (Array.isArray(activityValue)) return activityValue.some((v) => value.includes(v));
        return value.includes(activityValue);
      }
      return false;
    default:
      return false;
  }
}

function applyActivityFilters(activities: Activity[], groups: FilterGroup[], groupLogic: FilterGroupLogic): Activity[] {
  if (!groups || groups.length === 0) return activities;

  return activities.filter((activity) => {
    const matchesGroup = (group: FilterGroup): boolean => {
      const { logic, conditions } = group;
      if (!conditions || conditions.length === 0) return true;
      return logic === 'and'
        ? conditions.every((c) => matchesCondition(activity, c))
        : conditions.some((c) => matchesCondition(activity, c));
    };

    return groupLogic === 'and' ? groups.every(matchesGroup) : groups.some(matchesGroup);
  });
}

function computeStats(params: { activitiesIncluded: Activity[] }) {
  const { activitiesIncluded } = params;
  const totalMinutes = activitiesIncluded.reduce(
    (acc, a) => acc + (typeof a.actualMinutes === 'number' ? a.actualMinutes : 0),
    0,
  );
  const topTags: Record<string, number> = {};
  for (const a of activitiesIncluded) {
    for (const t of Array.isArray(a.tags) ? a.tags : []) {
      const key = String(t).trim();
      if (!key) continue;
      topTags[key] = (topTags[key] ?? 0) + 1;
    }
  }
  const topTagList = Object.entries(topTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  return { totalMinutes, topTags: topTagList };
}

function extractNotesSnippet(activity: Activity): string | null {
  const raw = typeof activity.notes === 'string' ? activity.notes.trim() : '';
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}…` : cleaned;
}

function computeStepsSummary(activity: Activity): { completed: number; total: number } | null {
  const steps = Array.isArray((activity as any).steps) ? (activity as any).steps : null;
  if (!steps) return null;
  const total = steps.length;
  if (total === 0) return null;
  const completed = steps.filter((s: any) => s && typeof s === 'object' && Boolean(s.completedAt)).length;
  return { completed, total };
}

function computeHighlights(activities: Activity[], maxItems: number) {
  const candidates = activities.map((a) => {
    const minutes = typeof a.actualMinutes === 'number' ? a.actualMinutes : 0;
    const completedAt = typeof a.completedAt === 'string' ? Date.parse(a.completedAt) : 0;
    return { activity: a, minutes, completedAt };
  });
  candidates.sort((a, b) => {
    if (b.minutes !== a.minutes) return b.minutes - a.minutes;
    return b.completedAt - a.completedAt;
  });
  return candidates.slice(0, maxItems).map(({ activity, minutes }) => {
    const steps = computeStepsSummary(activity);
    return {
      id: activity.id,
      title: clampText(activity.title ?? '', 120),
      notesSnippet: extractNotesSnippet(activity),
      goalId: activity.goalId ?? null,
      arcId: activity.arcId ?? null,
      status: activity.status ?? null,
      tags: Array.isArray(activity.tags) ? activity.tags.slice(0, 8) : [],
      actualMinutes: minutes || null,
      completedAt: activity.completedAt ?? null,
      stepsCompleted: steps?.completed ?? null,
      stepsTotal: steps?.total ?? null,
    };
  });
}

function buildGoalProgress(params: { activities: Activity[]; goalById: Record<string, any> }) {
  const { activities, goalById } = params;
  const byGoal: Record<string, any> = {};
  for (const a of activities) {
    const goalId = a.goalId ?? null;
    if (!goalId) continue;
    const entry = byGoal[goalId] ?? {
      goalId,
      title: goalById[goalId]?.title ?? null,
      description: goalById[goalId]?.description ?? null,
      activityCount: 0,
      doneCount: 0,
      totalMinutes: 0,
      stepsCompleted: 0,
      stepsTotal: 0,
      topTags: {} as Record<string, number>,
    };
    entry.activityCount += 1;
    if (a.status === 'done') entry.doneCount += 1;
    if (typeof a.actualMinutes === 'number') entry.totalMinutes += a.actualMinutes;
    const steps = computeStepsSummary(a);
    if (steps) {
      entry.stepsCompleted += steps.completed;
      entry.stepsTotal += steps.total;
    }
    for (const t of Array.isArray(a.tags) ? a.tags : []) {
      const key = String(t).trim();
      if (!key) continue;
      entry.topTags[key] = (entry.topTags[key] ?? 0) + 1;
    }
    byGoal[goalId] = entry;
  }
  return Object.values(byGoal).map((entry: any) => ({
    goalId: entry.goalId,
    title: entry.title,
    description: entry.description,
    activityCount: entry.activityCount,
    doneCount: entry.doneCount,
    totalMinutes: entry.totalMinutes,
    stepsCompleted: entry.stepsCompleted || null,
    stepsTotal: entry.stepsTotal || null,
    topTags: Object.entries(entry.topTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count })),
  }));
}

function buildArcProgress(params: { activities: Activity[]; arcById: Record<string, any> }) {
  const { activities, arcById } = params;
  const byArc: Record<string, any> = {};
  for (const a of activities) {
    const arcId = a.arcId ?? null;
    if (!arcId) continue;
    const entry = byArc[arcId] ?? {
      arcId,
      title: arcById[arcId]?.title ?? null,
      narrative: arcById[arcId]?.narrative ?? null,
      activityCount: 0,
      doneCount: 0,
      totalMinutes: 0,
    };
    entry.activityCount += 1;
    if (a.status === 'done') entry.doneCount += 1;
    if (typeof a.actualMinutes === 'number') entry.totalMinutes += a.actualMinutes;
    byArc[arcId] = entry;
  }
  return Object.values(byArc);
}

function buildBaseOutputJson(params: {
  template: TemplateRow;
  period: Period;
  activitiesInPeriod: Activity[];
  activitiesIncluded: Activity[];
}) {
  const { template, period, activitiesInPeriod, activitiesIncluded } = params;

  const { totalMinutes, topTags } = computeStats({ activitiesIncluded });

  const title = template.kind === 'report' ? 'Report' : 'Reflection';
  const subtitle =
    template.cadence === 'weekly'
      ? `Week ${period.key}`
      : template.cadence === 'monthly'
        ? `Month ${period.key}`
        : `Year ${period.key}`;

  return {
    title: `${title}: ${subtitle}`,
    template: { id: template.id, name: template.name, kind: template.kind, cadence: template.cadence },
    period: {
      key: period.key,
      start: period.start.toISO(),
      end: period.end.toISO(),
      timezone: validZoneOrUtc(template.timezone),
    },
    stats: {
      activitiesInPeriod: activitiesInPeriod.length,
      activitiesIncluded: activitiesIncluded.length,
      totalMinutes,
      topTags,
    },
    evidence: {
      highlights: [],
      touchedGoalIds: [],
      untouchedGoalIds: [],
      touchedArcIds: [],
      untouchedArcIds: [],
      goalProgress: [],
      arcProgress: [],
    },
    // Keep section order stable even in placeholder output.
    sections: {
      story: { markdown: '' },
      whereTimeWent: { items: [] },
      forces: { items: [] },
      highlights: { items: [] },
      patterns: { items: [] },
      nextExperiments: { items: [] },
    },
  };
}

type ChapterMetrics = {
  timezone: string;
  period_days: number;
  activities: {
    created_count: number;
    completed_count: number;
    completed_via_updated_at_count: number;
    started_not_completed_count: number;
    carried_forward_count: number;
    touched_count?: number;
  };
  goals: Array<{
    goal_id: string;
    goal_title: string | null;
    goal_description: string | null;
    completed_count: number;
    in_progress_count: number;
    created_count: number;
    first_activity_at: string | null;
    last_activity_at: string | null;
    touched_days_count: number;
  }>;
  arcs: Array<{
    arc_id: string;
    arc_title: string | null;
    arc_description: string | null;
    activity_count_total: number;
    completed_count: number;
    goals_advanced_count: number;
    active_days_count: number;
    first_activity_at: string | null;
    last_activity_at: string | null;
  }>;
  time_shape: {
    active_days_count: number;
    longest_active_streak_days: number;
  };
  /**
   * Phase 4-backend of docs/chapters-plan.md — passive HealthKit
   * signal. Present only when the week crosses the inclusion floor
   * defined in `_shared/chapterHealth.ts`. Absent (undefined) for
   * low-signal weeks, Chapters generated before Phase 4 ships, and
   * users who never granted HealthKit permission. The prompt surfaces
   * this field in the `metrics` object so the LLM MAY (not MUST)
   * weave a single short health line into `story.body` or
   * `signal.caption`; the validator rejects health prose when this
   * field is absent.
   */
  health?: ChapterHealthBlock;
};

type NoteworthyExample = {
  activity_id: string;
  title: string;
  status: string | null;
  arc_id: string | null;
  goal_id: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reasons: string[];
};

function computeTimeShape(params: { activities: Activity[]; period: Period; timezone: string }) {
  const { activities, period, timezone } = params;
  const activeDays = new Set<string>();
  for (const a of activities) {
    const candidates = [a.createdAt, a.startedAt, a.completedAt, a.updatedAt].filter(
      (s): s is string => typeof s === 'string' && Boolean(s),
    );
    for (const iso of candidates) {
      if (!isIsoWithin(iso, period.start, period.end)) continue;
      const dk = toLocalDateKey(iso, timezone);
      if (dk) activeDays.add(dk);
    }
  }
  const daysSorted = Array.from(activeDays).sort();
  let longest = 0;
  let current = 0;
  let prevMs: number | null = null;
  for (const dk of daysSorted) {
    const dt = DateTime.fromISO(dk, { zone: timezone }).startOf('day');
    if (!dt.isValid) continue;
    const ms = dt.toMillis();
    if (prevMs == null) {
      current = 1;
    } else {
      const diffDays = Math.round((ms - prevMs) / (24 * 60 * 60 * 1000));
      current = diffDays === 1 ? current + 1 : 1;
    }
    prevMs = ms;
    if (current > longest) longest = current;
  }
  return { active_days_count: activeDays.size, longest_active_streak_days: longest };
}

function computeNoteworthyExamples(params: {
  activitiesAll: Activity[];
  activitiesIncluded: Activity[];
  period: Period;
  timezone: string;
}): NoteworthyExample[] {
  const { activitiesAll, activitiesIncluded, period, timezone } = params;

  const days = Math.ceil(period.end.diff(period.start, 'days').days);
  const cap = days <= 14 ? 5 : 10;

  const byId = new Map<string, NoteworthyExample & { score: number; tiebreakMs: number }>();
  const add = (a: Activity, reason: string, score: number, tiebreakIso: string | null) => {
    const id = String(a.id);
    const existing = byId.get(id);
    const tiebreakMs = tiebreakIso ? Date.parse(tiebreakIso) : 0;
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      existing.score = Math.max(existing.score, score);
      existing.tiebreakMs = Math.max(existing.tiebreakMs, tiebreakMs);
      byId.set(id, existing);
      return;
    }
    byId.set(id, {
      activity_id: id,
      title: clampText(a.title ?? '', 140),
      status: typeof a.status === 'string' ? a.status : null,
      arc_id: a.arcId ?? null,
      goal_id: a.goalId ?? null,
      created_at: typeof a.createdAt === 'string' ? a.createdAt : null,
      started_at: typeof a.startedAt === 'string' ? a.startedAt : null,
      completed_at: typeof a.completedAt === 'string' ? a.completedAt : null,
      reasons: [reason],
      score,
      tiebreakMs,
    });
  };

  // Prior completions by goal (ever before period start).
  const hadPriorCompletionByGoal = new Set<string>();
  for (const a of activitiesAll) {
    const goalId = a.goalId ?? null;
    if (!goalId) continue;
    const ms = parseIsoMs(a.completedAt);
    if (ms != null && ms < period.start.toMillis()) hadPriorCompletionByGoal.add(goalId);
  }

  // First completion in period per goal.
  const firstCompletionInPeriodByGoal = new Map<string, Activity>();
  for (const a of activitiesIncluded) {
    const goalId = a.goalId ?? null;
    if (!goalId) continue;
    if (!isIsoWithin(a.completedAt ?? null, period.start, period.end)) continue;
    const ms = parseIsoMs(a.completedAt);
    if (ms == null) continue;
    const cur = firstCompletionInPeriodByGoal.get(goalId);
    const curMs = cur ? parseIsoMs(cur.completedAt) : null;
    if (!cur || (curMs != null && ms < curMs) || curMs == null) {
      firstCompletionInPeriodByGoal.set(goalId, a);
    }
  }
  for (const [goalId, a] of firstCompletionInPeriodByGoal.entries()) {
    const reason = hadPriorCompletionByGoal.has(goalId) ? 'first_completion_for_goal_in_period' : 'first_completion_for_goal_ever';
    add(a, reason, 90, a.completedAt ?? null);
  }

  // Long-running completed: started before period, completed in period.
  for (const a of activitiesIncluded) {
    if (!a.startedAt || !a.completedAt) continue;
    const startedMs = parseIsoMs(a.startedAt);
    const completedMs = parseIsoMs(a.completedAt);
    if (startedMs == null || completedMs == null) continue;
    if (startedMs < period.start.toMillis() && completedMs >= period.start.toMillis() && completedMs < period.end.toMillis()) {
      add(a, 'long_running_completed', 80, a.completedAt);
    }
  }

  // First activity in arc in period (arc had no prior signal).
  const hadPriorArcSignal = new Set<string>();
  for (const a of activitiesAll) {
    const arcId = a.arcId ?? null;
    if (!arcId) continue;
    const ms = parseIsoMs(pickActivityTimeIso(a));
    if (ms != null && ms < period.start.toMillis()) hadPriorArcSignal.add(arcId);
  }
  const firstArcActivityInPeriod = new Map<string, Activity>();
  for (const a of activitiesIncluded) {
    const arcId = a.arcId ?? null;
    if (!arcId) continue;
    const iso = pickActivityTimeIso(a);
    if (!isIsoWithin(iso, period.start, period.end)) continue;
    const ms = parseIsoMs(iso);
    if (ms == null) continue;
    const cur = firstArcActivityInPeriod.get(arcId);
    const curMs = cur ? parseIsoMs(pickActivityTimeIso(cur)) : null;
    if (!cur || (curMs != null && ms < curMs) || curMs == null) firstArcActivityInPeriod.set(arcId, a);
  }
  for (const [arcId, a] of firstArcActivityInPeriod.entries()) {
    if (hadPriorArcSignal.has(arcId)) continue;
    add(a, 'first_activity_in_arc_in_period', 70, pickActivityTimeIso(a));
  }

  // High-effort proxy: top actualMinutes.
  const effortSorted = activitiesIncluded
    .map((a) => ({ a, m: typeof a.actualMinutes === 'number' ? a.actualMinutes : 0 }))
    .filter((x) => x.m > 0)
    .sort((x, y) => y.m - x.m)
    .slice(0, 3);
  for (const { a } of effortSorted) {
    add(a, 'high_effort_proxy', 60, pickActivityTimeIso(a));
  }

  // User marked important: tags includes "important".
  for (const a of activitiesIncluded) {
    const tags = Array.isArray(a.tags) ? a.tags : [];
    if (tags.some((t) => String(t).trim().toLowerCase() === 'important')) {
      add(a, 'user_marked_important', 65, pickActivityTimeIso(a));
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.tiebreakMs - a.tiebreakMs;
    })
    .slice(0, cap)
    .map(({ score: _s, tiebreakMs: _t, ...rest }) => rest);
}

function buildStoryHooks(params: {
  metrics: ChapterMetrics;
  noteworthy_examples: NoteworthyExample[];
}): Array<{
  hook_id: string;
  title: string;
  why_this_matters: string;
  supporting_metrics: Record<string, number>;
  supporting_activity_ids: string[];
}> {
  const { metrics, noteworthy_examples } = params;
  const hooks: Array<{
    hook_id: string;
    title: string;
    why_this_matters: string;
    supporting_metrics: Record<string, number>;
    supporting_activity_ids: string[];
    score: number;
  }> = [];

  const a = metrics.activities;
  const activeDays = metrics.time_shape.active_days_count;
  const streak = metrics.time_shape.longest_active_streak_days;

  // 1) Backlog vs throughput (carry-forward heavy periods feel "tense" and storyful)
  if (typeof a?.carried_forward_count === 'number' && typeof a?.completed_count === 'number') {
    const ratio = a.completed_count > 0 ? a.carried_forward_count / a.completed_count : a.carried_forward_count;
    hooks.push({
      hook_id: 'backlog_pressure',
      title: 'Backlog pressure met sustained follow-through',
      why_this_matters: 'A large carry-forward load changes the feel of a period; progress becomes a story of triage and follow-through.',
      supporting_metrics: {
        carried_forward_count: a.carried_forward_count,
        completed_count: a.completed_count,
        created_count: typeof a?.created_count === 'number' ? a.created_count : 0,
        active_days_count: activeDays,
      },
      supporting_activity_ids: noteworthy_examples.slice(0, 4).map((e) => e.activity_id),
      score: Math.min(100, Math.round(ratio * 25) + a.carried_forward_count / 2),
    });
  }

  // 2) Streak story
  if (typeof streak === 'number' && typeof activeDays === 'number' && activeDays > 0) {
    const consistency = streak / Math.max(1, activeDays);
    hooks.push({
      hook_id: 'consistency_streak',
      title: 'A streak shaped the week',
      why_this_matters: 'Consistency creates momentum; a streak is a concrete signature of repeatable follow-through.',
      supporting_metrics: { active_days_count: activeDays, longest_active_streak_days: streak },
      supporting_activity_ids: noteworthy_examples.slice(0, 3).map((e) => e.activity_id),
      score: Math.round(consistency * 85),
    });
  }

  // 3) Firsts + long-runners (turning points)
  const firsts = noteworthy_examples.filter((e) => e.reasons.some((r) => r.includes('first_completion')));
  const longRunners = noteworthy_examples.filter((e) => e.reasons.includes('long_running_completed'));
  if (firsts.length + longRunners.length > 0) {
    hooks.push({
      hook_id: 'turning_points',
      title: 'Turning points: firsts and long-runners crossing the line',
      why_this_matters: 'First completions and long-running finishes are natural narrative pivots: they mark a shift from setup to payoff.',
      supporting_metrics: {
        completed_count: typeof a?.completed_count === 'number' ? a.completed_count : 0,
        created_count: typeof a?.created_count === 'number' ? a.created_count : 0,
      },
      supporting_activity_ids: [...firsts, ...longRunners].slice(0, 6).map((e) => e.activity_id),
      score: Math.min(100, (firsts.length * 20) + (longRunners.length * 18)),
    });
  }

  // Fallback: use effort proxy / important-tag examples
  if (hooks.length === 0) {
    const important = noteworthy_examples.filter((e) => e.reasons.includes('user_marked_important'));
    hooks.push({
      hook_id: 'spotlight',
      title: 'The week’s spotlight items',
      why_this_matters: 'When the signal is diffuse, the story lives in the items you implicitly elevated.',
      supporting_metrics: {
        completed_count: typeof a?.completed_count === 'number' ? a.completed_count : 0,
        active_days_count: activeDays,
      },
      supporting_activity_ids: (important.length > 0 ? important : noteworthy_examples).slice(0, 5).map((e) => e.activity_id),
      score: 10,
    });
  }

  return hooks
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map(({ score: _s, ...rest }) => rest);
}

function computeDeterministicMetrics(params: {
  template: TemplateRow;
  period: Period;
  activitiesAll: Activity[];
  activitiesIncluded: Activity[];
  arcById: Record<string, any>;
  goalById: Record<string, any>;
  /**
   * Phase 4-backend of docs/chapters-plan.md — pre-queried rows from
   * `kwilt_health_daily` that intersect the period window. Already
   * filtered on the client by `(user_id, local_date)`; this function
   * passes them to `computeChapterHealthBlock` which enforces the
   * inclusion floor and shapes the block. Omit or pass `null` when
   * the user hasn't granted HealthKit or when the window has no rows
   * — the metrics block will simply not carry a `health` field, and
   * every downstream consumer (prompt, validator) treats that as
   * "no health signal this week."
   */
  healthDaily?: HealthDailyRow[] | null;
}): { metrics: ChapterMetrics; noteworthy_examples: NoteworthyExample[] } {
  const { template, period, activitiesAll, activitiesIncluded, arcById, goalById, healthDaily } = params;
  const tz = validZoneOrUtc(template.timezone);
  const startMs = period.start.toMillis();
  const endMs = period.end.toMillis();
  const periodDays = Math.ceil(period.end.diff(period.start, 'days').days);

  let createdCount = 0;
  let completedCount = 0;
  let completedViaUpdatedAtCount = 0;
  let startedNotCompletedCount = 0;
  let carriedForwardCount = 0;
  let touchedCount = 0;

  const activityTouchesByGoalDay: Record<string, Set<string>> = {};
  const activityTouchesByArcDay: Record<string, Set<string>> = {};

  const registerTouch = (kind: 'goal' | 'arc', id: string, iso: string) => {
    const dk = toLocalDateKey(iso, tz);
    if (!dk) return;
    if (kind === 'goal') {
      activityTouchesByGoalDay[id] ??= new Set<string>();
      activityTouchesByGoalDay[id].add(dk);
    } else {
      activityTouchesByArcDay[id] ??= new Set<string>();
      activityTouchesByArcDay[id].add(dk);
    }
  };

  const completionMsOf = (a: Activity): number | null => {
    const ms = parseIsoMs(a.completedAt);
    if (ms != null) return ms;
    // Fallback: if status is done, and updatedAt exists, treat that as completion timestamp.
    if (isDoneStatus(a.status)) {
      const um = parseIsoMs(a.updatedAt);
      if (um != null) return um;
    }
    return null;
  };

  const creationMsOf = (a: Activity): number | null => {
    return parseIsoMs(a.createdAt) ?? parseIsoMs(a.startedAt) ?? parseIsoMs(a.updatedAt) ?? parseIsoMs(a.completedAt);
  };

  for (const a of activitiesIncluded) {
    const createdMs = parseIsoMs(a.createdAt);
    const startedMs = parseIsoMs(a.startedAt);
    const completedMs = parseIsoMs(a.completedAt);
    const updatedMs = parseIsoMs(a.updatedAt);
    const completionMs = completionMsOf(a);
    const creationMs = creationMsOf(a);

    const createdIn = createdMs != null && createdMs >= startMs && createdMs < endMs;
    const completedIn =
      (completedMs != null && completedMs >= startMs && completedMs < endMs) ||
      (completedMs == null && isDoneStatus(a.status) && updatedMs != null && updatedMs >= startMs && updatedMs < endMs);
    const completedViaUpdatedAt = completedMs == null && isDoneStatus(a.status) && updatedMs != null && updatedMs >= startMs && updatedMs < endMs;
    const startedIn = startedMs != null && startedMs >= startMs && startedMs < endMs;

    const completedWithinPeriod = completionMs != null && completionMs >= startMs && completionMs < endMs;
    const completedBeforeStart = completionMs != null && completionMs < startMs;
    const carriedForward =
      (creationMs != null && creationMs < startMs) &&
      !completedBeforeStart;

    const touchedIn =
      (createdMs != null && createdMs >= startMs && createdMs < endMs) ||
      (startedMs != null && startedMs >= startMs && startedMs < endMs) ||
      (completedMs != null && completedMs >= startMs && completedMs < endMs) ||
      (updatedMs != null && updatedMs >= startMs && updatedMs < endMs);

    if (createdIn) createdCount += 1;
    if (completedIn) completedCount += 1;
    if (completedViaUpdatedAt) completedViaUpdatedAtCount += 1;
    if (carriedForward) carriedForwardCount += 1;
    if (touchedIn) touchedCount += 1;

    if (startedIn && !completedWithinPeriod && !isDoneStatus(a.status)) {
      startedNotCompletedCount += 1;
    }

    const signals = [a.createdAt, a.startedAt, a.completedAt, a.updatedAt].filter(
      (s): s is string => typeof s === 'string' && Boolean(s),
    );
    for (const iso of signals) {
      if (!isIsoWithin(iso, period.start, period.end)) continue;
      const goalId = a.goalId ?? null;
      const arcId = a.arcId ?? null;
      if (goalId) registerTouch('goal', goalId, iso);
      if (arcId) registerTouch('arc', arcId, iso);
    }
  }

  // Per-goal aggregates
  const perGoal: Record<string, any> = {};
  for (const a of activitiesIncluded) {
    const goalId = a.goalId ?? null;
    if (!goalId) continue;
    const entry = perGoal[goalId] ?? {
      goal_id: goalId,
      goal_title: goalById[goalId]?.title ?? null,
      goal_description: goalById[goalId]?.description ?? null,
      completed_count: 0,
      in_progress_count: 0,
      created_count: 0,
      first_activity_at_ms: null as number | null,
      last_activity_at_ms: null as number | null,
    };

    const createdMs = parseIsoMs(a.createdAt);
    const completionMs = completionMsOf(a);
    const touchMs = parseIsoMs(pickActivityTimeIso(a));

    if (createdMs != null && createdMs >= startMs && createdMs < endMs) entry.created_count += 1;
    if (completionMs != null && completionMs >= startMs && completionMs < endMs) entry.completed_count += 1;
    if (!isDoneStatus(a.status)) entry.in_progress_count += 1;

    const tms = touchMs;
    if (tms != null && tms >= startMs && tms < endMs) {
      entry.first_activity_at_ms = entry.first_activity_at_ms == null ? tms : Math.min(entry.first_activity_at_ms, tms);
      entry.last_activity_at_ms = entry.last_activity_at_ms == null ? tms : Math.max(entry.last_activity_at_ms, tms);
    }
    perGoal[goalId] = entry;
  }

  const goals = Object.values(perGoal).map((g: any) => ({
    goal_id: g.goal_id,
    goal_title: g.goal_title,
    goal_description: g.goal_description,
    completed_count: g.completed_count,
    in_progress_count: g.in_progress_count,
    created_count: g.created_count,
    first_activity_at: typeof g.first_activity_at_ms === 'number' ? new Date(g.first_activity_at_ms).toISOString() : null,
    last_activity_at: typeof g.last_activity_at_ms === 'number' ? new Date(g.last_activity_at_ms).toISOString() : null,
    touched_days_count: activityTouchesByGoalDay[g.goal_id]?.size ?? 0,
  }));

  // Per-arc aggregates
  const perArc: Record<string, any> = {};
  const goalsAdvancedByArc: Record<string, Set<string>> = {};
  for (const a of activitiesIncluded) {
    const arcId = a.arcId ?? null;
    if (!arcId) continue;
    const entry = perArc[arcId] ?? {
      arc_id: arcId,
      arc_title: arcById[arcId]?.title ?? null,
      arc_description: arcById[arcId]?.narrative ?? arcById[arcId]?.description ?? null,
      activity_count_total: 0,
      completed_count: 0,
      first_activity_at_ms: null as number | null,
      last_activity_at_ms: null as number | null,
    };
    entry.activity_count_total += 1;
    const completionMs = completionMsOf(a);
    if (completionMs != null && completionMs >= startMs && completionMs < endMs) {
      entry.completed_count += 1;
      const goalId = a.goalId ?? null;
      if (goalId) {
        goalsAdvancedByArc[arcId] ??= new Set<string>();
        goalsAdvancedByArc[arcId].add(goalId);
      }
    }
    const tms = parseIsoMs(pickActivityTimeIso(a));
    if (tms != null && tms >= startMs && tms < endMs) {
      entry.first_activity_at_ms = entry.first_activity_at_ms == null ? tms : Math.min(entry.first_activity_at_ms, tms);
      entry.last_activity_at_ms = entry.last_activity_at_ms == null ? tms : Math.max(entry.last_activity_at_ms, tms);
    }
    perArc[arcId] = entry;
  }

  const arcs = Object.values(perArc).map((a: any) => ({
    arc_id: a.arc_id,
    arc_title: a.arc_title,
    arc_description: a.arc_description,
    activity_count_total: a.activity_count_total,
    completed_count: a.completed_count,
    goals_advanced_count: goalsAdvancedByArc[a.arc_id]?.size ?? 0,
    active_days_count: activityTouchesByArcDay[a.arc_id]?.size ?? 0,
    first_activity_at: typeof a.first_activity_at_ms === 'number' ? new Date(a.first_activity_at_ms).toISOString() : null,
    last_activity_at: typeof a.last_activity_at_ms === 'number' ? new Date(a.last_activity_at_ms).toISOString() : null,
  }));

  const timeShape = computeTimeShape({ activities: activitiesIncluded, period, timezone: tz });
  const noteworthy_examples = computeNoteworthyExamples({
    activitiesAll,
    activitiesIncluded,
    period,
    timezone: tz,
  });

  const metrics: ChapterMetrics = {
    timezone: tz,
    period_days: periodDays,
    activities: {
      created_count: createdCount,
      completed_count: completedCount,
      completed_via_updated_at_count: completedViaUpdatedAtCount,
      started_not_completed_count: startedNotCompletedCount,
      carried_forward_count: carriedForwardCount,
      touched_count: touchedCount,
    },
    goals: goals
      .sort((a, b) => b.completed_count - a.completed_count || b.in_progress_count - a.in_progress_count)
      .slice(0, 60),
    arcs: arcs
      .sort((a, b) => b.activity_count_total - a.activity_count_total || b.completed_count - a.completed_count)
      .slice(0, 60),
    time_shape: timeShape,
  };

  // Phase 4-backend: attach the passive HealthKit block if the week
  // passes the inclusion floor. `computeChapterHealthBlock` returns
  // null for low-signal weeks; in that case we omit the `health` key
  // entirely so the prompt's `metrics` object reads identically to
  // pre-Phase-4 Chapters and legacy chapters continue to serialize
  // unchanged.
  const healthBlock = computeChapterHealthBlock(healthDaily ?? null);
  if (healthBlock) {
    metrics.health = healthBlock;
  }

  return { metrics, noteworthy_examples };
}

/**
 * Phase 3.2 (docs/chapters-plan.md): attach a `delta` block to each
 * arc in `metrics.arcs[]` so the LLM can cite week-over-week changes and the
 * client detail screen can render arc lanes.
 *
 * Deltas are computed against a single prior weekly chapter's arc snapshot
 * (see `PriorChapterArc`). We match on `arc_id` when present, falling back to
 * case-insensitive title match for historical rows where the prior snapshot
 * may be missing ids. When no prior exists for an arc we tag `new_or_first`
 * and leave numeric deltas null so the UI can render the lane without a
 * delta line. Mutates the `metrics.arcs` entries in place.
 */
function augmentArcsWithDeltas(
  metrics: ChapterMetrics,
  priorArcs: PriorChapterArc[] | null | undefined,
): void {
  const priorById = new Map<string, PriorChapterArc>();
  const priorByTitleLc = new Map<string, PriorChapterArc>();
  if (Array.isArray(priorArcs)) {
    for (const pa of priorArcs) {
      if (pa.arc_id) priorById.set(pa.arc_id, pa);
      if (pa.arc_title) priorByTitleLc.set(pa.arc_title.toLowerCase(), pa);
    }
  }

  for (const arc of metrics.arcs as any[]) {
    const id = typeof arc?.arc_id === 'string' ? arc.arc_id : null;
    const title = typeof arc?.arc_title === 'string' ? arc.arc_title : null;
    const prior =
      (id ? priorById.get(id) : null) ??
      (title ? priorByTitleLc.get(title.toLowerCase()) : null) ??
      null;

    if (!prior) {
      arc.delta = {
        completed_delta: null,
        active_days_delta: null,
        activity_count_delta: null,
        new_or_first: true,
      };
      continue;
    }

    const completedNow = typeof arc.completed_count === 'number' ? arc.completed_count : 0;
    const completedPrior = typeof prior.completed_count === 'number' ? prior.completed_count : 0;
    const activeNow = typeof arc.active_days_count === 'number' ? arc.active_days_count : 0;
    const activePrior = typeof prior.active_days_count === 'number' ? prior.active_days_count : 0;
    const totalNow = typeof arc.activity_count_total === 'number' ? arc.activity_count_total : 0;
    const totalPrior = typeof prior.activity_count_total === 'number' ? prior.activity_count_total : 0;

    arc.delta = {
      completed_delta: completedNow - completedPrior,
      active_days_delta: activeNow - activePrior,
      activity_count_delta: totalNow - totalPrior,
      new_or_first: false,
    };
  }
}

function resolveChaptersModel(): string {
  const raw = (Deno.env.get('KWILT_CHAPTERS_MODEL') ?? '').trim();
  // gpt-4o-mini defaults to corporate-safe phrasing that fights our
  // investigative-reporter voice. gpt-4o produces clearly better prose for
  // this prompt shape; the cadence is weekly/monthly so cost is negligible.
  return raw || 'gpt-4o';
}

// Words / phrases the prompt already bans. We also enforce them in the
// validator so a model slip doesn't ship.
const BANNED_DEK_WORDS = [
  'meaningful',
  'remarkable',
  'meaningfully',
  'growth',
  'balance',
  'journey',
  'harnessing',
];

const BANNED_DEK_PHRASES = [
  'this chapter highlights',
  'reflecting on',
  'a week of growth',
  'meaningful activities',
  'personal and professional',
];

// Phase 8 of docs/chapters-plan.md — the continuity-citation sentence
// for `acted_on` Next Step outcomes must read as investigative
// reporter, not as a high-five. These phrases anywhere in the opening
// paragraphs OR the signal.caption fail the validator on a strict
// pass. Intentionally lowercase; the validator normalizes before
// matching.
const BANNED_CONTINUITY_PRAISE_PHRASES = [
  'great job',
  'amazing work',
  'way to go',
  'nice work',
  'proud of you',
  'well done',
  'kudos',
  'keep it up',
];

const BANNED_TITLE_PREFIX_RE =
  /^\s*(reflections?\s+on|a\s+(week|month|year)\s+of|this\s+(week|month|year)|your\s+(week|month|year)|progress\s+report|weekly\s+recap|weekly\s+report|weekly\s+reflection|monthly\s+reflection)\b/i;

function resolveMaxOutputTokens(params: { detailLevel: string | null; kind: TemplateKind }): number {
  const dl = (params.detailLevel ?? '').trim().toLowerCase();
  const base = params.kind === 'report' ? 900 : 1100;
  if (dl === 'short') return Math.min(800, base);
  if (dl === 'deep') return Math.max(1600, base + 500);
  // medium/default
  return base;
}

function resolveTemperature(kind: TemplateKind, tone: string | null): number {
  if (kind === 'report') return 0.25;
  const t = (tone ?? '').trim().toLowerCase();
  if (t === 'direct') return 0.45;
  if (t === 'playful') return 0.8;
  return 0.65; // gentle/neutral/default
}

type PriorChapterArc = {
  arc_id: string | null;
  arc_title: string | null;
  completed_count: number | null;
  active_days_count: number | null;
  activity_count_total: number | null;
};

/**
 * Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity outcome.
 * Joins the prior Chapter's `output_json.recommendations[]` (Phase 5–6)
 * with rows from `kwilt_chapter_recommendation_events` to surface what
 * the user did with each Next Step. `acted_on` outcomes MUST be cited
 * in the new Chapter's opening; `dismissed` outcomes must NOT be
 * referenced (that would feel nagging); `ignored` is silent by default
 * too.
 */
type PriorChapterRecommendationOutcome = {
  recommendation_id: string;
  kind: 'arc' | 'goal' | 'align' | 'activity';
  action: 'acted_on' | 'dismissed' | 'ignored';
  resulting_object_id: string | null;
  /** Human-readable nominated title (e.g. "Fitness" for an Arc nom). */
  nominated_title: string | null;
  /**
   * Label of the resulting object if it still exists in stable_context
   * (e.g. the Arc title the user actually created, which may differ
   * from `nominated_title` if they edited it before saving). `null`
   * when the object isn't joinable (deleted, not yet synced, etc.).
   */
  resulting_title: string | null;
  /**
   * Arc context for `goal` / `align` recommendations — lets the prompt
   * cite which Arc the Goal lives under without re-joining.
   */
  arc_title: string | null;
};

type PriorChapterContext = {
  title: string | null;
  dek: string | null;
  chosen_hook_id: string | null;
  period_label: string | null;
  completed_count: number | null;
  active_days_count: number | null;
  longest_streak_days: number | null;
  /**
   * Arc-level snapshot from the prior chapter's deterministic metrics. Used by
   * Phase 3.2 (docs/chapters-plan.md) to compute the arc-lane delta
   * block on the current chapter's `metrics.arcs[]`. May be empty if the prior
   * chapter predates the arc-snapshot plumbing.
   */
  arcs: PriorChapterArc[];
  /**
   * Phase 7.2 of docs/chapters-plan.md: the user's "add a line" note on
   * the prior chapter, if any. Used by the continuity rule to subtly
   * acknowledge the user's own words in the new chapter's opening
   * paragraphs — never verbatim quoted (that would feel parrot-y), but
   * referenced thematically. `null` when no prior note exists or the
   * prior chapter predates Phase 7.
   */
  user_note: string | null;
  user_note_updated_at: string | null;
  /**
   * Phase 8 of docs/chapters-plan.md: what the user did with each of
   * the prior Chapter's Next Steps. Empty array for chapters that
   * predate Phase 5 or had no recommendations. `acted_on` outcomes
   * carry priority-evidence weight in the prompt and drive the
   * continuity citation rule.
   */
  recommendation_outcomes: PriorChapterRecommendationOutcome[];
} | null;

function buildGoldenExample(cadence: Cadence): string {
  // A single worked example per cadence-family is worth a thousand adjectives.
  // We show: concrete headline, concrete dek, opening paragraphs that quote
  // activity titles + Arc names + numbers. The model mirrors style, not content.
  if (cadence === 'yearly') {
    return JSON.stringify({
      title: 'Running came back; writing carried the year',
      dek: 'In a year with 142 active days and a 19-day streak, "Finish novel draft" and a rebuilt running habit anchored the Arcs that actually moved.',
      caption: 'Writing carried the year — "Finish novel draft" closed after 241 days — while the Health Arc logged 38 completions across 61 activities.',
      opening_paragraphs: [
        'You closed 206 of the 318 activities you opened this year, and you stayed visible for 142 days of it. The shape of that work was not evenly distributed. Two Arcs carried the year: Writing (87 activities, 54 completed) and Health (61 activities, 38 completed).',
        'The Writing Arc bent around one long finish: "Finish novel draft", opened in March, closed in November. It was a 241-day arc that crossed 34 other activities — "Edit chapter 7", "Send draft to Mira", "Revise opening scene" — each a small plank on the same bridge.',
      ],
    });
  }
  if (cadence === 'monthly') {
    return JSON.stringify({
      title: 'A month of unglamorous follow-through on the Family Arc',
      dek: 'You completed 38 of 46 activities in April — not your busiest month, but 6 of them carried forward from March and finally closed. The Family Arc did most of the work.',
      caption: 'The Family Arc closed 14 of April\'s 38 finishes, including "Plan Mom\'s surprise dinner" — 6 of those carried forward from March.',
      opening_paragraphs: [
        'April was not the month you built the thing; it was the month you finished several things you had already built. Thirty-eight completions against forty-six opens, and of those completions, six were activities you had carried forward from March — including "Plan Mom\'s surprise dinner" (opened March 19, closed April 6).',
        'The Family Arc accounted for 14 of the 38 completions, more than any other Arc. That is not a huge number in isolation, but it is striking against your March average of 5.',
      ],
    });
  }
  // weekly / manual default
  return JSON.stringify({
    title: '7 active days, a 72-item backlog, and one finish that mattered',
    dek: 'You closed 12 activities this week and kept the streak alive every day — but the real story is "Workfront Planning Promo", which had been open for 23 days.',
    caption: 'The Work Arc finally closed "Workfront Planning Promo" after 23 days open — one of 12 finishes across a 7-day active streak.',
    opening_paragraphs: [
      'You were active on all seven days of the week, extending the streak to six days, and you closed 12 activities. None of those headline numbers is the story. The story is that "Workfront Planning Promo" — an activity you opened 23 days ago — finally closed on Thursday, which makes this week the moment that long arc crossed the line.',
      'Around that finish, the Family Arc continued its quiet run (3 activities, all completed), and the Work Arc absorbed the bulk of the effort (8 activities, 6 completed). The 72 carry-forward count looks heavy in isolation, but 11 of those 72 have "Workfront" in the title and now belong to a thread that has started to close.',
    ],
  });
}

function buildWritingRequirements(params: {
  cadence: Cadence;
  kind: TemplateKind;
  detail: string;
  stricter: boolean;
  hasNotes: boolean;
  /**
   * Phase 4-backend of docs/chapters-plan.md — true when
   * `metrics.health` is attached (week passed the inclusion floor).
   * When true, the prompt invites (but does not require) a single
   * health line anchored in a number from `metrics.health`. When
   * false, the prompt BANS any health-keyword prose so the narrative
   * never invents movement/sleep/workout/mindfulness facts. The
   * validator enforces both directions.
   */
  hasHealth: boolean;
}) {
  const { cadence, kind, detail, stricter, hasNotes, hasHealth } = params;

  const isShortForm = cadence === 'weekly' || cadence === 'manual';
  const lengthRule = isShortForm
    ? `Length: 450–750 words. Weekly/custom chapters are a letter, not a magazine piece — tight, personal, ${detail === 'short' ? '3–4' : detail === 'deep' ? '5–6' : '4–5'} paragraphs. Never less than 4 substantial paragraphs.`
    : cadence === 'monthly'
      ? `Length: 800–1200 words. A monthly chapter earns a reported-article shape.`
      : `Length: 1100–1500 words. A yearly chapter is a full feature; expect 4–7 subheads.`;

  const subheadRule = isShortForm
    ? `Do NOT use markdown "## " subheads; weekly chapters should flow as continuous paragraphs.`
    : `Use 3–6 short markdown subheads ("## Like this"). Subheads must be evidence-anchored, not generic (e.g. "## The streak held" is better than "## The numbers").`;

  const rules = [
    `Anti-generic rule: do not use vague praise ("meaningful", "remarkable", "balance", "growth") anywhere in title, dek, or body.`,
    `Hard constraint: every paragraph in story.body must include at least ONE concrete anchor: (a) a number from metrics, OR (b) a quoted activity title, OR (c) a named arc or goal title from stable_context.`,
    `Quote rule: include at least ${stricter ? '5' : '4'} quoted activity titles EXACTLY as given in evidence.activities_full (wrap titles in double quotes).`,
    `Arc rule: name at least ONE Arc from stable_context by its exact title in story.body.`,
    hasNotes
      ? `User-voice rule: at least one evidence.activities_full[].notes_snippet MUST be quoted verbatim in story.body (wrap in double quotes). The user's own words are the single most important signal.`
      : `User-voice rule: if any evidence.activities_full[].notes_snippet exists, quote one verbatim.`,
    `Angle rule: pick ONE story hook from evidence.story_hooks. Echo its hook_id back as chosen_hook_id in the output. The headline MUST reflect that hook in concrete terms.`,
    `Continuity rule: if prior_chapter is provided, reference it subtly in the opening 2 paragraphs (e.g. "after last ${cadence === 'weekly' ? 'week' : cadence === 'monthly' ? 'month' : 'year'}'s …"). Do NOT invent anything about prior_chapter that isn't in the field.`,
    // Phase 7.2: the prior user_note is the user's own voice on the
    // last chapter. If present, acknowledge its THEME in the new
    // chapter's signal.caption OR the opening 2 paragraphs. Never
    // verbatim-quote it back at them (that reads parrot-y); paraphrase
    // or reference the underlying concern/observation, and tie it to
    // this period's evidence. If the theme has no evidence this
    // period, say so honestly ("you noted last week you wanted to slow
    // down; the evidence doesn't show that yet").
    `User-note continuity rule: if prior_chapter.user_note is present, reference its THEME (not its exact words) once in either signal.caption or the opening 2 paragraphs of story.body. Paraphrase — never re-quote the note verbatim. If the note's theme has no supporting evidence this period, say so plainly rather than fabricate continuity.`,
    // Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity. The
    // prior Chapter's Next Steps are a structured signal the LLM has
    // never seen before, so we teach the rule explicitly: cite
    // `acted_on` outcomes with a concrete number / Arc / activity
    // anchor from THIS period's evidence; stay silent on `dismissed`
    // and `ignored`. The validator enforces the citation presence
    // when any acted-on outcome exists.
    `Next-Step-outcome continuity rule (Phase 8): if prior_chapter.recommendation_outcomes contains any entry with action="acted_on", the new Chapter MUST cite that outcome once in EITHER signal.caption OR the opening 2 paragraphs of story.body. Use the resulting object (Arc/Goal name from resulting_title, falling back to nominated_title) and anchor the mention in concrete evidence from THIS period's metrics or activities — e.g. "Since you named the Fitness Arc last week, you put 4 completions against it." Do NOT use congratulatory exclamations ("Great job", "Amazing work", "Way to go", "Nice work", "Proud of you") — investigative-reporter voice means you state the outcome, then interpret it neutrally. If prior_chapter.recommendation_outcomes contains entries with action="dismissed" or "ignored", DO NOT mention them at all — respecting a "not now" signal is core to the product voice.`,
    // Phase 4-backend: passive HealthKit signal. Health prose is gated
    // by whether the deterministic inclusion floor was crossed. When
    // it was, we INVITE (not require) one short line; when it wasn't,
    // we BAN any health-keyword prose. The validator enforces the ban
    // direction and would otherwise let figurative "asleep at the
    // wheel"-style usage through, so the rule is framed in product
    // language, not regex language.
    hasHealth
      ? `Health rule (optional): metrics.health is attached this period. You MAY weave at most ONE short, concrete line about movement, sleep, workouts, or mindfulness into signal.caption OR story.body. The line MUST cite at least one number from metrics.health (e.g. "4 active days", "14,200 steps", "6.8 hours of sleep"). Do not add a health line unless it genuinely helps the story hook; a padded health mention is worse than no mention. Never frame the number in a shame direction.`
      : `Health rule (ban): metrics.health is NOT present this period. Do NOT mention sleep, steps, walking, workouts, mindfulness, or meditation anywhere in signal.caption or story.body — the generator has no evidence to support such claims and inventing them would break the non-negotiable "never invent facts" rule.`,
    `Honest-not-boosterish rule: if the period was quiet or mixed, say so plainly, then interpret kindly. Never manufacture enthusiasm the evidence doesn't support.`,
    `Ban list (do not appear anywhere): "this chapter highlights", "reflecting on", "a week of growth", "meaningful activities", "personal and professional", "harnessing".`,
    `Headline ban: title must not start with "Reflection(s) on", "A week of", "This week/month/year", "Progress Report", "Weekly Recap", "Weekly Report", "Weekly Reflection", or "Monthly Reflection".`,
    `Headline rules: 4–12 words, no date strings, no cadence labels, no colons unless essential. It must be a real headline.`,
    `Dek rule: 1–2 sentences, concrete, metric- or evidence-anchored.`,
    `Include at least ${stricter ? '6' : '4–7'} cited activity examples drawn from evidence.noteworthy_examples (and add their ids to citations.examples_used).`,
    `Do not use numbered lists in the article body.`,
    `If there are "quiet" arcs/goals (low activity), mention neutrally (no shame).`,
  ];

  const sectionRules = [
    `story.body IS the product. The other sections support it; they do not replace it.`,
    `Hard caps: where_time_went.bullets max 3; highlights.bullets max 3; patterns.bullets max 3; next_experiments.bullets max 3; forces.items max 3.`,
    `Bullets/items must not introduce new facts beyond metrics + evidence; if unsure, omit.`,
    `highlights.bullets must each start with a quoted activity title.`,
  ];

  // Phase 3.1 (docs/chapters-plan.md): the signal-first caption.
  // Same voice as story.body (warm investigative reporter) — continuous
  // transition from caption → article. Required anchors: one quoted activity
  // title, one Arc name, one number. Length kept short-by-construction so
  // list cards + digest emails can use it as a lead-paragraph without
  // truncation heuristics.
  const captionRules = [
    `sections.signal.caption MUST be 1–3 sentences summarizing the SINGLE top story hook of the period in reader-facing prose.`,
    `Caption constraints: length 80–320 characters. Must NOT exceed 320 characters.`,
    `Caption anchors (ALL THREE required): (a) at least ONE quoted activity title from evidence.activities_full wrapped in double quotes; (b) at least ONE Arc name from stable_context by its exact title; (c) at least ONE number from metrics.`,
    `Caption voice: same investigative reporter voice as story.body. Do NOT say "this chapter highlights", "this week's chapter", "in this chapter", or any meta-framing. Write the hook directly.`,
    `Caption alignment: the caption must reflect the same story hook as chosen_hook_id. Reader opens caption → reads story; voice + angle are continuous.`,
    `Caption anti-spoiler rule: do not re-use the dek verbatim. Dek is a news dek; caption is a lede for a mobile reader.`,
  ];

  return {
    headline_rules: [`title must be a headline (no cadence prefix, no date stamp)`, `4–12 words, specific to THIS period's evidence`],
    length_rule: lengthRule,
    subhead_rule: subheadRule,
    story_rules: rules,
    section_rules: sectionRules,
    caption_rules: captionRules,
    tone_note: kind === 'report' ? 'Kind: report. Be neutral and tight.' : 'Kind: reflection. Warm reporter voice, first-person-to-the-reader.',
  };
}

function buildChapterPrompt(params: {
  template: TemplateRow;
  period: Period;
  periodLabel: string;
  metrics: ChapterMetrics;
  stableContext: { arcs: any[]; goals: any[] };
  evidence: {
    activities_full: any[];
    activities_compact: any[];
    noteworthy_examples: NoteworthyExample[];
    lead_examples: NoteworthyExample[];
    story_hooks: Array<{
      hook_id: string;
      title: string;
      why_this_matters: string;
      supporting_metrics: Record<string, number>;
      supporting_activity_ids: string[];
    }>;
    filter_snapshot: any;
  };
  priorChapter: PriorChapterContext;
  stricter?: boolean;
}) {
  const { template, period, periodLabel, metrics, stableContext, evidence, priorChapter, stricter } = params;
  const tz = validZoneOrUtc(template.timezone);
  const kind = template.kind;
  const tone = (template.tone ?? '').trim() || (kind === 'report' ? 'neutral' : 'gentle');
  const detail = (template.detail_level ?? '').trim() || 'medium';
  const hasNotes = Array.isArray(evidence.activities_full) &&
    evidence.activities_full.some((a: any) => typeof a?.notes_snippet === 'string' && a.notes_snippet.trim().length > 0);

  const writing = buildWritingRequirements({
    cadence: template.cadence,
    kind,
    detail,
    stricter: Boolean(stricter),
    hasNotes,
    hasHealth: Boolean((metrics as any)?.health),
  });

  const system = [
    `You write "Chapters": AI-generated, investigative-reporter-voiced reflections on a person's own work and life.`,
    `You are writing TO the user, not ABOUT them in the third person. Second person ("you closed 12 activities"), never "the user".`,
    `Non-negotiables: never invent facts; celebration must emerge from evidence; never shame; honesty beats enthusiasm.`,
    `You MAY reference numbers only if they appear in the provided metrics object.`,
    `You MUST only mention activities that appear in evidence.noteworthy_examples or evidence.activities_full.`,
    `When you mention an activity, you MUST include its activity_id in citations.examples_used.`,
    `Output MUST be valid JSON (no markdown fences) matching the provided output schema exactly.`,
    `Tone: investigative reporter, warm, reality-anchored. Kind: ${kind}. User tone hint: ${tone}. Detail level: ${detail}. Cadence: ${template.cadence}.`,
    `Forbidden: inventing intent/emotion, shaming language ("should have", "failed to"), ungrounded superlatives.`,
    stricter
      ? `STRICTER RETRY: your previous attempt was rejected by the validator. Every rule below is now enforced. Be concrete, quote activity titles, name Arcs, and open with the chosen story hook.`
      : ``,
  ].filter(Boolean).join('\n');

  const user = {
    task: 'Generate a Chapter JSON using ONLY the provided stable context + deterministic metrics + evidence.',
    period: { start: period.start.toISO(), end: period.end.toISO(), label: periodLabel, timezone: tz, days: metrics.period_days },
    stable_context: stableContext,
    metrics,
    evidence,
    prior_chapter: priorChapter,
    golden_example: {
      note: 'This is a STYLE example only. Do NOT reuse its facts, titles, numbers, or activity names. Mirror its voice: concrete, specific, quoted titles, named Arcs, numbers with context.',
      example: safeJsonParse(buildGoldenExample(template.cadence)),
    },
    output_schema: {
      title: 'string',
      dek: 'string',
      chosen_hook_id: 'string (MUST match one of evidence.story_hooks[].hook_id)',
      period: { start: 'string', end: 'string', label: 'string' },
      sections: [
        { key: 'signal', title: 'The Signal', caption: 'string (1–3 sentence lede; see writing_requirements.caption_rules)' },
        { key: 'story', title: 'The Story', body: 'string (article body; include subheads inline for monthly/yearly)' },
        { key: 'where_time_went', title: 'Where the Work Landed', bullets: ['string'] },
        { key: 'forces', title: 'Your Forces', items: [{ force: 'string', body: 'string' }] },
        { key: 'highlights', title: 'Highlights', bullets: ['string'] },
        { key: 'patterns', title: 'Patterns', bullets: ['string'] },
        { key: 'next_experiments', title: 'Next Experiments', bullets: ['string'] },
      ],
      noteworthy_mentions: [{ activity_id: 'string', title: 'string', reason: 'string' }],
      citations: { metrics_used: true, examples_used: ['activity_id'] },
    },
    writing_requirements: writing,
  };

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
  };
}

async function callOpenAiForChapter(params: {
  template: TemplateRow;
  period: Period;
  periodLabel: string;
  metrics: ChapterMetrics;
  stableContext: { arcs: any[]; goals: any[] };
  evidence: {
    activities_full: any[];
    activities_compact: any[];
    noteworthy_examples: NoteworthyExample[];
    lead_examples: NoteworthyExample[];
    story_hooks: Array<{
      hook_id: string;
      title: string;
      why_this_matters: string;
      supporting_metrics: Record<string, number>;
      supporting_activity_ids: string[];
    }>;
    filter_snapshot: any;
  };
  priorChapter: PriorChapterContext;
  stricter?: boolean;
}) {
  const key = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
  if (!key) return { ok: false as const, error: 'OPENAI_API_KEY not set' };

  const model = resolveChaptersModel();
  let maxTokens = resolveMaxOutputTokens({ detailLevel: params.template.detail_level, kind: params.template.kind });
  maxTokens = Math.max(maxTokens, params.metrics.period_days >= 180 ? 1900 : 1200);
  // Slightly cooler on stricter retries to trade creativity for rule-adherence.
  const baseTemperature = resolveTemperature(params.template.kind, params.template.tone);
  const temperature = params.stricter ? Math.max(0.2, baseTemperature - 0.2) : baseTemperature;
  const prompt = buildChapterPrompt({
    template: params.template,
    period: params.period,
    periodLabel: params.periodLabel,
    metrics: params.metrics,
    stableContext: params.stableContext,
    evidence: params.evidence,
    priorChapter: params.priorChapter,
    stricter: params.stricter,
  });

  const body = {
    model,
    messages: prompt.messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  const startedAt = Date.now();
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!resp) return { ok: false as const, error: 'OpenAI request failed' };
  const text = await resp.text().catch(() => '');
  const durationMs = Date.now() - startedAt;
  const parsed = safeJsonParse(text);
  if (!resp.ok) {
    const msg = parsed?.error?.message ? String(parsed.error.message) : `OpenAI error (${resp.status})`;
    return { ok: false as const, error: `${msg} [${durationMs}ms]` };
  }

  const content = parsed?.choices?.[0]?.message?.content;
  const out = typeof content === 'string' ? safeJsonParse(content) : null;
  if (!out || typeof out !== 'object') {
    return { ok: false as const, error: 'OpenAI returned invalid JSON output' };
  }
  return { ok: true as const, outputJson: out };
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function paragraphHasAnchor(params: {
  paragraph: string;
  arcTitles: string[];
  goalTitles: string[];
  activityTitles: string[];
}): boolean {
  const { paragraph, arcTitles, goalTitles, activityTitles } = params;
  // Skip markdown subheads; they aren't paragraphs of prose.
  if (paragraph.startsWith('## ') || paragraph.startsWith('# ')) return true;
  if (/\d/.test(paragraph)) return true;
  if (/[\u201C"][^\u201D"]{3,}[\u201D"]/.test(paragraph)) return true;
  const lc = paragraph.toLowerCase();
  for (const t of arcTitles) {
    if (t && lc.includes(t.toLowerCase())) return true;
  }
  for (const t of goalTitles) {
    if (t && lc.includes(t.toLowerCase())) return true;
  }
  for (const t of activityTitles) {
    if (t && lc.includes(t.toLowerCase())) return true;
  }
  return false;
}

function countQuotedTitles(body: string, activityTitles: string[]): number {
  let count = 0;
  for (const t of activityTitles) {
    const trimmed = t.trim();
    if (!trimmed || trimmed.length < 3) continue;
    const quoted = `"${trimmed}"`;
    const smartQuoted = `\u201C${trimmed}\u201D`;
    if (body.includes(quoted) || body.includes(smartQuoted)) count += 1;
  }
  return count;
}

function validateChapterOutput(params: {
  outputJson: any;
  period: Period;
  periodLabel: string;
  allowedActivityIds: Set<string>;
  allowedHookIds: Set<string>;
  activityTitlesById: Map<string, string>;
  arcTitles: string[];
  goalTitles: string[];
  noteSnippets: string[];
  cadence: Cadence;
  strict: boolean;
  /**
   * Phase 8 of docs/chapters-plan.md — the prior chapter's
   * recommendation outcomes. When any entry has `action: 'acted_on'`,
   * the validator enforces that the new Chapter cites it in either
   * `signal.caption` or the opening 2 paragraphs of `story.body`. The
   * citation must mention either the resulting object's title
   * (`resulting_title`) or the originally nominated title
   * (`nominated_title`) as a reasonable fallback. The banned-praise
   * check runs here too so congratulatory phrasing in the continuity
   * sentence gets caught.
   */
  priorRecommendationOutcomes?: PriorChapterRecommendationOutcome[];
  /**
   * Phase 4-backend of docs/chapters-plan.md — true when
   * `metrics.health` was attached this period. When false, the
   * validator rejects any health-keyword prose in signal.caption or
   * story.body so the model can't invent movement/sleep data when
   * the generator has no evidence for it. See `chapterHealth.ts`
   * for the keyword list.
   */
  hasHealth?: boolean;
}): { ok: true } | { ok: false; error: string } {
  const {
    outputJson: out,
    period,
    periodLabel,
    allowedActivityIds,
    allowedHookIds,
    activityTitlesById,
    arcTitles,
    goalTitles,
    noteSnippets,
    cadence,
    strict,
    priorRecommendationOutcomes,
    hasHealth,
  } = params;

  const title = typeof out?.title === 'string' ? out.title.trim() : '';
  const dek = typeof out?.dek === 'string' ? out.dek.trim() : '';
  if (!title) return { ok: false, error: 'Output missing title' };
  if (!dek) return { ok: false, error: 'Output missing dek' };
  if (BANNED_TITLE_PREFIX_RE.test(title)) {
    return { ok: false, error: `Title is generic/banned (starts with blocked prefix): "${title}"` };
  }
  // Reject titles that are just a period stamp ("Jan 19, 2026 – Jan 26, 2026").
  if (/^\s*\w+\s+\d{1,2},?\s+\d{4}\s*[–-]/.test(title)) {
    return { ok: false, error: 'Title is just a date range' };
  }
  if (title.length > 100) return { ok: false, error: 'Title too long (max 100 chars)' };

  const titleWordCount = title.split(/\s+/).filter(Boolean).length;
  if (titleWordCount < 3) return { ok: false, error: 'Title too short (min 3 words)' };

  const dekLc = dek.toLowerCase();
  const titleLc = title.toLowerCase();
  for (const phrase of BANNED_DEK_PHRASES) {
    if (dekLc.includes(phrase)) return { ok: false, error: `Dek contains banned phrase: "${phrase}"` };
    if (titleLc.includes(phrase)) return { ok: false, error: `Title contains banned phrase: "${phrase}"` };
  }
  for (const word of BANNED_DEK_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(dek)) return { ok: false, error: `Dek contains banned word: "${word}"` };
    if (re.test(title)) return { ok: false, error: `Title contains banned word: "${word}"` };
  }

  const p = out?.period;
  if (!p || typeof p !== 'object') return { ok: false, error: 'Output missing period' };
  if (typeof p.start !== 'string' || typeof p.end !== 'string' || typeof p.label !== 'string') {
    return { ok: false, error: 'Output period is invalid' };
  }
  if (p.start !== period.start.toISO() || p.end !== period.end.toISO() || p.label !== periodLabel) {
    return { ok: false, error: 'Output period fields do not match canonical period' };
  }

  // chosen_hook_id must match one of the provided hooks (we tolerate older
  // outputs without this field on non-strict runs, but fail on strict).
  const chosenHook = typeof out?.chosen_hook_id === 'string' ? out.chosen_hook_id.trim() : '';
  if (strict) {
    if (!chosenHook) return { ok: false, error: 'Output missing chosen_hook_id' };
    if (allowedHookIds.size > 0 && !allowedHookIds.has(chosenHook)) {
      return { ok: false, error: `chosen_hook_id is not in evidence.story_hooks: "${chosenHook}"` };
    }
  }

  const sections = Array.isArray(out?.sections) ? out.sections : null;
  if (!sections) return { ok: false, error: 'Output missing sections array' };
  // Phase 3.1: `signal` is required alongside story. On non-strict (first
  // attempt) we enforce it; we intentionally do NOT have a tolerance window
  // like we did for `chosen_hook_id` because the detail-screen inversion in
  // Phase 3.3 assumes every ready chapter has a caption.
  const requiredKeys = ['signal', 'story', 'where_time_went', 'forces', 'highlights', 'patterns', 'next_experiments'];
  const keys = new Set(sections.map((s: any) => (typeof s?.key === 'string' ? s.key : null)).filter(Boolean));
  for (const k of requiredKeys) {
    if (!keys.has(k)) return { ok: false, error: `Output missing section: ${k}` };
  }

  // Caption validation (Phase 3.1). We read activity titles, arc titles
  // below for story.body; re-use them here. Caption validation runs BEFORE
  // story validation so a missing caption fails fast.
  const signal = sections.find((s: any) => s && typeof s === 'object' && s.key === 'signal');
  const caption = typeof signal?.caption === 'string' ? signal.caption.trim() : '';
  if (!caption) return { ok: false, error: 'sections.signal.caption is missing' };
  if (caption.length < 80) {
    return { ok: false, error: `sections.signal.caption is too short (< 80 chars; got ${caption.length})` };
  }
  if (caption.length > 320) {
    return { ok: false, error: `sections.signal.caption is too long (> 320 chars; got ${caption.length})` };
  }
  const captionLc = caption.toLowerCase();
  for (const phrase of BANNED_DEK_PHRASES) {
    if (captionLc.includes(phrase)) {
      return { ok: false, error: `sections.signal.caption contains banned phrase: "${phrase}"` };
    }
  }
  for (const word of BANNED_DEK_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(caption)) {
      return { ok: false, error: `sections.signal.caption contains banned word: "${word}"` };
    }
  }
  // Meta-framing rejections (caption must read as article lede, not as a
  // description of the chapter itself).
  const metaPhrases = ['this chapter', 'this week\u2019s chapter', "this week's chapter", 'in this chapter', 'this report'];
  for (const phrase of metaPhrases) {
    if (captionLc.includes(phrase)) {
      return { ok: false, error: `sections.signal.caption contains meta-framing phrase: "${phrase}"` };
    }
  }

  const story = sections.find((s: any) => s && typeof s === 'object' && s.key === 'story');
  const body = typeof story?.body === 'string' ? story.body.trim() : '';
  if (!body) return { ok: false, error: 'story.body is missing' };
  const minBody = cadence === 'weekly' || cadence === 'manual' ? 600 : 900;
  if (body.length < minBody) return { ok: false, error: `story.body is too short (< ${minBody} chars)` };

  // Banned phrases/words in the body too.
  for (const phrase of BANNED_DEK_PHRASES) {
    if (body.toLowerCase().includes(phrase)) {
      return { ok: false, error: `story.body contains banned phrase: "${phrase}"` };
    }
  }

  // Per-paragraph anchor check.
  const paragraphs = splitParagraphs(body);
  const activityTitles = Array.from(activityTitlesById.values());
  for (let i = 0; i < paragraphs.length; i += 1) {
    const para = paragraphs[i];
    // Let the very first paragraph slip if needed, but after that, enforce.
    if (i === 0) continue;
    if (!paragraphHasAnchor({ paragraph: para, arcTitles, goalTitles, activityTitles })) {
      return {
        ok: false,
        error: `story.body paragraph ${i + 1} lacks a concrete anchor (number, quoted title, or named arc/goal)`,
      };
    }
  }

  // Quoted-title count.
  const minQuoted = strict ? 5 : 4;
  const quotedCount = countQuotedTitles(body, activityTitles);
  if (quotedCount < minQuoted) {
    return {
      ok: false,
      error: `story.body must quote at least ${minQuoted} activity titles verbatim; found ${quotedCount}`,
    };
  }

  // At least one Arc named in body.
  if (arcTitles.length > 0) {
    const lc = body.toLowerCase();
    const mentioned = arcTitles.some((t) => t && lc.includes(t.toLowerCase()));
    if (!mentioned) return { ok: false, error: 'story.body must name at least one Arc from stable_context' };
  }

  // Phase 3.1 caption anchor checks (run here, after arcTitles/activityTitles
  // are hoisted for story.body validation). Caption must quote at least one
  // activity title, name at least one Arc, and include at least one number.
  if (!/\d/.test(caption)) {
    return { ok: false, error: 'sections.signal.caption must include at least one number from metrics' };
  }
  if (arcTitles.length > 0) {
    const capLc = caption.toLowerCase();
    const arcMentioned = arcTitles.some((t) => t && capLc.includes(t.toLowerCase()));
    if (!arcMentioned) {
      return { ok: false, error: 'sections.signal.caption must name at least one Arc from stable_context' };
    }
  }
  // Require at least one quoted activity title (tolerates smart quotes).
  const captionQuotedCount = countQuotedTitles(caption, activityTitles);
  if (activityTitles.length > 0 && captionQuotedCount < 1) {
    return { ok: false, error: 'sections.signal.caption must quote at least one activity title verbatim' };
  }
  // Anti-spoiler: caption must not be byte-for-byte identical to the dek.
  if (caption === dek) {
    return { ok: false, error: 'sections.signal.caption must not be identical to dek' };
  }

  // Phase 4-backend: health keyword ban. When `metrics.health` is NOT
  // attached (week didn't cross the inclusion floor, or no HealthKit
  // writer at all), signal.caption and story.body must not mention
  // health-shaped keywords. The model has no evidence to support such
  // claims. When metrics.health IS attached, the prompt already
  // invites the mention; we don't add a positive-assertion check here
  // because the generic per-paragraph anchor rule already requires a
  // number/title/Arc, and a health line that doesn't cite a health
  // number would still fail that existing rule.
  if (hasHealth === false) {
    if (containsHealthKeyword(caption)) {
      return {
        ok: false,
        error:
          'sections.signal.caption mentions health/sleep/movement/mindfulness but metrics.health is not attached — the generator has no evidence to support that claim',
      };
    }
    if (containsHealthKeyword(body)) {
      return {
        ok: false,
        error:
          'story.body mentions health/sleep/movement/mindfulness but metrics.health is not attached — the generator has no evidence to support that claim',
      };
    }
  }

  // If user notes exist, at least one note must appear quoted in body.
  if (noteSnippets.length > 0) {
    const hit = noteSnippets.some((n) => {
      const trimmed = n.replace(/\s+/g, ' ').trim();
      if (trimmed.length < 8) return false;
      // Tolerate the model quoting a fragment: require a 20-char window to
      // appear in the body, or the whole snippet if short.
      const probe = trimmed.length > 40 ? trimmed.slice(0, 30) : trimmed;
      return body.includes(probe);
    });
    if (!hit) {
      return { ok: false, error: 'story.body must quote at least one user note verbatim' };
    }
  }

  const citations = out?.citations;
  if (!citations || typeof citations !== 'object') return { ok: false, error: 'Output missing citations' };
  if (citations.metrics_used !== true) return { ok: false, error: 'citations.metrics_used must be true' };
  const examplesUsed = Array.isArray(citations.examples_used) ? citations.examples_used : null;
  if (!examplesUsed) return { ok: false, error: 'citations.examples_used must be an array' };
  const minExamples = strict ? 6 : 4;
  if (examplesUsed.length < minExamples) {
    return { ok: false, error: `citations.examples_used must include at least ${minExamples} activity ids` };
  }
  for (const id of examplesUsed) {
    if (typeof id !== 'string' || !id.trim()) return { ok: false, error: 'citations.examples_used contains invalid id' };
    if (!allowedActivityIds.has(id)) return { ok: false, error: `citations.examples_used references unknown activity_id: ${id}` };
  }

  const mentions = Array.isArray(out?.noteworthy_mentions) ? out.noteworthy_mentions : [];
  for (const m of mentions) {
    const id = typeof m?.activity_id === 'string' ? m.activity_id : null;
    if (!id || !allowedActivityIds.has(id)) return { ok: false, error: 'noteworthy_mentions references unknown activity_id' };
  }

  // Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity
  // citation. When the prior Chapter has any `acted_on` outcomes, the
  // new Chapter MUST mention at least one by name (resulting_title
  // preferred, nominated_title as fallback) in either signal.caption
  // or the opening 2 paragraphs of story.body. The check runs after
  // the generic anchor checks so it's layered, not replacement.
  const actedOnOutcomes = Array.isArray(priorRecommendationOutcomes)
    ? priorRecommendationOutcomes.filter((o) => o && o.action === 'acted_on')
    : [];
  if (actedOnOutcomes.length > 0) {
    const candidates: string[] = [];
    for (const o of actedOnOutcomes) {
      const cand = (o.resulting_title || o.nominated_title || '').trim();
      if (cand.length > 0) candidates.push(cand.toLowerCase());
    }
    if (candidates.length > 0) {
      const openingParas = paragraphs.slice(0, 2).join('\n').toLowerCase();
      const captionLower = caption.toLowerCase();
      const cited = candidates.some((c) =>
        openingParas.includes(c) || captionLower.includes(c),
      );
      if (!cited) {
        return {
          ok: false,
          error:
            `Phase 8 continuity: the new Chapter must cite at least one prior-Chapter acted-on Next Step (candidates: ${candidates
              .slice(0, 3)
              .map((c) => `"${c}"`)
              .join(', ')}) in sections.signal.caption or the first 2 paragraphs of story.body`,
        };
      }
    }
    // Banned congratulatory phrasing anywhere in the opening + caption.
    const scanArea =
      caption.toLowerCase() + '\n' + paragraphs.slice(0, 2).join('\n').toLowerCase();
    for (const phrase of BANNED_CONTINUITY_PRAISE_PHRASES) {
      if (scanArea.includes(phrase)) {
        return {
          ok: false,
          error: `Phase 8 continuity: opening/caption contains congratulatory phrase "${phrase}" — use investigative-reporter voice instead`,
        };
      }
    }
  }

  return { ok: true };
}

async function listTemplates(
  admin: any,
  params: { templateId?: string | null; userId?: string | null; requireEnabled?: boolean },
) {
  let q = admin
    .from('kwilt_chapter_templates')
    .select(
      'id,user_id,name,kind,cadence,timezone,filter_json,filter_group_logic,email_enabled,email_recipient,detail_level,tone,enabled'
    );

  // Scheduled/cron runs only touch opt-in rows; manual generation (a user
  // tapping "Generate" with an explicit templateId) respects the user's intent
  // even when `enabled=false`, so the digest feature works for accounts that
  // haven't been migrated to the new `enabled=true` default yet.
  if (params.requireEnabled !== false) {
    q = q.eq('enabled', true);
  }

  if (params.templateId) q = q.eq('id', params.templateId);
  if (params.userId) q = q.eq('user_id', params.userId);

  const { data, error } = await q;
  if (error) return { ok: false as const, error };
  return { ok: true as const, rows: (Array.isArray(data) ? (data as TemplateRow[]) : []) as TemplateRow[] };
}

async function loadUserDomain(
  admin: any,
  userId: string,
  options?: { healthStartDate?: string; healthEndDate?: string },
) {
  // Phase 4-backend of docs/chapters-plan.md — pre-query the
  // `kwilt_health_daily` rows that intersect the Chapter period. The
  // caller supplies `healthStartDate` / `healthEndDate` as ISO date
  // strings (YYYY-MM-DD) in the template's local timezone; they
  // match the way the client writer stamps `local_date`. Omitting
  // them yields an empty health array — legacy callers and tests
  // are unchanged.
  const healthQuery = options?.healthStartDate && options?.healthEndDate
    ? admin
        .from('kwilt_health_daily')
        .select(
          'local_date, timezone, steps_count, active_minutes, workouts_count, sleep_hours, mindfulness_minutes',
        )
        .eq('user_id', userId)
        .gte('local_date', options.healthStartDate)
        .lt('local_date', options.healthEndDate)
    : null;

  const [arcsRes, goalsRes, actsRes, healthRes] = await Promise.all([
    admin.from('kwilt_arcs').select('id,data').eq('user_id', userId),
    admin.from('kwilt_goals').select('id,data').eq('user_id', userId),
    admin.from('kwilt_activities').select('id,data').eq('user_id', userId),
    healthQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  if (arcsRes.error) return { ok: false as const, error: arcsRes.error };
  if (goalsRes.error) return { ok: false as const, error: goalsRes.error };
  if (actsRes.error) return { ok: false as const, error: actsRes.error };
  // Health failures are non-fatal — a pre-Phase-4 project (table
  // missing) or an RLS misconfig shouldn't kill Chapter generation.
  // We log and degrade to "no health signal" rather than failing the
  // whole row.
  if (healthRes?.error) {
    // eslint-disable-next-line no-console
    console.warn('[chapters-generate] kwilt_health_daily read failed', {
      userId,
      error: (healthRes.error as any)?.message ?? String(healthRes.error),
    });
  }

  const activities: Activity[] = (Array.isArray(actsRes.data) ? actsRes.data : []).map((r: any) => {
    const data = typeof r?.data === 'object' && r?.data ? r.data : {};
    // Ensure `id` field is present even if data misses it.
    return { id: String(r.id), ...(data as any) } as Activity;
  });

  const healthDaily: HealthDailyRow[] = Array.isArray(healthRes?.data)
    ? (healthRes.data as HealthDailyRow[])
    : [];

  return {
    ok: true as const,
    arcs: Array.isArray(arcsRes.data) ? arcsRes.data : [],
    goals: Array.isArray(goalsRes.data) ? goalsRes.data : [],
    activities,
    healthDaily,
  };
}

async function getPriorReadyChapter(admin: any, params: {
  userId: string;
  templateId: string;
  periodStartIso: string;
  // Phase 8 governance context: the *current* period's live arcs /
  // goals indexed by id. Used to look up the `resulting_title` for
  // `acted_on` outcomes — we want the Arc's current title (which the
  // user may have edited), not the nominated token.
  arcById: Record<string, any>;
  goalById: Record<string, any>;
}): Promise<PriorChapterContext> {
  const { data, error } = await admin
    .from('kwilt_chapters')
    .select(
      'id, output_json, metrics, period_key, period_start, period_end, status, user_note, user_note_updated_at',
    )
    .eq('user_id', params.userId)
    .eq('template_id', params.templateId)
    .eq('status', 'ready')
    .lt('period_start', params.periodStartIso)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const out = (data as any).output_json ?? null;
  const met = (data as any).metrics ?? null;
  const periodLabel = typeof out?.period?.label === 'string' ? out.period.label : null;
  const title = typeof out?.title === 'string' ? out.title : null;
  const dek = typeof out?.dek === 'string' ? out.dek : null;
  const chosen = typeof out?.chosen_hook_id === 'string' ? out.chosen_hook_id : null;
  const completed = typeof met?.activities?.completed_count === 'number' ? met.activities.completed_count : null;
  const activeDays = typeof met?.time_shape?.active_days_count === 'number' ? met.time_shape.active_days_count : null;
  const streak = typeof met?.time_shape?.longest_active_streak_days === 'number' ? met.time_shape.longest_active_streak_days : null;

  const rawArcs = Array.isArray(met?.arcs) ? met.arcs : [];
  const arcs: PriorChapterArc[] = rawArcs.map((a: any) => ({
    arc_id: typeof a?.arc_id === 'string' ? a.arc_id : null,
    arc_title: typeof a?.arc_title === 'string' ? a.arc_title : null,
    completed_count: typeof a?.completed_count === 'number' ? a.completed_count : null,
    active_days_count: typeof a?.active_days_count === 'number' ? a.active_days_count : null,
    activity_count_total: typeof a?.activity_count_total === 'number' ? a.activity_count_total : null,
  }));

  // Phase 7.2: carry the prior user note into the next chapter's
  // context. We bound it to a generous character limit so an
  // accidentally-pasted wall of text can't blow up the prompt budget;
  // anything longer than 500 chars is already truncated at write time
  // by `update_kwilt_chapter_user_note`, but the extra guard here
  // defends against pre-Phase-7 rows that may have been backfilled.
  const rawNote = typeof (data as any).user_note === 'string' ? (data as any).user_note : null;
  const noteTrimmed = rawNote ? rawNote.trim() : '';
  const userNote = noteTrimmed.length > 0 ? noteTrimmed.slice(0, 500) : null;
  const userNoteUpdatedAt =
    typeof (data as any).user_note_updated_at === 'string'
      ? (data as any).user_note_updated_at
      : null;

  // Phase 8: load the recommendation outcomes for this prior chapter
  // and join them against the prior `output_json.recommendations[]`
  // metadata so the prompt receives the full picture (what was
  // nominated, what the user did, what got created). This is a
  // read-only join; the generator never mutates the events table.
  const priorChapterId = typeof (data as any).id === 'string' ? (data as any).id : null;
  const priorRecs = Array.isArray(out?.recommendations) ? out.recommendations : [];
  const priorRecById = new Map<string, any>();
  for (const r of priorRecs) {
    const id = typeof r?.id === 'string' ? r.id : '';
    if (!id) continue;
    priorRecById.set(id, r);
  }

  let recommendationOutcomes: PriorChapterRecommendationOutcome[] = [];
  if (priorChapterId) {
    const { data: evRows } = await admin
      .from('kwilt_chapter_recommendation_events')
      .select('recommendation_id, kind, action, resulting_object_id')
      .eq('user_id', params.userId)
      .eq('chapter_id', priorChapterId);
    const events: Array<{
      recommendation_id: string;
      kind: string;
      action: string;
      resulting_object_id: string | null;
    }> = Array.isArray(evRows) ? (evRows as any) : [];

    for (const ev of events) {
      const kind = ev.kind;
      const action = ev.action;
      if (
        (kind !== 'arc' && kind !== 'goal' && kind !== 'align' && kind !== 'activity') ||
        (action !== 'acted_on' && action !== 'dismissed' && action !== 'ignored')
      ) {
        continue;
      }
      const rec = priorRecById.get(ev.recommendation_id) ?? null;
      const payload = rec?.payload ?? {};
      const nominatedTitle = typeof payload?.title === 'string' ? payload.title : null;
      const arcTitleFromPayload =
        typeof payload?.arcTitle === 'string' ? payload.arcTitle : null;
      const resultingId =
        typeof ev.resulting_object_id === 'string' && ev.resulting_object_id
          ? ev.resulting_object_id
          : null;

      let resultingTitle: string | null = null;
      let arcTitle: string | null = arcTitleFromPayload;
      if (resultingId) {
        if (kind === 'arc') {
          const arcRow = (params.arcById as any)?.[resultingId];
          if (arcRow && typeof arcRow.title === 'string') {
            resultingTitle = arcRow.title;
          }
        } else if (kind === 'goal' || kind === 'align') {
          const goalRow = (params.goalById as any)?.[resultingId];
          if (goalRow && typeof goalRow.title === 'string') {
            resultingTitle = goalRow.title;
          }
          const goalArcId =
            goalRow && typeof goalRow.arc_id === 'string' ? goalRow.arc_id : null;
          if (goalArcId) {
            const arcRow = (params.arcById as any)?.[goalArcId];
            if (arcRow && typeof arcRow.title === 'string') {
              arcTitle = arcRow.title;
            }
          }
        }
      }

      recommendationOutcomes.push({
        recommendation_id: ev.recommendation_id,
        kind: kind as PriorChapterRecommendationOutcome['kind'],
        action: action as PriorChapterRecommendationOutcome['action'],
        resulting_object_id: resultingId,
        nominated_title: nominatedTitle,
        resulting_title: resultingTitle,
        arc_title: arcTitle,
      });
    }
  }

  return {
    title,
    dek,
    chosen_hook_id: chosen,
    period_label: periodLabel,
    completed_count: completed,
    active_days_count: activeDays,
    longest_streak_days: streak,
    arcs,
    user_note: userNote,
    user_note_updated_at: userNote ? userNoteUpdatedAt : null,
    recommendation_outcomes: recommendationOutcomes,
  };
}

async function getExistingChapter(admin: any, params: { userId: string; templateId: string; periodKey: string }) {
  const { data, error } = await admin
    .from('kwilt_chapters')
    .select('id,status')
    .eq('user_id', params.userId)
    .eq('template_id', params.templateId)
    .eq('period_key', params.periodKey)
    .maybeSingle();
  if (error) return { ok: false as const, error };
  if (!data) return { ok: true as const, row: null };
  const status = typeof (data as any)?.status === 'string' ? String((data as any).status) : null;
  return { ok: true as const, row: { id: String((data as any).id), status } };
}

async function upsertChapter(
  admin: any,
  params: {
    template: TemplateRow;
    period: Period;
    inputSummary: any;
    metrics: ChapterMetrics;
    outputJson: any | null;
    status: 'pending' | 'ready' | 'failed';
    errorText?: string | null;
  }
) {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin.from('kwilt_chapters').upsert(
    {
      user_id: params.template.user_id,
      template_id: params.template.id,
      period_start: params.period.start.toISO(),
      period_end: params.period.end.toISO(),
      period_key: params.period.key,
      input_summary: params.inputSummary,
      metrics: params.metrics,
      output_json: params.outputJson,
      status: params.status,
      error: params.status === 'failed' ? (params.errorText ?? 'Generation failed') : null,
      updated_at: nowIso,
    },
    { onConflict: 'user_id,template_id,period_key' }
  ).select('id').maybeSingle();
  const chapterId = typeof (data as any)?.id === 'string' ? String((data as any).id) : null;
  return { ok: !error, error: error ?? null, chapterId };
}

type ManualBody = {
  template_id?: unknown;
  templateId?: unknown; // backward compat
  limit?: unknown;
  force?: unknown;
  periodOffset?: unknown;
  start?: unknown;
  end?: unknown;
  periodStart?: unknown; // backward compat
  periodEnd?: unknown; // backward compat
  periodKey?: unknown; // backward compat (ignored for new manual key)
};

serve(async (req) => {
  // Cron: allow GET; manual: POST.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return json(503, { error: { message: 'Supabase not configured' } });

  const isManual = req.method === 'POST';
  const body = (isManual ? ((await req.json().catch(() => null)) as ManualBody | null) : null) ?? null;

  const manualUserId = isManual ? await requireUserId(req) : null;
  if (isManual && !manualUserId) {
    return json(401, { error: { message: 'Unauthorized' } });
  }

  const templateIdRaw =
    typeof body?.template_id === 'string'
      ? body.template_id.trim()
      : typeof body?.templateId === 'string'
        ? body.templateId.trim()
        : null;
  const limit = clampInt(body?.limit, 50, 1, 500);
  const force = Boolean(body && (body as any).force === true);
  const periodOffset = clampInt((body as any)?.periodOffset, 0, 0, 260);
  const startDate =
    typeof (body as any)?.start === 'string'
      ? String((body as any).start).trim()
      : typeof (body as any)?.periodStart === 'string'
        ? String((body as any).periodStart).trim()
        : '';
  const endDate =
    typeof (body as any)?.end === 'string'
      ? String((body as any).end).trim()
      : typeof (body as any)?.periodEnd === 'string'
        ? String((body as any).periodEnd).trim()
        : '';

  const templateParams = {
    templateId: templateIdRaw && templateIdRaw.length > 0 ? templateIdRaw : null,
    // Manual runs are scoped to the caller; scheduled runs are global.
    userId: isManual ? manualUserId : null,
    // Manual runs bypass the `enabled=true` gate so a user tapping "Generate"
    // with an explicit templateId always works regardless of their cron opt-in
    // state. Scheduled runs keep the gate to avoid generating for users who
    // turned auto-generation off.
    requireEnabled: !(isManual && templateIdRaw && templateIdRaw.length > 0),
  };

  const templatesRes = await listTemplates(admin, templateParams);
  if (!templatesRes.ok) {
    return json(502, { error: { message: 'Template query failed', detail: templatesRes.error.message } });
  }

  const templates = templatesRes.rows.slice(0, limit);
  const results: Array<{
    templateId: string;
    userId: string;
    periodKey?: string;
    ok: boolean;
    action: 'generated' | 'skipped' | 'failed';
    reason?: string;
    error?: string;
  }> = [];

  for (const t of templates) {
    // Scheduled run should ignore manual templates.
    if (!isManual && t.cadence === 'manual') continue;

    const period = startDate && endDate
      ? parseManualRange({ timezone: t.timezone, startDate, endDate })
      : nthCompletePeriod({ cadence: t.cadence, timezone: t.timezone, offset: periodOffset });
    if (!period) {
      results.push({ templateId: t.id, userId: t.user_id, ok: false, action: 'failed', error: 'invalid period' });
      continue;
    }

    const existing = await getExistingChapter(admin, { userId: t.user_id, templateId: t.id, periodKey: period.key });
    if (!existing.ok) {
      results.push({
        templateId: t.id,
        userId: t.user_id,
        periodKey: period.key,
        ok: false,
        action: 'failed',
        error: existing.error.message,
      });
      continue;
    }
    if (!force && existing.row?.status === 'ready') {
      results.push({
        templateId: t.id,
        userId: t.user_id,
        periodKey: period.key,
        ok: true,
        action: 'skipped',
        reason: 'already_ready',
      });
      continue;
    }

    // Phase 4-backend: bound the `kwilt_health_daily` read to the
    // Chapter period in the template's local timezone. `local_date` is
    // stored as a DATE stamped by the writer in the user's tz, so we
    // compare against the tz-local calendar day of `period.start`
    // (inclusive) and `period.end` (exclusive) — matches how every
    // other metric in this function buckets time.
    const healthStartDate = period.start.setZone(validZoneOrUtc(t.timezone)).toISODate();
    const healthEndDate = period.end.setZone(validZoneOrUtc(t.timezone)).toISODate();
    const domainRes = await loadUserDomain(admin, t.user_id, {
      healthStartDate: healthStartDate ?? undefined,
      healthEndDate: healthEndDate ?? undefined,
    });
    if (!domainRes.ok) {
      results.push({
        templateId: t.id,
        userId: t.user_id,
        periodKey: period.key,
        ok: false,
        action: 'failed',
        error: domainRes.error.message,
      });
      continue;
    }

    const tz = validZoneOrUtc(t.timezone);

    const inPeriod = domainRes.activities.filter((a) => {
      const candidates = [a.createdAt, a.startedAt, a.completedAt, a.updatedAt].filter(
        (s): s is string => typeof s === 'string' && Boolean(s),
      );
      return candidates.some((iso) => isIsoWithin(iso, period.start, period.end));
    });

    const carriedForward = domainRes.activities.filter((a) => {
      const creationMs = parseIsoMs(a.createdAt) ?? parseIsoMs(a.startedAt) ?? parseIsoMs(a.updatedAt) ?? parseIsoMs(a.completedAt);
      if (creationMs == null) return false;
      if (creationMs >= period.start.toMillis()) return false;
      const completedMs = parseIsoMs(a.completedAt) ?? (isDoneStatus(a.status) ? parseIsoMs(a.updatedAt) : null);
      if (completedMs != null && completedMs < period.start.toMillis()) return false;
      // Treat planned/in_progress tasks as "active"; skip cancelled/skipped.
      const status = typeof a.status === 'string' ? a.status : '';
      if (status === 'cancelled' || status === 'skipped') return false;
      return true;
    });

    const rawFilter = safeJson<any>(t.filter_json, []);
    const filterGroups = Array.isArray(rawFilter)
      ? safeJson<FilterGroup[]>(rawFilter, [])
      : safeJson<FilterGroup[]>(rawFilter?.groups, []);
    const groupLogic: FilterGroupLogic = t.filter_group_logic === 'and' ? 'and' : 'or';
    const candidates = [...inPeriod, ...carriedForward].reduce((acc: Activity[], a) => {
      if (acc.some((x) => x.id === a.id)) return acc;
      acc.push(a);
      return acc;
    }, []);
    const included = applyActivityFilters(candidates, filterGroups, groupLogic);

    const arcById: Record<string, any> = {};
    for (const a of domainRes.arcs as any[]) {
      const id = typeof a?.id === 'string' ? a.id : null;
      if (!id) continue;
      const d = typeof a?.data === 'object' && a.data ? a.data : {};
      arcById[id] = {
        id,
        title: (d as any)?.title ?? (d as any)?.name ?? null,
        description: (d as any)?.description ?? null,
      };
    }
    const goalById: Record<string, any> = {};
    for (const g of domainRes.goals as any[]) {
      const id = typeof g?.id === 'string' ? g.id : null;
      if (!id) continue;
      const d = typeof g?.data === 'object' && g.data ? g.data : {};
      goalById[id] = {
        id,
        arc_id: (d as any)?.arcId ?? (d as any)?.arc_id ?? null,
        title: (d as any)?.title ?? (d as any)?.name ?? null,
        description: (d as any)?.description ?? null,
      };
    }

    const { metrics, noteworthy_examples } = computeDeterministicMetrics({
      template: t,
      period,
      activitiesAll: domainRes.activities,
      activitiesIncluded: included,
      arcById,
      goalById,
      healthDaily: domainRes.healthDaily ?? null,
    });

    const endDisplay = period.end.minus({ days: 1 });
    const periodLabel = `${period.start.toFormat('LLL d, yyyy')} – ${endDisplay.toFormat('LLL d, yyyy')}`;

    const inputSummary = {
      period: { key: period.key, start: period.start.toISO(), end: period.end.toISO(), timezone: tz, label: periodLabel, days: metrics.period_days },
      counts: {
        arcs: domainRes.arcs.length,
        goals: domainRes.goals.length,
        activities_in_period: inPeriod.length,
        activities_carried_forward: carriedForward.length,
        activities_included: included.length,
      },
      filter: {
        group_logic: groupLogic,
        groups: filterGroups,
      },
      noteworthy_examples,
    };

    const pendingWrite = await upsertChapter(admin, {
      template: t,
      period,
      inputSummary,
      metrics,
      outputJson: null,
      status: 'pending',
      errorText: null,
    });
    if (!pendingWrite.ok) {
      results.push({
        templateId: t.id,
        userId: t.user_id,
        periodKey: period.key,
        ok: false,
        action: 'failed',
        error: pendingWrite.error?.message,
      });
      continue;
    }

    const stableContext = {
      arcs: Object.values(arcById),
      goals: Object.values(goalById),
    };

    // Evidence packaging: include noteworthy + most recent 50 as "full"; keep compact list for all included.
    const noteworthyIds = new Set(noteworthy_examples.map((e) => e.activity_id));
    const includedSortedByTime = included
      .slice()
      .sort((a, b) => (parseIsoMs(pickActivityTimeIso(b)) ?? 0) - (parseIsoMs(pickActivityTimeIso(a)) ?? 0));
    const recentFull = includedSortedByTime.slice(0, 50);
    const activitiesFull = [...recentFull]
      .concat(included.filter((a) => noteworthyIds.has(String(a.id))))
      .reduce((acc: any[], a) => {
        if (acc.some((x) => x.activity_id === String(a.id))) return acc;
        acc.push({
          activity_id: String(a.id),
          title: clampText(a.title ?? '', 140),
          status: typeof a.status === 'string' ? a.status : null,
          arc_id: a.arcId ?? null,
          goal_id: a.goalId ?? null,
          created_at: typeof a.createdAt === 'string' ? a.createdAt : null,
          started_at: typeof a.startedAt === 'string' ? a.startedAt : null,
          completed_at: typeof a.completedAt === 'string' ? a.completedAt : null,
          notes_snippet: extractNotesSnippet(a),
          tags: Array.isArray(a.tags) ? a.tags.slice(0, 10) : [],
        });
        return acc;
      }, []);

    const activitiesCompact = included.map((a) => ({
      activity_id: String(a.id),
      status: typeof a.status === 'string' ? a.status : null,
      arc_id: a.arcId ?? null,
      goal_id: a.goalId ?? null,
      created_at: typeof a.createdAt === 'string' ? a.createdAt : null,
      started_at: typeof a.startedAt === 'string' ? a.startedAt : null,
      completed_at: typeof a.completedAt === 'string' ? a.completedAt : null,
    }));

    const leadExamples = noteworthy_examples.slice(0, 2);
    const storyHooks = buildStoryHooks({ metrics, noteworthy_examples });

    // Prior chapter (same template, earlier period, status=ready) for continuity.
    // Phase 8: arcById/goalById give the loader the live titles for
    // `acted_on` outcomes' resulting objects, so the prompt can cite
    // the current name (e.g. the user may have renamed "Fitness" to
    // "Health" between weeks).
    const priorChapter = await getPriorReadyChapter(admin, {
      userId: t.user_id,
      templateId: t.id,
      periodStartIso: period.start.toISO() ?? '',
      arcById,
      goalById,
    });

    // Phase 8 governance — load the sleep-window dismissals. Any
    // recommendation id the user dismissed in the last 90 days should
    // not re-surface on this Chapter even if the deterministic
    // trigger would otherwise fire.
    const SLEEP_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
    const sleepCutoffIso = new Date(Date.now() - SLEEP_WINDOW_MS).toISOString();
    const { data: dismissedRows } = await admin
      .from('kwilt_chapter_recommendation_events')
      .select('recommendation_id, updated_at')
      .eq('user_id', t.user_id)
      .eq('action', 'dismissed')
      .gte('updated_at', sleepCutoffIso);
    const dismissedRecommendationIds = new Set<string>(
      Array.isArray(dismissedRows)
        ? (dismissedRows as any[])
            .map((r) => (typeof r?.recommendation_id === 'string' ? r.recommendation_id : ''))
            .filter((s) => s.length > 0)
        : [],
    );

    // Phase 3.2: fold week-over-week arc deltas into metrics.arcs[] so the
    // prompt can cite them and the client can render arc lanes. Deltas are
    // computed before prompt assembly so the LLM sees them; the mutation is
    // in-place on the same metrics object written to kwilt_chapters.metrics.
    augmentArcsWithDeltas(metrics, priorChapter?.arcs ?? null);

    const allowedIds = new Set<string>([
      ...noteworthy_examples.map((e) => e.activity_id),
      ...activitiesFull.map((a: any) => (typeof a?.activity_id === 'string' ? a.activity_id : '')).filter(Boolean),
    ]);
    const allowedHookIds = new Set<string>(storyHooks.map((h) => h.hook_id));
    const activityTitlesById = new Map<string, string>();
    for (const a of activitiesFull as any[]) {
      const id = typeof a?.activity_id === 'string' ? a.activity_id : '';
      const title = typeof a?.title === 'string' ? a.title : '';
      if (id && title) activityTitlesById.set(id, title);
    }
    const arcTitles = Object.values(arcById)
      .map((a: any) => (typeof a?.title === 'string' ? a.title : ''))
      .filter((s) => s.length > 0);
    const goalTitles = Object.values(goalById)
      .map((g: any) => (typeof g?.title === 'string' ? g.title : ''))
      .filter((s) => s.length > 0);
    const noteSnippets = (activitiesFull as any[])
      .map((a) => (typeof a?.notes_snippet === 'string' ? a.notes_snippet : ''))
      .filter((s) => s.trim().length > 0);

    const runOnce = async (stricter: boolean) =>
      callOpenAiForChapter({
        template: t,
        period,
        periodLabel,
        metrics,
        stableContext,
        evidence: {
          activities_full: activitiesFull,
          activities_compact: activitiesCompact,
          noteworthy_examples,
          lead_examples: leadExamples,
          story_hooks: storyHooks,
          filter_snapshot: inputSummary.filter,
        },
        priorChapter,
        stricter,
      });

    const validate = (out: any, strict: boolean) =>
      validateChapterOutput({
        outputJson: out,
        period,
        periodLabel,
        allowedActivityIds: allowedIds,
        allowedHookIds,
        activityTitlesById,
        arcTitles,
        goalTitles,
        noteSnippets,
        cadence: t.cadence,
        strict,
        // Phase 8: prior-chapter Next Step outcomes feed the
        // continuity-citation validator rule. Null-safe; an empty
        // list short-circuits the check.
        priorRecommendationOutcomes: priorChapter?.recommendation_outcomes ?? [],
        // Phase 4-backend: when metrics.health is absent, reject any
        // health-keyword prose to stop the model from inventing
        // movement/sleep data. When present, the positive rule is
        // already covered by the generic per-paragraph anchor check.
        hasHealth: Boolean((metrics as any)?.health),
      });

    let aiRes = await runOnce(false);
    let finalOk = aiRes.ok;
    let finalError: string | null = aiRes.ok ? null : aiRes.error;
    let outputJson: any | null = aiRes.ok ? aiRes.outputJson : null;

    if (aiRes.ok) {
      const validation = validate(aiRes.outputJson, false);
      if (!validation.ok) {
        // Retry once with a stricter prompt variant — stronger enforcement +
        // lower temperature — before we write `failed`.
        const retry = await runOnce(true);
        if (retry.ok) {
          const revalidation = validate(retry.outputJson, true);
          if (revalidation.ok) {
            aiRes = retry;
            outputJson = retry.outputJson;
            finalOk = true;
            finalError = null;
          } else {
            finalOk = false;
            finalError = `AI output validation failed after retry: ${revalidation.error} (first error: ${validation.error})`;
            outputJson = null;
          }
        } else {
          finalOk = false;
          finalError = `AI output validation failed: ${validation.error} (retry error: ${retry.error})`;
          outputJson = null;
        }
      }
    }

    // Phases 5–6: deterministic Next Steps recommendations are computed
    // server-side AFTER the LLM pass succeeds. They are not subject to
    // AI-output validation (they are pure functions of
    // metrics + evidence). Only attach when the Chapter is ready; a failed
    // Chapter has no output_json surface to hang them on. The
    // implementation lives in `_shared/chapterRecommendations.ts` so it
    // can be unit-tested from Jest (the Deno-only bits of this file can't
    // be). The orchestrator runs all kinds (`arc`, `goal`, `align`),
    // dedupes cross-kind overlap, and applies the 3-cap + priority
    // ordering.
    if (finalOk && outputJson && typeof outputJson === 'object') {
      // Build the goalsByArcId lookup the orchestrator needs to gate
      // Goal nominations (don't re-nominate a Goal that's already there
      // under the Arc).
      const goalsByArcId: Record<
        string,
        Array<{ id: string; arcId: string | null; title: string | null }>
      > = {};
      const goalsFlat: Array<{ id: string; arcId: string | null; title: string | null }> = [];
      for (const g of Object.values(goalById) as any[]) {
        const gArc = typeof g?.arc_id === 'string' ? g.arc_id : null;
        const entry = {
          id: typeof g?.id === 'string' ? g.id : '',
          arcId: gArc,
          title: typeof g?.title === 'string' ? g.title : null,
        };
        goalsFlat.push(entry);
        if (!gArc) continue;
        const list = goalsByArcId[gArc] ?? [];
        list.push(entry);
        goalsByArcId[gArc] = list;
      }
      // Compute EFFECTIVE arcId per activity. Activities in the client
      // model only carry `goalId` — their Arc is `goal.arcId`. Without
      // this derivation, Phase 5's `!a.arcId` filter treats every
      // activity as "no Arc" regardless of its goal, over-firing Arc
      // nominations. The effective-arc lookup fixes that and makes the
      // Phase 6 Goal / Align triggers land on real data.
      // Phase 8 governance — derive the arc/goal-token suppression
      // sets. An Arc token is "covered" when any existing Arc's head
      // token matches it. Same for Goals. This catches the
      // "out-of-band creation" case the plan calls out: if the user
      // created a matching Arc this week through any path (Next Step
      // CTA, Arcs tab "+", onboarding), the trigger shouldn't
      // re-nominate the same theme. The check is deliberate in the
      // governance layer (not the per-trigger check above) because
      // per-trigger gates only look at the trigger's own
      // dataset — the Arc-nom gate checks `arcTitles[i].includes(token)`,
      // which fails when the user named the Arc "Health" but the
      // untagged cluster still reads "fitness".
      const suppressedArcTokens = new Set<string>();
      for (const arc of Object.values(arcById) as any[]) {
        const title = typeof arc?.title === 'string' ? arc.title.toLowerCase() : '';
        const head = title.match(/[a-z]{4,}/)?.[0];
        if (head) suppressedArcTokens.add(head);
      }
      const suppressedGoalTokens = new Set<string>();
      for (const goal of goalsFlat) {
        const title = typeof goal?.title === 'string' ? goal.title.toLowerCase() : '';
        const head = title.match(/[a-z]{4,}/)?.[0];
        if (head) suppressedGoalTokens.add(head);
      }

      const recommendations: ChapterRecommendation[] = sharedComputeChapterRecommendations({
        activitiesIncluded: included.map((a) => {
          const goalId = a.goalId ?? null;
          const directArcId = typeof a.arcId === 'string' && a.arcId ? a.arcId : null;
          const viaGoalArcId = goalId && (goalById as any)[goalId]
            ? ((goalById as any)[goalId].arc_id ?? null)
            : null;
          return {
            id: String(a.id),
            title: typeof a.title === 'string' ? a.title : null,
            arcId: directArcId ?? viaGoalArcId ?? null,
            goalId,
          };
        }),
        arcById: Object.fromEntries(
          Object.entries(arcById).map(([k, v]) => [
            k,
            {
              id: k,
              title: typeof (v as any)?.title === 'string' ? (v as any).title : null,
            },
          ]),
        ),
        goalsByArcId,
        goalsAll: goalsFlat,
        dismissedRecommendationIds,
        suppressedArcTokens,
        suppressedGoalTokens,
      });
      (outputJson as any).recommendations = recommendations;
    }

    const writeRes = await upsertChapter(admin, {
      template: t,
      period,
      inputSummary,
      metrics,
      outputJson,
      status: finalOk ? 'ready' : 'failed',
      errorText: finalOk ? null : finalError,
    });
    if (!writeRes.ok) {
      results.push({
        templateId: t.id,
        userId: t.user_id,
        periodKey: period.key,
        ok: false,
        action: 'failed',
        error: writeRes.error?.message,
      });
      continue;
    }

    // Email delivery: send a digest email if the template opts in and the chapter succeeded.
    let emailed = false;
    if (finalOk && t.email_enabled && t.email_recipient) {
      try {
        const { data: emailPrefs } = await admin
          .from('kwilt_email_preferences')
          .select('chapter_digest')
          .eq('user_id', t.user_id)
          .maybeSingle();
        const digestOptedOut = emailPrefs && (emailPrefs as any).chapter_digest === false;
        if (!digestOptedOut) {
          const chapterTitle = typeof outputJson?.title === 'string' ? outputJson.title : (t.name ?? 'Your chapter');
          const chapterId = writeRes.chapterId ?? '';
          const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
          const fromEmail = (Deno.env.get('KWILT_DRIP_EMAIL_FROM') ?? 'hello@mail.kwilt.app').trim();
          if (resendKey && chapterId) {
            // Phase 7.1: build unsubscribe headers up front; the visible URL
            // is threaded into the template footer, the headers land on the
            // Resend request. `chapter_digest` is the preference category.
            const unsub = await buildUnsubscribeHeaders({
              userId: t.user_id,
              category: 'chapter_digest',
            });
            // The template now extracts the narrative snippet from
            // `outputJson.sections.story.body` (the canonical generator field)
            // and humanizes the period label internally — see
            // `supabase/functions/_shared/emailTemplates.ts`
            // (`extractChapterSnippet`) and `_shared/periodLabels.ts`.
            const emailContent = buildChapterDigestEmail({
              chapterTitle,
              outputJson,
              chapterId,
              cadence: t.cadence,
              periodStartIso: period.start.toISO() ?? '',
              periodEndIso: period.end.toISO() ?? '',
              timezone: t.timezone,
              unsubscribeUrl: unsub?.visibleUrl,
            });
            const outcome = await sendEmailViaResend({
              resendKey,
              from: fromEmail,
              to: t.email_recipient,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              campaign: 'chapter_digest',
              userId: t.user_id,
              admin,
              extraHeaders: unsub?.headers,
            });
            if (outcome.ok) {
              emailed = true;
              await admin
                .from('kwilt_chapters')
                .update({ emailed_at: new Date().toISOString() })
                .eq('user_id', t.user_id)
                .eq('template_id', t.id)
                .eq('period_key', period.key);
              // Phase 7.3: record the send in the cadence ledger for the
              // per-user daily cap. Chapter digest can recur weekly/monthly,
              // so the message_key includes the period to keep dedup scoped
              // to that period only.
              await admin
                .from('kwilt_email_cadence')
                .insert({
                  user_id: t.user_id,
                  message_key: `chapter_digest_${period.key}`,
                  metadata: {
                    chapter_id: chapterId,
                    cadence: t.cadence,
                    campaign: 'chapter_digest',
                    resend_id: outcome.resendId ?? null,
                  },
                })
                .then(() => null, () => null);
            }
          }
        }
      } catch { /* best-effort email delivery */ }
    }

    results.push({
      templateId: t.id,
      userId: t.user_id,
      periodKey: period.key,
      ok: true,
      action: finalOk ? 'generated' : 'failed',
      ...(finalOk ? null : { error: finalError ?? 'AI generation failed' }),
      ...(emailed ? { emailed: true } : null),
    });
  }

  return json(200, { ok: true, mode: isManual ? 'manual' : 'scheduled', processed: results.length, results });
});



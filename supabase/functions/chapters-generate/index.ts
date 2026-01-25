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
// - Email delivery is wired in later phases (see docs/chapters-build-plan.md).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { DateTime } from 'npm:luxon@3.5.0';
import { getSupabaseAdmin, json, requireUserId } from '../_shared/calendarUtils.ts';

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
}): { metrics: ChapterMetrics; noteworthy_examples: NoteworthyExample[] } {
  const { template, period, activitiesAll, activitiesIncluded, arcById, goalById } = params;
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

  return { metrics, noteworthy_examples };
}

function resolveChaptersModel(): string {
  const raw = (Deno.env.get('KWILT_CHAPTERS_MODEL') ?? '').trim();
  return raw || 'gpt-4o-mini';
}

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
}) {
  const { template, period, periodLabel, metrics, stableContext, evidence } = params;
  const tz = validZoneOrUtc(template.timezone);
  const kind = template.kind;
  const tone = (template.tone ?? '').trim() || (kind === 'report' ? 'neutral' : 'gentle');
  const detail = (template.detail_level ?? '').trim() || 'medium';

  const system = [
    `You write "Chapters": AI-generated, investigative-reporter-voiced reflections.`,
    `Non-negotiables: never invent facts; celebration must emerge from evidence; never shame.`,
    `You MAY reference numbers only if they appear in the provided metrics object.`,
    `You MUST only mention activities that appear in evidence.noteworthy_examples or evidence.activities_full.`,
    `When you mention an activity, you MUST include its activity_id in citations.examples_used.`,
    `Output MUST be valid JSON (no markdown fences) matching the provided output schema exactly.`,
    `Write like an article: a newsworthy headline + dek + a cohesive narrative with subheads.`,
    `Avoid a "list of sections" feel; the story should read end-to-end like a reported piece.`,
    `Anti-generic rule: do not use vague praise (e.g., "meaningful", "remarkable", "balance", "growth") unless you immediately justify it with a metric or a quoted activity title from evidence.`,
    `Hard constraint: every paragraph in story.body must include at least ONE concrete anchor: (a) a number from metrics, OR (b) a quoted activity title, OR (c) a named arc/goal title from stable_context.`,
    `Banned phrases (do not use): "This chapter highlights", "Reflecting on", "a week of growth", "meaningful activities".`,
    `Tone: investigative reporter, celebratory, reality-anchored. Kind: ${kind}. User tone hint: ${tone}. Detail level: ${detail}.`,
    `Forbidden: inventing intent/emotion, shaming language ("should have", "failed to"), ungrounded superlatives.`,
  ].join('\n');

  const user = {
    task: 'Generate a Chapter JSON using ONLY the provided stable context + deterministic metrics + evidence.',
    period: { start: period.start.toISO(), end: period.end.toISO(), label: periodLabel, timezone: tz, days: metrics.period_days },
    stable_context: stableContext,
    metrics,
    evidence,
    output_schema: {
      title: 'string',
      dek: 'string',
      period: { start: 'string', end: 'string', label: 'string' },
      sections: [
        { key: 'story', title: 'The Story', body: 'string (article body; include subheads inline)' },
        { key: 'where_time_went', title: 'Where the Work Landed', bullets: ['string'] },
        { key: 'forces', title: 'Your Forces', items: [{ force: 'string', body: 'string' }] },
        { key: 'highlights', title: 'Highlights', bullets: ['string'] },
        { key: 'patterns', title: 'Patterns', bullets: ['string'] },
        { key: 'next_experiments', title: 'Next Experiments', bullets: ['string'] },
      ],
      noteworthy_mentions: [{ activity_id: 'string', title: 'string', reason: 'string' }],
      citations: { metrics_used: true, examples_used: ['activity_id'] },
    },
    writing_requirements: {
      headline_rules: [
        `title must be a headline (no "Chapter:" prefix, no dates in title unless essential)`,
        `keep it specific and evidence-based (avoid generic "A Busy Week")`,
      ],
      dek_rules: [
        `dek should feel like a news dek: 1–2 sentences, concrete, metric/evidence anchored`,
      ],
      story_rules: [
        `story.body should be a cohesive article with 4–8 short subheads (e.g., "The numbers", "Where the work landed", "What moved", "What stayed quiet", "What changed midstream", "What to try next")`,
        `Length: target 900–1400 words for monthly/yearly, 600–1000 words for weekly/custom short ranges; never less than 5 substantial paragraphs.`,
        `Lead with a lede paragraph that feels reported and newsworthy, then a nut graf grounding the period + key metrics.`,
        `Angle rule: pick ONE story hook from evidence.story_hooks. Make the headline reflect that hook.`,
        `Open with the hook: lede must clearly state the hook in concrete terms.`,
        `Quote rule: include at least 4 quoted activity titles EXACTLY as given in evidence.activities_full (wrap titles in double quotes).`,
        `include at least 4–7 cited activity examples drawn from evidence.noteworthy_examples (and add their ids to citations.examples_used)`,
        `if there are "quiet" arcs/goals (low activity), mention neutrally (no shame)`,
        `Do not use numbered lists in the article body; use paragraphs + subheads.`,
      ],
      section_rules: [
        `Still populate the other sections, but keep them tiny; they should support the article, not replace it.`,
        `Hard caps: where_time_went.bullets max 3; highlights.bullets max 3; patterns.bullets max 3; next_experiments.bullets max 3; forces.items max 3.`,
        `Bullets/items must not introduce new facts beyond metrics + evidence; if unsure, omit.`,
      ],
    },
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
    filter_snapshot: any;
  };
}) {
  const key = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
  if (!key) return { ok: false as const, error: 'OPENAI_API_KEY not set' };

  const model = resolveChaptersModel();
  let maxTokens = resolveMaxOutputTokens({ detailLevel: params.template.detail_level, kind: params.template.kind });
  maxTokens = Math.max(maxTokens, params.metrics.period_days >= 180 ? 1900 : 1200);
  const temperature = resolveTemperature(params.template.kind, params.template.tone);
  const prompt = buildChapterPrompt({
    template: params.template,
    period: params.period,
    periodLabel: params.periodLabel,
    metrics: params.metrics,
    stableContext: params.stableContext,
    evidence: params.evidence,
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

function validateChapterOutput(params: {
  outputJson: any;
  period: Period;
  periodLabel: string;
  allowedActivityIds: Set<string>;
}): { ok: true } | { ok: false; error: string } {
  const { outputJson: out, period, periodLabel, allowedActivityIds } = params;
  const title = typeof out?.title === 'string' ? out.title.trim() : '';
  const dek = typeof out?.dek === 'string' ? out.dek.trim() : '';
  if (!title) return { ok: false, error: 'Output missing title' };
  if (!dek) return { ok: false, error: 'Output missing dek' };
  if (/^reflecting on\b/i.test(title)) return { ok: false, error: 'Title is generic/banned ("Reflecting on…")' };
  if (/^this chapter highlights\b/i.test(dek)) return { ok: false, error: 'Dek is generic/banned ("This chapter highlights…")' };

  const p = out?.period;
  if (!p || typeof p !== 'object') return { ok: false, error: 'Output missing period' };
  if (typeof p.start !== 'string' || typeof p.end !== 'string' || typeof p.label !== 'string') {
    return { ok: false, error: 'Output period is invalid' };
  }
  if (p.start !== period.start.toISO() || p.end !== period.end.toISO() || p.label !== periodLabel) {
    return { ok: false, error: 'Output period fields do not match canonical period' };
  }

  const sections = Array.isArray(out?.sections) ? out.sections : null;
  if (!sections) return { ok: false, error: 'Output missing sections array' };
  const requiredKeys = ['story', 'where_time_went', 'forces', 'highlights', 'patterns', 'next_experiments'];
  const keys = new Set(sections.map((s: any) => (typeof s?.key === 'string' ? s.key : null)).filter(Boolean));
  for (const k of requiredKeys) {
    if (!keys.has(k)) return { ok: false, error: `Output missing section: ${k}` };
  }

  const story = sections.find((s: any) => s && typeof s === 'object' && s.key === 'story');
  const body = typeof story?.body === 'string' ? story.body.trim() : '';
  if (!body) return { ok: false, error: 'story.body is missing' };
  if (body.length < 900) return { ok: false, error: 'story.body is too short (must be article-length)' };

  const citations = out?.citations;
  if (!citations || typeof citations !== 'object') return { ok: false, error: 'Output missing citations' };
  if (citations.metrics_used !== true) return { ok: false, error: 'citations.metrics_used must be true' };
  const examplesUsed = Array.isArray(citations.examples_used) ? citations.examples_used : null;
  if (!examplesUsed) return { ok: false, error: 'citations.examples_used must be an array' };
  if (examplesUsed.length < 4) return { ok: false, error: 'citations.examples_used must include at least 4 activity ids' };
  for (const id of examplesUsed) {
    if (typeof id !== 'string' || !id.trim()) return { ok: false, error: 'citations.examples_used contains invalid id' };
    if (!allowedActivityIds.has(id)) return { ok: false, error: `citations.examples_used references unknown activity_id: ${id}` };
  }

  const mentions = Array.isArray(out?.noteworthy_mentions) ? out.noteworthy_mentions : [];
  for (const m of mentions) {
    const id = typeof m?.activity_id === 'string' ? m.activity_id : null;
    if (!id || !allowedActivityIds.has(id)) return { ok: false, error: 'noteworthy_mentions references unknown activity_id' };
  }

  return { ok: true };
}

async function listTemplates(admin: any, params: { templateId?: string | null; userId?: string | null }) {
  let q = admin
    .from('kwilt_chapter_templates')
    .select(
      'id,user_id,name,kind,cadence,timezone,filter_json,filter_group_logic,email_enabled,email_recipient,detail_level,tone,enabled'
    )
    .eq('enabled', true);

  if (params.templateId) q = q.eq('id', params.templateId);
  if (params.userId) q = q.eq('user_id', params.userId);

  const { data, error } = await q;
  if (error) return { ok: false as const, error };
  return { ok: true as const, rows: (Array.isArray(data) ? (data as TemplateRow[]) : []) as TemplateRow[] };
}

async function loadUserDomain(admin: any, userId: string) {
  const [arcsRes, goalsRes, actsRes] = await Promise.all([
    admin.from('kwilt_arcs').select('id,data').eq('user_id', userId),
    admin.from('kwilt_goals').select('id,data').eq('user_id', userId),
    admin.from('kwilt_activities').select('id,data').eq('user_id', userId),
  ]);

  if (arcsRes.error) return { ok: false as const, error: arcsRes.error };
  if (goalsRes.error) return { ok: false as const, error: goalsRes.error };
  if (actsRes.error) return { ok: false as const, error: actsRes.error };

  const activities: Activity[] = (Array.isArray(actsRes.data) ? actsRes.data : []).map((r: any) => {
    const data = typeof r?.data === 'object' && r?.data ? r.data : {};
    // Ensure `id` field is present even if data misses it.
    return { id: String(r.id), ...(data as any) } as Activity;
  });

  return {
    ok: true as const,
    arcs: Array.isArray(arcsRes.data) ? arcsRes.data : [],
    goals: Array.isArray(goalsRes.data) ? goalsRes.data : [],
    activities,
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
  const { error } = await admin.from('kwilt_chapters').upsert(
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
  );
  return { ok: !error, error: error ?? null };
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

    const domainRes = await loadUserDomain(admin, t.user_id);
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

    const aiRes = await callOpenAiForChapter({
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
    });

    let finalOk = aiRes.ok;
    let finalError: string | null = aiRes.ok ? null : aiRes.error;
    let outputJson: any | null = aiRes.ok ? aiRes.outputJson : null;

    if (aiRes.ok) {
      const allowedIds = new Set<string>([
        ...noteworthy_examples.map((e) => e.activity_id),
        ...activitiesFull.map((a: any) => (typeof a?.activity_id === 'string' ? a.activity_id : '')).filter(Boolean),
      ]);
      const validation = validateChapterOutput({ outputJson: aiRes.outputJson, period, periodLabel, allowedActivityIds: allowedIds });
      if (!validation.ok) {
        finalOk = false;
        finalError = `AI output validation failed: ${validation.error}`;
        outputJson = null;
      }
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

    results.push({
      templateId: t.id,
      userId: t.user_id,
      periodKey: period.key,
      ok: true,
      action: finalOk ? 'generated' : 'failed',
      ...(finalOk ? null : { error: finalError ?? 'AI generation failed' }),
    });
  }

  return json(200, { ok: true, mode: isManual ? 'manual' : 'scheduled', processed: results.length, results });
});



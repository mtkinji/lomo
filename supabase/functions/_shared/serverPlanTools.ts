import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';
import {
  getPlanCandidateEligibility,
  sortActivitiesByPriorityRanking,
  type ActivityPriorityReasonCode,
  type ActivityPriorityState,
  type PlanPriorityActivity,
  type PlanPriorityGoal,
} from '../../../packages/kwilt-plan-core/src/index.ts';
import { calendarDateInTimeZone, normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';

type ReadResult = { data: unknown; error: unknown };
type ReadQuery = {
  select: (...args: unknown[]) => ReadQuery;
  eq: (...args: unknown[]) => ReadQuery;
  order: (...args: unknown[]) => ReadQuery;
  limit: (...args: unknown[]) => Promise<ReadResult>;
  maybeSingle: () => Promise<ReadResult>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isActivityPriorityState(value: unknown): value is ActivityPriorityState {
  return value === 'active' || value === 'later' || value === 'waiting' || value === 'needs_review';
}

function isActivityPriorityReasonCode(value: unknown): value is ActivityPriorityReasonCode {
  return value === 'explicit_priority' || value === 'goal_priority' || value === 'overdue'
    || value === 'due_today' || value === 'due_soon' || value === 'reminder_soon'
    || value === 'scheduled_later' || value === 'recently_updated' || value === 'started'
    || value === 'has_steps' || value === 'context_errands' || value === 'context_location'
    || value === 'context_surface' || value === 'unanchored' || value === 'later'
    || value === 'waiting' || value === 'needs_review' || value === 'moved_by_user';
}

function asPriority(value: unknown): 1 | 2 | 3 | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

type ServerPlanActivity = PlanPriorityActivity & { updatedAt: string };
type ServerPlanGoal = PlanPriorityGoal & { title: string };

function normalizeServerPlanActivity(value: unknown): ServerPlanActivity | null {
  const row = asRecord(value);
  const data = asRecord(row.data);
  const id = typeof row.id === 'string' && row.id ? row.id : typeof data.id === 'string' ? data.id : '';
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '';
  const updatedAt = typeof data.updatedAt === 'string' && data.updatedAt
    ? data.updatedAt
    : typeof row.updated_at === 'string' ? row.updated_at : '';
  if (!id || !title || !updatedAt) return null;
  const location = asRecord(data.location);
  const priorityState = isActivityPriorityState(data.priorityState) ? data.priorityState : undefined;
  const priorityRankSource = data.priorityRankSource === 'inferred' || data.priorityRankSource === 'auto'
    || data.priorityRankSource === 'manual' ? data.priorityRankSource : undefined;
  const priorityReasonCodes = Array.isArray(data.priorityReasonCodes)
    ? data.priorityReasonCodes.filter(isActivityPriorityReasonCode)
    : undefined;
  return {
    id, title, updatedAt,
    status: typeof data.status === 'string' ? data.status : 'planned',
    goalId: typeof data.goalId === 'string' ? data.goalId : null,
    type: typeof data.type === 'string' ? data.type : 'task',
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    notes: typeof data.notes === 'string' ? data.notes : null,
    location: Object.keys(location).length > 0
      ? { label: typeof location.label === 'string' ? location.label : null }
      : null,
    priority: asPriority(data.priority),
    ...(priorityState ? { priorityState } : {}),
    ...(priorityRankSource ? { priorityRankSource } : {}),
    ...(priorityReasonCodes ? { priorityReasonCodes } : {}),
    ...(typeof data.priorityRankKey === 'string' ? { priorityRankKey: data.priorityRankKey } : {}),
    ...(typeof data.orderIndex === 'number' && Number.isFinite(data.orderIndex) ? { orderIndex: data.orderIndex } : {}),
    scheduledDate: typeof data.scheduledDate === 'string' ? data.scheduledDate : null,
    scheduledAt: typeof data.scheduledAt === 'string' ? data.scheduledAt : null,
    reminderAt: typeof data.reminderAt === 'string' ? data.reminderAt : null,
    startedAt: typeof data.startedAt === 'string' ? data.startedAt : null,
    steps: Array.isArray(data.steps) ? data.steps : [],
    estimateMinutes: typeof data.estimateMinutes === 'number' && Number.isFinite(data.estimateMinutes)
      ? data.estimateMinutes
      : null,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
  };
}

function normalizeServerPlanGoal(value: unknown): ServerPlanGoal | null {
  const row = asRecord(value);
  const data = asRecord(row.data);
  const id = typeof row.id === 'string' && row.id ? row.id : typeof data.id === 'string' ? data.id : '';
  if (!id) return null;
  return {
    id,
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled Goal',
    priority: asPriority(data.priority),
  };
}

function parsePlanDateKey(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const reference = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(reference.getTime()) && reference.toISOString().slice(0, 10) === value ? reference : null;
}

type CalendarRef = { provider: 'google' | 'microsoft'; accountId: string; calendarId: string };
type ProviderBinding = CalendarRef & {
  kind: 'provider';
  eventId: string;
  createdBy: 'plan' | 'activity_detail';
};

function normalizeCalendarRef(value: unknown): CalendarRef | null {
  const ref = asRecord(value);
  const provider = ref.provider === 'google' || ref.provider === 'microsoft' ? ref.provider : null;
  const accountId = typeof ref.accountId === 'string' ? ref.accountId.trim() : '';
  const calendarId = typeof ref.calendarId === 'string' ? ref.calendarId.trim() : '';
  return provider && accountId && calendarId ? { provider, accountId, calendarId } : null;
}

function normalizeProviderBinding(value: unknown): ProviderBinding | null {
  const binding = asRecord(value);
  const ref = normalizeCalendarRef(binding);
  const eventId = typeof binding.eventId === 'string' ? binding.eventId.trim() : '';
  const createdBy = binding.createdBy === 'activity_detail' ? 'activity_detail' : 'plan';
  return binding.kind === 'provider' && ref && eventId
    ? { kind: 'provider', ...ref, eventId, createdBy }
    : null;
}

function validPlacement(arguments_: Record<string, unknown>) {
  const startDate = typeof arguments_.startDate === 'string' ? arguments_.startDate : '';
  const endDate = typeof arguments_.endDate === 'string' ? arguments_.endDate : '';
  const targetDateKey = typeof arguments_.targetDateKey === 'string' ? arguments_.targetDateKey : '';
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
    && /^\d{4}-\d{2}-\d{2}$/.test(targetDateKey)
    ? { startDate, endDate, targetDateKey }
    : null;
}

function validChunks(arguments_: Record<string, unknown>) {
  const raw = Array.isArray(arguments_.chunks) ? arguments_.chunks : [];
  const chunks = raw.map((value) => {
    const chunk = asRecord(value);
    return {
      title: typeof chunk.title === 'string' ? chunk.title.trim() : '',
      startDate: typeof chunk.startDate === 'string' ? chunk.startDate : '',
      endDate: typeof chunk.endDate === 'string' ? chunk.endDate : '',
      targetDateKey: typeof chunk.targetDateKey === 'string' ? chunk.targetDateKey : '',
    };
  });
  const valid = chunks.length >= 2 && chunks.length <= 10 && chunks.every((chunk) =>
    chunk.title.length > 0 && chunk.title.length <= 160 &&
    Number.isFinite(Date.parse(chunk.startDate)) && Number.isFinite(Date.parse(chunk.endDate)) &&
    Date.parse(chunk.endDate) > Date.parse(chunk.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(chunk.targetDateKey));
  const sorted = [...chunks].sort((left, right) => Date.parse(left.startDate) - Date.parse(right.startDate));
  const overlaps = sorted.some((chunk, index) => index > 0 &&
    Date.parse(chunk.startDate) < Date.parse(sorted[index - 1].endDate));
  return valid && !overlaps ? chunks : null;
}

async function stagePlanProposal(
  stageProposal: ((request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>) | undefined,
  request: ServerAgentProposalRequest,
): Promise<ServerAgentToolResult> {
  if (!stageProposal) return { status: 'unavailable', reason: 'server_proposal_persistence_unavailable', retryable: false };
  return { status: 'proposed', proposal: await stageProposal(request) };
}

async function loadOwnedActivity(client: { from: (table: string) => unknown }, userId: string, activityId: string) {
  const { data, error } = await (client.from('kwilt_activities') as ReadQuery).select('id,data,updated_at')
    .eq('user_id', userId).eq('is_deleted', false).eq('id', activityId).maybeSingle();
  const row = asRecord(data);
  const activity = asRecord(row.data);
  const updatedAt = typeof activity.updatedAt === 'string' && activity.updatedAt
    ? activity.updatedAt
    : typeof row.updated_at === 'string' ? row.updated_at : '';
  return error || row.id !== activityId || !updatedAt ? null : { row, activity, updatedAt };
}

async function loadOwnedWriteCalendar(client: { from: (table: string) => unknown }, userId: string): Promise<CalendarRef | null> {
  const { data: preferenceData, error: preferenceError } = await (client.from('kwilt_calendar_preferences') as ReadQuery)
    .select('write_calendar_ref').eq('user_id', userId).maybeSingle();
  if (preferenceError) return null;
  const writeRef = normalizeCalendarRef(asRecord(preferenceData).write_calendar_ref);
  if (!writeRef) return null;
  const { data: accountData, error: accountError } = await (client.from('kwilt_calendar_accounts') as ReadQuery)
    .select('provider,provider_account_id,status').eq('user_id', userId)
    .eq('provider', writeRef.provider).eq('provider_account_id', writeRef.accountId).eq('status', 'active').maybeSingle();
  const account = asRecord(accountData);
  return !accountError && account.provider === writeRef.provider
    && account.provider_account_id === writeRef.accountId && account.status === 'active'
    ? writeRef
    : null;
}

async function executeServerPlanWrite({
  client,
  userId,
  call,
  stageProposal,
  stageProposals,
  timeZone,
}: {
  client: { from: (table: string) => unknown };
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageProposals?: (requests: ServerAgentProposalRequest[]) => Promise<ServerAgentProposalRecord[]>;
  timeZone?: string;
}): Promise<ServerAgentToolResult> {
  const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId.trim() : '';
  if (call.toolId === 'plan.schedule_chunks') {
    const chunks = validChunks(call.arguments);
    if (!activityId || !chunks) {
      return { status: 'failed', code: 'invalid_plan_chunks', message: 'Provide two to ten valid, non-overlapping calendar chunks.', retryable: false };
    }
    const loaded = await loadOwnedActivity(client, userId, activityId);
    if (!loaded) return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
    const writeCalendarRef = await loadOwnedWriteCalendar(client, userId);
    if (!writeCalendarRef) return { status: 'unavailable', reason: 'plan_write_calendar_unavailable', retryable: false };
    if (!stageProposals) return { status: 'unavailable', reason: 'server_proposal_batch_persistence_unavailable', retryable: false };
    const groupId = `plan-chunks:${call.id}`;
    const proposals: ServerAgentProposalRequest[] = chunks.map((chunk, index) => ({
      capabilityId: 'plan', title: chunk.title,
      body: `Reviews chunk ${index + 1} of ${chunks.length} before creating its calendar event.`,
      operation: {
        type: 'schedule_activity_chunk', targetType: 'activity', targetId: activityId,
        summary: `Schedule ${chunk.title}`,
        payload: {
          activityId, expectedUpdatedAt: loaded.updatedAt, groupId, chunkId: `chunk-${index + 1}`,
          title: chunk.title, startDate: chunk.startDate, endDate: chunk.endDate,
          targetDateKey: chunk.targetDateKey, writeCalendarRef,
        },
      },
    }));
    const staged = await stageProposals(proposals);
    return {
      status: 'proposed',
      proposal: { groupId, count: staged.length, title: `Schedule ${String(loaded.activity.title ?? 'Activity')} in ${staged.length} chunks` },
    };
  }
  const placement = call.toolId === 'plan.remove_activity' ? null : validPlacement(call.arguments);
  if (!activityId || (call.toolId !== 'plan.remove_activity' && !placement)) {
    return { status: 'failed', code: 'invalid_plan_placement', message: 'A valid Activity, start, end, and Plan date are required.', retryable: false };
  }
  const loaded = await loadOwnedActivity(client, userId, activityId);
  if (!loaded) {
    return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
  }
  const title = typeof loaded.activity.title === 'string' && loaded.activity.title.trim()
    ? loaded.activity.title.trim()
    : 'Activity';
  if (call.toolId === 'plan.schedule_activity') {
    if (loaded.activity.calendarBinding || loaded.activity.scheduledProviderEventId) {
      return { status: 'failed', code: 'activity_already_scheduled', message: 'This Activity is already linked to a calendar block.', retryable: false };
    }
    const writeCalendarRef = await loadOwnedWriteCalendar(client, userId);
    if (!writeCalendarRef) {
      return { status: 'unavailable', reason: 'plan_write_calendar_unavailable', retryable: false };
    }
    return stagePlanProposal(stageProposal, {
      capabilityId: 'plan', title: `Schedule ${title}`,
      body: 'Reviews the proposed calendar placement before creating it.',
      operation: {
        type: 'schedule_activity', targetType: 'activity', targetId: activityId,
        summary: `Schedule ${title}`,
        payload: {
          activityId, expectedUpdatedAt: loaded.updatedAt, ...placement!, writeCalendarRef,
        },
      },
    });
  }

  const scheduledAt = typeof loaded.activity.scheduledAt === 'string' ? loaded.activity.scheduledAt : '';
  const previousBinding = normalizeProviderBinding(loaded.activity.calendarBinding);
  const previousStart = new Date(scheduledAt);
  if (!scheduledAt || !Number.isFinite(previousStart.getTime()) || !previousBinding) {
    return { status: 'failed', code: 'plan_binding_missing', message: 'This Activity is not linked to a provider calendar block Kwilt can manage.', retryable: false };
  }
  const durationMinutes = typeof loaded.activity.estimateMinutes === 'number' && Number.isFinite(loaded.activity.estimateMinutes)
    ? Math.max(10, loaded.activity.estimateMinutes)
    : 30;
  const previousEnd = new Date(previousStart.getTime() + durationMinutes * 60_000);
  const normalizedTimeZone = normalizeIanaTimeZone(timeZone) ?? 'UTC';
  const previousTargetDateKey = calendarDateInTimeZone(previousStart, normalizedTimeZone);

  if (call.toolId === 'plan.reschedule_activity') {
    return stagePlanProposal(stageProposal, {
      capabilityId: 'plan', title: `Move ${title}`,
      body: 'Reviews the new calendar placement before moving it.',
      operation: {
        type: 'reschedule_activity', targetType: 'activity', targetId: activityId,
        summary: `Move ${title}`,
        payload: {
          activityId, expectedUpdatedAt: loaded.updatedAt, ...placement!,
          previousStartDate: previousStart.toISOString(), previousEndDate: previousEnd.toISOString(),
          previousTargetDateKey,
        },
      },
    });
  }
  return stagePlanProposal(stageProposal, {
    capabilityId: 'plan', title: `Remove ${title} from Plan`,
    body: 'Deletes the managed calendar block after review. Undo recreates it if calendar access remains available.',
    operation: {
      type: 'remove_activity_from_plan', targetType: 'activity', targetId: activityId,
      summary: `Remove ${title} from Plan`,
      payload: {
        activityId, expectedUpdatedAt: loaded.updatedAt,
        previousStartDate: previousStart.toISOString(), previousEndDate: previousEnd.toISOString(),
        previousTargetDateKey, previousBinding,
      },
    },
  });
}

export async function executeServerPlanTool({
  client,
  userId,
  call,
  stageProposal,
  stageProposals,
  timeZone,
}: {
  client: { from: (table: string) => unknown };
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageProposals?: (requests: ServerAgentProposalRequest[]) => Promise<ServerAgentProposalRecord[]>;
  timeZone?: string;
}): Promise<ServerAgentToolResult> {
  if (call.toolId === 'plan.schedule_activity' || call.toolId === 'plan.schedule_chunks' ||
      call.toolId === 'plan.reschedule_activity' || call.toolId === 'plan.remove_activity') {
    return executeServerPlanWrite({ client, userId, call, stageProposal, stageProposals, timeZone });
  }
  const target = parsePlanDateKey(call.arguments.targetDate);
  if (!target) {
    return { status: 'failed', code: 'invalid_plan_date', message: 'Plan needs a valid YYYY-MM-DD target date.', retryable: false };
  }
  const [activityResult, goalResult] = await Promise.all([
    (client.from('kwilt_activities') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).order('updated_at', { ascending: false }).limit(250),
    (client.from('kwilt_goals') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).order('updated_at', { ascending: false }).limit(100),
  ]);
  if (activityResult.error || goalResult.error) {
    return { status: 'failed', code: 'plan_context_unavailable', message: 'Kwilt could not load the current Plan context.', retryable: true };
  }
  const activities = (Array.isArray(activityResult.data) ? activityResult.data : [])
    .map(normalizeServerPlanActivity).filter((activity): activity is ServerPlanActivity => activity !== null);
  const goals = (Array.isArray(goalResult.data) ? goalResult.data : [])
    .map(normalizeServerPlanGoal).filter((goal): goal is ServerPlanGoal => goal !== null);
  const eligible = sortActivitiesByPriorityRanking({ activities, goals, now: target })
    .filter((activity) => getPlanCandidateEligibility({ activity, now: target }).eligible)
    .slice(0, 4);
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  return {
    status: 'completed', receipt: null,
    output: {
      targetDate: target.toISOString(),
      limitation: 'calendar_unavailable',
      recommendations: eligible.map((activity, priorityPosition) => ({
        activityId: activity.id,
        expectedUpdatedAt: activity.updatedAt,
        title: activity.title,
        goalTitle: activity.goalId ? goalById.get(activity.goalId)?.title ?? null : null,
        priorityPosition,
        placement: { status: 'unplaced', reason: 'no_write_calendar' },
      })),
    },
  };
}

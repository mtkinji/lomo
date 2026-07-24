import type { ServerAgentToolCall, ServerAgentToolDefinition, ServerAgentProposalRecord,
  ServerAgentProposalRequest, ServerAgentToolResult } from './agentRuntime.ts';
import { summarizeActivity, summarizeArc, summarizeChapter, summarizeGoal,
  summarizeShowUpStatus } from './externalMcp.ts';
import { executeServerPlanTool } from './serverPlanTools.ts';
import { executeServerDeviceHandoff, type ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';
import { executeServerProfileTool } from './serverProfileTools.ts';
import { executeServerRelationshipTool } from './serverRelationshipTools.ts';
import { calendarDateInTimeZone, normalizeIanaTimeZone } from '../../../packages/kwilt-agent-runtime/src/timeContext.ts';
import { evaluateToolPolicy } from '../../../packages/kwilt-agent-runtime/src/policy.ts';
type ClientActionRequest = ServerDeviceActionRequest;
type ReadResult = { data: unknown; error: unknown }; type ReadQuery = {
  select: (...args: unknown[]) => ReadQuery;
  eq: (...args: unknown[]) => ReadQuery;
  gte: (...args: unknown[]) => ReadQuery;
  order: (...args: unknown[]) => ReadQuery;
  limit: (...args: unknown[]) => Promise<ReadResult>;
  maybeSingle: () => Promise<ReadResult>;
};
type ServerDataClient = { from: (table: string) => unknown;
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<ReadResult> };
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const ACTIVITY_TYPES = new Set(['task', 'checklist', 'shopping_list', 'instructions', 'plan']);
const ACTIVITY_STATUSES = new Set(['planned', 'in_progress', 'done', 'skipped', 'cancelled']);
const REPEAT_RULES = new Set(['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom']);
const REPEAT_BASES = new Set(['scheduled', 'after_completion']);
const DIFFICULTIES = new Set(['very_easy', 'easy', 'medium', 'hard', 'very_hard']);
const CAPTURE_FIELDS = new Set([
  'title', 'notes', 'goalId', 'type', 'status', 'tags', 'priority', 'scheduledDate',
  'reminderAt', 'repeatRule', 'repeatCustom', 'repeatBasis', 'estimateMinutes', 'difficulty',
  'reminderLocalTime', 'repeatWeekdays',
]);

function validNullableString(value: unknown, max: number): boolean {
  return value == null || (typeof value === 'string' && value.length <= max);
}

function zonedLocalInstant(dateKey: string, localTime: string, timeZone: string): Date {
  const desired = new Date(`${dateKey}T${localTime}:00.000Z`);
  let candidate = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(candidate);
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    const represented = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
    candidate = new Date(candidate.getTime() + (desired.getTime() - represented));
  }
  return candidate;
}

function recurringReminderFields(
  reminderLocalTime: unknown,
  repeatWeekdays: unknown,
  timeZone: string,
  now: Date,
): Record<string, unknown> | null {
  if (typeof reminderLocalTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderLocalTime) ||
      !Array.isArray(repeatWeekdays) || repeatWeekdays.length < 1 || repeatWeekdays.length > 7 ||
      repeatWeekdays.some((day) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)) return null;
  const weekdays = [...new Set(repeatWeekdays.map(Number))];
  const normalizedZone = normalizeIanaTimeZone(timeZone) ?? 'UTC';
  const candidates: Date[] = [];
  for (let offset = 0; offset <= 7; offset += 1) {
    const probe = new Date(now.getTime() + offset * 86_400_000);
    const dateKey = calendarDateInTimeZone(probe, normalizedZone);
    const noon = zonedLocalInstant(dateKey, '12:00', normalizedZone);
    const weekdayLabel = new Intl.DateTimeFormat('en-US', { timeZone: normalizedZone, weekday: 'short' }).format(noon);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayLabel);
    if (!weekdays.includes(weekday)) continue;
    const candidate = zonedLocalInstant(dateKey, reminderLocalTime, normalizedZone);
    if (candidate.getTime() > now.getTime()) candidates.push(candidate);
  }
  const first = candidates.sort((left, right) => left.getTime() - right.getTime())[0];
  if (!first) return null;
  return {
    reminderAt: first.toISOString(), repeatRule: 'custom',
    repeatCustom: { cadence: 'weeks', interval: 1, weekdays }, repeatBasis: 'scheduled',
  };
}

function normalizeActivityCapture(value: unknown, timeZone = 'UTC', now = new Date()): Record<string, unknown> | null {
  const input = asRecord(value);
  if (Object.keys(input).some((key) => !CAPTURE_FIELDS.has(key))) return null;
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 240 || !validNullableString(input.notes, 5000) || !validNullableString(input.goalId, 500)) return null;
  if (input.type != null && (typeof input.type !== 'string' || !ACTIVITY_TYPES.has(input.type))) return null;
  if (input.status != null && (typeof input.status !== 'string' || !ACTIVITY_STATUSES.has(input.status))) return null;
  if (input.tags != null && (!Array.isArray(input.tags) || input.tags.length > 20
    || input.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 80))) return null;
  if (input.priority != null && ![1, 2, 3].includes(Number(input.priority))) return null;
  if (input.scheduledDate != null && (typeof input.scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate))) return null;
  if (input.reminderAt != null && (typeof input.reminderAt !== 'string' || !Number.isFinite(Date.parse(input.reminderAt)))) return null;
  if (input.repeatRule != null && (typeof input.repeatRule !== 'string' || !REPEAT_RULES.has(input.repeatRule))) return null;
  if (input.repeatBasis != null && (typeof input.repeatBasis !== 'string' || !REPEAT_BASES.has(input.repeatBasis))) return null;
  if (input.estimateMinutes != null && (!Number.isInteger(input.estimateMinutes) || Number(input.estimateMinutes) < 1 || Number(input.estimateMinutes) > 1440)) return null;
  if (input.difficulty != null && (typeof input.difficulty !== 'string' || !DIFFICULTIES.has(input.difficulty))) return null;
  if (input.repeatCustom != null) {
    const custom = asRecord(input.repeatCustom);
    if (Object.keys(custom).some((key) => !['cadence', 'interval', 'weekdays'].includes(key))) return null;
    if (typeof custom.cadence !== 'string' || !['days', 'weeks', 'months', 'years'].includes(custom.cadence)
      || !Number.isInteger(custom.interval) || Number(custom.interval) < 1 || Number(custom.interval) > 365
      || (custom.weekdays != null && (!Array.isArray(custom.weekdays) || custom.weekdays.length > 7
        || custom.weekdays.some((day) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)))) return null;
  }
  const semanticReminder = 'reminderLocalTime' in input || 'repeatWeekdays' in input
    ? recurringReminderFields(input.reminderLocalTime, input.repeatWeekdays, timeZone, now)
    : null;
  if (('reminderLocalTime' in input || 'repeatWeekdays' in input) && !semanticReminder) return null;
  const { reminderLocalTime: _reminderLocalTime, repeatWeekdays: _repeatWeekdays, ...durableInput } = input;
  return {
    ...durableInput, ...semanticReminder, title,
    ...(Array.isArray(input.tags) ? { tags: input.tags.map((tag) => String(tag).trim()) } : {}),
  };
}

function normalizeActivityPatch(value: unknown): Record<string, unknown> | null {
  const input = asRecord(value);
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => !CAPTURE_FIELDS.has(key))) return null;
  const patch: Record<string, unknown> = {};
  if ('title' in input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 240) return null;
    patch.title = title;
  }
  if ('notes' in input) {
    if (!validNullableString(input.notes, 5000)) return null;
    patch.notes = typeof input.notes === 'string' ? input.notes.trim() : null;
  }
  if ('goalId' in input) {
    if (input.goalId !== null && (typeof input.goalId !== 'string' || !input.goalId.trim() || input.goalId.length > 200)) return null;
    patch.goalId = typeof input.goalId === 'string' ? input.goalId.trim() : null;
  }
  if ('type' in input) {
    if (typeof input.type !== 'string' || !ACTIVITY_TYPES.has(input.type)) return null;
    patch.type = input.type;
  }
  if ('status' in input) {
    if (typeof input.status !== 'string' || !ACTIVITY_STATUSES.has(input.status)) return null;
    patch.status = input.status;
  }
  if ('tags' in input) {
    if (!Array.isArray(input.tags) || input.tags.length > 20) return null;
    const tags = input.tags.map((tag) => typeof tag === 'string' ? tag.trim() : '');
    if (tags.some((tag) => !tag || tag.length > 80)) return null;
    patch.tags = [...new Set(tags)];
  }
  if ('priority' in input) {
    if (input.priority !== null && input.priority !== 1 && input.priority !== 2 && input.priority !== 3) return null;
    patch.priority = input.priority;
  }
  if ('scheduledDate' in input) {
    if (input.scheduledDate !== null && (typeof input.scheduledDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate))) return null;
    patch.scheduledDate = input.scheduledDate;
  }
  if ('reminderAt' in input) {
    if (input.reminderAt !== null && (typeof input.reminderAt !== 'string' || !Number.isFinite(Date.parse(input.reminderAt)))) return null;
    patch.reminderAt = input.reminderAt;
  }
  if ('repeatRule' in input) {
    if (input.repeatRule !== null && (typeof input.repeatRule !== 'string' || !REPEAT_RULES.has(input.repeatRule))) return null;
    patch.repeatRule = input.repeatRule;
  }
  if ('repeatCustom' in input) {
    if (input.repeatCustom === null) {
      patch.repeatCustom = null;
    } else {
      const custom = asRecord(input.repeatCustom);
      if (Object.keys(custom).some((key) => !['cadence', 'interval', 'weekdays'].includes(key))) return null;
      if (typeof custom.cadence !== 'string' || !['days', 'weeks', 'months', 'years'].includes(custom.cadence)
        || !Number.isInteger(custom.interval) || Number(custom.interval) < 1 || Number(custom.interval) > 365
        || (custom.weekdays != null && (!Array.isArray(custom.weekdays) || custom.weekdays.length > 7
          || custom.weekdays.some((day) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)))) return null;
      patch.repeatCustom = custom;
    }
  }
  if ('repeatBasis' in input) {
    if (input.repeatBasis !== null && (typeof input.repeatBasis !== 'string' || !REPEAT_BASES.has(input.repeatBasis))) return null;
    patch.repeatBasis = input.repeatBasis;
  }
  if ('estimateMinutes' in input) {
    if (input.estimateMinutes !== null && (!Number.isInteger(input.estimateMinutes)
      || Number(input.estimateMinutes) < 1 || Number(input.estimateMinutes) > 1440)) return null;
    patch.estimateMinutes = input.estimateMinutes;
  }
  if ('difficulty' in input) {
    if (input.difficulty !== null && (typeof input.difficulty !== 'string' || !DIFFICULTIES.has(input.difficulty))) return null;
    patch.difficulty = input.difficulty;
  }
  return patch;
}

const GOAL_FIELDS = new Set(['title', 'description', 'arcId', 'status', 'priority', 'targetDate']);
const GOAL_STATUSES = new Set(['planned', 'in_progress', 'completed', 'archived']);

function normalizeGoalPatch(value: unknown): Record<string, unknown> | null {
  const input = asRecord(value);
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => !GOAL_FIELDS.has(key))) return null;
  const patch: Record<string, unknown> = {};
  if ('title' in input) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 240) return null;
    patch.title = title;
  }
  if ('description' in input) {
    if (!validNullableString(input.description, 5000)) return null;
    patch.description = input.description;
  }
  if ('arcId' in input) {
    if (input.arcId !== null && (typeof input.arcId !== 'string' || !input.arcId.trim() || input.arcId.length > 200)) return null;
    patch.arcId = typeof input.arcId === 'string' ? input.arcId.trim() : null;
  }
  if ('status' in input) {
    if (typeof input.status !== 'string' || !GOAL_STATUSES.has(input.status)) return null;
    patch.status = input.status;
  }
  if ('priority' in input) {
    if (input.priority !== null && input.priority !== 1 && input.priority !== 2 && input.priority !== 3) return null;
    patch.priority = input.priority;
  }
  if ('targetDate' in input) {
    if (input.targetDate !== null && (typeof input.targetDate !== 'string' || !Number.isFinite(Date.parse(input.targetDate)))) return null;
    patch.targetDate = input.targetDate;
  }
  return patch;
}

const ARC_FIELDS = new Set(['name', 'narrative', 'identityStatement', 'status']);
const ARC_STATUSES = new Set(['active', 'paused', 'archived']);

function normalizeArcPatch(value: unknown): Record<string, unknown> | null {
  const input = asRecord(value);
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => !ARC_FIELDS.has(key))) return null;
  const patch: Record<string, unknown> = {};
  if ('name' in input) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 160) return null;
    patch.name = name;
  }
  if ('narrative' in input) {
    if (!validNullableString(input.narrative, 5000)) return null;
    patch.narrative = typeof input.narrative === 'string' ? input.narrative.trim() : null;
  }
  if ('identityStatement' in input) {
    if (!validNullableString(input.identityStatement, 1000)) return null;
    patch.identityStatement = typeof input.identityStatement === 'string' ? input.identityStatement.trim() : null;
  }
  if ('status' in input) {
    if (typeof input.status !== 'string' || !ARC_STATUSES.has(input.status)) return null;
    patch.status = input.status;
  }
  return patch;
}

function normalizeArcCreate(value: unknown): Record<string, unknown> | null {
  const patch = normalizeArcPatch(value);
  return typeof patch?.name === 'string' ? patch : null;
}

function normalizeGoalCreate(value: unknown): Record<string, unknown> | null {
  const input = asRecord(value);
  const followUp = asRecord(input.followUpActivity);
  const hasFollowUp = 'followUpActivity' in input;
  const { followUpActivity: _followUpActivity, ...goalFields } = input;
  const patch = normalizeGoalPatch(goalFields);
  if (typeof patch?.title !== 'string') return null;
  if (hasFollowUp && (
    Object.keys(followUp).some((key) => key !== 'title' && key !== 'repeatRule') ||
    typeof followUp.title !== 'string' || !followUp.title.trim() || followUp.title.trim().length > 240 ||
    followUp.repeatRule !== 'daily'
  )) return null;
  return {
    ...Object.fromEntries(Object.entries(patch).filter(([, entry]) => entry !== null)),
    ...(hasFollowUp ? { followUpActivity: { title: String(followUp.title).trim(), repeatRule: 'daily' } } : {}),
  };
}

function normalizeChapterNote(value: unknown): string | null | undefined {
  if (value !== null && typeof value !== 'string') return undefined;
  const note = typeof value === 'string' ? value.trim() : '';
  if (note.length > 500) return undefined;
  return note || null;
}

function objectVersion(row: Record<string, unknown>): string {
  const data = asRecord(row.data);
  return typeof data.updatedAt === 'string'
    ? data.updatedAt
    : typeof row.updated_at === 'string' ? row.updated_at : '';
}

async function stageServerProposal(
  stageProposal: ((request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>) | undefined,
  request: ServerAgentProposalRequest,
): Promise<ServerAgentToolResult> {
  if (!stageProposal) {
    return { status: 'unavailable', reason: 'server_proposal_persistence_unavailable', retryable: false };
  }
  return { status: 'proposed', proposal: await stageProposal(request) };
}

const ACTIVITY_REVIEW_TOOLS = new Set([
  'activities.update',
  'activities.delete',
  'activities.repeat.update',
  'activities.reminder.update',
  'activities.focus_today',
  'activities.steps.create',
  'activities.steps.update',
  'activities.steps.complete',
  'activities.steps.delete',
  'activities.steps.reorder',
]);

const DEVICE_ACTIONS: Record<string, ClientActionRequest> = {
  'notifications.configure': {
    capabilityId: 'notifications', actionType: 'configure_notifications', targetType: null, targetId: null,
    title: 'Review notification settings',
    consequenceSummary: 'Kwilt will open notification settings. System permission and reminder choices remain under native review.',
    payload: {},
  },
  'navigation.search.open': {
    capabilityId: 'navigation', actionType: 'open_search', targetType: null, targetId: null,
    title: 'Open Search', consequenceSummary: 'Kwilt will open native search.', payload: {},
  },
  'navigation.account_settings.open': {
    capabilityId: 'account', actionType: 'open_account_settings', targetType: null, targetId: null,
    title: 'Open account settings', consequenceSummary: 'Kwilt will open your native account settings.', payload: {},
  },
  'account.subscription.open': {
    capabilityId: 'account', actionType: 'open_subscription_management', targetType: null, targetId: null,
    title: 'Review subscription',
    consequenceSummary: 'Kwilt will open subscription management. No billing or plan change is made by Chat.', payload: {},
  },
  'account.delete.open': {
    capabilityId: 'account', actionType: 'open_account_deletion', targetType: null, targetId: null,
    title: 'Review account deletion',
    consequenceSummary: 'Account deletion is destructive. Kwilt will open the native consequence and confirmation flow; Chat will not delete the account.',
    payload: {},
  },
  'plan.preferences.open': {
    capabilityId: 'plan', actionType: 'open_plan_preferences', targetType: null, targetId: null,
    title: 'Review Plan preferences',
    consequenceSummary: 'Kwilt will open native availability and calendar preference settings. No setting changes until you make them there.',
    payload: {},
  },
};

function withUpdatedAt(row: Record<string, unknown>): Record<string, unknown> {
  const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
    ? row.data as Record<string, unknown>
    : {};
  return { ...data, id: row.id, updated_at: row.updated_at };
}

export async function executeServerAgentTool({
  client,
  userId,
  call,
  tool,
  stageDeviceAction,
  stageProposal,
  stageProposals,
  writeContext,
  timeZone,
}: {
  client: ServerDataClient;
  userId: string;
  call: ServerAgentToolCall;
  tool: ServerAgentToolDefinition;
  stageDeviceAction: (request: ClientActionRequest) => Promise<void>;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
  stageProposals?: (requests: ServerAgentProposalRequest[]) => Promise<ServerAgentProposalRecord[]>;
  writeContext?: { threadId: string; runId: string; messageId: string };
  timeZone?: string;
}): Promise<ServerAgentToolResult> {
  if (call.toolId !== tool.id) {
    return { status: 'failed', code: 'tool_mismatch', message: 'The discovered tool does not match this call.', retryable: false };
  }
  if (call.toolId === 'screen_time.configure') {
    const childName = typeof call.arguments.childName === 'string' ? call.arguments.childName.trim() : '';
    const appName = typeof call.arguments.appName === 'string' ? call.arguments.appName.trim() : '';
    const desiredAccess = call.arguments.desiredAccess === 'allow' || call.arguments.desiredAccess === 'block'
      ? call.arguments.desiredAccess
      : null;
    if (!childName || !appName || !desiredAccess) {
      return {
        status: 'needs_input',
        prompt: 'Which child, app, and access change should Kwilt prepare for Screen Time review?',
        fields: ['childName', 'appName', 'desiredAccess'],
      };
    }
    const request: ClientActionRequest = {
      capabilityId: 'screenTime', actionType: 'configure_screen_time', targetType: 'screen_time_rule', targetId: null,
      title: `Review ${appName} access for ${childName}`,
      consequenceSummary: `Kwilt will prepare ${desiredAccess === 'allow' ? 'allowing' : 'blocking'} ${appName} for ${childName}. Household role, Apple authorization, device apply, and acknowledgement must all succeed before Kwilt reports the change complete.`,
      payload: { childName, appName, desiredAccess, entrySurface: 'settings' },
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  const deviceAction = DEVICE_ACTIONS[call.toolId];
  if (deviceAction) {
    await stageDeviceAction(deviceAction);
    return { status: 'pending_client_action', provider: 'device', request: deviceAction };
  }
  const deviceHandoff = await executeServerDeviceHandoff({ client, userId, call, stageDeviceAction });
  if (deviceHandoff) return deviceHandoff;
  const profileResult = await executeServerProfileTool({ client, userId, call, stageProposal });
  if (profileResult) return profileResult;
  if (tool.capabilityId === 'relationships') {
    const policy = evaluateToolPolicy(tool, {
      authorized: true,
      explicitRequest: true,
      providerAvailability: { server: true, device: false, channel: false, connector: true },
    });
    if (policy.decision !== 'execute') {
      return {
        status: 'needs_input',
        prompt: 'This relationship change needs review before Kwilt can apply it.',
        fields: ['confirmation'],
      };
    }
  }
  const relationshipResult = await executeServerRelationshipTool({ client, userId, call, writeContext });
  if (relationshipResult) return relationshipResult;
  if (call.toolId === 'plan.read_day_context' || call.toolId === 'plan.recommend_day' ||
      call.toolId === 'plan.schedule_activity' || call.toolId === 'plan.schedule_chunks' ||
      call.toolId === 'plan.reschedule_activity' || call.toolId === 'plan.remove_activity') {
    return executeServerPlanTool({ client, userId, call, stageProposal, stageProposals, timeZone });
  }
  if (ACTIVITY_REVIEW_TOOLS.has(call.toolId)) {
    const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId.trim() : '';
    if (!activityId) {
      return { status: 'failed', code: 'invalid_activity', message: 'A valid Activity is required.', retryable: false };
    }

    let activityPatch: Record<string, unknown> | null = null;
    let preparedStep: {
      type: 'create_activity_step' | 'update_activity_step' | 'complete_activity_step' | 'delete_activity_step' | 'reorder_activity_steps';
      payload: Record<string, unknown>;
    } | null = null;
    if (call.toolId === 'activities.update') {
      activityPatch = normalizeActivityPatch(call.arguments.fields);
      if (!activityPatch) {
        return { status: 'failed', code: 'invalid_activity_patch', message: 'No supported Activity fields were provided.', retryable: false };
      }
    } else if (call.toolId === 'activities.repeat.update') {
      const repeatRule = call.arguments.repeatRule;
      const repeatBasis = call.arguments.repeatBasis;
      const rawPatch = {
        repeatRule,
        repeatCustom: repeatRule === 'custom' ? call.arguments.repeatCustom : null,
        ...(repeatBasis === 'scheduled' || repeatBasis === 'after_completion' ? { repeatBasis } : {}),
      };
      activityPatch = normalizeActivityPatch(rawPatch);
      if (!activityPatch || (activityPatch.repeatRule === 'custom' && !activityPatch.repeatCustom)) {
        return { status: 'failed', code: 'invalid_activity_schedule', message: 'A valid recurrence rule is required.', retryable: false };
      }
    } else if (call.toolId === 'activities.reminder.update') {
      activityPatch = normalizeActivityPatch({ reminderAt: call.arguments.reminderAt });
      if (!activityPatch) {
        return { status: 'failed', code: 'invalid_activity_schedule', message: 'A valid reminder time or clear request is required.', retryable: false };
      }
    } else if (call.toolId === 'activities.focus_today') {
      activityPatch = {
        scheduledDate: calendarDateInTimeZone(new Date(), normalizeIanaTimeZone(timeZone) ?? 'UTC'),
      };
    } else if (call.toolId === 'activities.steps.create') {
      const title = typeof call.arguments.title === 'string' ? call.arguments.title.trim() : '';
      if (!title || title.length > 240) {
        return { status: 'failed', code: 'invalid_step', message: 'A valid step title is required.', retryable: false };
      }
      preparedStep = {
        type: 'create_activity_step', payload: { title, isOptional: call.arguments.optional === true },
      };
    } else if (call.toolId === 'activities.steps.reorder') {
      const stepIds = Array.isArray(call.arguments.stepIds)
        ? call.arguments.stepIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())).map((id) => id.trim())
        : [];
      if (stepIds.length === 0 || stepIds.length > 24 || new Set(stepIds).size !== stepIds.length) {
        return { status: 'failed', code: 'invalid_step_order', message: 'Step order must contain unique existing step ids.', retryable: false };
      }
      preparedStep = { type: 'reorder_activity_steps', payload: { stepIds } };
    } else if (call.toolId !== 'activities.delete') {
      const stepId = typeof call.arguments.stepId === 'string' ? call.arguments.stepId.trim() : '';
      if (!stepId) {
        return { status: 'failed', code: 'invalid_step', message: 'A valid Activity step is required.', retryable: false };
      }
      if (call.toolId === 'activities.steps.update') {
        const title = typeof call.arguments.title === 'string' ? call.arguments.title.trim() : '';
        const hasOptional = typeof call.arguments.optional === 'boolean';
        if ((!title || title.length > 240) && !hasOptional) {
          return { status: 'failed', code: 'invalid_step_patch', message: 'A title or optional-state change is required.', retryable: false };
        }
        preparedStep = {
          type: 'update_activity_step',
          payload: {
            stepId,
            ...(title ? { title } : {}),
            ...(hasOptional ? { isOptional: call.arguments.optional } : {}),
          },
        };
      } else if (call.toolId === 'activities.steps.complete') {
        if (typeof call.arguments.completed !== 'boolean') {
          return { status: 'failed', code: 'invalid_step_completion', message: 'A completed state is required.', retryable: false };
        }
        preparedStep = {
          type: 'complete_activity_step', payload: { stepId, completed: call.arguments.completed },
        };
      } else {
        preparedStep = { type: 'delete_activity_step', payload: { stepId } };
      }
    }

    const { data, error } = await (client.from('kwilt_activities') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).eq('id', activityId).maybeSingle();
    const activity = asRecord(data);
    const activityData = asRecord(activity.data);
    if (error || activity.id !== activityId) {
      return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
    }
    const expectedUpdatedAt = objectVersion(activity);
    if (!expectedUpdatedAt) {
      return { status: 'failed', code: 'activity_version_unavailable', message: 'Kwilt could not establish the current Activity version.', retryable: true };
    }
    const title = typeof activityData.title === 'string' && activityData.title.trim() ? activityData.title.trim() : 'To-do';

    if (activityPatch && typeof activityPatch.goalId === 'string') {
      const goalId = activityPatch.goalId;
      const { data: goalData, error: goalError } = await (client.from('kwilt_goals') as ReadQuery).select('id')
        .eq('user_id', userId).eq('is_deleted', false).eq('id', goalId).maybeSingle();
      if (goalError || asRecord(goalData).id !== goalId) {
        return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
      }
    }

    if (call.toolId === 'activities.delete') {
      return stageServerProposal(stageProposal, {
        capabilityId: 'todos', title: `Delete ${title}`,
        body: 'Deletes this To-do after review. The receipt can restore it unless another item takes its id.',
        operation: {
          type: 'delete_activity', targetType: 'activity', targetId: activityId,
          summary: `Delete To-do ${title}`, payload: { expectedUpdatedAt },
        },
      });
    }
    if (activityPatch) {
      const repeat = call.toolId === 'activities.repeat.update';
      const reminder = call.toolId === 'activities.reminder.update';
      const focusToday = call.toolId === 'activities.focus_today';
      const proposalTitle = repeat
        ? `Update repeat for ${title}`
        : reminder
          ? `Update reminder for ${title}`
          : focusToday ? `Focus on ${title} today` : `Update ${title}`;
      const proposalBody = repeat
        ? 'Reviews the repeat change before saving it.'
        : reminder
          ? 'Reviews the reminder change before saving it. Device notification settings still apply.'
          : focusToday
            ? "Schedules this To-do for today's focus after review. It remains a soft Plan signal and can be undone."
            : 'Reviews the requested To-do changes before applying them.';
      const proposalSummary = repeat || reminder || focusToday
        ? proposalTitle
        : `Update To-do ${title}`;
      return stageServerProposal(stageProposal, {
        capabilityId: 'todos', title: proposalTitle, body: proposalBody,
        operation: {
          type: 'update_activity', targetType: 'activity', targetId: activityId,
          summary: proposalSummary,
          payload: { ...activityPatch, expectedUpdatedAt },
        },
      });
    }

    const steps = Array.isArray(activityData.steps)
      ? activityData.steps.map(asRecord).filter((step) => typeof step.id === 'string')
      : [];
    if (!preparedStep) {
      return { status: 'failed', code: 'invalid_step', message: 'A valid step change is required.', retryable: false };
    }
    if (preparedStep.type === 'reorder_activity_steps') {
      const existingIds = new Set(steps.map((step) => String(step.id)));
      if ((preparedStep.payload.stepIds as string[]).some((stepId) => !existingIds.has(stepId))) {
        return { status: 'failed', code: 'invalid_step_order', message: 'Step order must contain unique existing step ids.', retryable: false };
      }
    }
    const stepId = typeof preparedStep.payload.stepId === 'string' ? preparedStep.payload.stepId : null;
    const step = stepId ? steps.find((candidate) => candidate.id === stepId) : null;
    if (stepId && !step) {
      return { status: 'failed', code: 'step_not_found', message: 'The selected Activity step is no longer available.', retryable: false };
    }
    const stepTitle = typeof step?.title === 'string' && step.title.trim() ? step.title.trim() : 'step';
    const summary = preparedStep.type === 'create_activity_step'
      ? `Add step ${String(preparedStep.payload.title)}`
      : preparedStep.type === 'reorder_activity_steps'
        ? `Reorder steps in ${title}`
        : preparedStep.type === 'update_activity_step'
          ? `Update step ${stepTitle}`
          : preparedStep.type === 'complete_activity_step'
            ? `${preparedStep.payload.completed ? 'Complete' : 'Reopen'} step ${stepTitle}`
            : `Delete step ${stepTitle}`;
    return stageServerProposal(stageProposal, {
      capabilityId: 'todos', title: summary, body: 'Reviews this step change before applying it.',
      operation: {
        type: preparedStep.type, targetType: 'activity', targetId: activityId, summary,
        payload: { ...preparedStep.payload, expectedUpdatedAt },
      },
    });
  }
  if (call.toolId === 'arcs.create') {
    const input = normalizeArcCreate(call.arguments);
    if (!input) {
      return { status: 'failed', code: 'invalid_arc', message: 'A valid Arc name and supported fields are required.', retryable: false };
    }
    const name = String(input.name);
    return stageServerProposal(stageProposal, {
      capabilityId: 'arcs', title: `Create ${name}`,
      body: 'Creates this identity Arc after review. Kwilt will not adopt it until you approve.',
      operation: {
        type: 'create_arc', targetType: 'arc', targetId: null, summary: `Create ${name}`,
        payload: { ...input, expectedUpdatedAt: null },
      },
    });
  }
  if (call.toolId === 'arcs.update' || call.toolId === 'arcs.delete') {
    const arcId = typeof call.arguments.arcId === 'string' ? call.arguments.arcId.trim() : '';
    const patch = call.toolId === 'arcs.update' ? normalizeArcPatch(call.arguments.fields) : {};
    if (!arcId || (call.toolId === 'arcs.update' && !patch)) {
      return {
        status: 'failed', code: call.toolId === 'arcs.update' ? 'invalid_arc_patch' : 'invalid_arc',
        message: 'A valid Arc and supported fields are required.', retryable: false,
      };
    }
    const { data, error } = await (client.from('kwilt_arcs') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).eq('id', arcId).maybeSingle();
    const arc = asRecord(data);
    const arcData = asRecord(arc.data);
    if (error || arc.id !== arcId) {
      return { status: 'failed', code: 'arc_not_found', message: 'The selected Arc is no longer available.', retryable: false };
    }
    const expectedUpdatedAt = objectVersion(arc);
    if (!expectedUpdatedAt) {
      return { status: 'failed', code: 'arc_version_unavailable', message: 'Kwilt could not establish the current Arc version.', retryable: true };
    }
    const name = typeof arcData.name === 'string' && arcData.name.trim() ? arcData.name.trim() : 'Arc';
    const deleting = call.toolId === 'arcs.delete';
    return stageServerProposal(stageProposal, {
      capabilityId: 'arcs', title: `${deleting ? 'Delete' : 'Update'} ${name}`,
      body: deleting
        ? 'Deletes this Arc and its linked Goals and Activities after review. Undo restores them.'
        : 'Reviews the requested identity change before applying it.',
      operation: {
        type: deleting ? 'delete_arc' : 'update_arc', targetType: 'arc', targetId: arcId,
        summary: `${deleting ? 'Delete' : 'Update'} Arc ${name}`,
        payload: { ...(patch ?? {}), expectedUpdatedAt },
      },
    });
  }
  if (call.toolId === 'goals.update') {
    const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId.trim() : '';
    const fields = normalizeGoalPatch(call.arguments.fields);
    if (!goalId || !fields) {
      return { status: 'failed', code: 'invalid_goal_patch', message: 'A valid Goal and supported changes are required.', retryable: false };
    }
    const { data, error } = await (client.from('kwilt_goals') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).eq('id', goalId).maybeSingle();
    const goal = asRecord(data);
    const goalData = asRecord(goal.data);
    if (error || goal.id !== goalId) {
      return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
    }
    const expectedUpdatedAt = typeof goalData.updatedAt === 'string'
      ? goalData.updatedAt
      : typeof goal.updated_at === 'string' ? goal.updated_at : '';
    if (!expectedUpdatedAt) {
      return { status: 'failed', code: 'goal_version_unavailable', message: 'Kwilt could not establish the current Goal version.', retryable: true };
    }
    const currentTitle = typeof goalData.title === 'string' && goalData.title.trim()
      ? goalData.title.trim()
      : 'Goal';
    return stageServerProposal(stageProposal, {
      capabilityId: 'goals',
      title: `Update ${currentTitle}`,
      body: 'Reviews the requested Goal changes before applying them.',
      operation: {
        type: 'update_goal', targetType: 'goal', targetId: goalId,
        summary: `Update Goal ${currentTitle}`,
        payload: { ...fields, expectedUpdatedAt },
      },
    });
  }
  if (call.toolId === 'goals.create') {
    const input = normalizeGoalCreate(call.arguments);
    if (!input) {
      return { status: 'failed', code: 'invalid_goal', message: 'A valid Goal title and supported fields are required.', retryable: false };
    }
    const arcId = typeof input.arcId === 'string' ? input.arcId : null;
    if (arcId) {
      const { data, error } = await (client.from('kwilt_arcs') as ReadQuery).select('id')
        .eq('user_id', userId).eq('is_deleted', false).eq('id', arcId).maybeSingle();
      if (error || asRecord(data).id !== arcId) {
        return { status: 'failed', code: 'arc_not_found', message: 'The selected Arc is no longer available.', retryable: false };
      }
    }
    const title = String(input.title);
    return stageServerProposal(stageProposal, {
      capabilityId: 'goals', title: `Create ${title}`,
      body: arcId
        ? 'Creates this Goal draft in the selected Arc after review.'
        : 'Creates this unassigned Goal draft after review.',
      operation: {
        type: 'create_goal', targetType: 'goal', targetId: null, summary: `Create Goal ${title}`,
        payload: { ...input, expectedUpdatedAt: null },
      },
    });
  }
  if (call.toolId === 'goals.delete') {
    const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId.trim() : '';
    if (!goalId) {
      return { status: 'failed', code: 'invalid_goal', message: 'A valid Goal is required.', retryable: false };
    }
    const { data, error } = await (client.from('kwilt_goals') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).eq('id', goalId).maybeSingle();
    const goal = asRecord(data);
    const goalData = asRecord(goal.data);
    if (error || goal.id !== goalId) {
      return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
    }
    const expectedUpdatedAt = objectVersion(goal);
    if (!expectedUpdatedAt) {
      return { status: 'failed', code: 'goal_version_unavailable', message: 'Kwilt could not establish the current Goal version.', retryable: true };
    }
    const title = typeof goalData.title === 'string' && goalData.title.trim() ? goalData.title.trim() : 'Goal';
    return stageServerProposal(stageProposal, {
      capabilityId: 'goals', title: `Delete ${title}`,
      body: 'Deletes this Goal and its linked Activities after review. Undo restores them.',
      operation: {
        type: 'delete_goal', targetType: 'goal', targetId: goalId, summary: `Delete Goal ${title}`,
        payload: { expectedUpdatedAt },
      },
    });
  }
  if (call.toolId === 'chapters.note.update') {
    const chapterId = typeof call.arguments.chapterId === 'string' ? call.arguments.chapterId.trim() : '';
    const note = normalizeChapterNote(call.arguments.note);
    if (!chapterId || note === undefined) {
      return { status: 'failed', code: 'invalid_chapter_note', message: 'The Chapter note must be 500 characters or fewer.', retryable: false };
    }
    const { data, error } = await (client.from('kwilt_chapters') as ReadQuery)
      .select('id,period_key,user_note,user_note_updated_at,updated_at')
      .eq('user_id', userId).eq('id', chapterId).maybeSingle();
    const chapter = asRecord(data);
    if (error || chapter.id !== chapterId) {
      return { status: 'failed', code: 'chapter_not_found', message: 'The selected Chapter is no longer available.', retryable: false };
    }
    const expectedUpdatedAt = typeof chapter.user_note_updated_at === 'string'
      ? chapter.user_note_updated_at
      : typeof chapter.updated_at === 'string' ? chapter.updated_at : '';
    if (!expectedUpdatedAt) {
      return { status: 'failed', code: 'chapter_version_unavailable', message: 'Kwilt could not establish the current Chapter version.', retryable: true };
    }
    const periodKey = typeof chapter.period_key === 'string' ? chapter.period_key : chapterId;
    return stageServerProposal(stageProposal, {
      capabilityId: 'chapters', title: note ? 'Add a line to your Chapter' : 'Clear your Chapter note',
      body: 'Reviews this personal Chapter note before saving it.',
      operation: {
        type: 'update_chapter_note', targetType: 'chapter', targetId: chapterId,
        summary: `Update Chapter ${periodKey} note`, payload: { note, expectedUpdatedAt },
      },
    });
  }
  if (call.toolId === 'activities.capture') {
    const payload = normalizeActivityCapture(call.arguments, timeZone);
    if (!payload) {
      return { status: 'failed', code: 'invalid_activity_patch', message: 'A valid Activity title and supported fields are required.', retryable: false };
    }
    if (!writeContext || !client.rpc) {
      return { status: 'unavailable', reason: 'server_write_context_unavailable', retryable: false };
    }
    const { data, error } = await client.rpc('capture_kwilt_agent_activity', {
      p_user_id: userId, p_thread_id: writeContext.threadId, p_run_id: writeContext.runId,
      p_message_id: writeContext.messageId, p_call_id: call.id, p_payload: payload,
    });
    const result = asRecord(data);
    const activityId = typeof result.activityId === 'string' ? result.activityId : '';
    const receiptId = typeof result.receiptId === 'string' ? result.receiptId : '';
    if (error || result.status !== 'applied' || !activityId || !receiptId) {
      return { status: 'failed', code: 'activity_capture_failed', message: 'Kwilt could not capture this To-do.', retryable: true };
    }
    return {
      status: 'completed',
      output: { activityId, title: payload.title, replayed: result.replayed === true },
      receipt: { id: receiptId, status: 'applied', resultingObjectType: 'activity', resultingObjectId: activityId },
    };
  }
  if (tool.effect !== 'read' || !tool.providers.includes('server')) {
    return { status: 'unavailable', reason: 'server_provider_unavailable', retryable: false };
  }

  if (call.toolId === 'arcs.read') {
    const { data, error } = await (client.from('kwilt_arcs') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).order('updated_at', { ascending: false }).limit(100);
    if (error) return { status: 'failed', code: 'arcs_read_failed', message: 'Kwilt could not read Arcs.', retryable: true };
    const arcs = (Array.isArray(data) ? data : []).map((row) => summarizeArc(withUpdatedAt(asRecord(row))));
    return { status: 'completed', output: { arcs }, receipt: null };
  }
  if (call.toolId === 'goals.read') {
    const { data, error } = await (client.from('kwilt_goals') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).order('updated_at', { ascending: false }).limit(100);
    if (error) return { status: 'failed', code: 'goals_read_failed', message: 'Kwilt could not read Goals.', retryable: true };
    const goals = (Array.isArray(data) ? data : []).map((row) => summarizeGoal(withUpdatedAt(asRecord(row))));
    return { status: 'completed', output: { goals }, receipt: null };
  }
  if (call.toolId === 'activities.read') {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (client.from('kwilt_activities') as ReadQuery).select('id,data,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).gte('updated_at', since)
      .order('updated_at', { ascending: false }).limit(250);
    if (error) return { status: 'failed', code: 'activities_read_failed', message: 'Kwilt could not read To-dos.', retryable: true };
    const activities = (Array.isArray(data) ? data : [])
      .map((row) => summarizeActivity(withUpdatedAt(asRecord(row)), { includeRich: false }));
    return { status: 'completed', output: { activities }, receipt: null };
  }
  if (call.toolId === 'chapters.read') {
    const { data, error } = await (client.from('kwilt_chapters') as ReadQuery)
      .select('id,period_start,period_end,period_key,output_json,status,user_note,user_note_updated_at,updated_at')
      .eq('user_id', userId).eq('status', 'ready').order('period_start', { ascending: false }).limit(8);
    if (error) return { status: 'failed', code: 'chapters_read_failed', message: 'Kwilt could not read Chapters.', retryable: true };
    const chapters = (Array.isArray(data) ? data : []).map((value) => {
      const row = asRecord(value);
      return {
        ...summarizeChapter(row),
        user_note: typeof row.user_note === 'string' ? row.user_note : null,
        user_note_updated_at: typeof row.user_note_updated_at === 'string' ? row.user_note_updated_at : null,
      };
    });
    return { status: 'completed', output: { chapters }, receipt: null };
  }
  if (call.toolId === 'account.show_up_status') {
    const { data, error } = await (client.from('kwilt_streak_summaries') as ReadQuery)
      .select('last_show_up_date,current_show_up_streak,current_covered_show_up_streak,eligible_repair_until_ms')
      .eq('user_id', userId).maybeSingle();
    if (error) {
      return { status: 'failed', code: 'show_up_status_read_failed', message: 'Kwilt could not read show-up status.', retryable: true };
    }
    return { status: 'completed', output: { showUp: summarizeShowUpStatus(data ?? {}) }, receipt: null };
  }
  return { status: 'unavailable', reason: 'unknown_server_tool', retryable: false };
}

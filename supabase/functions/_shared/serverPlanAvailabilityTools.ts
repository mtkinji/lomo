import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';

type QueryResult = { data: unknown; error: unknown };
type Query = {
  select: (...args: unknown[]) => Query;
  eq: (...args: unknown[]) => Query;
  maybeSingle: () => Promise<QueryResult>;
};
type Client = { from: (table: string) => unknown };
type Mode = 'work' | 'personal';
type Window = { weekday: number; mode: Mode; startLocalTime: string; endLocalTime: string };

const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function minutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeWindows(value: unknown): Window[] | null {
  if (!Array.isArray(value) || value.length > 28) return null;
  const windows: Window[] = [];
  for (const candidate of value) {
    const item = record(candidate);
    if (Object.keys(item).some((key) => !['weekday', 'mode', 'startLocalTime', 'endLocalTime'].includes(key))
      || !Number.isInteger(item.weekday) || Number(item.weekday) < 1 || Number(item.weekday) > 7
      || (item.mode !== 'work' && item.mode !== 'personal')
      || typeof item.startLocalTime !== 'string' || !LOCAL_TIME.test(item.startLocalTime)
      || typeof item.endLocalTime !== 'string' || !LOCAL_TIME.test(item.endLocalTime)
      || minutes(item.endLocalTime) <= minutes(item.startLocalTime)) return null;
    windows.push({
      weekday: Number(item.weekday), mode: item.mode,
      startLocalTime: item.startLocalTime, endLocalTime: item.endLocalTime,
    });
  }
  const grouped = new Map<string, Window[]>();
  for (const window of windows) {
    const key = `${window.weekday}:${window.mode}`;
    grouped.set(key, [...(grouped.get(key) ?? []), window]);
  }
  for (const values of grouped.values()) {
    const sorted = [...values].sort((left, right) => minutes(left.startLocalTime) - minutes(right.startLocalTime));
    if (sorted.some((window, index) => index > 0
      && minutes(window.startLocalTime) < minutes(sorted[index - 1]!.endLocalTime))) return null;
  }
  return windows;
}

function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function affectedWeekdays(previous: Window[], next: Window[]): number[] {
  const signature = (windows: Window[], weekday: number) => JSON.stringify(windows
    .filter((window) => window.weekday === weekday)
    .sort((left, right) => `${left.mode}:${left.startLocalTime}:${left.endLocalTime}`
      .localeCompare(`${right.mode}:${right.startLocalTime}:${right.endLocalTime}`)));
  return [1, 2, 3, 4, 5, 6, 7].filter((weekday) => signature(previous, weekday) !== signature(next, weekday));
}

export async function executeServerPlanAvailabilityTool({ client, userId, call, stageDeviceAction }: {
  client: Client;
  userId: string;
  call: ServerAgentToolCall;
  stageDeviceAction: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (call.toolId !== 'plan.availability.read' && call.toolId !== 'plan.availability.update') return null;
  const { data, error } = await (client.from('kwilt_agent_profile_projections') as Query)
    .select('timezone,plan_availability_version,plan_availability')
    .eq('user_id', userId).maybeSingle();
  const projection = record(data);
  const version = projection.plan_availability_version;
  const timeZone = projection.timezone;
  const windows = normalizeWindows(projection.plan_availability);
  if (error || !Number.isInteger(version) || Number(version) < 0 || !validTimeZone(timeZone) || !windows) {
    return {
      status: 'failed', code: 'plan_availability_projection_unavailable',
      message: 'Open the current Kwilt build once so Plan availability can sync securely.', retryable: true,
    };
  }
  if (call.toolId === 'plan.availability.read') {
    return { status: 'completed', output: { version, timeZone, windows }, receipt: null };
  }
  const expectedVersion = call.arguments.expectedVersion;
  if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 0
    || !validTimeZone(call.arguments.timeZone)) {
    return { status: 'failed', code: 'invalid_plan_availability', message: 'The availability review is invalid.', retryable: false };
  }
  const nextWindows = normalizeWindows(call.arguments.windows);
  if (!nextWindows) {
    return { status: 'failed', code: 'invalid_plan_availability', message: 'The availability windows are invalid.', retryable: false };
  }
  if (expectedVersion !== version) {
    return {
      status: 'failed', code: 'plan_availability_version_stale',
      message: `Plan availability changed from version ${expectedVersion} to ${version}. Read it again before updating.`, retryable: true,
    };
  }
  const request: ServerDeviceActionRequest = {
    capabilityId: 'plan', actionType: 'review_plan_availability', targetType: 'plan_availability', targetId: null,
    title: 'Review Plan availability',
    consequenceSummary: 'Kwilt will open the exact weekly availability and time zone for native review. Nothing changes until you apply it there.',
    payload: {
      expectedVersion, timeZone: call.arguments.timeZone.trim(), windows: nextWindows,
      affectedWeekdays: affectedWeekdays(windows, nextWindows),
    },
  };
  await stageDeviceAction(request);
  return { status: 'pending_client_action', provider: 'device', request };
}

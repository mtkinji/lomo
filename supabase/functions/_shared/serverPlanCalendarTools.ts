import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';

export async function executeServerPlanCalendarTool({ call, stageDeviceAction }: {
  call: ServerAgentToolCall;
  stageDeviceAction: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (call.toolId !== 'plan.calendars.read' && call.toolId !== 'plan.calendars.update') return null;
  let payload: Record<string, unknown> = { reason: 'inspect' };
  if (call.toolId === 'plan.calendars.update') {
    const expectedVersion = call.arguments.expectedVersion;
    const readCalendarIds = call.arguments.readCalendarIds;
    const writeCalendarId = call.arguments.writeCalendarId;
    if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 0 || !Array.isArray(readCalendarIds)
      || readCalendarIds.length > 50 || readCalendarIds.some((id) => typeof id !== 'string' || !id.trim() || id.length > 500)
      || new Set(readCalendarIds).size !== readCalendarIds.length
      || (writeCalendarId !== null && (typeof writeCalendarId !== 'string' || !writeCalendarId.trim() || writeCalendarId.length > 500))) {
      return { status: 'failed', code: 'invalid_plan_calendar_selection', message: 'The Plan calendar selection is invalid.', retryable: false };
    }
    payload = { expectedVersion, readCalendarIds, writeCalendarId };
  }
  const request: ServerDeviceActionRequest = {
    capabilityId: 'plan', actionType: 'review_plan_calendars', targetType: 'plan_calendars', targetId: null,
    title: call.toolId.endsWith('.read') ? 'Review Plan calendars' : 'Apply Plan calendar selection',
    consequenceSummary: 'Kwilt will open native Calendar settings. Calendar names and authorization are loaded on the device; no event contents enter ChatGPT.',
    payload,
  };
  await stageDeviceAction(request);
  return { status: 'pending_client_action', provider: 'device', request };
}

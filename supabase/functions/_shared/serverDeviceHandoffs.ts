import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';

export type ServerDeviceActionRequest = {
  capabilityId: string; actionType: string; targetType: string | null; targetId: string | null;
  title: string; consequenceSummary: string; payload: Record<string, unknown>;
};

type ReadResult = { data: unknown; error: unknown };
type ReadQuery = {
  select: (...args: unknown[]) => ReadQuery;
  eq: (...args: unknown[]) => ReadQuery;
  maybeSingle: () => Promise<ReadResult>;
};
type DataClient = { from: (table: string) => unknown };

const ACTIVITY_HANDOFFS: Record<string, (title: string) => Omit<ServerDeviceActionRequest, 'capabilityId' | 'targetType' | 'targetId'>> = {
  'activities.open_focus': (title) => ({
    actionType: 'open_activity_focus', title: `Open Focus for ${title}`,
    consequenceSummary: 'Kwilt will open the Focus sheet. You still choose whether and how long to start the timer.',
    payload: { route: 'activity', openFocus: true },
  }),
  'activities.location.update': (title) => ({
    actionType: 'open_activity_location', title: `Review location for ${title}`,
    consequenceSummary: 'Kwilt will open this To-do. Location access and any trigger remain under native permission and review.',
    payload: { route: 'activity' },
  }),
  'activities.attachments.open': (title) => ({
    actionType: 'open_activity_attachments', title: `Add an attachment to ${title}`,
    consequenceSummary: 'Kwilt will open this To-do. You choose the file or photo in the native picker.',
    payload: { route: 'activity' },
  }),
  'activities.share.open': (title) => ({
    actionType: 'open_activity_share', title: `Review sharing for ${title}`,
    consequenceSummary: 'Kwilt will open this To-do. Nothing is shared until you choose the audience and confirm natively.',
    payload: { route: 'activity' },
  }),
};

export async function executeServerDeviceHandoff({ client, userId, call, stageDeviceAction }: {
  client: DataClient; userId: string; call: ServerAgentToolCall;
  stageDeviceAction: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  const activityHandoff = ACTIVITY_HANDOFFS[call.toolId];
  if (activityHandoff) {
    const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId.trim() : '';
    if (!activityId) return { status: 'failed', code: 'invalid_activity', message: 'A valid Activity is required.', retryable: false };
    const { data, error } = await (client.from('kwilt_activities') as ReadQuery).select('id,data')
      .eq('user_id', userId).eq('is_deleted', false).eq('id', activityId).maybeSingle();
    const row = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
    const record = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data as Record<string, unknown> : {};
    if (error || row.id !== activityId) return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
    const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : 'To-do';
    const request: ServerDeviceActionRequest = {
      capabilityId: 'todos', targetType: 'activity', targetId: activityId, ...activityHandoff(title),
    };
    await stageDeviceAction(request);
    return { status: 'pending_client_action', provider: 'device', request };
  }
  if (call.toolId !== 'goals.share.open' && call.toolId !== 'goals.check_in') return null;
  const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId.trim() : '';
  const text = typeof call.arguments.text === 'string' ? call.arguments.text.trim() : '';
  if (!goalId || (call.toolId === 'goals.check_in' && (!text || text.length > 2000))) {
    return { status: 'failed', code: 'invalid_goal_handoff', message: 'A valid Goal and supported draft are required.', retryable: false };
  }
  const { data, error } = await (client.from('kwilt_goals') as ReadQuery).select('id,data,updated_at')
    .eq('user_id', userId).eq('is_deleted', false).eq('id', goalId).maybeSingle();
  const row = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const record = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data as Record<string, unknown> : {};
  if (error || row.id !== goalId) return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
  const title = typeof record.title === 'string' && record.title.trim() ? record.title.trim() : 'Goal';
  const checkIn = call.toolId === 'goals.check_in';
  const request: ServerDeviceActionRequest = checkIn ? {
    capabilityId: 'goals', actionType: 'open_goal_checkin', targetType: 'goal', targetId: goalId,
    title: `Review check-in for ${title}`,
    consequenceSummary: 'Kwilt will prepare this draft and open the native audience review. Nothing is sent until you confirm there.',
    payload: { text },
  } : {
    capabilityId: 'goals', actionType: 'open_goal_share', targetType: 'goal', targetId: goalId,
    title: `Review sharing for ${title}`,
    consequenceSummary: 'Kwilt will open this Goal. Nothing is shared until you choose visibility, audience, and confirm natively.',
    payload: { route: 'goal' },
  };
  await stageDeviceAction(request);
  return { status: 'pending_client_action', provider: 'device', request };
}

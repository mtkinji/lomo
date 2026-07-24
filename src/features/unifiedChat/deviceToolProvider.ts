import type { AgentToolCall, AgentToolDefinition, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type { UnifiedChatCapabilityId } from './requestPolicy';

export type StagedUnifiedChatClientAction = {
  capabilityId: UnifiedChatCapabilityId;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
};

const DEVICE_TOOL_IDS = new Set([
  'screen_time.configure', 'notifications.configure', 'navigation.search.open',
  'navigation.account_settings.open', 'account.subscription.open', 'account.delete.open',
  'activities.open_focus', 'activities.location.update', 'activities.attachments.open',
  'activities.share.open', 'goals.share.open', 'goals.check_in', 'plan.preferences.open',
]);

export function createDeviceToolProvider({ snapshots }: { snapshots: UnifiedChatCapabilitySnapshots }) {
  const staged: StagedUnifiedChatClientAction[] = [];

  const stage = (request: StagedUnifiedChatClientAction): AgentToolExecutionResult => {
    staged.push(request);
    return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
  };

  const execute = async (call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult | null> => {
    if (!DEVICE_TOOL_IDS.has(call.toolId)) return null;
    if (call.toolId !== tool.id) {
      return { status: 'failed', code: 'tool_mismatch', message: 'The discovered device tool does not match this call.', retryable: false };
    }
    if (call.toolId.startsWith('activities.')) {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
      const definition = call.toolId === 'activities.open_focus'
        ? { actionType: 'open_activity_focus', title: `Open Focus for ${activity.title}`, consequenceSummary: 'Kwilt will open the Focus sheet. You still choose whether and how long to start the timer.', payload: { route: 'activity', openFocus: true } }
        : call.toolId === 'activities.location.update'
          ? { actionType: 'open_activity_location', title: `Review location for ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. Location access and any trigger remain under native permission and review.', payload: { route: 'activity' } }
          : call.toolId === 'activities.attachments.open'
            ? { actionType: 'open_activity_attachments', title: `Add an attachment to ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. You choose the file or photo in the native picker.', payload: { route: 'activity' } }
            : { actionType: 'open_activity_share', title: `Review sharing for ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. Nothing is shared until you choose the audience and confirm natively.', payload: { route: 'activity' } };
      return stage({ capabilityId: 'todos', targetType: 'activity', targetId: activity.id, ...definition });
    }
    if (call.toolId === 'goals.share.open' || call.toolId === 'goals.check_in') {
      const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId : '';
      const goal = snapshots.goals.goals.find((candidate) => candidate.id === goalId);
      if (!goal) return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
      if (call.toolId === 'goals.check_in') {
        const text = typeof call.arguments.text === 'string' ? call.arguments.text.trim() : '';
        if (!text || text.length > 2000) {
          return { status: 'failed', code: 'invalid_checkin_text', message: 'A valid check-in draft is required.', retryable: false };
        }
        return stage({
          capabilityId: 'goals', actionType: 'open_goal_checkin', targetType: 'goal', targetId: goal.id,
          title: `Review check-in for ${goal.title}`,
          consequenceSummary: 'Kwilt will prepare this draft and open the native audience review. Nothing is sent until you confirm there.',
          payload: { text },
        });
      }
      return stage({
        capabilityId: 'goals', actionType: 'open_goal_share', targetType: 'goal', targetId: goal.id,
        title: `Review sharing for ${goal.title}`,
        consequenceSummary: 'Kwilt will open this Goal. Nothing is shared until you choose visibility, audience, and confirm natively.',
        payload: { route: 'goal' },
      });
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
      return stage({
        capabilityId: 'screenTime', actionType: 'configure_screen_time', targetType: 'screen_time_rule', targetId: null,
        title: `Review ${appName} access for ${childName}`,
        consequenceSummary: `Kwilt will prepare ${desiredAccess === 'allow' ? 'allowing' : 'blocking'} ${appName} for ${childName}. Household role, Apple authorization, device apply, and acknowledgement must all succeed before Kwilt reports the change complete.`,
        payload: { childName, appName, desiredAccess, entrySurface: 'settings' },
      });
    }
    const definitions: Record<string, StagedUnifiedChatClientAction> = {
      'notifications.configure': {
        capabilityId: 'notifications', actionType: 'configure_notifications', targetType: null, targetId: null,
        title: 'Review notification settings',
        consequenceSummary: 'Kwilt will open notification settings. System permission and reminder choices remain under native review.', payload: {},
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
        consequenceSummary: 'Account deletion is destructive. Kwilt will open the native consequence and confirmation flow; Chat will not delete the account.', payload: {},
      },
      'plan.preferences.open': {
        capabilityId: 'plan', actionType: 'open_plan_preferences', targetType: null, targetId: null,
        title: 'Review Plan preferences',
        consequenceSummary: 'Kwilt will open native availability and calendar preference settings.', payload: {},
      },
    };
    return stage(definitions[call.toolId]);
  };

  return { execute, actions: (): readonly StagedUnifiedChatClientAction[] => [...staged] };
}

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
  'money.app_control.review',
  'screen_time.personal.setup.open', 'screen_time.personal.limit.open',
  'screen_time.configure', 'screen_time.selection.open', 'screen_time.device.setup.open',
  'screen_time.device.release.open', 'notifications.configure', 'navigation.search.open',
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
    if (call.toolId === 'money.app_control.review') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      const condition = call.arguments.condition as Record<string, unknown> | undefined;
      const effect = call.arguments.effect as Record<string, unknown> | undefined;
      const categoryId = typeof condition?.categoryId === 'string' ? condition.categoryId.trim() : '';
      const preset = typeof condition?.preset === 'string' ? condition.preset : '';
      const presets = new Set(['always_review', 'when_hot', 'at_95_percent', 'when_over', 'needs_review']);
      const suggestedAppLabels = Array.isArray(effect?.suggestedAppLabels)
        ? effect.suggestedAppLabels.flatMap((value) => typeof value === 'string' && value.trim()
            ? [value.trim().slice(0, 80)] : []).slice(0, 8)
        : [];
      if (
        subject?.kind !== 'self' || condition?.owner !== 'money' || effect?.owner !== 'screenTime' ||
        effect?.kind !== 'pause_selected_apps' || !categoryId || !presets.has(preset)
      ) {
        return { status: 'failed', code: 'invalid_money_app_control_intent', message: 'That app-control request does not have a valid self subject, Money condition, and Screen Time effect.', retryable: false };
      }
      const category = snapshots.money?.categories.find((candidate) => (
        candidate.id === categoryId || candidate.sourceId === categoryId
      ));
      if (!category) {
        return { status: 'needs_input', prompt: 'Which Money category should decide when those apps pause?', fields: ['categoryId'] };
      }
      return stage({
        capabilityId: 'money', actionType: 'review_money_app_control',
        targetType: 'money_category', targetId: category.sourceId,
        title: `Review app controls for ${category.name}`,
        consequenceSummary: 'Kwilt will open this Money category. You still choose the apps and review the condition with Apple Screen Time. Nothing is applied in Chat.',
        payload: { subject: { kind: 'self' }, preset, suggestedAppLabels },
      });
    }
    if (call.toolId === 'screen_time.personal.setup.open') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      if (subject?.kind !== 'self') {
        return { status: 'failed', code: 'invalid_personal_screen_time_subject', message: 'Personal Screen Time setup requires the signed-in person on this device.', retryable: false };
      }
      return stage({
        capabilityId: 'screenTime', actionType: 'configure_screen_time',
        targetType: 'personal_screen_time_device', targetId: 'self',
        title: 'Set up My Screen Time',
        consequenceSummary: 'Kwilt will open Screen Time setup on this device. Apple permission and app selection remain under your review.',
        payload: { subject: { kind: 'self' } },
      });
    }
    if (call.toolId === 'screen_time.personal.limit.open') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      const limitMinutes = Number(call.arguments.limitMinutes);
      const suggestedAppLabel = typeof call.arguments.suggestedAppLabel === 'string'
        ? call.arguments.suggestedAppLabel.trim().slice(0, 80)
        : null;
      if (subject?.kind !== 'self' || !Number.isInteger(limitMinutes)
        || limitMinutes < 1 || limitMinutes > 1440 || call.arguments.reset !== 'daily') {
        return {
          status: 'failed', code: 'invalid_personal_screen_time_limit',
          message: 'Personal Screen Time limits require the signed-in person, a daily reset, and a valid minute allowance.',
          retryable: false,
        };
      }
      return stage({
        capabilityId: 'screenTime', actionType: 'open_personal_screen_time_limit',
        targetType: 'personal_screen_time_device', targetId: 'self',
        title: `Review ${limitMinutes}-minute app limit`,
        consequenceSummary: 'Kwilt will open native rule review on this device. You still choose the apps and save the rule there.',
        payload: {
          subject: { kind: 'self' }, limitMinutes, reset: 'daily',
          ...(suggestedAppLabel ? { suggestedAppLabel } : {}),
        },
      });
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
      return {
        status: 'unavailable',
        retryable: false,
        reason: 'Cross-device Screen Time control is not available yet. Kwilt can only manage selected apps on this device.',
      };
    }
    if (call.toolId === 'screen_time.selection.open' || call.toolId === 'screen_time.device.setup.open'
      || call.toolId === 'screen_time.device.release.open') {
      const childMembershipId = typeof call.arguments.childMembershipId === 'string'
        ? call.arguments.childMembershipId.trim()
        : '';
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.householdId && candidate.membershipId === childMembershipId
      ));
      if (!child) {
        return {
          status: 'failed', code: 'screen_time_child_not_found',
          message: 'That child is not available in your authorized Screen Time household.', retryable: true,
        };
      }
      const setupStep = call.toolId === 'screen_time.selection.open'
        ? 'selection'
        : call.toolId === 'screen_time.device.release.open' ? 'release' : 'device';
      const suggestedLabel = typeof call.arguments.suggestedLabel === 'string'
        ? call.arguments.suggestedLabel.trim().slice(0, 80)
        : null;
      return stage({
        capabilityId: 'screenTime', actionType: 'open_family_screen_time_setup',
        targetType: 'family_screen_time_child', targetId: child.membershipId,
        title: setupStep === 'release'
          ? `Review ${child.displayName}'s device release`
          : `Continue Screen Time setup for ${child.displayName}`,
        consequenceSummary: setupStep === 'release'
          ? 'Kwilt will open native release review. Removing protection still happens only after you confirm there.'
          : 'Kwilt will open the exact native setup step. Apple authorization or app selection still happens there.',
        payload: {
          householdId: child.householdId,
          childDisplayName: child.displayName,
          setupStep,
          ...(suggestedLabel ? { suggestedLabel } : {}),
        },
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

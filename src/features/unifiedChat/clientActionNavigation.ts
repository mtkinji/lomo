import type { UnifiedChatClientAction } from './types';

export type ClientActionOpenInstruction =
  | { kind: 'search' }
  | { kind: 'navigate'; name: 'MainTabs' | 'Settings'; params: Record<string, unknown> };

export function resolveClientActionOpenInstruction(
  action: UnifiedChatClientAction,
): ClientActionOpenInstruction | null {
  switch (action.actionType) {
    case 'open_search': return { kind: 'search' };
    case 'open_activity_focus':
      if (!action.targetId) return null;
      return {
        kind: 'navigate', name: 'MainTabs', params: {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivityDetail', params: { activityId: action.targetId, openFocus: true } },
        },
      };
    case 'open_activity_location':
    case 'open_activity_attachments':
    case 'open_activity_share':
      if (!action.targetId) return null;
      return {
        kind: 'navigate', name: 'MainTabs', params: {
          screen: 'ActivitiesTab',
          params: { screen: 'ActivityDetail', params: { activityId: action.targetId } },
        },
      };
    case 'open_goal_share':
      if (!action.targetId) return null;
      return {
        kind: 'navigate', name: 'MainTabs', params: {
          screen: 'GoalsTab', params: { screen: 'GoalDetail', params: { goalId: action.targetId } },
        },
      };
    case 'open_goal_checkin':
      if (!action.targetId) return null;
      return {
        kind: 'navigate', name: 'MainTabs', params: {
          screen: 'GoalsTab', params: {
            screen: 'GoalDetail',
            params: { goalId: action.targetId, openCheckinApprovalSheet: true },
          },
        },
      };
    case 'configure_screen_time':
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsScreenTimeProtection',
          params: { setupIntent: 'settings_discovery', entrySurface: 'settings' },
        },
      };
    case 'configure_notifications':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsNotifications' } };
    case 'open_account_settings':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsHome' } };
    case 'open_subscription_management':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsManageSubscription' } };
    case 'open_account_deletion':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsProfile', params: { openAccountDeletion: true } } };
    case 'open_plan_preferences':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsPlanAvailability' } };
    default: return null;
  }
}

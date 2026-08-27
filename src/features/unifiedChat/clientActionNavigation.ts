import type { UnifiedChatClientAction } from './types';

export type ClientActionOpenInstruction =
  | { kind: 'search' }
  | { kind: 'navigate'; name: 'MainTabs' | 'Settings' | 'Money'; params: Record<string, unknown> };

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
    case 'review_money_app_control': {
      const suggestedPreset = typeof action.payload.preset === 'string' ? action.payload.preset : null;
      const suggestedAppLabels = Array.isArray(action.payload.suggestedAppLabels)
        ? action.payload.suggestedAppLabels.filter((value): value is string => typeof value === 'string')
        : [];
      if (!action.targetId || action.payload.subject == null || suggestedPreset === null) return null;
      return {
        kind: 'navigate', name: 'Money', params: {
          screen: 'MoneyAppControl', params: {
            categoryId: action.targetId, suggestedPreset, suggestedAppLabels,
          },
        },
      };
    }
    case 'open_money_connection_repair':
      if (!action.targetId || action.targetType !== 'money_connection'
        || action.payload.toolId !== 'money.connection.repair.open') return null;
      return { kind: 'navigate', name: 'Money', params: { screen: 'MoneyAccounts' } };
    case 'open_money_control': {
      const toolId = typeof action.payload.toolId === 'string' ? action.payload.toolId : '';
      if (toolId.startsWith('money.transaction.')) {
        if (!action.targetId || action.targetType !== 'money_transaction') return null;
        return {
          kind: 'navigate', name: 'Money',
          params: { screen: 'MoneyTransactionDetail', params: { transactionId: action.targetId } },
        };
      }
      if (toolId.startsWith('money.connection.')) {
        if (!action.targetId || action.targetType !== 'money_connection') return null;
        return { kind: 'navigate', name: 'Money', params: { screen: 'MoneyAccounts' } };
      }
      if (toolId === 'money.transfer.get' || toolId === 'money.transfer.review') {
        if (!action.targetId || action.targetType !== 'money_transfer') return null;
        return {
          kind: 'navigate', name: 'Money',
          params: { screen: 'MoneyTransactions', params: { reviewState: 'not_counted' } },
        };
      }
      if (toolId === 'money.transfer.list') {
        return {
          kind: 'navigate', name: 'Money',
          params: { screen: 'MoneyTransactions', params: { reviewState: 'not_counted' } },
        };
      }
      if (toolId === 'money.budget.read' || toolId === 'money.budget.update' || !toolId) {
        return { kind: 'navigate', name: 'Money', params: { screen: 'MoneySummary' } };
      }
      return null;
    }
    case 'configure_screen_time':
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsScreenTimeProtection',
          params: { setupIntent: 'settings_discovery', entrySurface: 'settings' },
        },
      };
    case 'open_personal_screen_time_limit': {
      const subject = action.payload.subject;
      const limitMinutes = Number(action.payload.limitMinutes);
      const suggestedAppLabel = typeof action.payload.suggestedAppLabel === 'string'
        ? action.payload.suggestedAppLabel.trim()
        : '';
      if (action.targetId !== 'self'
        || action.targetType !== 'personal_screen_time_device'
        || subject == null
        || typeof subject !== 'object'
        || (subject as { kind?: unknown }).kind !== 'self'
        || !Number.isInteger(limitMinutes)
        || limitMinutes < 1
        || limitMinutes > 1440
        || action.payload.reset !== 'daily') return null;
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsScreenTimeRuleBuilder', params: {
            entry: 'contextual',
            suggestedKind: 'daily_limit',
            suggestedLimitMinutes: limitMinutes,
            ...(suggestedAppLabel ? { suggestedAppLabel } : {}),
            setupIntent: 'settings_discovery',
            entrySurface: 'settings',
          },
        },
      };
    }
    case 'open_personal_screen_time_rules':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsScreenTimeProtection' } };
    case 'open_personal_screen_time_rule': {
      if (!action.targetId) return null;
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'inventory', ruleId: action.targetId },
        },
      };
    }
    case 'open_family_screen_time_setup': {
      const childDisplayName = typeof action.payload.childDisplayName === 'string'
        ? action.payload.childDisplayName.trim()
        : '';
      const householdId = typeof action.payload.householdId === 'string'
        ? action.payload.householdId.trim()
        : '';
      const setupStep = action.payload.setupStep === 'selection' || action.payload.setupStep === 'release'
        ? action.payload.setupStep
        : 'device';
      if (!action.targetId || !householdId || !childDisplayName) return null;
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsFamilyScreenTime', params: {
            householdId,
            childMembershipId: action.targetId,
            childDisplayName,
            setupStep,
            ...(typeof action.payload.suggestedLabel === 'string'
              ? { suggestedLabel: action.payload.suggestedLabel }
              : {}),
            clientActionId: action.id,
          },
        },
      };
    }
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

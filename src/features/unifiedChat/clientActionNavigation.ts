import type { UnifiedChatClientAction } from './types';
import {
  parseCapabilityNavigationRequest,
  resolveChatCapabilityNavigation,
} from '../../navigation/capabilityNavigationAction';
import { parseConnectedToolConnectRequest } from '../account/actions/connectedToolActions';

export type ClientActionOpenInstruction =
  | { kind: 'search' }
  | { kind: 'navigate'; name: 'MainTabs' | 'Settings' | 'Money' | 'Chores' | 'Food' | 'StandaloneFocus'; params: Record<string, unknown> };

export function resolveClientActionOpenInstruction(
  action: UnifiedChatClientAction,
): ClientActionOpenInstruction | null {
  switch (action.actionType) {
    case 'open_search': return { kind: 'search' };
    case 'open_widgets_settings':
      if (action.targetType !== 'device_setting' || action.targetId !== 'widgets'
        || action.payload.openSetup !== true) return null;
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsWidgets' } };
    case 'open_connected_tool_setup': {
      const request = parseConnectedToolConnectRequest(action.payload);
      if (!request || action.targetType !== 'connection_provider' || action.targetId !== request.providerId) return null;
      return {
        kind: 'navigate', name: 'Settings',
        params: { screen: 'SettingsConnectKwiltApp', params: { app: request.providerId } },
      };
    }
    case 'open_capability': {
      const request = parseCapabilityNavigationRequest(action.payload);
      if (!request) return null;
      const target = resolveChatCapabilityNavigation(request);
      return { kind: 'navigate', name: target.name, params: 'params' in target ? target.params : {} };
    }
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
      const categoryName = action.targetId.replace(/[_-]+/g, ' ').replace(/^./, (value) => value.toUpperCase());
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsScreenTimeRuleBuilder', params: {
            entry: 'contextual',
            suggestedBudgetCondition: {
              categorySourceId: action.targetId,
              categoryName,
              preset: suggestedPreset,
            },
            ...(suggestedAppLabels[0] ? { suggestedAppLabel: suggestedAppLabels[0] } : {}),
            setupIntent: 'settings_discovery',
            entrySurface: 'settings',
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
      if (toolId === 'money.read') {
        return { kind: 'navigate', name: 'Money', params: { screen: 'MoneySummary' } };
      }
      if (toolId === 'money.review_transaction') {
        if (action.targetType === 'money_transaction' && action.targetId) {
          return {
            kind: 'navigate', name: 'Money',
            params: { screen: 'MoneyTransactionDetail', params: { transactionId: action.targetId } },
          };
        }
        return action.targetType === 'money'
          ? { kind: 'navigate', name: 'Money', params: { screen: 'MoneyTransactions', params: { reviewState: 'needs_review' } } }
          : null;
      }
      if (toolId === 'money.category.create') {
        return action.targetType === 'money'
          ? { kind: 'navigate', name: 'Money', params: { screen: 'MoneyCategoryCreate' } } : null;
      }
      if (toolId === 'money.category.rename' || toolId === 'money.category.update') {
        return action.targetType === 'money_category' && action.targetId
          ? { kind: 'navigate', name: 'Money', params: { screen: 'MoneyCategoryDetail', params: { categoryId: action.targetId } } }
          : null;
      }
      if (toolId === 'money.privacy.configure') {
        return action.targetType === 'money'
          ? { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsMoneyPrivacy' } } : null;
      }
      if (toolId === 'money.connection.connect' || toolId === 'money.connection.sync') {
        return action.targetType === 'money' || action.targetType === 'money_connection'
          ? { kind: 'navigate', name: 'Money', params: { screen: 'MoneyAccounts' } } : null;
      }
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
    case 'open_chore_evidence_picker':
      if (!action.targetId || action.targetType !== 'chore_occurrence') return null;
      return { kind: 'navigate', name: 'Chores', params: { occurrenceId: action.targetId, openEvidencePicker: true } };
    case 'open_chores':
      return { kind: 'navigate', name: 'Chores', params: {} };
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
    case 'review_notification_preferences': {
      const fields = action.payload.fields;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
      return { kind: 'navigate', name: 'Settings', params: {
        screen: 'SettingsNotifications', params: { clientActionId: action.id, fields },
      } };
    }
    case 'open_account_settings':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsHome' } };
    case 'open_subscription_management':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsManageSubscription' } };
    case 'open_account_deletion':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsProfile', params: { openAccountDeletion: true } } };
    case 'open_plan_preferences':
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsPlanAvailability' } };
    case 'review_plan_availability': {
      const expectedVersion = Number(action.payload.expectedVersion);
      const timeZone = typeof action.payload.timeZone === 'string' ? action.payload.timeZone : '';
      const windows = Array.isArray(action.payload.windows) ? action.payload.windows : null;
      const affectedWeekdays = Array.isArray(action.payload.affectedWeekdays)
        ? action.payload.affectedWeekdays : null;
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || !timeZone || !windows || !affectedWeekdays) {
        return null;
      }
      return {
        kind: 'navigate', name: 'Settings', params: {
          screen: 'SettingsPlanAvailability', params: {
            clientActionId: action.id, expectedVersion, timeZone, windows, affectedWeekdays,
          },
        },
      };
    }
    case 'review_plan_calendars': {
      const reason = action.payload.reason === 'not_connected' || action.payload.reason === 'needs_reconnect'
        || action.payload.reason === 'inspect'
        ? action.payload.reason : null;
      if (reason) return { kind: 'navigate', name: 'Settings', params: {
        screen: 'SettingsPlanCalendars', params: { clientActionId: action.id, reason },
      } };
      const expectedVersion = Number(action.payload.expectedVersion);
      const readCalendarIds = Array.isArray(action.payload.readCalendarIds) ? action.payload.readCalendarIds : null;
      const writeCalendarId = typeof action.payload.writeCalendarId === 'string' ? action.payload.writeCalendarId : null;
      const addedReadCalendarIds = Array.isArray(action.payload.addedReadCalendarIds) ? action.payload.addedReadCalendarIds : [];
      const removedReadCalendarIds = Array.isArray(action.payload.removedReadCalendarIds) ? action.payload.removedReadCalendarIds : [];
      const writeCalendarChanged = typeof action.payload.writeCalendarChanged === 'boolean'
        ? action.payload.writeCalendarChanged : false;
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || !readCalendarIds
        || (action.payload.writeCalendarId !== null && typeof action.payload.writeCalendarId !== 'string')) return null;
      return { kind: 'navigate', name: 'Settings', params: { screen: 'SettingsPlanCalendars', params: {
        clientActionId: action.id, expectedVersion, readCalendarIds, writeCalendarId,
        addedReadCalendarIds, removedReadCalendarIds, writeCalendarChanged,
      } } };
    }
    case 'open_recipe_import': {
      const method = typeof action.payload.method === 'string' ? action.payload.method : '';
      if (!['url', 'photo', 'scan', 'text', 'voice', 'email'].includes(method)) return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'RecipeImportReview', params: { intent: method === 'url' ? 'web' : 'family' },
      } };
    }
    case 'open_cook_session_timer': {
      const recipeId = typeof action.payload.recipeId === 'string' ? action.payload.recipeId.trim() : '';
      const multiplier = Number(action.payload.recipeScaleMultiplier);
      if (!recipeId || ![1, 2, 3].includes(multiplier)) return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'RecipeCookMode', params: { recipeId, recipeScaleMultiplier: multiplier },
      } };
    }
    case 'open_recipe_share_copy': {
      const recipeVersionId = typeof action.payload.recipeVersionId === 'string' ? action.payload.recipeVersionId.trim() : '';
      const recipientPersonId = typeof action.payload.recipientPersonId === 'string' ? action.payload.recipientPersonId.trim() : '';
      if (!action.targetId || !recipeVersionId || !recipientPersonId) return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'RecipeHome', params: { recipeId: action.targetId },
      } };
    }
    case 'open_grocery_product_match': {
      const groceryListId = typeof action.payload.groceryListId === 'string' ? action.payload.groceryListId.trim() : '';
      if (!action.targetId || action.targetType !== 'grocery_item' || !groceryListId || action.payload.provider !== 'kroger') return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'KrogerCart', params: { listId: groceryListId },
      } };
    }
    case 'open_grocery_handoff':
      if (!action.targetId || action.targetType !== 'grocery_list') return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'GroceryHandoff', params: { listId: action.targetId },
      } };
    case 'open_recipe_publication_review':
      if (!action.targetId || action.targetType !== 'recipe') return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'RecipeHome', params: { recipeId: action.targetId },
      } };
    case 'open_food_scenario_review':
      if (!action.targetId || action.targetType !== 'food_scenario') return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'FoodScenarioReview', params: { scenarioId: action.targetId },
      } };
    case 'open_grocery_savings':
      if (!action.targetId || action.targetType !== 'grocery_list') return null;
      return { kind: 'navigate', name: 'Food', params: {
        screen: 'GrocerySavings', params: { listId: action.targetId },
      } };
    case 'open_grocery_receipt_review':
    case 'open_grocery_food_review':
      return { kind: 'navigate', name: 'Food', params: { screen: 'GroceryList', params: {} } };
    default: return null;
  }
}

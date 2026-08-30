import type { UnifiedChatClientAction } from './types';
import { resolveClientActionOpenInstruction } from './clientActionNavigation';

const action = (actionType: string, targetId: string | null = null): UnifiedChatClientAction => ({
  id: 'action-1', threadId: 'thread-1', runId: 'run-1', messageId: null,
  capabilityId: 'todos', actionType, targetType: targetId ? 'activity' : null, targetId,
  title: 'Review', consequenceSummary: 'Review natively.', payload: {}, idempotencyKey: 'one',
  status: 'pending_client_action', result: null, errorCode: null, errorMessage: null, version: 1,
  presentedAt: null, completedAt: null, createdAt: 'before', updatedAt: 'before',
});

test('Focus opens the native Activity sheet without auto-starting a session', () => {
  expect(resolveClientActionOpenInstruction(action('open_activity_focus', 'activity-1'))).toEqual({
    kind: 'navigate', name: 'MainTabs', params: {
      screen: 'ActivitiesTab',
      params: { screen: 'ActivityDetail', params: { activityId: 'activity-1', openFocus: true } },
    },
  });
});

test('universal navigation opens only a validated included capability or stable object', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_capability'), capabilityId: 'navigation',
    targetType: 'recipe', targetId: 'recipe-1',
    payload: { capabilityId: 'recipes', objectRef: { objectType: 'recipe', objectId: 'recipe-1' } },
  })).toEqual({
    kind: 'navigate', name: 'Food',
    params: { screen: 'RecipeHome', params: { recipeId: 'recipe-1' } },
  });
  expect(resolveClientActionOpenInstruction({
    ...action('open_capability'), capabilityId: 'navigation',
    payload: { capabilityId: 'games', objectRef: null },
  })).toBeNull();
  expect(resolveClientActionOpenInstruction({
    ...action('open_capability'), capabilityId: 'navigation',
    payload: { capabilityId: 'goals', objectRef: null, route: 'Settings' },
  })).toBeNull();
});

test('widget setup opens Kwilt guidance without claiming iOS placed a widget', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_widgets_settings'), capabilityId: 'account',
    targetType: 'device_setting', targetId: 'widgets', payload: { openSetup: true },
  })).toEqual({
    kind: 'navigate', name: 'Settings', params: { screen: 'SettingsWidgets' },
  });
});

test('connected-tool setup opens only a supported provider-owned route', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_connected_tool_setup', 'cursor'), capabilityId: 'account',
    targetType: 'connection_provider', payload: { providerId: 'cursor' },
  })).toEqual({
    kind: 'navigate', name: 'Settings',
    params: { screen: 'SettingsConnectKwiltApp', params: { app: 'cursor' } },
  });
  expect(resolveClientActionOpenInstruction({
    ...action('open_connected_tool_setup', 'https://evil.example'), capabilityId: 'account',
    targetType: 'connection_provider', payload: { providerId: 'https://evil.example' },
  })).toBeNull();
});

test('Chores handoffs open either the inventory or one exact occurrence evidence review', () => {
  expect(resolveClientActionOpenInstruction({ ...action('open_chores'), capabilityId: 'chores' })).toEqual({
    kind: 'navigate', name: 'Chores', params: {},
  });
  expect(resolveClientActionOpenInstruction({
    ...action('open_chore_evidence_picker', 'occurrence-1'),
    capabilityId: 'chores', targetType: 'chore_occurrence',
  })).toEqual({
    kind: 'navigate', name: 'Chores', params: { occurrenceId: 'occurrence-1', openEvidencePicker: true },
  });
});

test('Recipe import acquisition opens native review without claiming a saved Recipe', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_recipe_import'), capabilityId: 'recipes', targetType: 'recipe_import_source',
    payload: { method: 'photo', sourceArtifactRefs: ['attachment-1'] },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'RecipeImportReview', params: { intent: 'family' },
  } });
});

test('Cook timer handoff opens the exact native Cook Session surface', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_cook_session_timer', 'session-1'), capabilityId: 'recipes', targetType: 'cook_session',
    payload: { recipeId: 'recipe-1', recipeScaleMultiplier: 2, expectedRevision: 3, command: { type: 'start_timer' } },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'RecipeCookMode', params: { recipeId: 'recipe-1', recipeScaleMultiplier: 2 },
  } });
});

test('Recipe copy handoff opens the exact Recipe for native recipient review', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_recipe_share_copy', 'recipe-1'), capabilityId: 'recipes', targetType: 'recipe',
    payload: { recipeVersionId: 'version-2', recipientPersonId: 'person-2' },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'RecipeHome', params: { recipeId: 'recipe-1' },
  } });
});

test('Grocery retailer actions open the exact native list workflow without claiming checkout', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_grocery_product_match', 'item-1'), capabilityId: 'groceries', targetType: 'grocery_item',
    payload: { groceryListId: 'list-1', provider: 'kroger', locationId: 'store-1' },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'KrogerCart', params: { listId: 'list-1' },
  } });
  expect(resolveClientActionOpenInstruction({
    ...action('open_grocery_handoff', 'list-1'), capabilityId: 'groceries', targetType: 'grocery_list',
    payload: { provider: 'instacart', expectedVersion: 3 },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'GroceryHandoff', params: { listId: 'list-1' },
  } });
});

test('advanced Food handoffs return to their exact native review owners', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_recipe_publication_review', 'recipe-1'), capabilityId: 'recipes', targetType: 'recipe',
    payload: { recipeVersionId: 'version-1' },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'RecipeHome', params: { recipeId: 'recipe-1' },
  } });
  expect(resolveClientActionOpenInstruction({
    ...action('open_food_scenario_review', 'scenario-1'), capabilityId: 'groceries', targetType: 'food_scenario',
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'FoodScenarioReview', params: { scenarioId: 'scenario-1' },
  } });
  expect(resolveClientActionOpenInstruction({
    ...action('open_grocery_savings', 'list-1'), capabilityId: 'savings', targetType: 'grocery_list',
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'GrocerySavings', params: { listId: 'list-1' },
  } });
  expect(resolveClientActionOpenInstruction({
    ...action('open_grocery_receipt_review'), capabilityId: 'groceries', targetType: 'grocery_receipt',
    payload: { sourceArtifactRefs: ['attachment-1'] },
  })).toEqual({ kind: 'navigate', name: 'Food', params: {
    screen: 'GroceryList', params: {},
  } });
});

test('Plan availability handoff opens the exact versioned native review', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('review_plan_availability'), capabilityId: 'plan', targetType: 'plan_availability',
    payload: {
      expectedVersion: 2,
      timeZone: 'America/Chicago',
      windows: [{ weekday: 1, mode: 'work', startLocalTime: '08:00', endLocalTime: '16:00' }],
      affectedWeekdays: [1],
    },
  })).toEqual({ kind: 'navigate', name: 'Settings', params: {
    screen: 'SettingsPlanAvailability', params: {
      clientActionId: 'action-1', expectedVersion: 2, timeZone: 'America/Chicago',
      windows: [{ weekday: 1, mode: 'work', startLocalTime: '08:00', endLocalTime: '16:00' }],
      affectedWeekdays: [1],
    },
  } });
});

test('notification preference handoff carries the exact patch into native review', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('review_notification_preferences', 'self'), capabilityId: 'notifications',
    targetType: 'notification_preferences',
    payload: { fields: { notificationsEnabled: true, allowDailyFocus: true, dailyFocusTime: '08:30' } },
  })).toEqual({ kind: 'navigate', name: 'Settings', params: {
    screen: 'SettingsNotifications', params: {
      clientActionId: 'action-1',
      fields: { notificationsEnabled: true, allowDailyFocus: true, dailyFocusTime: '08:30' },
    },
  } });
});

test('Plan calendar handoff opens the exact versioned native review', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('review_plan_calendars'), capabilityId: 'plan', targetType: 'plan_calendars',
    payload: {
      expectedVersion: 2,
      readCalendarIds: ['google:account-1:primary'], writeCalendarId: 'google:account-1:primary',
      addedReadCalendarIds: ['google:account-1:primary'], removedReadCalendarIds: [], writeCalendarChanged: true,
    },
  })).toEqual({ kind: 'navigate', name: 'Settings', params: {
    screen: 'SettingsPlanCalendars', params: {
      clientActionId: 'action-1', expectedVersion: 2,
      readCalendarIds: ['google:account-1:primary'], writeCalendarId: 'google:account-1:primary',
      addedReadCalendarIds: ['google:account-1:primary'], removedReadCalendarIds: [], writeCalendarChanged: true,
    },
  } });
});

test('account deletion returns only to the native two-step confirmation flow', () => {
  expect(resolveClientActionOpenInstruction(action('open_account_deletion'))).toEqual({
    kind: 'navigate', name: 'Settings',
    params: { screen: 'SettingsProfile', params: { openAccountDeletion: true } },
  });
});

test('Goal check-in opens the existing native approval sheet', () => {
  expect(resolveClientActionOpenInstruction(action('open_goal_checkin', 'goal-1'))).toEqual({
    kind: 'navigate', name: 'MainTabs', params: {
      screen: 'GoalsTab',
      params: {
        screen: 'GoalDetail',
        params: { goalId: 'goal-1', openCheckinApprovalSheet: true },
      },
    },
  });
});

test('family Screen Time setup opens the exact child and requested native step', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_family_screen_time_setup', 'child-charlie'),
    capabilityId: 'screenTime', targetType: 'family_screen_time_child',
    payload: {
      householdId: 'household-1', childDisplayName: 'Charlie', setupStep: 'selection', suggestedLabel: 'YouTube',
    },
  })).toEqual({
    kind: 'navigate', name: 'Settings', params: {
      screen: 'SettingsFamilyScreenTime', params: {
        householdId: 'household-1', childMembershipId: 'child-charlie', childDisplayName: 'Charlie',
        setupStep: 'selection', suggestedLabel: 'YouTube', clientActionId: 'action-1',
      },
    },
  });
});

test('family Screen Time setup refuses a handoff without exact Household context', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_family_screen_time_setup', 'child-charlie'),
    capabilityId: 'screenTime', targetType: 'family_screen_time_child',
    payload: { childDisplayName: 'Charlie', setupStep: 'device' },
  })).toBeNull();
});

test('personal Screen Time limit opens the canonical builder with typed intent', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_personal_screen_time_limit', 'self'),
    capabilityId: 'screenTime', targetType: 'personal_screen_time_device',
    payload: {
      subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
    },
  })).toEqual({
    kind: 'navigate', name: 'Settings', params: {
      screen: 'SettingsScreenTimeRuleBuilder', params: {
        entry: 'contextual', suggestedKind: 'daily_limit', suggestedLimitMinutes: 10,
        suggestedAppLabel: 'Instagram', setupIntent: 'settings_discovery', entrySurface: 'settings',
      },
    },
  });
});

test('an external personal rule handoff opens the exact native rule editor', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_personal_screen_time_rule', 'rule-1'),
    capabilityId: 'screenTime', targetType: 'personal_screen_time_rule',
  })).toEqual({
    kind: 'navigate', name: 'Settings', params: {
      screen: 'SettingsScreenTimeRuleBuilder', params: { entry: 'inventory', ruleId: 'rule-1' },
    },
  });
});

test('Money context opens the canonical sentence composer with a budget condition suggestion', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('review_money_app_control', 'shopping'),
    capabilityId: 'money', targetType: 'money_category',
    payload: { subject: { kind: 'self' }, preset: 'when_hot', suggestedAppLabels: ['Amazon'] },
  })).toEqual({
    kind: 'navigate', name: 'Settings', params: {
      screen: 'SettingsScreenTimeRuleBuilder',
      params: {
        entry: 'contextual',
        suggestedBudgetCondition: {
          categorySourceId: 'shopping', categoryName: 'Shopping', preset: 'when_hot',
        },
        suggestedAppLabel: 'Amazon', setupIntent: 'settings_discovery', entrySurface: 'settings',
      },
    },
  });
});

test.each([
  ['money.transaction.get', 'money_transaction', 'transaction-1', 'MoneyTransactionDetail', { transactionId: 'transaction-1' }],
  ['money.transaction.meaning.update', 'money_transaction', 'transaction-1', 'MoneyTransactionDetail', { transactionId: 'transaction-1' }],
  ['money.transaction.plan_treatment.update', 'money_transaction', 'transaction-1', 'MoneyTransactionDetail', { transactionId: 'transaction-1' }],
  ['money.connection.disconnect', 'money_connection', 'connection-1', 'MoneyAccounts', undefined],
  ['money.transfer.get', 'money_transfer', 'one:two', 'MoneyTransactions', { reviewState: 'not_counted' }],
  ['money.transfer.review', 'money_transfer', 'one:two', 'MoneyTransactions', { reviewState: 'not_counted' }],
] as const)('external %s opens its owned authenticated Money review', (
  toolId, targetType, targetId, screen, params,
) => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_money_control', targetId),
    capabilityId: 'money', targetType,
    payload: { toolId, arguments: {} },
  })).toEqual({
    kind: 'navigate', name: 'Money', params: { screen, ...(params ? { params } : {}) },
  });
});

test('external connection repair opens the provider-owned account repair surface', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_money_connection_repair', 'connection-1'),
    capabilityId: 'money', targetType: 'money_connection',
    payload: { toolId: 'money.connection.repair.open', arguments: { connectionId: 'connection-1' } },
  })).toEqual({ kind: 'navigate', name: 'Money', params: { screen: 'MoneyAccounts' } });
});

test.each([
  ['money.read', 'money', null, 'Money', 'MoneySummary'],
  ['money.review_transaction', 'money', null, 'Money', 'MoneyTransactions'],
  ['money.category.create', 'money', null, 'Money', 'MoneyCategoryCreate'],
  ['money.category.rename', 'money_category', 'category-1', 'Money', 'MoneyCategoryDetail'],
  ['money.category.update', 'money_category', 'category-1', 'Money', 'MoneyCategoryDetail'],
  ['money.privacy.configure', 'money', null, 'Settings', 'SettingsMoneyPrivacy'],
  ['money.connection.connect', 'money', null, 'Money', 'MoneyAccounts'],
  ['money.connection.sync', 'money_connection', 'connection-1', 'Money', 'MoneyAccounts'],
] as const)('%s opens the matching native Money control surface', (
  toolId, targetType, targetId, root, screen,
) => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_money_control', targetId), capabilityId: 'money', targetType,
    payload: { toolId, arguments: {} },
  })).toMatchObject({ kind: 'navigate', name: root, params: { screen } });
});

test('Money control refuses a mismatched target type instead of opening unrelated data', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_money_control', 'transaction-1'),
    capabilityId: 'money', targetType: 'money_connection',
    payload: { toolId: 'money.transaction.get', arguments: { transactionId: 'transaction-1' } },
  })).toBeNull();
});

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

test('Money-owned self control opens the exact category app-control editor', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('review_money_app_control', 'shopping'),
    capabilityId: 'money', targetType: 'money_category',
    payload: { subject: { kind: 'self' }, preset: 'when_hot', suggestedAppLabels: ['Amazon'] },
  })).toEqual({
    kind: 'navigate', name: 'Money', params: {
      screen: 'MoneyAppControl',
      params: { categoryId: 'shopping', suggestedPreset: 'when_hot', suggestedAppLabels: ['Amazon'] },
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

test('Money control refuses a mismatched target type instead of opening unrelated data', () => {
  expect(resolveClientActionOpenInstruction({
    ...action('open_money_control', 'transaction-1'),
    capabilityId: 'money', targetType: 'money_connection',
    payload: { toolId: 'money.transaction.get', arguments: { transactionId: 'transaction-1' } },
  })).toBeNull();
});

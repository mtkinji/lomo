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

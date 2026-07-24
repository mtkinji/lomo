import type { Activity, Goal } from '../../domain/types';
import { createDeviceToolProvider } from './deviceToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const activity: Activity = {
  id: 'activity-1', goalId: null, title: 'Read together', type: 'task', tags: [], status: 'planned',
  forceActual: {}, createdAt: 'before', updatedAt: 'current',
};
const goal: Goal = {
  id: 'goal-1', arcId: null, title: 'Calmer evenings', status: 'planned', forceIntent: {}, metrics: [],
  createdAt: 'before', updatedAt: 'current',
};
const snapshots = {
  goals: { goals: [goal] }, todos: { activities: [activity], goals: [goal] }, chapters: { chapters: [] },
};
const tool = (id: string) => UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;

test('stages Focus as pending device work without claiming a session started', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'focus', toolId: 'activities.open_focus', arguments: { activityId: activity.id },
  }, tool('activities.open_focus'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_activity_focus', targetId: activity.id }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('still choose whether');
});

test('stages a Goal check-in draft for native audience review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'check-in', toolId: 'goals.check_in', arguments: {
      goalId: goal.id,
      text: 'We kept evenings calm three nights this week.',
    },
  }, tool('goals.check_in'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_goal_checkin',
      targetId: goal.id,
      payload: { text: 'We kept evenings calm three nights this week.' },
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing is sent');
});

test('rejects a Goal check-in when the Goal or draft text is invalid', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'missing-goal', toolId: 'goals.check_in', arguments: { goalId: 'missing', text: 'Update' },
  }, tool('goals.check_in'))).resolves.toMatchObject({ status: 'failed', code: 'goal_not_found' });
  await expect(provider.execute({
    id: 'blank', toolId: 'goals.check_in', arguments: { goalId: goal.id, text: '   ' },
  }, tool('goals.check_in'))).resolves.toMatchObject({ status: 'failed', code: 'invalid_checkin_text' });
});

test.each([
  ['screen_time.configure', 'configure_screen_time'],
  ['notifications.configure', 'configure_notifications'],
  ['account.subscription.open', 'open_subscription_management'],
  ['account.delete.open', 'open_account_deletion'],
])('stages %s behind an explicit native consequence summary', async (toolId, actionType) => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: toolId, toolId, arguments: {} }, tool(toolId)))
    .resolves.toMatchObject({ status: 'pending_client_action' });
  expect(provider.actions()).toEqual([expect.objectContaining({ actionType })]);
  expect(provider.actions()[0].consequenceSummary.length).toBeGreaterThan(20);
});

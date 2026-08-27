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
  screenTime: { children: [{
    householdId: 'household-1', membershipId: 'child-charlie', displayName: 'Charlie', canManage: true,
    policy: {
      childMembershipId: 'child-charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 1,
      selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
    },
  }] },
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

test('stages an exact authorized child Screen Time intent for native review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'screen-time', toolId: 'screen_time.configure',
    arguments: { childName: 'Charlie', appName: 'Brawl Stars', desiredAccess: 'allow' },
  }, tool('screen_time.configure'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_family_screen_time_setup', targetId: 'child-charlie',
      payload: expect.objectContaining({
        childDisplayName: 'Charlie', setupStep: 'selection', suggestedLabel: 'Brawl Stars', desiredAccess: 'allow',
      }),
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing changes until');
});

test('stages personal Screen Time setup for self without substituting a child', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'personal-setup', toolId: 'screen_time.personal.setup.open',
    arguments: { subject: { kind: 'self' } },
  }, tool('screen_time.personal.setup.open'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'configure_screen_time', targetType: 'personal_screen_time_device',
      targetId: 'self', payload: { subject: { kind: 'self' } },
    }),
  });
  expect(provider.actions()[0].title).toBe('Set up My Screen Time');
});

test('stages a bounded personal daily app limit for native review', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'personal-limit', toolId: 'screen_time.personal.limit.open',
    arguments: {
      subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
    },
  }, tool('screen_time.personal.limit.open'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'open_personal_screen_time_limit',
      targetType: 'personal_screen_time_device', targetId: 'self',
      payload: {
        subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
      },
    }),
  });
  expect(provider.actions()[0].title).toBe('Review 10-minute app limit');
  expect(provider.actions()[0].consequenceSummary).toContain('choose the apps');
});

test('stages a self Money condition and Screen Time effect in the canonical category editor', async () => {
  const provider = createDeviceToolProvider({
    snapshots: {
      ...snapshots,
      money: { categories: [{ id: 'shopping', sourceId: 'shopping', name: 'Shopping' }] },
    } as never,
  });
  await expect(provider.execute({
    id: 'money-app-control', toolId: 'money.app_control.review', arguments: {
      subject: { kind: 'self' },
      condition: { owner: 'money', categoryId: 'shopping', preset: 'when_hot' },
      effect: { owner: 'screenTime', kind: 'pause_selected_apps', suggestedAppLabels: ['Amazon', 'shopping apps'] },
    },
  }, tool('money.app_control.review'))).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      capabilityId: 'money', actionType: 'review_money_app_control',
      targetType: 'money_category', targetId: 'shopping',
      payload: {
        subject: { kind: 'self' }, preset: 'when_hot',
        suggestedAppLabels: ['Amazon', 'shopping apps'],
      },
    }),
  });
  expect(provider.actions()[0].consequenceSummary).toContain('choose the apps');
  expect(provider.actions()[0].consequenceSummary).toContain('Nothing is applied');
});

test('names missing Screen Time intent fields instead of staging a generic setup action', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'screen-time', toolId: 'screen_time.configure', arguments: { childName: 'Charlie' },
  }, tool('screen_time.configure'))).resolves.toEqual({
    status: 'needs_input',
    prompt: 'Which child, app, and access change should Kwilt prepare for Screen Time review?',
    fields: ['childName', 'appName', 'desiredAccess'],
  });
  expect(provider.actions()).toEqual([]);
});

test.each([
  ['screen_time.selection.open', { childMembershipId: 'child-charlie', suggestedLabel: 'YouTube' }, 'selection'],
  ['screen_time.device.setup.open', { childMembershipId: 'child-charlie' }, 'device'],
  ['screen_time.device.release.open', { childMembershipId: 'child-charlie' }, 'release'],
])('stages %s for the exact authorized child without claiming completion', async (toolId, args, setupStep) => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: toolId, toolId, arguments: args }, tool(toolId)))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: expect.objectContaining({
        actionType: 'open_family_screen_time_setup', targetId: 'child-charlie',
        payload: expect.objectContaining({
          householdId: 'household-1', childDisplayName: 'Charlie', setupStep,
        }),
      }),
    });
  expect(provider.actions()[0].consequenceSummary).toContain('still happens');
});

test('rejects a Screen Time handoff outside the authorized child snapshot', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({
    id: 'setup', toolId: 'screen_time.device.setup.open', arguments: { childMembershipId: 'other-child' },
  }, tool('screen_time.device.setup.open'))).resolves.toMatchObject({
    status: 'failed', code: 'screen_time_child_not_found',
  });
  expect(provider.actions()).toEqual([]);
});

test('opens the native Activity-backed Chores surface without claiming a Chore changed', async () => {
  const provider = createDeviceToolProvider({ snapshots });
  await expect(provider.execute({ id: 'chores-open', toolId: 'chores.open', arguments: {} }, tool('chores.open')))
    .resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device',
      request: expect.objectContaining({ capabilityId: 'chores', actionType: 'open_chores' }),
    });
});

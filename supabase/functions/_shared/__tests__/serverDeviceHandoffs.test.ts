import { executeServerDeviceHandoff } from '../serverDeviceHandoffs';

function clientWith(table: string, data: Record<string, unknown>) {
  const calls: Array<[string, ...unknown[]]> = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) query[method] = (...args: unknown[]) => {
    calls.push([method, ...args]); return query;
  };
  query.maybeSingle = async () => ({ data, error: null });
  return { client: { from: jest.fn((name: string) => name === table ? query : {}) }, calls };
}

test.each([
  ['activities.location.update', 'open_activity_location', 'permission and review'],
  ['activities.attachments.open', 'open_activity_attachments', 'native picker'],
  ['activities.share.open', 'open_activity_share', 'choose the audience and confirm natively'],
])('stages owned %s work in its existing native Activity surface', async (toolId, actionType, consequence) => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client, calls } = clientWith('kwilt_activities', {
    id: 'activity-1', data: { title: 'Pack lunch' },
  });
  await expect(executeServerDeviceHandoff({
    client, userId: 'user-1', call: { id: 'call-device', toolId, arguments: { activityId: 'activity-1' } },
    stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType, targetId: 'activity-1' }),
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({
    consequenceSummary: expect.stringContaining(consequence),
  }));
});

test('stages owned Goal sharing in the existing native audience review', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client, calls } = clientWith('kwilt_goals', { id: 'goal-1', data: { title: 'Be more present' } });
  await expect(executeServerDeviceHandoff({
    client, userId: 'user-1',
    call: { id: 'call-share', toolId: 'goals.share.open', arguments: { goalId: 'goal-1' } },
    stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_goal_share', targetId: 'goal-1' }),
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({
    consequenceSummary: expect.stringContaining('visibility, audience, and confirm natively'),
  }));
});

test('refuses a handoff for an object outside the linked owner', async () => {
  const { client, calls } = clientWith('kwilt_activities', {});
  await expect(executeServerDeviceHandoff({
    client, userId: 'user-1',
    call: { id: 'call-device', toolId: 'activities.share.open', arguments: { activityId: 'other' } },
    stageDeviceAction: jest.fn(),
  })).resolves.toMatchObject({ status: 'failed', code: 'activity_not_found' });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
});

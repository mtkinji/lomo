import { executeServerPlanAvailabilityTool } from '../serverPlanAvailabilityTools';

function projectionClient(row: Record<string, unknown> | null, error: unknown = null) {
  const calls: Array<[string, ...unknown[]]> = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    query[method] = (...args: unknown[]) => { calls.push([method, ...args]); return query; };
  }
  query.maybeSingle = async () => ({ data: row, error });
  return { client: { from: jest.fn(() => query) }, calls };
}

const projection = {
  timezone: 'America/Denver', plan_availability_version: 3,
  plan_availability: [
    { weekday: 1, mode: 'work', startLocalTime: '09:00', endLocalTime: '17:00' },
  ],
};

test('reads the bounded native Plan availability projection', async () => {
  const { client, calls } = projectionClient(projection);
  await expect(executeServerPlanAvailabilityTool({
    client, userId: 'user-1',
    call: { id: 'read', toolId: 'plan.availability.read', arguments: {} },
    stageDeviceAction: jest.fn(),
  })).resolves.toEqual({
    status: 'completed',
    output: { version: 3, timeZone: 'America/Denver', windows: projection.plan_availability },
    receipt: null,
  });
  expect(client.from).toHaveBeenCalledWith('kwilt_agent_profile_projections');
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
});

test('stages an exact native availability review against the projected version', async () => {
  const { client } = projectionClient(projection);
  const stageDeviceAction = jest.fn(async () => undefined);
  const windows = [{ weekday: 2, mode: 'personal', startLocalTime: '18:00', endLocalTime: '20:00' }];
  await expect(executeServerPlanAvailabilityTool({
    client, userId: 'user-1', stageDeviceAction,
    call: { id: 'update', toolId: 'plan.availability.update', arguments: {
      expectedVersion: 3, timeZone: 'America/Chicago', windows,
    } },
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: {
      capabilityId: 'plan', actionType: 'review_plan_availability',
      payload: { expectedVersion: 3, timeZone: 'America/Chicago', windows, affectedWeekdays: [1, 2] },
    },
  });
  expect(stageDeviceAction).toHaveBeenCalledTimes(1);
});

test('refuses stale and malformed availability updates before staging', async () => {
  const { client } = projectionClient(projection);
  const stageDeviceAction = jest.fn();
  await expect(executeServerPlanAvailabilityTool({
    client, userId: 'user-1', stageDeviceAction,
    call: { id: 'stale', toolId: 'plan.availability.update', arguments: {
      expectedVersion: 2, timeZone: 'America/Denver', windows: [],
    } },
  })).resolves.toMatchObject({ status: 'failed', code: 'plan_availability_version_stale', retryable: true });
  await expect(executeServerPlanAvailabilityTool({
    client, userId: 'user-1', stageDeviceAction,
    call: { id: 'invalid', toolId: 'plan.availability.update', arguments: {
      expectedVersion: 3, timeZone: 'Not/A_Zone', windows: [],
    } },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_plan_availability', retryable: false });
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

test('returns a retryable failure when the native projection is unavailable', async () => {
  const { client } = projectionClient(null);
  await expect(executeServerPlanAvailabilityTool({
    client, userId: 'user-1', stageDeviceAction: jest.fn(),
    call: { id: 'read', toolId: 'plan.availability.read', arguments: {} },
  })).resolves.toMatchObject({ status: 'failed', code: 'plan_availability_projection_unavailable', retryable: true });
});

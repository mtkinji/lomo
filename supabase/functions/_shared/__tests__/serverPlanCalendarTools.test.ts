import { executeServerPlanCalendarTool } from '../serverPlanCalendarTools';

test('stages calendar reads and exact selection updates for native provider review', async () => {
  const requests: Record<string, unknown>[] = [];
  const stageDeviceAction = async (request: unknown) => { requests.push(request as Record<string, unknown>); };
  await expect(executeServerPlanCalendarTool({
    call: { id: 'read', toolId: 'plan.calendars.read', arguments: {} }, stageDeviceAction,
  })).resolves.toMatchObject({ status: 'pending_client_action', request: { payload: { reason: 'inspect' } } });
  await expect(executeServerPlanCalendarTool({
    call: { id: 'update', toolId: 'plan.calendars.update', arguments: {
      expectedVersion: 2, readCalendarIds: ['google:account-1:primary'], writeCalendarId: 'google:account-1:primary',
    } }, stageDeviceAction,
  })).resolves.toMatchObject({ status: 'pending_client_action', request: { payload: {
    expectedVersion: 2, readCalendarIds: ['google:account-1:primary'], writeCalendarId: 'google:account-1:primary',
  } } });
  expect(requests).toHaveLength(2);
});

test('rejects malformed calendar selection before native staging', async () => {
  const stageDeviceAction = jest.fn();
  await expect(executeServerPlanCalendarTool({
    call: { id: 'bad', toolId: 'plan.calendars.update', arguments: {
      expectedVersion: -1, readCalendarIds: ['x', 'x'], writeCalendarId: null,
    } }, stageDeviceAction,
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_plan_calendar_selection' });
  expect(stageDeviceAction).not.toHaveBeenCalled();
});

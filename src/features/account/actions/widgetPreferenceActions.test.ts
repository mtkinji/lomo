import {
  buildWidgetSetupRequest,
  createWidgetPreferenceActions,
} from './widgetPreferenceActions';

test('reports bounded widget sync status without claiming iOS placement visibility', async () => {
  const actions = createWidgetPreferenceActions({ readLastSyncMs: async () => 1_800_000_000_000 });
  await expect(actions.read()).resolves.toEqual({
    lastSyncedAt: new Date(1_800_000_000_000).toISOString(),
    placementStatus: 'not_exposed_by_ios',
    supportedKinds: expect.arrayContaining(['KwiltWidgets.launcher', 'KwiltWidgets.focus']),
    owner: 'this_device',
  });
});

test('returns null sync time when this device has not written widget data', async () => {
  const actions = createWidgetPreferenceActions({ readLastSyncMs: async () => null });
  await expect(actions.read()).resolves.toMatchObject({ lastSyncedAt: null });
});

test('accepts only the native setup operation and rejects invented widget fields', () => {
  expect(buildWidgetSetupRequest({ openSetup: true })).toEqual({ openSetup: true });
  expect(buildWidgetSetupRequest({ openSetup: false })).toBeNull();
  expect(buildWidgetSetupRequest({ openSetup: true, shortcut: 'Money' })).toBeNull();
});

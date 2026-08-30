import {
  HapticsPreferenceConflictError,
  createHapticsPreferenceActions,
  type HapticsPreferenceBoundary,
} from './hapticsPreferenceActions';

function boundary(initial = true): HapticsPreferenceBoundary & { applied: boolean[] } {
  let enabled = initial;
  const applied: boolean[] = [];
  return {
    applied,
    read: () => ({ enabled }),
    apply: (next) => {
      enabled = next.enabled;
      applied.push(next.enabled);
    },
  };
}

test('reads the device-owned haptics preference without implying cross-device state', () => {
  const actions = createHapticsPreferenceActions(boundary(false));
  expect(actions.read()).toEqual({ enabled: false, owner: 'this_device' });
});

test('applies an exact reviewed haptics change and returns a bounded receipt', () => {
  const device = boundary(true);
  const actions = createHapticsPreferenceActions(device);
  expect(actions.update({ expectedEnabled: true, enabled: false })).toEqual({
    previousEnabled: true,
    enabled: false,
    changed: true,
    owner: 'this_device',
  });
  expect(device.applied).toEqual([false]);
});

test('is idempotent when the requested preference is already active', () => {
  const device = boundary(false);
  const actions = createHapticsPreferenceActions(device);
  expect(actions.update({ expectedEnabled: false, enabled: false })).toMatchObject({ changed: false });
  expect(device.applied).toEqual([]);
});

test('refuses a stale reviewed change instead of overwriting a newer device choice', () => {
  const device = boundary(false);
  const actions = createHapticsPreferenceActions(device);
  expect(() => actions.update({ expectedEnabled: true, enabled: false }))
    .toThrow(HapticsPreferenceConflictError);
  expect(device.applied).toEqual([]);
});

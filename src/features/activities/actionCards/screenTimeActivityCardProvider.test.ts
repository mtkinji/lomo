import { createScreenTimeActivityCardProvider } from './screenTimeActivityCardProvider';
import type { ActivityActionCardBinding } from './activityActionCardTypes';

const binding: ActivityActionCardBinding = {
  providerId: 'screen_time', projectionKind: 'focus_setup', resourceRef: 'activity-1', sourceVersion: '1',
};
const context = { viewerPersonId: 'person-1', activityId: 'activity-1' };

describe('Screen Time Activity action-card provider', () => {
  it('preserves the existing Focus setup presentation and actions', async () => {
    const provider = createScreenTimeActivityCardProvider({
      isEligible: () => true,
      onSetUp: jest.fn(),
      onDismiss: jest.fn(),
    });
    await expect(provider.resolve(binding, context)).resolves.toEqual({
      providerId: 'screen_time', projectionKind: 'focus_setup', state: 'ready', eyebrow: 'Focus',
      title: 'Fewer distractions during Focus.', detail: 'Block selected apps while Focus runs.',
      freshnessLabel: null,
      primaryAction: { id: 'set_up', label: 'Set Up', accessibilityLabel: 'Set up Screen Time Controls for Focus' },
      secondaryAction: { id: 'not_now', label: 'Not now', accessibilityLabel: 'Dismiss Screen Time Controls setup' },
    });
  });

  it('returns the exact Screen Time settings target for setup and preserves dismissal', async () => {
    const onSetUp = jest.fn();
    const onDismiss = jest.fn();
    const provider = createScreenTimeActivityCardProvider({ isEligible: () => true, onSetUp, onDismiss });
    const setup = await provider.invoke({ binding, context, actionId: 'set_up', idempotencyKey: 'setup-1' });
    expect(onSetUp).toHaveBeenCalledWith({
      screen: 'SettingsScreenTimeProtection',
      params: { setupIntent: 'focus_sessions', entrySurface: 'focus_drawer', returnToActivityId: 'activity-1' },
    });
    expect(setup.returnTarget).toEqual({
      screen: 'SettingsScreenTimeProtection',
      params: { setupIntent: 'focus_sessions', entrySurface: 'focus_drawer', returnToActivityId: 'activity-1' },
    });
    await provider.invoke({ binding, context, actionId: 'not_now', idempotencyKey: 'dismiss-1' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('degrades to completed when the setup opportunity is no longer eligible', async () => {
    const provider = createScreenTimeActivityCardProvider({ isEligible: () => false, onSetUp: jest.fn(), onDismiss: jest.fn() });
    await expect(provider.resolve(binding, context)).resolves.toEqual(expect.objectContaining({
      state: 'completed', primaryAction: null, secondaryAction: null,
    }));
  });
});

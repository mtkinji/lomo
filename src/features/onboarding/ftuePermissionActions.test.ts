import { resolveFtuePermissionActions } from './ftuePermissionActions';

describe('resolveFtuePermissionActions', () => {
  it('uses a neutral CTA and removes deferral while location permission is pending', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'authorized',
      locationStatus: 'notRequested',
    });

    expect(actions.primaryAction).toBe('enableLocation');
    expect(actions.primaryCtaLabel).toBe('Continue');
    expect(actions.showNotNowAction).toBe(false);
  });

  it('also removes deferral while notification permission is pending', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'notRequested',
      locationStatus: 'notRequested',
    });

    expect(actions.primaryAction).toBe('enableNotifications');
    expect(actions.primaryCtaLabel).toBe('Continue');
    expect(actions.showNotNowAction).toBe(false);
  });

  it('keeps settings and deferral actions when permission can only be changed in settings', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'authorized',
      locationStatus: 'denied',
    });

    expect(actions.primaryAction).toBe('continue');
    expect(actions.showSettingsAction).toBe(true);
    expect(actions.showNotNowAction).toBe(true);
  });
});

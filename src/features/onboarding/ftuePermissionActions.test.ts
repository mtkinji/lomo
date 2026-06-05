import { getNotificationPermissionStatusLabel, resolveFtuePermissionActions } from './ftuePermissionActions';

describe('resolveFtuePermissionActions', () => {
  it('continues without prompting for location during onboarding', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'authorized',
    });

    expect(actions.primaryAction).toBe('continue');
    expect(actions.primaryCtaLabel).toBe('Continue');
    expect(actions.showSettingsAction).toBe(false);
    expect(actions.showNotNowAction).toBe(false);
  });

  it('keeps deferral visible while notification permission is pending', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'notRequested',
    });

    expect(actions.primaryAction).toBe('enableNotifications');
    expect(actions.primaryCtaLabel).toBe('Continue');
    expect(actions.showNotNowAction).toBe(true);
  });

  it('keeps settings and deferral actions when permission can only be changed in settings', () => {
    const actions = resolveFtuePermissionActions({
      ftueStep: 'notifications',
      ctaLabel: 'Continue',
      notificationStatus: 'denied',
    });

    expect(actions.primaryAction).toBe('continue');
    expect(actions.showSettingsAction).toBe(true);
    expect(actions.showNotNowAction).toBe(true);
  });

  it('labels OS notification permission without implying app reminders are active', () => {
    expect(getNotificationPermissionStatusLabel('authorized')).toBe('Allowed in iOS');
    expect(getNotificationPermissionStatusLabel('denied')).toBe('Blocked in iOS');
    expect(getNotificationPermissionStatusLabel('restricted')).toBe('Blocked in iOS');
    expect(getNotificationPermissionStatusLabel('notRequested')).toBe('Not enabled');
  });
});

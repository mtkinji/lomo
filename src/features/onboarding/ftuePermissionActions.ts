type FtueStep = 'welcome' | 'notifications' | 'path';

type OsPermissionStatus =
  | 'notRequested'
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'foregroundOnly'
  | 'unavailable';

export type FtuePermissionPrimaryAction = 'enableNotifications' | 'enableLocation' | 'continue';

export function resolveFtuePermissionActions(params: {
  ftueStep: FtueStep;
  ctaLabel: string;
  notificationStatus: OsPermissionStatus;
  locationStatus: OsPermissionStatus;
}): {
  primaryAction: FtuePermissionPrimaryAction;
  primaryCtaLabel: string;
  showSettingsAction: boolean;
  showNotNowAction: boolean;
} {
  if (params.ftueStep !== 'notifications') {
    return {
      primaryAction: 'continue',
      primaryCtaLabel: params.ctaLabel,
      showSettingsAction: false,
      showNotNowAction: false,
    };
  }

  const notificationsAuthorized = params.notificationStatus === 'authorized';
  const notificationsBlocked =
    params.notificationStatus === 'denied' || params.notificationStatus === 'restricted';
  const locationAuthorized = params.locationStatus === 'authorized';
  const locationBlocked = params.locationStatus === 'denied' || params.locationStatus === 'restricted';
  const locationNeedsAlways = params.locationStatus === 'foregroundOnly';
  const locationUnavailable = params.locationStatus === 'unavailable';
  const locationNeedsPrompt =
    !locationAuthorized && !locationUnavailable && !locationBlocked && !locationNeedsAlways;

  const primaryAction: FtuePermissionPrimaryAction =
    !notificationsAuthorized && !notificationsBlocked
      ? 'enableNotifications'
      : locationNeedsPrompt
        ? 'enableLocation'
        : 'continue';

  const hasPendingPermissionPrompt =
    primaryAction === 'enableNotifications' || primaryAction === 'enableLocation';

  return {
    primaryAction,
    primaryCtaLabel: hasPendingPermissionPrompt ? 'Continue' : params.ctaLabel,
    showSettingsAction: notificationsBlocked || locationBlocked || locationNeedsAlways,
    showNotNowAction: !hasPendingPermissionPrompt,
  };
}

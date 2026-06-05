type FtueStep = 'welcome' | 'notifications' | 'path';

type OsPermissionStatus =
  | 'notRequested'
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'foregroundOnly'
  | 'unavailable';

export type FtuePermissionPrimaryAction = 'enableNotifications' | 'continue';

export function getNotificationPermissionStatusLabel(status: OsPermissionStatus): string {
  if (status === 'authorized') return 'Allowed in iOS';
  if (status === 'denied' || status === 'restricted') return 'Blocked in iOS';
  return 'Not enabled';
}

export function resolveFtuePermissionActions(params: {
  ftueStep: FtueStep;
  ctaLabel: string;
  notificationStatus: OsPermissionStatus;
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

  const primaryAction: FtuePermissionPrimaryAction =
    !notificationsAuthorized && !notificationsBlocked
      ? 'enableNotifications'
      : 'continue';

  const hasPendingPermissionPrompt = primaryAction === 'enableNotifications';

  return {
    primaryAction,
    primaryCtaLabel: hasPendingPermissionPrompt ? 'Continue' : params.ctaLabel,
    showSettingsAction: notificationsBlocked,
    showNotNowAction: !notificationsAuthorized,
  };
}

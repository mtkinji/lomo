const SIMULATOR_REGISTRATION_WARNING =
  '[expo-notifications] Error reading persisted server registration info';

export function developmentNotificationLogFilters({
  isDev,
  isDevice,
}: {
  isDev: boolean;
  isDevice: boolean;
}): string[] {
  return isDev && !isDevice ? [SIMULATOR_REGISTRATION_WARNING] : [];
}

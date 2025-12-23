// Keep Jest output readable.
jest.spyOn(global.console, 'warn').mockImplementation(() => undefined);

// Avoid native module crashes in unit tests.
jest.mock('@react-native-async-storage/async-storage', () => {
  // Minimal in-memory AsyncStorage mock sufficient for zustand persist + unit tests.
  const store = new Map<string, string>();

  return {
    getItem: jest.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(String(key), String(value));
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(String(key));
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    multiRemove: jest.fn(async (keys: readonly string[]) => {
      keys.forEach((k) => store.delete(String(k)));
    }),
    multiSet: jest.fn(async (pairs: readonly [string, string][]) => {
      pairs.forEach(([k, v]) => store.set(String(k), String(v)));
    }),
  };
});

jest.mock('expo-background-fetch', () => ({
  getStatusAsync: jest.fn(async () => 3), // Available
  BackgroundFetchStatus: { Restricted: 1, Denied: 2, Available: 3 },
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
  registerTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(async () => false),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },
}));



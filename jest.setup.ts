// Keep Jest output readable.
jest.spyOn(global.console, 'warn').mockImplementation(() => undefined);

// Replace expo-linear-gradient with a trivial View forwarder so component
// tests don't pull in native gradient bindings.
jest.mock('expo-linear-gradient', () => require('./src/test/mocks/expo-linear-gradient'));

// @expo/vector-icons normally fetches font assets asynchronously and triggers
// state updates outside of `act(...)` after the render completes. Replace each
// icon family with a plain View stub so component tests don't see hundreds of
// noisy "An update to Icon was not wrapped in act(...)" warnings.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = ({ name, ...rest }: any) =>
    React.createElement(View, { accessibilityLabel: `icon:${String(name ?? '')}`, ...rest });
  return new Proxy(
    { __esModule: true },
    {
      get: () => Stub,
    },
  );
});

// Reanimated 4.2 imports Worklets 0.7 during mock initialization. Install the
// official Worklets mock first so Jest never tries to initialize its JSI proxy.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

// react-native-reanimated ships an official Jest mock that turns animated
// primitives into plain objects/components. Layer-2 component tests don't
// need real animations.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // Reanimated's mock omits a few helpers used in our codebase; provide safe defaults.
  Reanimated.default.call = () => undefined;
  Reanimated.useReducedMotion = () => false;
  return Reanimated;
});

// Stub @gorhom/bottom-sheet to plain Views so tests can render hosts without
// pulling in native sheet bindings. Most tests should target the inline content
// directly.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = React.forwardRef(({ children, ...rest }: any, _ref: unknown) =>
    React.createElement(View, rest, children),
  );
  return {
    __esModule: true,
    default: Stub,
    BottomSheetModal: Stub,
    BottomSheetModalProvider: Stub,
    BottomSheetView: Stub,
    BottomSheetScrollView: Stub,
    BottomSheetFlatList: Stub,
    BottomSheetTextInput: Stub,
    BottomSheetBackdrop: Stub,
    useBottomSheet: () => ({ close: () => undefined, snapToIndex: () => undefined }),
  };
});

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

jest.mock('expo-background-task', () => ({
  getStatusAsync: jest.fn(async () => 2), // Available
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  registerTaskAsync: jest.fn(async () => undefined),
  unregisterTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(async () => ({ ok: true, status: 200 })),
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

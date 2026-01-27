import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

type KwiltWidgetCenterNativeModule = {
  reloadTimelines: (kinds: string[]) => Promise<boolean> | boolean;
};

const native: KwiltWidgetCenterNativeModule | undefined = (NativeModules as any)?.KwiltWidgetCenter;

const FALLBACK_APP_NAME = 'Kwilt';
const appName =
  (Constants.expoConfig?.name ??
    (Constants as any)?.manifest2?.extra?.expoClient?.name ??
    FALLBACK_APP_NAME) as string;
const widgetTargetName = `${String(appName || FALLBACK_APP_NAME).trim()}Widgets`;

export const KWILT_WIDGET_KINDS = [
  `${widgetTargetName}.activities`,
];

let pendingKinds = new Set<string>();
let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
let lastReloadAtMs = 0;

const RELOAD_DEBOUNCE_MS = 1000;
const MIN_RELOAD_INTERVAL_MS = 15000;

async function doReload(kinds: string[]): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!native?.reloadTimelines) return;
  try {
    await native.reloadTimelines(kinds);
  } catch {
    // Best effort.
  }
}

function flushReload(): void {
  const now = Date.now();
  const elapsed = now - lastReloadAtMs;
  if (elapsed < MIN_RELOAD_INTERVAL_MS) {
    reloadTimeout = setTimeout(flushReload, MIN_RELOAD_INTERVAL_MS - elapsed);
    return;
  }
  const kinds = Array.from(pendingKinds);
  pendingKinds = new Set();
  reloadTimeout = null;
  lastReloadAtMs = now;
  void doReload(kinds);
}

export function scheduleWidgetReload(kinds: string[] = KWILT_WIDGET_KINDS): void {
  if (Platform.OS !== 'ios') return;
  kinds.forEach((k) => pendingKinds.add(k));
  if (reloadTimeout) return;
  reloadTimeout = setTimeout(flushReload, RELOAD_DEBOUNCE_MS);
}


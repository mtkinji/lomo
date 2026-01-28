import { NativeModules, Platform } from 'react-native';

type KwiltWidgetCenterNativeModule = {
  reloadTimelines: (kinds: string[]) => Promise<boolean> | boolean;
};

const native: KwiltWidgetCenterNativeModule | undefined = (NativeModules as any)?.KwiltWidgetCenter;

/**
 * IMPORTANT:
 * Widget kinds must exactly match the `kind` string declared in the WidgetKit extension.
 * Deriving kinds from the *app name* is brittle (dev builds often rename the app),
 * which can cause reloadTimelines() to point at a non-existent kind and make widgets
 * appear stale/empty when resizing triggers a refresh.
 *
 * See: ios/KwiltWidgets/KwiltWidgets.swift -> KwiltActivitiesWidget.kind
 */
export const KWILT_WIDGET_KINDS = ['KwiltWidgets.activities'];

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


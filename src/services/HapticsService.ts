import { AccessibilityInfo } from 'react-native';

/**
 * HapticsService
 * --------------
 * Centralized, semantic haptics layer.
 *
 * Why this exists:
 * - Call sites should not import `expo-haptics` directly.
 * - We want consistent "feel" (app shell vs canvas), rate limiting, and accessibility respect.
 *
 * Note: This file intentionally does NOT hard-depend on `expo-haptics` at compile time.
 * If the package isn't installed, haptics become a safe no-op.
 */

export type HapticsEvent =
  // App shell (nav / global chrome)
  | 'shell.nav.selection'
  | 'shell.nav.open'
  | 'shell.nav.close'
  // Canvas (object work)
  | 'canvas.selection'
  | 'canvas.toggle.on'
  | 'canvas.toggle.off'
  | 'canvas.step.complete'
  | 'canvas.step.undo'
  | 'canvas.primary.confirm'
  | 'canvas.destructive.confirm'
  // Outcomes
  | 'outcome.success'
  | 'outcome.bigSuccess'
  | 'outcome.warning'
  | 'outcome.error';

type ReduceMotionPolicy = 'respect' | 'ignore';

type TriggerOptions = {
  /**
   * Force haptics even when disabled by app-level toggle.
   * Use extremely sparingly (generally: never).
   */
  force?: boolean;
  /**
   * Whether to respect "Reduce Motion". Defaults to 'respect'.
   * Note: Reduce Motion is a proxy signal; it's not a perfect representation
   * of "no haptics", but it's a good conservative default.
   */
  reduceMotionPolicy?: ReduceMotionPolicy;
};

type ExpoHapticsModule = {
  selectionAsync: () => Promise<void>;
  impactAsync: (style: number) => Promise<void>;
  notificationAsync: (type: number) => Promise<void>;
  ImpactFeedbackStyle: { Light: number; Medium: number; Heavy: number };
  NotificationFeedbackType: { Success: number; Warning: number; Error: number };
};

let cachedExpoHaptics: ExpoHapticsModule | null | undefined;
function getExpoHaptics(): ExpoHapticsModule | null {
  if (cachedExpoHaptics !== undefined) return cachedExpoHaptics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-haptics') as ExpoHapticsModule;
    cachedExpoHaptics = mod;
  } catch {
    cachedExpoHaptics = null;
  }
  return cachedExpoHaptics ?? null;
}

let isEnabled = true;
let reduceMotionEnabled: boolean | null = null;
let reduceMotionSubscriptionAttached = false;
let hasWarnedMissingHapticsModule = false;

// Keep haptics subtle by default; prevent "machine gun" feel.
const DEFAULT_THROTTLE_MS = 80;
const throttleMsByEvent: Partial<Record<HapticsEvent, number>> = {
  // shell should be more conservative
  'shell.nav.selection': 120,
  'shell.nav.open': 120,
  'shell.nav.close': 120,
  // selection can happen quickly (lists, chips, etc.)
  'canvas.selection': 80,
  'canvas.step.complete': 60,
  'canvas.step.undo': 60,
  // outcomes should not be swallowed
  'outcome.success': 0,
  'outcome.bigSuccess': 0,
  'outcome.warning': 0,
  'outcome.error': 0,
};

// When Reduce Motion is on, suppress "decorative" haptics, keep outcomes + confirmations.
const suppressedWhenReduceMotion = new Set<HapticsEvent>([
  'shell.nav.selection',
  'shell.nav.open',
  'shell.nav.close',
  'canvas.selection',
  'canvas.toggle.on',
  'canvas.toggle.off',
  'canvas.step.complete',
  'canvas.step.undo',
]);

const lastFiredAtByEvent = new Map<HapticsEvent, number>();

function shouldThrottle(event: HapticsEvent): boolean {
  const now = Date.now();
  const last = lastFiredAtByEvent.get(event) ?? 0;
  const throttleMs = throttleMsByEvent[event] ?? DEFAULT_THROTTLE_MS;
  if (throttleMs <= 0) {
    lastFiredAtByEvent.set(event, now);
    return false;
  }
  if (now - last < throttleMs) return true;
  lastFiredAtByEvent.set(event, now);
  return false;
}

async function refreshReduceMotionFlag(): Promise<void> {
  try {
    const enabled = await AccessibilityInfo.isReduceMotionEnabled();
    reduceMotionEnabled = Boolean(enabled);
  } catch {
    // Best-effort: if we can't read it, don't block haptics.
    reduceMotionEnabled = null;
  }
}

function ensureReduceMotionSubscription() {
  if (reduceMotionSubscriptionAttached) return;
  reduceMotionSubscriptionAttached = true;

  // RN supports this event on modern versions; guard defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ai = AccessibilityInfo as any;
  if (typeof ai?.addEventListener !== 'function') return;

  try {
    const sub = ai.addEventListener('reduceMotionChanged', (enabled: boolean) => {
      reduceMotionEnabled = Boolean(enabled);
    });
    // Some RN versions return an object with remove().
    if (sub && typeof sub.remove === 'function') {
      // No-op: caller lifecycle would remove; we intentionally keep this global.
    }
  } catch {
    // ignore
  }
}

async function fire(event: HapticsEvent): Promise<void> {
  const h = getExpoHaptics();
  if (!h) return;

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  switch (event) {
    // Shell: keep it light / selection-based
    case 'shell.nav.selection':
      await h.selectionAsync();
      return;
    case 'shell.nav.open':
    case 'shell.nav.close':
      await h.impactAsync(h.ImpactFeedbackStyle.Light);
      return;

    // Canvas: subtle selection; medium for confirmation; heavy for destructive confirm
    case 'canvas.selection':
    case 'canvas.toggle.on':
    case 'canvas.toggle.off':
      await h.selectionAsync();
      return;
    case 'canvas.step.complete':
      await h.impactAsync(h.ImpactFeedbackStyle.Light);
      return;
    case 'canvas.step.undo':
      await h.selectionAsync();
      return;
    case 'canvas.primary.confirm':
      await h.impactAsync(h.ImpactFeedbackStyle.Medium);
      return;
    case 'canvas.destructive.confirm':
      await h.impactAsync(h.ImpactFeedbackStyle.Heavy);
      return;

    // Outcomes: use notification feedback so users learn the language quickly
    case 'outcome.success':
      await h.notificationAsync(h.NotificationFeedbackType.Success);
      return;
    case 'outcome.bigSuccess':
      // A stronger "milestone" feel: heavy impact + success notification.
      await h.impactAsync(h.ImpactFeedbackStyle.Heavy);
      await sleep(35);
      await h.notificationAsync(h.NotificationFeedbackType.Success);
      return;
    case 'outcome.warning':
      await h.notificationAsync(h.NotificationFeedbackType.Warning);
      return;
    case 'outcome.error':
      await h.notificationAsync(h.NotificationFeedbackType.Error);
      return;
    default: {
      // Exhaustiveness guard
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export const HapticsService = {
  /**
   * Optional init: prefetch reduce-motion state and attach listener.
   * Safe to call multiple times.
   */
  async init() {
    ensureReduceMotionSubscription();
    await refreshReduceMotionFlag();
    // Warm the module cache (no-op if not installed).
    const h = getExpoHaptics();
    if (__DEV__ && !h && !hasWarnedMissingHapticsModule) {
      hasWarnedMissingHapticsModule = true;
      console.warn(
        '[haptics] expo-haptics is not available; semantic haptics will be a no-op (install `expo-haptics` to enable).'
      );
    }
  },

  setEnabled(enabled: boolean) {
    isEnabled = Boolean(enabled);
  },

  getEnabled() {
    return isEnabled;
  },

  /**
   * Debug-only introspection helper.
   * Useful for diagnosing "haptics feel missing" reports on device.
   */
  getDebugState() {
    return {
      enabled: isEnabled,
      reduceMotionEnabled,
      // This checks whether the JS module is available to require() (not a guarantee of native availability).
      expoHapticsModuleAvailable: Boolean(getExpoHaptics()),
    };
  },

  /**
   * Fire a semantic haptic event.
   * If `expo-haptics` is not installed (or haptics are unavailable), this is a no-op.
   */
  async trigger(event: HapticsEvent, options?: TriggerOptions): Promise<void> {
    const force = Boolean(options?.force);
    const reduceMotionPolicy: ReduceMotionPolicy = options?.reduceMotionPolicy ?? 'respect';

    if (!force && !isEnabled) return;
    if (reduceMotionPolicy === 'respect' && reduceMotionEnabled === true && suppressedWhenReduceMotion.has(event)) {
      return;
    }
    if (shouldThrottle(event)) return;

    try {
      await fire(event);
    } catch (error) {
      if (__DEV__) {
        // Keep this quiet in prod; haptics should never crash the app.
        console.warn('[haptics] trigger failed', { event, error });
      }
    }
  },
};



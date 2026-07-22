import type { CapabilityId } from '../../capabilities/types';

type StartupClock = () => number;

export type FirstSurfaceUsableInput = {
  capabilityId: CapabilityId;
  restored: boolean;
  shellVariant: 'option-g';
};

export type FirstSurfaceUsableMeasurement = FirstSurfaceUsableInput & {
  appToRootReadyMs: number | null;
  appToFirstSurfaceUsableMs: number;
};

let clock: StartupClock = () => performance.now();
let appStartedAt: number | null = null;
let rootReadyAt: number | null = null;
let navigationRestored = false;
let completed = false;

export function markAppStarted(): void {
  if (appStartedAt === null) appStartedAt = clock();
}

export function markRootNavigationReady(restored = false): void {
  markAppStarted();
  if (rootReadyAt === null) {
    rootReadyAt = clock();
    navigationRestored = restored;
  }
}

export function wasNavigationRestoredForStartup(): boolean {
  return navigationRestored;
}

export function markFirstSurfaceUsable(
  input: FirstSurfaceUsableInput,
): FirstSurfaceUsableMeasurement | null {
  markAppStarted();
  if (completed || appStartedAt === null) return null;
  completed = true;
  const now = clock();
  return {
    ...input,
    appToRootReadyMs: rootReadyAt === null ? null : Math.max(0, rootReadyAt - appStartedAt),
    appToFirstSurfaceUsableMs: Math.max(0, now - appStartedAt),
  };
}

export function resetStartupTelemetryForTests(nextClock?: StartupClock): void {
  clock = nextClock ?? (() => performance.now());
  appStartedAt = null;
  rootReadyAt = null;
  navigationRestored = false;
  completed = false;
}

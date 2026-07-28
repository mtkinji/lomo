import { coordinateDistanceM } from './exploreGeometry';
import type { ExploreLocationSample } from './explorePointPolicy';
import type {
  ExploreMovementClass,
  ExplorePoint,
  ExploreTrackingPhase,
  ExploreTrackingPolicy,
  ExploreTrackingState,
} from './types';

export type ExploreAdaptiveLocationProfile = {
  accuracy: 'balanced' | 'high';
  distanceIntervalM: number;
  timeIntervalMs: number;
  deferredDistanceM: number;
  deferredIntervalMs: number;
  pausesAutomatically: boolean;
};

const SOFT_SLEEP_MS: Record<ExploreTrackingPolicy, number> = {
  ambient: 2 * 60_000,
  adventure: 3 * 60_000,
  presence: 2 * 60_000,
};

const DEEP_SLEEP_MS: Record<ExploreTrackingPolicy, number> = {
  ambient: 5 * 60_000,
  adventure: 15 * 60_000,
  presence: Number.POSITIVE_INFINITY,
};

const OUTING_GAP_MS: Record<ExploreTrackingPolicy, number> = {
  ambient: 10 * 60_000,
  adventure: 30 * 60_000,
  presence: 10 * 60_000,
};

export function createExploreTrackingState(
  policy: ExploreTrackingPolicy | null = null,
  phaseChangedAt: string | null = null,
): ExploreTrackingState {
  return {
    policy,
    phase: 'active',
    movement: 'unknown',
    stationarySince: null,
    phaseChangedAt,
    wakeAnchor: null,
  };
}

export function normalizeExploreTrackingState(
  candidate: unknown,
  fallbackPolicy: ExploreTrackingPolicy | null,
  fallbackChangedAt: string | null,
): ExploreTrackingState {
  const defaults = createExploreTrackingState(fallbackPolicy, fallbackChangedAt);
  if (!candidate || typeof candidate !== 'object') return defaults;
  const value = candidate as Partial<ExploreTrackingState>;
  const policy = value.policy === 'ambient' || value.policy === 'adventure' || value.policy === 'presence'
    ? value.policy
    : fallbackPolicy;
  const phase = value.phase === 'soft-sleep' || value.phase === 'deep-sleep'
    ? value.phase
    : 'active';
  const movement: ExploreMovementClass = value.movement === 'stationary' ||
    value.movement === 'pedestrian' ||
    value.movement === 'cycling' ||
    value.movement === 'vehicle' ||
    value.movement === 'airplane'
    ? value.movement
    : 'unknown';
  return {
    policy,
    phase,
    movement,
    stationarySince: typeof value.stationarySince === 'string' ? value.stationarySince : null,
    phaseChangedAt: typeof value.phaseChangedAt === 'string' ? value.phaseChangedAt : fallbackChangedAt,
    wakeAnchor: value.wakeAnchor &&
      Number.isFinite(value.wakeAnchor.latitude) &&
      Number.isFinite(value.wakeAnchor.longitude)
      ? {
        latitude: value.wakeAnchor.latitude,
        longitude: value.wakeAnchor.longitude,
        horizontalAccuracyM: typeof value.wakeAnchor.horizontalAccuracyM === 'number'
          ? value.wakeAnchor.horizontalAccuracyM
          : null,
      }
      : null,
  };
}

export function resumeExploreTracking(
  current: ExploreTrackingState,
  resumedAt: string,
): ExploreTrackingState {
  return {
    ...current,
    phase: 'active',
    movement: 'unknown',
    stationarySince: null,
    phaseChangedAt: resumedAt,
    wakeAnchor: null,
  };
}

export function trackingPolicyForRecordingMode(
  mode: 'manual' | 'automatic',
): ExploreTrackingPolicy {
  return mode === 'automatic' ? 'ambient' : 'adventure';
}

function inferredSpeedMps(previous: ExplorePoint | null, sample: ExploreLocationSample): number | null {
  if (typeof sample.speedMps === 'number' && Number.isFinite(sample.speedMps) && sample.speedMps >= 0) {
    return sample.speedMps;
  }
  if (!previous) return null;
  const elapsedSeconds = (Date.parse(sample.recordedAt) - Date.parse(previous.recordedAt)) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return null;
  return coordinateDistanceM(previous, sample) / elapsedSeconds;
}

export function classifyExploreMovement(
  previous: ExplorePoint | null,
  sample: ExploreLocationSample,
): ExploreMovementClass {
  if (
    typeof sample.horizontalAccuracyM === 'number' &&
    sample.horizontalAccuracyM > 100
  ) return 'unknown';
  const speedMps = inferredSpeedMps(previous, sample);
  if (speedMps === null) return 'unknown';
  if (speedMps >= 60) return 'airplane';
  if (speedMps >= 10) return 'vehicle';
  if (speedMps >= 3) return 'cycling';
  if (speedMps >= 0.5) return 'pedestrian';
  if (
    sample.horizontalAccuracyM === null ||
    sample.horizontalAccuracyM > 35
  ) return 'unknown';
  return 'stationary';
}

export function transitionExploreTracking(
  current: ExploreTrackingState,
  previous: ExplorePoint | null,
  sample: ExploreLocationSample,
): ExploreTrackingState {
  if (!current.policy) return current;
  let movement = classifyExploreMovement(previous, sample);
  if (
    movement === 'stationary' &&
    current.wakeAnchor &&
    sample.horizontalAccuracyM !== null &&
    sample.horizontalAccuracyM <= 45 &&
    coordinateDistanceM(current.wakeAnchor, sample) >= Math.max(50, sample.horizontalAccuracyM * 2)
  ) {
    movement = 'pedestrian';
  }
  if (movement === 'unknown') return { ...current, movement };
  if (movement !== 'stationary') {
    return {
      ...current,
      phase: 'active',
      movement,
      stationarySince: null,
      phaseChangedAt: current.phase === 'active' ? current.phaseChangedAt : sample.recordedAt,
      wakeAnchor: null,
    };
  }

  const stationarySince = current.stationarySince ?? sample.recordedAt;
  const elapsedMs = Math.max(0, Date.parse(sample.recordedAt) - Date.parse(stationarySince));
  const phase: ExploreTrackingPhase = elapsedMs >= DEEP_SLEEP_MS[current.policy]
    ? 'deep-sleep'
    : elapsedMs >= SOFT_SLEEP_MS[current.policy]
      ? 'soft-sleep'
      : 'active';
  return {
    ...current,
    phase,
    movement,
    stationarySince,
    phaseChangedAt: phase === current.phase ? current.phaseChangedAt : sample.recordedAt,
    wakeAnchor: current.wakeAnchor ?? {
      latitude: sample.latitude,
      longitude: sample.longitude,
      horizontalAccuracyM: sample.horizontalAccuracyM,
    },
  };
}

export function shouldSplitExploreOuting(
  policy: ExploreTrackingPolicy,
  gapMs: number,
): boolean {
  return gapMs >= OUTING_GAP_MS[policy];
}

export function shouldClearFogForMovement(movement: ExploreMovementClass): boolean {
  return movement !== 'stationary' && movement !== 'airplane';
}

export function adaptiveLocationProfile(
  policy: ExploreTrackingPolicy,
  phase: Exclude<ExploreTrackingPhase, 'deep-sleep'>,
  movement: ExploreMovementClass,
): ExploreAdaptiveLocationProfile {
  if (phase === 'soft-sleep') {
    return {
      accuracy: 'balanced',
      distanceIntervalM: 75,
      timeIntervalMs: 120_000,
      deferredDistanceM: 200,
      deferredIntervalMs: 180_000,
      pausesAutomatically: false,
    };
  }
  if (policy === 'presence') {
    return {
      accuracy: 'balanced',
      distanceIntervalM: 100,
      timeIntervalMs: 120_000,
      deferredDistanceM: 250,
      deferredIntervalMs: 300_000,
      pausesAutomatically: false,
    };
  }
  if (movement === 'airplane') {
    return {
      accuracy: 'balanced',
      distanceIntervalM: 1_000,
      timeIntervalMs: 300_000,
      deferredDistanceM: 2_000,
      deferredIntervalMs: 600_000,
      pausesAutomatically: false,
    };
  }
  if (movement === 'vehicle') {
    return {
      accuracy: 'high',
      distanceIntervalM: 200,
      timeIntervalMs: 120_000,
      deferredDistanceM: 500,
      deferredIntervalMs: 300_000,
      pausesAutomatically: false,
    };
  }
  if (movement === 'cycling') {
    return {
      accuracy: 'high',
      distanceIntervalM: 60,
      timeIntervalMs: 60_000,
      deferredDistanceM: 200,
      deferredIntervalMs: 180_000,
      pausesAutomatically: false,
    };
  }
  return policy === 'adventure'
    ? {
      accuracy: 'high',
      distanceIntervalM: 25,
      timeIntervalMs: 30_000,
      deferredDistanceM: 75,
      deferredIntervalMs: 90_000,
      pausesAutomatically: false,
    }
    : {
      accuracy: 'high',
      distanceIntervalM: 30,
      timeIntervalMs: 60_000,
      deferredDistanceM: 100,
      deferredIntervalMs: 120_000,
      pausesAutomatically: false,
    };
}

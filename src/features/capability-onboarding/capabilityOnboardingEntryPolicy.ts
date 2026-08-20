import type { CapabilityOnboardingPathId } from './capabilityOnboardingContracts';

export type CapabilityOnboardingReleaseStage =
  | 'development-rehearsal'
  | 'production';

export const CAPABILITY_ONBOARDING_RELEASE_STAGE: CapabilityOnboardingReleaseStage =
  'development-rehearsal';

export type CapabilityOnboardingStartingPoint =
  | 'developer-tools'
  | 'normal-first-launch'
  | 'exact-link'
  | 'invitation'
  | 'authoritative-restore'
  | 'returning-user';

export type CapabilityOnboardingEntry =
  | 'coordinator'
  | 'current-ftue'
  | 'exact-destination'
  | 'returning-permissions'
  | 'app-shell';

const REQUIRED_PRODUCTION_PATHS: readonly CapabilityOnboardingPathId[] = [
  'make-progress',
  'make-meals-easier',
];

export function resolveCapabilityOnboardingEntry({
  releaseStage,
  startingPoint,
  hasCompletedUniversal,
  productionPathIds,
}: {
  releaseStage: CapabilityOnboardingReleaseStage;
  startingPoint: CapabilityOnboardingStartingPoint;
  hasCompletedUniversal: boolean;
  productionPathIds: readonly CapabilityOnboardingPathId[];
}): CapabilityOnboardingEntry {
  if (
    startingPoint === 'exact-link' ||
    startingPoint === 'invitation' ||
    startingPoint === 'authoritative-restore'
  ) {
    return 'exact-destination';
  }
  if (startingPoint === 'returning-user') return 'returning-permissions';
  if (startingPoint === 'developer-tools') return 'coordinator';
  if (hasCompletedUniversal) return 'app-shell';
  if (releaseStage !== 'production') return 'current-ftue';

  const promoted = new Set(productionPathIds);
  const promotionReady = REQUIRED_PRODUCTION_PATHS.every((pathId) => promoted.has(pathId));
  return promotionReady ? 'coordinator' : 'current-ftue';
}

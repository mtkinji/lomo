import { resolveCapabilityOnboardingEntry } from './capabilityOnboardingEntryPolicy';

const productionPaths = ['make-progress', 'make-meals-easier'] as const;

describe('resolveCapabilityOnboardingEntry', () => {
  it('keeps ordinary first launch on current FTUE during development rehearsal', () => {
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'development-rehearsal',
        startingPoint: 'normal-first-launch',
        hasCompletedUniversal: false,
        productionPathIds: productionPaths,
      }),
    ).toBe('current-ftue');
  });

  it('opens the coordinator directly from Developer Tools', () => {
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'development-rehearsal',
        startingPoint: 'developer-tools',
        hasCompletedUniversal: false,
        productionPathIds: ['make-progress'],
      }),
    ).toBe('coordinator');
  });

  it('requires both the original and Food paths before production first launch can switch', () => {
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'production',
        startingPoint: 'normal-first-launch',
        hasCompletedUniversal: false,
        productionPathIds: ['make-progress'],
      }),
    ).toBe('current-ftue');
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'production',
        startingPoint: 'normal-first-launch',
        hasCompletedUniversal: false,
        productionPathIds: productionPaths,
      }),
    ).toBe('coordinator');
  });

  it.each(['exact-link', 'invitation', 'authoritative-restore'] as const)(
    'always sends %s to its exact destination',
    (startingPoint) => {
      expect(
        resolveCapabilityOnboardingEntry({
          releaseStage: 'production',
          startingPoint,
          hasCompletedUniversal: false,
          productionPathIds: productionPaths,
        }),
      ).toBe('exact-destination');
    },
  );

  it('keeps returning users out of first-install onboarding', () => {
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'production',
        startingPoint: 'returning-user',
        hasCompletedUniversal: false,
        productionPathIds: productionPaths,
      }),
    ).toBe('returning-permissions');
  });

  it('enters the shell after universal onboarding has already ended', () => {
    expect(
      resolveCapabilityOnboardingEntry({
        releaseStage: 'production',
        startingPoint: 'normal-first-launch',
        hasCompletedUniversal: true,
        productionPathIds: productionPaths,
      }),
    ).toBe('app-shell');
  });
});

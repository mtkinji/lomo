import { resolveGuidedOvertureEntry } from './guidedOvertureEntryPolicy';

describe('resolveGuidedOvertureEntry', () => {
  test.each([
    ['an exact task link', 'exact-task', 'exact-destination'],
    ['an invitation', 'invitation', 'exact-destination'],
    ['an authoritative resume', 'resume', 'exact-destination'],
  ] as const)('%s bypasses generic orientation', (_label, startingPoint, expected) => {
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'internal-first-run',
        startingPoint,
        assignedToOverture: true,
      }),
    ).toBe(expected);
  });

  it('opens the overture for an explicitly assigned unscoped internal account', () => {
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'internal-first-run',
        startingPoint: 'unscoped-download',
        assignedToOverture: true,
      }),
    ).toBe('guided-overture');
  });

  it('keeps the current FTUX when assignment is absent', () => {
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'internal-first-run',
        startingPoint: 'unscoped-download',
        assignedToOverture: false,
      }),
    ).toBe('current-ftux');
  });

  it('never auto-starts the overture during the local lab stage', () => {
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'local-lab',
        startingPoint: 'unscoped-download',
        assignedToOverture: true,
      }),
    ).toBe('current-ftux');
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'local-lab',
        startingPoint: 'developer-tools',
        assignedToOverture: false,
      }),
    ).toBe('guided-overture');
  });

  it('returns an existing user to the shell instead of replaying onboarding', () => {
    expect(
      resolveGuidedOvertureEntry({
        releaseStage: 'internal-first-run',
        startingPoint: 'returning-user',
        assignedToOverture: true,
      }),
    ).toBe('app-shell');
  });
});

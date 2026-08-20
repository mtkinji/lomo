import {
  createCapabilityOnboardingRecord,
  normalizeCapabilityOnboardingRecord,
  reduceCapabilityOnboarding,
} from './capabilityOnboardingState';

describe('capability onboarding state', () => {
  it('starts a new person in the reel on Welcome', () => {
    expect(createCapabilityOnboardingRecord()).toMatchObject({
      schemaVersion: 2,
      universalState: 'reel',
      activePageId: 'welcome',
      selectedPathId: null,
    });
  });

  it('remembers a viewed door without selecting it', () => {
    const viewed = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'view-page',
      pageId: 'make-meals-easier',
      now: 10,
    });

    expect(viewed).toMatchObject({
      universalState: 'reel',
      activePageId: 'make-meals-easier',
      selectedPathId: null,
      updatedAt: 10,
    });
  });

  it('resumes a selected capability without replaying Welcome', () => {
    const selected = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'select-path',
      pathId: 'make-meals-easier',
      now: 10,
    });
    const checkpointed = reduceCapabilityOnboarding(selected, {
      type: 'checkpoint',
      checkpoint: 'food:ingredients',
      now: 20,
    });

    expect(checkpointed).toMatchObject({
      universalState: 'chosen',
      activePageId: 'make-meals-easier',
      selectedPathId: 'make-meals-easier',
      checkpoint: 'food:ingredients',
      pathCheckpoints: { 'make-meals-easier': 'food:ingredients' },
    });
  });

  it('returns to the selected door without deleting capability progress', () => {
    const checkpointed = reduceCapabilityOnboarding(
      reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
        type: 'select-path',
        pathId: 'make-meals-easier',
        now: 10,
      }),
      { type: 'checkpoint', checkpoint: 'food:cook', now: 20 },
    );
    const reel = reduceCapabilityOnboarding(checkpointed, {
      type: 'choose-another-door',
      now: 30,
    });

    expect(reel).toMatchObject({
      universalState: 'reel',
      activePageId: 'make-meals-easier',
      selectedPathId: null,
      checkpoint: null,
      pathCheckpoints: { 'make-meals-easier': 'food:cook' },
    });
  });

  it('records Explore as a universal exit without claiming capability completion', () => {
    const explored = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'explore',
      now: 10,
    });

    expect(explored).toMatchObject({
      universalState: 'explored',
      selectedPathId: null,
      checkpoint: null,
      completedPaths: {},
    });
  });

  it('requires an owner receipt before recording first value', () => {
    const chosen = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'select-path',
      pathId: 'make-meals-easier',
      now: 10,
    });

    expect(reduceCapabilityOnboarding(chosen, {
      type: 'complete-path',
      pathId: 'make-meals-easier',
      receiptId: '   ',
      now: 20,
    })).toBe(chosen);

    expect(reduceCapabilityOnboarding(chosen, {
      type: 'complete-path',
      pathId: 'make-meals-easier',
      receiptId: 'plan-1:v1',
      now: 20,
    }).completedPaths['make-meals-easier']).toEqual({
      receiptId: 'plan-1:v1',
      completedAt: 20,
    });
  });

  it.each([
    [{ schemaVersion: 1, universalState: 'welcome' }, 'welcome'],
    [{ schemaVersion: 1, universalState: 'chooser' }, 'budget-app-controls'],
  ] as const)('migrates v1 %p into reel page %s', (legacy, activePageId) => {
    expect(normalizeCapabilityOnboardingRecord(legacy)).toMatchObject({
      schemaVersion: 2,
      universalState: 'reel',
      activePageId,
    });
  });

  it('preserves a valid v1 selected path and checkpoint', () => {
    expect(normalizeCapabilityOnboardingRecord({
      schemaVersion: 1,
      universalState: 'chosen',
      selectedPathId: 'make-meals-easier',
      checkpoint: 'food:cook',
      pathCheckpoints: { 'make-meals-easier': 'food:cook' },
      completedPaths: {},
      updatedAt: 30,
    })).toMatchObject({
      schemaVersion: 2,
      universalState: 'chosen',
      activePageId: 'make-meals-easier',
      selectedPathId: 'make-meals-easier',
      checkpoint: 'food:cook',
    });
  });

  it.each(['looked-around', 'something-else'] as const)(
    'migrates the v1 %s exit to explored',
    (universalState) => {
      expect(normalizeCapabilityOnboardingRecord({
        schemaVersion: 1,
        universalState,
      })).toMatchObject({
        schemaVersion: 2,
        universalState: 'explored',
      });
    },
  );

  it('resets unknown versions and removed paths instead of guessing', () => {
    expect(normalizeCapabilityOnboardingRecord({ schemaVersion: 99 })).toEqual(
      createCapabilityOnboardingRecord(),
    );
    expect(normalizeCapabilityOnboardingRecord({
      schemaVersion: 1,
      universalState: 'chosen',
      selectedPathId: 'capture-todos',
    })).toEqual(createCapabilityOnboardingRecord());
  });
});

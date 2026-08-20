import {
  CAPABILITY_ONBOARDING_PATHS,
  getCapabilityOnboardingDoors,
} from './capabilityOnboardingContracts';

describe('capability onboarding door contracts', () => {
  it('ranks the four development rehearsal doors by expected value', () => {
    expect(getCapabilityOnboardingDoors('development').map(({ id }) => id)).toEqual([
      'budget-app-controls',
      'make-meals-easier',
      'make-progress',
      'ask-kwilt',
    ]);
    expect(getCapabilityOnboardingDoors('development')).toHaveLength(4);
  });

  it('keeps production on the accepted Goals path', () => {
    expect(getCapabilityOnboardingDoors('production').map(({ id }) => id)).toEqual([
      'make-progress',
    ]);
  });

  it('gives every promoted door complete, uniquely ranked story and ownership metadata', () => {
    const promoted = CAPABILITY_ONBOARDING_PATHS.filter(({ reelRank }) => reelRank !== null);
    const ranks = promoted.map(({ reelRank }) => reelRank);

    expect(new Set(ranks).size).toBe(ranks.length);
    for (const door of promoted) {
      expect(door.reelRank).toBeGreaterThan(0);
      expect(door.story.headline.trim()).not.toBe('');
      expect(door.story.body.trim()).not.toBe('');
      expect(door.story.actionLabel.trim()).not.toBe('');
      expect(door.story.illustrationKey).toBeTruthy();
      expect(door.story.illustrationLabel.trim()).not.toBe('');
      expect(door.coordinatorOwnerId.trim()).not.toBe('');
      expect(door.terminalOwnerIds.length).toBeGreaterThan(0);
      expect(door.handoff.kind).toBeTruthy();
      expect(door.firstValue.event).toBeTruthy();
      expect(door.firstValue.evidenceSource).toBeTruthy();
    }
  });

  it('gives every capability a unique action that names its next step', () => {
    expect(
      Object.fromEntries(
        CAPABILITY_ONBOARDING_PATHS.map(({ id, story }) => [id, story.actionLabel]),
      ),
    ).toEqual({
      'budget-app-controls': 'Set app controls',
      'make-meals-easier': 'Choose meal',
      'make-progress': 'Create goal',
      'ask-kwilt': 'Ask Kwilt',
      'screen-time-controls': 'Set limits',
      'household-chores': 'Add chore',
      'play-together': 'Find game',
    });

    const labels = CAPABILITY_ONBOARDING_PATHS.map(({ story }) => story.actionLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('makes each promise explain a distinct activation path in ordinary language', () => {
    const stories = Object.fromEntries(
      CAPABILITY_ONBOARDING_PATHS.map(({ id, story }) => [id, story]),
    );

    expect(stories['budget-app-controls'].headline).toMatch(/budget.*Amazon/i);
    expect(stories['budget-app-controls'].body).toMatch(/spending.*apps.*when/i);
    expect(stories['make-meals-easier'].body).toMatch(/shared grocery list/i);
    expect(stories['make-progress'].body).toMatch(/questions.*goal.*next steps/i);
    expect(stories['ask-kwilt'].body).toMatch(/review every change first/i);
    expect(stories['screen-time-controls'].body).toMatch(/apps.*when.*review/i);
    expect(stories['household-chores'].body).toMatch(/assign each chore/i);
    expect(stories['play-together'].body).toMatch(/who is playing.*time/i);
  });

  it('does not present unavailable concepts or unsupported differentiation', () => {
    expect(JSON.stringify(CAPABILITY_ONBOARDING_PATHS)).not.toMatch(
      /disabled|coming soon|unique/i,
    );
  });

  it('keeps future capability concepts out of the initial reel', () => {
    expect(getCapabilityOnboardingDoors('development').map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['screen-time-controls', 'household-chores', 'play-together']),
    );
  });
});

import {
  createGuidedOvertureState,
  buildGuidedOvertureAgentHandoff,
  buildGuidedOvertureAgentHandoffForOfferId,
  getGuidedOvertureOffers,
  guidedOvertureReducer,
  selectGuidedOvertureOffers,
} from './guidedOvertureModel';

describe('guidedOvertureModel', () => {
  it('builds a concise portfolio montage with one offer per capability', () => {
    const offers = getGuidedOvertureOffers('portfolio');

    expect(offers).toHaveLength(6);
    expect(new Set(offers.map((offer) => offer.capabilityId)).size).toBe(offers.length);
    expect(offers.map((offer) => offer.taskLabel)).toEqual([
      'Plan tomorrow around what matters',
      'Catch a bill before it surprises me',
      'Turn a family photo into a story',
      'Pick a game everyone can play',
      'Invite someone to help me follow through',
      'Figure out what to do first this week',
    ]);
  });

  it('keeps live mode limited to current, routable capability offers', () => {
    const offers = getGuidedOvertureOffers('live');

    expect(offers.map((offer) => offer.id)).toEqual([
      'add-todo',
      'plan-tomorrow',
      'start-goal',
      'ask-kwilt',
    ]);
    expect(offers.every((offer) => offer.availability === 'live')).toBe(true);
    expect(offers.every((offer) => offer.destination != null)).toBe(true);
  });

  it('requires every live offer to define an observable first-value result', () => {
    const offers = getGuidedOvertureOffers('live');

    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer.firstValueContract).toEqual(
        expect.objectContaining({
          observableResult: expect.any(String),
        }),
      );
      expect(offer.firstValueContract?.observableResult.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not admit a candidate to live mode without a first-value contract', () => {
    const seed = getGuidedOvertureOffers('live')[0];
    const selected = selectGuidedOvertureOffers(
      [
        { ...seed, id: 'route-only', firstValueContract: undefined },
        { ...seed, id: 'route-and-value', capabilityId: 'second-capability' },
      ],
      'live',
    );

    expect(selected.map((offer) => offer.id)).toEqual(['route-and-value']);
  });

  it('keeps the presentation budget fixed as the candidate library grows', () => {
    const seed = getGuidedOvertureOffers('portfolio')[0];
    const candidates = Array.from({ length: 10 }, (_, index) => ({
      ...seed,
      id: `offer-${index}`,
      capabilityId: `capability-${index}`,
      coverageTag: `coverage-${index}`,
    }));

    expect(selectGuidedOvertureOffers(candidates, 'portfolio')).toHaveLength(6);
  });

  it('does not let one capability occupy multiple overture beats', () => {
    const seed = getGuidedOvertureOffers('portfolio')[0];
    const selected = selectGuidedOvertureOffers(
      [seed, { ...seed, id: 'second-plan-offer' }, { ...seed, id: 'goal-offer', capabilityId: 'goals' }],
      'portfolio',
    );

    expect(selected.map((offer) => offer.id)).toEqual([seed.id, 'goal-offer']);
  });

  it('keeps the full overture available when reduced motion is requested', () => {
    expect(createGuidedOvertureState(true)).toEqual({ phase: 'tour', sceneIndex: 0 });
  });

  it('advances only through explicit actions and opens the chooser after the final scene', () => {
    let state = createGuidedOvertureState(false);
    const sceneCount = getGuidedOvertureOffers('portfolio').length;

    for (let index = 0; index < sceneCount; index += 1) {
      state = guidedOvertureReducer(state, { type: 'next', sceneCount });
    }

    expect(state).toEqual({ phase: 'chooser', sceneIndex: sceneCount - 1 });
  });

  it('lets a person move backward, open the chooser, and restart from the beginning', () => {
    const secondScene = guidedOvertureReducer(createGuidedOvertureState(false), {
      type: 'next',
      sceneCount: 6,
    });
    const firstScene = guidedOvertureReducer(secondScene, { type: 'back' });
    const chooser = guidedOvertureReducer(firstScene, { type: 'showChooser' });
    const restarted = guidedOvertureReducer(chooser, {
      type: 'restart',
    });

    expect(secondScene).toEqual({ phase: 'tour', sceneIndex: 1 });
    expect(firstScene).toEqual({ phase: 'tour', sceneIndex: 0 });
    expect(chooser).toEqual({ phase: 'chooser', sceneIndex: 0 });
    expect(restarted).toEqual({ phase: 'tour', sceneIndex: 0 });
  });

  it('builds a contextual Agent opening for a selected task', () => {
    const offer = getGuidedOvertureOffers('portfolio').find(({ id }) => id === 'catch-bill');

    expect(buildGuidedOvertureAgentHandoff(offer)).toEqual({
      initialAssistantMessage:
        'Let\u2019s catch the surprise before it lands. Which bill or charge are you worried about?',
      workspaceSnapshot: expect.stringContaining('Selected Guided Overture task: Catch a bill before it surprises me'),
    });
  });

  it('builds a useful Agent opening when the person skips without choosing', () => {
    expect(buildGuidedOvertureAgentHandoff()).toEqual({
      initialAssistantMessage:
        'You\u2019ve seen a few ways Kwilt can help. What would make today or this week easier?',
      workspaceSnapshot: expect.stringContaining('No Guided Overture task was selected'),
    });
  });

  it('resolves reviewed handoff copy from a stable offer id', () => {
    expect(buildGuidedOvertureAgentHandoffForOfferId('plan-tomorrow')).toEqual(
      buildGuidedOvertureAgentHandoff(getGuidedOvertureOffers('portfolio')[0]),
    );
    expect(buildGuidedOvertureAgentHandoffForOfferId('not-a-real-offer')).toBeUndefined();
  });
});

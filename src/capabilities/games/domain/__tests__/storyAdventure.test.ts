import {
  STORY_TROUBLE_MAX,
  applyStoryKeepsake,
  createIncludedStoryPlan,
  createStoryCharacters,
  getStoryOutcome,
  resolveStoryScene,
  type StoryCommitment,
} from '../storyAdventure';

describe('story adventure', () => {
  test.each(['wonder', 'mystery', 'wild'] as const)('builds a complete included %s adventure', (flavor) => {
    const plan = createIncludedStoryPlan(flavor, 0);

    expect(plan.flavor).toBe(flavor);
    expect(plan.goal.length).toBeGreaterThan(20);
    expect(plan.promise.length).toBeGreaterThan(10);
    expect(plan.scenes).toHaveLength(3);
    expect(plan.scenes.map((scene) => scene.kind)).toEqual(['find-a-way', 'hold-together', 'finale']);
    plan.scenes.forEach((scene) => {
      expect(scene.commitments).toHaveLength(3);
      expect(new Set(scene.commitments.map((choice) => choice.id)).size).toBe(3);
    });
  });

  test('changes the included adventure deterministically with the seed', () => {
    expect(createIncludedStoryPlan('wonder', 0)).toEqual(createIncludedStoryPlan('wonder', 0));
    expect(createIncludedStoryPlan('wonder', 1).title).not.toBe(createIncludedStoryPlan('wonder', 0).title);
  });

  test('creates one lightweight character and one resource pair per player', () => {
    const characters = createStoryCharacters(['Maya', 'Olive', 'Theo', 'Nana'], 0);

    expect(characters).toHaveLength(4);
    expect(characters.map((character) => character.playerName)).toEqual(['Maya', 'Olive', 'Theo', 'Nana']);
    expect(new Set(characters.map((character) => character.power.id)).size).toBe(4);
    characters.forEach((character, seatIndex) => {
      expect(character.seatIndex).toBe(seatIndex);
      expect(character.title).toBeTruthy();
      expect(character.trait).toBeTruthy();
      expect(character.keepsake.label).toBeTruthy();
    });
  });

  test('keeps character creation valid for the full 2–6 player range', () => {
    expect(createStoryCharacters(['One', 'Two'], 2)).toHaveLength(2);
    expect(createStoryCharacters(['1', '2', '3', '4', '5', '6'], 2)).toHaveLength(6);
  });

  test.each([
    [['scout', 'build', 'protect'], 3, 0],
    [['scout', 'scout', 'protect'], 2, 1],
    [['build', 'build', 'build'], 1, 2],
  ] as const)('turns %j choice coverage into transparent Trouble', (choiceIds, coverage, troubleAdded) => {
    const characters = createStoryCharacters(['Maya', 'Olive', 'Theo'], 0);
    const commitments: StoryCommitment[] = choiceIds.map((choiceId, seatIndex) => ({ seatIndex, choiceId }));

    const result = resolveStoryScene({
      sceneIndex: 0,
      currentTrouble: 0,
      commitments,
      characters,
      spentPowerSeatIndexes: [],
    });

    expect(result.coverage).toBe(coverage);
    expect(result.troubleAdded).toBe(troubleAdded);
    expect(result.nextTrouble).toBe(troubleAdded);
  });

  test('one available Power covers one missing approach and becomes spent', () => {
    const characters = createStoryCharacters(['Maya', 'Olive', 'Theo'], 0);
    const commitments: StoryCommitment[] = [
      { seatIndex: 0, choiceId: 'scout', usePower: true },
      { seatIndex: 1, choiceId: 'scout' },
      { seatIndex: 2, choiceId: 'protect' },
    ];

    const result = resolveStoryScene({
      sceneIndex: 0,
      currentTrouble: 1,
      commitments,
      characters,
      spentPowerSeatIndexes: [],
    });

    expect(result.coverage).toBe(3);
    expect(result.troubleAdded).toBe(0);
    expect(result.nextTrouble).toBe(1);
    expect(result.newlySpentPowerSeatIndexes).toEqual([0]);

    const repeated = resolveStoryScene({
      sceneIndex: 1,
      currentTrouble: result.nextTrouble,
      commitments: commitments.map((commitment) => ({ ...commitment, choiceId: 'left' })),
      characters,
      spentPowerSeatIndexes: [0],
    });
    expect(repeated.coverage).toBe(1);
    expect(repeated.newlySpentPowerSeatIndexes).toEqual([]);
  });

  test('multiple Powers can cover only one missing approach in a scene', () => {
    const characters = createStoryCharacters(['Maya', 'Olive', 'Theo'], 0);
    const result = resolveStoryScene({
      sceneIndex: 0,
      currentTrouble: 0,
      commitments: characters.map(({ seatIndex }) => ({ seatIndex, choiceId: 'scout', usePower: true })),
      characters,
      spentPowerSeatIndexes: [],
    });

    expect(result.coverage).toBe(2);
    expect(result.troubleAdded).toBe(1);
    expect(result.newlySpentPowerSeatIndexes).toEqual([0, 1, 2]);
  });

  test('a Keepsake absorbs one new Trouble once', () => {
    const characters = createStoryCharacters(['Maya', 'Olive'], 0);
    const result = resolveStoryScene({
      sceneIndex: 0,
      currentTrouble: 2,
      commitments: [
        { seatIndex: 0, choiceId: 'scout' },
        { seatIndex: 1, choiceId: 'scout' },
      ],
      characters,
      spentPowerSeatIndexes: [],
    });

    const absorbed = applyStoryKeepsake(result, 1, []);
    expect(absorbed.applied).toBe(true);
    expect(absorbed.result.troubleAdded).toBe(1);
    expect(absorbed.result.nextTrouble).toBe(3);
    expect(absorbed.spentKeepsakeSeatIndexes).toEqual([1]);

    const repeated = applyStoryKeepsake(absorbed.result, 1, absorbed.spentKeepsakeSeatIndexes);
    expect(repeated.applied).toBe(false);
    expect(repeated.result).toEqual(absorbed.result);
  });

  test('does not spend a Keepsake when the scene added no Trouble', () => {
    const characters = createStoryCharacters(['Maya', 'Olive', 'Theo'], 0);
    const result = resolveStoryScene({
      sceneIndex: 0,
      currentTrouble: 0,
      commitments: [
        { seatIndex: 0, choiceId: 'scout' },
        { seatIndex: 1, choiceId: 'build' },
        { seatIndex: 2, choiceId: 'protect' },
      ],
      characters,
      spentPowerSeatIndexes: [],
    });
    expect(applyStoryKeepsake(result, 0, []).applied).toBe(false);
  });

  test('clamps Trouble and produces honest final outcomes', () => {
    expect(STORY_TROUBLE_MAX).toBe(4);
    expect(getStoryOutcome(0).kind).toBe('bright-victory');
    expect(getStoryOutcome(1).kind).toBe('bright-victory');
    expect(getStoryOutcome(2).kind).toBe('costly-victory');
    expect(getStoryOutcome(3).kind).toBe('costly-victory');
    expect(getStoryOutcome(4).kind).toBe('heroic-failure');
    expect(getStoryOutcome(99)).toEqual(getStoryOutcome(4));

    const characters = createStoryCharacters(['Maya', 'Olive'], 0);
    const result = resolveStoryScene({
      sceneIndex: 2,
      currentTrouble: 3,
      commitments: [
        { seatIndex: 0, choiceId: 'carry' },
        { seatIndex: 1, choiceId: 'carry' },
      ],
      characters,
      spentPowerSeatIndexes: [],
    });
    expect(result.nextTrouble).toBe(STORY_TROUBLE_MAX);
  });
});

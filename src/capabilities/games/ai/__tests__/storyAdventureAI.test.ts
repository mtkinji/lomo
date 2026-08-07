import { createIncludedStoryPlan, type StorySceneResult } from '../../domain/storyAdventure';
import {
  buildStoryEndingPrompt,
  buildStoryPlanPrompt,
  buildStoryTwistPrompt,
  generateStoryEnding,
  generateStoryPlan,
  generateStoryTwist,
  parseGeneratedStoryEnding,
  parseGeneratedStoryPlan,
  parseGeneratedStoryTwist,
  type StoryGameAiTransport,
} from '../storyAdventureAI';

const fallback = createIncludedStoryPlan('wonder', 0);

describe('story adventure AI', () => {
  test('keeps the plan prompt inside the fiction-only contract', () => {
    const prompt = buildStoryPlanPrompt({ fallback, playerCount: 4 });

    expect(prompt.system).toContain('Never change rules, choices, Trouble, resources, or outcomes');
    expect(prompt.system).toContain('Do not profile the players');
    expect(prompt.user).toContain('Flavor: wonder');
    expect(prompt.user).toContain('Players: 4');
    expect(prompt.user).not.toContain('Maya');
  });

  test('overlays valid generated fiction without changing local commitments or mechanics', () => {
    const generated = parseGeneratedStoryPlan({
      title: 'The Lantern Below',
      goal: 'Return the underwater lantern before the moon loses the path home.',
      promise: 'Bring every lost traveler back to the shore.',
      opening: 'The tide leaves a glowing staircase where the harbor used to be.',
      sceneFrames: [
        'A glass reef blocks the staircase while the lantern sinks farther below.',
        'Three travelers call from different caves as the tide begins to turn.',
        'The lantern rests inside a whale-sized bell that is about to ring.',
      ],
      twist: 'The traveler you helped carries the bell’s missing silver key.',
      endings: {
        bright: 'The lantern and every traveler reach shore beneath a waking moon.',
        costly: 'The lantern returns, though the harbor keeps one glowing stair.',
        heroic: 'The moon stays lost, but every traveler follows your promise safely home.',
      },
    }, fallback);

    expect(generated?.source).toBe('generated');
    expect(generated?.goal).toContain('underwater lantern');
    expect(generated?.scenes[0].frame).toContain('glass reef');
    expect(generated?.scenes[0].commitments).toEqual(fallback.scenes[0].commitments);
    expect(generated?.scenes[0].cleanResult).toBe(fallback.scenes[0].cleanResult);
  });

  test.each([
    null,
    {},
    { title: 'Missing everything else' },
    {
      title: 'Too long',
      goal: 'x'.repeat(181),
      promise: 'Safe promise',
      opening: 'Safe opening',
      sceneFrames: ['one', 'two', 'three'],
      twist: 'Safe twist',
      endings: { bright: 'bright', costly: 'costly', heroic: 'heroic' },
    },
    {
      title: 'Wrong scenes',
      goal: 'A valid goal with enough useful words for the test.',
      promise: 'A valid promise for the whole group.',
      opening: 'A valid opening for the whole group.',
      sceneFrames: ['only one'],
      twist: 'A valid twist.',
      endings: { bright: 'bright', costly: 'costly', heroic: 'heroic' },
    },
  ])('rejects an invalid generated plan %#', (value) => {
    expect(parseGeneratedStoryPlan(value, fallback)).toBeNull();
  });

  test('rejects obvious mixed-age safety violations even when the JSON shape is valid', () => {
    expect(parseGeneratedStoryPlan({
      title: 'The Dark Door',
      goal: 'Reach the village before the murderer covers the road in blood.',
      promise: 'Bring every traveler safely home.',
      opening: 'A locked door appears beside the road.',
      sceneFrames: ['Find another road.', 'Keep the travelers close.', 'Open the final gate.'],
      twist: 'The old map becomes a key.',
      endings: { bright: 'Everyone gets home.', costly: 'The road changes.', heroic: 'The travelers find a new village.' },
    }, fallback)).toBeNull();
  });

  test('builds a midpoint prompt from structured play rather than spoken family conversation', () => {
    const result: StorySceneResult = {
      sceneIndex: 0,
      commitments: [
        { seatIndex: 0, choiceId: 'scout' },
        { seatIndex: 1, choiceId: 'protect', usePower: true },
      ],
      coverage: 3,
      troubleBefore: 0,
      troubleAdded: 0,
      nextTrouble: 0,
      newlySpentPowerSeatIndexes: [1],
    };

    const prompt = buildStoryTwistPrompt({ plan: fallback, result });
    expect(prompt.user).toContain('scout');
    expect(prompt.user).toContain('protect');
    expect(prompt.user).toContain('Power seats: 2');
    expect(prompt.user).not.toContain('player said');
  });

  test('validates bounded twist and ending responses', () => {
    expect(parseGeneratedStoryTwist({ twist: 'The bridge you protected returns as a ladder into the tower.' })).toBe(
      'The bridge you protected returns as a ladder into the tower.',
    );
    expect(parseGeneratedStoryTwist({ twist: 'x'.repeat(181) })).toBeNull();

    expect(parseGeneratedStoryEnding({
      ending: 'The star rises while the village calls every character home.',
      callbacks: ['The protected bridge held.', 'The final Power opened the tower.'],
    })).toEqual({
      ending: 'The star rises while the village calls every character home.',
      callbacks: ['The protected bridge held.', 'The final Power opened the tower.'],
    });
    expect(parseGeneratedStoryEnding({ ending: 'Fine', callbacks: [] })).toBeNull();
  });

  test('the ending prompt receives a resolved outcome and cannot ask AI to choose it', () => {
    const prompt = buildStoryEndingPrompt({
      plan: fallback,
      outcome: { kind: 'costly-victory', title: 'Costly victory', summary: 'Resolved locally.' },
      results: [],
    });
    expect(prompt.system).toContain('The outcome is already final');
    expect(prompt.user).toContain('costly-victory');
  });

  test('returns generated plan, twist, and ending through the bounded transport', async () => {
    const transport = jest.fn<ReturnType<StoryGameAiTransport>, Parameters<StoryGameAiTransport>>()
      .mockResolvedValueOnce({
        title: 'The Lantern Below',
        goal: 'Return the underwater lantern before the moon loses the path home.',
        promise: 'Bring every lost traveler back to the shore.',
        opening: 'The tide leaves a glowing staircase where the harbor used to be.',
        sceneFrames: ['A glass reef blocks the way.', 'Three travelers call from caves.', 'A giant bell holds the lantern.'],
        twist: 'The traveler you helped carries the bell’s missing silver key.',
        endings: { bright: 'The lantern returns.', costly: 'The harbor keeps one stair.', heroic: 'The travelers make a new moon.' },
      })
      .mockResolvedValueOnce({ twist: 'The bridge returns as a ladder.' })
      .mockResolvedValueOnce({ ending: 'The star rises over the village.', callbacks: ['You protected the bridge.'] });

    const plan = await generateStoryPlan({ fallback, playerCount: 4, transport });
    const twist = await generateStoryTwist({
      plan: fallback,
      result: {
        sceneIndex: 0,
        commitments: [{ seatIndex: 0, choiceId: 'scout' }],
        coverage: 1,
        troubleBefore: 0,
        troubleAdded: 2,
        nextTrouble: 2,
        newlySpentPowerSeatIndexes: [],
      },
      transport,
    });
    const ending = await generateStoryEnding({
      plan: fallback,
      outcome: { kind: 'bright-victory', title: 'Bright victory', summary: 'Resolved locally.' },
      results: [],
      transport,
    });

    expect(plan?.source).toBe('generated');
    expect(twist).toContain('bridge');
    expect(ending?.callbacks).toEqual(['You protected the bridge.']);
    expect(transport).toHaveBeenCalledTimes(3);
    expect(transport.mock.calls.every(([request]) => request.timeoutMs === 3000)).toBe(true);
  });

  test('treats transport errors and invalid output as no generated result', async () => {
    const rejecting: StoryGameAiTransport = async () => { throw new Error('offline'); };
    const invalid: StoryGameAiTransport = async () => ({ nope: true });

    await expect(generateStoryPlan({ fallback, playerCount: 2, transport: rejecting })).resolves.toBeNull();
    await expect(generateStoryTwist({
      plan: fallback,
      result: {
        sceneIndex: 0,
        commitments: [],
        coverage: 0,
        troubleBefore: 0,
        troubleAdded: 2,
        nextTrouble: 2,
        newlySpentPowerSeatIndexes: [],
      },
      transport: invalid,
    })).resolves.toBeNull();
  });
});

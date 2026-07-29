import {
  SLANGUAGE_PROMPTS,
  advanceSlanguageRound,
  buildSlanguageTranslation,
  createSlanguageState,
  dealSlanguageHand,
  nextSlanguageSlot,
  resolveSlanguageRound,
  slanguageSentenceParts,
  slanguageScore,
  validateSlanguagePrompt,
} from '../slanguage';

describe('Slanguage rules', () => {
  test('ships five valid prompt packages for one complete learning session', () => {
    expect(SLANGUAGE_PROMPTS).toHaveLength(5);
    expect(SLANGUAGE_PROMPTS.every((prompt) => validateSlanguagePrompt(prompt).length === 0)).toBe(true);
  });

  test('deals distinct balanced twelve-tile hands with choices for every target', () => {
    const prompt = SLANGUAGE_PROMPTS[0];
    const first = dealSlanguageHand(prompt, 0);
    const second = dealSlanguageHand(prompt, 1);

    expect(first).toHaveLength(12);
    expect(second).toHaveLength(12);
    expect(first.map((tile) => tile.id)).not.toEqual(second.map((tile) => tile.id));
    for (const target of prompt.targets) {
      expect(first.filter((tile) => tile.compatibleTargets.includes(target.id)).length).toBeGreaterThanOrEqual(2);
      expect(second.filter((tile) => tile.compatibleTargets.includes(target.id)).length).toBeGreaterThanOrEqual(2);
    }
    const valueDelta = Math.abs(first.reduce((sum, tile) => sum + tile.value, 0) - second.reduce((sum, tile) => sum + tile.value, 0));
    expect(valueDelta).toBeLessThanOrEqual(3);
  });

  test('builds from eligible tiles without a keyboard and caps play at five tiles', () => {
    const prompt = SLANGUAGE_PROMPTS[0];
    const hand = dealSlanguageHand(prompt, 0);
    const choices = Object.fromEntries(prompt.targets.map((target) => [target.id, hand.find((tile) => tile.compatibleTargets.includes(target.id))!.id]));
    const opening = hand.find((tile) => tile.compatibleTargets.includes('opening'))!;
    const closing = hand.find((tile) => tile.id !== opening.id && tile.compatibleTargets.includes('closing'))!;
    const built = buildSlanguageTranslation(prompt, hand, { ...choices, opening: opening.id, closing: closing.id });

    expect(built.usedTiles).toHaveLength(5);
    expect(built.text).not.toContain('{{');
    expect(() => buildSlanguageTranslation(prompt, hand, { ...choices, opening: opening.id, closing: closing.id, extra: opening.id })).toThrow('too_many_tiles');
    expect(() => buildSlanguageTranslation(prompt, hand, { [prompt.targets[0].id]: closing.id })).toThrow('tile_not_compatible');
  });

  test('presents the sentence as tappable Mad Lib slots and advances core swaps before optional sauce', () => {
    const prompt = SLANGUAGE_PROMPTS[0];
    const hand = dealSlanguageHand(prompt, 0);
    const firstTarget = prompt.targets[0];
    const firstTile = hand.find((tile) => tile.compatibleTargets.includes(firstTarget.id))!;
    const placements = { [firstTarget.id]: firstTile.id };
    const parts = slanguageSentenceParts(prompt, hand, placements);

    expect(parts.filter((part) => part.kind === 'slot').map((part) => part.slotId)).toEqual(prompt.targets.map((target) => target.id));
    expect(parts.map((part) => part.text).join('')).toBe(buildSlanguageTranslation(prompt, hand, placements).text);
    expect(nextSlanguageSlot(prompt, placements, firstTarget.id)).toBe(prompt.targets[1].id);

    const corePlacements = Object.fromEntries(prompt.targets.map((target) => [
      target.id,
      hand.find((tile) => tile.compatibleTargets.includes(target.id))!.id,
    ]));
    expect(nextSlanguageSlot(prompt, corePlacements, prompt.targets[2].id)).toBe('opening');
  });

  test('adds a Time Warp bonus only when Now and Throwback tiles mix', () => {
    const prompt = SLANGUAGE_PROMPTS[0];
    const hand = dealSlanguageHand(prompt, 0);
    const now = hand.find((tile) => tile.era === 'now')!;
    const throwback = hand.find((tile) => tile.era === 'throwback')!;

    expect(slanguageScore([now])).toBe(now.value);
    expect(slanguageScore([now, throwback])).toBe(now.value + throwback.value + 2);
  });

  test('votes always outrank Slang Score and exact ties share the Crown', () => {
    expect(resolveSlanguageRound([
      { participantId: 'funny', votes: 2, slangScore: 2 },
      { participantId: 'stuffed', votes: 1, slangScore: 15 },
    ])).toEqual(['funny']);

    expect(resolveSlanguageRound([
      { participantId: 'a', votes: 1, slangScore: 7 },
      { participantId: 'b', votes: 1, slangScore: 7 },
      { participantId: 'c', votes: 1, slangScore: 4 },
    ])).toEqual(['a', 'b']);
  });

  test('does not manufacture a Crown when nobody casts a vote', () => {
    expect(resolveSlanguageRound([
      { participantId: 'only-submission', votes: 0, slangScore: 12 },
    ])).toEqual([]);

    expect(resolveSlanguageRound([
      { participantId: 'a', votes: 0, slangScore: 7 },
      { participantId: 'b', votes: 0, slangScore: 4 },
    ])).toEqual([]);
  });

  test('finishes after five rounds and counts shared Crowns', () => {
    let state = createSlanguageState(5);
    state = advanceSlanguageRound(state, ['a'], { a: 5 });
    state = advanceSlanguageRound(state, ['b'], { b: 7 });
    state = advanceSlanguageRound(state, ['a', 'b'], { a: 6, b: 6 });
    state = advanceSlanguageRound(state, ['a'], { a: 4 });
    state = advanceSlanguageRound(state, ['b'], { b: 8 });

    expect(state.status).toBe('finished');
    expect(state.crowns).toEqual({ a: 3, b: 3 });
    expect(state.crownScores).toEqual({ a: 15, b: 21 });
    expect(state.winnerIds).toEqual(['b']);
  });
});

import {
  MAX_STORY_CHAPTERS,
  chapterTurnOrder,
  getStoryTurn,
  nextStoryStep,
  storySoFar,
  type StoryContribution,
} from '../storyRelay';

const players = ['Maya', 'Olive', 'Theo', 'Nana'];

describe('story relay', () => {
  test('rotates the chapter starter while keeping every player in the circuit', () => {
    expect(chapterTurnOrder(players, 0)).toEqual(['Maya', 'Olive', 'Theo', 'Nana']);
    expect(chapterTurnOrder(players, 1)).toEqual(['Olive', 'Theo', 'Nana', 'Maya']);
    expect(chapterTurnOrder(players, 3)).toEqual(['Nana', 'Maya', 'Olive', 'Theo']);
  });

  test('conducts a chapter from opening through a landing beat', () => {
    expect(getStoryTurn(players, 0, 0, 0)).toMatchObject({
      player: 'Maya',
      purpose: 'Open the scene.',
      allowsSpark: false,
    });
    expect(getStoryTurn(players, 0, 1, 0)).toMatchObject({
      player: 'Olive',
      purpose: 'Make trouble.',
      allowsSpark: true,
    });
    expect(getStoryTurn(players, 0, 3, 0)).toMatchObject({
      player: 'Nana',
      purpose: 'Land the surprise.',
      allowsSpark: true,
    });
  });

  test('adapts the arc for two players without losing an opening or ending', () => {
    expect(getStoryTurn(['Maya', 'Olive'], 0, 0, 0).purpose).toBe('Open the scene.');
    expect(getStoryTurn(['Maya', 'Olive'], 0, 1, 0).purpose).toBe('Land the surprise.');
  });

  test('provides three deterministic sparks for a spark-enabled turn', () => {
    const turn = getStoryTurn(players, 1, 2, 2);
    expect(turn.sparks).toHaveLength(3);
    expect(new Set(turn.sparks).size).toBe(3);
    expect(getStoryTurn(players, 1, 2, 2).sparks).toEqual(turn.sparks);
  });

  test('advances within a chapter, reveals at the end, and starts a rotated continuation', () => {
    expect(nextStoryStep({ chapterIndex: 0, turnIndex: 1, playerCount: 4 })).toEqual({ kind: 'turn', chapterIndex: 0, turnIndex: 2 });
    expect(nextStoryStep({ chapterIndex: 0, turnIndex: 3, playerCount: 4 })).toEqual({ kind: 'reveal', chapterIndex: 0 });
    expect(nextStoryStep({ chapterIndex: 0, turnIndex: 3, playerCount: 4, continueStory: true })).toEqual({ kind: 'turn', chapterIndex: 1, turnIndex: 0 });
  });

  test('ends at the maximum chapter count', () => {
    expect(MAX_STORY_CHAPTERS).toBe(3);
    expect(nextStoryStep({ chapterIndex: 2, turnIndex: 3, playerCount: 4 })).toEqual({ kind: 'finished', chapterIndex: 2 });
  });

  test('joins contributions in authored order for story-so-far copy', () => {
    const contributions: StoryContribution[] = [
      { chapterIndex: 0, player: 'Maya', text: 'A package began to hum.' },
      { chapterIndex: 0, player: 'Olive', text: 'Inside was a tiny pancake map.' },
      { chapterIndex: 1, player: 'Theo', text: 'The map pointed under the couch.' },
    ];
    expect(storySoFar(contributions)).toBe('A package began to hum. Inside was a tiny pancake map. The map pointed under the couch.');
  });
});

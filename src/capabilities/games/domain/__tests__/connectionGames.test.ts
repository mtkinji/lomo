import { advanceClueRound, choiceReveal, forecastReveal, matchSummary, matchesPattern, nextPlayerIndex, nextPromptIndex, type ClueRoundState } from '../connectionGames';
import { clueTargets, commonThreadPrompts, forecastPrompts, objectQuestPrompts, samePagePrompts, storyRelayPrompts } from '../connectionPrompts';

describe('connection game rules', () => {
  it('summarizes unanimous, majority, and split Same Page choices', () => {
    expect(matchSummary(['sun', 'sun', 'sun'])).toEqual({ largestGroup: 3, label: 'Everyone matched!' });
    expect(matchSummary(['sun', 'sun', 'moon'])).toEqual({ largestGroup: 2, label: 'Two minds met.' });
    expect(matchSummary(['sun', 'moon'])).toEqual({ largestGroup: 1, label: 'Beautifully split.' });
  });

  it('rotates players without leaving the bounds', () => {
    expect(nextPlayerIndex(0, 3)).toBe(1);
    expect(nextPlayerIndex(2, 3)).toBe(0);
    expect(nextPlayerIndex(4, 0)).toBe(0);
  });

  it('checks a pattern answer exactly', () => {
    expect(matchesPattern(['coral', 'pine'], ['coral', 'pine'])).toBe(true);
    expect(matchesPattern(['pine', 'coral'], ['coral', 'pine'])).toBe(false);
    expect(matchesPattern(['coral'], ['coral', 'pine'])).toBe(false);
  });

  it('advances prompt indexes cyclically', () => {
    expect(nextPromptIndex(0, 4)).toBe(1);
    expect(nextPromptIndex(3, 4)).toBe(0);
    expect(nextPromptIndex(2, 0)).toBe(0);
  });

  it('keeps player names attached to private choices for the reveal', () => {
    expect(choiceReveal(['Maya', 'Leo', 'Nana'], ['Moon', 'Sun', 'Moon'])).toEqual([
      { name: 'Maya', choice: 'Moon' },
      { name: 'Leo', choice: 'Sun' },
      { name: 'Nana', choice: 'Moon' },
    ]);
  });

  it('reveals every forecast and names who knew the subject', () => {
    expect(forecastReveal(['Maya', 'Leo', 'Nana'], 0, { 1: 'Treehouse', 2: 'Houseboat' }, 'Treehouse')).toEqual({
      rows: [
        { name: 'Leo', prediction: 'Treehouse', correct: true },
        { name: 'Nana', prediction: 'Houseboat', correct: false },
      ],
      correctNames: ['Leo'],
    });
  });

  it('bounds Clue Circle to three targets per player and finishes after everyone', () => {
    let round: ClueRoundState = { finderIndex: 0, attempts: 0, scores: [0, 0], phase: 'playing' };
    round = advanceClueRound(round, 2, true);
    round = advanceClueRound(round, 2, false);
    round = advanceClueRound(round, 2, true);
    expect(round).toEqual({ finderIndex: 1, attempts: 0, scores: [2, 0], phase: 'handoff' });

    round = { ...round, phase: 'playing' };
    round = advanceClueRound(round, 2, true);
    round = advanceClueRound(round, 2, true);
    round = advanceClueRound(round, 2, false);
    expect(round).toEqual({ finderIndex: 1, attempts: 3, scores: [2, 2], phase: 'finished' });
  });

  it('has enough original prompts for repeat family sessions', () => {
    expect(samePagePrompts.length).toBeGreaterThanOrEqual(12);
    expect(commonThreadPrompts.length).toBeGreaterThanOrEqual(12);
    expect(objectQuestPrompts.length).toBeGreaterThanOrEqual(12);
    expect(storyRelayPrompts.length).toBeGreaterThanOrEqual(8);
    expect(forecastPrompts.length).toBeGreaterThanOrEqual(10);
    expect(clueTargets.length).toBeGreaterThanOrEqual(24);
  });
});

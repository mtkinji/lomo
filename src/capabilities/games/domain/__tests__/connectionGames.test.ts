import { advanceClueFinder, choiceReveal, finishClueTurn, formatClueTime, forecastReveal, matchSummary, matchesPattern, recordClueResult, resolveClueMotion, startClueTurn, nextPlayerIndex, nextPromptIndex, type ClueRoundState } from '../connectionGames';
import { clueModes, clueTargets, commonThreadPrompts, forecastPrompts, objectQuestPrompts, samePagePrompts } from '../connectionPrompts';

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

  it('keeps correct and pass rapid while only correct adds to the finder score', () => {
    let round: ClueRoundState = { finderIndex: 0, turnScore: 0, scores: [0, 0], phase: 'handoff' };
    round = startClueTurn(round);
    round = recordClueResult(round, 'correct');
    round = recordClueResult(round, 'pass');

    expect(round).toEqual({ finderIndex: 0, turnScore: 1, scores: [1, 0], phase: 'playing' });
  });

  it('ends each timed turn before rotating and finishes after every finder', () => {
    let round: ClueRoundState = { finderIndex: 0, turnScore: 0, scores: [0, 0], phase: 'playing' };
    round = recordClueResult(round, 'correct');
    round = finishClueTurn(round);
    expect(round.phase).toBe('turn-complete');

    round = advanceClueFinder(round, 2);
    expect(round).toEqual({ finderIndex: 1, turnScore: 0, scores: [1, 0], phase: 'handoff' });

    round = startClueTurn(round);
    round = recordClueResult(round, 'correct');
    round = recordClueResult(round, 'correct');
    round = finishClueTurn(round);
    round = advanceClueFinder(round, 2);
    expect(round).toEqual({ finderIndex: 1, turnScore: 2, scores: [1, 2], phase: 'finished' });
  });

  it('formats the rapid-turn clock without negative time', () => {
    expect(formatClueTime(60)).toBe('1:00');
    expect(formatClueTime(9)).toBe('0:09');
    expect(formatClueTime(-1)).toBe('0:00');
  });

  it('requires a neutral motion before accepting the opposite gesture', () => {
    expect(resolveClueMotion(110, 'armed')).toEqual({ state: 'waiting-for-neutral', result: 'correct' });
    expect(resolveClueMotion(-110, 'waiting-for-neutral')).toEqual({ state: 'waiting-for-neutral', result: null });
    expect(resolveClueMotion(0, 'waiting-for-neutral')).toEqual({ state: 'armed', result: null });
    expect(resolveClueMotion(-110, 'armed')).toEqual({ state: 'waiting-for-neutral', result: 'pass' });
  });

  it('has enough original prompts for repeat family sessions', () => {
    expect(samePagePrompts.length).toBeGreaterThanOrEqual(12);
    expect(commonThreadPrompts.length).toBeGreaterThanOrEqual(12);
    expect(objectQuestPrompts.length).toBeGreaterThanOrEqual(12);
    expect(forecastPrompts.length).toBeGreaterThanOrEqual(10);
    expect(clueTargets.length).toBeGreaterThanOrEqual(72);
    expect(clueModes.length).toBeGreaterThanOrEqual(4);
  });
});

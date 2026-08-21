import { buildCelebrationGifQuery, getCuratedCelebrationGif } from './gifs';

describe('buildCelebrationGifQuery', () => {
  it('uses a restrained first-plan celebration for the Budget welcome', () => {
    expect(buildCelebrationGifQuery({
      role: 'celebration',
      kind: 'firstBudget',
      stylePreference: 'minimal',
    })).toBe('minimal abstract confetti celebration animation');
  });

  it('pins the Budget welcome to one reviewed celebration instead of a random search result', () => {
    expect(getCuratedCelebrationGif({
      role: 'celebration',
      kind: 'firstBudget',
      stylePreference: 'minimal',
    })).toMatchObject({
      id: 'PotiYSwEnO33KX007a',
    });
  });
});

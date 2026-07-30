import { backToGames } from '../backToGames';

describe('backToGames', () => {
  it('returns to the game shelf when there is no route to go back to', () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      back: jest.fn(),
      replace: jest.fn(),
    };

    backToGames(navigation);

    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('/');
  });

  it('preserves normal back navigation when history is available', () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      back: jest.fn(),
      replace: jest.fn(),
    };

    backToGames(navigation);

    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});

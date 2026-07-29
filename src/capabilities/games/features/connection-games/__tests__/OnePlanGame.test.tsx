import { fireEvent, render } from '@testing-library/react-native';
import { ShowOfHandsGame } from '../OnePlanGame';

const mockFeedback = { success: jest.fn(), failure: jest.fn(), select: jest.fn() };

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => mockFeedback,
}));

describe('ShowOfHandsGame', () => {
  beforeEach(() => Object.values(mockFeedback).forEach((mock) => mock.mockClear()));

  it('conducts a first-vote consensus and advances the shared world', () => {
    const screen = render(<ShowOfHandsGame />);

    expect(screen.getByText('A dragon moved into your house. Where does it sleep?')).toBeTruthy();
    fireEvent.press(screen.getByText('Reveal together'));
    expect(screen.getByText('3 · 2 · 1 · SHOW!')).toBeTruthy();

    fireEvent.press(screen.getByText('Everyone picked 2'));
    expect(screen.getByText('HIGH FIVE!')).toBeTruthy();
    expect(screen.getByText(/dragon curls around the chimney/)).toBeTruthy();
    expect(mockFeedback.success).toHaveBeenCalled();

    fireEvent.press(screen.getByText('Next disaster'));
    expect(screen.getByText('The moon is falling. How do you put it back?')).toBeTruthy();
  });

  it('conducts one pitch and turns a second split into Chaos', () => {
    const screen = render(<ShowOfHandsGame />);

    fireEvent.press(screen.getByText('Reveal together'));
    fireEvent.press(screen.getByText('No match'));
    expect(screen.getByText('One sentence each.')).toBeTruthy();

    fireEvent.press(screen.getByText('Pick again'));
    expect(screen.getByText('FINAL PICK')).toBeTruthy();
    fireEvent.press(screen.getByText('Ready to reveal'));
    fireEvent.press(screen.getByText('Still split'));

    expect(screen.getByText('CHAOS STRIKES!')).toBeTruthy();
    expect(screen.getByText(/dragon chose the bathtub/)).toBeTruthy();
    expect(mockFeedback.failure).toHaveBeenCalled();
  });
});

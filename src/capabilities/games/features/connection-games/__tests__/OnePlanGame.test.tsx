import { act, fireEvent, render } from '@testing-library/react-native';
import { ShowOfHandsGame } from '../OnePlanGame';

const mockFeedback = { success: jest.fn(), failure: jest.fn(), select: jest.fn() };

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => mockFeedback,
}));

describe('Oddball shared table', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.values(mockFeedback).forEach((mock) => mock.mockClear());
  });

  afterEach(() => jest.useRealTimers());

  function reachResultEntry(screen: ReturnType<typeof render>) {
    fireEvent.press(screen.getByRole('button', { name: 'Start Oddball' }));
    act(() => jest.advanceTimersByTime(15_000));
    expect(screen.getByText('3 · 2 · 1 · SHOW!')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1_200));
    expect(screen.getByText('What was the biggest group?')).toBeTruthy();
  }

  it('teaches the complete rule in four short lines and reveals when the clock ends', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana']} soundEnabled />);

    expect(screen.getByText('Pick what most people will pick.')).toBeTruthy();
    expect(screen.getByText('Match the biggest group to score.')).toBeTruthy();
    expect(screen.getByText('Stand alone and you get the Oddball.')).toBeTruthy();
    expect(screen.getByText('You can’t win while you have it.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start Oddball' }));
    expect(screen.getByText('0:15')).toBeTruthy();
    act(() => jest.advanceTimersByTime(15_000));

    expect(screen.getByText('3 · 2 · 1 · SHOW!')).toBeTruthy();
    expect(mockFeedback.select).toHaveBeenCalled();
  });

  it('scores the largest group and docks the public Oddball beside the sole unique player', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana', 'Ari']} soundEnabled />);
    reachResultEntry(screen);

    fireEvent.press(screen.getByRole('button', { name: 'The garage was the biggest group' }));
    expect(screen.getByText('Who matched?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Ari, included in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Did one person stand alone?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Ari stood alone' }));

    expect(screen.getByText('Ari gets the Oddball.')).toBeTruthy();
    expect(screen.getByLabelText('Maya, 1 point')).toBeTruthy();
    expect(screen.getByLabelText('Ari, 0 points, Oddball')).toBeTruthy();
    expect(mockFeedback.success).toHaveBeenCalled();
  });

  it('records a tied largest group without moving the Oddball or awarding points', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana', 'Ari']} soundEnabled />);
    reachResultEntry(screen);

    fireEvent.press(screen.getByRole('button', { name: 'The biggest groups tied' }));

    expect(screen.getByText('No points.')).toBeTruthy();
    expect(screen.getByLabelText('Maya, 0 points')).toBeTruthy();
    expect(mockFeedback.failure).toHaveBeenCalled();
  });
});

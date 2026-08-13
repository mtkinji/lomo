import { act, fireEvent, render } from '@testing-library/react-native';
import { ShowOfHandsGame } from '../OnePlanGame';

const mockFeedback = { success: jest.fn(), failure: jest.fn(), select: jest.fn() };
const mockUseGameMusic = jest.fn();
const mockSpeak = jest.fn();
const mockStopSpeaking = jest.fn();
const mockCountdownCount = jest.fn(async () => undefined);
const mockCountdownReveal = jest.fn(async () => undefined);

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => mockFeedback,
}));

jest.mock('@/src/capabilities/games/audio/useGameMusic', () => ({
  useGameMusic: (...args: unknown[]) => mockUseGameMusic(...args),
}));

jest.mock('@/src/capabilities/games/audio/useOddballCountdownAudio', () => ({
  useOddballCountdownAudio: () => ({ count: mockCountdownCount, reveal: mockCountdownReveal }),
}));

jest.mock('expo-speech', () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
  stop: () => mockStopSpeaking(),
}));

describe('Oddball shared table', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.values(mockFeedback).forEach((mock) => mock.mockClear());
    mockUseGameMusic.mockClear();
    mockSpeak.mockClear();
    mockStopSpeaking.mockClear();
    mockCountdownCount.mockClear();
    mockCountdownReveal.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  function reachResultEntry(screen: ReturnType<typeof render>) {
    fireEvent.press(screen.getByRole('button', { name: 'Start Oddball' }));
    act(() => jest.advanceTimersByTime(15_000));
    expect(screen.getByText('3')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1_000));
    act(() => jest.advanceTimersByTime(1_000));
    act(() => jest.advanceTimersByTime(1_000));
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
    expect(screen.getByText('3')).toBeTruthy();
    expect(mockSpeak).toHaveBeenLastCalledWith('Three', expect.objectContaining({ rate: expect.any(Number) }));

    act(() => jest.advanceTimersByTime(1_000));
    expect(screen.getByText('2')).toBeTruthy();
    expect(mockSpeak).toHaveBeenLastCalledWith('Two', expect.any(Object));

    act(() => jest.advanceTimersByTime(1_000));
    expect(screen.getByText('1')).toBeTruthy();
    expect(mockSpeak).toHaveBeenLastCalledWith('One', expect.any(Object));
    expect(mockCountdownCount).toHaveBeenCalledTimes(3);

    act(() => jest.advanceTimersByTime(1_000));
    expect(mockCountdownReveal).toHaveBeenCalledTimes(1);
    expect(mockUseGameMusic).toHaveBeenCalledWith('game.clue-circle', true);
    expect(mockUseGameMusic).toHaveBeenCalledWith(null, true);
  });

  it('starts with nobody selected, scores the people the host selects, and derives a sole outsider', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana', 'Ari']} soundEnabled />);
    reachResultEntry(screen);

    fireEvent.press(screen.getByRole('button', { name: 'The garage was the biggest group' }));
    expect(screen.getByText('Who picked it?')).toBeTruthy();
    for (const name of ['Maya', 'Leo', 'Nana', 'Ari']) {
      expect(screen.getByRole('button', { name: `${name}, not in biggest group` }).props.accessibilityState).toEqual({ selected: false });
    }

    fireEvent.press(screen.getByRole('button', { name: 'Maya, not in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Leo, not in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nana, not in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

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

  it('keeps a sole-unique choice explicit when several players are outside the largest group', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana', 'Ari', 'Bo']} soundEnabled />);
    reachResultEntry(screen);

    fireEvent.press(screen.getByRole('button', { name: 'The garage was the biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Maya, not in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Leo, not in biggest group' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Did exactly one person stand alone?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nana stood alone' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No sole Oddball this question' })).toBeTruthy();
  });

  it('keeps the six-question rules available during play', () => {
    const screen = render(<ShowOfHandsGame players={['Maya', 'Leo', 'Nana']} soundEnabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Start Oddball' }));
    fireEvent.press(screen.getByRole('button', { name: 'How to play Oddball' }));

    expect(screen.getByRole('header', { name: 'How to play Oddball' })).toBeTruthy();
    expect(screen.getByText('Play six questions.')).toBeTruthy();
    expect(screen.getByText('The highest score wins, but not while holding the Oddball.')).toBeTruthy();
  });
});

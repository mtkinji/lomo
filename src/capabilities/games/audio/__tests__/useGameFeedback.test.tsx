const mockPlayers = Array.from({ length: 10 }, () => ({
  seekTo: jest.fn(async () => undefined), play: jest.fn(), volume: 1,
}));
let mockNextPlayer = 0;
const mockSetAudioModeAsync = jest.fn(async (_mode: unknown) => undefined);

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayers[mockNextPlayer++],
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}));
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { shouldPlayFailureCue, useGameFeedback } from '../useGameFeedback';

describe('game failure cue policy', () => {
  test('keeps sad cues out of a completed game', () => {
    expect(shouldPlayFailureCue('playing')).toBe(true);
    expect(shouldPlayFailureCue('finished')).toBe(false);
  });
});

describe('useGameFeedback', () => {
  beforeEach(() => {
    mockNextPlayer = 0;
    mockPlayers.forEach((player) => {
      player.seekTo.mockClear();
      player.play.mockClear();
    });
    mockSetAudioModeAsync.mockClear();
  });

  test('configures game sounds to play when the device is in silent mode', async () => {
    renderHook(() => useGameFeedback(true));

    await waitFor(() => expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }));
  });

  test('rewinds and plays the failure sound', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.failure(); });

    expect(mockPlayers[7].seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayers[7].play).toHaveBeenCalledTimes(1);
  });

  test('rotates dice rolls without immediately repeating a recording', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => {
      await result.current.roll();
      await result.current.roll();
      await result.current.roll();
      await result.current.roll();
    });

    expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
    expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers[2].play).toHaveBeenCalledTimes(1);
  });

  test('plays the selected player success and failure cues', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => {
      await result.current.success('sparkle');
      await result.current.failure('bonk');
    });

    expect(mockPlayers[4].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers[8].play).toHaveBeenCalledTimes(1);
  });

  test('plays the majestic hawk cry selected as an eagle win sound', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.success('hawk'); });

    expect(mockPlayers[6].play).toHaveBeenCalledTimes(1);
  });
});

const mockPlayers = Array.from({ length: 22 }, () => ({
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
jest.mock('../../../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { HapticsService } from '../../../../services/HapticsService';
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
    (HapticsService.trigger as jest.Mock).mockClear();
  });

  test('configures game sounds to play when the device is in silent mode', async () => {
    renderHook(() => useGameFeedback(true));

    await waitFor(() => expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }));
  });

  test('balances every dice variation at the shared game mechanic gain', async () => {
    renderHook(() => useGameFeedback(true));

    await waitFor(() => {
      expect(mockPlayers.slice(0, 3).map((player) => player.volume)).toEqual([0.68, 0.68, 0.68]);
    });
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
    expect(HapticsService.trigger).toHaveBeenCalledWith('outcome.success');
  });

  test('confirms a skipped clue with a distinct sound and medium haptic', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.skip(); });

    expect(mockPlayers[9].seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayers[9].play).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.primary.confirm');
  });

  test('plays the majestic hawk cry selected as an eagle win sound', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.success('hawk'); });

    expect(mockPlayers[6].play).toHaveBeenCalledTimes(1);
  });

  test('plays the approved cartoon splat setback selected on a profile', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.failure('cartoon-splat'); });

    expect(mockPlayers[10].seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayers[10].play).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['power-lick-1', 11],
    ['power-lick-2', 12],
    ['power-lick-3', 13],
    ['banjo-run-1', 14],
    ['tiny-crowd-1', 15],
    ['tiny-crowd-2', 16],
    ['tiny-crowd-3', 17],
    ['tiny-crowd-4', 18],
  ] as const)('plays approved profile win signature %s', async (soundId, playerIndex) => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => { await result.current.success(soundId); });

    expect(mockPlayers[playerIndex].play).toHaveBeenCalledTimes(1);
  });

  test('alternates the two approved coin gathers when players bank', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await act(async () => {
      await result.current.bank();
      await result.current.bank();
      await result.current.bank();
    });

    expect(mockPlayers[19].play).toHaveBeenCalledTimes(2);
    expect(mockPlayers[20].play).toHaveBeenCalledTimes(1);
  });

  test('uses an approved tiny crowd at mechanic gain for a doubles roll', async () => {
    const { result } = renderHook(() => useGameFeedback(true));

    await waitFor(() => expect(mockPlayers[21].volume).toBeCloseTo(0.54, 2));
    await act(async () => { await result.current.doubles(); });

    expect(mockPlayers[21].play).toHaveBeenCalledTimes(1);
  });
});

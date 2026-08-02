const mockPlayers = Array.from({ length: 8 }, () => ({
  seekTo: jest.fn(async () => undefined), play: jest.fn(), volume: 1,
  shouldCorrectPitch: true, setPlaybackRate: jest.fn(),
}));
let mockNextPlayer = 0;
const mockSources: unknown[] = [];

jest.mock('expo-audio', () => ({
  useAudioPlayer: (source: unknown) => {
    mockSources.push(source);
    return mockPlayers[mockNextPlayer++];
  },
  setAudioModeAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

import { act, renderHook } from '@testing-library/react-native';
import { usePatternAudio } from '../usePatternAudio';

describe('usePatternAudio', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNextPlayer = 0;
    mockSources.length = 0;
    mockPlayers.forEach((player) => { player.seekTo.mockClear(); player.play.mockClear(); player.setPlaybackRate.mockClear(); });
  });
  afterEach(() => jest.useRealTimers());

  it('plays color voices without runtime pitch shifting', async () => {
    const { result } = renderHook(() => usePatternAudio());

    await act(async () => {
      await result.current.beat('coral');
      await result.current.beat('rose');
    });

    expect(mockSources).toHaveLength(8);
    expect(mockPlayers.slice(0, 6).every((player) => player.setPlaybackRate.mock.calls.length === 0)).toBe(true);
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers[5].play).toHaveBeenCalledTimes(1);
  });

  it('plays the watched pattern in order', async () => {
    const { result } = renderHook(() => usePatternAudio());
    const onActiveBeat = jest.fn();
    const onComplete = jest.fn();
    act(() => result.current.sequence(['coral', 'pine'], { spacingMs: 650, onActiveBeat, onComplete }));

    await act(async () => { jest.advanceTimersByTime(180); });
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(onActiveBeat).toHaveBeenLastCalledWith('coral', 0);
    expect(mockPlayers[2].play).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(650); await Promise.resolve(); });
    expect(mockPlayers[2].play).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(650); });
    expect(onActiveBeat).toHaveBeenLastCalledWith(null, null);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels pending playback during handoff', async () => {
    const { result } = renderHook(() => usePatternAudio());
    act(() => {
      result.current.sequence(['coral', 'pine'], { spacingMs: 520 });
      result.current.stopSequence();
      jest.runAllTimers();
    });
    expect(mockPlayers[0].play).not.toHaveBeenCalled();
    expect(mockPlayers[2].play).not.toHaveBeenCalled();
  });

  it('keeps the game flow moving without playback when game sounds are disabled', async () => {
    const { result } = renderHook(() => usePatternAudio(false));
    const onComplete = jest.fn();

    await act(async () => { await result.current.beat('coral'); });
    act(() => result.current.sequence(['pine'], { onComplete }));
    await act(async () => { jest.runAllTimers(); });
    await act(async () => {
      await result.current.success();
      await result.current.failure();
    });

    expect(mockPlayers.every((player) => player.play.mock.calls.length === 0)).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

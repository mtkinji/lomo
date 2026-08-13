const mockPlayers = Array.from({ length: 4 }, () => ({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  volume: 1,
  loop: false,
}));
let mockNextPlayer = 0;

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayers[(mockNextPlayer++) % mockPlayers.length],
  setAudioModeAsync: jest.fn(async () => undefined),
}));

import { act, renderHook } from '@testing-library/react-native';
import { usePatternGroove } from '../usePatternGroove';

describe('usePatternGroove', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNextPlayer = 0;
    mockPlayers.forEach((player) => {
      player.play.mockClear();
      player.pause.mockClear();
      player.seekTo.mockClear();
      player.volume = 1;
      player.loop = false;
    });
  });

  afterEach(() => jest.useRealTimers());

  it('loops only the selected local groove and advances a visible four-count pulse', () => {
    const { result } = renderHook(() => usePatternGroove('funk', true));

    expect(mockPlayers[0].loop).toBe(true);
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers.slice(1).every((player) => player.play.mock.calls.length === 0)).toBe(true);
    expect(result.current.beatIndex).toBe(3);

    act(() => { jest.advanceTimersByTime(210); });
    expect(result.current.beatIndex).toBe(0);
    act(() => { jest.advanceTimersByTime(600); });
    expect(result.current.beatIndex).toBe(1);
  });

  it('keeps the visible pulse when game sound is disabled', () => {
    const { result } = renderHook(() => usePatternGroove('rock', false));

    expect(mockPlayers.every((player) => player.play.mock.calls.length === 0)).toBe(true);
    act(() => { jest.advanceTimersByTime(188); });
    expect(result.current.beatIndex).toBe(0);
  });
});

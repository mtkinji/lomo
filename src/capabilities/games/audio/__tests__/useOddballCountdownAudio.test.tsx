const mockPlayers = [
  { seekTo: jest.fn(async () => undefined), play: jest.fn(), volume: 1 },
  { seekTo: jest.fn(async () => undefined), play: jest.fn(), volume: 1 },
];
let mockNextPlayer = 0;

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayers[mockNextPlayer++],
  setAudioModeAsync: jest.fn(async () => undefined),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useOddballCountdownAudio } from '../useOddballCountdownAudio';

describe('useOddballCountdownAudio', () => {
  beforeEach(() => {
    mockNextPlayer = 0;
    mockPlayers.forEach((player) => {
      player.seekTo.mockClear();
      player.play.mockClear();
      player.volume = 1;
    });
  });

  it('plays three restrained count beats and one distinct reveal beat', async () => {
    const { result } = renderHook(() => useOddballCountdownAudio(true));

    await act(async () => {
      await result.current.count();
      await result.current.count();
      await result.current.count();
      await result.current.reveal();
    });

    expect(mockPlayers[0].play).toHaveBeenCalledTimes(3);
    expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers[1].volume).toBeGreaterThan(mockPlayers[0].volume);
  });

  it('keeps the countdown moving silently when sound is off', async () => {
    const { result } = renderHook(() => useOddballCountdownAudio(false));

    await act(async () => {
      await result.current.count();
      await result.current.reveal();
    });

    expect(mockPlayers.every((player) => player.play.mock.calls.length === 0)).toBe(true);
  });
});

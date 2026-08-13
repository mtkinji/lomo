const mockPlayer = {
  playing: false,
  volume: 0,
  loop: false,
  replace: jest.fn(),
  play: jest.fn(() => { mockPlayer.playing = true; }),
  pause: jest.fn(() => { mockPlayer.playing = false; }),
  remove: jest.fn(),
};
jest.mock('@/src/services/audioAssetDelivery', () => ({
  resolveAudioAsset: jest.fn(async () => ({ uri: 'file:///cache/story.mp3', sourceKind: 'cache' })),
}));

import { resolveAudioAsset } from '@/src/services/audioAssetDelivery';
import { audioGainForCategory } from '../audioGainPolicy';
import { applyGameMusicTransition } from '../useGameMusic';

describe('useGameMusic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayer.playing = false;
    mockPlayer.volume = 0;
    mockPlayer.loop = false;
  });

  test('plays a resolved loop at the shared game-music gain and stops when the moment ends', async () => {
    const immediateSleep = async () => undefined;
    await applyGameMusicTransition(mockPlayer, 'game.story-relay', true, () => true, immediateSleep);

    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(mockPlayer.volume).toBeCloseTo(audioGainForCategory('game.music'));
    expect(resolveAudioAsset).toHaveBeenCalledWith('game.story-relay');
    expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: 'file:///cache/story.mp3' });
    expect(mockPlayer.loop).toBe(true);

    await applyGameMusicTransition(mockPlayer, null, true, () => true, immediateSleep);
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  test('keeps the current track playing while the next track resolves', async () => {
    mockPlayer.playing = true;
    mockPlayer.volume = audioGainForCategory('game.music');
    let finishResolving: ((value: { uri: string; sourceKind: 'cache' }) => void) | undefined;
    jest.mocked(resolveAudioAsset).mockImplementationOnce(() => new Promise((resolve) => {
      finishResolving = resolve;
    }));

    const transition = applyGameMusicTransition(
      mockPlayer,
      'game.bank-building',
      true,
      () => true,
      async () => undefined,
    );
    await Promise.resolve();

    expect(mockPlayer.pause).not.toHaveBeenCalled();
    expect(mockPlayer.playing).toBe(true);

    finishResolving?.({ uri: 'file:///cache/bank-building.mp3', sourceKind: 'cache' });
    await transition;
    expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: 'file:///cache/bank-building.mp3' });
  });

  test('leaves the current track playing when the next track cannot resolve', async () => {
    mockPlayer.playing = true;
    mockPlayer.volume = audioGainForCategory('game.music');
    jest.mocked(resolveAudioAsset).mockRejectedValueOnce(new Error('offline'));

    await expect(applyGameMusicTransition(
      mockPlayer,
      'game.bank-maximum',
      true,
      () => true,
      async () => undefined,
    )).rejects.toThrow('offline');

    expect(mockPlayer.pause).not.toHaveBeenCalled();
    expect(mockPlayer.playing).toBe(true);
  });
});

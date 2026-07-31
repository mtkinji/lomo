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
});

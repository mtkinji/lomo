import * as FileSystem from 'expo-file-system/legacy';
import { REMOTE_AUDIO_ASSETS } from './audioAssetCatalog';
import {
  cacheAudioAsset,
  clearAudioAssetDeliveryStateForTests,
  resolveAudioAsset,
} from './audioAssetDelivery';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(async () => undefined),
  downloadAsync: jest.fn(),
  moveAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
}));

const getInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const downloadAsync = FileSystem.downloadAsync as jest.Mock;
const moveAsync = FileSystem.moveAsync as jest.Mock;

describe('audio asset delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAudioAssetDeliveryStateForTests();
  });

  test('catalog uses immutable content-addressed public URLs', () => {
    for (const entry of Object.values(REMOTE_AUDIO_ASSETS)) {
      expect(entry.url).toMatch(/^https:\/\/sqxwjtorodqjdfnuvprf\.supabase\.co\/storage\/v1\/object\/public\/audio_assets\/v1\//);
      expect(entry.url).toMatch(/-[a-f0-9]{12}\.mp3$/);
      expect(entry.expectedBytes).toBeGreaterThan(0);
    }
  });

  test('returns a verified cached file without starting a download', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.open-road'];
    getInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, size: entry.expectedBytes, uri: `file:///cache/kwilt-audio/${entry.cacheFileName}` });

    await expect(resolveAudioAsset('focus.open-road')).resolves.toEqual({
      uri: `file:///cache/kwilt-audio/${entry.cacheFileName}`,
      sourceKind: 'cache',
    });
    expect(downloadAsync).not.toHaveBeenCalled();
  });

  test('returns the remote URL immediately on a miss and begins caching', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.open-road'];
    getInfoAsync
      .mockResolvedValueOnce({ exists: false, isDirectory: false })
      .mockResolvedValueOnce({ exists: false, isDirectory: false })
      .mockResolvedValueOnce({ exists: true, isDirectory: false, size: entry.expectedBytes });
    downloadAsync.mockResolvedValue({ uri: `file:///cache/kwilt-audio/${entry.cacheFileName}.download`, status: 200, headers: {} });

    await expect(resolveAudioAsset('focus.open-road')).resolves.toEqual({
      uri: entry.url,
      sourceKind: 'remote',
    });
    await cacheAudioAsset('focus.open-road');
    expect(downloadAsync).toHaveBeenCalledWith(entry.url, `file:///cache/kwilt-audio/${entry.cacheFileName}.download`);
    expect(moveAsync).toHaveBeenCalledWith({
      from: `file:///cache/kwilt-audio/${entry.cacheFileName}.download`,
      to: `file:///cache/kwilt-audio/${entry.cacheFileName}`,
    });
  });

  test('deduplicates concurrent cache requests', async () => {
    const entry = REMOTE_AUDIO_ASSETS['game.story-relay'];
    getInfoAsync
      .mockResolvedValueOnce({ exists: false, isDirectory: false })
      .mockResolvedValueOnce({ exists: true, isDirectory: false, size: entry.expectedBytes });
    downloadAsync.mockResolvedValue({ uri: `file:///cache/kwilt-audio/${entry.cacheFileName}.download`, status: 200, headers: {} });

    await Promise.all([cacheAudioAsset('game.story-relay'), cacheAudioAsset('game.story-relay')]);
    expect(downloadAsync).toHaveBeenCalledTimes(1);
  });

  test('rejects and removes a download whose byte size is wrong', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.rainlit-library'];
    getInfoAsync
      .mockResolvedValueOnce({ exists: false, isDirectory: false })
      .mockResolvedValueOnce({ exists: true, isDirectory: false, size: entry.expectedBytes - 1 });
    downloadAsync.mockResolvedValue({ uri: `file:///cache/kwilt-audio/${entry.cacheFileName}.download`, status: 200, headers: {} });

    await expect(cacheAudioAsset('focus.rainlit-library')).rejects.toThrow('Audio download size mismatch');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `file:///cache/kwilt-audio/${entry.cacheFileName}.download`,
      { idempotent: true },
    );
    expect(moveAsync).not.toHaveBeenCalled();
  });
});

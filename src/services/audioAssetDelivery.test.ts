import * as FileSystem from 'expo-file-system';
import { REMOTE_AUDIO_ASSETS } from './audioAssetCatalog';
import {
  cacheAudioAsset,
  clearAudioAssetDeliveryStateForTests,
  resolveAudioAsset,
  resolveLocalAudioAsset,
} from './audioAssetDelivery';

jest.mock('expo-file-system', () => {
  const files = new Map<string, number>();
  const downloadFileAsync = jest.fn();
  const deleteFile = jest.fn((uri: string) => files.delete(uri));
  const moveFile = jest.fn((from: string, to: string) => {
    const size = files.get(from);
    files.delete(from);
    if (size !== undefined) files.set(to, size);
  });
  const join = (parts: unknown[]) => parts
    .map((part) => typeof part === 'string' ? part : (part as { uri: string }).uri)
    .reduce((path, part) => path ? `${path.replace(/\/$/, '')}/${part.replace(/^\//, '')}` : part, '');

  class MockDirectory {
    uri: string;
    create = jest.fn();
    constructor(...parts: unknown[]) { this.uri = `${join(parts).replace(/\/$/, '')}/`; }
  }

  class MockFile {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri) ?? 0; }
    delete() { deleteFile(this.uri); }
    move(destination: MockFile) { moveFile(this.uri, destination.uri); }
    static downloadFileAsync = downloadFileAsync;
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: 'file:///cache' } },
    __files: files,
    __downloadFileAsync: downloadFileAsync,
    __deleteFile: deleteFile,
    __moveFile: moveFile,
  };
});

type FileSystemMock = typeof FileSystem & {
  __files: Map<string, number>;
  __downloadFileAsync: jest.Mock;
  __deleteFile: jest.Mock;
  __moveFile: jest.Mock;
};

const fileSystemMock = FileSystem as FileSystemMock;

function cacheUri(fileName: string) {
  return `file:///cache/kwilt-audio/${fileName}`;
}

function downloadedFile(uri: string, size: number) {
  fileSystemMock.__files.set(uri, size);
  return new FileSystem.File(uri);
}

describe('audio asset delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileSystemMock.__files.clear();
    clearAudioAssetDeliveryStateForTests();
  });

  test('catalog uses immutable content-addressed public URLs', () => {
    for (const entry of Object.values(REMOTE_AUDIO_ASSETS)) {
      expect(entry.url).toMatch(/^https:\/\/sqxwjtorodqjdfnuvprf\.supabase\.co\/storage\/v1\/object\/public\/audio_assets\/v1\//);
      expect(entry.url).toMatch(/-[a-f0-9]{12}\.mp3$/);
      expect(entry.expectedBytes).toBeGreaterThan(0);
    }
  });

  test('Quiet Rain points at the steady broadband replacement master', () => {
    expect(REMOTE_AUDIO_ASSETS['focus.quiet-rain']).toMatchObject({
      url: expect.stringContaining('/focus/quiet-rain-bb036739700b.mp3'),
      cacheFileName: 'focus-quiet-rain-bb036739700b.mp3',
      expectedBytes: 5_569_388,
    });
  });

  test('returns a verified cached file without starting a download', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.open-road'];
    fileSystemMock.__files.set(cacheUri(entry.cacheFileName), entry.expectedBytes);

    await expect(resolveAudioAsset('focus.open-road')).resolves.toEqual({
      uri: cacheUri(entry.cacheFileName),
      sourceKind: 'cache',
    });
    expect(fileSystemMock.__downloadFileAsync).not.toHaveBeenCalled();
  });

  test('returns the remote URL immediately on a miss and begins atomic caching', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.open-road'];
    const temporaryUri = `${cacheUri(entry.cacheFileName)}.download`;
    fileSystemMock.__downloadFileAsync.mockImplementationOnce(async () =>
      downloadedFile(temporaryUri, entry.expectedBytes));

    await expect(resolveAudioAsset('focus.open-road')).resolves.toEqual({
      uri: entry.url,
      sourceKind: 'remote',
    });
    await cacheAudioAsset('focus.open-road');

    expect(fileSystemMock.__downloadFileAsync).toHaveBeenCalledWith(
      entry.url,
      expect.objectContaining({ uri: temporaryUri }),
      { idempotent: true },
    );
    expect(fileSystemMock.__moveFile).toHaveBeenCalledWith(temporaryUri, cacheUri(entry.cacheFileName));
  });

  test('awaits an atomic download and returns only a verified local URI for loop playback', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.open-road'];
    const temporaryUri = `${cacheUri(entry.cacheFileName)}.download`;
    fileSystemMock.__downloadFileAsync.mockImplementationOnce(async () =>
      downloadedFile(temporaryUri, entry.expectedBytes));

    const resolved = await resolveLocalAudioAsset('focus.open-road');

    expect(resolved).toEqual({
      uri: cacheUri(entry.cacheFileName),
      sourceKind: 'cache',
    });
    expect(resolved.uri.startsWith('file:')).toBe(true);
  });

  test('deduplicates concurrent cache requests', async () => {
    const entry = REMOTE_AUDIO_ASSETS['game.story-relay'];
    const temporaryUri = `${cacheUri(entry.cacheFileName)}.download`;
    fileSystemMock.__downloadFileAsync.mockImplementationOnce(async () =>
      downloadedFile(temporaryUri, entry.expectedBytes));

    await Promise.all([cacheAudioAsset('game.story-relay'), cacheAudioAsset('game.story-relay')]);
    expect(fileSystemMock.__downloadFileAsync).toHaveBeenCalledTimes(1);
  });

  test('rejects and removes a download whose byte size is wrong', async () => {
    const entry = REMOTE_AUDIO_ASSETS['focus.rainlit-library'];
    const temporaryUri = `${cacheUri(entry.cacheFileName)}.download`;
    fileSystemMock.__downloadFileAsync.mockImplementationOnce(async () =>
      downloadedFile(temporaryUri, entry.expectedBytes - 1));

    await expect(cacheAudioAsset('focus.rainlit-library')).rejects.toThrow('Audio download size mismatch');
    expect(fileSystemMock.__deleteFile).toHaveBeenCalledWith(temporaryUri);
    expect(fileSystemMock.__moveFile).not.toHaveBeenCalled();
  });
});

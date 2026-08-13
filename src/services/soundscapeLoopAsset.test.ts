const mockDownloadAsync = jest.fn();
const mockFromModule = jest.fn(() => ({
  localUri: null as string | null,
  uri: 'asset://bundled',
  downloadAsync: mockDownloadAsync,
}));
const mockResolveLocalAudioAsset = jest.fn();

jest.mock('expo-asset', () => ({
  Asset: { fromModule: mockFromModule },
}));

jest.mock('./audioAssetDelivery', () => ({
  resolveLocalAudioAsset: mockResolveLocalAudioAsset,
}));

describe('soundscape loop asset preparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadAsync.mockResolvedValue(undefined);
    mockResolveLocalAudioAsset.mockResolvedValue({
      uri: 'file:///cache/cedar.mp3',
      sourceKind: 'cache',
    });
  });

  it('prepares a remote soundscape as a verified local descriptor', async () => {
    const { prepareSoundscapeLoopAsset } = require('./soundscapeLoopAsset') as typeof import('./soundscapeLoopAsset');

    await expect(prepareSoundscapeLoopAsset('cedarWorkshop')).resolves.toEqual({
      uri: 'file:///cache/cedar.mp3',
      assetKey: 'cedar-workshop-279fdbb6ed7a',
      sampleRateHz: 48_000,
      channels: 2,
    });
    expect(mockResolveLocalAudioAsset).toHaveBeenCalledWith('focus.cedar-workshop');
  });

  it('downloads a bundled asset and requires its local file URI', async () => {
    mockFromModule.mockReturnValueOnce({
      localUri: null,
      uri: 'asset://bundled',
      downloadAsync: jest.fn(async function download(this: { localUri: string | null }) {
        this.localUri = 'file:///bundle/deep-work.mp3';
      }),
    });
    const { prepareSoundscapeLoopAsset } = require('./soundscapeLoopAsset') as typeof import('./soundscapeLoopAsset');

    await expect(prepareSoundscapeLoopAsset('default')).resolves.toEqual({
      uri: 'file:///bundle/deep-work.mp3',
      assetKey: 'deep-work-drift-loop-c24a34f97230',
      sampleRateHz: 48_000,
      channels: 2,
    });
  });

  it('rejects a bundled asset that never resolves to a local file', async () => {
    const { prepareSoundscapeLoopAsset, SoundscapeAssetError } =
      require('./soundscapeLoopAsset') as typeof import('./soundscapeLoopAsset');

    await expect(prepareSoundscapeLoopAsset('canyonSpring')).rejects.toMatchObject({
      name: SoundscapeAssetError.name,
      code: 'bundled_asset_unavailable',
    });
  });

  it('maps remote download failure to a stable error code', async () => {
    mockResolveLocalAudioAsset.mockRejectedValueOnce(new Error('offline'));
    const { prepareSoundscapeLoopAsset } = require('./soundscapeLoopAsset') as typeof import('./soundscapeLoopAsset');

    await expect(prepareSoundscapeLoopAsset('quietRain')).rejects.toMatchObject({
      code: 'download_failed',
    });
  });
});

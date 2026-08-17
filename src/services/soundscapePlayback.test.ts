const mockDiagnostics = (state: string, assetKey: string | null = 'test-loop') => ({
  state,
  assetKey,
  queuedSegments: state === 'idle' ? 0 : 3,
  completedBoundaries: 0,
  underrunCount: 0,
  lastErrorCode: null,
});

const mockTransport = {
  name: 'native' as const,
  prepare: jest.fn(async () => mockDiagnostics('ready')),
  play: jest.fn(async () => mockDiagnostics('playing')),
  pause: jest.fn(async () => mockDiagnostics('paused')),
  setVolume: jest.fn(async () => mockDiagnostics('playing')),
  unload: jest.fn(async () => mockDiagnostics('idle', null)),
  subscribe: jest.fn(() => jest.fn()),
  getDiagnostics: jest.fn(() => mockDiagnostics('ready')),
};

const mockPrepareAsset = jest.fn(async (id: string) => ({
  uri: `file:///cache/${id}.mp3`,
  assetKey: `${id}-key`,
  sampleRateHz: 48_000 as const,
  channels: 2 as const,
}));
const mockSetAudioModeAsync = jest.fn(async () => undefined);

jest.mock('expo-audio', () => ({ setAudioModeAsync: mockSetAudioModeAsync }));
jest.mock('./soundscapeLoopAsset', () => ({ prepareSoundscapeLoopAsset: mockPrepareAsset }));
jest.mock('./soundscapeLoopTransport', () => ({
  createSoundscapeLoopTransport: jest.fn(() => mockTransport),
}));
jest.mock('./nativeCrashBreadcrumbs', () => ({
  nativeCrashErrorMessage: jest.fn((error: Error) => error.message),
  recordNativeCrashBreadcrumb: jest.fn(async () => undefined),
}));

describe('Focus soundscape playback', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockTransport.getDiagnostics.mockReturnValue(mockDiagnostics('ready'));
  });

  test('prepares one local asset, starts native playback, and keeps it warm when paused', async () => {
    const { preloadSoundscape, startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await preloadSoundscape();
    expect(mockPrepareAsset).toHaveBeenCalledWith('default');
    expect(mockTransport.prepare).toHaveBeenCalledWith(expect.objectContaining({
      uri: 'file:///cache/default.mp3',
      sampleRateHz: 48_000,
      channels: 2,
    }));

    await startSoundscapeLoop({ volume: 0.4, fadeInMs: 0 });
    expect(mockTransport.play).toHaveBeenCalledWith(0.4, 0);

    await stopSoundscapeLoop();
    expect(mockTransport.pause).toHaveBeenCalledWith(700);
    expect(mockTransport.unload).not.toHaveBeenCalled();
  });

  test('switches every soundscape through the same transport and releases on unload', async () => {
    const { startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await startSoundscapeLoop({ soundscapeId: 'canyonSpring', fadeInMs: 0 });
    expect(mockPrepareAsset).toHaveBeenCalledWith('canyonSpring');
    expect(mockTransport.prepare).toHaveBeenCalledTimes(1);
    expect(mockTransport.play).toHaveBeenCalledTimes(1);

    await stopSoundscapeLoop({ unload: true });
    expect(mockTransport.pause).toHaveBeenCalledWith(700);
    expect(mockTransport.unload).toHaveBeenCalledTimes(1);
  });

  test('cancels a late prepare after Focus audio is stopped', async () => {
    let finishAsset!: () => void;
    mockPrepareAsset.mockImplementationOnce(() => new Promise((resolve) => {
      finishAsset = () => resolve({
        uri: 'file:///cache/default.mp3',
        assetKey: 'default-key',
        sampleRateHz: 48_000,
        channels: 2,
      });
    }));
    const { preloadSoundscape, stopSoundscapeLoop, getSoundscapeStatus } =
      require('./soundscape') as typeof import('./soundscape');

    const preload = preloadSoundscape();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await stopSoundscapeLoop({ unload: true });
    finishAsset();
    await preload;

    expect(mockTransport.play).not.toHaveBeenCalled();
    expect(getSoundscapeStatus()).toBe('stopped');
  });
});

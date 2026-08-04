const mockSubscriptionRemove = jest.fn();
let mockPlaybackListener: ((status: Record<string, unknown>) => void) | null = null;
const mockPlayer = {
  loop: false,
  volume: 1,
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  remove: jest.fn(),
  addListener: jest.fn((_event: string, listener: (status: Record<string, unknown>) => void) => {
    mockPlaybackListener = listener;
    return { remove: mockSubscriptionRemove };
  }),
};
const mockCreateAudioPlayer = jest.fn(() => mockPlayer);
const mockSetAudioModeAsync = jest.fn(async () => undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: mockCreateAudioPlayer,
  setAudioModeAsync: mockSetAudioModeAsync,
}));

jest.mock('./audioAssetDelivery', () => ({
  resolveAudioAsset: jest.fn(async () => ({ uri: 'file:///cache/track.mp3', sourceKind: 'cache' })),
}));

jest.mock('./nativeCrashBreadcrumbs', () => ({
  nativeCrashErrorMessage: jest.fn((error: Error) => error.message),
  recordNativeCrashBreadcrumb: jest.fn(async () => undefined),
}));

describe('Focus soundscape playback', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlaybackListener = null;
    mockPlayer.loop = false;
    mockPlayer.volume = 1;
  });

  test('loads one looping player, starts it, and keeps it warm when paused', async () => {
    const { preloadSoundscape, startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await preloadSoundscape();
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBe(0);

    await startSoundscapeLoop({ volume: 0.4, fadeInMs: 0 });
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(mockPlayer.volume).toBe(0.4);

    await stopSoundscapeLoop();
    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
    expect(mockPlayer.remove).not.toHaveBeenCalled();
  });

  test('resumes after a native interruption and releases on unload', async () => {
    const { startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await startSoundscapeLoop({ fadeInMs: 0 });
    mockPlayer.play.mockClear();
    mockSetAudioModeAsync.mockClear();

    mockPlaybackListener?.({ isLoaded: true, playing: false, isBuffering: false });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockSetAudioModeAsync).toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    await stopSoundscapeLoop({ unload: true });
    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
    expect(mockPlayer.remove).toHaveBeenCalledTimes(1);
  });
});

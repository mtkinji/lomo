type MockPlayer = ReturnType<typeof createMockPlayer>;

const mockPlayers: MockPlayer[] = [];

function createMockPlayer() {
  let playbackListener: ((status: Record<string, unknown>) => void) | null = null;
  const subscriptionRemove = jest.fn();
  return {
    loop: false,
    volume: 1,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    remove: jest.fn(),
    addListener: jest.fn((_event: string, listener: (status: Record<string, unknown>) => void) => {
      playbackListener = listener;
      return { remove: subscriptionRemove };
    }),
    emitPlaybackStatus(status: Record<string, unknown>) {
      playbackListener?.(status);
    },
    subscriptionRemove,
  };
}

const mockCreateAudioPlayer = jest.fn(() => {
  const player = createMockPlayer();
  mockPlayers.push(player);
  return player;
});
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
    mockPlayers.length = 0;
  });

  test('loads one looping player, starts it, and keeps it warm when paused', async () => {
    const { preloadSoundscape, startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await preloadSoundscape();
    const mockPlayer = mockPlayers[0];
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
    const mockPlayer = mockPlayers[0];
    mockPlayer.play.mockClear();
    mockSetAudioModeAsync.mockClear();

    mockPlayer.emitPlaybackStatus({ isLoaded: true, playing: false, isBuffering: false });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockSetAudioModeAsync).toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    await stopSoundscapeLoop({ unload: true });
    expect(mockPlayer.subscriptionRemove).toHaveBeenCalledTimes(1);
    expect(mockPlayer.remove).toHaveBeenCalledTimes(1);
  });

  test('crossfades Canyon Spring into a warm standby before the native loop boundary', async () => {
    jest.useFakeTimers();
    const { startSoundscapeLoop, stopSoundscapeLoop } =
      require('./soundscape') as typeof import('./soundscape');

    await startSoundscapeLoop({ soundscapeId: 'canyonSpring', volume: 0.4, fadeInMs: 0 });
    const first = mockPlayers[0];
    const second = mockPlayers[1];

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
    expect(first.play).toHaveBeenCalledTimes(1);
    expect(second.play).not.toHaveBeenCalled();

    first.emitPlaybackStatus({
      isLoaded: true,
      playing: true,
      isBuffering: false,
      currentTime: 289.5,
      duration: 291.24,
    });
    await jest.runAllTimersAsync();

    expect(second.seekTo).toHaveBeenCalledWith(0, 0, 0);
    expect(second.play).toHaveBeenCalledTimes(1);
    expect(second.volume).toBeCloseTo(0.4);
    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(first.seekTo).toHaveBeenCalledWith(0, 0, 0);
    expect(first.volume).toBe(0);

    const stopPromise = stopSoundscapeLoop({ unload: true });
    await jest.runAllTimersAsync();
    await stopPromise;
    jest.useRealTimers();
  });
});

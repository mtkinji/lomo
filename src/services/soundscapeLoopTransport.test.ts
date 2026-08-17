import type { PreparedSoundscapeLoopAsset } from './soundscapeLoopAsset';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('../../modules/kwilt-seamless-loop', () => ({ __esModule: true, default: null }));

const asset: PreparedSoundscapeLoopAsset = {
  uri: 'file:///cache/loop.mp3',
  assetKey: 'loop-abcdef123456',
  sampleRateHz: 48_000,
  channels: 2,
};

function diagnostics(state: 'idle' | 'ready' | 'playing' | 'paused' = 'idle') {
  return {
    state,
    assetKey: state === 'idle' ? null : asset.assetKey,
    queuedSegments: state === 'playing' ? 3 : 0,
    completedBoundaries: 0,
    underrunCount: 0,
    lastErrorCode: null,
  } as const;
}

function nativeModule(available = true) {
  return {
    isAvailable: jest.fn(() => available),
    prepare: jest.fn(async () => diagnostics('ready')),
    play: jest.fn(async () => diagnostics('playing')),
    pause: jest.fn(async () => diagnostics('paused')),
    setVolume: jest.fn(async () => diagnostics('playing')),
    unload: jest.fn(async () => diagnostics('idle')),
    getDiagnostics: jest.fn(() => diagnostics('idle')),
    runContinuityProbe: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

function rollbackPlayer() {
  return {
    loop: false,
    volume: 1,
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  };
}

describe('soundscape loop transport', () => {
  it('forwards lifecycle and diagnostics through the native bridge', async () => {
    const native = nativeModule();
    const { createSoundscapeLoopTransport } = require('./soundscapeLoopTransport') as typeof import('./soundscapeLoopTransport');
    const transport = createSoundscapeLoopTransport({ mode: 'native-only', nativeModule: native });

    expect(transport.name).toBe('native');
    await transport.prepare(asset);
    await transport.play(0.4, 700);
    await transport.setVolume(0.3, 650);
    await transport.pause(700);
    await transport.unload();

    expect(native.prepare).toHaveBeenCalledWith({
      uri: asset.uri,
      assetKey: asset.assetKey,
      expectedSampleRateHz: 48_000,
      expectedChannels: 2,
    });
    expect(native.play).toHaveBeenCalledWith(0.4, 700);
    expect(native.setVolume).toHaveBeenCalledWith(0.3, 650);
    expect(native.pause).toHaveBeenCalledWith(700);
    expect(native.unload).toHaveBeenCalledTimes(1);
  });

  it('uses the explicitly named rollback transport when native is unavailable', async () => {
    const native = nativeModule(false);
    const player = rollbackPlayer();
    const createPlayer = jest.fn(() => player);
    const { createSoundscapeLoopTransport } = require('./soundscapeLoopTransport') as typeof import('./soundscapeLoopTransport');
    const transport = createSoundscapeLoopTransport({
      mode: 'native-first',
      nativeModule: native,
      createRollbackPlayer: createPlayer,
    });

    expect(transport.name).toBe('rollback');
    await transport.prepare(asset);
    await transport.play(0.4, 0);
    expect(createPlayer).toHaveBeenCalledWith({ uri: asset.uri }, { keepAudioSessionActive: true });
    expect(player.loop).toBe(true);
    expect(player.volume).toBe(0.4);
    expect(player.play).toHaveBeenCalledTimes(1);

    await transport.pause(0);
    await transport.unload();
    await transport.unload();
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.remove).toHaveBeenCalledTimes(1);
  });

  it('fails closed when native-only mode has no linked module', () => {
    const { createSoundscapeLoopTransport } = require('./soundscapeLoopTransport') as typeof import('./soundscapeLoopTransport');
    expect(() => createSoundscapeLoopTransport({
      mode: 'native-only',
      nativeModule: nativeModule(false),
    })).toThrow('Native seamless loop transport is unavailable');
  });

  it('forwards native state subscriptions and removes them once', () => {
    const native = nativeModule();
    const subscription = { remove: jest.fn() };
    native.addListener.mockReturnValueOnce(subscription);
    const listener = jest.fn();
    const { createSoundscapeLoopTransport } = require('./soundscapeLoopTransport') as typeof import('./soundscapeLoopTransport');
    const transport = createSoundscapeLoopTransport({ mode: 'native-only', nativeModule: native });

    const unsubscribe = transport.subscribe(listener);
    expect(native.addListener).toHaveBeenCalledWith('onStateChanged', listener);
    unsubscribe();
    unsubscribe();
    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });
});

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import KwiltSeamlessLoop, {
  type KwiltSeamlessLoopModuleLike,
  type LoopDiagnostics,
} from '../../modules/kwilt-seamless-loop';
import type { PreparedSoundscapeLoopAsset } from './soundscapeLoopAsset';

export type SoundscapeLoopTransportMode = 'native-first' | 'native-only' | 'expo-only';
export type SoundscapeLoopTransportName = 'native' | 'rollback';

export interface SoundscapeLoopTransport {
  readonly name: SoundscapeLoopTransportName;
  prepare(asset: PreparedSoundscapeLoopAsset): Promise<LoopDiagnostics>;
  play(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  pause(fadeDurationMs: number): Promise<LoopDiagnostics>;
  setVolume(volume: number, fadeDurationMs: number): Promise<LoopDiagnostics>;
  unload(): Promise<LoopDiagnostics>;
  subscribe(listener: (diagnostics: LoopDiagnostics) => void): () => void;
  getDiagnostics(): LoopDiagnostics;
}

type RollbackPlayer = Pick<AudioPlayer, 'loop' | 'volume' | 'play' | 'pause' | 'remove'>;
type CreateRollbackPlayer = (
  source: { uri: string },
  options: { keepAudioSessionActive: true },
) => RollbackPlayer;

type CreateOptions = {
  mode?: SoundscapeLoopTransportMode;
  nativeModule?: KwiltSeamlessLoopModuleLike | null;
  createRollbackPlayer?: CreateRollbackPlayer;
};

const idleDiagnostics = (): LoopDiagnostics => ({
  state: 'idle',
  assetKey: null,
  queuedSegments: 0,
  completedBoundaries: 0,
  underrunCount: 0,
  lastErrorCode: null,
});

function createNativeTransport(nativeModule: KwiltSeamlessLoopModuleLike): SoundscapeLoopTransport {
  return {
    name: 'native',
    prepare: (asset) => nativeModule.prepare({
      uri: asset.uri,
      assetKey: asset.assetKey,
      expectedSampleRateHz: asset.sampleRateHz,
      expectedChannels: asset.channels,
    }),
    play: (volume, fadeDurationMs) => nativeModule.play(volume, fadeDurationMs),
    pause: (fadeDurationMs) => nativeModule.pause(fadeDurationMs),
    setVolume: (volume, fadeDurationMs) => nativeModule.setVolume(volume, fadeDurationMs),
    unload: () => nativeModule.unload(),
    subscribe(listener) {
      const subscription = nativeModule.addListener('onStateChanged', listener);
      let removed = false;
      return () => {
        if (removed) return;
        removed = true;
        subscription.remove();
      };
    },
    getDiagnostics: () => nativeModule.getDiagnostics(),
  };
}

function createRollbackTransport(createPlayer: CreateRollbackPlayer): SoundscapeLoopTransport {
  let player: RollbackPlayer | null = null;
  let current = idleDiagnostics();

  return {
    name: 'rollback',
    async prepare(asset) {
      if (player) player.remove();
      player = createPlayer({ uri: asset.uri }, { keepAudioSessionActive: true });
      player.loop = true;
      player.volume = 0;
      current = { ...idleDiagnostics(), state: 'ready', assetKey: asset.assetKey };
      return current;
    },
    async play(volume) {
      if (!player) throw new Error('Rollback loop transport is not prepared');
      player.volume = clamp(volume);
      player.play();
      current = { ...current, state: 'playing' };
      return current;
    },
    async pause() {
      if (!player) return current;
      player.pause();
      current = { ...current, state: 'paused' };
      return current;
    },
    async setVolume(volume) {
      if (player) player.volume = clamp(volume);
      return current;
    },
    async unload() {
      const target = player;
      player = null;
      if (target) target.remove();
      current = idleDiagnostics();
      return current;
    },
    subscribe() {
      return () => undefined;
    },
    getDiagnostics: () => current,
  };
}

export function createSoundscapeLoopTransport(options: CreateOptions = {}): SoundscapeLoopTransport {
  const mode = options.mode ?? 'native-first';
  const nativeModule = options.nativeModule === undefined ? KwiltSeamlessLoop : options.nativeModule;
  const nativeAvailable = Boolean(nativeModule?.isAvailable());
  if (mode !== 'expo-only' && nativeAvailable && nativeModule) {
    return createNativeTransport(nativeModule);
  }
  if (mode === 'native-only') throw new Error('Native seamless loop transport is unavailable');
  const createPlayer = options.createRollbackPlayer
    ?? ((source, playerOptions) => createAudioPlayer(source, playerOptions));
  return createRollbackTransport(createPlayer);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

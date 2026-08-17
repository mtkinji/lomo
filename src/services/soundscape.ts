import { setAudioModeAsync } from 'expo-audio';
import { audioGainForCategory } from '../capabilities/games/audio/audioGainPolicy';
import { nativeCrashErrorMessage, recordNativeCrashBreadcrumb } from './nativeCrashBreadcrumbs';
import { prepareSoundscapeLoopAsset } from './soundscapeLoopAsset';
import {
  createSoundscapeLoopTransport,
  type SoundscapeLoopTransport,
  type SoundscapeLoopTransportMode,
} from './soundscapeLoopTransport';
import { SOUND_SCAPES, type SoundscapeId } from './soundscapeCatalog';

export { SOUND_SCAPES, isSoundscapeId, type SoundscapeId } from './soundscapeCatalog';

export const SOUNDSCAPE_FADE_DURATION_MS = 700;

type SoundscapeStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'stopped' | 'error';

let status: SoundscapeStatus = 'idle';
let currentSoundscapeId: SoundscapeId = 'default';
let currentVolume = audioGainForCategory('focus.music');
let transport: SoundscapeLoopTransport | null = null;
let transportSubscription: (() => void) | null = null;
let loadPromise: Promise<void> | null = null;
let pendingStop = false;
let shouldBePlaying = false;
let generation = 0;
let audioModeConfigured = false;

function configuredTransportMode(): SoundscapeLoopTransportMode {
  const configured = process.env.EXPO_PUBLIC_FOCUS_LOOP_TRANSPORT;
  return configured === 'native-only' || configured === 'expo-only' ? configured : 'native-first';
}

function ensureTransport(mode = configuredTransportMode()) {
  if (transport) return transport;
  transport = createSoundscapeLoopTransport({ mode });
  transportSubscription = transport.subscribe((diagnostics) => {
    if (diagnostics.state === 'error') status = 'error';
  });
  return transport;
}

/** Prepare verified local bytes without coupling Focus timer startup to audio readiness. */
export async function preloadSoundscape(opts?: { soundscapeId?: SoundscapeId }) {
  if (opts?.soundscapeId && opts.soundscapeId !== currentSoundscapeId) {
    await setSoundscapeId(opts.soundscapeId);
  }
  if (status === 'loading') {
    await loadPromise?.catch(() => undefined);
    return;
  }
  if (status === 'ready' || status === 'playing') return;

  const operationGeneration = generation;
  status = 'loading';
  loadPromise = (async () => {
    try {
      await ensureAudioMode();
      const selected = currentSoundscapeId;
      await prepareWithFallback(selected, operationGeneration);
      if (operationGeneration !== generation) return;
      status = 'ready';
      if (pendingStop) await stopSoundscapeLoop({ unload: true });
    } catch (error) {
      if (operationGeneration !== generation) return;
      status = 'error';
      await recordSoundscapeBreadcrumb('preloadSoundscape', 'error', undefined, error);
      await releaseTransport();
      throw error;
    } finally {
      loadPromise = null;
    }
  })();
  await loadPromise;
}

export async function startSoundscapeLoop(opts?: {
  volume?: number;
  fadeInMs?: number;
  soundscapeId?: SoundscapeId;
}) {
  if (opts?.soundscapeId && opts.soundscapeId !== currentSoundscapeId) {
    await setSoundscapeId(opts.soundscapeId);
  }
  const operationGeneration = generation;
  pendingStop = false;
  shouldBePlaying = true;
  if (typeof opts?.volume === 'number' && Number.isFinite(opts.volume)) {
    currentVolume = clamp(opts.volume);
  }
  const fadeInMs = typeof opts?.fadeInMs === 'number' && Number.isFinite(opts.fadeInMs)
    ? Math.max(0, Math.round(opts.fadeInMs))
    : SOUNDSCAPE_FADE_DURATION_MS;

  try {
    if (status === 'playing' && transport) {
      await transport.setVolume(currentVolume, fadeInMs);
      return;
    }
    if (status !== 'ready') await preloadSoundscape({ soundscapeId: currentSoundscapeId });
    if (operationGeneration !== generation || pendingStop || !shouldBePlaying) return;
    await ensureAudioMode({ force: true });
    const activeTransport = ensureTransport();
    await runSoundscapeNativeOperation(
      'transport.play',
      () => activeTransport.play(currentVolume, fadeInMs),
      { transport: activeTransport.name },
    );
    if (operationGeneration === generation) status = 'playing';
  } catch (error) {
    if (operationGeneration !== generation) return;
    status = 'error';
    await recordSoundscapeBreadcrumb('startSoundscapeLoop', 'error', undefined, error);
    await releaseTransport();
    throw error;
  }
}

export async function stopSoundscapeLoop(opts?: { unload?: boolean }) {
  generation += 1;
  pendingStop = true;
  shouldBePlaying = false;
  const activeTransport = transport;
  if (!activeTransport) {
    status = opts?.unload ? 'stopped' : 'idle';
    pendingStop = false;
    return;
  }
  try {
    if (opts?.unload) {
      await activeTransport.pause(SOUNDSCAPE_FADE_DURATION_MS).catch(() => undefined);
      await releaseTransport();
      status = 'stopped';
    } else {
      await activeTransport.pause(SOUNDSCAPE_FADE_DURATION_MS);
      status = 'ready';
    }
  } finally {
    pendingStop = false;
  }
}

export function getSoundscapeStatus(): SoundscapeStatus {
  return status;
}

export function getSoundscapeLoopDiagnostics() {
  return transport?.getDiagnostics() ?? null;
}

export async function setSoundscapeId(id: SoundscapeId) {
  if (!SOUND_SCAPES.some((item) => item.id === id) || id === currentSoundscapeId) return;
  await stopSoundscapeLoop({ unload: true }).catch(() => undefined);
  currentSoundscapeId = id;
  status = 'idle';
  pendingStop = false;
}

/** Compatibility helper for callers that only need the verified local source URI. */
export async function resolveSoundscapeSource(id: SoundscapeId): Promise<{ uri: string }> {
  const asset = await prepareSoundscapeLoopAsset(id);
  return { uri: asset.uri };
}

async function prepareWithFallback(id: SoundscapeId, operationGeneration: number) {
  let selectedId = id;
  try {
    const asset = await prepareSoundscapeLoopAsset(selectedId);
    if (operationGeneration !== generation) return;
    await ensureTransport().prepare(asset);
    return;
  } catch (selectedError) {
    if (operationGeneration !== generation) return;
    if (selectedId !== 'default') {
      selectedId = 'default';
      try {
        const fallback = await prepareSoundscapeLoopAsset(selectedId);
        if (operationGeneration !== generation) return;
        await ensureTransport().prepare(fallback);
        return;
      } catch {
        // Continue to the rollout transport below.
      }
    }
    if (ensureTransport().name === 'native' && configuredTransportMode() !== 'native-only') {
      await releaseTransport();
      transport = createSoundscapeLoopTransport({ mode: 'expo-only' });
      const fallback = await prepareSoundscapeLoopAsset('default');
      if (operationGeneration !== generation) return;
      await transport.prepare(fallback);
      return;
    }
    throw selectedError;
  }
}

async function releaseTransport() {
  const active = transport;
  transport = null;
  transportSubscription?.();
  transportSubscription = null;
  if (active) await active.unload().catch(() => undefined);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

async function ensureAudioMode(opts?: { force?: boolean }) {
  if (audioModeConfigured && !opts?.force) return;
  await runSoundscapeNativeOperation('setAudioModeAsync', () => setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
    shouldRouteThroughEarpiece: false,
  }), { force: Boolean(opts?.force) });
  audioModeConfigured = true;
}

async function runSoundscapeNativeOperation<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: Record<string, unknown>,
): Promise<T> {
  await recordSoundscapeBreadcrumb(operation, 'before', context);
  try {
    const result = await fn();
    await recordSoundscapeBreadcrumb(operation, 'after', context);
    return result;
  } catch (error) {
    await recordSoundscapeBreadcrumb(operation, 'error', context, error);
    throw error;
  }
}

async function recordSoundscapeBreadcrumb(
  operation: string,
  phase: 'before' | 'after' | 'error',
  context?: Record<string, unknown>,
  error?: unknown,
) {
  await recordNativeCrashBreadcrumb({
    area: 'focus.soundscape',
    operation,
    phase,
    context: {
      soundscapeId: currentSoundscapeId,
      status,
      transport: transport?.name ?? null,
      shouldBePlaying,
      ...context,
    },
    errorMessage: error === undefined ? undefined : nativeCrashErrorMessage(error),
  });
}

async function disposeSoundscapeForFastRefresh() {
  generation += 1;
  shouldBePlaying = false;
  pendingStop = true;
  status = 'stopped';
  await releaseTransport();
}

type MetroHotModule = { hot?: { dispose: (callback: () => void) => void } };

if (__DEV__) {
  const hot = (module as unknown as MetroHotModule).hot;
  hot?.dispose(() => { void disposeSoundscapeForFastRefresh(); });
}

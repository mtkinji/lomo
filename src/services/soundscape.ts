import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { nativeCrashErrorMessage, recordNativeCrashBreadcrumb } from './nativeCrashBreadcrumbs';
import { audioGainForCategory } from '../capabilities/games/audio/audioGainPolicy';
import { resolveAudioAsset } from './audioAssetDelivery';
import type { RemoteAudioAssetId } from './audioAssetCatalog';
import { SOUND_SCAPES, type SoundscapeId } from './soundscapeCatalog';

export { SOUND_SCAPES, isSoundscapeId, type SoundscapeId } from './soundscapeCatalog';

export const SOUNDSCAPE_FADE_DURATION_MS = 700;

type SoundscapeStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'stopped' | 'error';

let status: SoundscapeStatus = 'idle';
let sound: AudioPlayer | null = null;
let warmStandbySound: AudioPlayer | null = null;
const playbackSubscriptions = new Map<AudioPlayer, { remove: () => void }>();
// Default soundscape volume (0..1). The device/system volume still applies on top of this.
let currentVolume = audioGainForCategory('focus.music');
let lastAppliedVolume = currentVolume;
let pendingStop = false;
let opCounter = 0;
let audioModeConfigured = false;
let loadPromise: Promise<void> | null = null;
let shouldBePlaying = false;
let resumeAttempts = 0;
let lastResumeAttemptMs = 0;
let canyonCrossfadeInProgress = false;

const DEFAULT_SOUNDSCAPE_SOURCE = require('../../assets/audio/soundscapes/Sleep Music No. 1 - Chris Haugen.mp3');
const CANYON_SPRING_SOURCE = require('../../assets/audio/soundscapes/canyon-spring-stream.mp3');
const CANYON_SPRING_CROSSFADE_LEAD_SECONDS = 2;
const CANYON_SPRING_CROSSFADE_DURATION_MS = 1_200;
const REMOTE_SOUNDSCAPE_IDS: Partial<Record<SoundscapeId, RemoteAudioAssetId>> = {
  copacabanaFocus: 'focus.copacabana',
  focusFlowState: 'focus.focus-tunnel',
  midnightStudySession: 'focus.midnight-study',
  openRoadFocus: 'focus.open-road',
  cedarWorkshop: 'focus.cedar-workshop',
  rainlitLibrary: 'focus.rainlit-library',
  quietRain: 'focus.quiet-rain',
  oceanWaves: 'focus.ocean-waves',
  fireplace: 'focus.fireplace',
};

let currentSoundscapeId: SoundscapeId = 'default';

/**
 * Ad-free soundscape loop. Deep Work Drift is bundled; the remaining tracks
 * stream immediately and use an app-managed cache when available.
 */
export async function preloadSoundscape(opts?: { soundscapeId?: SoundscapeId }) {
  if (opts?.soundscapeId && opts.soundscapeId !== currentSoundscapeId) {
    await setSoundscapeId(opts.soundscapeId);
  }
  if (status === 'loading') {
    // If a load is already in-flight, wait for it so callers can reliably proceed.
    await loadPromise?.catch(() => undefined);
    return;
  }
  if (status === 'playing' || status === 'ready') {
    return;
  }
  if (sound) {
    status = 'ready';
    return;
  }

  status = 'loading';
  loadPromise = (async () => {
    try {
      await ensureAudioMode();
      const selectedId = currentSoundscapeId;
      const selectedSource = await resolveSoundscapeSource(selectedId);
      const playerOptions = {
        keepAudioSessionActive: true,
        updateInterval: selectedId === 'canyonSpring' ? 250 : 500,
      } as const;
      let created;
      let usingOfflineFallback = false;
      try {
        created = await runSoundscapeNativeOperation(
          'createAudioPlayer',
          () => createAudioPlayer(selectedSource, playerOptions),
          { shouldPlay: false, selectedId },
        );
      } catch (error) {
        if (selectedId === 'default') throw error;
        usingOfflineFallback = true;
        created = await runSoundscapeNativeOperation(
          'createAudioPlayer.offlineFallback',
          () => createAudioPlayer(DEFAULT_SOUNDSCAPE_SOURCE, { keepAudioSessionActive: true }),
          { shouldPlay: false, selectedId },
        );
      }
      sound = created;
      sound.loop = true;
      sound.volume = 0;
      attachPlaybackStatusListener(sound);
      if (selectedId === 'canyonSpring' && !usingOfflineFallback) {
        try {
          warmStandbySound = await runSoundscapeNativeOperation(
            'createAudioPlayer.canyonWarmStandby',
            () => createAudioPlayer(selectedSource, playerOptions),
            { shouldPlay: false, selectedId },
          );
          warmStandbySound.loop = true;
          warmStandbySound.volume = 0;
          attachPlaybackStatusListener(warmStandbySound);
        } catch {
          // The primary player's native loop remains the safe fallback.
          warmStandbySound = null;
        }
      }
      status = 'ready';

      if (pendingStop) {
        await stopSoundscapeLoop({ unload: true });
        return;
      }

      lastAppliedVolume = 0;
    } catch (e) {
      status = 'error';
      await recordSoundscapeBreadcrumb('preloadSoundscape', 'error', undefined, e);
      try {
        if (sound) {
          const target = sound;
          await runSoundscapeNativeOperation('sound.remove.preloadError', () => target.remove());
        }
      } catch {
        // ignore
      }
      sound = null;
      await releaseWarmStandbySound();
      removeAllPlaybackSubscriptions();
      throw e;
    } finally {
      loadPromise = null;
    }
  })();

  await loadPromise;
}

export async function startSoundscapeLoop(opts?: { volume?: number; fadeInMs?: number; soundscapeId?: SoundscapeId }) {
  if (opts?.soundscapeId && opts.soundscapeId !== currentSoundscapeId) {
    await setSoundscapeId(opts.soundscapeId);
  }
  const opId = ++opCounter;
  pendingStop = false;
  shouldBePlaying = true;
  resumeAttempts = 0;
  const fadeInMs = typeof opts?.fadeInMs === 'number' && Number.isFinite(opts.fadeInMs)
    ? Math.max(0, Math.round(opts.fadeInMs))
    : SOUNDSCAPE_FADE_DURATION_MS;

  if (typeof opts?.volume === 'number' && Number.isFinite(opts.volume)) {
    currentVolume = clamp(opts.volume, 0, 1);
  }

  // If we're already playing, just fade to the new target volume (if needed).
  if (status === 'playing' && sound) {
    await fadeToVolume(sound, lastAppliedVolume, currentVolume, 650, opId);
    lastAppliedVolume = currentVolume;
    return;
  }

  // If we're still loading, wait for the in-flight load so this call can own the fade-in.
  if (status === 'loading') {
    await preloadSoundscape({ soundscapeId: currentSoundscapeId });
  }

  try {
    // If we already have a loaded sound, start it immediately.
    if (
      !sound ||
      (status !== 'ready' && status !== 'stopped' && status !== 'idle' && status !== 'error')
    ) {
      await preloadSoundscape({ soundscapeId: currentSoundscapeId });
    }

    if (!sound) {
      status = 'error';
      throw new Error('Soundscape failed to load');
    }

    // Re-assert audio mode on each explicit start so route changes/silent toggles recover.
    await ensureAudioMode({ force: true });
    status = 'playing';
    try {
      await runSoundscapeNativeOperation('sound.loop', () => {
        sound!.loop = true;
      }, {
        looping: true,
      });
    } catch {
      // best-effort
    }
    attachPlaybackStatusListener(sound);
    try {
      await runSoundscapeNativeOperation('sound.play', () => sound!.play());
    } catch (e) {
      // If play fails, fall back to a full reload next time.
      status = 'error';
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[soundscape] play failed', e);
      }
      throw new Error('Soundscape failed to start playback');
    }

    // If the user turned soundscape off (or ended Focus) while we were loading,
    // ensure we don't start playing after the fact.
    if (pendingStop) {
      await stopSoundscapeLoop();
      return;
    }

    lastAppliedVolume = 0;
    await fadeToVolume(sound, 0, currentVolume, fadeInMs, opId);
    lastAppliedVolume = currentVolume;
  } catch (e) {
    await recordSoundscapeBreadcrumb('startSoundscapeLoop', 'error', undefined, e);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[soundscape] startSoundscapeLoop failed', e);
    }
    status = 'error';
    try {
      if (sound) {
        const target = sound;
        await runSoundscapeNativeOperation('sound.remove.startError', () => target.remove());
      }
    } catch {
      // ignore
    }
    sound = null;
    await releaseWarmStandbySound();
    removeAllPlaybackSubscriptions();
    throw e;
  }
}

export async function stopSoundscapeLoop(opts?: { unload?: boolean }) {
  const opId = ++opCounter;
  pendingStop = true;
  const unload = Boolean(opts?.unload);
  shouldBePlaying = false;
  resumeAttempts = 0;
  lastResumeAttemptMs = 0;
  canyonCrossfadeInProgress = false;

  // If we're loading but haven't created the Sound instance yet, mark stopped now.
  // The start flow checks `pendingStop` after load and will shut down immediately.
  if (status === 'loading' && !sound) {
    status = unload ? 'stopped' : 'idle';
    return;
  }

  if (!sound) {
    // Nothing is currently loaded, so there is no in-flight playback to stop.
    // Clear the pending flag so a later first start can proceed normally.
    status = unload ? 'stopped' : 'idle';
    pendingStop = false;
    return;
  }

  // Fade out before stopping/unloading so it doesn't cut abruptly.
  try {
    await fadeToVolume(sound, lastAppliedVolume, 0, SOUNDSCAPE_FADE_DURATION_MS, opId);
  } catch {
    // best effort
  }

  if (unload) {
    try {
      const target = sound;
      await runSoundscapeNativeOperation('sound.pause', () => target.pause());
    } catch {
      // ignore
    }
    try {
      const target = sound;
      removePlaybackSubscription(target);
      await runSoundscapeNativeOperation('sound.remove', () => target.remove());
    } catch {
      // ignore
    }
    sound = null;
    await releaseWarmStandbySound();
    status = 'stopped';
  } else {
    // Keep the asset loaded so turning sound back on feels instant.
    try {
      const target = sound;
      await runSoundscapeNativeOperation('sound.pause', () => target.pause());
    } catch {
      // ignore
    }
    try {
      if (warmStandbySound) {
        warmStandbySound.pause();
        warmStandbySound.volume = 0;
      }
    } catch {
      // best effort
    }
    status = 'ready';
  }

  pendingStop = false;
  lastAppliedVolume = 0;
}

export function getSoundscapeStatus(): SoundscapeStatus {
  return status;
}

export async function setSoundscapeId(id: SoundscapeId) {
  if (!id || !SOUND_SCAPES.some((item) => item.id === id)) return;
  if (id === currentSoundscapeId) return;

  // Stop/unload any existing sound so the next preload uses the new source.
  try {
    await stopSoundscapeLoop({ unload: true });
  } catch {
    // best-effort
  }
  currentSoundscapeId = id;
  status = 'idle';
  sound = null;
  warmStandbySound = null;
}

export async function resolveSoundscapeSource(id: SoundscapeId): Promise<any> {
  if (id === 'canyonSpring') return CANYON_SPRING_SOURCE;
  const remoteId = REMOTE_SOUNDSCAPE_IDS[id];
  if (!remoteId) return DEFAULT_SOUNDSCAPE_SOURCE;
  const resolved = await resolveAudioAsset(remoteId);
  return { uri: resolved.uri };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function ensureAudioMode(opts?: { force?: boolean }) {
  if (audioModeConfigured && !opts?.force) return;
  await runSoundscapeNativeOperation(
    'setAudioModeAsync',
    () => setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      // Keep soundscape playing when the screen locks / app backgrounds (Focus mode).
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }),
    { force: Boolean(opts?.force) },
  );
  audioModeConfigured = true;
}

function attachPlaybackStatusListener(target: AudioPlayer) {
  if (!target?.addListener || playbackSubscriptions.has(target)) return;
  const subscription = target.addListener('playbackStatusUpdate', (playbackStatus: any) => {
    if (!playbackStatus || !playbackStatus.isLoaded) return;
    if (!shouldBePlaying || target !== sound) return;

    if (shouldCrossfadeCanyonSpring(playbackStatus)) {
      void crossfadeCanyonSpringLoop(target);
      return;
    }

    if (playbackStatus.playing || playbackStatus.isBuffering) return;
    // Best-effort: resume after route changes / interruptions.
    const now = Date.now();
    const cooldownMs = resumeAttempts < 2 ? 500 : 1500;
    if (now - lastResumeAttemptMs < cooldownMs) return;
    lastResumeAttemptMs = now;
    resumeAttempts += 1;
    void attemptResumePlayback();
  });
  playbackSubscriptions.set(target, subscription);
}

function shouldCrossfadeCanyonSpring(playbackStatus: any): boolean {
  if (currentSoundscapeId !== 'canyonSpring') return false;
  if (!warmStandbySound || canyonCrossfadeInProgress) return false;
  if (!playbackStatus.playing || playbackStatus.isBuffering) return false;
  const duration = Number(playbackStatus.duration);
  const currentTime = Number(playbackStatus.currentTime);
  if (!Number.isFinite(duration) || !Number.isFinite(currentTime) || duration <= 0) return false;
  return duration - currentTime <= CANYON_SPRING_CROSSFADE_LEAD_SECONDS;
}

async function crossfadeCanyonSpringLoop(outgoing: AudioPlayer) {
  const incoming = warmStandbySound;
  if (!incoming || outgoing !== sound || canyonCrossfadeInProgress) return;

  canyonCrossfadeInProgress = true;
  const crossfadeOpId = opCounter;
  try {
    incoming.volume = 0;
    await incoming.seekTo(0, 0, 0);
    if (crossfadeOpId !== opCounter || !shouldBePlaying) return;
    incoming.play();

    const steps = Math.max(12, Math.floor(CANYON_SPRING_CROSSFADE_DURATION_MS / 50));
    const stepMs = Math.floor(CANYON_SPRING_CROSSFADE_DURATION_MS / steps);
    for (let step = 1; step <= steps; step += 1) {
      if (crossfadeOpId !== opCounter || !shouldBePlaying) return;
      const progress = step / steps;
      outgoing.volume = currentVolume * Math.cos(progress * Math.PI / 2);
      incoming.volume = currentVolume * Math.sin(progress * Math.PI / 2);
      // eslint-disable-next-line no-await-in-loop
      await sleep(stepMs);
    }

    outgoing.pause();
    await outgoing.seekTo(0, 0, 0);
    outgoing.volume = 0;
    if (crossfadeOpId !== opCounter || !shouldBePlaying) return;

    sound = incoming;
    warmStandbySound = outgoing;
    lastAppliedVolume = currentVolume;
    resumeAttempts = 0;
  } catch (error) {
    // Keep the outgoing player's native loop enabled as the reliability fallback.
    try {
      incoming.pause();
      incoming.volume = 0;
      outgoing.volume = currentVolume;
    } catch {
      // best effort
    }
    await recordSoundscapeBreadcrumb('canyonCrossfade', 'error', undefined, error);
  } finally {
    canyonCrossfadeInProgress = false;
  }
}

function removePlaybackSubscription(target: AudioPlayer) {
  playbackSubscriptions.get(target)?.remove();
  playbackSubscriptions.delete(target);
}

function removeAllPlaybackSubscriptions() {
  playbackSubscriptions.forEach((subscription) => subscription.remove());
  playbackSubscriptions.clear();
}

async function releaseWarmStandbySound() {
  const standby = warmStandbySound;
  warmStandbySound = null;
  if (!standby) return;
  removePlaybackSubscription(standby);
  try {
    standby.pause();
  } catch {
    // best effort
  }
  try {
    await runSoundscapeNativeOperation('sound.remove.canyonWarmStandby', () => standby.remove());
  } catch {
    // best effort
  }
}

async function attemptResumePlayback() {
  if (!sound || !shouldBePlaying) return;
  try {
    await ensureAudioMode({ force: true });
  } catch {
    // best-effort
  }
  try {
    await runSoundscapeNativeOperation('sound.play.resume', () => sound!.play());
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[soundscape] resume playback failed', e);
    }
  }
}

type VolumeFadableSound = {
  volume: number;
};

async function fadeToVolume(
  target: VolumeFadableSound,
  from: number,
  to: number,
  durationMs: number,
  opId: number,
) {
  const start = clamp(from, 0, 1);
  const end = clamp(to, 0, 1);
  if (durationMs <= 0 || Math.abs(end - start) < 0.001) {
    if (opId !== opCounter) return;
    target.volume = end;
    return;
  }

  const steps = Math.max(8, Math.floor(durationMs / 50));
  const stepMs = Math.floor(durationMs / steps);
  for (let i = 1; i <= steps; i++) {
    if (opId !== opCounter) return; // cancelled by a newer operation
    const t = i / steps;
    // Smooth-ish curve: ease in/out via cubic.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const v = start + (end - start) * eased;
    target.volume = v;
    // eslint-disable-next-line no-await-in-loop
    await sleep(stepMs);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
): Promise<void> {
  await recordNativeCrashBreadcrumb({
    area: 'focus.soundscape',
    operation,
    phase,
    context: {
      soundscapeId: currentSoundscapeId,
      status,
      hasSound: Boolean(sound),
      shouldBePlaying,
      ...context,
    },
    errorMessage: error === undefined ? undefined : nativeCrashErrorMessage(error),
  });
}

async function disposeSoundscapeForFastRefresh(): Promise<void> {
  // Fast Refresh re-evaluates this module, but the native player can outlive the
  // JavaScript singleton that owns it. Stop it before the old module is discarded
  // so Focus audio cannot become detached from the active-session state.
  const target = sound;
  const standby = warmStandbySound;
  sound = null;
  warmStandbySound = null;
  opCounter += 1;
  pendingStop = true;
  shouldBePlaying = false;
  status = 'stopped';
  resumeAttempts = 0;
  lastResumeAttemptMs = 0;
  lastAppliedVolume = 0;
  canyonCrossfadeInProgress = false;

  try {
    removeAllPlaybackSubscriptions();
  } catch {
    // best effort during development teardown
  }
  for (const player of [target, standby]) {
    if (!player) continue;
    try {
      player.pause();
    } catch {
      // best effort during development teardown
    }
    try {
      player.remove();
    } catch {
      // best effort during development teardown
    }
  }
}

type MetroHotModule = {
  hot?: {
    dispose: (callback: () => void) => void;
  };
};

if (__DEV__) {
  const hot = (module as unknown as MetroHotModule).hot;
  hot?.dispose(() => {
    void disposeSoundscapeForFastRefresh();
  });
}

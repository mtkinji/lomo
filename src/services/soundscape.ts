// NOTE: `expo-av` is deprecated (will be removed in a future Expo SDK).
// Lazy-load it so the deprecation warning does not spam on app launch.
type ExpoAvAudio = (typeof import('expo-av'))['Audio'];
let Audio: ExpoAvAudio | null = null;

async function getAudio(): Promise<ExpoAvAudio> {
  if (Audio) return Audio;
  const mod = await import('expo-av');
  Audio = mod.Audio;
  return Audio;
}

type SoundscapeStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'stopped' | 'error';

let status: SoundscapeStatus = 'idle';
let sound: any | null = null;
// Default soundscape volume (0..1). The device/system volume still applies on top of this.
let currentVolume = 1.0;
let lastAppliedVolume = 1.0;
let pendingStop = false;
let opCounter = 0;
let audioModeConfigured = false;
let loadPromise: Promise<void> | null = null;

export type SoundscapeId = 'default';

// Bundled soundscapes (offline, no ads). Keep the default always available.
const SOUNDSCAPE_SOURCES: Record<SoundscapeId, any> = {
  default: require('../../assets/audio/soundscapes/Sleep Music No. 1 - Chris Haugen.mp3'),
};

export const SOUND_SCAPES: Array<{ id: SoundscapeId; title: string }> = [
  { id: 'default', title: 'Sleep Music No. 1' },
];

let currentSoundscapeId: SoundscapeId = 'default';

/**
 * Offline, ad-free soundscape loop (bundled asset).
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
      const Audio = await getAudio();
      await ensureAudioMode();
      const created = await Audio.Sound.createAsync(
        SOUNDSCAPE_SOURCES[currentSoundscapeId],
        { isLooping: true, volume: 0, shouldPlay: false },
      );
      sound = created.sound;
      status = 'ready';

      if (pendingStop) {
        await stopSoundscapeLoop({ unload: true });
        return;
      }

      lastAppliedVolume = 0;
    } catch (e) {
      status = 'error';
      try {
        await sound?.unloadAsync();
      } catch {
        // ignore
      }
      sound = null;
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
  const fadeInMs = typeof opts?.fadeInMs === 'number' && Number.isFinite(opts.fadeInMs)
    ? Math.max(0, Math.round(opts.fadeInMs))
    : 250;

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

    status = 'playing';
    try {
      await sound.setIsLoopingAsync(true);
    } catch {
      // best-effort
    }
    try {
      await sound.playAsync();
    } catch (e) {
      // If play fails, fall back to a full reload next time.
      status = 'error';
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[soundscape] playAsync failed', e);
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
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[soundscape] startSoundscapeLoop failed', e);
    }
    status = 'error';
    try {
      await sound?.unloadAsync();
    } catch {
      // ignore
    }
    sound = null;
    throw e;
  }
}

export async function stopSoundscapeLoop(opts?: { unload?: boolean }) {
  const opId = ++opCounter;
  pendingStop = true;
  const unload = Boolean(opts?.unload);

  // If we're loading but haven't created the Sound instance yet, mark stopped now.
  // The start flow checks `pendingStop` after load and will shut down immediately.
  if (status === 'loading' && !sound) {
    status = unload ? 'stopped' : 'idle';
    return;
  }

  if (!sound) {
    status = unload ? 'stopped' : 'idle';
    return;
  }

  // Fade out before stopping/unloading so it doesn't cut abruptly.
  try {
    await fadeToVolume(sound, lastAppliedVolume, 0, 700, opId);
  } catch {
    // best effort
  }

  if (unload) {
    try {
      await sound.stopAsync();
    } catch {
      // ignore
    }
    try {
      await sound.unloadAsync();
    } catch {
      // ignore
    }
    sound = null;
    status = 'stopped';
  } else {
    // Keep the asset loaded so turning sound back on feels instant.
    try {
      await sound.pauseAsync();
    } catch {
      // ignore
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
  if (!id || !(id in SOUNDSCAPE_SOURCES)) return;
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
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function ensureAudioMode() {
  if (audioModeConfigured) return;
  const Audio = await getAudio();
  const interruptionModeIOS =
    (Audio as any)?.InterruptionModeIOS?.DuckOthers ??
    (Audio as any)?.INTERRUPTION_MODE_IOS_DUCK_OTHERS;
  const interruptionModeAndroid =
    (Audio as any)?.InterruptionModeAndroid?.DuckOthers ??
    (Audio as any)?.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS;

  // Some Expo AV versions are picky about interruption constants; configure best-effort,
  // and fall back to a minimal audio mode if the full config throws.
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      // Keep soundscape playing when the screen locks / app backgrounds (Focus mode).
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      interruptionModeIOS,
      interruptionModeAndroid,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }
  audioModeConfigured = true;
}

type VolumeFadableSound = {
  setVolumeAsync: (volume: number) => Promise<void>;
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
    await target.setVolumeAsync(end);
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
    await target.setVolumeAsync(v);
    // eslint-disable-next-line no-await-in-loop
    await sleep(stepMs);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}



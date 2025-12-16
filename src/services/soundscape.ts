import { Audio } from 'expo-av';

type SoundscapeStatus = 'idle' | 'loading' | 'playing' | 'stopped' | 'error';

let status: SoundscapeStatus = 'idle';
let sound: Audio.Sound | null = null;
// Default soundscape volume (0..1). The device/system volume still applies on top of this.
let currentVolume = 1.0;
let lastAppliedVolume = 1.0;
let pendingStop = false;
let opCounter = 0;

// Bundled default soundscape (offline, no ads).
// Note: keep this in one place so it’s easy to swap tracks later.
const DEFAULT_SOUNDSCAPE_SOURCE = require('../../assets/audio/soundscapes/Sleep Music No. 1 - Chris Haugen.mp3');

/**
 * Offline, ad-free soundscape loop (bundled asset).
 */
export async function startSoundscapeLoop(opts?: { volume?: number }) {
  const opId = ++opCounter;
  pendingStop = false;

  if (typeof opts?.volume === 'number' && Number.isFinite(opts.volume)) {
    currentVolume = clamp(opts.volume, 0, 1);
  }

  // If we're already playing, just fade to the new target volume (if needed).
  if (status === 'playing' && sound) {
    await fadeToVolume(sound, lastAppliedVolume, currentVolume, 650, opId);
    lastAppliedVolume = currentVolume;
    return;
  }

  // If we're still loading, just update the target volume; the load flow will fade in.
  if (status === 'loading') {
    return;
  }

  status = 'loading';
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const created = await Audio.Sound.createAsync(
      DEFAULT_SOUNDSCAPE_SOURCE,
      // Start at 0 and fade in so it feels intentional and premium.
      { isLooping: true, volume: 0, shouldPlay: true },
    );

    sound = created.sound;
    status = 'playing';

    // If the user turned soundscape off (or ended Focus) while we were loading,
    // ensure we don't start playing after the fact.
    if (pendingStop) {
      await stopSoundscapeLoop();
      return;
    }

    lastAppliedVolume = 0;
    await fadeToVolume(sound, 0, currentVolume, 900, opId);
    lastAppliedVolume = currentVolume;
  } catch (e) {
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

export async function stopSoundscapeLoop() {
  const opId = ++opCounter;
  pendingStop = true;

  // If we're loading but haven't created the Sound instance yet, mark stopped now.
  // The start flow checks `pendingStop` after load and will shut down immediately.
  if (status === 'loading' && !sound) {
    status = 'stopped';
    return;
  }

  if (!sound) {
    status = 'stopped';
    return;
  }

  // Fade out before stopping/unloading so it doesn't cut abruptly.
  try {
    await fadeToVolume(sound, lastAppliedVolume, 0, 700, opId);
  } catch {
    // best effort
  }
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
  pendingStop = false;
  lastAppliedVolume = 0;
}

export function getSoundscapeStatus(): SoundscapeStatus {
  return status;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function fadeToVolume(
  target: Audio.Sound,
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



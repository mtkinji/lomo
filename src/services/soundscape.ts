import { Audio } from 'expo-av';

type SoundscapeStatus = 'idle' | 'loading' | 'playing' | 'stopped' | 'error';

let status: SoundscapeStatus = 'idle';
let sound: Audio.Sound | null = null;
// Default soundscape volume (0..1). The device/system volume still applies on top of this.
let currentVolume = 1.0;

// Bundled default soundscape (offline, no ads).
// Note: keep this in one place so it’s easy to swap tracks later.
const DEFAULT_SOUNDSCAPE_SOURCE = require('../../assets/audio/soundscapes/Sleep Music No. 1 - Chris Haugen.mp3');

/**
 * Offline, ad-free soundscape loop (bundled asset).
 */
export async function startSoundscapeLoop(opts?: { volume?: number }) {
  if (status === 'loading' || status === 'playing') {
    if (typeof opts?.volume === 'number' && Number.isFinite(opts.volume)) {
      currentVolume = clamp(opts.volume, 0, 1);
      await sound?.setVolumeAsync(currentVolume);
    }
    return;
  }

  status = 'loading';
  try {
    const volume = typeof opts?.volume === 'number' && Number.isFinite(opts.volume) ? opts.volume : currentVolume;
    currentVolume = clamp(volume, 0, 1);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const created = await Audio.Sound.createAsync(
      DEFAULT_SOUNDSCAPE_SOURCE,
      { isLooping: true, volume: currentVolume, shouldPlay: true },
    );

    sound = created.sound;
    status = 'playing';
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
  if (!sound) {
    status = 'stopped';
    return;
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
}

export function getSoundscapeStatus(): SoundscapeStatus {
  return status;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}



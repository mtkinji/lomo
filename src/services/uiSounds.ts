// NOTE: `expo-av` is deprecated (will be removed in a future Expo SDK).
// For now, we lazy-load it so the deprecation warning does not spam on app launch.
// We can migrate to `expo-audio` / `expo-video` later.
type ExpoAvAudio = (typeof import('expo-av'))['Audio'];
let Audio: ExpoAvAudio | null = null;

async function getAudio(): Promise<ExpoAvAudio> {
  if (Audio) return Audio;
  const mod = await import('expo-av');
  Audio = mod.Audio;
  return Audio;
}

/**
 * Lightweight, one-shot UI sound effects.
 *
 * Notes:
 * - We keep a cached `Audio.Sound` instance so repeated taps don't re-load from disk.
 * - This is intentionally best-effort: failures should never block UI interactions.
 */

let audioModeConfigured = false;
let stepDoneSound: any | null = null;
let stepDoneLoading: Promise<void> | null = null;
let activityDoneSound: any | null = null;
let activityDoneLoading: Promise<void> | null = null;

// UI sound effect file (bundled).
// You can swap this for any other short asset under `assets/audio/sfx/`.
const STEP_DONE_SOURCE = require('../../assets/audio/sfx/list-tap.wav');
const ACTIVITY_DONE_SOURCE = require('../../assets/audio/sfx/mark-complete.wav');

async function ensureUiAudioMode(opts?: { force?: boolean }) {
  if (audioModeConfigured && !opts?.force) return;
  const Audio = await getAudio();
  const interruptionModeIOS =
    (Audio as any)?.InterruptionModeIOS?.DuckOthers ??
    (Audio as any)?.INTERRUPTION_MODE_IOS_DUCK_OTHERS;
  const interruptionModeAndroid =
    (Audio as any)?.InterruptionModeAndroid?.DuckOthers ??
    (Audio as any)?.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS;

  // Best-effort: configure audio to play even if the iOS ringer switch is silent.
  // We intentionally do NOT keep audio active in background for UI sounds.
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeIOS,
      interruptionModeAndroid,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  audioModeConfigured = true;
}

async function preloadStepDoneSound() {
  if (stepDoneSound) return;
  if (stepDoneLoading) {
    await stepDoneLoading.catch(() => undefined);
    return;
  }

  stepDoneLoading = (async () => {
    const Audio = await getAudio();
    await ensureUiAudioMode();
    const created = await Audio.Sound.createAsync(STEP_DONE_SOURCE, {
      shouldPlay: false,
      // These WAVs are intentionally subtle, but simulator output can be quiet.
      // Keep this high so it's clearly audible without forcing users to max volume.
      volume: 0.95,
    });
    stepDoneSound = created.sound;
  })();

  try {
    await stepDoneLoading;
  } finally {
    stepDoneLoading = null;
  }
}

export async function playStepDoneSound() {
  try {
    await preloadStepDoneSound();
    if (!stepDoneSound) return;

    await ensureUiAudioMode({ force: true });
    // Re-assert volume at playback time (some platform/device states can alter gain).
    await stepDoneSound.setVolumeAsync(0.95);
    // `replayAsync` is the most reliable "start over and play" across platforms.
    try {
      await stepDoneSound.replayAsync();
    } catch {
      await stepDoneSound?.unloadAsync().catch(() => undefined);
      stepDoneSound = null;
      await preloadStepDoneSound();
      await stepDoneSound?.setVolumeAsync(0.95);
      await stepDoneSound?.replayAsync();
    }
  } catch {
    // Best-effort: no-op if audio fails (simulators, background state, etc).
  }
}

async function preloadActivityDoneSound() {
  if (activityDoneSound) return;
  if (activityDoneLoading) {
    await activityDoneLoading.catch(() => undefined);
    return;
  }

  activityDoneLoading = (async () => {
    const Audio = await getAudio();
    await ensureUiAudioMode();
    const created = await Audio.Sound.createAsync(ACTIVITY_DONE_SOURCE, {
      shouldPlay: false,
      volume: 1.0,
    });
    activityDoneSound = created.sound;
  })();

  try {
    await activityDoneLoading;
  } finally {
    activityDoneLoading = null;
  }
}

export async function playActivityDoneSound() {
  try {
    await preloadActivityDoneSound();
    if (!activityDoneSound) return;
    await ensureUiAudioMode({ force: true });
    await activityDoneSound.setVolumeAsync(1.0);
    try {
      await activityDoneSound.replayAsync();
    } catch {
      await activityDoneSound?.unloadAsync().catch(() => undefined);
      activityDoneSound = null;
      await preloadActivityDoneSound();
      await activityDoneSound?.setVolumeAsync(1.0);
      await activityDoneSound?.replayAsync();
    }
  } catch {
    // Best-effort: no-op if audio fails.
  }
}

export async function unloadUiSounds() {
  try {
    await stepDoneSound?.unloadAsync();
    await activityDoneSound?.unloadAsync();
  } catch {
    // ignore
  } finally {
    stepDoneSound = null;
    stepDoneLoading = null;
    activityDoneSound = null;
    activityDoneLoading = null;
  }
}



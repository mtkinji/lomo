import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Lightweight, one-shot UI sound effects.
 *
 * Notes:
 * - We keep a cached player so repeated taps don't re-load from disk.
 * - This is intentionally best-effort: failures should never block UI interactions.
 */

let audioModeConfigured = false;
let stepDoneSound: AudioPlayer | null = null;
let stepDoneLoading: Promise<void> | null = null;
let activityDoneSound: AudioPlayer | null = null;
let activityDoneLoading: Promise<void> | null = null;

// UI sound effect file (bundled).
// You can swap this for any other short asset under `assets/audio/sfx/`.
const STEP_DONE_SOURCE = require('../../assets/audio/sfx/list-tap.wav');
const ACTIVITY_DONE_SOURCE = require('../../assets/audio/sfx/mark-complete.wav');

async function ensureUiAudioMode(opts?: { force?: boolean }) {
  if (audioModeConfigured && !opts?.force) return;
  // Best-effort: configure audio to play even if the iOS ringer switch is silent.
  // We intentionally do NOT keep audio active in background for UI sounds.
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
    shouldRouteThroughEarpiece: false,
  });

  audioModeConfigured = true;
}

async function preloadStepDoneSound() {
  if (stepDoneSound) return;
  if (stepDoneLoading) {
    await stepDoneLoading.catch(() => undefined);
    return;
  }

  stepDoneLoading = (async () => {
    await ensureUiAudioMode();
    const player = createAudioPlayer(STEP_DONE_SOURCE);
    // These WAVs are intentionally subtle, but simulator output can be quiet.
    // Keep this high so it's clearly audible without forcing users to max volume.
    player.volume = 0.95;
    stepDoneSound = player;
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
    stepDoneSound.volume = 0.95;
    try {
      await stepDoneSound.seekTo(0);
      stepDoneSound.play();
    } catch {
      stepDoneSound?.remove();
      stepDoneSound = null;
      await preloadStepDoneSound();
      const recovered = stepDoneSound as AudioPlayer | null;
      if (!recovered) return;
      recovered.volume = 0.95;
      await recovered.seekTo(0);
      recovered.play();
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
    await ensureUiAudioMode();
    const player = createAudioPlayer(ACTIVITY_DONE_SOURCE);
    player.volume = 1.0;
    activityDoneSound = player;
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
    activityDoneSound.volume = 1.0;
    try {
      await activityDoneSound.seekTo(0);
      activityDoneSound.play();
    } catch {
      activityDoneSound?.remove();
      activityDoneSound = null;
      await preloadActivityDoneSound();
      const recovered = activityDoneSound as AudioPlayer | null;
      if (!recovered) return;
      recovered.volume = 1.0;
      await recovered.seekTo(0);
      recovered.play();
    }
  } catch {
    // Best-effort: no-op if audio fails.
  }
}

export async function unloadUiSounds() {
  try {
    stepDoneSound?.remove();
    activityDoneSound?.remove();
  } catch {
    // ignore
  } finally {
    stepDoneSound = null;
    stepDoneLoading = null;
    activityDoneSound = null;
    activityDoneLoading = null;
  }
}

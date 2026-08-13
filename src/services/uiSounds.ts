import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { audioGainForCategory } from '../capabilities/games/audio/audioGainPolicy';
import type { CompletionFeedbackSound } from './completionFeedbackSoundPolicy';

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
let focusChimeSound: AudioPlayer | null = null;
let focusChimeLoading: Promise<void> | null = null;
let tinyCrowdSound: AudioPlayer | null = null;
let tinyCrowdLoading: Promise<void> | null = null;

// UI sound effect file (bundled).
// You can swap this for any other short asset under `assets/audio/sfx/`.
const STEP_DONE_SOURCE = require('../../assets/audio/sfx/list-tap.wav');
const ACTIVITY_DONE_SOURCE = require('../../assets/audio/sfx/mark-complete.wav');
const FOCUS_CHIME_SOURCE = require('../../assets/audio/sfx/focus-complete-chime.wav');
const FOCUS_CHIME_GAIN = 0.32;
// Reuse the already-bundled Games signature instead of adding another asset.
const TINY_CROWD_SOURCE = require('../../assets/games/success-tiny-crowd-1.mp3');
const TINY_CROWD_PROMINENT_GAIN = audioGainForCategory('game.signature');
const TINY_CROWD_WARM_GAIN = TINY_CROWD_PROMINENT_GAIN * 0.55;

function pauseOtherUiSounds(active: AudioPlayer) {
  for (const player of [stepDoneSound, activityDoneSound, focusChimeSound, tinyCrowdSound]) {
    if (!player || player === active) continue;
    try {
      player.pause();
    } catch {
      // Best-effort: a released or unavailable player should not block feedback.
    }
  }
}

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
    pauseOtherUiSounds(stepDoneSound);
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
    pauseOtherUiSounds(activityDoneSound);
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

async function preloadFocusChimeSound() {
  if (focusChimeSound) return;
  if (focusChimeLoading) {
    await focusChimeLoading.catch(() => undefined);
    return;
  }

  focusChimeLoading = (async () => {
    await ensureUiAudioMode();
    const player = createAudioPlayer(FOCUS_CHIME_SOURCE);
    player.volume = FOCUS_CHIME_GAIN;
    focusChimeSound = player;
  })();

  try {
    await focusChimeLoading;
  } finally {
    focusChimeLoading = null;
  }
}

async function playFocusChimeSound() {
  try {
    await preloadFocusChimeSound();
    if (!focusChimeSound) return;
    await ensureUiAudioMode({ force: true });
    focusChimeSound.volume = FOCUS_CHIME_GAIN;
    pauseOtherUiSounds(focusChimeSound);
    try {
      await focusChimeSound.seekTo(0);
      focusChimeSound.play();
    } catch {
      focusChimeSound?.remove();
      focusChimeSound = null;
      await preloadFocusChimeSound();
      const recovered = focusChimeSound as AudioPlayer | null;
      if (!recovered) return;
      recovered.volume = FOCUS_CHIME_GAIN;
      pauseOtherUiSounds(recovered);
      await recovered.seekTo(0);
      recovered.play();
    }
  } catch {
    // Best-effort: no-op if audio fails.
  }
}

async function preloadTinyCrowdSound() {
  if (tinyCrowdSound) return;
  if (tinyCrowdLoading) {
    await tinyCrowdLoading.catch(() => undefined);
    return;
  }

  tinyCrowdLoading = (async () => {
    await ensureUiAudioMode();
    const player = createAudioPlayer(TINY_CROWD_SOURCE);
    player.volume = TINY_CROWD_PROMINENT_GAIN;
    tinyCrowdSound = player;
  })();

  try {
    await tinyCrowdLoading;
  } finally {
    tinyCrowdLoading = null;
  }
}

async function playTinyCrowdSound(volume: number) {
  try {
    await preloadTinyCrowdSound();
    if (!tinyCrowdSound) return;
    await ensureUiAudioMode({ force: true });
    tinyCrowdSound.volume = volume;
    pauseOtherUiSounds(tinyCrowdSound);
    try {
      await tinyCrowdSound.seekTo(0);
      tinyCrowdSound.play();
    } catch {
      tinyCrowdSound?.remove();
      tinyCrowdSound = null;
      await preloadTinyCrowdSound();
      const recovered = tinyCrowdSound as AudioPlayer | null;
      if (!recovered) return;
      recovered.volume = volume;
      pauseOtherUiSounds(recovered);
      await recovered.seekTo(0);
      recovered.play();
    }
  } catch {
    // Best-effort: no-op if audio fails.
  }
}

export async function playCompletionFeedbackSound(sound: CompletionFeedbackSound) {
  if (sound === 'none') return;
  if (sound === 'step') {
    await playStepDoneSound();
    return;
  }
  if (sound === 'activity') {
    await playActivityDoneSound();
    return;
  }
  if (sound === 'focusChime' || sound === 'focus') {
    await playFocusChimeSound();
    return;
  }
  await playTinyCrowdSound(
    sound === 'tinyCrowdProminent' ? TINY_CROWD_PROMINENT_GAIN : TINY_CROWD_WARM_GAIN,
  );
}

export async function unloadUiSounds() {
  try {
    stepDoneSound?.remove();
    activityDoneSound?.remove();
    focusChimeSound?.remove();
    tinyCrowdSound?.remove();
  } catch {
    // ignore
  } finally {
    stepDoneSound = null;
    stepDoneLoading = null;
    activityDoneSound = null;
    activityDoneLoading = null;
    focusChimeSound = null;
    focusChimeLoading = null;
    tinyCrowdSound = null;
    tinyCrowdLoading = null;
  }
}

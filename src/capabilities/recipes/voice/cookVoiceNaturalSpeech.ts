import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { getAccessToken } from '../../../services/backend/auth';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../../../services/edgeFunctions';
import { getInstallId } from '../../../services/installId';
import { getSupabasePublishableKey } from '../../../utils/getEnv';
import {
  parseCookVoiceSpeechResponse,
  type CookVoiceSpeechAudio,
} from './cookVoiceNaturalSpeechResponse';
import type { CookVoiceSpeechPath } from './cookVoiceSpeechPolicy';

async function requestCookVoiceSpeech(text: string): Promise<CookVoiceSpeechAudio> {
  const token = (await getAccessToken())?.trim();
  const apiKey = getSupabasePublishableKey()?.trim();
  if (!token || !apiKey) throw new Error('Natural voice requires a signed-in session.');
  const headers = new Headers({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: apiKey,
    'x-kwilt-client': 'kwilt-mobile',
    'x-kwilt-install-id': await getInstallId(),
  });
  const candidates = getEdgeFunctionUrlCandidates('cook-voice-speech');
  const fallback = getEdgeFunctionUrl('cook-voice-speech');
  let lastError = new Error('Natural voice is unavailable.');
  for (const url of candidates.length ? candidates : fallback ? [fallback] : []) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });
      const body = await response.json().catch(() => null);
      const parsed = parseCookVoiceSpeechResponse(body);
      if (response.ok && parsed) return parsed;
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }
  throw lastError;
}

let activePlayer: AudioPlayer | null = null;
let activeFile: File | null = null;
let finishActivePlayback: (() => void) | null = null;

async function stopNaturalSpeech(): Promise<void> {
  const finish = finishActivePlayback;
  if (finish) {
    finish();
    return;
  }
  const player = activePlayer;
  const file = activeFile;
  activePlayer = null;
  activeFile = null;
  finishActivePlayback = null;
  try {
    player?.pause();
  } catch {
    // The player may already have been released after a route interruption.
  }
  player?.remove();
  if (file?.exists) file.delete();
}

export const cookVoiceNaturalSpeech: CookVoiceSpeechPath = {
  async speak(text, onStart) {
    await stopNaturalSpeech();
    const audio = await requestCookVoiceSpeech(text);
    const file = new File(Paths.cache, `kwilt-cook-voice-${Date.now()}${audio.extension}`);
    file.create({ overwrite: true, intermediates: true });
    file.write(audio.audioBase64, { encoding: 'base64' });
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });
    const player = createAudioPlayer(file.uri, { keepAudioSessionActive: true });
    activeFile = file;
    activePlayer = player;
    await new Promise<void>((resolve, reject) => {
      let started = false;
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        subscription.remove();
        if (activePlayer === player) {
          activePlayer = null;
          activeFile = null;
          finishActivePlayback = null;
        }
        player.remove();
        if (file.exists) file.delete();
        if (error) reject(error);
        else resolve();
      };
      finishActivePlayback = () => finish();
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing && !started) {
          started = true;
          onStart?.();
        }
        if (status.didJustFinish) finish();
      });
      try {
        player.play();
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Natural voice playback failed.'));
      }
    });
  },
  stop: stopNaturalSpeech,
};

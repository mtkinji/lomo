import * as FileSystem from 'expo-file-system/legacy';
import { AppState } from 'react-native';
import { getAccessToken } from '../../services/backend/auth';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../../services/edgeFunctions';
import { getInstallId } from '../../services/installId';
import { getSupabasePublishableKey } from '../../utils/getEnv';
import { recoverForegroundAudioRace } from './unifiedChatVoiceRecovery';

type ExpoAudio = (typeof import('expo-av'))['Audio'];
let recording: InstanceType<ExpoAudio['Recording']> | null = null;

async function audio(): Promise<ExpoAudio> {
  return (await import('expo-av')).Audio;
}

async function waitForForegroundAudioSession(): Promise<void> {
  if (AppState.currentState !== 'active') {
    await new Promise<void>((resolve) => {
      const subscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        subscription.remove();
        resolve();
      });
    });
  }

  // Let Expo's native lifecycle listener settle after the permission sheet closes.
  await new Promise<void>((resolve) => setTimeout(resolve, 100));
}

export async function startUnifiedChatVoiceRecording(): Promise<void> {
  if (recording) return;
  const Audio = await audio();
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow microphone access to use voice input.');
  const next = await recoverForegroundAudioRace(async () => {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const candidate = new Audio.Recording();
    await candidate.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    return candidate;
  }, waitForForegroundAudioSession);
  await next.startAsync();
  recording = next;
}

export async function cancelUnifiedChatVoiceRecording(): Promise<void> {
  const current = recording;
  recording = null;
  if (!current) return;
  await current.stopAndUnloadAsync().catch(() => undefined);
}

export async function stopAndTranscribeUnifiedChatVoice(): Promise<string> {
  const current = recording;
  recording = null;
  if (!current) throw new Error('No voice recording is active.');
  await current.stopAndUnloadAsync();
  const uri = current.getURI();
  if (!uri) throw new Error('The recording could not be read.');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || ('size' in info && typeof info.size === 'number' && info.size > 8_000_000)) {
    throw new Error('That recording is too long.');
  }
  const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const token = (await getAccessToken())?.trim();
  const apiKey = getSupabasePublishableKey()?.trim();
  if (!token || !apiKey) throw new Error('Sign in to use voice input.');
  const headers = new Headers({
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: apiKey,
    'x-kwilt-client': 'kwilt-mobile', 'x-kwilt-install-id': await getInstallId(),
  });
  const candidates = getEdgeFunctionUrlCandidates('unified-chat-transcribe');
  const fallback = getEdgeFunctionUrl('unified-chat-transcribe');
  let lastError = new Error('Voice input is unavailable.');
  for (const url of candidates.length ? candidates : fallback ? [fallback] : []) {
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ audioBase64, mimeType: 'audio/m4a' }) });
      const result = await response.json().catch(() => null) as Record<string, unknown> | null;
      const transcript = typeof result?.transcript === 'string' ? result.transcript.trim() : '';
      if (response.ok && transcript) return transcript;
      const error = result?.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : null;
      lastError = new Error(typeof error?.message === 'string' ? error.message : 'Kwilt could not transcribe that recording.');
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }
  throw lastError;
}

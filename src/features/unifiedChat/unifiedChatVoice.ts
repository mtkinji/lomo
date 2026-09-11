import { File } from 'expo-file-system';
import { assertVoiceActive, withVoiceDeadline } from './voiceDeadline';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import { AppState } from 'react-native';
import { getAccessToken } from '../../services/backend/auth';
import { getEdgeFunctionUrl, getEdgeFunctionUrlCandidates } from '../../services/edgeFunctions';
import { getInstallId } from '../../services/installId';
import { getSupabasePublishableKey } from '../../utils/getEnv';
import { recoverForegroundAudioRace } from './unifiedChatVoiceRecovery';
import { normalizeUnifiedChatVoiceMetering } from './unifiedChatVoiceMetering';
import { createPreparedAudioRecorder } from '../../services/audioRecorder';

let recording: AudioRecorder | null = null;
let recordingGeneration = 0;
let starting: Promise<void> | null = null;
let meteringTimer: ReturnType<typeof setInterval> | null = null;

function stopMeteringUpdates() {
  if (!meteringTimer) return;
  clearInterval(meteringTimer);
  meteringTimer = null;
}

function startMeteringUpdates(recorder: AudioRecorder, onLevel?: (level: number) => void) {
  stopMeteringUpdates();
  if (!onLevel) return;
  meteringTimer = setInterval(() => {
    const status = recorder.getStatus();
    if (!status.isRecording || typeof status.metering !== 'number') return;
    onLevel(normalizeUnifiedChatVoiceMetering(status.metering));
  }, 100);
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

export function startUnifiedChatVoiceRecording(onLevel?: (level: number) => void): Promise<void> {
  if (recording) return Promise.resolve();
  if (starting) return starting;
  const generation = recordingGeneration;
  const operation = (async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (generation !== recordingGeneration) throw new Error('Voice input cancelled.');
    if (!permission.granted) throw new Error('Allow microphone access to use voice input.');
    const next = await recoverForegroundAudioRace(async () => {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      return createPreparedAudioRecorder(RecordingPresets.HIGH_QUALITY, { isMeteringEnabled: true });
    }, waitForForegroundAudioSession);
    try {
      if (generation !== recordingGeneration) throw new Error('Voice input cancelled.');
      next.record();
      recording = next;
      startMeteringUpdates(next, onLevel);
    } catch (error) {
      await next.stop().catch(() => undefined);
      const uri = next.uri;
      next.release();
      if (uri) discardUnifiedChatVoiceClip({ uri });
      throw error;
    }
  })();
  starting = operation;
  void operation.finally(() => { if (starting === operation) starting = null; }).catch(() => undefined);
  return operation;
}

export async function cancelUnifiedChatVoiceRecording(): Promise<void> {
  recordingGeneration += 1;
  starting = null;
  const current = recording;
  recording = null;
  stopMeteringUpdates();
  if (!current) return;
  await current.stop().catch(() => undefined);
  const uri = current.uri;
  current.release();
  if (uri) discardUnifiedChatVoiceClip({ uri });
}

export type UnifiedChatVoiceClip = { uri: string };
export type UnifiedChatVoiceOptions = {
  signal?: AbortSignal;
  operationId?: string;
  onRecordingStopped?(): void | Promise<void>;
  onClip?(clip: UnifiedChatVoiceClip): void;
  onPhase?(phase: string, elapsedMs: number): void;
};

export function discardUnifiedChatVoiceClip(clip: UnifiedChatVoiceClip) {
  try { const file = new File(clip.uri); if (file.exists) file.delete(); } catch { /* Already removed by OS cleanup. */ }
}

async function transcribeClip(clip: UnifiedChatVoiceClip, signal: AbortSignal, options: UnifiedChatVoiceOptions, startedAt = Date.now()): Promise<string> {
  assertVoiceActive(signal);
  const mark = (phase: string) => options.onPhase?.(phase, Date.now() - startedAt);
  const file = new File(clip.uri);
  if (!file.exists || file.size <= 0) throw new Error('The recording is no longer available. Record it again.');
  if (file.size > 8_000_000) throw new Error('That recording is too long.');
  // Encoding and credentials are independent; neither needs to hold up the other.
  const [audioBase64, tokenValue, installId] = await Promise.all([
    file.base64().then((value) => { mark('encoded'); return value; }),
    getAccessToken().then((value) => { mark('authenticated'); return value; }),
    getInstallId(),
  ]);
  assertVoiceActive(signal);
  const token = tokenValue?.trim();
  const apiKey = getSupabasePublishableKey()?.trim();
  if (!token || !apiKey) throw new Error('Sign in to use voice input.');
  const headers = new Headers({
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: apiKey,
    'x-kwilt-client': 'kwilt-mobile', 'x-kwilt-install-id': installId,
  });
  if (options.operationId) headers.set('x-kwilt-operation-id', options.operationId);
  const candidates = getEdgeFunctionUrlCandidates('unified-chat-transcribe');
  const fallback = getEdgeFunctionUrl('unified-chat-transcribe');
  let lastError = new Error('Voice input is unavailable.');
  const body = JSON.stringify({ audioBase64, mimeType: 'audio/m4a' });
  for (const url of candidates.length ? candidates : fallback ? [fallback] : []) {
    assertVoiceActive(signal);
    mark('request_started');
    const response = await fetch(url, { method: 'POST', headers, body, signal });
    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    assertVoiceActive(signal);
    mark('response_parsed');
    const transcript = typeof result?.transcript === 'string' ? result.transcript.trim() : '';
    if (response.ok && transcript) return transcript;
    const error = result?.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : null;
    lastError = new Error(typeof error?.message === 'string' ? error.message : 'Kwilt could not transcribe that recording.');
    // Only a missing deployment can select another route. A transport error may already have reached the provider.
    if (response.status !== 404) break;
  }
  throw lastError;
}

export function transcribeUnifiedChatVoiceClip(clip: UnifiedChatVoiceClip, options: UnifiedChatVoiceOptions = {}): Promise<string> {
  return withVoiceDeadline((signal) => transcribeClip(clip, signal, options), options.signal);
}

export async function stopAndTranscribeUnifiedChatVoice(options: UnifiedChatVoiceOptions = {}): Promise<string> {
  const current = recording;
  recording = null;
  stopMeteringUpdates();
  if (!current) throw new Error('No voice recording is active.');
  const initialUri = current.uri;
  let clip: UnifiedChatVoiceClip | null = null;
  let released = false;
  const release = () => { if (!released) { released = true; current.release(); } };
  const startedAt = Date.now();
  try {
    return await withVoiceDeadline(async (signal) => {
      try {
        await current.stop();
        if (current.uri) clip = { uri: current.uri };
      } finally { release(); }
      if (!clip) throw new Error('The recording could not be read.');
      options.onPhase?.('recording_stopped', Date.now() - startedAt);
      if (signal.aborted) { discardUnifiedChatVoiceClip(clip); assertVoiceActive(signal); }
      options.onClip?.(clip);
      try { void Promise.resolve(options.onRecordingStopped?.()).catch(() => undefined); } catch { /* Feedback is best effort. */ }
      return transcribeClip(clip, signal, options, startedAt);
    }, options.signal);
  } finally {
    release();
    if (!clip && initialUri) discardUnifiedChatVoiceClip({ uri: initialUri });
    if (clip && !options.onClip) discardUnifiedChatVoiceClip(clip);
  }
}

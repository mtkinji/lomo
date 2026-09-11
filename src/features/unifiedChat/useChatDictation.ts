import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  startUnifiedChatVoiceRecording, stopAndTranscribeUnifiedChatVoice,
  transcribeUnifiedChatVoiceClip, cancelUnifiedChatVoiceRecording, discardUnifiedChatVoiceClip,
  type UnifiedChatVoiceClip,
} from './unifiedChatVoice';
import type { UnifiedChatVoiceInsertion } from './unifiedChatTranscriptInsertion';
import { appendUnifiedChatVoiceLevel } from './unifiedChatVoiceMetering';

export type ChatDictationState = {
  kind: 'dictation'; state: 'idle' | 'connecting' | 'recording' | 'transcribing' | 'error';
  elapsedSeconds: number; levels: number[]; message?: string; canRetry?: boolean; outcome?: 'completed' | 'cancelled';
};
/** Old workbenches treat transcribing -> idle as Send completion; error clears that intent. */
export function toChatDictationWireState(next: ChatDictationState, previousState: string): ChatDictationState {
  return next.outcome === 'cancelled' && previousState === 'transcribing'
    ? { ...next, state: 'error', message: 'Recording cancelled.', canRetry: false }
    : next;
}
export function useChatDictation(options: {
  selectionKey: string;
  onState(state: ChatDictationState): void;
  onRecordingStarted?(): void;
  onRecordingStopped?(): void;
  onPhase?(phase: string, elapsedMs: number, operationId: string): void;
  onTranscript(text: string, insertion: UnifiedChatVoiceInsertion | null): void;
}) {
  const callbacks = useRef(options); callbacks.current = options;
  const selection = useRef(options.selectionKey); selection.current = options.selectionKey;
  const generation = useRef(0);
  const mounted = useRef(true);
  const state = useRef<ChatDictationState>({ kind: 'dictation', state: 'idle', elapsedSeconds: 0, levels: [] });
  const controller = useRef<AbortController | null>(null);
  const clip = useRef<UnifiedChatVoiceClip | null>(null);
  const insertion = useRef<UnifiedChatVoiceInsertion | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publish = useCallback((next: Partial<ChatDictationState>) => {
    state.current = { ...state.current, ...next, kind: 'dictation' };
    if (mounted.current) callbacks.current.onState(state.current);
  }, []);
  const clearTick = useCallback(() => { if (tick.current) clearInterval(tick.current); tick.current = null; }, []);
  const discard = useCallback(() => {
    if (expiry.current) clearTimeout(expiry.current); expiry.current = null;
    if (clip.current) discardUnifiedChatVoiceClip(clip.current); clip.current = null;
  }, []);
  const cancel = useCallback(() => {
    generation.current += 1; controller.current?.abort(); controller.current = null;
    clearTick(); discard(); insertion.current = null;
    void cancelUnifiedChatVoiceRecording();
    publish({ state: 'idle', elapsedSeconds: 0, levels: [], message: undefined, canRetry: false, outcome: 'cancelled' });
  }, [clearTick, discard, publish]);
  useEffect(() => {
    mounted.current = true;
    publish(state.current);
    return () => { mounted.current = false; cancel(); };
  }, [cancel, publish, options.selectionKey]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      // Preserve the OS microphone permission sheet. Actual backgrounding ends private capture/retry.
      if (next === 'background' && state.current.state !== 'idle') cancel();
    });
    return () => subscription.remove();
  }, [cancel]);
  const clock = useCallback(() => {
    clearTick(); const start = Date.now();
    tick.current = setInterval(() => publish({ elapsedSeconds: Math.floor((Date.now() - start) / 1000) }), 1000);
  }, [clearTick, publish]);
  const start = useCallback(async (at: UnifiedChatVoiceInsertion | null) => {
    if (state.current.state === 'connecting' || state.current.state === 'recording' || state.current.state === 'transcribing') return;
    discard(); insertion.current = at;
    const id = ++generation.current; const key = selection.current;
    const current = () => mounted.current && generation.current === id && selection.current === key;
    publish({ outcome: undefined, state: 'connecting', elapsedSeconds: 0, levels: [], message: 'Opening microphone…', canRetry: false });
    try {
      await startUnifiedChatVoiceRecording(level => {
        if (current() && state.current.state === 'recording') publish({ levels: appendUnifiedChatVoiceLevel(state.current.levels, level) });
      });
      if (!current()) return;
      publish({ state: 'recording', message: undefined }); clock();
      callbacks.current.onRecordingStarted?.();
    } catch (error) {
      if (current()) publish({ state: 'error', message: error instanceof Error ? error.message : 'Voice input failed.' });
    }
  }, [clock, discard, publish]);
  const transcribe = useCallback(async (retry: boolean) => {
    if (retry ? state.current.state !== 'error' || !clip.current : state.current.state !== 'recording') return;
    const id = ++generation.current; const key = selection.current;
    const current = () => mounted.current && generation.current === id && selection.current === key;
    const nextController = new AbortController(); controller.current = nextController;
    const startedAt = Date.now();
    const operationId = `dictation-${startedAt}-${id}`;
    publish({ state: 'transcribing', elapsedSeconds: 0, message: 'Transcribing…', canRetry: false }); clock();
    const request = {
      signal: nextController.signal,
      operationId,
      onRecordingStopped: () => { if (current()) callbacks.current.onRecordingStopped?.(); },
      onPhase: (phase: string, elapsedMs: number) => { if (current()) callbacks.current.onPhase?.(phase, elapsedMs, operationId); },
      onClip(recorded: UnifiedChatVoiceClip) {
        if (!current()) { discardUnifiedChatVoiceClip(recorded); return; }
        clip.current = recorded;
        expiry.current = setTimeout(() => {
          discard();
          if (state.current.state === 'error') publish({ canRetry: false, message: 'The recording expired. Record it again.' });
        }, 5 * 60_000);
      },
    };
    try {
      const text = await (retry ? transcribeUnifiedChatVoiceClip(clip.current!, request) : stopAndTranscribeUnifiedChatVoice(request));
      if (!current()) return;
      callbacks.current.onPhase?.('completed', Date.now() - startedAt, operationId);
      callbacks.current.onTranscript(text, insertion.current);
      discard(); insertion.current = null;
      publish({ state: 'idle', elapsedSeconds: 0, levels: [], message: undefined, canRetry: false, outcome: 'completed' });
    } catch (error) {
      if (current()) callbacks.current.onPhase?.('failed', Date.now() - startedAt, operationId);
      if (current()) publish({ state: 'error', elapsedSeconds: 0, levels: [], canRetry: Boolean(clip.current), message: error instanceof Error ? error.message : 'Voice input failed.' });
    } finally {
      if (current()) { clearTick(); controller.current = null; }
    }
  }, [clearTick, clock, discard, publish]);
  return { start, stop: useCallback(() => transcribe(false), [transcribe]), retry: useCallback(() => transcribe(true), [transcribe]), cancel };
}

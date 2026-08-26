export type LiveConversationProviderEvent =
  | { type: 'speech_started'; itemId: string }
  | { type: 'speech_stopped'; itemId: string }
  | { type: 'transcript_delta'; itemId: string; delta: string }
  | { type: 'transcript_final'; itemId: string; transcript: string }
  | { type: 'provider_error'; message: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseOpenAiRealtimeEvent(raw: string): LiveConversationProviderEvent | null {
  let value: Record<string, unknown> | null;
  try { value = record(JSON.parse(raw)); } catch { return null; }
  if (!value || typeof value.type !== 'string') return null;
  const itemId = typeof value.item_id === 'string' ? value.item_id : '';
  if (value.type === 'input_audio_buffer.speech_started' && itemId) return { type: 'speech_started', itemId };
  if (value.type === 'input_audio_buffer.speech_stopped' && itemId) return { type: 'speech_stopped', itemId };
  if (value.type === 'conversation.item.input_audio_transcription.delta' && itemId && typeof value.delta === 'string') {
    return { type: 'transcript_delta', itemId, delta: value.delta };
  }
  if (value.type === 'conversation.item.input_audio_transcription.completed' && itemId && typeof value.transcript === 'string') {
    const transcript = value.transcript.trim();
    return transcript ? { type: 'transcript_final', itemId, transcript } : null;
  }
  if (value.type === 'error') {
    const error = record(value.error);
    return { type: 'provider_error', message: typeof error?.message === 'string' ? error.message : 'Conversation interrupted.' };
  }
  return null;
}

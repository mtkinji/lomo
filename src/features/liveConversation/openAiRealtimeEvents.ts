export type LiveConversationProviderEvent =
  | { type: 'speech_started'; itemId: string }
  | { type: 'speech_stopped'; itemId: string }
  | { type: 'transcript_delta'; itemId: string; delta: string }
  | { type: 'transcript_final'; itemId: string; transcript: string }
  | { type: 'tool_call'; callId: string; name: string; argumentsJson: string }
  | { type: 'assistant_audio_started'; responseId: string }
  | { type: 'assistant_audio_stopped'; responseId: string }
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
  if (value.type === 'response.function_call_arguments.done') {
    const callId = typeof value.call_id === 'string' ? value.call_id.trim() : '';
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const argumentsJson = typeof value.arguments === 'string' ? value.arguments : '';
    return callId && name && argumentsJson
      ? { type: 'tool_call', callId, name, argumentsJson }
      : null;
  }
  if (value.type === 'response.done') {
    const response = record(value.response);
    const output = Array.isArray(response?.output) ? response.output : [];
    const functionCall = output.map(record).find((item) => item?.type === 'function_call');
    const callId = typeof functionCall?.call_id === 'string' ? functionCall.call_id.trim() : '';
    const name = typeof functionCall?.name === 'string' ? functionCall.name.trim() : '';
    const argumentsJson = typeof functionCall?.arguments === 'string' ? functionCall.arguments : '';
    return callId && name && argumentsJson
      ? { type: 'tool_call', callId, name, argumentsJson }
      : null;
  }
  if (value.type === 'output_audio_buffer.started' || value.type === 'output_audio_buffer.stopped') {
    const responseId = typeof value.response_id === 'string' ? value.response_id.trim() : '';
    if (!responseId) return null;
    return {
      type: value.type === 'output_audio_buffer.started'
        ? 'assistant_audio_started'
        : 'assistant_audio_stopped',
      responseId,
    };
  }
  if (value.type === 'error') {
    const error = record(value.error);
    return { type: 'provider_error', message: typeof error?.message === 'string' ? error.message : 'Conversation interrupted.' };
  }
  return null;
}

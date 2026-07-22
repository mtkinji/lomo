export const MAX_UNIFIED_CHAT_AUDIO_BYTES = 8_000_000;
export const MAX_UNIFIED_CHAT_BASE64_CHARS = 11_000_000;

export function parseUnifiedChatTranscriptionBody(body: unknown):
  | { ok: true; audioBase64: string; mimeType: 'audio/m4a' | 'audio/wav' }
  | { ok: false; code: 'invalid_audio' | 'audio_too_large' } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, code: 'invalid_audio' };
  const record = body as Record<string, unknown>;
  const audioBase64 = typeof record.audioBase64 === 'string' ? record.audioBase64.trim() : '';
  if (!audioBase64 || !/^[a-z0-9+/]+={0,2}$/i.test(audioBase64)) return { ok: false, code: 'invalid_audio' };
  if (audioBase64.length > MAX_UNIFIED_CHAT_BASE64_CHARS) return { ok: false, code: 'audio_too_large' };
  return { ok: true, audioBase64, mimeType: record.mimeType === 'audio/wav' ? 'audio/wav' : 'audio/m4a' };
}

export function sanitizeUnifiedChatTranscript(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 8000) : '';
}

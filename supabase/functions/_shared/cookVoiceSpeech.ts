export const MAX_COOK_VOICE_SPEECH_CHARS = 1200;

export function sanitizeCookVoiceSpeechText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCookVoiceSpeechBody(body: unknown):
  | { ok: true; text: string }
  | { ok: false; code: 'invalid_text' | 'text_too_long' } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'invalid_text' };
  }
  const text = sanitizeCookVoiceSpeechText((body as Record<string, unknown>).text);
  if (!text) return { ok: false, code: 'invalid_text' };
  if (text.length > MAX_COOK_VOICE_SPEECH_CHARS) {
    return { ok: false, code: 'text_too_long' };
  }
  return { ok: true, text };
}

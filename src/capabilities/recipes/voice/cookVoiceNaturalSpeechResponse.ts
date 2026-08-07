const MAX_NATURAL_SPEECH_BASE64_CHARS = 8_000_000;

export type CookVoiceSpeechAudio = {
  audioBase64: string;
  extension: '.mp3';
};

export function parseCookVoiceSpeechResponse(value: unknown): CookVoiceSpeechAudio | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const audioBase64 = typeof record.audioBase64 === 'string' ? record.audioBase64.trim() : '';
  if (
    record.mimeType !== 'audio/mpeg'
    || !audioBase64
    || audioBase64.length > MAX_NATURAL_SPEECH_BASE64_CHARS
    || !/^[a-z0-9+/]+={0,2}$/i.test(audioBase64)
  ) return null;
  return { audioBase64, extension: '.mp3' };
}

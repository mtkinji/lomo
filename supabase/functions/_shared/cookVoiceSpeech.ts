export const MAX_COOK_VOICE_SPEECH_CHARS = 1200;

export type CookVoiceSpeechStyleId = 'attentive_progress' | 'thoughtful_progress';

const SPEECH_STYLE_INSTRUCTIONS: Record<CookVoiceSpeechStyleId, string> = {
  attentive_progress:
    'Speak like a smart, warm coworker who has already started helping. Sound calm, attentive, and lightly conversational. Use a natural pace, minimal leading silence, and a relaxed downward finish. Do not sound like an announcer or customer-service script.',
  thoughtful_progress:
    'Speak thoughtfully like a smart, warm coworker working through a real question. Keep any opening hmm subtle and brief, not theatrical. Use a natural pace, minimal leading silence, and a relaxed downward finish.',
};

export function resolveCookVoiceSpeechConfig(model: string | undefined, voice: string | undefined) {
  return {
    model: model?.trim() || 'gpt-4o-mini-tts',
    voice: voice?.trim() || 'marin',
  };
}

export function sanitizeCookVoiceSpeechText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCookVoiceSpeechBody(body: unknown):
  | { ok: true; text: string; styleId?: CookVoiceSpeechStyleId }
  | { ok: false; code: 'invalid_text' | 'text_too_long' | 'invalid_style' } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'invalid_text' };
  }
  const text = sanitizeCookVoiceSpeechText((body as Record<string, unknown>).text);
  if (!text) return { ok: false, code: 'invalid_text' };
  if (text.length > MAX_COOK_VOICE_SPEECH_CHARS) {
    return { ok: false, code: 'text_too_long' };
  }
  const styleId = (body as Record<string, unknown>).styleId;
  if (styleId !== undefined && styleId !== 'attentive_progress' && styleId !== 'thoughtful_progress') {
    return { ok: false, code: 'invalid_style' };
  }
  return styleId ? { ok: true, text, styleId } : { ok: true, text };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCookVoiceSpeechMessageId(url: string): string | null {
  try {
    const value = new URL(url).searchParams.get('message_id')?.trim() ?? '';
    return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function buildCookVoiceSpeechProviderBody(
  text: string,
  config: { model: string; voice: string },
  styleId?: CookVoiceSpeechStyleId,
): {
  model: string;
  voice: string;
  input: string;
  response_format: 'mp3';
  speed: 1;
  instructions?: string;
} {
  return {
    model: config.model,
    voice: config.voice,
    input: text,
    response_format: 'mp3',
    speed: 1,
    ...(styleId ? { instructions: SPEECH_STYLE_INSTRUCTIONS[styleId] } : {}),
  };
}

export function cookVoiceSpeechStreamHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store',
  };
}

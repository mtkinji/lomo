import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildCookVoiceSpeechProviderBody,
  cookVoiceSpeechStreamHeaders,
  parseCookVoiceSpeechMessageId,
  parseCookVoiceSpeechBody,
  resolveCookVoiceSpeechConfig,
  sanitizeCookVoiceSpeechText,
} from '../cookVoiceSpeech.ts';

Deno.test('accepts a bounded spoken response and normalizes whitespace', () => {
  assertEquals(parseCookVoiceSpeechBody({ text: '  Ready\n when you are.  ' }), {
    ok: true,
    text: 'Ready when you are.',
  });
});

Deno.test('rejects missing and oversized spoken responses', () => {
  assertEquals(parseCookVoiceSpeechBody(null), { ok: false, code: 'invalid_text' });
  assertEquals(parseCookVoiceSpeechBody({ text: ' ' }), { ok: false, code: 'invalid_text' });
  assertEquals(parseCookVoiceSpeechBody({ text: 'a'.repeat(1201) }), {
    ok: false,
    code: 'text_too_long',
  });
});

Deno.test('removes control characters before sending text to speech', () => {
  assertEquals(sanitizeCookVoiceSpeechText('Next\u0000 step\t now'), 'Next step now');
});

Deno.test('uses a Marin-compatible model for the shared natural Kwilt voice', () => {
  assertEquals(resolveCookVoiceSpeechConfig(undefined, undefined), {
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
  });
  assertEquals(resolveCookVoiceSpeechConfig(' tts-1 ', ' cedar '), {
    model: 'tts-1',
    voice: 'cedar',
  });
});

Deno.test('accepts only strict message UUIDs for streamed speech', () => {
  assertEquals(parseCookVoiceSpeechMessageId(
    'https://example.test/cook-voice-speech?message_id=9b183337-2d1d-4ad9-8f48-507fd7d77906',
  ), '9b183337-2d1d-4ad9-8f48-507fd7d77906');
  assertEquals(parseCookVoiceSpeechMessageId(
    'https://example.test/cook-voice-speech?message_id=not-a-uuid',
  ), null);
});

Deno.test('builds a streamable provider request and no-store headers', () => {
  assertEquals(buildCookVoiceSpeechProviderBody('A short answer.', {
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
  }), {
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    input: 'A short answer.',
    response_format: 'mp3',
    speed: 1,
  });
  assertEquals(cookVoiceSpeechStreamHeaders('audio/mpeg'), {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'private, no-store',
  });
});

Deno.test('maps bounded progress styles to server-owned voice direction', () => {
  assertEquals(parseCookVoiceSpeechBody({
    text: 'Taking a closer look.',
    styleId: 'thoughtful_progress',
  }), {
    ok: true,
    text: 'Taking a closer look.',
    styleId: 'thoughtful_progress',
  });
  assertEquals(parseCookVoiceSpeechBody({ text: 'Nope', styleId: 'invented' }), {
    ok: false,
    code: 'invalid_style',
  });
  const body = buildCookVoiceSpeechProviderBody('Hmm. Let me think that through.', {
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
  }, 'thoughtful_progress');
  if (typeof body.instructions !== 'string' || !body.instructions.includes('not theatrical')) {
    throw new Error('thoughtful voice direction is missing');
  }
});

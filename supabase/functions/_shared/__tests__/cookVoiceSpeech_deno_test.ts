import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
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

Deno.test('uses Marin as the shared natural Kwilt voice', () => {
  assertEquals(resolveCookVoiceSpeechConfig(undefined, undefined), {
    model: 'tts-1-hd',
    voice: 'marin',
  });
  assertEquals(resolveCookVoiceSpeechConfig(' tts-1 ', ' cedar '), {
    model: 'tts-1',
    voice: 'cedar',
  });
});

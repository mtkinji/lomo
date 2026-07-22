import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  MAX_UNIFIED_CHAT_BASE64_CHARS,
  parseUnifiedChatTranscriptionBody,
  sanitizeUnifiedChatTranscript,
} from '../unifiedChatTranscription.ts';

Deno.test('accepts bounded m4a input and normalizes transcript whitespace', () => {
  assertEquals(parseUnifiedChatTranscriptionBody({ audioBase64: 'YWJj', mimeType: 'audio/m4a' }), {
    ok: true, audioBase64: 'YWJj', mimeType: 'audio/m4a',
  });
  assertEquals(sanitizeUnifiedChatTranscript('  hello\n  family  '), 'hello family');
});

Deno.test('rejects malformed and oversized audio before provider access', () => {
  assertEquals(parseUnifiedChatTranscriptionBody({ audioBase64: 'not base64!' }), { ok: false, code: 'invalid_audio' });
  assertEquals(parseUnifiedChatTranscriptionBody({ audioBase64: 'a'.repeat(MAX_UNIFIED_CHAT_BASE64_CHARS + 1) }), {
    ok: false, code: 'audio_too_large',
  });
});

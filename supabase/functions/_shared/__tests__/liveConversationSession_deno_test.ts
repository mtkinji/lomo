import {
  buildLiveConversationSafetyIdentifier,
  buildOpenAiLiveTranscriptionClientSecretRequest,
  extractEphemeralClientSecret,
  parseLiveConversationSessionRequest,
  summarizeOpenAiError,
} from '../liveConversationSession.ts';

Deno.test('live conversation request is bounded to Chat', () => {
  if (!parseLiveConversationSessionRequest({ channel: 'chat', locale: 'en-US' })) throw new Error('valid request rejected');
  if (parseLiveConversationSessionRequest({ channel: 'cook' })) throw new Error('unsupported channel accepted');
  if (parseLiveConversationSessionRequest({ channel: 'chat', locale: '../bad' })) throw new Error('invalid locale accepted');
});

Deno.test('OpenAI session uses dedicated live transcription so Chat remains authoritative', () => {
  const request = buildOpenAiLiveTranscriptionClientSecretRequest({ model: 'gpt-live-transcribe', locale: 'en-US' });
  if (request.session.type !== 'transcription') throw new Error('session can create competing responses');
  if (request.session.audio.input.transcription.model !== 'gpt-live-transcribe') throw new Error('expensive realtime model retained');
  const transcription = request.session.audio.input.transcription as Record<string, unknown>;
  if ((transcription.languages as string[] | undefined)?.[0] !== 'en') throw new Error('locale not normalized');
  if ('language' in transcription) throw new Error('unsupported singular language retained');
  if ('turn_detection' in request.session.audio.input) throw new Error('connection-only setting sent to client-secret endpoint');
});

Deno.test('ephemeral response exposes only the bounded client credential', () => {
  const secret = extractEphemeralClientSecret({ value: 'ek_test_123456789', expires_at: 123, session: { type: 'transcription' } });
  if (secret?.value !== 'ek_test_123456789' || secret.expiresAt !== 123) throw new Error('secret not extracted');
  if (extractEphemeralClientSecret({ value: 'short' })) throw new Error('short secret accepted');
});

Deno.test('safety identifier is stable and does not expose the user id', async () => {
  const first = await buildLiveConversationSafetyIdentifier('user-123', 'server-secret');
  const second = await buildLiveConversationSafetyIdentifier('user-123', 'server-secret');
  if (first !== second || first.includes('user-123')) throw new Error('unsafe identifier');
});

Deno.test('OpenAI failures are reduced to safe diagnostic fields', () => {
  const summary = summarizeOpenAiError({
    error: {
      code: 'invalid_value',
      type: 'invalid_request_error',
      param: 'session.audio.input.transcription.model',
      message: 'Sensitive provider detail',
    },
  });
  if (summary.code !== 'invalid_value') throw new Error('provider code omitted');
  if (summary.type !== 'invalid_request_error') throw new Error('provider type omitted');
  if (summary.param !== 'session.audio.input.transcription.model') throw new Error('provider parameter omitted');
  if ('message' in summary) throw new Error('provider message leaked');
});

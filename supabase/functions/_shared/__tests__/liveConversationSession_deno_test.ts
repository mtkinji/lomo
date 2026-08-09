import {
  buildLiveConversationSafetyIdentifier,
  buildOpenAiLiveTranscriptionClientSecretRequest,
  extractEphemeralClientSecret,
  parseLiveConversationSessionRequest,
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
  if (request.session.audio.input.transcription.language !== 'en') throw new Error('locale not normalized');
});

Deno.test('ephemeral response exposes only the bounded client credential', () => {
  const secret = extractEphemeralClientSecret({ client_secret: { value: 'ek_test_123456789', expires_at: 123 }, model: 'ignored' });
  if (secret?.value !== 'ek_test_123456789' || secret.expiresAt !== 123) throw new Error('secret not extracted');
  if (extractEphemeralClientSecret({ client_secret: { value: 'short' } })) throw new Error('short secret accepted');
});

Deno.test('safety identifier is stable and does not expose the user id', async () => {
  const first = await buildLiveConversationSafetyIdentifier('user-123', 'server-secret');
  const second = await buildLiveConversationSafetyIdentifier('user-123', 'server-secret');
  if (first !== second || first.includes('user-123')) throw new Error('unsafe identifier');
});

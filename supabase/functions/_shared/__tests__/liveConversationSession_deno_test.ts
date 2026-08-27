import {
  buildLiveConversationSafetyIdentifier,
  buildOpenAiLiveConversationClientSecretRequest,
  extractEphemeralClientSecret,
  parseLiveConversationSessionRequest,
  summarizeOpenAiError,
} from '../liveConversationSession.ts';

Deno.test('live conversation request is bounded to Chat', () => {
  if (!parseLiveConversationSessionRequest({ channel: 'chat', locale: 'en-US' })) throw new Error('valid request rejected');
  if (parseLiveConversationSessionRequest({ channel: 'cook' })) throw new Error('unsupported channel accepted');
  if (parseLiveConversationSessionRequest({ channel: 'chat', locale: '../bad' })) throw new Error('invalid locale accepted');
});

Deno.test('OpenAI Realtime session exposes one durable Kwilt tool', () => {
  const request = buildOpenAiLiveConversationClientSecretRequest({
    model: 'gpt-realtime-2.1', transcriptionModel: 'gpt-live-transcribe', locale: 'en-US',
  });
  if (request.session.type !== 'realtime') throw new Error('speech-to-speech session omitted');
  if (request.session.model !== 'gpt-realtime-2.1') throw new Error('routed realtime model changed');
  if (request.session.audio.input.transcription.model !== 'gpt-live-transcribe') throw new Error('transcription model changed');
  const transcription = request.session.audio.input.transcription as Record<string, unknown>;
  if ((transcription.languages as string[] | undefined)?.[0] !== 'en') throw new Error('locale not normalized');
  if ('language' in transcription) throw new Error('unsupported singular language retained');
  const turnDetection = request.session.audio.input.turn_detection as Record<string, unknown> | undefined;
  if (turnDetection?.type !== 'server_vad') throw new Error('reliable turn detection omitted from minted session');
  const tools = request.session.tools as Array<Record<string, unknown>>;
  if (tools.length !== 1 || tools[0].name !== 'kwilt.run') throw new Error('session tool boundary widened');
  if (request.session.tool_choice !== 'required') throw new Error('a user utterance may bypass durable Chat');
  const parameters = tools[0].parameters as Record<string, unknown>;
  const properties = parameters.properties as Record<string, unknown>;
  if (parameters.additionalProperties !== false) throw new Error('tool input is not strict');
  if (!properties.realtimeItemId || !properties.channelContextVersion) throw new Error('durable correlation fields omitted');
  if ('transcript' in properties) throw new Error('model-authored transcript accepted');
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

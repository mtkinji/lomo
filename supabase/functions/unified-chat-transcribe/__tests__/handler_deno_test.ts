import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleUnifiedChatTranscription } from '../handler.ts';
const request = () => new Request('https://test.local/transcribe', { method: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify({ audioBase64: 'YWJj', mimeType: 'audio/m4a' }) });
const deps = { authorize: async () => true, apiKey: 'test-provider-key', fetch: async () => new Response(JSON.stringify({ text: 'A clear thought' }), { status: 200 }) };
Deno.test('returns text only after authenticating the recording request', async () => {
  assertEquals((await (await handleUnifiedChatTranscription(request(), deps)).json()).transcript, 'A clear thought');
  let calls = 0;
  const response = await handleUnifiedChatTranscription(request(), { ...deps, authorize: async () => false, fetch: async () => { calls++; return new Response(); } });
  assertEquals(response.status, 401); assertEquals(calls, 0);
});
Deno.test('provider and auth stalls have a bounded timeout response', async () => {
  for (const part of ['fetch', 'authorize']) {
    const response = await handleUnifiedChatTranscription(request(), { ...deps, [part]: () => new Promise(() => {}), timeoutMs: 10 });
    assertEquals(response.status, 504);
    assertEquals((await response.json()).error.code, 'transcription_timeout');
  }
});
Deno.test('a thrown provider request is a structured error and silence is not success', async () => {
  const failed = await handleUnifiedChatTranscription(request(), { ...deps, fetch: async () => { throw new Error('network detail'); } });
  assertEquals(failed.status, 502);
  assertEquals((await failed.json()).error.code, 'transcription_failed');
  const silent = await handleUnifiedChatTranscription(request(), { ...deps, fetch: async () => new Response('{"text":" "}') });
  assertEquals(silent.status, 422);
});
Deno.test('rate limiting stays actionable without disclosing provider errors', async () => {
  const response = await handleUnifiedChatTranscription(request(), { ...deps, fetch: async () => new Response('{"error":"private details"}', { status: 429 }) });
  assertEquals(response.status, 429);
  assertEquals((await response.json()).error.code, 'rate_limited');
});

Deno.test('an already cancelled request never authenticates or calls the provider', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const response = await handleUnifiedChatTranscription(new Request(request(), { signal: controller.signal }), {
    ...deps, authorize: async () => { calls++; return true; },
  });
  assertEquals(response.status, 499); assertEquals(calls, 0);
});

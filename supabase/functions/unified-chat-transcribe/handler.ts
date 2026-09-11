import { MAX_UNIFIED_CHAT_AUDIO_BYTES, parseUnifiedChatTranscriptionBody, sanitizeUnifiedChatTranscript } from '../_shared/unifiedChatTranscription.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-kwilt-client, x-kwilt-install-id, x-kwilt-operation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const failure = (status: number, code: string, message: string) => json(status, { error: { code, message } });
type Dependencies = {
  authorize(token: string, signal: AbortSignal): Promise<boolean>;
  apiKey?: string;
  fetch: typeof fetch;
  timeoutMs?: number;
};

export async function handleUnifiedChatTranscription(req: Request, deps: Dependencies): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return failure(405, 'method_not_allowed', 'Method not allowed');
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1]?.trim();
  if (!token) return failure(401, 'unauthorized', 'Sign in to use voice input.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  req.signal.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, deps.timeoutMs ?? 15_000);
  const startedAt = performance.now();
  const check = () => { if (controller.signal.aborted) throw new Error('aborted'); };
  const work = async () => {
    check();
    if (!await deps.authorize(token, controller.signal)) return failure(401, 'unauthorized', 'Sign in to use voice input.');
    check();
    const authenticatedAt = performance.now();
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 12_000_000) return failure(413, 'audio_too_large', 'That recording is too long.');
    const parsed = parseUnifiedChatTranscriptionBody(await req.json().catch(() => null));
    check();
    if (!parsed.ok) return failure(parsed.code === 'audio_too_large' ? 413 : 400, parsed.code, 'The recording could not be read.');
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(parsed.audioBase64), character => character.charCodeAt(0)); }
    catch { return failure(400, 'invalid_audio', 'The recording could not be read.'); }
    if (!bytes.byteLength || bytes.byteLength > MAX_UNIFIED_CHAT_AUDIO_BYTES) return failure(413, 'audio_too_large', 'That recording is too long.');
    if (!deps.apiKey) return failure(503, 'provider_unavailable', 'Voice input is unavailable.');
    const buffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(buffer).set(bytes);
    const form = new FormData();
    form.set('file', new Blob([buffer], { type: parsed.mimeType }), parsed.mimeType === 'audio/wav' ? 'kwilt-voice.wav' : 'kwilt-voice.m4a');
    form.set('model', 'gpt-4o-mini-transcribe');
    form.set('response_format', 'json');
    const providerStartedAt = performance.now();
    const response = await deps.fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${deps.apiKey}` }, body: form, signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    check();
    if (!response.ok) return response.status === 429
      ? failure(429, 'rate_limited', 'Voice input is busy. Try again shortly.')
      : failure(502, 'transcription_failed', 'Kwilt could not transcribe that recording. Try again.');
    const transcript = sanitizeUnifiedChatTranscript(body?.text);
    if (!transcript) return failure(422, 'no_speech', 'No speech was detected. Try recording again.');
    return json(200, { transcript, operationId: (req.headers.get('x-kwilt-operation-id') ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128), timings: {
      authenticationMs: Math.round(authenticatedAt - startedAt),
      providerMs: Math.round(performance.now() - providerStartedAt),
      totalMs: Math.round(performance.now() - startedAt),
    } });
  };
  let abort!: () => void;
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(new Error('aborted'));
    controller.signal.addEventListener('abort', abort, { once: true });
  });
  try {
    if (req.signal.aborted) cancel();
    return await Promise.race([work(), aborted]);
  } catch {
    return timedOut
      ? failure(504, 'transcription_timeout', 'Transcription is taking too long. Try again.')
      : failure(controller.signal.aborted ? 499 : 502, 'transcription_failed', 'Kwilt could not transcribe that recording. Try again.');
  } finally {
    clearTimeout(timer);
    req.signal.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', abort);
  }
}

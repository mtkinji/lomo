import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  MAX_UNIFIED_CHAT_AUDIO_BYTES,
  parseUnifiedChatTranscriptionBody,
  sanitizeUnifiedChatTranscript,
} from '../_shared/unifiedChatTranscription.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-kwilt-client, x-kwilt-install-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1]?.trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const publishableKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))?.trim();
  if (!token || !supabaseUrl || !publishableKey) {
    return json(401, { error: { code: 'unauthorized', message: 'Sign in to use voice input.' } });
  }
  const supabase = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json(401, { error: { code: 'unauthorized', message: 'Sign in to use voice input.' } });

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 12_000_000) {
    return json(413, { error: { code: 'audio_too_large', message: 'That recording is too long.' } });
  }
  const parsed = parseUnifiedChatTranscriptionBody(await req.json().catch(() => null));
  if (!parsed.ok) {
    const status = parsed.code === 'audio_too_large' ? 413 : 400;
    return json(status, { error: { code: parsed.code, message: parsed.code === 'audio_too_large' ? 'That recording is too long.' : 'The recording could not be read.' } });
  }
  const bytes = decodeBase64(parsed.audioBase64);
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_UNIFIED_CHAT_AUDIO_BYTES) {
    return json(413, { error: { code: 'audio_too_large', message: 'That recording is too long.' } });
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!openAiKey) return json(503, { error: { code: 'provider_unavailable', message: 'Voice input is unavailable.' } });
  const form = new FormData();
  const audioBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(audioBuffer).set(bytes);
  form.set('file', new Blob([audioBuffer], { type: parsed.mimeType }), parsed.mimeType === 'audio/wav' ? 'kwilt-voice.wav' : 'kwilt-voice.m4a');
  form.set('model', 'gpt-4o-mini-transcribe');
  form.set('response_format', 'json');
  const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
  });
  const upstreamBody = await upstream.json().catch(() => null) as Record<string, unknown> | null;
  const transcript = sanitizeUnifiedChatTranscript(upstreamBody?.text);
  if (!upstream.ok || !transcript) {
    return json(upstream.ok ? 502 : upstream.status, {
      error: { code: 'transcription_failed', message: 'Kwilt could not transcribe that recording.' },
    });
  }
  return json(200, { transcript });
});

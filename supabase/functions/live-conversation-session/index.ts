import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildLiveConversationSafetyIdentifier,
  buildOpenAiLiveTranscriptionClientSecretRequest,
  extractEphemeralClientSecret,
  parseLiveConversationSessionRequest,
  summarizeOpenAiError,
} from '../_shared/liveConversationSession.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-kwilt-client, x-kwilt-install-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
  const length = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > 4096) return json(413, { error: { code: 'request_too_large', message: 'Request too large' } });

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1]?.trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const publishableKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))?.trim();
  if (!token || !supabaseUrl || !publishableKey) {
    return json(401, { error: { code: 'unauthorized', message: 'Sign in to start a conversation.' } });
  }
  const supabase = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json(401, { error: { code: 'unauthorized', message: 'Sign in to start a conversation.' } });

  const parsed = parseLiveConversationSessionRequest(await req.json().catch(() => null));
  if (!parsed) return json(400, { error: { code: 'invalid_request', message: 'The conversation could not be started.' } });
  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const safetySecret = Deno.env.get('LIVE_CONVERSATION_SAFETY_SECRET')?.trim() ?? openAiKey;
  if (!openAiKey || !safetySecret) return json(503, { error: { code: 'provider_unavailable', message: 'Conversation mode is unavailable.' } });

  const model = Deno.env.get('OPENAI_LIVE_TRANSCRIPTION_MODEL')?.trim() || 'gpt-live-transcribe';
  const safetyIdentifier = await buildLiveConversationSafetyIdentifier(data.user.id, safetySecret);
  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': safetyIdentifier,
    },
    body: JSON.stringify(buildOpenAiLiveTranscriptionClientSecretRequest({ model, locale: parsed.locale })),
  });
  const upstreamBody: unknown = await upstream.json().catch(() => null);
  const clientSecret = extractEphemeralClientSecret(upstreamBody);
  if (!upstream.ok || !clientSecret) {
    const diagnostic = summarizeOpenAiError(upstreamBody);
    console.error('OpenAI live transcription session rejected', {
      status: upstream.status,
      ...diagnostic,
    });
    return json(upstream.ok ? 502 : upstream.status, {
      error: {
        code: 'provider_unavailable',
        message: 'Conversation mode is unavailable.',
        diagnostic,
      },
    });
  }
  return json(200, { clientSecret: clientSecret.value, expiresAt: clientSecret.expiresAt, model });
});

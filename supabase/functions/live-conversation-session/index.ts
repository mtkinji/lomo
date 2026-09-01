import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildLiveConversationSafetyIdentifier,
  buildOpenAiLiveConversationClientSecretRequest,
  extractEphemeralClientSecret,
  parseLiveConversationSessionRequest,
  summarizeOpenAiError,
} from '../_shared/liveConversationSession.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { isServerMvpPreviewEnabled, reserveMvpPreviewUsage } from '../_shared/serverMvpPreviewAccess.ts';

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
  if (!isServerMvpPreviewEnabled(Deno.env.get('KWILT_LIVE_CONVERSATION_PREVIEW_ENABLED'))) {
    return json(503, { error: { code: 'preview_unavailable', message: 'Conversation mode is unavailable.' } });
  }

  const parsed = parseLiveConversationSessionRequest(await req.json().catch(() => null));
  if (!parsed) return json(400, { error: { code: 'invalid_request', message: 'The conversation could not be started.' } });
  const reservation = await reserveMvpPreviewUsage(createServiceClient(), {
    userId: data.user.id,
    capability: 'live_conversation',
    perMinute: 5,
    perUserDay: 5,
    globalDay: 100,
    leaseSeconds: 15 * 60,
  });
  if (!reservation.allowed) {
    return json(429, { error: { code: 'preview_limit_reached', message: 'Conversation mode has reached its preview limit.' } });
  }
  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const safetySecret = Deno.env.get('LIVE_CONVERSATION_SAFETY_SECRET')?.trim() ?? openAiKey;
  if (!openAiKey || !safetySecret) return json(503, { error: { code: 'provider_unavailable', message: 'Conversation mode is unavailable.' } });

  const model = 'gpt-realtime-2.1';
  const transcriptionModel = Deno.env.get('OPENAI_LIVE_TRANSCRIPTION_MODEL')?.trim() || 'gpt-live-transcribe';
  const safetyIdentifier = await buildLiveConversationSafetyIdentifier(data.user.id, safetySecret);
  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': safetyIdentifier,
    },
    body: JSON.stringify(buildOpenAiLiveConversationClientSecretRequest({
      model, transcriptionModel, locale: parsed.locale,
    })),
  });
  const upstreamBody: unknown = await upstream.json().catch(() => null);
  const clientSecret = extractEphemeralClientSecret(upstreamBody);
  if (!upstream.ok || !clientSecret) {
    const diagnostic = summarizeOpenAiError(upstreamBody);
    console.error('OpenAI live conversation session rejected', {
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
  console.info('[mvp-preview-usage]', { capability: 'live_conversation', outcome: 'session_minted', model });
  return json(200, { clientSecret: clientSecret.value, expiresAt: clientSecret.expiresAt, model });
});

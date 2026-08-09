import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseCookVoiceSpeechBody, resolveCookVoiceSpeechConfig } from '../_shared/cookVoiceSpeech.ts';

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
  if (req.method !== 'POST') {
    return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
  }

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1]?.trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const publishableKey = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))?.trim();
  if (!token || !supabaseUrl || !publishableKey) {
    return json(401, { error: { code: 'unauthorized', message: 'Sign in to use conversational voice.' } });
  }
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return json(401, { error: { code: 'unauthorized', message: 'Sign in to use conversational voice.' } });
  }

  const parsed = parseCookVoiceSpeechBody(await req.json().catch(() => null));
  if (!parsed.ok) {
    return json(parsed.code === 'text_too_long' ? 413 : 400, {
      error: { code: parsed.code, message: 'That response could not be spoken.' },
    });
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!openAiKey) {
    return json(503, { error: { code: 'provider_unavailable', message: 'Natural voice is unavailable.' } });
  }

  const { model, voice } = resolveCookVoiceSpeechConfig(
    Deno.env.get('OPENAI_COOK_VOICE_MODEL'),
    Deno.env.get('OPENAI_COOK_VOICE'),
  );
  const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: parsed.text,
      response_format: 'mp3',
      speed: 1,
    }),
  });
  if (!upstream.ok) {
    return json(upstream.status, {
      error: { code: 'speech_failed', message: 'Natural voice is unavailable.' },
    });
  }
  const audio = new Uint8Array(await upstream.arrayBuffer());
  if (!audio.byteLength) {
    return json(502, { error: { code: 'speech_failed', message: 'Natural voice is unavailable.' } });
  }
  return json(200, {
    audioBase64: encodeBase64(audio),
    mimeType: 'audio/mpeg',
  });
});

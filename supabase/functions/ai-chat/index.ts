// Kwilt AI proxy (Supabase Edge Function)
//
// Routes:
// - POST /v1/chat/completions
// - POST /v1/images/generations
//
// Called via:
//   https://<project-ref>.functions.supabase.co/functions/v1/ai-chat/v1/chat/completions
// or locally:
//   http://localhost:54321/functions/v1/ai-chat/v1/chat/completions

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-is-pro, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

function getUtcDayString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcMidnightIso(now: Date): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

function getDailyLimit(isPro: boolean): number {
  const raw = Deno.env.get(isPro ? 'KWILT_AI_DAILY_PRO_QUOTA' : 'KWILT_AI_DAILY_FREE_QUOTA');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  // Conservative defaults; tune via env.
  return isPro ? 200 : 20;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function recordRequest(params: {
  quotaKey: string;
  isPro: boolean;
  route: string;
  model?: string | null;
  status?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin.from('kwilt_ai_requests').insert({
      quota_key: params.quotaKey,
      is_pro: params.isPro,
      route: params.route,
      model: params.model ?? null,
      status: params.status ?? null,
      duration_ms: params.durationMs ?? null,
      error_code: params.errorCode ?? null,
    });
  } catch {
    // best-effort only
  }
}

async function incrementDailyUsage(params: { quotaKey: string; day: string }): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.rpc('kwilt_increment_ai_usage_daily', {
    p_quota_key: params.quotaKey,
    p_day: params.day,
  });
  if (error) return null;
  // Supabase RPC returns `data` as number for scalar returns.
  return typeof data === 'number' ? data : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const url = new URL(req.url);
  const fullPath = url.pathname;
  const marker = '/ai-chat';
  const idx = fullPath.indexOf(marker);
  const route = idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath;

  if (route !== '/v1/chat/completions' && route !== '/v1/images/generations') {
    return json(404, { error: { message: 'Not found', code: 'not_found' } });
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return json(503, {
      error: { message: 'AI provider unavailable', code: 'provider_unavailable' },
    });
  }

  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  if (!installId) {
    return json(400, {
      error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' },
    });
  }

  const isPro = (req.headers.get('x-kwilt-is-pro') ?? '').trim().toLowerCase() === 'true';
  const quotaKey = `install:${installId}`;

  const now = new Date();
  const day = getUtcDayString(now);
  const limit = getDailyLimit(isPro);

  const usageCount = await incrementDailyUsage({ quotaKey, day });
  if (usageCount == null) {
    // Fail closed to protect costs if quota DB is misconfigured.
    return json(503, {
      error: { message: 'AI proxy misconfigured (quota store)', code: 'provider_unavailable' },
    });
  }

  if (usageCount > limit) {
    const retryAt = nextUtcMidnightIso(now);
    await recordRequest({
      quotaKey,
      isPro,
      route,
      status: 429,
      durationMs: 0,
      errorCode: 'quota_exceeded',
    });
    return json(
      429,
      {
        error: {
          // Intentionally includes "quota" so existing client parsing treats it as quota exceeded.
          message: `Daily quota exceeded (limit=${limit}).`,
          code: 'quota_exceeded',
          retryAt,
        },
      },
      { 'Retry-After': retryAt }
    );
  }

  const contentType = req.headers.get('content-type') ?? 'application/json';
  const requestText = await req.text();

  let model: string | null = null;
  try {
    const parsed = JSON.parse(requestText);
    model = typeof parsed?.model === 'string' ? parsed.model : null;
  } catch {
    // ignore
  }

  const upstreamUrl = `https://api.openai.com${route}`;
  const startedAt = Date.now();

  const upstreamResp = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${openAiKey}`,
      Accept: 'application/json',
    },
    body: requestText,
  });

  const upstreamText = await upstreamResp.text();
  const durationMs = Date.now() - startedAt;

  // Best-effort telemetry (do not block response).
  void recordRequest({
    quotaKey,
    isPro,
    route,
    model,
    status: upstreamResp.status,
    durationMs,
    errorCode: upstreamResp.ok ? null : 'upstream_error',
  });

  return new Response(upstreamText, {
    status: upstreamResp.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstreamResp.headers.get('content-type') ?? 'application/json',
      // Pass through request id if OpenAI provides it.
      ...(upstreamResp.headers.get('x-request-id')
        ? { 'x-request-id': upstreamResp.headers.get('x-request-id')! }
        : {}),
    },
  });
});



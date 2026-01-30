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
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-is-pro, x-kwilt-client, x-kwilt-chat-mode, x-kwilt-workflow-step-id',
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

function getUtcMonthKey(now: Date): string {
  // YYYY-MM in UTC
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function nextUtcMidnightIso(now: Date): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

function nextUtcMonthIso(now: Date): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next.toISOString();
}

function nextUtcMinuteIso(now: Date): string {
  const next = new Date(now.getTime());
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(next.getUTCMinutes() + 1);
  return next.toISOString();
}

function getMonthlyActionsLimit(isPro: boolean): number {
  const raw = Deno.env.get(isPro ? 'KWILT_AI_MONTHLY_PRO_ACTIONS' : 'KWILT_AI_MONTHLY_FREE_ACTIONS');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  // Defaults match app posture: Free 50/mo, Pro 1000/mo.
  return isPro ? 1000 : 50;
}

function getRpmLimit(): number {
  const raw = Deno.env.get('KWILT_AI_RPM_LIMIT');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 50;
}

function getDailyRailLimit(isPro: boolean): number | null {
  // Optional safety rail to prevent single-day spikes even with monthly credits.
  const raw =
    Deno.env.get(isPro ? 'KWILT_AI_DAILY_PRO_QUOTA' : 'KWILT_AI_DAILY_FREE_QUOTA') ??
    Deno.env.get(isPro ? 'KWILT_AI_DAILY_PRO_ACTIONS' : 'KWILT_AI_DAILY_FREE_ACTIONS');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return null;
}

function getPreviewDailyRailLimit(isPro: boolean): number | null {
  // Optional: separate daily rail for "preview" requests (unmetered to the user, but costs Kwilt).
  // If unset, default to a conservative cap to prevent runaway background calls.
  const raw = Deno.env.get(isPro ? 'KWILT_AI_PREVIEW_DAILY_PRO_QUOTA' : 'KWILT_AI_PREVIEW_DAILY_FREE_QUOTA');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  // Defaults: Free 2/day, Pro 50/day (tunable).
  return isPro ? 50 : 2;
}

function getOnboardingActionsCap(): number {
  const raw = Deno.env.get('KWILT_AI_ONBOARDING_ACTIONS_CAP');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 12;
}

function getImageActionsCost(): number {
  const raw = Deno.env.get('KWILT_AI_IMAGE_ACTION_COST');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  // Image generation is priced differently than text; default to a higher action cost.
  return 10;
}

function getMaxRequestBytes(): number {
  const raw = Deno.env.get('KWILT_AI_MAX_REQUEST_BYTES');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 120_000;
}

function getMaxOutputTokens(route: string): number {
  // Clamp completion size to avoid runaway cost even when using "actions-only" quotas.
  const raw = Deno.env.get(route === '/v1/chat/completions' ? 'KWILT_AI_MAX_OUTPUT_TOKENS' : 'KWILT_AI_MAX_IMAGE_TOKENS');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return route === '/v1/chat/completions' ? 1200 : 0;
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
  actionsCost?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
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
      actions_cost: params.actionsCost ?? null,
      prompt_tokens: params.promptTokens ?? null,
      completion_tokens: params.completionTokens ?? null,
      total_tokens: params.totalTokens ?? null,
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

async function incrementMonthlyUsage(params: {
  quotaKey: string;
  month: string;
  actionsCost: number;
  tokensIncrement: number;
}): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.rpc('kwilt_increment_ai_usage_monthly', {
    p_quota_key: params.quotaKey,
    p_month: params.month,
    p_actions_cost: params.actionsCost,
    p_tokens_increment: params.tokensIncrement,
  });
  if (error) return null;
  return typeof data === 'number' ? data : null;
}

async function incrementMinutelyUsage(params: { quotaKey: string; minuteIso: string }): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.rpc('kwilt_increment_ai_usage_minutely', {
    p_quota_key: params.quotaKey,
    p_minute: params.minuteIso,
  });
  if (error) return null;
  return typeof data === 'number' ? data : null;
}

async function incrementOnboardingUsage(params: {
  quotaKey: string;
  actionsCost: number;
}): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.rpc('kwilt_increment_ai_usage_onboarding', {
    p_quota_key: params.quotaKey,
    p_actions_cost: params.actionsCost,
  });
  if (error) return null;
  return typeof data === 'number' ? data : null;
}

async function getMonthlyBonusActions(params: {
  quotaKey: string;
  month: string;
}): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  try {
    const { data, error } = await admin
      .from('kwilt_ai_bonus_monthly')
      .select('bonus_actions')
      .eq('quota_key', params.quotaKey)
      .eq('month', params.month)
      .maybeSingle();
    if (error) return 0;
    const raw = (data as { bonus_actions?: unknown } | null)?.bonus_actions;
    const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    return Math.max(0, n);
  } catch {
    return 0;
  }
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function validateRequestShape(route: string, parsed: any): { ok: true } | { ok: false; message: string } {
  // Token-counting is non-trivial server-side without a tokenizer; we instead bound size/shape.
  // This protects us from pathological payloads and accidental runaway context.
  if (!parsed || typeof parsed !== 'object') return { ok: false, message: 'Invalid JSON body' };

  if (route === '/v1/chat/completions') {
    const msgs = parsed.messages;
    if (!Array.isArray(msgs) || msgs.length < 1) return { ok: false, message: 'messages must be a non-empty array' };
    if (msgs.length > 40) return { ok: false, message: 'messages too long' };
    for (const m of msgs) {
      if (!m || typeof m !== 'object') return { ok: false, message: 'invalid message' };
      const role = m.role;
      if (typeof role !== 'string') return { ok: false, message: 'message.role must be a string' };
      const content = m.content;
      if (typeof content === 'string' && content.length > 20_000) {
        return { ok: false, message: 'message.content too large' };
      }
    }
    return { ok: true };
  }

  if (route === '/v1/images/generations') {
    // Minimal validation; clamp n later.
    return { ok: true };
  }

  if (route === '/v1/commit') {
    // Minimal shape: { actionsCost?: number }
    return { ok: true };
  }

  return { ok: true };
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

  const isUpstreamRoute = route === '/v1/chat/completions' || route === '/v1/images/generations';
  const isCommitRoute = route === '/v1/commit';
  if (!isUpstreamRoute && !isCommitRoute) {
    return json(404, { error: { message: 'Not found', code: 'not_found' } });
  }

  const openAiKey = isUpstreamRoute ? Deno.env.get('OPENAI_API_KEY') : null;
  if (isUpstreamRoute && !openAiKey) {
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
  const chatMode = (req.headers.get('x-kwilt-chat-mode') ?? '').trim();
  const isOnboarding = chatMode === 'firstTimeOnboarding';
  const isPreview = chatMode.startsWith('preview_');
  // Preview calls should not consume the user's monthly credits. We isolate them into a separate
  // quota bucket keyed by `preview:<installId>` so we can cap them independently.
  const quotaKey = isPreview ? `preview:${installId}` : `install:${installId}`;

  const now = new Date();
  const day = getUtcDayString(now);
  const month = getUtcMonthKey(now);
  const baseMonthlyLimit = getMonthlyActionsLimit(isPro);
  const bonusMonthlyLimit = isOnboarding ? 0 : await getMonthlyBonusActions({ quotaKey, month });
  const monthlyLimit = baseMonthlyLimit + bonusMonthlyLimit;
  const dailyRail = isPreview ? getPreviewDailyRailLimit(isPro) : getDailyRailLimit(isPro);
  const rpmLimit = getRpmLimit();
  const onboardingCap = getOnboardingActionsCap();

  // Basic payload size guardrails (prevents accidental huge context).
  const maxBytes = getMaxRequestBytes();
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return json(413, { error: { message: 'Request too large', code: 'bad_request' } });
  }

  const contentType = req.headers.get('content-type') ?? 'application/json';
  const requestText = await req.text();
  if (requestText.length > maxBytes) {
    return json(413, { error: { message: 'Request too large', code: 'bad_request' } });
  }

  let model: string | null = null;
  const parsedBody = safeJsonParse(requestText);
  if (!parsedBody) {
    return json(400, { error: { message: 'Invalid JSON body', code: 'bad_request' } });
  }
  model = typeof parsedBody?.model === 'string' ? parsedBody.model : null;

  const shape = validateRequestShape(route, parsedBody);
  if (!shape.ok) {
    return json(400, { error: { message: shape.message, code: 'bad_request' } });
  }

  // Enforce plan-based model access (route-aware).
  // - Chat: Pro can use GPT-5 tier; Free is clamped to a safe default.
  // - Images: allow the image model.
  if (typeof parsedBody?.model === 'string') {
    const requested = String(parsedBody.model).trim();
    if (route === '/v1/images/generations') {
      const allowed = new Set(['gpt-image-1']);
      if (!allowed.has(requested)) {
        const clamped = 'gpt-image-1';
        parsedBody.model = clamped;
        model = clamped;
      }
    } else if (route === '/v1/chat/completions') {
      const proAllowed = new Set(['gpt-4o-mini', 'gpt-4o', 'gpt-5.1', 'gpt-5.2']);
      const freeAllowed = new Set(['gpt-4o-mini', 'gpt-4o']);
      const allowed = isPro ? proAllowed : freeAllowed;
      if (!allowed.has(requested)) {
        const clamped = isPro ? 'gpt-5.2' : 'gpt-4o-mini';
        parsedBody.model = clamped;
        model = clamped;
      }
    }
  }

  // Determine action cost: 1 per chat completion call; higher for image generation.
  const actionsCost =
    route === '/v1/images/generations'
      ? getImageActionsCost()
      : route === '/v1/commit'
        ? Math.max(1, Math.min(Math.floor(Number(parsedBody?.actionsCost ?? 1)), getImageActionsCost()))
        : 1;

  // Per-minute request limiter (applies equally to Free + Pro).
  // This is independent of actionsCost and exists to stop runaway loops / abuse bursts.
  if (rpmLimit > 0) {
    const minuteIso = now.toISOString();
    const minuteCount = await incrementMinutelyUsage({ quotaKey, minuteIso });
    if (minuteCount == null) {
      return json(503, {
        error: { message: 'AI proxy misconfigured (rate limiter)', code: 'provider_unavailable' },
      });
    }
    if (minuteCount > rpmLimit) {
      const retryAt = nextUtcMinuteIso(now);
      await recordRequest({
        quotaKey,
        isPro,
        route,
        status: 429,
        durationMs: 0,
        errorCode: 'rate_limited',
        actionsCost,
      });
      return json(
        429,
        {
          error: {
            message: 'Rate limit exceeded. Please retry shortly.',
            code: 'rate_limited',
            retryAt,
          },
        },
        { 'Retry-After': retryAt }
      );
    }
  }

  // Daily usage tracking (always increment for analytics; enforce limit only if dailyRail is set).
  // Preview calls count against the preview-specific bucket (quotaKey already swapped).
  if (!isOnboarding) {
    const dailyCount = await incrementDailyUsage({ quotaKey, day });
    if (dailyCount == null) {
      // Don't fail hard if daily tracking fails when there's no daily limit
      if (dailyRail) {
        return json(503, {
          error: { message: 'AI proxy misconfigured (quota store)', code: 'provider_unavailable' },
        });
      }
      // else: best-effort tracking, continue without failing
    } else if (dailyRail && dailyCount > dailyRail) {
      const retryAt = nextUtcMidnightIso(now);
      await recordRequest({
        quotaKey,
        isPro,
        route,
        status: 429,
        durationMs: 0,
        errorCode: 'quota_exceeded',
        actionsCost,
      });
      return json(
        429,
        {
          error: {
            message: `Daily AI limit reached.`,
            code: 'quota_exceeded',
            retryAt,
          },
        },
        { 'Retry-After': retryAt }
      );
    }
  }

  if (isOnboarding) {
    // Onboarding allowance is shielded from daily/monthly quotas, but protected by fair-use limits.
    const onboardingCount = await incrementOnboardingUsage({ quotaKey, actionsCost });
    if (onboardingCount == null) {
      return json(503, {
        error: { message: 'AI proxy misconfigured (onboarding quota store)', code: 'provider_unavailable' },
      });
    }
    if (onboardingCap > 0 && onboardingCount > onboardingCap) {
      const retryAt = nextUtcMonthIso(now);
      await recordRequest({
        quotaKey,
        isPro,
        route,
        status: 429,
        durationMs: 0,
        errorCode: 'quota_exceeded',
        actionsCost,
      });
      return json(
        429,
        {
          error: {
            message: 'Onboarding AI limit reached.',
            code: 'quota_exceeded',
            retryAt,
          },
        },
        { 'Retry-After': retryAt }
      );
    }
  } else if (!isPreview) {
    // Monthly actions quota: increment now (fail closed to protect costs if quota DB is misconfigured).
    const monthlyCount = await incrementMonthlyUsage({
      quotaKey,
      month,
      actionsCost,
      tokensIncrement: 0,
    });
    if (monthlyCount == null) {
      return json(503, {
        error: { message: 'AI proxy misconfigured (quota store)', code: 'provider_unavailable' },
      });
    }
    if (monthlyCount > monthlyLimit) {
      const retryAt = nextUtcMonthIso(now);
      await recordRequest({
        quotaKey,
        isPro,
        route,
        status: 429,
        durationMs: 0,
        errorCode: 'quota_exceeded',
        actionsCost,
      });
      return json(
        429,
        {
          error: {
            // Intentionally includes "quota" so existing client parsing treats it as quota exceeded.
            message: `Monthly quota exceeded (limit=${monthlyLimit}).`,
            code: 'quota_exceeded',
            retryAt,
          },
        },
        { 'Retry-After': retryAt }
      );
    }
  }

  // Commit route: incremented quota above. No upstream OpenAI call needed.
  if (route === '/v1/commit') {
    void recordRequest({
      quotaKey,
      isPro,
      route,
      model: null,
      status: 200,
      durationMs: 0,
      errorCode: null,
      actionsCost,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
    return json(200, { ok: true, actionsCost });
  }

  // Clamp max_tokens for chat requests (safety even under actions-only quotas).
  if (route === '/v1/chat/completions') {
    const maxOut = getMaxOutputTokens(route);
    if (typeof parsedBody.max_tokens === 'number') {
      parsedBody.max_tokens = Math.min(parsedBody.max_tokens, maxOut);
    } else if (maxOut > 0) {
      parsedBody.max_tokens = maxOut;
    }
  }

  // Clamp image params (safety; also prevents unexpected per-request cost spikes).
  if (route === '/v1/images/generations') {
    if (typeof parsedBody.n === 'number') {
      parsedBody.n = Math.max(1, Math.min(Math.floor(parsedBody.n), 1));
    } else {
      parsedBody.n = 1;
    }
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
    body: JSON.stringify(parsedBody),
  });

  const upstreamText = await upstreamResp.text();
  const durationMs = Date.now() - startedAt;

  // Token telemetry (best-effort): for chat completions OpenAI returns `usage`.
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;
  if (route === '/v1/chat/completions') {
    const respJson = safeJsonParse(upstreamText);
    const usage = respJson?.usage;
    if (usage && typeof usage === 'object') {
      promptTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null;
      completionTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null;
      totalTokens = typeof usage.total_tokens === 'number' ? usage.total_tokens : null;
    }
  }

  // Update monthly token counter after successful calls (best-effort; failures shouldn't block response).
  if (upstreamResp.ok && totalTokens && totalTokens > 0) {
    void incrementMonthlyUsage({
      quotaKey,
      month,
      actionsCost: 0,
      tokensIncrement: totalTokens,
    });
  }

  // Best-effort telemetry (do not block response).
  void recordRequest({
    quotaKey,
    isPro,
    route,
    model,
    status: upstreamResp.status,
    durationMs,
    errorCode: upstreamResp.ok ? null : 'upstream_error',
    actionsCost,
    promptTokens,
    completionTokens,
    totalTokens,
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



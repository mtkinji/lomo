import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type ActivityRow = {
  id: string;
  data: {
    title?: unknown;
    createdAt?: unknown;
  } | null;
  created_at: string;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getSupabaseAnonKey(): string | null {
  return Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY') ?? null;
}

function normalizeTitle(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
}

function truncateText(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit);
}

function normalizeActivityId(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!/^activity-[A-Za-z0-9._:-]{1,120}$/.test(value)) return '';
  return value;
}

function buildActivityData(params: {
  id: string;
  title: string;
  nowIso: string;
}) {
  return {
    id: params.id,
    goalId: null,
    title: truncateText(params.title, 120),
    type: 'task',
    tags: [],
    notes: undefined,
    steps: [],
    reminderAt: null,
    priority: undefined,
    estimateMinutes: null,
    difficulty: undefined,
    creationSource: 'manual',
    planGroupId: null,
    scheduledDate: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    orderIndex: Date.now(),
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {},
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
    desktopSource: 'quick_capture',
  };
}

function toResponse(row: ActivityRow, duplicate: boolean) {
  return {
    ok: true,
    duplicate,
    activityId: row.id,
    title: typeof row.data?.title === 'string' ? row.data.title : null,
    createdAt:
      typeof row.data?.createdAt === 'string' ? row.data.createdAt : row.created_at,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { ok: false, error: 'missing_supabase_env' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { ok: false, error: 'missing_authorization' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json(401, { ok: false, error: 'invalid_user' });
  }

  const body = safeJsonParse(await req.text()) as Record<string, unknown> | null;
  const title = normalizeTitle(body?.title);
  const activityId = normalizeActivityId(body?.idempotencyKey);

  if (!activityId) {
    return json(400, { ok: false, error: 'missing_idempotency_key' });
  }

  if (!title) {
    return json(400, { ok: false, error: 'missing_title' });
  }

  if (title.length > 400) {
    return json(400, { ok: false, error: 'title_too_long' });
  }

  const selectColumns = 'id, data, created_at';
  const { data: existingActivity } = await supabase
    .from('kwilt_activities')
    .select(selectColumns)
    .eq('user_id', user.id)
    .eq('id', activityId)
    .maybeSingle();

  if (existingActivity) {
    return json(200, toResponse(existingActivity as ActivityRow, true));
  }

  const nowIso = new Date().toISOString();
  const activity = buildActivityData({
    id: activityId,
    title,
    nowIso,
  });

  const { data: createdActivity, error: createError } = await supabase
    .from('kwilt_activities')
    .insert({
      user_id: user.id,
      id: activity.id,
      data: activity,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(selectColumns)
    .single();

  if (createError) {
    const { data: racedActivity } = await supabase
      .from('kwilt_activities')
      .select(selectColumns)
      .eq('user_id', user.id)
      .eq('id', activityId)
      .maybeSingle();
    if (racedActivity) {
      return json(200, toResponse(racedActivity as ActivityRow, true));
    }
    return json(500, { ok: false, error: 'activity_insert_failed', detail: createError.message });
  }

  return json(200, toResponse(createdActivity as ActivityRow, false));
});

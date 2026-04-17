import { getSupabaseClient } from './backend/supabaseClient';
import { getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';

export type ChapterTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  kind: 'reflection' | 'report';
  cadence: 'weekly' | 'monthly' | 'yearly' | 'manual';
  timezone: string;
  enabled: boolean;
  email_enabled: boolean;
  email_recipient: string | null;
  detail_level: 'short' | 'medium' | 'deep' | null;
  tone: 'gentle' | 'direct' | 'playful' | 'neutral' | null;
  created_at: string;
  updated_at: string;
};

export type ChapterRow = {
  id: string;
  user_id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  period_key: string;
  input_summary: any;
  metrics: any;
  output_json: any | null;
  status: 'ready' | 'pending' | 'failed';
  error: string | null;
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChapterGenerationAction = 'generated' | 'skipped' | 'failed';
export type ChapterGenerationResult = {
  ok: boolean;
  action: ChapterGenerationAction;
  periodKey?: string;
  reason?: string;
  error?: string;
};

export async function fetchMyChapters(params: { limit?: number } = {}): Promise<ChapterRow[]> {
  const supabase = getSupabaseClient();
  const limit = typeof params.limit === 'number' ? Math.max(1, Math.min(Math.floor(params.limit), 100)) : 20;

  const { data, error } = await supabase
    .from('kwilt_chapters')
    .select('id,user_id,template_id,period_start,period_end,period_key,input_summary,metrics,output_json,status,error,emailed_at,created_at,updated_at')
    .order('period_start', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];
  return data as any;
}

export async function fetchMyChapterNeighbors(params: {
  chapterId: string;
  templateId: string;
  periodStart: string;
}): Promise<{ previous: { id: string; period_start: string } | null; next: { id: string; period_start: string } | null }> {
  const supabase = getSupabaseClient();
  const { chapterId, templateId, periodStart } = params;

  const [{ data: prev }, { data: next }] = await Promise.all([
    supabase
      .from('kwilt_chapters')
      .select('id,period_start')
      .eq('template_id', templateId)
      .lt('period_start', periodStart)
      .neq('id', chapterId)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('kwilt_chapters')
      .select('id,period_start')
      .eq('template_id', templateId)
      .gt('period_start', periodStart)
      .neq('id', chapterId)
      .order('period_start', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    previous: prev ? { id: String(prev.id), period_start: String(prev.period_start) } : null,
    next: next ? { id: String(next.id), period_start: String(next.period_start) } : null,
  };
}

export async function fetchMyChapterById(chapterId: string): Promise<ChapterRow | null> {
  const id = (chapterId ?? '').trim();
  if (!id) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_chapters')
    .select('id,user_id,template_id,period_start,period_end,period_key,input_summary,metrics,output_json,status,error,emailed_at,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export async function fetchMyChapterTemplates(params: { limit?: number } = {}): Promise<ChapterTemplateRow[]> {
  const supabase = getSupabaseClient();
  const limit = typeof params.limit === 'number' ? Math.max(1, Math.min(Math.floor(params.limit), 100)) : 20;

  const { data, error } = await supabase
    .from('kwilt_chapter_templates')
    .select(
      'id,user_id,name,kind,cadence,timezone,enabled,email_enabled,email_recipient,detail_level,tone,created_at,updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];
  return data as any;
}

function safeParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  try {
    const installId = await getInstallId();
    headers.set('x-kwilt-install-id', installId);
  } catch {
    // Best-effort; some server paths don't require it.
  }

  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) throw new Error('Missing access token (not signed in)');
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function createDefaultWeeklyReflectionTemplate(): Promise<ChapterTemplateRow | null> {
  return createDefaultReflectionTemplate('weekly', 'Weekly Reflection');
}

// Monthly / yearly / manual template factories were removed as part of Phase
// 2.1 of docs/chapters-plan.md. Chapters are now a single weekly
// rhythm generated server-side on a cron; user-initiated generation for other
// cadences is cut (not deferred). Monthly / yearly wrap-ups, if they return,
// will be deterministic rollups over the weekly corpus — not their own LLM
// templates — and will reintroduce their own helpers at that time.

async function createDefaultReflectionTemplate(
  cadence: 'weekly',
  name: string,
): Promise<ChapterTemplateRow | null> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const nowIso = new Date().toISOString();

  // Idempotent-ish: if a default already exists, return it.
  const { data: existing } = await supabase
    .from('kwilt_chapter_templates')
    .select('id,user_id,name,kind,cadence,timezone,enabled,email_enabled,email_recipient,detail_level,tone,created_at,updated_at')
    .eq('user_id', userId)
    .eq('cadence', cadence)
    .eq('kind', 'reflection')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (Array.isArray(existing) && existing[0]) return existing[0] as any;

  const { data, error } = await supabase
    .from('kwilt_chapter_templates')
    .insert({
      user_id: userId,
      name,
      kind: 'reflection',
      cadence,
      timezone: tz,
      filter_json: [],
      filter_group_logic: 'or',
      email_enabled: false,
      email_recipient: null,
      enabled: true,
      updated_at: nowIso,
    })
    .select('id,user_id,name,kind,cadence,timezone,enabled,email_enabled,email_recipient,detail_level,tone,created_at,updated_at')
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export type UpdateWeeklyDigestSettingsInput = {
  /** Controls whether the daily cron auto-generates weekly chapters for this user. */
  enabled?: boolean;
  /** Controls whether the digest email is sent after generation. */
  emailEnabled?: boolean;
  /** Recipient address for the digest email. Required the first time emailEnabled flips to true. */
  emailRecipient?: string | null;
};

export type WeeklyDigestSettings = {
  template: ChapterTemplateRow;
  enabled: boolean;
  emailEnabled: boolean;
  emailRecipient: string | null;
};

/**
 * Load (or lazily create) the user's default weekly reflection template, then
 * surface the settings the Digest Settings screen needs. Best-effort: returns
 * null when the user is signed out or the server is unreachable.
 */
export async function getWeeklyDigestSettings(): Promise<WeeklyDigestSettings | null> {
  const template = await createDefaultWeeklyReflectionTemplate();
  if (!template) return null;
  return {
    template,
    enabled: Boolean(template.enabled),
    emailEnabled: Boolean(template.email_enabled),
    emailRecipient: template.email_recipient ?? null,
  };
}

/**
 * Patch the weekly reflection template. Callers should pass only the fields
 * they want to change. Returns the refreshed settings on success, null on
 * failure (auth, row missing, server error).
 */
export async function updateWeeklyDigestSettings(
  input: UpdateWeeklyDigestSettingsInput,
): Promise<WeeklyDigestSettings | null> {
  const template = await createDefaultWeeklyReflectionTemplate();
  if (!template?.id) return null;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof input.enabled === 'boolean') patch.enabled = input.enabled;
  if (typeof input.emailEnabled === 'boolean') patch.email_enabled = input.emailEnabled;
  if (Object.prototype.hasOwnProperty.call(input, 'emailRecipient')) {
    patch.email_recipient = input.emailRecipient && input.emailRecipient.trim().length > 0
      ? input.emailRecipient.trim()
      : null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_chapter_templates')
    .update(patch)
    .eq('id', template.id)
    .select(
      'id,user_id,name,kind,cadence,timezone,enabled,email_enabled,email_recipient,detail_level,tone,created_at,updated_at',
    )
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ChapterTemplateRow;
  return {
    template: row,
    enabled: Boolean(row.enabled),
    emailEnabled: Boolean(row.email_enabled),
    emailRecipient: row.email_recipient ?? null,
  };
}

export type ChapterFeedbackRating = 'up' | 'down';

export type ChapterFeedbackRow = {
  id: string;
  user_id: string;
  chapter_id: string;
  rating: ChapterFeedbackRating;
  reason_tags: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMyChapterFeedback(chapterId: string): Promise<ChapterFeedbackRow | null> {
  const id = (chapterId ?? '').trim();
  if (!id) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_chapter_feedback')
    .select('id,user_id,chapter_id,rating,reason_tags,note,created_at,updated_at')
    .eq('chapter_id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ChapterFeedbackRow;
}

export async function submitChapterFeedback(params: {
  chapterId: string;
  rating: ChapterFeedbackRating;
  reasonTags?: string[];
  note?: string | null;
}): Promise<ChapterFeedbackRow | null> {
  const id = (params.chapterId ?? '').trim();
  if (!id) return null;

  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const payload = {
    user_id: userId,
    chapter_id: id,
    rating: params.rating,
    reason_tags: Array.isArray(params.reasonTags) ? params.reasonTags.slice(0, 5) : [],
    note: params.note && params.note.trim().length > 0 ? params.note.trim().slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('kwilt_chapter_feedback')
    .upsert(payload, { onConflict: 'user_id,chapter_id' })
    .select('id,user_id,chapter_id,rating,reason_tags,note,created_at,updated_at')
    .maybeSingle();

  if (error || !data) return null;
  return data as ChapterFeedbackRow;
}

/**
 * Invoke the `chapters-generate` edge function. Phase 2.1 of
 * docs/chapters-plan.md cut the user-facing call sites for this
 * helper — Chapters are now server-scheduled-only — but the helper itself
 * stays exported for internal ops tooling (e.g. re-running a failed week via
 * a debug surface). Do NOT wire this back into product UI without first
 * updating the plan.
 */
export async function triggerChapterGeneration(
  params: {
    templateId?: string | null;
    force?: boolean;
    periodOffset?: number;
    start?: string; // YYYY-MM-DD (template timezone)
    end?: string; // YYYY-MM-DD (exclusive end, template timezone)
  } = {},
): Promise<ChapterGenerationResult | null> {
  const base = getEdgeFunctionUrl('chapters-generate');
  if (!base) return null;

  const headers = await buildEdgeHeaders(true);
  const body: Record<string, unknown> = {};
  if (params.templateId) body.template_id = params.templateId;
  if (params.force === true) body.force = true;
  if (typeof params.start === 'string' && params.start.trim()) body.start = params.start.trim();
  if (typeof params.end === 'string' && params.end.trim()) body.end = params.end.trim();

  // Backward-compatible scheduled-period selection: only used when no manual range is provided.
  if (!body.start && !body.end && typeof params.periodOffset === 'number' && Number.isFinite(params.periodOffset)) {
    body.periodOffset = Math.max(0, Math.min(Math.floor(params.periodOffset), 260));
  }

  const res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) }).catch(() => null);
  if (!res) return null;

  const text = await res.text().catch(() => '');
  const json = safeParseJson(text);
  const results = Array.isArray(json?.results) ? json.results : [];
  const first = results[0] ?? null;

  // If the server processed the request but produced no results, the request
  // effectively did nothing (e.g. no matching template rows). We surface that
  // as a failure with a clear reason so the UI gives actionable feedback
  // instead of silently pretending a chapter was generated.
  if (res.ok && !first) {
    return {
      ok: false,
      action: 'failed',
      reason: 'no_templates',
      error: 'No matching chapter template (is it enabled?)',
    };
  }

  const action = typeof first?.action === 'string' ? (first.action as ChapterGenerationAction) : null;
  const periodKey = typeof first?.periodKey === 'string' ? first.periodKey : typeof first?.period_key === 'string' ? first.period_key : undefined;
  const reason = typeof first?.reason === 'string' ? first.reason : undefined;
  const error = typeof first?.error === 'string' ? first.error : !res.ok ? `Request failed (${res.status})` : undefined;

  return {
    ok: Boolean(res.ok && first?.ok !== false),
    action: action ?? (res.ok ? 'failed' : 'failed'),
    periodKey,
    reason,
    error,
  };
}



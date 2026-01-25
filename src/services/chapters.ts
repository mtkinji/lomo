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

export async function createDefaultMonthlyReflectionTemplate(): Promise<ChapterTemplateRow | null> {
  return createDefaultReflectionTemplate('monthly', 'Monthly Reflection');
}

export async function createDefaultYearlyReflectionTemplate(): Promise<ChapterTemplateRow | null> {
  return createDefaultReflectionTemplate('yearly', 'Yearly Reflection');
}

export async function createDefaultManualReflectionTemplate(): Promise<ChapterTemplateRow | null> {
  return createDefaultReflectionTemplate('manual', 'Custom Chapter');
}

async function createDefaultReflectionTemplate(
  cadence: 'weekly' | 'monthly' | 'yearly' | 'manual',
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
  const first = Array.isArray(json?.results) ? json.results[0] : null;
  const action = typeof first?.action === 'string' ? (first.action as ChapterGenerationAction) : null;
  const periodKey = typeof first?.periodKey === 'string' ? first.periodKey : typeof first?.period_key === 'string' ? first.period_key : undefined;
  const reason = typeof first?.reason === 'string' ? first.reason : undefined;
  const error = typeof first?.error === 'string' ? first.error : !res.ok ? `Request failed (${res.status})` : undefined;

  return {
    ok: Boolean(res.ok && first?.ok !== false),
    action: action ?? (res.ok ? 'generated' : 'failed'),
    periodKey,
    reason,
    error,
  };
}



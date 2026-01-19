import { getEdgeFunctionUrlCandidatesForHeaders, getEdgeFunctionUrlFromSupabaseUrl } from '../edgeFunctions';
import { getSupabaseUrl } from '../../utils/getEnv';
import { getSupabasePublishableKey } from '../../utils/getEnv';
import { getInstallId } from '../installId';
import { getAccessToken } from '../backend/auth';

export type CalendarProvider = 'google' | 'microsoft';

export type CalendarAccount = {
  id: string;
  provider: CalendarProvider;
  accountId: string;
  email: string | null;
  displayName: string | null;
  status: 'active' | 'revoked';
};

export type CalendarRef = {
  provider: CalendarProvider;
  accountId: string;
  calendarId: string;
};

export type CalendarListItem = CalendarRef & {
  name: string;
  /**
   * Google: alias the user has set (if any). When present, this is what Google UI shows.
   */
  aliasName?: string | null;
  /**
   * Google: the underlying calendar title (may differ from aliasName).
   */
  originalName?: string | null;
  color?: string | null;
  /**
   * True if the current user can write events to this calendar.
   * Derived server-side from provider-specific metadata.
   */
  canWrite?: boolean;
  /**
   * True if the calendar is shared/subscribed (i.e. not owned by the user) as best-effort.
   */
  shared?: boolean;
  /**
   * Best-effort owner hint (e.g. an email or display name) for shared calendars.
   */
  ownerHint?: string | null;
  /**
   * Google-only metadata
   */
  primary?: boolean | null;
  accessRole?: string | null;
  selected?: boolean | null;
  hidden?: boolean | null;
  /**
   * Microsoft-only metadata
   */
  isDefault?: boolean | null;
};

export type CalendarEventRef = CalendarRef & {
  eventId: string;
};

async function buildHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');
  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (!supabaseKey) {
    throw new Error('Missing Supabase publishable key');
  }
  headers.set('apikey', supabaseKey);
  try {
    const installId = await getInstallId();
    headers.set('x-kwilt-install-id', installId);
  } catch {
    // best-effort
  }
  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) throw new Error('Missing access token');
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function isCustomSupabaseDomain(): boolean {
  const raw = getSupabaseUrl()?.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const host = (u.hostname ?? '').toLowerCase();
    // Standard Supabase project URL is https://<project-ref>.supabase.co
    return !host.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

async function postJson<T>(fnName: string, body: Record<string, unknown>, requireAuth = true): Promise<T> {
  const headers = await buildHeaders(requireAuth);
  const candidatesRaw = getEdgeFunctionUrlCandidatesForHeaders(fnName, headers);
  const supabaseUrlCandidate = getEdgeFunctionUrlFromSupabaseUrl(fnName);
  // Branding + existing infra: if SUPABASE_URL is a custom domain (e.g. auth.kwilt.app) and it
  // proxies Edge Functions (we already know ai-chat works), prefer that host first.
  const candidates =
    isCustomSupabaseDomain() && supabaseUrlCandidate
      ? [supabaseUrlCandidate, ...candidatesRaw.filter((u) => u !== supabaseUrlCandidate)]
      : candidatesRaw;
  if (candidates.length === 0) throw new Error(`Missing edge function URL for ${fnName}`);

  let lastError: { status: number; message: string; url: string } | null = null;
  for (const url of candidates) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => '');
    const json = text ? JSON.parse(text) : null;
    if (res.ok) {
      return json as T;
    }
    const message = json?.error?.message || `Request failed (${res.status})`;
    lastError = { status: res.status, message, url };
    if (res.status !== 404) break;
  }

  const baseMsg = lastError?.message ?? 'Request failed';
  const detail = lastError?.url ? `\n${lastError.url}` : '';
  throw new Error(`${baseMsg}${detail}`);
}

export async function startCalendarConnect(provider: CalendarProvider): Promise<{ authUrl: string }> {
  if (provider === 'google') {
    return await postJson('calendar-auth-google', {}, true);
  }
  return await postJson('calendar-auth-microsoft', {}, true);
}

export async function listCalendarAccounts(): Promise<CalendarAccount[]> {
  const res = await postJson<{ accounts: CalendarAccount[] }>('calendar-api', { action: 'list_accounts' }, true);
  return res.accounts ?? [];
}

export async function disconnectCalendarAccount(params: { provider: CalendarProvider; accountId: string }) {
  await postJson('calendar-api', {
    action: 'disconnect_account',
    provider: params.provider,
    accountId: params.accountId,
  }, true);
}

export async function listCalendars(): Promise<CalendarListItem[]> {
  const res = await postJson<{ calendars: CalendarListItem[]; errors?: string[] }>(
    'calendar-api',
    { action: 'list_calendars' },
    true,
  );
  const errors = Array.isArray(res?.errors) ? res.errors : [];
  if (errors.length > 0) {
    throw new Error(errors[0] ?? 'Unable to list calendars');
  }
  return res.calendars ?? [];
}

export async function getCalendarPreferences(): Promise<{
  readCalendarRefs: CalendarRef[];
  writeCalendarRef: CalendarRef | null;
}> {
  return await postJson('calendar-api', { action: 'get_preferences' }, true);
}

export async function updateCalendarPreferences(params: {
  readCalendarRefs: CalendarRef[];
  writeCalendarRef: CalendarRef | null;
}) {
  await postJson('calendar-api', { action: 'update_preferences', ...params }, true);
}

export async function listBusyIntervals(params: { start: string; end: string; readCalendarRefs?: CalendarRef[] }) {
  return await postJson<{ intervals: Array<{ start: string; end: string }> }>(
    'calendar-api',
    { action: 'list_busy', ...params },
    true,
  );
}

export async function createCalendarEvent(params: {
  title: string;
  start: string;
  end: string;
  writeCalendarRef: CalendarRef;
}): Promise<{ eventRef: CalendarEventRef }> {
  return await postJson('calendar-api', { action: 'create_event', ...params }, true);
}

export async function updateCalendarEvent(params: {
  eventRef: CalendarEventRef;
  start: string;
  end: string;
}): Promise<{ ok: boolean }> {
  return await postJson('calendar-api', { action: 'update_event', ...params }, true);
}



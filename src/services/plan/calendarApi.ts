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

export type CalendarEvent = CalendarEventRef & {
  title: string | null;
  start: string;
  end: string;
  isAllDay?: boolean;
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
    // Some edge/CDN layers can return non-JSON bodies (HTML, empty, etc.) even when the
    // underlying side-effect succeeded. Treat JSON parsing as best-effort so we can
    // surface a stable error message and allow callers to apply verification strategies.
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (res.ok) {
      // If the body isn't valid JSON, fall back to an empty object. Callers should
      // defensively handle missing fields (e.g. create_event may still have succeeded).
      return (json ?? ({} as any)) as T;
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
  const { calendars } = await listCalendarsWithErrors();
  return calendars;
}

export async function listCalendarsWithErrors(): Promise<{ calendars: CalendarListItem[]; errors: string[] }> {
  const res = await postJson<{ calendars: CalendarListItem[]; errors?: string[] }>(
    'calendar-api',
    { action: 'list_calendars' },
    true,
  );
  return {
    calendars: res.calendars ?? [],
    errors: Array.isArray(res?.errors) ? res.errors : [],
  };
}

export async function getCalendarPreferences(): Promise<{
  readCalendarRefs: CalendarRef[];
  writeCalendarRef: CalendarRef | null;
}> {
  return await postJson('calendar-api', { action: 'get_preferences' }, true);
}

/**
 * Best-effort initializer:
 * - If the user has never configured calendar prefs, auto-select sensible defaults so
 *   Plan can show "what's already on the calendar" without extra setup.
 * - We ONLY run this when both read + write are missing, so we won't override intentional choices.
 */
export async function getOrInitCalendarPreferences(): Promise<{
  readCalendarRefs: CalendarRef[];
  writeCalendarRef: CalendarRef | null;
}> {
  const prefs = await getCalendarPreferences();
  const existingRead = Array.isArray(prefs.readCalendarRefs) ? prefs.readCalendarRefs : [];
  const existingWrite = prefs.writeCalendarRef ?? null;
  const needsRead = existingRead.length === 0;
  const needsWrite = !existingWrite;
  // If the user already configured both, never override.
  if (!needsRead && !needsWrite) return { readCalendarRefs: existingRead, writeCalendarRef: existingWrite };

  // No prefs saved yet; infer defaults from the provider calendar lists.
  let calendars: CalendarListItem[] = [];
  try {
    const res = await listCalendarsWithErrors();
    calendars = Array.isArray(res.calendars) ? res.calendars : [];
  } catch {
    // If we can't list calendars, fall back to empty prefs.
    return prefs;
  }

  if (calendars.length === 0) return { readCalendarRefs: existingRead, writeCalendarRef: existingWrite };

  const byAccount = new Map<string, CalendarListItem[]>();
  for (const c of calendars) {
    const key = `${c.provider}:${c.accountId}`;
    byAccount.set(key, [...(byAccount.get(key) ?? []), c]);
  }

  const inferredReadCalendarRefs: CalendarRef[] = [];
  let inferredWriteCalendarRef: CalendarRef | null = null;

  for (const [key, itemsRaw] of byAccount.entries()) {
    const items = (itemsRaw ?? []).filter((c) => !c.hidden);
    if (items.length === 0) continue;
    const [provider, accountId] = key.split(':');
    if ((provider !== 'google' && provider !== 'microsoft') || !accountId) continue;

    const primary =
      provider === 'google'
        ? items.find((c) => c.primary)
        : items.find((c) => c.isDefault);

    const selected = provider === 'google' ? items.filter((c) => c.selected) : [];

    const picked = [
      ...(primary ? [primary] : []),
      ...selected,
      // Fallback: at least one calendar per connected account.
      ...(primary || selected.length > 0 ? [] : [items[0]]),
    ]
      // Deduplicate
      .filter((c, idx, arr) => arr.findIndex((x) => x.calendarId === c.calendarId) === idx)
      // Cap per account (avoid selecting dozens of shared calendars by default)
      .slice(0, 6);

    for (const c of picked) {
      inferredReadCalendarRefs.push({ provider: c.provider, accountId: c.accountId, calendarId: c.calendarId });
    }

    // Default write calendar: prefer primary/default if writable, else any writable.
    if (!inferredWriteCalendarRef) {
      const writable = items.filter((c) => c.canWrite !== false);
      const preferredWritable =
        (primary && primary.canWrite !== false ? primary : null) ?? writable[0] ?? null;
      if (preferredWritable) {
        inferredWriteCalendarRef = {
          provider: preferredWritable.provider,
          accountId: preferredWritable.accountId,
          calendarId: preferredWritable.calendarId,
        };
      }
    }
  }

  const readCalendarRefs = needsRead ? inferredReadCalendarRefs : existingRead;
  const writeCalendarRef = needsWrite ? inferredWriteCalendarRef : existingWrite;

  if (readCalendarRefs.length === 0 && !writeCalendarRef) {
    return { readCalendarRefs: existingRead, writeCalendarRef: existingWrite };
  }

  try {
    await updateCalendarPreferences({
      readCalendarRefs,
      writeCalendarRef,
    });
  } catch {
    // If saving fails, still return inferred values so the UI can proceed.
  }

  return { readCalendarRefs, writeCalendarRef };
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

export async function listCalendarEvents(params: {
  start: string;
  end: string;
  readCalendarRefs?: CalendarRef[];
}): Promise<{ events: CalendarEvent[]; errors?: string[] }> {
  return await postJson<{ events: CalendarEvent[]; errors?: string[] }>(
    'calendar-api',
    { action: 'list_events', ...params },
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



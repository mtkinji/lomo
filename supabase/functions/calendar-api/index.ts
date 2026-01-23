import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  corsHeaders,
  decryptToken,
  encryptToken,
  getSupabaseAdmin,
  json,
  requireUserId,
  type EncryptedToken,
} from '../_shared/calendarUtils.ts';

type Provider = 'google' | 'microsoft';

type AccountRow = {
  id: string;
  provider: Provider;
  provider_account_id: string;
  email: string | null;
  display_name: string | null;
  status: string;
  token: {
    token_payload: {
      access: EncryptedToken;
      refresh: EncryptedToken | null;
      tokenType: string | null;
      scope: string | null;
    } | null;
    expires_at: string | null;
  } | null;
};

type CalendarRef = {
  provider: Provider;
  accountId: string;
  calendarId: string;
};

function inferGoogleOwnerHint(calendarId: string): string | null {
  const raw = (calendarId ?? '').trim();
  if (!raw) return null;
  // Many Google shared/subscribed calendars use an email-like ID
  // (e.g. someone@gmail.com) or a group address ending in
  // `@group.calendar.google.com`. When present, this is the best
  // "owner" hint we can show without extra API calls.
  if (raw.includes('@')) return raw;
  return null;
}

function getEnv(name: string): string | null {
  const raw = Deno.env.get(name);
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRefs(raw: any): CalendarRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => ({
      provider: r?.provider === 'google' || r?.provider === 'microsoft' ? r.provider : null,
      accountId: typeof r?.accountId === 'string' ? r.accountId : null,
      calendarId: typeof r?.calendarId === 'string' ? r.calendarId : null,
    }))
    .filter((r): r is CalendarRef => Boolean(r.provider && r.accountId && r.calendarId));
}

async function loadAccounts(admin: any, userId: string): Promise<AccountRow[]> {
  const { data } = await admin
    .from('kwilt_calendar_accounts')
    .select(
      'id,provider,provider_account_id,email,display_name,status,kwilt_calendar_tokens(token_payload,expires_at)',
    )
    .eq('user_id', userId);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    provider: row.provider,
    provider_account_id: row.provider_account_id,
    email: row.email ?? null,
    display_name: row.display_name ?? null,
    status: row.status ?? 'active',
    token: row.kwilt_calendar_tokens ?? null,
  }));
}

async function refreshGoogleToken(params: {
  refreshToken: string;
}): Promise<{ accessToken: string; expiresAt: string | null; refreshToken?: string | null }> {
  const clientId = getEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CALENDAR_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('google_oauth_not_configured');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error('google_refresh_failed');
  }
  const expiresIn = Number(json.expires_in ?? 0);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  return {
    accessToken: String(json.access_token),
    expiresAt,
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
  };
}

async function refreshMicrosoftToken(params: {
  refreshToken: string;
}): Promise<{ accessToken: string; expiresAt: string | null; refreshToken?: string | null }> {
  const clientId = getEnv('MICROSOFT_CLIENT_ID') ?? getEnv('MICROSOFT_CALENDAR_CLIENT_ID');
  const clientSecret = getEnv('MICROSOFT_CLIENT_SECRET') ?? getEnv('MICROSOFT_CALENDAR_CLIENT_SECRET');
  const tenant = getEnv('MICROSOFT_TENANT') ?? 'common';
  if (!clientId || !clientSecret) {
    throw new Error('microsoft_oauth_not_configured');
  }
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
      scope: [
        'offline_access',
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Calendars.ReadWrite',
      ].join(' '),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error('microsoft_refresh_failed');
  }
  const expiresIn = Number(json.expires_in ?? 0);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  return {
    accessToken: String(json.access_token),
    expiresAt,
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
  };
}

async function getAccessToken(params: {
  admin: any;
  account: AccountRow;
  tokenSecret: string;
}): Promise<string | null> {
  const { admin, account, tokenSecret } = params;
  const tokenPayload = account.token?.token_payload ?? null;
  const expiresAt = account.token?.expires_at ?? null;
  if (!tokenPayload?.access) return null;

  const accessToken = await decryptToken(tokenSecret, tokenPayload.access);
  if (!accessToken) return null;

  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const isExpired = expiresAtMs > 0 && expiresAtMs < Date.now() + 60_000;
  if (!isExpired) return accessToken;

  const refreshEncrypted = tokenPayload.refresh;
  if (!refreshEncrypted) return accessToken;
  const refreshToken = await decryptToken(tokenSecret, refreshEncrypted);
  if (!refreshToken) return accessToken;

  let refreshed: { accessToken: string; expiresAt: string | null; refreshToken?: string | null };
  if (account.provider === 'google') {
    refreshed = await refreshGoogleToken({ refreshToken });
  } else {
    refreshed = await refreshMicrosoftToken({ refreshToken });
  }

  const updatedPayload = {
    ...tokenPayload,
    access: await encryptToken(tokenSecret, refreshed.accessToken),
    refresh: refreshed.refreshToken
      ? await encryptToken(tokenSecret, refreshed.refreshToken)
      : tokenPayload.refresh,
  };

  await admin.from('kwilt_calendar_tokens').upsert(
    {
      account_id: account.id,
      token_payload: updatedPayload,
      expires_at: refreshed.expiresAt,
      updated_at: nowIso(),
    },
    { onConflict: 'account_id' },
  );

  return refreshed.accessToken;
}

async function listGoogleCalendars(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.status || `HTTP ${res.status}`;
    throw new Error(`google_calendar_list_failed:${msg}`);
  }
  const items = Array.isArray(json?.items) ? json.items : [];
  return items.map((c: any) => ({
    calendarId: c.id,
    // Prefer the user's alias (Google UI uses this), otherwise fall back to the calendar's title.
    name: c.summaryOverride ?? c.summary ?? c.id,
    originalName: c.summary ?? c.id,
    aliasName: typeof c.summaryOverride === 'string' ? c.summaryOverride : null,
    color: c.backgroundColor ?? null,
    primary: Boolean(c.primary),
    accessRole: typeof c.accessRole === 'string' ? c.accessRole : null,
    selected: typeof c.selected === 'boolean' ? c.selected : null,
    hidden: typeof c.hidden === 'boolean' ? c.hidden : null,
  }));
}

async function listMicrosoftCalendars(accessToken: string) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.code || `HTTP ${res.status}`;
    throw new Error(`microsoft_calendar_list_failed:${msg}`);
  }
  const items = Array.isArray(json?.value) ? json.value : [];
  return items.map((c: any) => ({
    calendarId: c.id,
    name: c.name ?? c.id,
    color: c.color ?? null,
    isDefault: typeof c.isDefaultCalendar === 'boolean' ? c.isDefaultCalendar : null,
    canEdit: typeof c.canEdit === 'boolean' ? c.canEdit : null,
    ownerName: typeof c?.owner?.name === 'string' ? c.owner.name : null,
    ownerAddress: typeof c?.owner?.address === 'string' ? c.owner.address : null,
  }));
}

async function listGoogleEvents(params: {
  accessToken: string;
  calendarId: string;
  start: string;
  end: string;
}): Promise<Array<{ eventId: string; title: string | null; start: string; end: string; isAllDay: boolean }>> {
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events`;
  let pageToken: string | null = null;
  const out: Array<{ eventId: string; title: string | null; start: string; end: string; isAllDay: boolean }> = [];

  // Pagination matters for some large/very busy calendars; also protects us from partial results.
  // Keep response light-ish; we only need `summary`, `start`, `end`.
  const fields = 'items(id,summary,start,end),nextPageToken';

  for (let i = 0; i < 6; i++) {
    const url = new URL(baseUrl);
    url.searchParams.set('timeMin', params.start);
    url.searchParams.set('timeMax', params.end);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('showDeleted', 'false');
    url.searchParams.set('maxResults', '2500');
    url.searchParams.set('fields', fields);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${params.accessToken}` } });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || json?.error?.status || `HTTP ${res.status}`;
      throw new Error(`google_events_list_failed:${msg}`);
    }

    const items = Array.isArray(json?.items) ? json.items : [];
    for (const e of items) {
      const start = e?.start?.dateTime ?? e?.start?.date ?? null;
      const end = e?.end?.dateTime ?? e?.end?.date ?? null;
      const isAllDay = Boolean(e?.start?.date && !e?.start?.dateTime);
      const eventId = typeof e?.id === 'string' ? e.id : '';
      if (!eventId || typeof start !== 'string' || typeof end !== 'string' || !start || !end) continue;
      out.push({
        eventId,
        title: typeof e?.summary === 'string' ? e.summary : null,
        start,
        end,
        isAllDay,
      });
    }

    pageToken = typeof json?.nextPageToken === 'string' && json.nextPageToken ? String(json.nextPageToken) : null;
    if (!pageToken) break;
  }

  return out;
}

async function listMicrosoftEvents(params: {
  accessToken: string;
  calendarId: string;
  start: string;
  end: string;
}): Promise<Array<{ eventId: string; title: string | null; start: string; end: string; isAllDay: boolean }>> {
  const viewUrl = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(params.calendarId)}/calendarView`,
  );
  viewUrl.searchParams.set('startDateTime', params.start);
  viewUrl.searchParams.set('endDateTime', params.end);
  // Limit payload; we only need these fields.
  viewUrl.searchParams.set('$select', 'id,subject,start,end,isAllDay');

  const res = await fetch(viewUrl.toString(), { headers: { Authorization: `Bearer ${params.accessToken}` } });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.error?.code || `HTTP ${res.status}`;
    throw new Error(`microsoft_events_list_failed:${msg}`);
  }
  const items = Array.isArray(json?.value) ? json.value : [];
  return items
    .map((e: any) => {
      const startAt = e?.start?.dateTime ?? null;
      const endAt = e?.end?.dateTime ?? null;
      return {
        eventId: typeof e?.id === 'string' ? e.id : '',
        title: typeof e?.subject === 'string' ? e.subject : null,
        start: typeof startAt === 'string' ? startAt : '',
        end: typeof endAt === 'string' ? endAt : '',
        isAllDay: Boolean(e?.isAllDay),
      };
    })
    .filter((e) => Boolean(e.eventId && e.start && e.end));
}

function mergeIntervals(intervals: Array<{ start: string; end: string }>) {
  const sorted = [...intervals].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const merged: Array<{ start: string; end: string }> = [];
  for (const it of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(it);
      continue;
    }
    if (new Date(it.start) <= new Date(last.end)) {
      const endMs = Math.max(new Date(last.end).getTime(), new Date(it.end).getTime());
      last.end = new Date(endMs).toISOString();
    } else {
      merged.push(it);
    }
  }
  return merged;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Calendar service unavailable', code: 'provider_unavailable' } });
  }

  const userId = await requireUserId(req);
  if (!userId) {
    return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
  }

  const tokenSecret = getEnv('CALENDAR_TOKEN_SECRET');
  if (!tokenSecret) {
    return json(500, { error: { message: 'Token secret missing', code: 'server_error' } });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'list_accounts') {
    const accounts = await loadAccounts(admin, userId);
    return json(200, {
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        accountId: a.provider_account_id,
        email: a.email,
        displayName: a.display_name,
        status: a.status,
      })),
    });
  }

  if (action === 'disconnect_account') {
    const provider = body?.provider === 'google' || body?.provider === 'microsoft' ? body.provider : null;
    const accountId = typeof body?.accountId === 'string' ? body.accountId : null;
    if (!provider || !accountId) {
      return json(400, { error: { message: 'Invalid account', code: 'bad_request' } });
    }
    await admin
      .from('kwilt_calendar_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('provider_account_id', accountId);
    return json(200, { ok: true });
  }

  if (action === 'get_preferences') {
    const { data } = await admin
      .from('kwilt_calendar_preferences')
      .select('read_calendar_refs,write_calendar_ref')
      .eq('user_id', userId)
      .single();
    return json(200, {
      readCalendarRefs: data?.read_calendar_refs ?? [],
      writeCalendarRef: data?.write_calendar_ref ?? null,
    });
  }

  if (action === 'update_preferences') {
    const readCalendarRefs = normalizeRefs(body?.readCalendarRefs);
    const writeRef = normalizeRefs(body?.writeCalendarRef ? [body.writeCalendarRef] : [])[0] ?? null;
    await admin.from('kwilt_calendar_preferences').upsert(
      {
        user_id: userId,
        read_calendar_refs: readCalendarRefs,
        write_calendar_ref: writeRef,
        updated_at: nowIso(),
      },
      { onConflict: 'user_id' },
    );
    return json(200, { ok: true });
  }

  const accounts = await loadAccounts(admin, userId);

  if (action === 'list_calendars') {
    const calendars: Array<{
      provider: Provider;
      accountId: string;
      calendarId: string;
      name: string;
      aliasName?: string | null;
      originalName?: string | null;
      color: string | null;
      canWrite: boolean;
      shared?: boolean;
      ownerHint?: string | null;
      primary?: boolean | null;
      accessRole?: string | null;
      selected?: boolean | null;
      hidden?: boolean | null;
      isDefault?: boolean | null;
    }> = [];
    const errors: string[] = [];
    for (const account of accounts) {
      try {
        const token = await getAccessToken({ admin, account, tokenSecret });
        if (!token) {
          errors.push(`${account.provider}:token_unavailable`);
          continue;
        }
        if (account.provider === 'google') {
          const items = await listGoogleCalendars(token);
          for (const cal of items) {
            const accessRole = cal.accessRole ?? null;
            const canWrite = accessRole === 'owner' || accessRole === 'writer';
            const shared = Boolean(accessRole && accessRole !== 'owner');
            const ownerHint = shared ? inferGoogleOwnerHint(cal.calendarId) : null;
            calendars.push({
              provider: 'google',
              accountId: account.provider_account_id,
              calendarId: cal.calendarId,
              name: cal.name,
              aliasName: cal.aliasName ?? null,
              originalName: cal.originalName ?? null,
              color: cal.color,
              canWrite,
              shared,
              ownerHint,
              primary: cal.primary ?? null,
              accessRole,
              selected: cal.selected ?? null,
              hidden: cal.hidden ?? null,
            });
          }
        } else {
          const items = await listMicrosoftCalendars(token);
          for (const cal of items) {
            const canWrite = cal.canEdit === true;
            const ownerHint =
              (typeof cal.ownerAddress === 'string' && cal.ownerAddress.trim().length > 0
                ? cal.ownerAddress.trim()
                : null) ??
              (typeof cal.ownerName === 'string' && cal.ownerName.trim().length > 0 ? cal.ownerName.trim() : null);
            const shared = Boolean(ownerHint);
            calendars.push({
              provider: 'microsoft',
              accountId: account.provider_account_id,
              calendarId: cal.calendarId,
              name: cal.name,
              color: cal.color,
              canWrite,
              isDefault: cal.isDefault ?? null,
              shared,
              ownerHint,
            });
          }
        }
      } catch (err: any) {
        const msg = typeof err?.message === 'string' ? err.message : 'unknown_error';
        errors.push(`${account.provider}:${msg}`);
      }
    }
    return json(200, { calendars, errors });
  }

  if (action === 'list_busy') {
    const start = typeof body?.start === 'string' ? body.start : null;
    const end = typeof body?.end === 'string' ? body.end : null;
    if (!start || !end) {
      return json(400, { error: { message: 'Missing date range', code: 'bad_request' } });
    }
    const inputRefs = normalizeRefs(body?.readCalendarRefs);
    const { data: prefData } = await admin
      .from('kwilt_calendar_preferences')
      .select('read_calendar_refs')
      .eq('user_id', userId)
      .single();
    const refs = inputRefs.length > 0 ? inputRefs : normalizeRefs(prefData?.read_calendar_refs);

    const intervals: Array<{ start: string; end: string }> = [];
    for (const account of accounts) {
      const token = await getAccessToken({ admin, account, tokenSecret });
      if (!token) continue;
      const accountRefs = refs.filter(
        (r) => r.provider === account.provider && r.accountId === account.provider_account_id,
      );
      if (accountRefs.length === 0) continue;

      if (account.provider === 'google') {
        const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin: start,
            timeMax: end,
            items: accountRefs.map((r) => ({ id: r.calendarId })),
          }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.calendars) {
          for (const calId of Object.keys(json.calendars)) {
            const busy = Array.isArray(json.calendars[calId]?.busy) ? json.calendars[calId].busy : [];
            for (const b of busy) {
              if (b?.start && b?.end) intervals.push({ start: b.start, end: b.end });
            }
          }
        }
      } else {
        for (const ref of accountRefs) {
          const viewUrl = new URL(
            `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(
              ref.calendarId,
            )}/calendarView`,
          );
          viewUrl.searchParams.set('startDateTime', start);
          viewUrl.searchParams.set('endDateTime', end);
          const res = await fetch(viewUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) continue;
          const items = Array.isArray(json?.value) ? json.value : [];
          for (const e of items) {
            const startAt = e?.start?.dateTime;
            const endAt = e?.end?.dateTime;
            if (startAt && endAt) intervals.push({ start: startAt, end: endAt });
          }
        }
      }
    }

    return json(200, { intervals: mergeIntervals(intervals) });
  }

  if (action === 'list_events') {
    const start = typeof body?.start === 'string' ? body.start : null;
    const end = typeof body?.end === 'string' ? body.end : null;
    if (!start || !end) {
      return json(400, { error: { message: 'Missing date range', code: 'bad_request' } });
    }
    const inputRefs = normalizeRefs(body?.readCalendarRefs);
    const { data: prefData } = await admin
      .from('kwilt_calendar_preferences')
      .select('read_calendar_refs')
      .eq('user_id', userId)
      .single();
    const refs = inputRefs.length > 0 ? inputRefs : normalizeRefs(prefData?.read_calendar_refs);

    const events: Array<{
      provider: Provider;
      accountId: string;
      calendarId: string;
      eventId: string;
      title: string | null;
      start: string;
      end: string;
      isAllDay: boolean;
    }> = [];
    const errors: string[] = [];

    for (const account of accounts) {
      const token = await getAccessToken({ admin, account, tokenSecret });
      if (!token) continue;
      const accountRefs = refs.filter(
        (r) => r.provider === account.provider && r.accountId === account.provider_account_id,
      );
      if (accountRefs.length === 0) continue;

      // IMPORTANT: never let a single broken/stale calendar ref wipe out the rest.
      if (account.provider === 'google') {
        for (const ref of accountRefs) {
          try {
            const items = await listGoogleEvents({ accessToken: token, calendarId: ref.calendarId, start, end });
            for (const e of items) {
              events.push({
                provider: 'google',
                accountId: ref.accountId,
                calendarId: ref.calendarId,
                eventId: e.eventId,
                title: e.title,
                start: e.start,
                end: e.end,
                isAllDay: e.isAllDay,
              });
            }
          } catch (err: any) {
            const msg = typeof err?.message === 'string' ? err.message : 'google_events_list_failed';
            errors.push(`google:${ref.accountId}:${ref.calendarId}:${msg}`);
            continue;
          }
        }
      } else {
        for (const ref of accountRefs) {
          try {
            const items = await listMicrosoftEvents({ accessToken: token, calendarId: ref.calendarId, start, end });
            for (const e of items) {
              events.push({
                provider: 'microsoft',
                accountId: ref.accountId,
                calendarId: ref.calendarId,
                eventId: e.eventId,
                title: e.title,
                start: e.start,
                end: e.end,
                isAllDay: e.isAllDay,
              });
            }
          } catch (err: any) {
            const msg = typeof err?.message === 'string' ? err.message : 'microsoft_events_list_failed';
            errors.push(`microsoft:${ref.accountId}:${ref.calendarId}:${msg}`);
            continue;
          }
        }
      }
    }

    return json(200, { events, errors });
  }

  if (action === 'create_event') {
    const ref = normalizeRefs(body?.writeCalendarRef ? [body.writeCalendarRef] : [])[0] ?? null;
    const title = typeof body?.title === 'string' ? body.title : null;
    const start = typeof body?.start === 'string' ? body.start : null;
    const end = typeof body?.end === 'string' ? body.end : null;
    if (!ref || !title || !start || !end) {
      return json(400, { error: { message: 'Missing event fields', code: 'bad_request' } });
    }
    const account = accounts.find(
      (a) => a.provider === ref.provider && a.provider_account_id === ref.accountId,
    );
    if (!account) {
      return json(400, { error: { message: 'Account not found', code: 'bad_request' } });
    }
    const token = await getAccessToken({ admin, account, tokenSecret });
    if (!token) {
      return json(401, { error: { message: 'Account token unavailable', code: 'unauthorized' } });
    }

    if (ref.provider === 'google') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(ref.calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
            extendedProperties: { private: { kwilt: 'plan' } },
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.id) {
        return json(500, { error: { message: 'Failed to create event', code: 'server_error' } });
      }
      return json(200, {
        eventRef: {
          provider: ref.provider,
          accountId: ref.accountId,
          calendarId: ref.calendarId,
          eventId: json.id,
        },
      });
    }

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${ref.calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: title,
        start: { dateTime: start, timeZone: 'UTC' },
        end: { dateTime: end, timeZone: 'UTC' },
        body: { contentType: 'text', content: 'Created by Kwilt Plan' },
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.id) {
      return json(500, { error: { message: 'Failed to create event', code: 'server_error' } });
    }
    return json(200, {
      eventRef: {
        provider: ref.provider,
        accountId: ref.accountId,
        calendarId: ref.calendarId,
        eventId: json.id,
      },
    });
  }

  if (action === 'update_event') {
    const ref = body?.eventRef;
    const provider = ref?.provider === 'google' || ref?.provider === 'microsoft' ? ref.provider : null;
    const accountId = typeof ref?.accountId === 'string' ? ref.accountId : null;
    const calendarId = typeof ref?.calendarId === 'string' ? ref.calendarId : null;
    const eventId = typeof ref?.eventId === 'string' ? ref.eventId : null;
    const start = typeof body?.start === 'string' ? body.start : null;
    const end = typeof body?.end === 'string' ? body.end : null;
    if (!provider || !accountId || !calendarId || !eventId || !start || !end) {
      return json(400, { error: { message: 'Missing event fields', code: 'bad_request' } });
    }
    const account = accounts.find(
      (a) => a.provider === provider && a.provider_account_id === accountId,
    );
    if (!account) {
      return json(400, { error: { message: 'Account not found', code: 'bad_request' } });
    }
    const token = await getAccessToken({ admin, account, tokenSecret });
    if (!token) {
      return json(401, { error: { message: 'Account token unavailable', code: 'unauthorized' } });
    }

    if (provider === 'google') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
          eventId,
        )}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start: { dateTime: start },
            end: { dateTime: end },
          }),
        },
      );
      if (!res.ok) {
        return json(500, { error: { message: 'Failed to update event', code: 'server_error' } });
      }
      return json(200, { ok: true });
    }

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: { dateTime: start, timeZone: 'UTC' },
        end: { dateTime: end, timeZone: 'UTC' },
      }),
    });
    if (!res.ok) {
      return json(500, { error: { message: 'Failed to update event', code: 'server_error' } });
    }
    return json(200, { ok: true });
  }

  return json(400, { error: { message: 'Unknown action', code: 'bad_request' } });
});



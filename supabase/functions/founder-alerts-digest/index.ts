// Daily founder activation/retention Slack digest.
//
// Intended usage:
// - Schedule daily via Supabase Cron (GET).
// - Optional manual backfill: GET/POST ?date=YYYY-MM-DD.
//
// Env:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - KWILT_FOUNDER_ALERTS_ENABLED=1
// - KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL
// - Optional KWILT_FOUNDER_ALERTS_CRON_SECRET. When set, callers must send
//   Authorization: Bearer <secret>. When unset, callers must send
//   x-kwilt-cron: daily or x-kwilt-cron: manual.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  FOUNDER_ALERT_EVENT_NAMES,
  buildFounderDigestSlackMessage,
  isFounderAlertsEnabled,
  type FounderAlertDigestRow,
  type FounderAlertEventName,
} from '../_shared/founderAlerts.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-cron',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function envGet(key: string): string | undefined {
  return Deno.env.get(key) ?? undefined;
}

function getSupabaseAdmin() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

function requireCronSecret(req: Request): boolean {
  const expected = (Deno.env.get('KWILT_FOUNDER_ALERTS_CRON_SECRET') ?? '').trim();
  if (!expected) return true;
  return getBearerToken(req) === expected;
}

function requireCronMarker(req: Request): boolean {
  const expected = (Deno.env.get('KWILT_FOUNDER_ALERTS_CRON_SECRET') ?? '').trim();
  if (expected) return true;
  const marker = (req.headers.get('x-kwilt-cron') ?? '').trim().toLowerCase();
  return marker === 'daily' || marker === 'manual';
}

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveDigestDate(req: Request): string {
  const url = new URL(req.url);
  const requested = (url.searchParams.get('date') ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(requested)) return requested;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return dateKeyUtc(d);
}

function addOneDay(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateKeyUtc(d);
}

function initialCounts(): Record<FounderAlertEventName, number> {
  return Object.fromEntries(FOUNDER_ALERT_EVENT_NAMES.map((name) => [name, 0])) as Record<FounderAlertEventName, number>;
}

function isFounderAlertEventName(value: string): value is FounderAlertEventName {
  return (FOUNDER_ALERT_EVENT_NAMES as readonly string[]).includes(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  if (!requireCronSecret(req)) {
    return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
  }
  if (!requireCronMarker(req)) {
    return json(401, { error: { message: 'Missing cron marker', code: 'unauthorized' } });
  }

  if (!isFounderAlertsEnabled(envGet)) {
    return json(200, { ok: true, skipped: true, reason: 'disabled' });
  }

  const slackUrl = (Deno.env.get('KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL') ?? '').trim();
  if (!slackUrl) {
    return json(200, { ok: true, skipped: true, reason: 'missing_slack_webhook_url' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Supabase not configured', code: 'provider_unavailable' } });
  }

  const dateLabel = resolveDigestDate(req);
  const startIso = `${dateLabel}T00:00:00.000Z`;
  const endIso = `${addOneDay(dateLabel)}T00:00:00.000Z`;

  const { data, error } = await admin
    .from('kwilt_founder_alert_events')
    .select('event_name,subject_id,occurred_at,properties')
    .gte('occurred_at', startIso)
    .lt('occurred_at', endIso)
    .order('occurred_at', { ascending: false });

  if (error) {
    return json(503, { error: { message: 'Unable to load founder alert events', code: 'provider_unavailable' } });
  }

  const rows = Array.isArray(data) ? (data as FounderAlertDigestRow[]) : [];
  const counts = initialCounts();
  for (const row of rows) {
    if (isFounderAlertEventName(row.event_name)) {
      counts[row.event_name] += 1;
    }
  }

  const watchList = rows.filter(
    (row) => row.event_name === 'subscription_billing_issue' || row.event_name === 'subscription_cancelled',
  );

  const message = buildFounderDigestSlackMessage({ dateLabel, counts, watchList });
  const res = await fetch(slackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  }).catch(() => null);

  if (!res) {
    return json(200, { ok: false, reason: 'slack_network_error', date: dateLabel });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return json(200, {
      ok: false,
      reason: 'slack_error',
      status: res.status,
      body: body.slice(0, 240),
      date: dateLabel,
    });
  }

  return json(200, {
    ok: true,
    date: dateLabel,
    counts,
    watchListCount: watchList.length,
  });
});

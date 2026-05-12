/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type PromptRow = {
  id: string;
  user_id: string;
  phone_link_id: string;
  activity_id: string | null;
  person_id: string | null;
  memory_item_id: string | null;
  event_id: string | null;
  cadence_id: string | null;
  prompt_kind: string;
  body: string;
};

type LinkRow = {
  id: string;
  phone_e164: string;
  status: string;
  opted_out_at: string | null;
  permissions: Record<string, boolean>;
  prompt_cap_per_day: number;
  quiet_hours: Record<string, unknown>;
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireCronSecret(req: Request): boolean {
  const expected = (Deno.env.get('PHONE_AGENT_CRON_SECRET') ?? '').trim();
  const auth = (req.headers.get('authorization') ?? '').trim();
  const match = /^bearer\s+(.+)$/i.exec(auth);
  return Boolean(expected && match?.[1] === expected);
}

async function sendSms(to: string, body: string): Promise<{ ok: true; sid: string | null } | { ok: false }> {
  const accountSid = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
  const token = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
  const from = (Deno.env.get('TWILIO_FROM_NUMBER') ?? '').trim();
  if (!accountSid || !token || !from) return { ok: false };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', from);
  form.set('Body', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  }).catch(() => null);

  if (!res?.ok) return { ok: false };
  const text = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(text) as { sid?: unknown };
    return { ok: true, sid: typeof parsed.sid === 'string' ? parsed.sid : null };
  } catch {
    return { ok: true, sid: null };
  }
}

function minutesForHHmm(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function isWithinQuietHours(quietHours: Record<string, unknown>, now = new Date()): boolean {
  if (quietHours.enabled !== true) return false;
  const start = minutesForHHmm(quietHours.start ?? quietHours.startsAt ?? '22:00') ?? 22 * 60;
  const end = minutesForHHmm(quietHours.end ?? quietHours.endsAt ?? '08:00') ?? 8 * 60;
  const current = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  if (!requireCronSecret(req)) {
    return json(401, { ok: false, error: 'unauthorized' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(500, { ok: false, error: 'missing_supabase_env' });
  }

  const nowIso = new Date().toISOString();
  const { data: prompts, error } = await admin
    .from('kwilt_phone_agent_prompts')
    .select('id, user_id, phone_link_id, activity_id, person_id, memory_item_id, event_id, cadence_id, prompt_kind, body')
    .in('state', ['pending', 'snoozed'])
    .lte('due_at', nowIso)
    .order('due_at', { ascending: true })
    .limit(50);

  if (error) {
    return json(500, { ok: false, error: 'prompt_query_failed' });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const prompt of (prompts ?? []) as PromptRow[]) {
    const { data: link } = await admin
      .from('kwilt_phone_agent_links')
      .select('id, phone_e164, status, opted_out_at, permissions, prompt_cap_per_day, quiet_hours')
      .eq('id', prompt.phone_link_id)
      .maybeSingle();
    const linkRow = link as LinkRow | null;

    if (!linkRow || linkRow.status !== 'verified' || linkRow.opted_out_at || linkRow.permissions?.send_followups !== true) {
      skipped += 1;
      await admin
        .from('kwilt_phone_agent_prompts')
        .update({ state: 'cancelled', closed_at: nowIso, updated_at: nowIso })
        .eq('id', prompt.id);
      continue;
    }

    if (isWithinQuietHours(linkRow.quiet_hours ?? {}, new Date(nowIso))) {
      skipped += 1;
      continue;
    }

    if (linkRow.prompt_cap_per_day <= 0) {
      skipped += 1;
      continue;
    }

    const dayStart = new Date(nowIso);
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await admin
      .from('kwilt_phone_agent_action_log')
      .select('id', { count: 'exact', head: true })
      .eq('phone_link_id', linkRow.id)
      .eq('action_type', 'send_followup')
      .gte('created_at', dayStart.toISOString());
    if ((sentToday ?? 0) >= linkRow.prompt_cap_per_day) {
      skipped += 1;
      continue;
    }

    const outcome = await sendSms(linkRow.phone_e164, prompt.body);
    if (!outcome.ok) {
      failed += 1;
      continue;
    }

    sent += 1;
    await admin
      .from('kwilt_phone_agent_prompts')
      .update({
        state: 'sent',
        sent_at: nowIso,
        last_twilio_message_sid: outcome.sid,
        updated_at: nowIso,
      })
      .eq('id', prompt.id);

    await admin.from('kwilt_phone_agent_action_log').insert({
      user_id: prompt.user_id,
      phone_link_id: prompt.phone_link_id,
      channel: 'sms',
      action_type: 'send_followup',
      activity_id: prompt.activity_id,
      person_id: prompt.person_id,
      memory_item_id: prompt.memory_item_id,
      event_id: prompt.event_id,
      cadence_id: prompt.cadence_id,
      prompt_id: prompt.id,
      twilio_message_sid: outcome.sid,
      input_summary: prompt.prompt_kind,
      output_summary: 'sent',
      permission_used: 'send_followups',
    });
  }

  return json(200, { ok: true, sent, failed, skipped });
});

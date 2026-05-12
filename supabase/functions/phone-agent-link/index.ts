/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { normalizeE164 } from '../_shared/phoneAgent.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type LinkAction =
  | { action: 'request_code'; phone: string }
  | { action: 'verify_code'; phone: string; code: string }
  | { action: 'update_settings'; phone: string; permissions: Record<string, boolean>; promptCapPerDay: number }
  | { action: 'revoke'; phone: string }
  | { action: 'status' };

type PhoneAgentLinkRow = {
  id: string;
  user_id: string;
  phone_e164: string;
  status: string;
  verification_code_hash: string | null;
  verification_expires_at: string | null;
  permissions: Record<string, boolean>;
  prompt_cap_per_day: number;
  opted_out_at: string | null;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_PERMISSIONS = {
  create_activities: false,
  send_followups: false,
  log_done_replies: false,
  offer_drafts: false,
  suggest_arc_alignment: false,
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

function getSupabaseAdmin(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') ?? '').trim();
  const match = /^bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() ?? null;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomVerificationCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = new DataView(bytes.buffer).getUint32(0);
  return String(100000 + (value % 900000));
}

function sanitizePermissions(raw: unknown): Record<string, boolean> {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.keys(DEFAULT_PERMISSIONS).map((key) => [key, input[key] === true]),
  );
}

function normalizePromptCap(raw: unknown): number {
  const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 3;
  return Math.max(0, Math.min(10, value));
}

async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  const sid = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
  const token = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
  const from = (Deno.env.get('TWILIO_FROM_NUMBER') ?? '').trim();
  if (!sid || !token || !from) return false;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const form = new URLSearchParams();
  form.set('To', phone);
  form.set('From', from);
  form.set('Body', `Your Kwilt Phone Agent verification code is ${code}.`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  }).catch(() => null);

  return Boolean(res?.ok);
}

async function getCurrentUserId(admin: SupabaseClient, req: Request): Promise<string | null> {
  const token = requireBearerToken(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function getStatus(admin: SupabaseClient, userId: string) {
  const { data: links } = await admin
    .from('kwilt_phone_agent_links')
    .select('phone_e164, status, permissions, prompt_cap_per_day, opted_out_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const [{ count: peopleCount }, { count: activeEventsCount }, { count: activeCadencesCount }, { data: recentActions }] =
    await Promise.all([
      admin.from('kwilt_phone_agent_people').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      admin.from('kwilt_phone_agent_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      admin.from('kwilt_phone_agent_cadences').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      admin
        .from('kwilt_phone_agent_action_log')
        .select('id, action_type, created_at, activity_id, prompt_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  return {
    ok: true,
    links: ((links ?? []) as Array<Record<string, unknown>>).map((link) => ({
      phone: String(link.phone_e164 ?? ''),
      status: String(link.status ?? ''),
      permissions: sanitizePermissions(link.permissions),
      promptCapPerDay: normalizePromptCap(link.prompt_cap_per_day),
      optedOutAt: typeof link.opted_out_at === 'string' ? link.opted_out_at : null,
    })),
    memorySummary: {
      peopleCount: peopleCount ?? 0,
      activeEventsCount: activeEventsCount ?? 0,
      activeCadencesCount: activeCadencesCount ?? 0,
    },
    recentActions: ((recentActions ?? []) as Array<Record<string, unknown>>).map((action) => ({
      id: String(action.id ?? ''),
      actionType: String(action.action_type ?? ''),
      createdAt: String(action.created_at ?? ''),
      activityId: typeof action.activity_id === 'string' ? action.activity_id : null,
      promptId: typeof action.prompt_id === 'string' ? action.prompt_id : null,
    })),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(500, { ok: false, error: 'missing_supabase_env' });
  }

  const userId = await getCurrentUserId(admin, req);
  if (!userId) {
    return json(401, { ok: false, error: req.headers.get('authorization') ? 'invalid_user' : 'missing_authorization' });
  }

  const body = await req.json().catch(() => null) as Partial<LinkAction> | null;
  const action = typeof body?.action === 'string' ? body.action : '';

  if (action === 'status') {
    return json(200, await getStatus(admin, userId));
  }

  const phone = normalizeE164((body as { phone?: unknown } | null)?.phone);
  if (!phone) {
    return json(400, { ok: false, error: 'invalid_phone' });
  }

  if (action === 'request_code') {
    const code = randomVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const codeHash = await sha256Hex(code);

    const { data: existing } = await admin
      .from('kwilt_phone_agent_links')
      .select('id, user_id')
      .eq('phone_e164', phone)
      .maybeSingle();

    if (existing && (existing as { user_id?: string }).user_id !== userId) {
      return json(400, { ok: false, error: 'invalid_phone' });
    }

    if (existing) {
      await admin
        .from('kwilt_phone_agent_links')
        .update({
          status: 'pending',
          verification_code_hash: codeHash,
          verification_expires_at: expiresAt,
          opted_out_at: null,
          revoked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existing as { id: string }).id);
    } else {
      await admin.from('kwilt_phone_agent_links').insert({
        user_id: userId,
        phone_e164: phone,
        status: 'pending',
        verification_code_hash: codeHash,
        verification_expires_at: expiresAt,
        permissions: DEFAULT_PERMISSIONS,
      });
    }

    const sent = await sendVerificationCode(phone, code);
    if (!sent) {
      return json(502, { ok: false, error: 'twilio_send_failed' });
    }

    return json(200, { ok: true, status: 'code_sent', phone });
  }

  const { data: link } = await admin
    .from('kwilt_phone_agent_links')
    .select('id, user_id, phone_e164, status, verification_code_hash, verification_expires_at, permissions, prompt_cap_per_day, opted_out_at')
    .eq('user_id', userId)
    .eq('phone_e164', phone)
    .maybeSingle();

  if (!link) {
    return json(400, { ok: false, error: 'invalid_phone' });
  }

  const currentLink = link as PhoneAgentLinkRow;

  if (action === 'verify_code') {
    const code = typeof (body as { code?: unknown }).code === 'string' ? (body as { code: string }).code.trim() : '';
    const expiresAtMs = currentLink.verification_expires_at ? Date.parse(currentLink.verification_expires_at) : 0;
    const codeHash = code ? await sha256Hex(code) : '';
    if (!code || codeHash !== currentLink.verification_code_hash || !Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
      return json(400, { ok: false, error: 'invalid_code' });
    }

    await admin
      .from('kwilt_phone_agent_links')
      .update({
        status: 'verified',
        verification_code_hash: null,
        verification_expires_at: null,
        verified_at: new Date().toISOString(),
        opted_out_at: null,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentLink.id);

    return json(200, { ok: true, status: 'verified', phone });
  }

  if (action === 'update_settings') {
    await admin
      .from('kwilt_phone_agent_links')
      .update({
        permissions: sanitizePermissions((body as { permissions?: unknown }).permissions),
        prompt_cap_per_day: normalizePromptCap((body as { promptCapPerDay?: unknown }).promptCapPerDay),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentLink.id);
    return json(200, await getStatus(admin, userId));
  }

  if (action === 'revoke') {
    await admin
      .from('kwilt_phone_agent_links')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        opted_out_at: null,
        permissions: DEFAULT_PERMISSIONS,
        verification_code_hash: null,
        verification_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentLink.id);
    return json(200, { ok: true, status: 'revoked', phone });
  }

  return json(400, { ok: false, error: 'bad_request' });
});

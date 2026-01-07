// Kwilt referrals (install-based, pre-account)
//
// Routes:
// - POST /create  -> { referralCode }
// - POST /redeem  -> { ok, bonusDelta, inviterBonusThisMonth }
// - POST /bonus   -> { bonusThisMonth }
// - POST /admin/grant-bonus -> { ok, installId, bonusDelta, bonusThisMonth }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
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

function getUtcMonthKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getReferralBonusActions(): number {
  const raw = Deno.env.get('KWILT_REFERRAL_BONUS_ACTIONS');
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return 25;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseCsvList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

function getSupabaseAnon() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const anon =
    (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim() ||
    (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireSuperAdminUser(req: Request): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }
  const anon = getSupabaseAnon();
  if (!anon) {
    return { ok: false, response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }) };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }

  const userId = String(data.user.id);
  const email = typeof data.user.email === 'string' ? data.user.email : null;
  const emailLower = email?.toLowerCase() ?? null;

  const superAdminEmails = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_EMAILS')).map((e) => e.toLowerCase());
  const superAdminUserIds = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_USER_IDS'));
  if (superAdminEmails.length === 0 && superAdminUserIds.length === 0) {
    return { ok: false, response: json(403, { error: { message: 'Super admin not configured', code: 'forbidden' } }) };
  }
  const isSuper =
    superAdminUserIds.includes(userId) || (emailLower ? superAdminEmails.includes(emailLower) : false);
  if (!isSuper) {
    return { ok: false, response: json(403, { error: { message: 'Forbidden', code: 'forbidden' } }) };
  }

  return { ok: true, userId, email };
}

function randomReferralCode(): string {
  // Short-ish code, URL friendly.
  // Not a secret; uniqueness is enforced by DB PK.
  const raw = crypto.randomUUID().replace(/-/g, '');
  return raw.slice(0, 10);
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
  const marker = '/referrals';
  const idx = fullPath.indexOf(marker);
  const route = idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Referral service unavailable', code: 'provider_unavailable' } });
  }

  const now = new Date();

  if (route === '/admin/grant-bonus') {
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => ({}));
    const installId = typeof (body as any)?.installId === 'string' ? (body as any).installId.trim() : '';
    const bonusRaw = typeof (body as any)?.bonusActions === 'number' ? (body as any).bonusActions : NaN;
    const bonusDelta = Number.isFinite(bonusRaw) ? Math.max(1, Math.floor(bonusRaw)) : 0;
    if (!installId) {
      return json(400, { error: { message: 'Missing installId', code: 'bad_request' } });
    }
    if (!bonusDelta) {
      return json(400, { error: { message: 'Missing bonusActions', code: 'bad_request' } });
    }

    const month = getUtcMonthKey(now);
    const quotaKey = `install:${installId}`;
    const { data: next, error } = await admin.rpc('kwilt_increment_ai_bonus_monthly', {
      p_quota_key: quotaKey,
      p_month: month,
      p_bonus_actions: bonusDelta,
    });
    if (error) {
      return json(503, { error: { message: 'Unable to grant bonus credits', code: 'provider_unavailable' } });
    }
    return json(200, {
      ok: true,
      installId,
      bonusDelta,
      bonusThisMonth: typeof next === 'number' ? next : null,
    });
  }

  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  if (!installId) {
    return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
  }

  const quotaKey = `install:${installId}`;

  if (route === '/create') {
    // Create or reuse an existing code for this inviter.
    try {
      const { data: existing } = await admin
        .from('kwilt_referrals')
        .select('referral_code')
        .eq('inviter_quota_key', quotaKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingCode = (existing as { referral_code?: unknown } | null)?.referral_code;
      if (typeof existingCode === 'string' && existingCode.trim().length > 0) {
        return json(200, { referralCode: existingCode.trim() });
      }
    } catch {
      // ignore; proceed to create
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const referralCode = randomReferralCode();
      const { error } = await admin.from('kwilt_referrals').insert({
        referral_code: referralCode,
        inviter_quota_key: quotaKey,
      });
      if (!error) {
        return json(200, { referralCode });
      }
    }

    return json(500, { error: { message: 'Unable to create referral code', code: 'server_error' } });
  }

  if (route === '/bonus') {
    const month = getUtcMonthKey(now);
    const { data, error } = await admin
      .from('kwilt_ai_bonus_monthly')
      .select('bonus_actions')
      .eq('quota_key', quotaKey)
      .eq('month', month)
      .maybeSingle();
    if (error) {
      return json(503, { error: { message: 'Unable to load bonus credits', code: 'provider_unavailable' } });
    }
    const raw = (data as { bonus_actions?: unknown } | null)?.bonus_actions;
    const bonusThisMonth =
      typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return json(200, { bonusThisMonth });
  }

  if (route === '/redeem') {
    const body = await req.json().catch(() => null);
    const referralCode = typeof body?.referralCode === 'string' ? body.referralCode.trim() : '';
    if (!referralCode) {
      return json(400, { error: { message: 'Missing referralCode', code: 'bad_request' } });
    }

    const { data: refRow, error: refErr } = await admin
      .from('kwilt_referrals')
      .select('inviter_quota_key')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (refErr || !refRow) {
      return json(404, { error: { message: 'Referral code not found', code: 'not_found' } });
    }

    const inviterQuotaKey = (refRow as { inviter_quota_key?: unknown }).inviter_quota_key;
    if (typeof inviterQuotaKey !== 'string' || inviterQuotaKey.trim().length === 0) {
      return json(500, { error: { message: 'Referral misconfigured', code: 'server_error' } });
    }

    if (inviterQuotaKey === quotaKey) {
      return json(400, { error: { message: 'Self-referrals are not allowed', code: 'bad_request' } });
    }

    // Insert redemption row (friend can only redeem once total due to unique index).
    const { error: redemptionErr } = await admin.from('kwilt_referral_redemptions').insert({
      referral_code: referralCode,
      friend_quota_key: quotaKey,
    });

    if (redemptionErr) {
      // Most likely: friend already redeemed once.
      return json(200, { ok: true, alreadyRedeemed: true });
    }

    const bonusDelta = getReferralBonusActions();
    const month = getUtcMonthKey(now);

    // Grant bonus to both inviter and friend (joiner).
    const { data: inviterBonus, error: inviterBonusErr } = await admin.rpc('kwilt_increment_ai_bonus_monthly', {
      p_quota_key: inviterQuotaKey,
      p_month: month,
      p_bonus_actions: bonusDelta,
    });
    if (inviterBonusErr) {
      return json(503, { error: { message: 'Unable to grant inviter reward', code: 'provider_unavailable' } });
    }

    const { data: friendBonus, error: friendBonusErr } = await admin.rpc('kwilt_increment_ai_bonus_monthly', {
      p_quota_key: quotaKey,
      p_month: month,
      p_bonus_actions: bonusDelta,
    });
    if (friendBonusErr) {
      return json(503, { error: { message: 'Unable to grant joiner reward', code: 'provider_unavailable' } });
    }

    return json(200, {
      ok: true,
      alreadyRedeemed: false,
      bonusDelta,
      inviterBonusThisMonth: typeof inviterBonus === 'number' ? inviterBonus : null,
      friendBonusThisMonth: typeof friendBonus === 'number' ? friendBonus : null,
    });
  }

  return json(404, { error: { message: 'Not found', code: 'not_found' } });
});



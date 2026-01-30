type RevenueCatEntitlement = Record<string, unknown>;

type RevenueCatSubscriber = {
  entitlements?: {
    active?: Record<string, RevenueCatEntitlement>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type RevenueCatApiResponse = {
  subscriber?: RevenueCatSubscriber;
  [key: string]: unknown;
};

export type RevenueCatSyncResult = {
  ok: boolean;
  isPro: boolean;
  expiresAt: string | null;
  appUserId: string | null;
  usedCache: boolean;
  error?: string;
  status?: number;
};

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
const DEFAULT_ENTITLEMENT_KEY = 'pro';
const DEFAULT_MIN_AGE_MS = 10 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function parseDateString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function parseDateMs(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value).toISOString();
}

function extractExpiresAt(entitlement: RevenueCatEntitlement | null | undefined): string | null {
  if (!entitlement) return null;
  const ent = entitlement as Record<string, unknown>;
  return (
    parseDateMs(ent.expires_date_ms) ||
    parseDateMs(ent.expiration_date_ms) ||
    parseDateMs(ent.expires_at_ms) ||
    parseDateMs(ent.expiration_at_ms) ||
    parseDateString(ent.expires_date) ||
    parseDateString(ent.expiration_date) ||
    parseDateString(ent.expires_at) ||
    parseDateString(ent.expiration_at) ||
    parseDateString(ent.expires_date_pst)
  );
}

function inferActive(entitlement: RevenueCatEntitlement | null | undefined, expiresAt: string | null): boolean {
  if (!entitlement) return false;
  const ent = entitlement as Record<string, unknown>;
  if (typeof ent.is_active === 'boolean') return ent.is_active;
  if (!expiresAt) return true;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return false;
  return ms > Date.now();
}

function extractEntitlement(
  subscriber: RevenueCatSubscriber | null | undefined,
  entitlementKey: string,
): { isActive: boolean; expiresAt: string | null } | null {
  if (!subscriber || !subscriber.entitlements) return null;
  const active = (subscriber.entitlements as any)?.active?.[entitlementKey] as RevenueCatEntitlement | undefined;
  if (active) {
    return { isActive: true, expiresAt: extractExpiresAt(active) };
  }
  const ent = (subscriber.entitlements as any)?.[entitlementKey] as RevenueCatEntitlement | undefined;
  if (!ent) return null;
  const expiresAt = extractExpiresAt(ent);
  return { isActive: inferActive(ent, expiresAt), expiresAt };
}

async function fetchRevenueCatSubscriber(
  appUserId: string,
  secretApiKey: string,
): Promise<{ ok: boolean; status: number; subscriber: RevenueCatSubscriber | null; error?: string }> {
  const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretApiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text().catch(() => '');
  const data = (() => {
    if (!text) return null;
    try {
      return JSON.parse(text) as RevenueCatApiResponse;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    const msg =
      (typeof (data as any)?.message === 'string' && (data as any).message) ||
      (typeof (data as any)?.error === 'string' && (data as any).error) ||
      (typeof text === 'string' && text.trim() ? text.trim().slice(0, 180) : 'RevenueCat request failed');
    return { ok: false, status: res.status, subscriber: null, error: msg };
  }

  const subscriber = (data as RevenueCatApiResponse | null)?.subscriber ?? null;
  return { ok: true, status: res.status, subscriber };
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return false;
  return ms < Date.now();
}

async function getRevenueCatAppUserId(params: {
  admin: any;
  installId?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const { admin, installId, userId } = params;
  if (installId) {
    const { data } = await admin
      .from('kwilt_installs')
      .select('revenuecat_app_user_id')
      .eq('install_id', installId)
      .maybeSingle();
    const id = typeof data?.revenuecat_app_user_id === 'string' ? data.revenuecat_app_user_id.trim() : '';
    if (id) return id;
  }

  if (userId) {
    const { data } = await admin
      .from('kwilt_installs')
      .select('revenuecat_app_user_id')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    const id = typeof row?.revenuecat_app_user_id === 'string' ? row.revenuecat_app_user_id.trim() : '';
    if (id) return id;
  }

  return null;
}

async function loadExistingEntitlements(admin: any, quotaKeys: string[]) {
  if (quotaKeys.length === 0) return new Map<string, any>();
  const { data } = await admin
    .from('kwilt_pro_entitlements')
    .select('quota_key, is_pro, is_pro_tools_trial, expires_at, source, updated_at')
    .in('quota_key', quotaKeys);
  const map = new Map<string, any>();
  if (Array.isArray(data)) {
    for (const row of data as any[]) {
      const key = typeof row?.quota_key === 'string' ? row.quota_key : '';
      if (key) map.set(key, row);
    }
  }
  return map;
}

function cachedResultFromRows(
  rows: Map<string, any>,
  minAgeMs: number,
): { isPro: boolean; expiresAt: string | null } | null {
  if (minAgeMs <= 0) return null;
  let freshest: any | null = null;
  for (const row of rows.values()) {
    if (!row || row.source !== 'revenuecat') continue;
    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : '';
    const updatedMs = updatedAt && Number.isFinite(Date.parse(updatedAt)) ? Date.parse(updatedAt) : 0;
    if (!updatedMs) continue;
    if (Date.now() - updatedMs > minAgeMs) continue;
    if (!freshest || Date.parse(updatedAt) > Date.parse(freshest.updated_at ?? '0')) {
      freshest = row;
    }
  }
  if (!freshest) return null;
  const isPro = Boolean(freshest.is_pro) || Boolean(freshest.is_pro_tools_trial);
  const expiresAt = typeof freshest.expires_at === 'string' ? freshest.expires_at : null;
  return { isPro: isPro && !isExpired(expiresAt), expiresAt };
}

async function upsertRevenuecatEntitlements(params: {
  admin: any;
  quotaKeys: string[];
  isPro: boolean;
  expiresAt: string | null;
  existing: Map<string, any>;
}): Promise<void> {
  const { admin, quotaKeys, isPro, expiresAt, existing } = params;
  const now = nowIso();
  for (const key of quotaKeys) {
    const row = existing.get(key) ?? null;
    const source = typeof row?.source === 'string' ? row.source : null;
    if (source && source !== 'revenuecat') {
      continue;
    }
    if (row) {
      await admin
        .from('kwilt_pro_entitlements')
        .update({
          is_pro: Boolean(isPro),
          is_pro_tools_trial: false,
          source: 'revenuecat',
          expires_at: expiresAt,
          updated_at: now,
        })
        .eq('quota_key', key);
    } else {
      await admin.from('kwilt_pro_entitlements').insert({
        quota_key: key,
        is_pro: Boolean(isPro),
        is_pro_tools_trial: false,
        source: 'revenuecat',
        granted_at: now,
        expires_at: expiresAt,
        updated_at: now,
      });
    }
  }
}

export async function verifyAndSyncRevenueCatPro(params: {
  admin: any;
  installId?: string | null;
  userId?: string | null;
  entitlementKey?: string;
  minAgeMs?: number;
}): Promise<RevenueCatSyncResult> {
  const { admin, installId, userId } = params;
  const entitlementKey = params.entitlementKey ?? DEFAULT_ENTITLEMENT_KEY;
  const minAgeMs = typeof params.minAgeMs === 'number' ? params.minAgeMs : DEFAULT_MIN_AGE_MS;

  const appUserId = await getRevenueCatAppUserId({ admin, installId, userId });
  if (!appUserId) {
    return {
      ok: false,
      isPro: false,
      expiresAt: null,
      appUserId: null,
      usedCache: false,
      error: 'missing_revenuecat_app_user_id',
    };
  }

  const quotaKeys: string[] = [];
  if (installId) quotaKeys.push(`install:${installId}`);
  if (userId) quotaKeys.push(`user:${userId}`);

  const existing = await loadExistingEntitlements(admin, quotaKeys);
  const cached = cachedResultFromRows(existing, minAgeMs);
  if (cached) {
    return {
      ok: true,
      isPro: cached.isPro,
      expiresAt: cached.expiresAt,
      appUserId,
      usedCache: true,
    };
  }

  const secretApiKey = (Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '').trim();
  if (!secretApiKey) {
    return {
      ok: false,
      isPro: false,
      expiresAt: null,
      appUserId,
      usedCache: false,
      error: 'missing_revenuecat_secret',
    };
  }

  const rc = await fetchRevenueCatSubscriber(appUserId, secretApiKey);
  if (!rc.ok) {
    return {
      ok: false,
      isPro: false,
      expiresAt: null,
      appUserId,
      usedCache: false,
      error: rc.error ?? 'revenuecat_request_failed',
      status: rc.status,
    };
  }

  const ent = extractEntitlement(rc.subscriber, entitlementKey);
  const isPro = Boolean(ent?.isActive);
  const expiresAt = ent?.expiresAt ?? null;

  await upsertRevenuecatEntitlements({ admin, quotaKeys, isPro, expiresAt, existing });

  return {
    ok: true,
    isPro,
    expiresAt,
    appUserId,
    usedCache: false,
  };
}


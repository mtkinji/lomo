import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { getEnvVar } from '../utils/getEnv';
import { getProStatus, type ProStatus } from './proCodesStatus';

/**
 * RevenueCat entitlement layer (RevenueCat-ready, safe when SDK/key are missing).
 *
 * MVP entitlement:
 * - `pro`: paid subscribers (individual or family)
 */

const ENTITLEMENTS_CACHE_KEY = 'kwilt-entitlements-cache-v1';
const PRO_CODE_OVERRIDE_KEY = 'kwilt-pro-code-override-v1';
const ADMIN_ENTITLEMENTS_OVERRIDE_KEY = 'kwilt-admin-entitlements-override-v1';
// If offline / RC fails, we’ll use last-known state for this window.
const LAST_KNOWN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type EntitlementsSnapshot = {
  isPro: boolean;
  /**
   * Trial entitlement for “Pro Tools” (non-structural unlocks).
   * This should NOT be treated as full Pro for Arc/Goal limits.
   */
  isProToolsTrial: boolean;
  checkedAt: string;
  source: 'revenuecat' | 'cache' | 'none' | 'dev' | 'code' | 'admin';
  isStale?: boolean;
  error?: string;
};

export type ProPlan = 'individual' | 'family';
export type BillingCadence = 'monthly' | 'annual';

const PRO_SKUS: Record<ProPlan, Record<BillingCadence, string>> = {
  individual: {
    monthly: 'pro_monthly',
    annual: 'pro_annual',
  },
  family: {
    monthly: 'pro_family_monthly',
    annual: 'pro_family_annual',
  },
};

export function getProSku(plan: ProPlan, cadence: BillingCadence): string {
  return PRO_SKUS[plan][cadence];
}

export type ProSkuPricing = {
  sku: string;
  priceString?: string;
  currencyCode?: string;
};

type RevenueCatCustomerInfo = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};

type RevenueCatPurchasesLike = {
  configure?: (params: { apiKey: string; appUserID?: string }) => void;
  getCustomerInfo?: () => Promise<RevenueCatCustomerInfo>;
  restorePurchases?: () => Promise<RevenueCatCustomerInfo>;
  getOfferings?: () => Promise<any>;
  purchasePackage?: (pkg: any) => Promise<{ customerInfo?: RevenueCatCustomerInfo }>;
  setLogLevel?: (level: any) => void;
  LOG_LEVEL?: Record<string, any>;
};

const nowIso = () => new Date().toISOString();

function isAuthoritativeProStatus(status: ProStatus | null | undefined): boolean {
  // `getProStatus()` returns { isPro: false } for many non-200 cases (401/500/etc).
  // Treat only HTTP 200 as definitive to avoid downgrading due to transient auth/token issues.
  return Boolean(status && status.httpStatus === 200);
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readCachedEntitlements(): Promise<EntitlementsSnapshot | null> {
  const raw = await AsyncStorage.getItem(ENTITLEMENTS_CACHE_KEY);
  const parsed = safeParseJson<EntitlementsSnapshot>(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.isPro !== 'boolean') return null;
  if (typeof (parsed as any).isProToolsTrial !== 'boolean') return null;
  if (typeof parsed.checkedAt !== 'string') return null;
  if (
    parsed.source !== 'revenuecat' &&
    parsed.source !== 'cache' &&
    parsed.source !== 'none' &&
    parsed.source !== 'code' &&
    parsed.source !== 'admin'
  ) {
    return null;
  }
  return parsed;
}

async function writeCachedEntitlements(snapshot: EntitlementsSnapshot): Promise<void> {
  await AsyncStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(snapshot));
}

export async function setProCodeOverrideEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PRO_CODE_OVERRIDE_KEY, enabled ? 'true' : 'false');
}

export async function getProCodeOverrideEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PRO_CODE_OVERRIDE_KEY);
  return (raw ?? '').trim().toLowerCase() === 'true';
}

export type AdminEntitlementsOverrideTier = 'real' | 'free' | 'trial' | 'pro';

export async function setAdminEntitlementsOverrideTier(tier: AdminEntitlementsOverrideTier): Promise<void> {
  await AsyncStorage.setItem(ADMIN_ENTITLEMENTS_OVERRIDE_KEY, tier);
}

export async function getAdminEntitlementsOverrideTier(): Promise<AdminEntitlementsOverrideTier> {
  const raw = (await AsyncStorage.getItem(ADMIN_ENTITLEMENTS_OVERRIDE_KEY).catch(() => null)) ?? '';
  const v = raw.trim().toLowerCase();
  if (v === 'free' || v === 'trial' || v === 'pro' || v === 'real') return v as AdminEntitlementsOverrideTier;
  return 'real';
}

export async function clearAdminEntitlementsOverrideTier(): Promise<void> {
  await AsyncStorage.removeItem(ADMIN_ENTITLEMENTS_OVERRIDE_KEY);
}

async function applyAdminOverride(snapshot: EntitlementsSnapshot): Promise<EntitlementsSnapshot> {
  // Safety note: this override is intended for Super Admin support/testing. Client UI should
  // ensure only super admins can set it, and clear it on logout / non-super-admin sessions.
  const tier = await getAdminEntitlementsOverrideTier().catch(() => 'real' as const);
  if (tier === 'real') return snapshot;
  const checkedAt = snapshot.checkedAt || new Date().toISOString();
  if (tier === 'pro') {
    return { ...snapshot, isPro: true, isProToolsTrial: false, checkedAt, source: 'admin' };
  }
  if (tier === 'trial') {
    return { ...snapshot, isPro: false, isProToolsTrial: true, checkedAt, source: 'admin' };
  }
  // free
  return { ...snapshot, isPro: false, isProToolsTrial: false, checkedAt, source: 'admin' };
}

function getPurchasesModule(): RevenueCatPurchasesLike | null {
  try {
    // Intentionally use runtime require so the app can compile/run even before
    // `react-native-purchases` is added to dependencies.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases') as RevenueCatPurchasesLike;
  } catch {
    return null;
  }
}

let hasConfiguredRevenueCat = false;

function extractIsPro(customerInfo: RevenueCatCustomerInfo | null | undefined): boolean {
  const active = customerInfo?.entitlements?.active ?? {};
  return Boolean((active as any).pro);
}

function extractIsProToolsTrial(customerInfo: RevenueCatCustomerInfo | null | undefined): boolean {
  const active = customerInfo?.entitlements?.active ?? {};
  return Boolean((active as any).pro_tools_trial);
}

async function configureRevenueCatIfNeeded(purchases: RevenueCatPurchasesLike): Promise<void> {
  if (hasConfiguredRevenueCat) return;
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!apiKey || typeof purchases.configure !== 'function') return;

  // Keep logs quiet by default; can be turned up later if needed.
  if (typeof purchases.setLogLevel === 'function' && purchases.LOG_LEVEL?.WARN) {
    purchases.setLogLevel(purchases.LOG_LEVEL.WARN);
  }

  purchases.configure({ apiKey });
  hasConfiguredRevenueCat = true;
}

/**
 * Safely get the RevenueCat app user ID, ensuring the SDK is configured first.
 * Returns null if RevenueCat is unavailable, not configured, or if the call fails.
 * This is safe to call from anywhere without risking a native crash.
 */
export async function getRevenueCatAppUserIdSafe(): Promise<string | null> {
  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) return null;

  try {
    await configureRevenueCatIfNeeded(purchases);
    if (!hasConfiguredRevenueCat) return null;
    if (typeof purchases.getCustomerInfo !== 'function') return null;

    const info = await purchases.getCustomerInfo();
    const v =
      (typeof (info as any)?.originalAppUserId === 'string' && (info as any).originalAppUserId.trim()) ||
      (typeof (info as any)?.original_app_user_id === 'string' && (info as any).original_app_user_id.trim()) ||
      (typeof (info as any)?.appUserID === 'string' && (info as any).appUserID.trim()) ||
      null;
    return v || null;
  } catch {
    return null;
  }
}

export async function getEntitlements(params?: { forceRefresh?: boolean }): Promise<EntitlementsSnapshot> {
  const cached = await readCachedEntitlements();
  const proCodeOverride = await getProCodeOverrideEnabled().catch(() => false);
  const cachedAgeMs =
    cached?.checkedAt && Number.isFinite(Date.parse(cached.checkedAt))
      ? Date.now() - Date.parse(cached.checkedAt)
      : Number.POSITIVE_INFINITY;
  const cachedIsFresh = cached != null && cachedAgeMs <= LAST_KNOWN_MAX_AGE_MS;

  // Fast path: use cached within bounded window if we weren't asked to refresh.
  if (!params?.forceRefresh && cachedIsFresh) {
    // If a local pro-code override is present, validate it against server status so expiry is enforced.
    if (proCodeOverride) {
      try {
        const status = await getProStatus();
        const authoritative = isAuthoritativeProStatus(status);
        if (authoritative && !status.isPro) {
          await setProCodeOverrideEnabled(false);
          const next: EntitlementsSnapshot = {
            ...cached,
            isPro: false,
            isProToolsTrial: false,
            checkedAt: nowIso(),
            source: 'cache',
            isStale: false,
            error: undefined,
          };
          await writeCachedEntitlements(next);
          return await applyAdminOverride(next);
        }
        if (authoritative && status.isPro) {
          // Server confirms pro: keep pro enabled.
          return await applyAdminOverride({
            ...cached,
            isPro: true,
            isProToolsTrial: false,
            source: 'cache',
            isStale: false,
            error: undefined,
          });
        }
        // Non-authoritative (e.g. 401/500): do NOT clear local override and do not downgrade.
        return await applyAdminOverride({
          ...cached,
          isPro: true,
          isProToolsTrial: false,
          source: 'cache',
          isStale: true,
          error: status?.errorMessage ?? 'Unable to verify Pro status',
        });
      } catch (e: any) {
        // If status check throws (network/base url issues), keep the cached fast path (but don't clear the override).
        return await applyAdminOverride({
          ...cached,
          isPro: true,
          isProToolsTrial: false,
          source: 'cache',
          isStale: true,
          error: typeof e?.message === 'string' ? e.message : 'Unable to verify Pro status',
        });
      }
    }
    return await applyAdminOverride({ ...cached, source: 'cache', isStale: false });
  }

  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) {
    // RevenueCat not available yet — fall back to last known (if any).
    if (cachedIsFresh) {
      const base = { ...cached, source: 'cache', isStale: true, error: 'RevenueCat not configured' } as EntitlementsSnapshot;
      // Prefer server status for code/admin grants; this enforces expiry.
      try {
        const status = await getProStatus();
        if (isAuthoritativeProStatus(status) && !status.isPro && proCodeOverride) {
          await setProCodeOverrideEnabled(false);
        }
        const authoritative = isAuthoritativeProStatus(status);
        // Sticky last-known Pro: never downgrade due to non-authoritative status (401/500/etc).
        const shouldStickyKeepPro = !authoritative && Boolean(base.isPro) && !proCodeOverride;
        const isPro = Boolean(authoritative && status.isPro) || Boolean(proCodeOverride) || Boolean(shouldStickyKeepPro);
        const error =
          !authoritative
            ? status?.errorMessage ?? 'Pro status check unavailable; using last-known tier'
            : base.error;
        return await applyAdminOverride({
          ...base,
          isPro,
          isProToolsTrial: false,
          source: authoritative && status.isPro ? 'code' : base.source,
          isStale: Boolean(!authoritative || shouldStickyKeepPro || base.isStale),
          error,
        });
      } catch {
        if (proCodeOverride) {
          return await applyAdminOverride({ ...base, isPro: true, isProToolsTrial: false });
        }
        return await applyAdminOverride(base);
      }
    }
    let snapshot: EntitlementsSnapshot = {
      isPro: false,
      isProToolsTrial: false,
      checkedAt: nowIso(),
      source: 'none',
      isStale: true,
      error: 'RevenueCat not configured',
    };
    // Best-effort server status (enforces expiry).
    try {
      const status = await getProStatus();
      if (isAuthoritativeProStatus(status) && !status.isPro && proCodeOverride) {
        await setProCodeOverrideEnabled(false);
      }
      if (isAuthoritativeProStatus(status) && status.isPro) {
        snapshot = { ...snapshot, isPro: true, source: 'code' };
      } else if (proCodeOverride) {
        snapshot = { ...snapshot, isPro: true, source: 'code', isStale: true, error: status.errorMessage ?? snapshot.error };
      }
    } catch {
      if (proCodeOverride) {
        snapshot = { ...snapshot, isPro: true, source: 'code' };
      }
    }
    await writeCachedEntitlements(snapshot);
    return await applyAdminOverride(snapshot);
  }

  try {
    await configureRevenueCatIfNeeded(purchases);
    const info = await purchases.getCustomerInfo?.();
    const rcIsPro = extractIsPro(info);
    const rcIsTrial = extractIsProToolsTrial(info);
    let serverIsPro: boolean | null = false;
    let serverError: string | undefined;
    if (!rcIsPro) {
      try {
        const status = await getProStatus();
        if (isAuthoritativeProStatus(status)) {
          serverIsPro = Boolean(status.isPro);
          if (!serverIsPro && proCodeOverride) {
            await setProCodeOverrideEnabled(false);
          }
        } else {
          serverIsPro = null;
          serverError = status.errorMessage ?? 'Unable to verify Pro status';
        }
      } catch {
        // If server status fails, do not clear local override.
        serverIsPro = null;
      }
    }
    const shouldStickyKeepPro =
      serverIsPro == null && Boolean(cachedIsFresh && cached?.isPro) && !rcIsPro && !proCodeOverride;
    const isPro =
      rcIsPro ||
      serverIsPro === true ||
      Boolean(proCodeOverride && !rcIsPro) ||
      Boolean(shouldStickyKeepPro);
    const isProToolsTrial = Boolean(!isPro && rcIsTrial);
    const snapshot: EntitlementsSnapshot = {
      isPro,
      isProToolsTrial,
      checkedAt: nowIso(),
      source: rcIsPro ? 'revenuecat' : isPro ? 'code' : 'revenuecat',
      isStale: Boolean(serverIsPro == null || shouldStickyKeepPro),
      ...(serverIsPro == null || shouldStickyKeepPro
        ? { error: serverError ?? 'Pro status check unavailable; using last-known tier' }
        : {}),
    };
    await writeCachedEntitlements(snapshot);
    return await applyAdminOverride(snapshot);
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Failed to refresh entitlements';
    if (cachedIsFresh) {
      const base = { ...cached, source: 'cache', isStale: true, error: message } as EntitlementsSnapshot;
      try {
        const status = await getProStatus();
        if (isAuthoritativeProStatus(status) && !status.isPro && proCodeOverride) {
          await setProCodeOverrideEnabled(false);
        }
        const isPro = Boolean(isAuthoritativeProStatus(status) && status.isPro) || Boolean(proCodeOverride) || Boolean(cached.isPro);
        return await applyAdminOverride({ ...base, isPro, isProToolsTrial: false, source: isPro ? 'code' : base.source });
      } catch {
        if (proCodeOverride) {
          return await applyAdminOverride({ ...base, isPro: true, isProToolsTrial: false });
        }
        return await applyAdminOverride(base);
      }
    }
    let snapshot: EntitlementsSnapshot = {
      isPro: false,
      isProToolsTrial: false,
      checkedAt: nowIso(),
      source: 'none',
      isStale: true,
      error: message,
    };
    try {
      const status = await getProStatus();
      if (isAuthoritativeProStatus(status) && !status.isPro && proCodeOverride) {
        await setProCodeOverrideEnabled(false);
      }
      if ((isAuthoritativeProStatus(status) && status.isPro) || proCodeOverride) {
        snapshot = { ...snapshot, isPro: true, source: 'code' };
      }
    } catch {
      if (proCodeOverride) {
        snapshot = { ...snapshot, isPro: true, source: 'code' };
      }
    }
    await writeCachedEntitlements(snapshot);
    return await applyAdminOverride(snapshot);
  }
}

export async function restorePurchases(): Promise<EntitlementsSnapshot> {
  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey || typeof purchases.restorePurchases !== 'function') {
    return getEntitlements({ forceRefresh: false });
  }

  await configureRevenueCatIfNeeded(purchases);
  const info = await purchases.restorePurchases();
  const snapshot: EntitlementsSnapshot = {
    isPro: extractIsPro(info),
    isProToolsTrial: extractIsProToolsTrial(info),
    checkedAt: nowIso(),
    source: 'revenuecat',
    isStale: false,
  };
  await writeCachedEntitlements(snapshot);
  return snapshot;
}

export async function purchasePro(): Promise<EntitlementsSnapshot> {
  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) {
    return getEntitlements({ forceRefresh: false });
  }

  await configureRevenueCatIfNeeded(purchases);
  const offerings = await purchases.getOfferings?.();
  const currentOffering = offerings?.current;
  const availablePackages: any[] = Array.isArray(currentOffering?.availablePackages)
    ? currentOffering.availablePackages
    : [];

  const desiredSku = PRO_SKUS.individual.annual;
  const matchingPackage = availablePackages.find(
    (pkg) => pkg?.product?.identifier === desiredSku || pkg?.product?.productIdentifier === desiredSku,
  );
  const selectedPackage = matchingPackage ?? availablePackages[0];

  if (!selectedPackage || typeof purchases.purchasePackage !== 'function') {
    throw new Error('No subscription packages available');
  }

  const result = await purchases.purchasePackage(selectedPackage);
  const snapshot: EntitlementsSnapshot = {
    isPro: extractIsPro(result?.customerInfo),
    isProToolsTrial: extractIsProToolsTrial(result?.customerInfo),
    checkedAt: nowIso(),
    source: 'revenuecat',
    isStale: false,
  };
  await writeCachedEntitlements(snapshot);
  return snapshot;
}

export async function purchaseProSku(params: {
  plan: ProPlan;
  cadence: BillingCadence;
}): Promise<EntitlementsSnapshot> {
  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) {
    return getEntitlements({ forceRefresh: false });
  }

  await configureRevenueCatIfNeeded(purchases);
  const offerings = await purchases.getOfferings?.();
  const currentOffering = offerings?.current;
  const availablePackages: any[] = Array.isArray(currentOffering?.availablePackages)
    ? currentOffering.availablePackages
    : [];

  const desiredSku = getProSku(params.plan, params.cadence);
  const matchingPackage = availablePackages.find(
    (pkg) => pkg?.product?.identifier === desiredSku || pkg?.product?.productIdentifier === desiredSku,
  );
  const selectedPackage = matchingPackage ?? availablePackages[0];

  if (!selectedPackage || typeof purchases.purchasePackage !== 'function') {
    throw new Error('No subscription packages available');
  }

  const result = await purchases.purchasePackage(selectedPackage);
  const snapshot: EntitlementsSnapshot = {
    isPro: extractIsPro(result?.customerInfo),
    isProToolsTrial: extractIsProToolsTrial(result?.customerInfo),
    checkedAt: nowIso(),
    source: 'revenuecat',
    isStale: false,
  };
  await writeCachedEntitlements(snapshot);
  return snapshot;
}

export async function openManageSubscription(): Promise<void> {
  // Apple subscriptions management page
  if (Platform.OS === 'ios') {
    await Linking.openURL('https://apps.apple.com/account/subscriptions');
    return;
  }
  // Fallback: do nothing (Android/Web not in scope for MVP PRD).
}

export async function getProSkuPricing(): Promise<Record<string, ProSkuPricing>> {
  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) return {};

  try {
    await configureRevenueCatIfNeeded(purchases);
    const offerings = await purchases.getOfferings?.();
    const currentOffering = offerings?.current;
    const availablePackages: any[] = Array.isArray(currentOffering?.availablePackages)
      ? currentOffering.availablePackages
      : [];

    const pricing: Record<string, ProSkuPricing> = {};
    for (const pkg of availablePackages) {
      const sku = pkg?.product?.identifier ?? pkg?.product?.productIdentifier;
      if (typeof sku !== 'string') continue;
      const priceString = pkg?.product?.priceString;
      const currencyCode = pkg?.product?.currencyCode;
      pricing[sku] = {
        sku,
        ...(typeof priceString === 'string' ? { priceString } : {}),
        ...(typeof currencyCode === 'string' ? { currencyCode } : {}),
      };
    }
    return pricing;
  } catch {
    return {};
  }
}



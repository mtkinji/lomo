import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { getEnvVar } from '../utils/getEnv';

/**
 * RevenueCat entitlement layer (RevenueCat-ready, safe when SDK/key are missing).
 *
 * MVP entitlement:
 * - `pro`: paid subscribers (individual or family)
 */

const ENTITLEMENTS_CACHE_KEY = 'kwilt-entitlements-cache-v1';
// If offline / RC fails, we’ll use last-known state for this window.
const LAST_KNOWN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type EntitlementsSnapshot = {
  isPro: boolean;
  checkedAt: string;
  source: 'revenuecat' | 'cache' | 'none';
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
  if (typeof parsed.checkedAt !== 'string') return null;
  if (parsed.source !== 'revenuecat' && parsed.source !== 'cache' && parsed.source !== 'none') {
    return null;
  }
  return parsed;
}

async function writeCachedEntitlements(snapshot: EntitlementsSnapshot): Promise<void> {
  await AsyncStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(snapshot));
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

export async function getEntitlements(params?: { forceRefresh?: boolean }): Promise<EntitlementsSnapshot> {
  const cached = await readCachedEntitlements();
  const cachedAgeMs =
    cached?.checkedAt && Number.isFinite(Date.parse(cached.checkedAt))
      ? Date.now() - Date.parse(cached.checkedAt)
      : Number.POSITIVE_INFINITY;
  const cachedIsFresh = cached != null && cachedAgeMs <= LAST_KNOWN_MAX_AGE_MS;

  // Fast path: use cached within bounded window if we weren't asked to refresh.
  if (!params?.forceRefresh && cachedIsFresh) {
    return { ...cached, source: 'cache', isStale: false };
  }

  const purchases = getPurchasesModule();
  const apiKey = getEnvVar<string>('revenueCatApiKey');
  if (!purchases || !apiKey) {
    // RevenueCat not available yet — fall back to last known (if any).
    if (cachedIsFresh) {
      return { ...cached, source: 'cache', isStale: true, error: 'RevenueCat not configured' };
    }
    const snapshot: EntitlementsSnapshot = {
      isPro: false,
      checkedAt: nowIso(),
      source: 'none',
      isStale: true,
      error: 'RevenueCat not configured',
    };
    await writeCachedEntitlements(snapshot);
    return snapshot;
  }

  try {
    await configureRevenueCatIfNeeded(purchases);
    const info = await purchases.getCustomerInfo?.();
    const snapshot: EntitlementsSnapshot = {
      isPro: extractIsPro(info),
      checkedAt: nowIso(),
      source: 'revenuecat',
      isStale: false,
    };
    await writeCachedEntitlements(snapshot);
    return snapshot;
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Failed to refresh entitlements';
    if (cachedIsFresh) {
      return { ...cached, source: 'cache', isStale: true, error: message };
    }
    const snapshot: EntitlementsSnapshot = {
      isPro: false,
      checkedAt: nowIso(),
      source: 'none',
      isStale: true,
      error: message,
    };
    await writeCachedEntitlements(snapshot);
    return snapshot;
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

  const desiredSku = PRO_SKUS[params.plan][params.cadence];
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



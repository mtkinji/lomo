import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { buildMaybeAuthedHeaders, getProCodesBaseUrlForHeaders } from './proCodesClient';
import { getRevenueCatAppUserIdSafe } from './entitlements';

const PING_CACHE_KEY = 'kwilt-install-ping-v1';

type PingCache = {
  lastPingAt: string;
  lastUserId?: string | null;
  lastRevenuecatAppUserId?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function shouldPing(cache: PingCache | null, args: { userId?: string | null; revenuecatAppUserId?: string | null }) {
  const lastMs = cache?.lastPingAt && Number.isFinite(Date.parse(cache.lastPingAt)) ? Date.parse(cache.lastPingAt) : 0;
  const ageMs = Date.now() - lastMs;
  const changedUser = (cache?.lastUserId ?? null) !== (args.userId ?? null);
  const changedRc = (cache?.lastRevenuecatAppUserId ?? null) !== (args.revenuecatAppUserId ?? null);
  // Ping at most every 6 hours unless identity metadata changes.
  return changedUser || changedRc || ageMs > 6 * 60 * 60 * 1000;
}

async function readCache(): Promise<PingCache | null> {
  const raw = await AsyncStorage.getItem(PING_CACHE_KEY).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PingCache;
  } catch {
    return null;
  }
}

async function writeCache(next: PingCache): Promise<void> {
  await AsyncStorage.setItem(PING_CACHE_KEY, JSON.stringify(next));
}

async function getRevenuecatAppUserIdBestEffort(): Promise<string | null> {
  // Use the safe helper from entitlements.ts which ensures RevenueCat is configured
  // before calling getCustomerInfo. This prevents native crashes on fresh installs
  // where RevenueCat hasn't been configured yet.
  return getRevenueCatAppUserIdSafe();
}

export async function pingInstall(args?: { userId?: string | null; revenuecatAppUserId?: string | null }): Promise<void> {
  const revenuecatAppUserId = args?.revenuecatAppUserId ?? (await getRevenuecatAppUserIdBestEffort());

  const cache = await readCache();
  if (!shouldPing(cache, { userId: args?.userId ?? null, revenuecatAppUserId })) {
    return;
  }

  const headers = await buildMaybeAuthedHeaders();
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) return;
  const appVersion = (Constants.expoConfig as any)?.version ?? (Constants.manifest2 as any)?.extra?.version ?? null;
  const buildNumber =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    (Constants.expoConfig as any)?.android?.versionCode?.toString?.() ??
    null;

  const res = await fetch(`${base}/ping`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      revenuecatAppUserId: revenuecatAppUserId ?? undefined,
      platform: Platform.OS,
      appVersion: typeof appVersion === 'string' ? appVersion : undefined,
      buildNumber: typeof buildNumber === 'string' ? buildNumber : undefined,
    }),
  }).catch(() => null);

  if (res?.ok) {
    await writeCache({
      lastPingAt: nowIso(),
      lastUserId: args?.userId ?? null,
      lastRevenuecatAppUserId: revenuecatAppUserId ?? null,
    });
  }
}



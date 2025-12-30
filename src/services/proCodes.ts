import { getEnvVar } from '../utils/getEnv';
import { getInstallId } from './installId';
import { setProCodeOverrideEnabled } from './entitlements';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { useToastStore } from '../store/useToastStore';

const AI_PROXY_BASE_URL_RAW = getEnvVar<string>('aiProxyBaseUrl');
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function getProCodesBaseUrl(): string | null {
  if (!AI_PROXY_BASE_URL) return null;
  // aiProxyBaseUrl is expected to end with `/ai-chat` (edge function name).
  // Derive the sibling pro-codes function URL.
  if (AI_PROXY_BASE_URL.endsWith('/ai-chat')) {
    return `${AI_PROXY_BASE_URL.slice(0, -'/ai-chat'.length)}/pro-codes`;
  }
  return null;
}

async function buildEdgeHeaders(): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');
  const supabaseKey = getEnvVar<string>('supabasePublishableKey')?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }
  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);
  return headers;
}

export async function redeemProCode(code: string): Promise<{ alreadyRedeemed: boolean }> {
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const res = await fetch(`${base}/redeem`, {
    method: 'POST',
    headers: await buildEdgeHeaders(),
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to redeem code';
    throw new Error(msg);
  }

  const alreadyRedeemed = Boolean(data?.alreadyRedeemed);

  // Persist local Pro override so RevenueCat refreshes can't overwrite it.
  await setProCodeOverrideEnabled(true);
  void useEntitlementsStore.getState().refreshEntitlements({ force: true }).catch(() => undefined);

  useToastStore.getState().showToast({
    message: alreadyRedeemed ? 'Code already redeemed.' : 'Kwilt Pro unlocked.',
    variant: alreadyRedeemed ? 'default' : 'success',
  });

  return { alreadyRedeemed };
}





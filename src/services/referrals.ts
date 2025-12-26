import { getEnvVar } from '../utils/getEnv';
import { getInstallId } from './installId';
import { useAppStore } from '../store/useAppStore';
import { useCreditsInterstitialStore } from '../store/useCreditsInterstitialStore';
import { useToastStore } from '../store/useToastStore';

const AI_PROXY_BASE_URL_RAW = getEnvVar<string>('aiProxyBaseUrl');
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function getReferralsBaseUrl(): string | null {
  if (!AI_PROXY_BASE_URL) return null;
  // aiProxyBaseUrl is expected to end with `/ai-chat` (edge function name).
  // Derive the sibling referrals function URL.
  if (AI_PROXY_BASE_URL.endsWith('/ai-chat')) {
    return `${AI_PROXY_BASE_URL.slice(0, -'/ai-chat'.length)}/referrals`;
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

export async function createReferralCode(): Promise<string> {
  const base = getReferralsBaseUrl();
  if (!base) {
    throw new Error('Referrals service not configured');
  }

  const res = await fetch(`${base}/create`, {
    method: 'POST',
    headers: await buildEdgeHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => null);
  const code = typeof data?.referralCode === 'string' ? data.referralCode.trim() : '';
  if (!res.ok || !code) {
    throw new Error(typeof data?.error?.message === 'string' ? data.error.message : 'Unable to create referral code');
  }
  return code;
}

export async function redeemReferralCode(referralCode: string): Promise<{ alreadyRedeemed: boolean }> {
  const base = getReferralsBaseUrl();
  if (!base) {
    throw new Error('Referrals service not configured');
  }

  const res = await fetch(`${base}/redeem`, {
    method: 'POST',
    headers: await buildEdgeHeaders(),
    body: JSON.stringify({ referralCode }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to redeem referral code';
    throw new Error(msg);
  }

  const alreadyRedeemed = Boolean(data?.alreadyRedeemed);

  // The server grants bonus credits to the inviter. The friend sees confirmation only.
  if (!alreadyRedeemed) {
    useToastStore.getState().showToast({
      message: 'Invite redeemed. Thanks for joining Kwilt.',
      variant: 'success',
    });
  }

  return { alreadyRedeemed };
}

export async function fetchBonusCreditsThisMonth(): Promise<number> {
  const base = getReferralsBaseUrl();
  if (!base) {
    throw new Error('Referrals service not configured');
  }

  const res = await fetch(`${base}/bonus`, {
    method: 'POST',
    headers: await buildEdgeHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof data?.error?.message === 'string' ? data.error.message : 'Unable to load bonus credits');
  }
  const raw = typeof data?.bonusThisMonth === 'number' ? data.bonusThisMonth : 0;
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export async function syncBonusCreditsThisMonth(): Promise<void> {
  try {
    const serverBonus = await fetchBonusCreditsThisMonth();
    const state = useAppStore.getState();
    const currentKey = state.bonusGenerativeCredits?.monthKey;
    const bonusKey = currentKey;
    const currentLocal = state.bonusGenerativeCredits?.bonusThisMonth ?? 0;

    if (serverBonus > currentLocal) {
      const delta = serverBonus - currentLocal;
      useAppStore.getState().setBonusGenerativeCreditsThisMonth(serverBonus);
      useToastStore.getState().showToast({
        message: `Bonus AI credits earned: +${delta}`,
        variant: 'credits',
      });
      try {
        useCreditsInterstitialStore.getState().open({ kind: 'reward' });
      } catch {
        // ignore
      }
    } else if (bonusKey && typeof currentLocal === 'number' && currentLocal > serverBonus) {
      // If local is ahead (stale), trust server as canonical.
      useAppStore.getState().setBonusGenerativeCreditsThisMonth(serverBonus);
    }
  } catch {
    // best-effort; ignore
  }
}

export async function handleIncomingReferralUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'kwilt:') return false;
    if (parsed.hostname !== 'referral') return false;
    const code = (parsed.searchParams.get('code') ?? '').trim();
    if (!code) return true;

    // Best-effort idempotence: if we already redeemed this code, skip network call.
    const state = useAppStore.getState();
    const redeemed = state.redeemedReferralCodes;
    if (redeemed && redeemed[code]) {
      return true;
    }

    await redeemReferralCode(code);

    // Record locally so repeated opens don't spam the server.
    useAppStore.setState((s) => ({
      redeemedReferralCodes: { ...(s.redeemedReferralCodes ?? {}), [code]: true },
    }));
    return true;
  } catch {
    return false;
  }
}



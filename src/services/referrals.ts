import { getEnvVar } from '../utils/getEnv';
import { getInstallId } from './installId';
import { useAppStore } from '../store/useAppStore';
import { useCreditsInterstitialStore } from '../store/useCreditsInterstitialStore';
import { useToastStore } from '../store/useToastStore';
import { buildAuthedHeaders } from './proCodesClient';
import { getEdgeFunctionUrl } from './edgeFunctions';

function getReferralsBaseUrl(): string | null {
  return getEdgeFunctionUrl('referrals');
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

export async function grantBonusCreditsSuperAdmin(params: { installId: string; bonusActions: number }): Promise<{
  bonusThisMonth: number | null;
}> {
  const base = getReferralsBaseUrl();
  if (!base) throw new Error('Referrals service not configured');

  const headers = await buildAuthedHeaders({ promptReason: 'admin' });
  const res = await fetch(`${base}/admin/grant-bonus`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      installId: params.installId,
      bonusActions: params.bonusActions,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to grant bonus credits';
    throw new Error(msg);
  }
  return {
    bonusThisMonth: typeof data?.bonusThisMonth === 'number' ? data.bonusThisMonth : null,
  };
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

  // The server grants bonus credits to both inviter + friend. The friend sees confirmation.
  if (!alreadyRedeemed) {
    useToastStore.getState().showToast({
      message: 'Invite redeemed. You earned +25 AI credits.',
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
    let code = '';
    let looksLikeReferral = false;

    // 1) In-app scheme: kwilt://referral?code=...
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'referral') {
      looksLikeReferral = true;
      code = (parsed.searchParams.get('code') ?? '').trim();
    }

    // 2) Universal link format:
    // - https://go.kwilt.app/r/<code>
    // - https://kwilt.app/r/<code>
    if (!code && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
      const host = (parsed.hostname ?? '').toLowerCase();
      if (host === 'go.kwilt.app' || host === 'kwilt.app') {
        const path = parsed.pathname ?? '';
        const m = /^\/r\/([^/]+)$/.exec(path);
        if (m?.[1]) {
          looksLikeReferral = true;
          try {
            code = decodeURIComponent(m[1]).trim();
          } catch {
            code = m[1].trim();
          }
        } else if (path === '/referral') {
          looksLikeReferral = true;
          code = (parsed.searchParams.get('code') ?? '').trim();
        } else if ((parsed.searchParams.get('ref') ?? '').trim()) {
          // Allow ?ref=... as a convenience for link builders.
          looksLikeReferral = true;
          code = (parsed.searchParams.get('ref') ?? '').trim();
        }
      }
    }

    if (!looksLikeReferral) return false;
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



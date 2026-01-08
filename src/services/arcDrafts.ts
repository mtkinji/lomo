import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';
import { ensureSignedInWithPrompt } from './backend/auth';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { useArcDraftClaimStore } from '../store/useArcDraftClaimStore';
import type { ArcDraftPayload } from '@kwilt/arc-survey';
import { AnalyticsEvent, type AnalyticsEventName } from './analytics/events';
import type { AnalyticsProps } from './analytics/analytics';
import { getEdgeFunctionUrl } from './edgeFunctions';

async function buildEdgeHeaders(accessToken: string): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);

  headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

function coerceArcDraftPayload(payload: unknown): ArcDraftPayload | null {
  // Keep runtime checks minimal; deeper validation happens on the web/app clients.
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as any;
  if (p.version !== 1) return null;
  if (typeof p.dream !== 'string' || !p.dream.trim()) return null;
  if (typeof p.domainId !== 'string' || !p.domainId) return null;
  if (typeof p.proudMomentId !== 'string' || !p.proudMomentId) return null;
  if (typeof p.motivationId !== 'string' || !p.motivationId) return null;
  if (typeof p.roleModelTypeId !== 'string' || !p.roleModelTypeId) return null;
  if (!Array.isArray(p.admiredQualityIds) || p.admiredQualityIds.length < 1) return null;
  return p as ArcDraftPayload;
}

function parseArcDraftUrl(url: string): { looksLikeArcDraft: boolean; draftId: string; token: string } {
  try {
    const parsed = new URL(url);

    // 1) Custom scheme: kwilt://arc-draft?draftId=...&token=...
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'arc-draft') {
      const draftId = (parsed.searchParams.get('draftId') ?? parsed.searchParams.get('id') ?? '').trim();
      const token = (parsed.searchParams.get('token') ?? '').trim();
      return { looksLikeArcDraft: true, draftId, token };
    }

    // 2) Expo Go format: exp://.../--/continue/arc?id=...&token=...
    if (parsed.protocol === 'exp:' || parsed.protocol === 'exps:') {
      const path = parsed.pathname ?? '';
      if (path.endsWith('/continue/arc') || path.endsWith('/--/continue/arc') || path.includes('/--/continue/arc')) {
        const draftId = (parsed.searchParams.get('draftId') ?? parsed.searchParams.get('id') ?? '').trim();
        const token = (parsed.searchParams.get('token') ?? '').trim();
        return { looksLikeArcDraft: true, draftId, token };
      }
    }

    // 3) Universal link: https://kwilt.app/continue/arc?id=...&token=...
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      const host = (parsed.hostname ?? '').toLowerCase();
      if (host === 'kwilt.app' || host === 'go.kwilt.app') {
        const path = parsed.pathname ?? '';
        if (path === '/continue/arc') {
          const draftId = (parsed.searchParams.get('draftId') ?? parsed.searchParams.get('id') ?? '').trim();
          const token = (parsed.searchParams.get('token') ?? '').trim();
          return { looksLikeArcDraft: true, draftId, token };
        }
        // Supabase redirect edge-function format: /arc-drafts-redirect/c/<draftId>?token=...
        const m = /^\/arc-drafts-redirect\/c\/([^/]+)$/.exec(path);
        if (m?.[1]) {
          let draftId = '';
          try {
            draftId = decodeURIComponent(m[1]).trim();
          } catch {
            draftId = m[1].trim();
          }
          const token = (parsed.searchParams.get('token') ?? '').trim();
          return { looksLikeArcDraft: true, draftId, token };
        }
      }
    }
  } catch {
    // ignore
  }
  return { looksLikeArcDraft: false, draftId: '', token: '' };
}

export async function claimArcDraft(params: { draftId: string; token: string }): Promise<ArcDraftPayload> {
  const base = getEdgeFunctionUrl('arc-drafts-claim');
  if (!base) throw new Error('ArcDraft claim service not configured');

  const session = await ensureSignedInWithPrompt('claim_arc_draft');
  const accessToken = session?.access_token ?? null;
  if (!accessToken) throw new Error('Missing access token (not signed in)');

  const res = await fetch(base, {
    method: 'POST',
    headers: await buildEdgeHeaders(accessToken),
    body: JSON.stringify({ draftId: params.draftId, token: params.token }),
  });
  const rawText = await res.text().catch(() => null);

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  const payload = coerceArcDraftPayload(data?.payload);
  if (!res.ok || !payload) {
    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to claim Arc draft (status ${res.status})`;
    const bodyPreview = typeof rawText === 'string' && rawText.length ? rawText.slice(0, 500) : '(empty)';
    throw new Error(`[arc-drafts-claim] ${msg}\\nstatus=${res.status}\\nbody=${bodyPreview}`);
  }

  return payload;
}

/**
 * Side-effect deep link handler (not a navigation path) so the flow works even
 * if the navigation linking config doesn't include it yet.
 *
 * Supported formats:
 * - kwilt://arc-draft?draftId=<id>&token=<token>
 * - https://kwilt.app/continue/arc?id=<id>&token=<token>
 */
export async function handleIncomingArcDraftUrl(
  url: string,
  capture?: (event: AnalyticsEventName, props?: AnalyticsProps) => void,
): Promise<boolean> {
  const { looksLikeArcDraft, draftId, token } = parseArcDraftUrl(url);
  if (!looksLikeArcDraft) return false;
  if (!draftId || !token) return true;

  capture?.(AnalyticsEvent.ArcDraftClaimAttempted, { source: 'deep_link' });

  try {
    const payload = await claimArcDraft({ draftId, token });
    useArcDraftClaimStore.getState().setClaimed({ draftId, payload });
    capture?.(AnalyticsEvent.ArcDraftClaimSucceeded, { draft_id: draftId, version: payload.version });

    // Route into the Arcs canvas flow that continues Arc creation from the claimed draft.
    rootNavigationRef.navigate('ArcsStack', { screen: 'ArcDraftContinue' } as any);
  } catch (e: any) {
    capture?.(AnalyticsEvent.ArcDraftClaimFailed, {
      draft_id: draftId,
      error_message: typeof e?.message === 'string' ? e.message.slice(0, 180) : 'unknown',
    });
    throw e;
  }

  return true;
}



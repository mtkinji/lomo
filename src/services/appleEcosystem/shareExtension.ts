import { Platform } from 'react-native';
import { useToastStore } from '../../store/useToastStore';
import { getAppGroupString, setAppGroupString } from './appGroup';
import { useShareIntentStore } from '../../store/useShareIntentStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';

export const KWILT_SHARE_PAYLOAD_KEY = 'kwilt_share_payload_v1';

export type KwiltSharePayloadV1 = {
  version: 1;
  createdAtMs: number;
  items: Array<{
    type: 'url' | 'text' | 'image' | 'file' | string;
    value: string;
    uti?: string | null;
  }>;
};

export async function readLatestSharePayload(): Promise<KwiltSharePayloadV1 | null> {
  if (Platform.OS !== 'ios') return null;
  const raw = await getAppGroupString(KWILT_SHARE_PAYLOAD_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as KwiltSharePayloadV1;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearLatestSharePayload(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await setAppGroupString(KWILT_SHARE_PAYLOAD_KEY, '');
}

/**
 * Side-effect deep link handler for the iOS Share Extension.
 *
 * Supported formats:
 * - kwilt://share
 * - kwilt://share?source=share_extension
 * - exp://.../--/share (Expo Go/dev)
 * - https://go.kwilt.app/share (optional universal-link future-proofing)
 */
export async function handleIncomingShareUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    let looksLikeShare = false;

    // 1) Production/dev-build: kwilt://share
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'share') {
      looksLikeShare = true;
    }

    // 2) Expo Go/dev: exp://.../--/share
    if (!looksLikeShare && (parsed.protocol === 'exp:' || parsed.protocol === 'exps:')) {
      const path = parsed.pathname ?? '';
      if (path.endsWith('/share') || path.endsWith('/--/share') || path.includes('/--/share')) {
        looksLikeShare = true;
      }
    }

    // 3) Optional universal link support: https://go.kwilt.app/share
    if (!looksLikeShare && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
      const host = (parsed.hostname ?? '').toLowerCase();
      if ((host === 'go.kwilt.app' || host === 'kwilt.app') && (parsed.pathname === '/share' || parsed.pathname === '/s')) {
        looksLikeShare = true;
      }
    }

    if (!looksLikeShare) return false;

    const payload = await readLatestSharePayload();
    if (!payload) {
      useToastStore.getState().showToast({
        message: 'Opened from Share Sheet',
        variant: 'default',
        durationMs: 2200,
      });
      return true;
    }

    // Persist in memory for the in-app workflow, and clear App Group storage so we don't
    // re-process this share on next app open.
    useShareIntentStore.getState().setPayload(payload);
    void clearLatestSharePayload();

    // Route the user into the Agent workspace to decide what to create.
    // This preserves the app shell/canvas and avoids forcing a particular tab.
    try {
      rootNavigationRef.navigate('Agent' as never);
    } catch {
      // Best-effort: don't block share completion if navigation isn't ready yet.
    }

    const first = payload.items.find((i) => typeof i?.value === 'string' && i.value.trim().length > 0);
    const count = payload.items.length;
    const label =
      first?.type === 'url'
        ? 'Saved link'
        : first?.type === 'image'
          ? 'Saved image'
          : first?.type === 'text'
            ? 'Saved text'
            : 'Saved from Share Sheet';

    useToastStore.getState().showToast({
      message: count > 1 ? `${label} (+${count - 1})` : label,
      variant: 'success',
      durationMs: 2600,
    });

    return true;
  } catch {
    return false;
  }
}



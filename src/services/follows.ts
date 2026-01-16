/**
 * Follows service (Duolingo-style).
 *
 * Asymmetric follower relationships:
 * - I can follow you without approval
 * - You can follow back optionally
 *
 * Also includes a block list for abuse/privacy.
 */

import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { Alert } from 'react-native';
import { getSupabaseClient } from './backend/supabaseClient';
import { ensureSignedInWithPrompt, getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';
import { useToastStore } from '../store/useToastStore';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { shouldShowLowPriorityMomentNow } from './moments/orchestrator';

async function buildEdgeHeaders(requireAuth: boolean, accessToken?: string | null): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);

  if (requireAuth) {
    const token = (accessToken ?? (await getAccessToken()))?.trim();
    if (!token) throw new Error('Missing access token (not signed in)');
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FollowUser = {
  /** Follow row id */
  id: string;
  /** The other user's id (follower or followed depending on list) */
  userId: string;
  createdAt: string;
  name: string | null;
  avatarUrl: string | null;
};

export type FollowInvite = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  uses: number;
  maxUses: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Invites (shareable "follow me" link)
// ─────────────────────────────────────────────────────────────────────────────

export type CreateFollowInviteParams = {
  expiresInDays?: number;
  maxUses?: number;
};

export async function createFollowInvite(params: CreateFollowInviteParams = {}): Promise<FollowInvite | null> {
  const base = getEdgeFunctionUrl('follow-invite-create');
  if (!base) return null;

  const token = await getAccessToken();
  if (!token) return null;

  try {
    const headers = await buildEdgeHeaders(true);
    headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        expiresInDays: params.expiresInDays ?? 7,
        maxUses: params.maxUses ?? 1,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.warn('[follows] Failed to create follow invite:', error);
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      code: data.code,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      uses: data.uses ?? 0,
      maxUses: data.maxUses ?? 1,
    };
  } catch (err) {
    console.warn('[follows] Error creating invite:', err);
    return null;
  }
}

export type AcceptFollowInviteResult = {
  success: boolean;
  followedUserId?: string;
  error?: string;
};

export async function acceptFollowInvite(code: string): Promise<AcceptFollowInviteResult> {
  const base = getEdgeFunctionUrl('follow-invite-accept');
  if (!base) return { success: false, error: 'Service unavailable' };

  const session = await ensureSignedInWithPrompt('follow');
  const accessToken = session?.access_token ?? null;

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true, accessToken),
      body: JSON.stringify({ code }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error?.message || data.message || 'Failed to follow' };
    }

    const followedUserId = typeof data?.followedUserId === 'string' ? data.followedUserId : undefined;
    return { success: true, followedUserId };
  } catch (err) {
    console.warn('[follows] Error accepting invite:', err);
    return { success: false, error: 'Network error' };
  }
}

export function buildFollowInviteUrl(code: string): string {
  // Keep it short and stable for marketing/universal-link handoff.
  return `https://kwilt.app/f/${code}`;
}

export function buildFollowOpenUrl(code: string): { primary: string; alt: string } {
  const isExpoGo = Constants.appOwnership === 'expo';
  const primary = isExpoGo
    ? AuthSession.makeRedirectUri({
        path: 'follow',
        queryParams: { code },
        preferLocalhost: false,
      })
    : `kwilt://follow?code=${encodeURIComponent(code)}`;
  const alt = `kwilt://follow?code=${encodeURIComponent(code)}`;
  return { primary, alt };
}

/**
 * Side-effect deep link handler for follow invites.
 *
 * Supported formats:
 * - kwilt://follow?code=<code>
 * - exp://.../--/follow?code=<code> (Expo Go)
 * - https://kwilt.app/f/<code> (and go.kwilt.app)
 */
export async function handleIncomingFollowUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    let code = '';
    let looksLikeFollow = false;

    // 1) kwilt://follow?code=...
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'follow') {
      looksLikeFollow = true;
      code = (parsed.searchParams.get('code') ?? '').trim();
    }

    // 2) Expo Go format: exp://.../--/follow?code=...
    if (!code && (parsed.protocol === 'exp:' || parsed.protocol === 'exps:')) {
      const path = parsed.pathname ?? '';
      if (path.endsWith('/follow') || path.endsWith('/--/follow') || path.includes('/--/follow')) {
        looksLikeFollow = true;
        code = (parsed.searchParams.get('code') ?? '').trim();
      }
    }

    // 3) Universal link format:
    // - https://kwilt.app/f/<code>
    // - https://go.kwilt.app/f/<code>
    if (!code && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
      const host = (parsed.hostname ?? '').toLowerCase();
      if (host === 'go.kwilt.app' || host === 'kwilt.app') {
        const m = /^\/f\/([^/]+)$/.exec(parsed.pathname ?? '');
        if (m?.[1]) {
          looksLikeFollow = true;
          try {
            code = decodeURIComponent(m[1]).trim();
          } catch {
            code = m[1].trim();
          }
        }
      }
    }

    if (!looksLikeFollow) return false;
    if (!code) return true;

    const result = await acceptFollowInvite(code);
    if (!result.success) {
      useToastStore.getState().showToast({
        message: result.error || 'Unable to follow',
        variant: 'danger',
        durationMs: 2600,
      });
      return true;
    }

    const ok = shouldShowLowPriorityMomentNow('follow_navigation').ok;
    if (ok) {
      useToastStore.getState().showToast({
        message: 'Following added',
        variant: 'success',
        durationMs: 2200,
        // If an interstitial is currently owning attention, don't surface this later.
        behaviorDuringSuppression: 'drop',
        actionLabel: 'View',
        actionOnPress: () => {
          if (!rootNavigationRef.isReady()) return;
          rootNavigationRef.navigate('Settings', { screen: 'SettingsFriends' } as any);
        },
      });
    }

    // Lowest priority: do not auto-navigate if it might interrupt other flows.
    // The toast includes an explicit "View" CTA instead.
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph operations
// ─────────────────────────────────────────────────────────────────────────────

async function getBlockedIdsForMe(): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from('kwilt_blocks').select('blocked_id').eq('blocker_id', user.id);
  const out = new Set<string>();
  for (const row of data ?? []) {
    if (row?.blocked_id) out.add(String(row.blocked_id));
  }
  return out;
}

async function hydrateProfiles(userIds: string[]): Promise<Map<string, { name: string | null; avatarUrl: string | null }>> {
  const supabase = getSupabaseClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);
  const map = new Map<string, { name: string | null; avatarUrl: string | null }>();
  for (const p of profiles ?? []) {
    map.set(String(p.id), {
      name: typeof p.display_name === 'string' ? p.display_name : null,
      avatarUrl: typeof p.avatar_url === 'string' ? p.avatar_url : null,
    });
  }
  return map;
}

export async function listFollowing(limit = 100): Promise<FollowUser[]> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const blocked = await getBlockedIdsForMe();

  const { data, error } = await supabase
    .from('kwilt_follows')
    .select('id, followed_id, created_at')
    .eq('follower_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[follows] Failed to list following:', error.message);
    return [];
  }

  const rows = (data ?? []).filter((r) => !blocked.has(String(r.followed_id)));
  const ids = rows.map((r) => String(r.followed_id));
  const profileMap = ids.length ? await hydrateProfiles(ids) : new Map();

  return rows.map((r) => {
    const u = String(r.followed_id);
    const p = profileMap.get(u);
    return {
      id: String(r.id),
      userId: u,
      createdAt: String(r.created_at),
      name: p?.name ?? null,
      avatarUrl: p?.avatarUrl ?? null,
    };
  });
}

export async function listFollowers(limit = 100): Promise<FollowUser[]> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return [];

  const blocked = await getBlockedIdsForMe();

  const { data, error } = await supabase
    .from('kwilt_follows')
    .select('id, follower_id, created_at')
    .eq('followed_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[follows] Failed to list followers:', error.message);
    return [];
  }

  const rows = (data ?? []).filter((r) => !blocked.has(String(r.follower_id)));
  const ids = rows.map((r) => String(r.follower_id));
  const profileMap = ids.length ? await hydrateProfiles(ids) : new Map();

  return rows.map((r) => {
    const u = String(r.follower_id);
    const p = profileMap.get(u);
    return {
      id: String(r.id),
      userId: u,
      createdAt: String(r.created_at),
      name: p?.name ?? null,
      avatarUrl: p?.avatarUrl ?? null,
    };
  });
}

export async function followUser(userIdToFollow: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const target = userIdToFollow.trim();
  if (!target || target === user.id) return false;

  const { error } = await supabase.from('kwilt_follows').insert({
    follower_id: user.id,
    followed_id: target,
    status: 'active',
  });

  if (error) {
    // Unique violation means we're already following; treat as success.
    if ((error as any)?.code === '23505') return true;
    console.warn('[follows] Failed to follow user:', error.message);
    return false;
  }
  return true;
}

export async function unfollowUser(userIdToUnfollow: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const target = userIdToUnfollow.trim();
  if (!target || target === user.id) return false;

  const { error } = await supabase
    .from('kwilt_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followed_id', target);

  if (error) {
    console.warn('[follows] Failed to unfollow user:', error.message);
    return false;
  }
  return true;
}

export async function blockUser(userIdToBlock: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const target = userIdToBlock.trim();
  if (!target || target === user.id) return false;

  // Confirm (block is strong)
  const confirmed = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Block user?',
      'They won’t be able to see your milestones, and you won’t see theirs.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true },
    );
  });
  if (!confirmed) return false;

  // Create a block row (idempotent)
  const { error: blockErr } = await supabase
    .from('kwilt_blocks')
    .upsert({ blocker_id: user.id, blocked_id: target }, { onConflict: 'blocker_id,blocked_id' });

  if (blockErr) {
    console.warn('[follows] Failed to block user:', blockErr.message);
    return false;
  }

  // Best-effort: also unfollow them so your lists are clean.
  await supabase.from('kwilt_follows').delete().eq('follower_id', user.id).eq('followed_id', target);
  return true;
}



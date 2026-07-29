/**
 * Friendships service.
 *
 * Manages mutual Friend relationships separately from every content membership.
 * Friendship grants no Goal, milestone, feed, Household, or capability access.
 *
 * Key design decisions:
 * - Two-party consent: inviter sends a link/request and the recipient accepts
 * - Invite-only: No public search/discovery (preserves privacy)
 * - Uses existing kwilt_invites infrastructure for invite codes
 *
 * @see docs/feature-briefs/social-dynamics-evolution.md (Phase 3)
 */

import { getSupabaseClient } from './backend/supabaseClient';
import { getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
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
    const token = (await getAccessToken())?.trim();
    if (!token) throw new Error('Missing access token (not signed in)');
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'active' | 'ended' | 'blocked';
export type FriendshipAction = 'accept' | 'decline' | 'end' | 'block';

export type Friend = {
  id: string; // friendship row ID
  friendUserId: string;
  status: FriendshipStatus;
  /** True if current user sent the request */
  initiatedByMe: boolean;
  createdAt: string;
  acceptedAt: string | null;
  // Profile info (joined from profiles)
  name: string | null;
  avatarUrl: string | null;
};

export type FriendInvite = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  uses: number;
  maxUses: number;
};

export type PendingFriendRequest = {
  friendshipId: string;
  fromUserId: string;
  fromUserName: string | null;
  fromUserAvatarUrl: string | null;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create friend invite
// ─────────────────────────────────────────────────────────────────────────────

export type CreateFriendInviteParams = {
  /** Optional custom expiration (defaults to 7 days) */
  expiresInDays?: number;
  /** Max uses (defaults to 1 for direct invites) */
  maxUses?: number;
};

/**
 * Create a friend invite link.
 *
 * The invite code can be shared with potential friends. When they accept,
 * a pending friendship is created that the inviter must also accept (bi-directional).
 */
export async function createFriendInvite(
  params: CreateFriendInviteParams = {}
): Promise<FriendInvite | null> {
  const base = getEdgeFunctionUrl('friend-invite-create');
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
      console.warn('[friendships] Failed to create invite:', error);
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
    console.warn('[friendships] Error creating invite:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept friend invite
// ─────────────────────────────────────────────────────────────────────────────

export type AcceptFriendInviteResult = {
  success: boolean;
  friendshipId?: string;
  status?: 'active';
  replayed?: boolean;
  error?: string;
};

/**
 * Accept a friend invite by code.
 *
 * Activates the relationship after recipient acceptance. Deliberately sending
 * the link was the inviter's affirmative action; no third confirmation exists.
 */
export async function acceptFriendInvite(code: string): Promise<AcceptFriendInviteResult> {
  const base = getEdgeFunctionUrl('friend-invite-accept');
  if (!base) return { success: false, error: 'Service unavailable' };

  const token = await getAccessToken();
  if (!token) return { success: false, error: 'Not signed in' };

  try {
    const headers = await buildEdgeHeaders(true);
    headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || data.message || 'Failed to accept invite',
      };
    }

    return {
      success: true,
      friendshipId: data.friendshipId,
      status: data.status === 'active' ? 'active' : undefined,
      replayed: data.replayed === true,
    };
  } catch (err) {
    console.warn('[friendships] Error accepting invite:', err);
    return { success: false, error: 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-authorized friendship transitions
// ─────────────────────────────────────────────────────────────────────────────

async function transitionFriendship(
  friendshipId: string,
  action: FriendshipAction,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('transition_kwilt_friendship', {
    p_friendship_id: friendshipId,
    p_action: action,
  });

  if (error) {
    console.warn(`[friendships] Failed to ${action} relationship:`, error.message);
    return false;
  }

  return true;
}

export const acceptFriendRequest = (friendshipId: string) =>
  transitionFriendship(friendshipId, 'accept');
export const declineFriendRequest = (friendshipId: string) =>
  transitionFriendship(friendshipId, 'decline');
export const endFriendship = (friendshipId: string) =>
  transitionFriendship(friendshipId, 'end');
export const blockFriendship = (friendshipId: string) =>
  transitionFriendship(friendshipId, 'block');

type FriendshipProjectionRow = {
  friendship_id: string;
  friend_user_id: string;
  relationship_status: 'pending' | 'active';
  initiated_by_me: boolean;
  incoming_request: boolean;
  created_at: string;
  accepted_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function loadFriendshipProjection(): Promise<FriendshipProjectionRow[]> {
  const { data, error } = await getSupabaseClient().rpc('get_kwilt_friendships');
  if (error) {
    console.warn('[friendships] Failed to load safe relationship projection:', error.message);
    return [];
  }
  return Array.isArray(data) ? (data as FriendshipProjectionRow[]) : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// List friends
// ─────────────────────────────────────────────────────────────────────────────

export type ListFriendsParams = {
  /** Filter by status (default: 'active') */
  status?: FriendshipStatus | 'all';
  /** Maximum results */
  limit?: number;
};

/**
 * List the current user's friends.
 */
export async function listFriends(params: ListFriendsParams = {}): Promise<Friend[]> {
  const status = params.status ?? 'active';
  const limit = params.limit ?? 50;
  const rows = await loadFriendshipProjection();
  return rows
    .filter((row) => status === 'all' || row.relationship_status === status)
    .slice(0, limit)
    .map((row) => ({
      id: row.friendship_id,
      friendUserId: row.friend_user_id,
      status: row.relationship_status,
      initiatedByMe: row.initiated_by_me,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      name: row.display_name,
      avatarUrl: row.avatar_url,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Get pending friend requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending friend requests sent TO the current user (not by them).
 */
export async function getPendingFriendRequests(): Promise<PendingFriendRequest[]> {
  const rows = await loadFriendshipProjection();
  return rows
    .filter((row) => row.relationship_status === 'pending' && row.incoming_request)
    .map((row) => ({
      friendshipId: row.friendship_id,
      fromUserId: row.friend_user_id,
      fromUserName: row.display_name,
      fromUserAvatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Count friends
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the count of active friends.
 */
export async function getFriendCount(): Promise<number> {
  return (await listFriends()).length;
}

/**
 * Get the count of pending friend requests (incoming).
 */
export async function getPendingRequestCount(): Promise<number> {
  return (await getPendingFriendRequests()).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build friend invite URL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a shareable friend invite URL.
 */
export function buildFriendInviteUrl(code: string): string {
  // Use the same URL pattern as goal invites
  return `https://kwilt.app/friend/${code}`;
}

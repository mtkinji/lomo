/**
 * Friendships service.
 *
 * Manages bi-directional friend relationships separate from shared-goal memberships.
 * Friends can see each other's milestones and send congratulations (Phase 4+).
 *
 * Key design decisions:
 * - Bi-directional: Both users must accept to establish friendship
 * - Invite-only: No public search/discovery (preserves privacy)
 * - Uses existing kwilt_invites infrastructure for invite codes
 *
 * @see docs/prds/social-dynamics-evolution-prd.md (Phase 3)
 */

import { getSupabaseClient } from './backend/supabaseClient';
import { getAccessToken, getEdgeFunctionUrl, buildEdgeHeaders } from './backend/supabaseHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'active' | 'blocked';

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
  error?: string;
};

/**
 * Accept a friend invite by code.
 *
 * Creates a pending friendship that the inviter can then accept.
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
    };
  } catch (err) {
    console.warn('[friendships] Error accepting invite:', err);
    return { success: false, error: 'Network error' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept/confirm friend request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accept a pending friend request (makes the friendship active).
 *
 * This is called by the recipient of a friend request to confirm the friendship.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn('[friendships] Not signed in');
    return false;
  }

  // Update the friendship to active
  const { error } = await supabase
    .from('kwilt_friendships')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', friendshipId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq('status', 'pending');

  if (error) {
    console.warn('[friendships] Failed to accept request:', error.message);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Decline/block friend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decline a pending friend request or block an existing friend.
 */
export async function declineOrBlockFriend(friendshipId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { error } = await supabase
    .from('kwilt_friendships')
    .update({ status: 'blocked' })
    .eq('id', friendshipId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  if (error) {
    console.warn('[friendships] Failed to decline/block:', error.message);
    return false;
  }

  return true;
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
  const supabase = getSupabaseClient();
  const status = params.status ?? 'active';
  const limit = params.limit ?? 50;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  let query = supabase
    .from('kwilt_friendships')
    .select('id, user_a, user_b, status, initiated_by, created_at, accepted_at')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[friendships] Failed to list friends:', error.message);
    return [];
  }

  // Map to Friend type and fetch profile info
  const friendships = (data ?? []).map((row) => {
    const friendUserId = row.user_a === user.id ? row.user_b : row.user_a;
    return {
      id: row.id,
      friendUserId,
      status: row.status as FriendshipStatus,
      initiatedByMe: row.initiated_by === user.id,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      name: null as string | null,
      avatarUrl: null as string | null,
    };
  });

  // Fetch profile info for friends
  if (friendships.length > 0) {
    const friendIds = friendships.map((f) => f.friendUserId);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', friendIds);

    if (profiles) {
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      for (const friend of friendships) {
        const profile = profileMap.get(friend.friendUserId);
        if (profile) {
          friend.name = profile.display_name;
          friend.avatarUrl = profile.avatar_url;
        }
      }
    }
  }

  return friendships;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get pending friend requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending friend requests sent TO the current user (not by them).
 */
export async function getPendingFriendRequests(): Promise<PendingFriendRequest[]> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  // Get pending friendships where current user is NOT the initiator
  const { data, error } = await supabase
    .from('kwilt_friendships')
    .select('id, user_a, user_b, initiated_by, created_at')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq('status', 'pending')
    .neq('initiated_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[friendships] Failed to get pending requests:', error.message);
    return [];
  }

  // Map and fetch profile info
  const requests = (data ?? []).map((row) => {
    const fromUserId = row.initiated_by;
    return {
      friendshipId: row.id,
      fromUserId,
      fromUserName: null as string | null,
      fromUserAvatarUrl: null as string | null,
      createdAt: row.created_at,
    };
  });

  if (requests.length > 0) {
    const userIds = requests.map((r) => r.fromUserId);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    if (profiles) {
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      for (const request of requests) {
        const profile = profileMap.get(request.fromUserId);
        if (profile) {
          request.fromUserName = profile.display_name;
          request.fromUserAvatarUrl = profile.avatar_url;
        }
      }
    }
  }

  return requests;
}

// ─────────────────────────────────────────────────────────────────────────────
// Count friends
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the count of active friends.
 */
export async function getFriendCount(): Promise<number> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('kwilt_friendships')
    .select('*', { count: 'exact', head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq('status', 'active');

  if (error) {
    console.warn('[friendships] Failed to count friends:', error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get the count of pending friend requests (incoming).
 */
export async function getPendingRequestCount(): Promise<number> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('kwilt_friendships')
    .select('*', { count: 'exact', head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq('status', 'pending')
    .neq('initiated_by', user.id);

  if (error) {
    console.warn('[friendships] Failed to count pending requests:', error.message);
    return 0;
  }

  return count ?? 0;
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


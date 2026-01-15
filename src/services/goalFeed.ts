/**
 * Goal feed service for shared goals.
 *
 * Aggregates feed events (check-ins, joins, reactions) into a unified feed
 * for display in the Goal detail screen.
 *
 * @see docs/prds/social-goals-auth-prd.md
 */

import { getSupabaseClient } from './backend/supabaseClient';
import type { CheckinPreset } from './checkins';
import { fetchReactionSummaries, type ReactionSummary } from './reactions';
import { listGoalMembers, type SharedMember } from './sharedGoals';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FeedEventType =
  | 'checkin_submitted'
  | 'member_joined'
  | 'member_left'
  | 'invite_created';

export type FeedItem = {
  id: string;
  type: FeedEventType;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
  /** Payload varies by event type */
  payload: Record<string, unknown>;
  /** Reaction summary (populated for events that support reactions) */
  reactions?: ReactionSummary;
};

export type CheckinFeedItem = FeedItem & {
  type: 'checkin_submitted';
  payload: {
    checkinId: string;
    preset: CheckinPreset | null;
    text: string | null;
    hasText: boolean;
  };
};

export type MemberJoinedFeedItem = FeedItem & {
  type: 'member_joined';
  payload: {
    role?: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch goal feed
// ─────────────────────────────────────────────────────────────────────────────

export type FetchGoalFeedParams = {
  goalId: string;
  limit?: number;
  /** ISO timestamp to fetch events before (for pagination) */
  before?: string;
  /** Whether to include reaction summaries (requires extra query) */
  includeReactions?: boolean;
};

export type GoalFeedResult = {
  items: FeedItem[];
  /** Map of userId -> member info for actor lookup */
  members: Map<string, SharedMember>;
  /** Whether there are more items to load */
  hasMore: boolean;
};

/**
 * Fetch the feed for a shared goal.
 *
 * Returns a unified feed combining:
 * - Check-ins (checkin_submitted)
 * - Member joins (member_joined)
 * - Other relevant events
 *
 * Events are returned in reverse chronological order (newest first).
 */
export async function fetchGoalFeed(params: FetchGoalFeedParams): Promise<GoalFeedResult> {
  const supabase = getSupabaseClient();
  const limit = params.limit ?? 20;
  const includeReactions = params.includeReactions ?? true;

  // Fetch feed events
  let query = supabase
    .from('kwilt_feed_events')
    .select('id, entity_id, actor_id, type, payload, created_at')
    .eq('entity_type', 'goal')
    .eq('entity_id', params.goalId)
    // Filter to displayable event types (exclude reaction_added, etc.)
    .in('type', ['checkin_submitted', 'member_joined', 'member_left', 'invite_created'])
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 to detect hasMore

  if (params.before) {
    query = query.lt('created_at', params.before);
  }

  const [feedResult, membersResult, checkinsResult] = await Promise.all([
    query,
    listGoalMembers(params.goalId),
    // Also fetch check-in details to get the text content
    fetchCheckinDetails(params.goalId, limit, params.before),
  ]);

  if (feedResult.error) {
    console.warn('[goalFeed] Failed to fetch feed:', feedResult.error.message);
    return { items: [], members: new Map(), hasMore: false };
  }

  const data = feedResult.data ?? [];
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  // Build member lookup map
  const members = new Map<string, SharedMember>();
  for (const member of membersResult ?? []) {
    members.set(member.userId, member);
  }

  // Build check-in details lookup
  const checkinDetails = new Map<string, { preset: string | null; text: string | null }>();
  for (const checkin of checkinsResult) {
    checkinDetails.set(checkin.id, { preset: checkin.preset, text: checkin.text });
  }

  // Transform to FeedItem
  const feedItems: FeedItem[] = items.map((row) => {
    const actor = row.actor_id ? members.get(row.actor_id) : null;
    const payload = (row.payload ?? {}) as Record<string, unknown>;

    // Enrich check-in events with text content
    if (row.type === 'checkin_submitted') {
      const checkinId = payload.checkinId as string | undefined;
      const details = checkinId ? checkinDetails.get(checkinId) : null;
      if (details) {
        payload.text = details.text;
        payload.preset = details.preset;
      }
    }

    return {
      id: row.id,
      type: row.type as FeedEventType,
      actorId: row.actor_id,
      actorName: actor?.name ?? null,
      actorAvatarUrl: actor?.avatarUrl ?? null,
      createdAt: row.created_at,
      payload,
    };
  });

  // Fetch reaction summaries if requested
  if (includeReactions && feedItems.length > 0) {
    const eventIds = feedItems.map((item) => item.id);
    const reactionSummaries = await fetchReactionSummaries({
      goalId: params.goalId,
      feedEventIds: eventIds,
    });

    for (const item of feedItems) {
      item.reactions = reactionSummaries[item.id];
    }
  }

  return { items: feedItems, members, hasMore };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fetch check-in details
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCheckinDetails(
  goalId: string,
  limit: number,
  before?: string
): Promise<{ id: string; preset: string | null; text: string | null }[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('goal_checkins')
    .select('id, preset, text')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[goalFeed] Failed to fetch check-in details:', error.message);
    return [];
  }

  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime subscription (optional)
// ─────────────────────────────────────────────────────────────────────────────

export type FeedSubscriptionCallback = (event: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}) => void;

/**
 * Subscribe to feed updates for a goal.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToGoalFeed(
  goalId: string,
  callback: FeedSubscriptionCallback
): () => void {
  const supabase = getSupabaseClient();

  const channel = supabase
    .channel(`goal_feed:${goalId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kwilt_feed_events',
        filter: `entity_id=eq.${goalId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Record<string, unknown> | null,
          old: payload.old as Record<string, unknown> | null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


/**
 * Reactions service for shared goals feed events.
 *
 * Reactions (cheers) are lightweight social signals that members can add
 * to feed events like check-ins. They provide encouragement without
 * requiring a full conversation.
 *
 * @see docs/prds/social-goals-auth-prd.md
 */

import { getSupabaseClient } from './backend/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constrained set of reaction types.
 * Keeping this small and positive reinforces the supportive, signals-only vibe.
 */
export type ReactionType = 'cheer' | 'heart' | 'clap' | 'fire';

export const REACTION_TYPES: { id: ReactionType; emoji: string; label: string }[] = [
  { id: 'cheer', emoji: '🎉', label: 'Cheer' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
];

export type Reaction = {
  id: string;
  feedEventId: string;
  userId: string;
  reaction: ReactionType;
  createdAt: string;
  // Joined from user profile (optional)
  userName?: string | null;
  userAvatarUrl?: string | null;
};

export type ReactionSummary = {
  feedEventId: string;
  counts: Record<ReactionType, number>;
  /** Current user's reaction on this event, if any */
  myReaction: ReactionType | null;
  /** Total reaction count across all types */
  total: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Add a reaction
// ─────────────────────────────────────────────────────────────────────────────

export type AddReactionParams = {
  /** The goal ID (for RLS membership check context) */
  goalId: string;
  /** The feed event ID to react to */
  feedEventId: string;
  /** The reaction type */
  reaction: ReactionType;
};

/**
 * Add a reaction to a feed event.
 *
 * This uses the feed events table itself to store reactions (type: 'reaction_added'),
 * following the PRD's suggestion to model reactions as feed events.
 *
 * Idempotent: If the user already has a reaction on this event, it will be updated.
 */
export async function addReaction(params: AddReactionParams): Promise<void> {
  const supabase = getSupabaseClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to react');
  }

  // Check if user already has a reaction on this event
  const { data: existing } = await supabase
    .from('kwilt_feed_events')
    .select('id')
    .eq('entity_type', 'goal')
    .eq('entity_id', params.goalId)
    .eq('type', 'reaction_added')
    .eq('actor_id', user.id)
    .eq('payload->>targetEventId', params.feedEventId)
    .maybeSingle();

  if (existing) {
    // Update existing reaction
    const { error: updateError } = await supabase
      .from('kwilt_feed_events')
      .update({
        payload: {
          targetEventId: params.feedEventId,
          reaction: params.reaction,
        },
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Failed to update reaction: ${updateError.message}`);
    }
  } else {
    // Insert new reaction
    const { error: insertError } = await supabase.from('kwilt_feed_events').insert({
      entity_type: 'goal',
      entity_id: params.goalId,
      actor_id: user.id,
      type: 'reaction_added',
      payload: {
        targetEventId: params.feedEventId,
        reaction: params.reaction,
      },
    });

    if (insertError) {
      if (insertError.code === '42501' || insertError.message?.includes('policy')) {
        throw new Error('You must be a member of this shared goal to react');
      }
      throw new Error(`Failed to add reaction: ${insertError.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove a reaction
// ─────────────────────────────────────────────────────────────────────────────

export type RemoveReactionParams = {
  goalId: string;
  feedEventId: string;
};

/**
 * Remove the current user's reaction from a feed event.
 */
export async function removeReaction(params: RemoveReactionParams): Promise<void> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to remove a reaction');
  }

  // Note: RLS only allows SELECT on feed_events for members, not DELETE.
  // We'll need to either add a DELETE policy or use an edge function.
  // For now, we'll soft-delete by setting payload.removed = true.
  const { data: existing } = await supabase
    .from('kwilt_feed_events')
    .select('id')
    .eq('entity_type', 'goal')
    .eq('entity_id', params.goalId)
    .eq('type', 'reaction_added')
    .eq('actor_id', user.id)
    .eq('payload->>targetEventId', params.feedEventId)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('kwilt_feed_events')
      .update({
        payload: {
          targetEventId: params.feedEventId,
          removed: true,
        },
      })
      .eq('id', existing.id);

    if (updateError) {
      console.warn('[reactions] Failed to remove reaction:', updateError.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch reactions for feed events
// ─────────────────────────────────────────────────────────────────────────────

export type FetchReactionsParams = {
  goalId: string;
  /** Feed event IDs to fetch reactions for */
  feedEventIds: string[];
};

/**
 * Fetch reaction summaries for a set of feed events.
 *
 * Returns aggregated counts per reaction type, plus the current user's reaction.
 */
export async function fetchReactionSummaries(
  params: FetchReactionsParams
): Promise<Record<string, ReactionSummary>> {
  const supabase = getSupabaseClient();

  if (params.feedEventIds.length === 0) {
    return {};
  }

  // Get current user for "my reaction" lookup
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // Fetch all reaction events for these feed events
  const { data, error } = await supabase
    .from('kwilt_feed_events')
    .select('id, actor_id, payload, created_at')
    .eq('entity_type', 'goal')
    .eq('entity_id', params.goalId)
    .eq('type', 'reaction_added')
    .in('payload->>targetEventId', params.feedEventIds);

  if (error) {
    console.warn('[reactions] Failed to fetch reactions:', error.message);
    return {};
  }

  // Aggregate reactions by target event
  const summaries: Record<string, ReactionSummary> = {};

  // Initialize empty summaries for all requested events
  for (const eventId of params.feedEventIds) {
    summaries[eventId] = {
      feedEventId: eventId,
      counts: { cheer: 0, heart: 0, clap: 0, fire: 0 },
      myReaction: null,
      total: 0,
    };
  }

  // Process reaction events
  for (const row of data ?? []) {
    const payload = row.payload as { targetEventId?: string; reaction?: string; removed?: boolean };
    const targetEventId = payload?.targetEventId;
    const reaction = payload?.reaction as ReactionType | undefined;
    const removed = payload?.removed === true;

    if (!targetEventId || !reaction || removed) continue;
    if (!summaries[targetEventId]) continue;

    // Validate reaction type
    if (!REACTION_TYPES.some((r) => r.id === reaction)) continue;

    summaries[targetEventId].counts[reaction]++;
    summaries[targetEventId].total++;

    // Track current user's reaction
    if (currentUserId && row.actor_id === currentUserId) {
      summaries[targetEventId].myReaction = reaction;
    }
  }

  return summaries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the emoji for a reaction type.
 */
export function getReactionEmoji(reaction: ReactionType): string {
  const found = REACTION_TYPES.find((r) => r.id === reaction);
  return found?.emoji ?? '👍';
}


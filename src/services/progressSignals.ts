/**
 * Progress signals service for shared goals.
 *
 * Creates automatic feed events when users make progress on shared goals
 * (e.g., completing activities, completing goals). These signals replace
 * manual check-ins with zero-friction automatic updates.
 *
 * @see docs/prds/social-dynamics-evolution-prd.md
 */

import { getSupabaseClient } from './backend/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProgressSignalType = 'progress_made' | 'goal_completed';

export type CreateProgressSignalParams = {
  goalId: string;
  type: ProgressSignalType;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create progress signal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a progress signal feed event for a shared goal.
 *
 * This function:
 * 1. Checks if the user is authenticated
 * 2. Checks if the goal is shared (has >1 member)
 * 3. Creates the feed event if both conditions are met
 *
 * This is a fire-and-forget operation — it should not block the activity/goal
 * completion flow. Errors are logged but not thrown.
 *
 * @param params.goalId - The goal ID (may or may not be shared)
 * @param params.type - The type of progress signal
 */
export async function createProgressSignal(params: CreateProgressSignalParams): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // User not authenticated — can't create signal
      // This is expected for local-only users
      return;
    }

    // Check if this is a shared goal (has >1 member)
    const { data: members, error: membersError } = await supabase
      .from('kwilt_memberships')
      .select('user_id')
      .eq('entity_type', 'goal')
      .eq('entity_id', params.goalId)
      .eq('status', 'active')
      .limit(2);

    if (membersError || !members || members.length < 2) {
      // Not a shared goal (or error checking) — skip silently
      return;
    }

    // Create the feed event
    const { error: insertError } = await supabase.from('kwilt_feed_events').insert({
      entity_type: 'goal',
      entity_id: params.goalId,
      actor_id: user.id,
      type: params.type,
      payload: {},
    });

    if (insertError) {
      // Log but don't throw — this is fire-and-forget
      console.warn('[progressSignals] Failed to create signal:', insertError.message);
    }
  } catch (err) {
    // Catch any unexpected errors
    console.warn('[progressSignals] Unexpected error:', err);
  }
}


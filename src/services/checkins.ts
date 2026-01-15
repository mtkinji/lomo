/**
 * Check-in service for shared goals.
 *
 * Check-ins are the primary "signals-only" artifact in shared goals.
 * They represent an explicit, user-initiated signal that says "I engaged with this goal"
 * without revealing specifics about what activities were worked on.
 *
 * @see docs/prds/social-goals-auth-prd.md
 */

import { getSupabaseClient } from './backend/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preset options for quick check-ins.
 * These provide a low-friction way to signal engagement without typing.
 */
export type CheckinPreset =
  | 'made_progress'
  | 'struggled_today'
  | 'need_encouragement'
  | 'just_checking_in';

export const CHECKIN_PRESETS: { id: CheckinPreset; label: string; emoji: string }[] = [
  { id: 'made_progress', label: 'Made progress', emoji: '💪' },
  { id: 'struggled_today', label: 'Struggled today', emoji: '😓' },
  { id: 'need_encouragement', label: 'Need encouragement', emoji: '🤗' },
  { id: 'just_checking_in', label: 'Just checking in', emoji: '👋' },
];

export type Checkin = {
  id: string;
  goalId: string;
  userId: string;
  preset: CheckinPreset | null;
  text: string | null;
  createdAt: string;
  // Joined from user profile (optional, may not always be available)
  userName?: string | null;
  userAvatarUrl?: string | null;
};

export type SubmitCheckinParams = {
  goalId: string;
  preset?: CheckinPreset | null;
  text?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Submit a check-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a check-in for a shared goal.
 *
 * This creates:
 * 1. A row in `goal_checkins`
 * 2. A row in `kwilt_feed_events` (type: 'checkin_submitted')
 *
 * RLS ensures only members can submit check-ins for a goal.
 */
export async function submitCheckin(params: SubmitCheckinParams): Promise<Checkin> {
  const supabase = getSupabaseClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to check in');
  }

  // Insert the check-in
  const { data: checkin, error: checkinError } = await supabase
    .from('goal_checkins')
    .insert({
      goal_id: params.goalId,
      user_id: user.id,
      preset: params.preset ?? null,
      text: params.text?.trim() || null,
    })
    .select('id, goal_id, user_id, preset, text, created_at')
    .single();

  if (checkinError) {
    // RLS will return a 403-style error if not a member
    if (checkinError.code === '42501' || checkinError.message?.includes('policy')) {
      throw new Error('You must be a member of this shared goal to check in');
    }
    throw new Error(`Failed to submit check-in: ${checkinError.message}`);
  }

  // Also create a feed event for real-time visibility
  const { error: feedError } = await supabase.from('kwilt_feed_events').insert({
    entity_type: 'goal',
    entity_id: params.goalId,
    actor_id: user.id,
    type: 'checkin_submitted',
    payload: {
      checkinId: checkin.id,
      preset: params.preset ?? null,
      hasText: Boolean(params.text?.trim()),
    },
  });

  // Feed event insert is best-effort; don't fail the whole operation
  if (feedError) {
    console.warn('[checkins] Failed to create feed event:', feedError.message);
  }

  return {
    id: checkin.id,
    goalId: checkin.goal_id,
    userId: checkin.user_id,
    preset: checkin.preset as CheckinPreset | null,
    text: checkin.text,
    createdAt: checkin.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch check-ins
// ─────────────────────────────────────────────────────────────────────────────

export type FetchCheckinsParams = {
  goalId: string;
  limit?: number;
  /** ISO timestamp to fetch check-ins before (for pagination) */
  before?: string;
};

/**
 * Fetch recent check-ins for a shared goal.
 *
 * Returns check-ins in reverse chronological order (newest first).
 * RLS ensures only members can read check-ins.
 */
export async function fetchCheckins(params: FetchCheckinsParams): Promise<Checkin[]> {
  const supabase = getSupabaseClient();
  const limit = params.limit ?? 20;

  let query = supabase
    .from('goal_checkins')
    .select('id, goal_id, user_id, preset, text, created_at')
    .eq('goal_id', params.goalId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (params.before) {
    query = query.lt('created_at', params.before);
  }

  const { data, error } = await query;

  if (error) {
    // RLS returns empty for non-members, but let's handle explicit errors
    if (error.code === '42501' || error.message?.includes('policy')) {
      return []; // Not a member, return empty
    }
    throw new Error(`Failed to fetch check-ins: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    preset: row.preset as CheckinPreset | null,
    text: row.text,
    createdAt: row.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the display label for a preset.
 */
export function getPresetLabel(preset: CheckinPreset | null): string | null {
  if (!preset) return null;
  const found = CHECKIN_PRESETS.find((p) => p.id === preset);
  return found ? `${found.emoji} ${found.label}` : null;
}


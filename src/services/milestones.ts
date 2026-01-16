/**
 * Milestones service for server-side achievement tracking.
 *
 * This service mirrors significant local milestones to the server,
 * enabling future features like friend reactions on achievements (Phase 4+).
 *
 * Milestones are:
 * - Private by default (visibility controlled by friendship settings)
 * - Idempotent (recording the same milestone twice is a no-op)
 * - Best-effort (failures don't block local streak tracking)
 *
 * @see docs/prds/social-dynamics-evolution-prd.md (Phase 2B)
 */

import { getSupabaseClient } from './backend/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Milestone types that can be recorded.
 */
export type MilestoneType =
  // Show-up streaks
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_21'
  | 'streak_30'
  | 'streak_50'
  | 'streak_75'
  | 'streak_100'
  | 'streak_150'
  | 'streak_200'
  | 'streak_365'
  | 'streak_1000'
  // Focus streaks
  | 'focus_streak_3'
  | 'focus_streak_7'
  | 'focus_streak_14'
  | 'focus_streak_30'
  | 'focus_streak_50'
  | 'focus_streak_100'
  // Goal completions
  | 'goal_completed'
  // Custom milestones (yearly anniversaries, etc.)
  | 'streak_yearly'
  | 'streak_century'; // Every 100 days after 365

/**
 * Recorded milestone data.
 */
export type Milestone = {
  id: string;
  userId: string;
  milestoneType: MilestoneType;
  milestoneValue: number;
  achievedAt: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

/**
 * Parameters for recording a milestone.
 */
export type RecordMilestoneParams = {
  milestoneType: MilestoneType;
  milestoneValue: number;
  /** Optional ISO timestamp when milestone was achieved (defaults to now) */
  achievedAt?: string;
  /** Optional payload with additional context */
  payload?: Record<string, unknown>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Milestone thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Show-up streak thresholds that trigger milestone recording.
 * Matches the special milestones in useCelebrationStore.
 */
export const SHOWUP_STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365, 1000];

/**
 * Focus streak thresholds that trigger milestone recording.
 */
export const FOCUS_STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

/**
 * Get the milestone type for a given show-up streak value.
 */
export function getShowUpStreakMilestoneType(days: number): MilestoneType | null {
  if (SHOWUP_STREAK_MILESTONES.includes(days)) {
    return `streak_${days}` as MilestoneType;
  }
  // Yearly anniversaries
  if (days > 365 && days % 365 === 0) {
    return 'streak_yearly';
  }
  // Century milestones after 365
  if (days > 365 && days % 100 === 0) {
    return 'streak_century';
  }
  return null;
}

/**
 * Get the milestone type for a given focus streak value.
 */
export function getFocusStreakMilestoneType(days: number): MilestoneType | null {
  if (FOCUS_STREAK_MILESTONES.includes(days)) {
    return `focus_streak_${days}` as MilestoneType;
  }
  return null;
}

/**
 * Check if a show-up streak value is a recordable milestone.
 */
export function isShowUpStreakMilestone(days: number): boolean {
  return getShowUpStreakMilestoneType(days) !== null;
}

/**
 * Check if a focus streak value is a recordable milestone.
 */
export function isFocusStreakMilestone(days: number): boolean {
  return getFocusStreakMilestoneType(days) !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Record a milestone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a milestone to the server.
 *
 * This is idempotent - recording the same milestone twice is a no-op.
 * Failures are logged but don't throw - milestone recording is best-effort.
 *
 * @returns true if milestone was recorded (or already existed), false on error
 */
export async function recordMilestone(params: RecordMilestoneParams): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    // Not signed in - skip server recording
    console.log('[milestones] Skipping milestone record (not signed in)');
    return false;
  }

  try {
    const { error } = await supabase.from('user_milestones').upsert(
      {
        user_id: user.id,
        milestone_type: params.milestoneType,
        milestone_value: params.milestoneValue,
        achieved_at: params.achievedAt ?? new Date().toISOString(),
        payload: params.payload ?? {},
      },
      {
        onConflict: 'user_id,milestone_type,milestone_value',
        ignoreDuplicates: true,
      }
    );

    if (error) {
      console.warn('[milestones] Failed to record milestone:', error.message);
      return false;
    }

    console.log(
      `[milestones] Recorded milestone: ${params.milestoneType} (value: ${params.milestoneValue})`
    );
    return true;
  } catch (err) {
    console.warn('[milestones] Error recording milestone:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience functions for specific milestone types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a show-up streak milestone.
 *
 * Call this when the user's show-up streak reaches a milestone value.
 * Only records if the value is a recognized milestone threshold.
 */
export async function recordShowUpStreakMilestone(days: number): Promise<boolean> {
  const milestoneType = getShowUpStreakMilestoneType(days);
  if (!milestoneType) {
    return false;
  }

  return recordMilestone({
    milestoneType,
    milestoneValue: days,
    payload: {
      streakType: 'showup',
    },
  });
}

/**
 * Record a focus streak milestone.
 *
 * Call this when the user's focus streak reaches a milestone value.
 * Only records if the value is a recognized milestone threshold.
 */
export async function recordFocusStreakMilestone(days: number): Promise<boolean> {
  const milestoneType = getFocusStreakMilestoneType(days);
  if (!milestoneType) {
    return false;
  }

  return recordMilestone({
    milestoneType,
    milestoneValue: days,
    payload: {
      streakType: 'focus',
    },
  });
}

/**
 * Record a goal completion milestone.
 */
export async function recordGoalCompletedMilestone(params: {
  goalId: string;
  goalName?: string;
}): Promise<boolean> {
  return recordMilestone({
    milestoneType: 'goal_completed',
    milestoneValue: 1, // Could be used as a counter if we track "first goal", "10 goals", etc.
    payload: {
      goalId: params.goalId,
      goalName: params.goalName,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch milestones
// ─────────────────────────────────────────────────────────────────────────────

export type FetchMilestonesParams = {
  /** Filter by milestone type (optional) */
  milestoneType?: MilestoneType;
  /** Maximum number of results */
  limit?: number;
};

/**
 * Fetch the current user's milestones.
 */
export async function fetchMyMilestones(
  params: FetchMilestonesParams = {}
): Promise<Milestone[]> {
  const supabase = getSupabaseClient();
  const limit = params.limit ?? 50;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  let query = supabase
    .from('user_milestones')
    .select('id, user_id, milestone_type, milestone_value, achieved_at, payload, created_at')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })
    .limit(limit);

  if (params.milestoneType) {
    query = query.eq('milestone_type', params.milestoneType);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[milestones] Failed to fetch milestones:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    milestoneType: row.milestone_type as MilestoneType,
    milestoneValue: row.milestone_value,
    achievedAt: row.achieved_at,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

/**
 * Check if a specific milestone has been recorded.
 */
export async function hasMilestone(
  milestoneType: MilestoneType,
  milestoneValue: number
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from('user_milestones')
    .select('id')
    .eq('user_id', user.id)
    .eq('milestone_type', milestoneType)
    .eq('milestone_value', milestoneValue)
    .maybeSingle();

  if (error) {
    console.warn('[milestones] Failed to check milestone:', error.message);
    return false;
  }

  return data !== null;
}


import type { AgeRange, UserProfile } from '../../domain/types';
import { resolvePlanAvailability } from '../plan/planAvailability';

const AGE_RANGES = new Set<AgeRange>([
  'under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say',
]);

export type AgentProfileProjectionRow = {
  user_id: string;
  profile_id: string | null;
  full_name: string | null;
  age_range: AgeRange | null;
  timezone: string | null;
  plan_availability_version: number | null;
  plan_availability: Array<{
    weekday: number;
    mode: 'work' | 'personal';
    startLocalTime: string;
    endLocalTime: string;
  }> | null;
  notification_preferences: Record<string, unknown> | null;
  profile_updated_at: string | null;
  updated_at: string;
};

type NotificationPreferenceProjectionInput = {
  notificationsEnabled: boolean;
  allowActivityReminders: boolean;
  allowDailyShowUp: boolean;
  dailyShowUpTime: string | null;
  allowPlanKickoff: boolean;
  planKickoffCadence?: 'daily' | 'weekdays' | 'weekly';
  planKickoffWeeklyDay?: number;
  allowDailyFocus: boolean;
  dailyFocusTime: string | null;
  dailyFocusTimeMode?: 'auto' | 'manual';
  allowGoalNudges: boolean;
  goalNudgeTime: string | null;
  allowStreakAndReactivation: boolean;
  allowHouseholdMealPlanPush?: boolean;
};

const WEEKDAYS = [
  [1, 'mon'], [2, 'tue'], [3, 'wed'], [4, 'thu'], [5, 'fri'], [6, 'sat'], [7, 'sun'],
] as const;

function projectedPlanAvailability(profile: UserProfile | null): AgentProfileProjectionRow['plan_availability'] {
  if (!profile) return null;
  const availability = resolvePlanAvailability(profile);
  return WEEKDAYS.flatMap(([weekday, key]) => {
    const day = availability[key];
    if (!day.enabled) return [];
    return (['work', 'personal'] as const).flatMap((mode) => day.windows[mode].map((window) => ({
      weekday, mode, startLocalTime: window.start, endLocalTime: window.end,
    })));
  });
}

export function buildAgentProfileProjectionRow({ userId, profile, notificationPreferences = null, now = () => new Date().toISOString() }: {
  userId: string; profile: UserProfile | null; notificationPreferences?: NotificationPreferenceProjectionInput | null; now?: () => string;
}): AgentProfileProjectionRow {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('profile_projection_user_required');
  const profileId = typeof profile?.id === 'string' && profile.id.trim() ? profile.id.trim() : null;
  const profileUpdatedAt = typeof profile?.updatedAt === 'string' && Number.isFinite(Date.parse(profile.updatedAt))
    ? profile.updatedAt
    : null;
  return {
    user_id: normalizedUserId,
    profile_id: profileId,
    full_name: typeof profile?.fullName === 'string' && profile.fullName.trim()
      ? profile.fullName.trim().slice(0, 160)
      : null,
    age_range: profile?.ageRange && AGE_RANGES.has(profile.ageRange) ? profile.ageRange : null,
    timezone: typeof profile?.timezone === 'string' && profile.timezone.trim()
      ? profile.timezone.trim().slice(0, 100)
      : profile ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : null,
    plan_availability_version: profile && Number.isInteger(profile.preferences?.plan?.availabilityVersion)
      && Number(profile.preferences?.plan?.availabilityVersion) >= 0
      ? Number(profile.preferences?.plan?.availabilityVersion)
      : profile ? 0 : null,
    plan_availability: projectedPlanAvailability(profile),
    notification_preferences: notificationPreferences ? {
      notificationsEnabled: notificationPreferences.notificationsEnabled,
      allowActivityReminders: notificationPreferences.allowActivityReminders,
      allowDailyShowUp: notificationPreferences.allowDailyShowUp,
      dailyShowUpTime: notificationPreferences.dailyShowUpTime,
      allowPlanKickoff: notificationPreferences.allowPlanKickoff,
      planKickoffCadence: notificationPreferences.planKickoffCadence ?? 'daily',
      planKickoffWeeklyDay: notificationPreferences.planKickoffWeeklyDay ?? 1,
      allowDailyFocus: notificationPreferences.allowDailyFocus,
      dailyFocusTime: notificationPreferences.dailyFocusTime,
      dailyFocusTimeMode: notificationPreferences.dailyFocusTimeMode ?? 'auto',
      allowGoalNudges: notificationPreferences.allowGoalNudges,
      goalNudgeTime: notificationPreferences.goalNudgeTime,
      allowStreakAndReactivation: notificationPreferences.allowStreakAndReactivation,
      allowHouseholdMealPlanPush: notificationPreferences.allowHouseholdMealPlanPush !== false,
    } : null,
    profile_updated_at: profileId ? profileUpdatedAt : null,
    updated_at: now(),
  };
}

export function agentProfileProjectionSignature(profile: UserProfile | null, notificationPreferences?: NotificationPreferenceProjectionInput | null): string {
  const row = buildAgentProfileProjectionRow({ userId: 'signature', profile, notificationPreferences, now: () => '' });
  return JSON.stringify({
    profileId: row.profile_id, fullName: row.full_name,
    ageRange: row.age_range, profileUpdatedAt: row.profile_updated_at,
    timezone: row.timezone, planAvailabilityVersion: row.plan_availability_version,
    planAvailability: row.plan_availability, notificationPreferences: row.notification_preferences,
  });
}

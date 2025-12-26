/**
 * Central defaults for local notification scheduling times (local device time).
 *
 * Stored format: 'HH:mm' (24-hour, zero-padded).
 */
export const DEFAULT_DAILY_SHOW_UP_TIME = '08:00';
export const DEFAULT_DAILY_FOCUS_TIME = '14:00';
export const DEFAULT_GOAL_NUDGE_TIME = '16:00';

// Round focus completion time down to the nearest interval when auto-tuning daily focus reminders.
export const DAILY_FOCUS_TIME_ROUND_MINUTES = 30;



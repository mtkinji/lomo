import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityReminderLedgerEntry = {
  activityId: string;
  notificationId: string;
  scheduledForIso: string;
  cancelledAtIso?: string;
  firedAtIso?: string;
  firedDetectedAtIso?: string;
};

export type DailyShowUpLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD
};

export type DailyFocusLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD (local)
};

export type GoalNudgeLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD (local)
  goalId?: string | null;
  scheduledForIso?: string | null;
};

export type SystemNudgeLedger = {
  lastSentAtByType: Record<string, string>;
  sentCountByDate: Record<string, number>; // YYYY-MM-DD (local)
};

const KEY_ACTIVITY_REMINDERS = 'kwilt.notifications.activityReminders.v1';
const KEY_DAILY_SHOW_UP = 'kwilt.notifications.dailyShowUp.v1';
const KEY_DAILY_FOCUS = 'kwilt.notifications.dailyFocus.v1';
const KEY_GOAL_NUDGE = 'kwilt.notifications.goalNudge.v1';
const KEY_SYSTEM_NUDGES = 'kwilt.notifications.systemNudges.v1';

export async function loadActivityReminderLedger(): Promise<Record<string, ActivityReminderLedgerEntry>> {
  const raw = await AsyncStorage.getItem(KEY_ACTIVITY_REMINDERS);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ActivityReminderLedgerEntry>;
  } catch {
    return {};
  }
}

export async function saveActivityReminderLedger(
  next: Record<string, ActivityReminderLedgerEntry>,
): Promise<void> {
  await AsyncStorage.setItem(KEY_ACTIVITY_REMINDERS, JSON.stringify(next));
}

export async function upsertActivityReminderSchedule(entry: ActivityReminderLedgerEntry): Promise<void> {
  const ledger = await loadActivityReminderLedger();
  ledger[entry.activityId] = entry;
  await saveActivityReminderLedger(ledger);
}

export async function markActivityReminderCancelled(
  activityId: string,
  cancelledAtIso: string,
): Promise<void> {
  const ledger = await loadActivityReminderLedger();
  const existing = ledger[activityId];
  if (!existing) return;
  ledger[activityId] = { ...existing, cancelledAtIso };
  await saveActivityReminderLedger(ledger);
}

export async function markActivityReminderFired(
  activityId: string,
  firedAtIso: string,
  detectedAtIso: string,
): Promise<void> {
  const ledger = await loadActivityReminderLedger();
  const existing = ledger[activityId];
  if (!existing) return;
  ledger[activityId] = {
    ...existing,
    firedAtIso,
    firedDetectedAtIso: detectedAtIso,
  };
  await saveActivityReminderLedger(ledger);
}

export async function deleteActivityReminderLedgerEntry(activityId: string): Promise<void> {
  const ledger = await loadActivityReminderLedger();
  if (!ledger[activityId]) return;
  delete ledger[activityId];
  await saveActivityReminderLedger(ledger);
}

export async function loadDailyShowUpLedger(): Promise<DailyShowUpLedger> {
  const raw = await AsyncStorage.getItem(KEY_DAILY_SHOW_UP);
  if (!raw) {
    return { notificationId: null, scheduleTimeLocal: null };
  }
  try {
    return JSON.parse(raw) as DailyShowUpLedger;
  } catch {
    return { notificationId: null, scheduleTimeLocal: null };
  }
}

export async function saveDailyShowUpLedger(next: DailyShowUpLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_DAILY_SHOW_UP, JSON.stringify(next));
}

export async function loadDailyFocusLedger(): Promise<DailyFocusLedger> {
  const raw = await AsyncStorage.getItem(KEY_DAILY_FOCUS);
  if (!raw) {
    return { notificationId: null, scheduleTimeLocal: null };
  }
  try {
    return JSON.parse(raw) as DailyFocusLedger;
  } catch {
    return { notificationId: null, scheduleTimeLocal: null };
  }
}

export async function saveDailyFocusLedger(next: DailyFocusLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_DAILY_FOCUS, JSON.stringify(next));
}

export async function loadGoalNudgeLedger(): Promise<GoalNudgeLedger> {
  const raw = await AsyncStorage.getItem(KEY_GOAL_NUDGE);
  if (!raw) {
    return { notificationId: null, scheduleTimeLocal: null };
  }
  try {
    return JSON.parse(raw) as GoalNudgeLedger;
  } catch {
    return { notificationId: null, scheduleTimeLocal: null };
  }
}

export async function saveGoalNudgeLedger(next: GoalNudgeLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_GOAL_NUDGE, JSON.stringify(next));
}

export async function loadSystemNudgeLedger(): Promise<SystemNudgeLedger> {
  const raw = await AsyncStorage.getItem(KEY_SYSTEM_NUDGES);
  if (!raw) {
    return { lastSentAtByType: {}, sentCountByDate: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SystemNudgeLedger> | null;
    return {
      lastSentAtByType: parsed?.lastSentAtByType && typeof parsed.lastSentAtByType === 'object' ? parsed.lastSentAtByType : {},
      sentCountByDate: parsed?.sentCountByDate && typeof parsed.sentCountByDate === 'object' ? parsed.sentCountByDate : {},
    };
  } catch {
    return { lastSentAtByType: {}, sentCountByDate: {} };
  }
}

export async function saveSystemNudgeLedger(next: SystemNudgeLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_SYSTEM_NUDGES, JSON.stringify(next));
}



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
  scheduledForIso?: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD
};

export type DailyFocusLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  scheduledForIso?: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD (local)
};

export type GoalNudgeLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD (local)
  goalId?: string | null;
  scheduledForIso?: string | null;
};

export type SetupNextStepLedger = {
  notificationId: string | null;
  scheduleTimeLocal: string | null;
  lastFiredDateKey?: string; // YYYY-MM-DD (local)
  reason?: 'no_goals' | 'no_activities' | null;
  scheduledForIso?: string | null;
};

export type SystemNudgeLedger = {
  /**
   * Per-day rollups for system nudges. Dates use local calendar keys: YYYY-MM-DD.
   */
  days: Record<
    string,
    {
      sent: Array<{
        type: string;
        notificationId: string;
        scheduledForIso: string;
        openedAtIso?: string;
        actedAtIso?: string;
      }>;
    }
  >;
  /**
   * A small amount of state for caps/backoff/personalization.
   */
  lastSentAtByType: Record<string, string>;
  lastOpenedAtByType: Record<string, string>;
  consecutiveNoOpenByType: Record<string, number>;
  sentCountByDate: Record<string, number>; // YYYY-MM-DD (local)
  // Simple per-hour histogram for personalization (local hour 0-23).
  openHourCountsByType: Record<string, Record<string, number>>;
};

const KEY_ACTIVITY_REMINDERS = 'kwilt.notifications.activityReminders.v1';
const KEY_DAILY_SHOW_UP = 'kwilt.notifications.dailyShowUp.v1';
const KEY_DAILY_FOCUS = 'kwilt.notifications.dailyFocus.v1';
const KEY_GOAL_NUDGE = 'kwilt.notifications.goalNudge.v1';
const KEY_SETUP_NEXT_STEP = 'kwilt.notifications.setupNextStep.v1';
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

export async function loadSetupNextStepLedger(): Promise<SetupNextStepLedger> {
  const raw = await AsyncStorage.getItem(KEY_SETUP_NEXT_STEP);
  if (!raw) {
    return { notificationId: null, scheduleTimeLocal: null };
  }
  try {
    return JSON.parse(raw) as SetupNextStepLedger;
  } catch {
    return { notificationId: null, scheduleTimeLocal: null };
  }
}

export async function saveSetupNextStepLedger(next: SetupNextStepLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_SETUP_NEXT_STEP, JSON.stringify(next));
}

export async function loadSystemNudgeLedger(): Promise<SystemNudgeLedger> {
  const raw = await AsyncStorage.getItem(KEY_SYSTEM_NUDGES);
  if (!raw) {
    return {
      days: {},
      lastSentAtByType: {},
      lastOpenedAtByType: {},
      consecutiveNoOpenByType: {},
      sentCountByDate: {},
      openHourCountsByType: {},
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SystemNudgeLedger> | null;
    return {
      days: parsed?.days && typeof parsed.days === 'object' ? (parsed.days as SystemNudgeLedger['days']) : {},
      lastSentAtByType:
        parsed?.lastSentAtByType && typeof parsed.lastSentAtByType === 'object'
          ? parsed.lastSentAtByType
          : {},
      lastOpenedAtByType:
        parsed?.lastOpenedAtByType && typeof parsed.lastOpenedAtByType === 'object'
          ? parsed.lastOpenedAtByType
          : {},
      consecutiveNoOpenByType:
        parsed?.consecutiveNoOpenByType && typeof parsed.consecutiveNoOpenByType === 'object'
          ? parsed.consecutiveNoOpenByType
          : {},
      sentCountByDate:
        parsed?.sentCountByDate && typeof parsed.sentCountByDate === 'object' ? parsed.sentCountByDate : {},
      openHourCountsByType:
        parsed?.openHourCountsByType && typeof parsed.openHourCountsByType === 'object'
          ? parsed.openHourCountsByType
          : {},
    };
  } catch {
    return {
      days: {},
      lastSentAtByType: {},
      lastOpenedAtByType: {},
      consecutiveNoOpenByType: {},
      sentCountByDate: {},
      openHourCountsByType: {},
    };
  }
}

export async function saveSystemNudgeLedger(next: SystemNudgeLedger): Promise<void> {
  await AsyncStorage.setItem(KEY_SYSTEM_NUDGES, JSON.stringify(next));
}

export async function recordSystemNudgeScheduled(params: {
  dateKey: string; // local YYYY-MM-DD
  type: string;
  notificationId: string;
  scheduledForIso: string;
}): Promise<void> {
  const ledger = await loadSystemNudgeLedger();
  const day = ledger.days[params.dateKey] ?? { sent: [] };
  // Replace existing entry for same type+date (reschedule).
  const nextSent = day.sent.filter((e) => e.type !== params.type);
  nextSent.push({
    type: params.type,
    notificationId: params.notificationId,
    scheduledForIso: params.scheduledForIso,
  });
  ledger.days[params.dateKey] = { sent: nextSent };
  await saveSystemNudgeLedger(ledger);
}

export async function recordSystemNudgeOpened(params: {
  dateKey: string; // local YYYY-MM-DD
  type: string;
  notificationId: string;
  openedAtIso: string;
  openedAtLocalHour: number;
}): Promise<void> {
  const ledger = await loadSystemNudgeLedger();
  const day = ledger.days[params.dateKey] ?? { sent: [] };
  ledger.days[params.dateKey] = {
    sent: day.sent.map((e) =>
      e.notificationId === params.notificationId ? { ...e, openedAtIso: params.openedAtIso } : e,
    ),
  };
  ledger.lastOpenedAtByType[params.type] = params.openedAtIso;
  ledger.consecutiveNoOpenByType[params.type] = 0;
  const hourKey = String(params.openedAtLocalHour);
  ledger.openHourCountsByType[params.type] ??= {};
  ledger.openHourCountsByType[params.type][hourKey] =
    (ledger.openHourCountsByType[params.type][hourKey] ?? 0) + 1;
  await saveSystemNudgeLedger(ledger);
}

export async function recordSystemNudgeFiredEstimated(params: {
  dateKey: string; // local YYYY-MM-DD
  type: string;
  notificationId: string;
  firedAtIso: string;
}): Promise<void> {
  const ledger = await loadSystemNudgeLedger();
  ledger.lastSentAtByType[params.type] = params.firedAtIso;
  ledger.sentCountByDate[params.dateKey] = (ledger.sentCountByDate[params.dateKey] ?? 0) + 1;
  const day = ledger.days[params.dateKey];
  const opened = day?.sent.find((e) => e.notificationId === params.notificationId)?.openedAtIso;
  if (!opened) {
    ledger.consecutiveNoOpenByType[params.type] = (ledger.consecutiveNoOpenByType[params.type] ?? 0) + 1;
  }
  await saveSystemNudgeLedger(ledger);
}



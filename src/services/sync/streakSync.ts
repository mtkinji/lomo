import { getSupabaseClient } from '../backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';

type SyncUser = { userId: string };

type StreakGraceSnapshot = {
  freeDaysRemaining: number;
  lastFreeResetWeek: string | null;
  shieldsAvailable: number;
  lastShieldEarnedWeekKey: string | null;
  graceDaysUsed: number;
};

type StreakBreakSnapshot = {
  brokenAtDateKey: string | null;
  brokenStreakLength: number | null;
  eligibleRepairUntilMs: number | null;
  repairedAtMs: number | null;
};

type StreakSlice = {
  lastShowUpDate: string | null;
  currentShowUpStreak: number;
  lastStreakDateKey: string | null;
  currentCoveredShowUpStreak: number;
  streakUpdatedAtIso: string | null;
  streakGrace: StreakGraceSnapshot;
  streakBreakState: StreakBreakSnapshot;
};

type RemoteSummaryRow = {
  user_id: string;
  last_show_up_date: string | null;
  current_show_up_streak: number | null;
  last_streak_date: string | null;
  current_covered_show_up_streak: number | null;
  free_days_remaining: number | null;
  last_free_reset_week: string | null;
  shields_available: number | null;
  last_shield_earned_week_key: string | null;
  grace_days_used: number | null;
  broken_at_date: string | null;
  broken_streak_length: number | null;
  eligible_repair_until_ms: number | null;
  repaired_at_ms: number | null;
  timezone: string | null;
  client_updated_at: string | null;
  updated_at: string | null;
};

type StreakEventType =
  | 'show_up'
  | 'freeze_used'
  | 'shield_used'
  | 'shield_awarded'
  | 'streak_broken'
  | 'streak_repaired'
  | 'reset';

let started = false;
let stopAuthSub: (() => void) | null = null;
let stopStreakSub: (() => void) | null = null;
let activeUser: SyncUser | null = null;
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let suppressNextPush = false;
let disabledReason: string | null = null;
let enableGeneration = 0;

const IS_JEST = typeof process !== 'undefined' && Boolean((process as any).env?.JEST_WORKER_ID);
const PUSH_DEBOUNCE_MS = IS_JEST ? 1 : 1000;

function getErrorMessage(e: unknown): string {
  if (!e) return '';
  const anyE = e as any;
  if (typeof anyE?.message === 'string') return anyE.message;
  try {
    return String(e);
  } catch {
    return '';
  }
}

function maybeDisableIfSchemaCacheMissingTable(e: unknown): boolean {
  const msg = getErrorMessage(e);
  const looksMissing =
    msg.includes("Could not find the table 'public.kwilt_streak_") && msg.includes('schema cache');
  if (!looksMissing) return false;
  disabledReason = msg;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[streakSync] disabled (missing Supabase streak tables in PostgREST schema cache). Apply migrations, then restart the app/dev server.',
      msg,
    );
  }
  return true;
}

function parseIsoMs(iso: unknown): number {
  if (typeof iso !== 'string') return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function nonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function nullableDateKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.slice(0, 10) : null;
}

function compareDateKeys(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (a && !b) return 1;
  if (!a && b) return -1;
  return a! > b! ? 1 : a! < b! ? -1 : 0;
}

function shouldPreferLegacyLocal(local: StreakSlice, remote: StreakSlice): boolean {
  if (local.streakUpdatedAtIso) return false;
  if (local.currentShowUpStreak <= 0 && !local.lastShowUpDate && !local.lastStreakDateKey) return false;
  if (local.currentShowUpStreak > remote.currentShowUpStreak) return true;
  if (local.currentShowUpStreak < remote.currentShowUpStreak) return false;
  return compareDateKeys(
    local.lastShowUpDate ?? local.lastStreakDateKey,
    remote.lastShowUpDate ?? remote.lastStreakDateKey,
  ) > 0;
}

function getTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function currentStreakSlice(): StreakSlice {
  const state = useAppStore.getState();
  const currentShowUpStreak = nonNegativeInt(state.currentShowUpStreak, 0);
  const rawCoveredShowUpStreak = nonNegativeInt(
    state.currentCoveredShowUpStreak,
    currentShowUpStreak,
  );
  const currentCoveredShowUpStreak =
    rawCoveredShowUpStreak > 0 || currentShowUpStreak <= 0
      ? rawCoveredShowUpStreak
      : currentShowUpStreak;
  const grace = state.streakGrace ?? {
    freeDaysRemaining: 1,
    lastFreeResetWeek: null,
    shieldsAvailable: 0,
    lastShieldEarnedWeekKey: null,
    graceDaysUsed: 0,
  };
  const breakState = state.streakBreakState ?? {
    brokenAtDateKey: null,
    brokenStreakLength: null,
    eligibleRepairUntilMs: null,
    repairedAtMs: null,
  };
  return {
    lastShowUpDate: state.lastShowUpDate ?? null,
    currentShowUpStreak,
    lastStreakDateKey: state.lastStreakDateKey ?? state.lastShowUpDate ?? null,
    currentCoveredShowUpStreak,
    streakUpdatedAtIso: state.streakUpdatedAtIso ?? null,
    streakGrace: {
      freeDaysRemaining: nonNegativeInt(grace.freeDaysRemaining, 1),
      lastFreeResetWeek: grace.lastFreeResetWeek ?? null,
      shieldsAvailable: nonNegativeInt(grace.shieldsAvailable, 0),
      lastShieldEarnedWeekKey: grace.lastShieldEarnedWeekKey ?? null,
      graceDaysUsed: nonNegativeInt(grace.graceDaysUsed, 0),
    },
    streakBreakState: {
      brokenAtDateKey: breakState.brokenAtDateKey ?? null,
      brokenStreakLength:
        typeof breakState.brokenStreakLength === 'number' ? breakState.brokenStreakLength : null,
      eligibleRepairUntilMs:
        typeof breakState.eligibleRepairUntilMs === 'number' ? breakState.eligibleRepairUntilMs : null,
      repairedAtMs:
        typeof breakState.repairedAtMs === 'number' ? breakState.repairedAtMs : null,
    },
  };
}

function buildSummaryRow(user: SyncUser, slice: StreakSlice, fallbackUpdatedAtIso?: string) {
  const clientUpdatedAt = slice.streakUpdatedAtIso ?? fallbackUpdatedAtIso ?? new Date().toISOString();
  return {
    user_id: user.userId,
    last_show_up_date: slice.lastShowUpDate,
    current_show_up_streak: slice.currentShowUpStreak,
    last_streak_date: slice.lastStreakDateKey,
    current_covered_show_up_streak: slice.currentCoveredShowUpStreak,
    free_days_remaining: slice.streakGrace.freeDaysRemaining,
    last_free_reset_week: slice.streakGrace.lastFreeResetWeek,
    shields_available: slice.streakGrace.shieldsAvailable,
    last_shield_earned_week_key: slice.streakGrace.lastShieldEarnedWeekKey,
    grace_days_used: slice.streakGrace.graceDaysUsed,
    broken_at_date: slice.streakBreakState.brokenAtDateKey,
    broken_streak_length: slice.streakBreakState.brokenStreakLength,
    eligible_repair_until_ms: slice.streakBreakState.eligibleRepairUntilMs,
    repaired_at_ms: slice.streakBreakState.repairedAtMs,
    timezone: getTimezone(),
    client_updated_at: clientUpdatedAt,
  };
}

function sliceFromRemote(row: RemoteSummaryRow): StreakSlice {
  const currentShowUpStreak = nonNegativeInt(row.current_show_up_streak, 0);
  return {
    lastShowUpDate: nullableDateKey(row.last_show_up_date),
    currentShowUpStreak,
    lastStreakDateKey: nullableDateKey(row.last_streak_date) ?? nullableDateKey(row.last_show_up_date),
    currentCoveredShowUpStreak: nonNegativeInt(
      row.current_covered_show_up_streak,
      currentShowUpStreak,
    ),
    streakUpdatedAtIso: row.client_updated_at ?? row.updated_at ?? new Date().toISOString(),
    streakGrace: {
      freeDaysRemaining: nonNegativeInt(row.free_days_remaining, 1),
      lastFreeResetWeek: row.last_free_reset_week ?? null,
      shieldsAvailable: nonNegativeInt(row.shields_available, 0),
      lastShieldEarnedWeekKey: row.last_shield_earned_week_key ?? null,
      graceDaysUsed: nonNegativeInt(row.grace_days_used, 0),
    },
    streakBreakState: {
      brokenAtDateKey: nullableDateKey(row.broken_at_date),
      brokenStreakLength:
        typeof row.broken_streak_length === 'number' ? Math.max(0, Math.floor(row.broken_streak_length)) : null,
      eligibleRepairUntilMs:
        typeof row.eligible_repair_until_ms === 'number' ? row.eligible_repair_until_ms : null,
      repairedAtMs: typeof row.repaired_at_ms === 'number' ? row.repaired_at_ms : null,
    },
  };
}

async function fetchRemoteSummary(user: SyncUser): Promise<RemoteSummaryRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_streak_summaries')
    .select('*')
    .eq('user_id', user.userId)
    .limit(1);
  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as RemoteSummaryRow;
}

async function upsertSummary(user: SyncUser, slice: StreakSlice): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('kwilt_streak_summaries')
    .upsert(buildSummaryRow(user, slice), { onConflict: 'user_id' })
    .select('user_id')
    .throwOnError();
}

function eventId(user: SyncUser, type: StreakEventType, slice: StreakSlice): string {
  const stamp = slice.streakUpdatedAtIso ?? new Date().toISOString();
  const datePart = slice.lastShowUpDate ?? slice.lastStreakDateKey ?? 'none';
  return `${user.userId}:${type}:${datePart}:${stamp}`;
}

function buildEvents(user: SyncUser, next: StreakSlice, prev?: StreakSlice | null) {
  const occurredAt = next.streakUpdatedAtIso ?? new Date().toISOString();
  const base = {
    user_id: user.userId,
    local_date: next.lastShowUpDate ?? next.lastStreakDateKey,
    streak_value: next.currentShowUpStreak,
    covered_streak_value: next.currentCoveredShowUpStreak,
    occurred_at: occurredAt,
  };
  const events: Array<Record<string, unknown>> = [];
  const add = (type: StreakEventType, payload: Record<string, unknown> = {}) => {
    events.push({
      ...base,
      client_event_id: eventId(user, type, next),
      event_type: type,
      payload,
    });
  };

  if (!prev) {
    if (next.currentShowUpStreak > 0 || next.lastShowUpDate) add('show_up', { source: 'seed' });
    return events;
  }

  if (prev.lastShowUpDate !== next.lastShowUpDate && next.lastShowUpDate) {
    add('show_up');
  }
  if (prev.currentShowUpStreak > 0 && next.currentShowUpStreak === 0) {
    add('reset');
  }
  if ((prev.streakGrace.graceDaysUsed ?? 0) < (next.streakGrace.graceDaysUsed ?? 0)) {
    add('freeze_used', { coveredDays: next.streakGrace.graceDaysUsed });
  }
  if ((prev.streakGrace.shieldsAvailable ?? 0) > (next.streakGrace.shieldsAvailable ?? 0)) {
    add('shield_used');
  }
  if ((prev.streakGrace.shieldsAvailable ?? 0) < (next.streakGrace.shieldsAvailable ?? 0)) {
    add('shield_awarded');
  }
  if (!prev.streakBreakState.brokenAtDateKey && next.streakBreakState.brokenAtDateKey) {
    add('streak_broken', { brokenStreakLength: next.streakBreakState.brokenStreakLength });
  }
  if (!prev.streakBreakState.repairedAtMs && next.streakBreakState.repairedAtMs) {
    add('streak_repaired', { repairedAtMs: next.streakBreakState.repairedAtMs });
  }

  return events;
}

async function upsertEvents(events: Array<Record<string, unknown>>): Promise<void> {
  if (events.length === 0) return;
  const supabase = getSupabaseClient();
  await supabase
    .from('kwilt_streak_events')
    .upsert(events, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true })
    .select('id')
    .throwOnError();
}

function applyRemoteSlice(slice: StreakSlice): void {
  if (stopStreakSub) suppressNextPush = true;
  useAppStore.setState(
    {
      lastShowUpDate: slice.lastShowUpDate,
      currentShowUpStreak: slice.currentShowUpStreak,
      lastStreakDateKey: slice.lastStreakDateKey,
      currentCoveredShowUpStreak: slice.currentCoveredShowUpStreak,
      streakUpdatedAtIso: slice.streakUpdatedAtIso,
      streakGrace: slice.streakGrace,
      streakBreakState: slice.streakBreakState,
    } as any,
    false,
  );
}

async function pushNow(prevSlice?: StreakSlice | null): Promise<void> {
  const user = activeUser;
  if (!user || disabledReason || pushInFlight) return;
  pushInFlight = true;
  try {
    const next = currentStreakSlice();
    await upsertSummary(user, next);
    await upsertEvents(buildEvents(user, next, prevSlice ?? null));
  } catch (e) {
    if (maybeDisableIfSchemaCacheMissingTable(e)) return;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[streakSync] push failed', e);
    }
  } finally {
    pushInFlight = false;
  }
}

function schedulePush(prevSlice?: StreakSlice | null): void {
  if (!activeUser || disabledReason) return;
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    pushTimeout = null;
    void pushNow(prevSlice);
  }, PUSH_DEBOUNCE_MS);
}

async function enableForUser(user: SyncUser): Promise<void> {
  const gen = ++enableGeneration;
  disable();
  activeUser = user;

  try {
    const remote = await fetchRemoteSummary(user);
    if (gen !== enableGeneration) return;

    const local = currentStreakSlice();
    if (!remote) {
      await upsertSummary(user, local);
      await upsertEvents(buildEvents(user, local, null));
    } else {
      const remoteSlice = sliceFromRemote(remote);
      const remoteMs = parseIsoMs(remoteSlice.streakUpdatedAtIso);
      const localMs = parseIsoMs(local.streakUpdatedAtIso);
      if (shouldPreferLegacyLocal(local, remoteSlice)) {
        const promotedLocal = { ...local, streakUpdatedAtIso: new Date().toISOString() };
        applyRemoteSlice(promotedLocal);
        await upsertSummary(user, promotedLocal);
        await upsertEvents(buildEvents(user, promotedLocal, null));
      } else if (remoteMs > localMs) {
        applyRemoteSlice(remoteSlice);
      } else if (localMs > remoteMs || (localMs === 0 && remoteMs === 0)) {
        await upsertSummary(user, local);
      }
    }
  } catch (e) {
    if (maybeDisableIfSchemaCacheMissingTable(e)) return;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[streakSync] initial pull failed', e);
    }
  }

  if (gen !== enableGeneration) return;
  stopStreakSub?.();
  stopStreakSub = useAppStore.subscribe(
    (s) => ({
      lastShowUpDate: s.lastShowUpDate,
      currentShowUpStreak: s.currentShowUpStreak,
      lastStreakDateKey: s.lastStreakDateKey,
      currentCoveredShowUpStreak: s.currentCoveredShowUpStreak,
      streakUpdatedAtIso: s.streakUpdatedAtIso,
      streakGrace: s.streakGrace,
      streakBreakState: s.streakBreakState,
    }),
    (next, prev) => {
      if (suppressNextPush) {
        suppressNextPush = false;
        return;
      }
      schedulePush(prev as StreakSlice | null);
    },
    { fireImmediately: false } as any,
  );
}

function disable(): void {
  activeUser = null;
  stopStreakSub?.();
  stopStreakSub = null;
  if (pushTimeout) {
    clearTimeout(pushTimeout);
    pushTimeout = null;
  }
}

export function startStreakSync(): void {
  if (started) return;
  started = true;
  stopAuthSub = useAppStore.subscribe(
    (s) => s.authIdentity,
    (identity) => {
      const userId = identity?.userId?.trim() ?? '';
      if (!userId) {
        enableGeneration += 1;
        disable();
        return;
      }
      void enableForUser({ userId });
    },
    { fireImmediately: true } as any,
  );
}

export function stopStreakSync(): void {
  stopAuthSub?.();
  stopAuthSub = null;
  disable();
  started = false;
}

export function resetStreakSyncForTests(): void {
  stopStreakSync();
  disabledReason = null;
  enableGeneration = 0;
  suppressNextPush = false;
  pushInFlight = false;
}

import { useMemo } from 'react';

function todayLocalKey(): string {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useShowedUpToday(lastShowUpDate: string | null | undefined): boolean {
  return useMemo(() => lastShowUpDate === todayLocalKey(), [lastShowUpDate]);
}

export function useRepairWindowActive(
  streakBreakState: {
    eligibleRepairUntilMs?: number | null;
    repairedAtMs?: number | null;
    brokenAtDateKey?: string | null;
  } | null | undefined,
): boolean {
  return useMemo(() => {
    if (!streakBreakState?.brokenAtDateKey) return false;
    if (streakBreakState.repairedAtMs != null) return false;
    const until = streakBreakState.eligibleRepairUntilMs;
    if (typeof until !== 'number') return false;
    return Date.now() < until;
  }, [
    streakBreakState?.brokenAtDateKey,
    streakBreakState?.eligibleRepairUntilMs,
    streakBreakState?.repairedAtMs,
  ]);
}

export type StreakProtectionEvent = {
  /** Unique id so UI can detect “new event” (e.g. for celebrations). */
  id: string;
  type: 'freeze_used' | 'streak_repaired';
  atMs: number;
  /** Number of missed days covered by protection. */
  coveredDays: number;
  usedFree: number;
  usedShields: number;
};

export type StreakProtectionInventory = {
  /** Free users: at most 1 freeze available at a time. */
  freeFreezeAvailable: 0 | 1;
  /** Pro users: shields are additional protection, stackable up to maxShields (cap handled by store). */
  shieldsAvailable: number;
  /** ISO week key (YYYY-Www) when the free freeze was last refilled. */
  lastFreeRefillWeekKey: string | null;
  /**
   * ISO week key (YYYY-Www) when the user last earned a shield via the weekly earning rule.
   * Used to enforce "max 1 shield earned per week".
   */
  lastShieldEarnedWeekKey: string | null;
  /**
   * Local calendar key (YYYY-MM-DD) of the latest day we have evaluated protection through.
   * Used to avoid re-breaking / re-consuming when the app foregrounds multiple times in one day.
   */
  lastEvaluatedThroughDateKey: string | null;
  /** Last protection-related event for UI/celebrations. */
  lastEvent: StreakProtectionEvent | null;
};

export type StreakBreakState = {
  brokenAtDateKey: string | null;
  brokenStreakLength: number | null;
  eligibleRepairUntilMs: number | null;
  repairedAtMs: number | null;
};

export const REPAIR_WINDOW_MS = 48 * 60 * 60 * 1000;
export const REPAIR_SHIELD_COST = 2;

export function localDateKey(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(key: string): Date | null {
  const parts = key.split('-').map((p) => Math.floor(Number(p)));
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export function addLocalDaysKey(key: string, days: number): string | null {
  const dt = parseLocalDateKey(key);
  if (!dt) return null;
  const next = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  next.setDate(next.getDate() + days);
  return localDateKey(next);
}

export function diffLocalDays(fromKey: string, toKey: string): number | null {
  const from = parseLocalDateKey(fromKey);
  const to = parseLocalDateKey(toKey);
  if (!from || !to) return null;
  const startFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffMs = startTo.getTime() - startFrom.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * ISO week key (YYYY-Www). Used for weekly refill of the free freeze slot.
 */
export function getIsoWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function applyWeeklyFreeRefill(params: {
  inventory: StreakProtectionInventory;
  now: Date;
}): StreakProtectionInventory {
  const currentWeekKey = getIsoWeekKey(params.now);
  if (params.inventory.lastFreeRefillWeekKey === currentWeekKey) {
    return params.inventory;
  }
  return {
    ...params.inventory,
    freeFreezeAvailable: 1,
    lastFreeRefillWeekKey: currentWeekKey,
  };
}

export function getDefaultStreakProtection(): StreakProtectionInventory {
  return {
    freeFreezeAvailable: 1,
    shieldsAvailable: 0,
    lastFreeRefillWeekKey: null,
    lastShieldEarnedWeekKey: null,
    lastEvaluatedThroughDateKey: null,
    lastEvent: null,
  };
}

export function maybeAwardWeeklyShield(params: {
  now: Date;
  isPro: boolean;
  inventory: StreakProtectionInventory;
  /** Covered streak length AFTER the day being evaluated is covered. */
  coveredStreak: number;
  /** If true, do not award. */
  streakIsBroken: boolean;
  /** Max shield inventory size (default 3). */
  maxShields?: number;
}): { inventory: StreakProtectionInventory; awarded: boolean } {
  const maxShields = typeof params.maxShields === 'number' && Number.isFinite(params.maxShields) ? params.maxShields : 3;
  if (!params.isPro) return { inventory: params.inventory, awarded: false };
  if (params.streakIsBroken) return { inventory: params.inventory, awarded: false };
  const coveredStreak = Math.max(0, Math.floor(params.coveredStreak ?? 0));
  if (coveredStreak <= 0) return { inventory: params.inventory, awarded: false };
  // Award on the 7th covered day, 14th, 21st, ... but at most once per ISO week.
  if (coveredStreak % 7 !== 0) return { inventory: params.inventory, awarded: false };
  const currentWeekKey = getIsoWeekKey(params.now);
  if (params.inventory.lastShieldEarnedWeekKey === currentWeekKey) {
    return { inventory: params.inventory, awarded: false };
  }
  const currentShields = Math.max(0, Math.floor(params.inventory.shieldsAvailable ?? 0));
  if (currentShields >= maxShields) return { inventory: params.inventory, awarded: false };

  return {
    awarded: true,
    inventory: {
      ...params.inventory,
      shieldsAvailable: Math.min(maxShields, currentShields + 1),
      lastShieldEarnedWeekKey: currentWeekKey,
    },
  };
}

export function getDefaultStreakBreak(): StreakBreakState {
  return {
    brokenAtDateKey: null,
    brokenStreakLength: null,
    eligibleRepairUntilMs: null,
    repairedAtMs: null,
  };
}

/**
 * Evaluate missed days *through yesterday* and consume inventory on each missed day.
 *
 * This mirrors Duolingo semantics: protection is spent because a day was missed, not
 * because the user returned later.
 */
export function evaluateMissedDaysThroughYesterday(params: {
  now: Date;
  isPro: boolean;
  /** The last day the streak was “covered” (show-up day or frozen day). */
  lastStreakDateKey: string | null;
  /** Actual last show-up date (used for UI/notifications). */
  lastShowUpDateKey: string | null;
  currentStreak: number;
  /** Covered streak length through the last covered day (show-ups + freezes). */
  currentCoveredStreak: number;
  inventory: StreakProtectionInventory;
  breakState: StreakBreakState;
}): {
  lastStreakDateKey: string | null;
  currentStreak: number;
  currentCoveredStreak: number;
  inventory: StreakProtectionInventory;
  breakState: StreakBreakState;
  usedFree: number;
  usedShields: number;
  coveredDays: number;
  broke: boolean;
} {
  const todayKey = localDateKey(params.now);
  const yesterdayKey = addLocalDaysKey(todayKey, -1);
  if (!yesterdayKey) {
    return {
      lastStreakDateKey: params.lastStreakDateKey,
      currentStreak: params.currentStreak,
      currentCoveredStreak: Math.max(0, Math.floor(params.currentCoveredStreak ?? 0)),
      inventory: params.inventory,
      breakState: params.breakState,
      usedFree: 0,
      usedShields: 0,
      coveredDays: 0,
      broke: false,
    };
  }

  // Always ensure weekly refill (free freeze slot) before evaluation.
  let inventory: StreakProtectionInventory = applyWeeklyFreeRefill({
    inventory: params.inventory,
    now: params.now,
  });

  // If we already evaluated through yesterday, we are done.
  if (inventory.lastEvaluatedThroughDateKey === yesterdayKey) {
    return {
      lastStreakDateKey: params.lastStreakDateKey,
      currentStreak: params.currentStreak,
      currentCoveredStreak: Math.max(0, Math.floor(params.currentCoveredStreak ?? 0)),
      inventory,
      breakState: params.breakState,
      usedFree: 0,
      usedShields: 0,
      coveredDays: 0,
      broke: false,
    };
  }

  // If the streak is already broken, just advance the evaluation marker so we don't re-break.
  if (params.breakState.brokenAtDateKey) {
    return {
      lastStreakDateKey: params.lastStreakDateKey,
      currentStreak: params.currentStreak,
      currentCoveredStreak: Math.max(0, Math.floor(params.currentCoveredStreak ?? 0)),
      inventory: { ...inventory, lastEvaluatedThroughDateKey: yesterdayKey },
      breakState: params.breakState,
      usedFree: 0,
      usedShields: 0,
      coveredDays: 0,
      broke: false,
    };
  }

  const lastCovered = params.lastStreakDateKey ?? params.lastShowUpDateKey;
  if (!lastCovered) {
    return {
      lastStreakDateKey: params.lastStreakDateKey,
      currentStreak: params.currentStreak,
      currentCoveredStreak: Math.max(0, Math.floor(params.currentCoveredStreak ?? 0)),
      inventory: { ...inventory, lastEvaluatedThroughDateKey: yesterdayKey },
      breakState: params.breakState,
      usedFree: 0,
      usedShields: 0,
      coveredDays: 0,
      broke: false,
    };
  }

  const diff = diffLocalDays(lastCovered, yesterdayKey);
  if (diff === null || diff <= 0) {
    return {
      lastStreakDateKey: params.lastStreakDateKey ?? lastCovered,
      currentStreak: params.currentStreak,
      currentCoveredStreak: Math.max(0, Math.floor(params.currentCoveredStreak ?? 0)),
      inventory: { ...inventory, lastEvaluatedThroughDateKey: yesterdayKey },
      breakState: params.breakState,
      usedFree: 0,
      usedShields: 0,
      coveredDays: 0,
      broke: false,
    };
  }

  // Iterate each missed day between lastCovered and yesterdayKey inclusive.
  let lastStreakDateKey: string | null = params.lastStreakDateKey ?? lastCovered;
  let currentCoveredStreak = Math.max(0, Math.floor(params.currentCoveredStreak ?? 0));
  let usedFree = 0;
  let usedShields = 0;
  let coveredDays = 0;
  const shieldsUsable = params.isPro ? Math.max(0, Math.floor(inventory.shieldsAvailable ?? 0)) : 0;
  let freeAvailable: 0 | 1 = inventory.freeFreezeAvailable;
  let shieldsAvailable = shieldsUsable;

  for (let step = 1; step <= diff; step++) {
    const dayKey = addLocalDaysKey(lastCovered, step);
    if (!dayKey) continue;

    if (freeAvailable === 1) {
      freeAvailable = 0;
      usedFree += 1;
      coveredDays += 1;
      currentCoveredStreak += 1;
      lastStreakDateKey = dayKey;

      const award = maybeAwardWeeklyShield({
        now: params.now,
        isPro: params.isPro,
        inventory,
        coveredStreak: currentCoveredStreak,
        streakIsBroken: false,
      });
      inventory = award.inventory;
      continue;
    }
    if (shieldsAvailable > 0) {
      shieldsAvailable -= 1;
      usedShields += 1;
      coveredDays += 1;
      currentCoveredStreak += 1;
      lastStreakDateKey = dayKey;

      const award = maybeAwardWeeklyShield({
        now: params.now,
        isPro: params.isPro,
        inventory,
        coveredStreak: currentCoveredStreak,
        streakIsBroken: false,
      });
      inventory = award.inventory;
      continue;
    }

    // No protection left: streak breaks on this missed day.
    const breakState: StreakBreakState = {
      brokenAtDateKey: dayKey,
      brokenStreakLength: Math.max(0, Math.floor(params.currentStreak ?? 0)),
      eligibleRepairUntilMs: params.now.getTime() + REPAIR_WINDOW_MS,
      repairedAtMs: null,
    };

    const nextInv: StreakProtectionInventory = {
      ...inventory,
      freeFreezeAvailable: freeAvailable,
      shieldsAvailable: shieldsAvailable,
      lastEvaluatedThroughDateKey: yesterdayKey,
      lastEvent:
        coveredDays > 0
          ? {
              id: `freeze-${params.now.toISOString()}-${Math.floor(Math.random() * 1_000_000)}`,
              type: 'freeze_used',
              atMs: params.now.getTime(),
              coveredDays,
              usedFree,
              usedShields,
            }
          : inventory.lastEvent,
    };

    return {
      lastStreakDateKey: null,
      currentStreak: 0,
      currentCoveredStreak: 0,
      inventory: nextInv,
      breakState,
      usedFree,
      usedShields,
      coveredDays,
      broke: true,
    };
  }

  // All missed days were covered.
  const nextInv: StreakProtectionInventory = {
    ...inventory,
    freeFreezeAvailable: freeAvailable,
    shieldsAvailable: shieldsAvailable,
    lastEvaluatedThroughDateKey: yesterdayKey,
    lastEvent:
      coveredDays > 0
        ? {
            id: `freeze-${params.now.toISOString()}-${Math.floor(Math.random() * 1_000_000)}`,
            type: 'freeze_used',
            atMs: params.now.getTime(),
            coveredDays,
            usedFree,
            usedShields,
          }
        : inventory.lastEvent,
  };

  return {
    lastStreakDateKey,
    currentStreak: params.currentStreak,
    currentCoveredStreak,
    inventory: nextInv,
    breakState: params.breakState,
    usedFree,
    usedShields,
    coveredDays,
    broke: false,
  };
}



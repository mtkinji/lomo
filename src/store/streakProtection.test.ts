import {
  evaluateMissedDaysThroughYesterday,
  getDefaultStreakBreak,
  getDefaultStreakProtection,
  localDateKey,
  maybeAwardWeeklyShield,
} from './streakProtection';

function d(iso: string): Date {
  return new Date(iso);
}

describe('streakProtection.evaluateMissedDaysThroughYesterday', () => {
  test('consumes a free freeze for a single missed day (protection spent on the missed day)', () => {
    const now = d('2026-01-12T12:00:00.000Z'); // todayKey depends on local tz, but logic is key-based + yesterday derived
    const todayKey = localDateKey(now);
    const yesterdayKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 1);
      return localDateKey(dt);
    })();
    const twoDaysAgoKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 2);
      return localDateKey(dt);
    })();

    const res = evaluateMissedDaysThroughYesterday({
      now,
      isPro: false,
      lastStreakDateKey: twoDaysAgoKey,
      lastShowUpDateKey: twoDaysAgoKey,
      currentStreak: 10,
      currentCoveredStreak: 10,
      inventory: { ...getDefaultStreakProtection(), freeFreezeAvailable: 1, shieldsAvailable: 0 },
      breakState: getDefaultStreakBreak(),
    });

    expect(res.broke).toBe(false);
    expect(res.usedFree).toBe(1);
    expect(res.usedShields).toBe(0);
    expect(res.coveredDays).toBe(1);
    expect(res.lastStreakDateKey).toBe(yesterdayKey);
    expect(res.currentStreak).toBe(10);
    expect(res.inventory.freeFreezeAvailable).toBe(0);
    expect(res.inventory.lastEvaluatedThroughDateKey).toBe(yesterdayKey);
    expect(res.breakState.brokenAtDateKey).toBe(null);
    // sanity: we didn't mistakenly set to today
    expect(res.lastStreakDateKey).not.toBe(todayKey);
    expect(res.currentCoveredStreak).toBe(11);
  });

  test('consumes free freeze first, then shields (Pro only)', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const yesterdayKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 1);
      return localDateKey(dt);
    })();
    const threeDaysAgoKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 3);
      return localDateKey(dt);
    })();

    const res = evaluateMissedDaysThroughYesterday({
      now,
      isPro: true,
      lastStreakDateKey: threeDaysAgoKey,
      lastShowUpDateKey: threeDaysAgoKey,
      currentStreak: 7,
      currentCoveredStreak: 7,
      inventory: { ...getDefaultStreakProtection(), freeFreezeAvailable: 1, shieldsAvailable: 2 },
      breakState: getDefaultStreakBreak(),
    });

    // Missed 2 days (yesterdayKey is two days after lastStreakDateKey)
    expect(res.broke).toBe(false);
    expect(res.coveredDays).toBe(2);
    expect(res.usedFree).toBe(1);
    expect(res.usedShields).toBe(1);
    expect(res.inventory.freeFreezeAvailable).toBe(0);
    expect(res.inventory.shieldsAvailable).toBe(1);
    expect(res.lastStreakDateKey).toBe(yesterdayKey);
    expect(res.currentCoveredStreak).toBe(9);
  });

  test('does not consume shields when not Pro', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const threeDaysAgoKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 3);
      return localDateKey(dt);
    })();

    const res = evaluateMissedDaysThroughYesterday({
      now,
      isPro: false,
      lastStreakDateKey: threeDaysAgoKey,
      lastShowUpDateKey: threeDaysAgoKey,
      currentStreak: 7,
      currentCoveredStreak: 7,
      inventory: { ...getDefaultStreakProtection(), freeFreezeAvailable: 1, shieldsAvailable: 2 },
      breakState: getDefaultStreakBreak(),
    });

    // Missed 2 days; free freeze covers 1, shields are ignored -> break.
    expect(res.broke).toBe(true);
    expect(res.usedFree).toBe(1);
    expect(res.usedShields).toBe(0);
    expect(res.currentStreak).toBe(0);
    expect(res.breakState.brokenAtDateKey).not.toBe(null);
    expect(res.currentCoveredStreak).toBe(0);
  });

  test('if already broken, evaluation is idempotent and advances lastEvaluatedThroughDateKey', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const yesterdayKey = (() => {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dt.setDate(dt.getDate() - 1);
      return localDateKey(dt);
    })();

    const res = evaluateMissedDaysThroughYesterday({
      now,
      isPro: true,
      lastStreakDateKey: '2026-01-01',
      lastShowUpDateKey: '2026-01-01',
      currentStreak: 0,
      currentCoveredStreak: 0,
      inventory: getDefaultStreakProtection(),
      breakState: {
        ...getDefaultStreakBreak(),
        brokenAtDateKey: '2026-01-10',
        brokenStreakLength: 12,
        eligibleRepairUntilMs: Date.now() + 1234,
      },
    });

    expect(res.breakState.brokenAtDateKey).toBe('2026-01-10');
    expect(res.inventory.lastEvaluatedThroughDateKey).toBe(yesterdayKey);
  });
});

describe('streakProtection.maybeAwardWeeklyShield', () => {
  test('awards on 7th covered day for Pro (once per ISO week)', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const inv0 = { ...getDefaultStreakProtection(), shieldsAvailable: 0 };
    const r1 = maybeAwardWeeklyShield({
      now,
      isPro: true,
      inventory: inv0,
      coveredStreak: 7,
      streakIsBroken: false,
    });
    expect(r1.awarded).toBe(true);
    expect(r1.inventory.shieldsAvailable).toBe(1);
    expect(r1.inventory.lastShieldEarnedWeekKey).not.toBe(null);

    const r2 = maybeAwardWeeklyShield({
      now,
      isPro: true,
      inventory: r1.inventory,
      coveredStreak: 14,
      streakIsBroken: false,
    });
    // same week: no second award
    expect(r2.awarded).toBe(false);
    expect(r2.inventory.shieldsAvailable).toBe(1);
  });

  test('does not award for Free users', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const inv0 = { ...getDefaultStreakProtection(), shieldsAvailable: 0 };
    const r = maybeAwardWeeklyShield({
      now,
      isPro: false,
      inventory: inv0,
      coveredStreak: 7,
      streakIsBroken: false,
    });
    expect(r.awarded).toBe(false);
    expect(r.inventory.shieldsAvailable).toBe(0);
  });

  test('does not award if at cap', () => {
    const now = d('2026-01-12T12:00:00.000Z');
    const inv0 = { ...getDefaultStreakProtection(), shieldsAvailable: 3 };
    const r = maybeAwardWeeklyShield({
      now,
      isPro: true,
      inventory: inv0,
      coveredStreak: 7,
      streakIsBroken: false,
    });
    expect(r.awarded).toBe(false);
    expect(r.inventory.shieldsAvailable).toBe(3);
  });
});



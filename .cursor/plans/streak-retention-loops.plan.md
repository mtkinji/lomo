---
name: "Streak Retention Loops: Notifications, Repair Window, Pro Upsell"
overview: Build plan for streak-at-risk notifications, reactivation pushes, streak repair window, and Pro upsell on streak break.
todos:
  - id: streak-at-risk-notifications
    content: Schedule streak-at-risk push notifications when user hasn't showed up by evening
    status: pending
  - id: reactivation-notifications
    content: Schedule reactivation push notifications after 2-3 days of inactivity referencing last streak
    status: pending
  - id: repair-window
    content: Integrate streakProtection.ts repair window into production recordShowUp flow (24-48h to recover a broken streak)
    status: pending
  - id: pro-upsell-streak-break
    content: Show "Pro would have saved your streak" moment when free user's streak breaks and shields would have helped
    status: pending
isProject: false
---

# Streak Retention Loops: Notifications, Repair Window, Pro Upsell

Prerequisite: Items 1-2 from the [main streaks plan](../../.cursor/plans/streaks_model_analysis_a4e38d2c.plan.md) (remove focus streak, build StreakCapsule) should be completed first.

## 1. Streak-at-Risk Notifications

**Goal:** Prevent streak breaks by nudging users who haven't showed up yet late in the day.

**Current state:**
- `streak` notification type exists in [src/services/NotificationService.ts](src/services/NotificationService.ts) (type union, tap handler navigates to Activities)
- `debugFireNotification('streak')` is dev-only -- no production scheduling
- Daily show-up and daily focus notifications already scheduled; the streak-at-risk notification is a distinct, time-sensitive nudge

**Implementation:**
- New scheduler: `scheduleStreakAtRiskNotification` -- when `currentShowUpStreak > 0` and user hasn't showed up today, schedule a local notification for a configurable time (default 7 PM local)
- Suppress if: user already showed up today (`lastShowUpDate === todayKey`), or daily show-up notification is scheduled within 2 hours
- Copy: "Your [X]-day streak is at risk! Show up before midnight."
- Cancel the notification when `recordShowUp` fires (streak is safe)
- Respect global notification cap (2 system nudges/day) and 6h spacing

**Files to modify:**
- [src/services/NotificationService.ts](src/services/NotificationService.ts) -- add scheduling logic
- [src/store/useAppStore.ts](src/store/useAppStore.ts) -- cancel on show-up

## 2. Reactivation Notifications

**Goal:** Win back users who have gone inactive for 2-3+ days.

**Current state:**
- `reactivation` notification type exists in the type union and tap handling
- No production scheduling

**Implementation:**
- When the user shows up, schedule a "reactivation" notification for 3 days out (local notification)
- If user shows up again within 3 days, cancel and reschedule for 3 days from the new show-up
- Copy references their last streak: "You had a [X]-day streak going. Come back and start building again."
- If streak was 0 or 1, use generic copy: "It's been a few days. Your goals are waiting."

**Files to modify:**
- [src/services/NotificationService.ts](src/services/NotificationService.ts) -- schedule/cancel logic

## 3. Streak Repair Window

**Goal:** Give users 24-48 hours to "repair" a broken streak instead of hard-resetting to 1.

**Current state:**
- [src/store/streakProtection.ts](src/store/streakProtection.ts) has `StreakBreakState` with `brokenAtDateKey`, `brokenStreakLength`, `eligibleRepairUntilMs`, and `REPAIR_WINDOW_MS` (24h)
- `evaluateMissedDaysThroughYesterday` handles the break detection
- None of this is wired to the production `recordShowUp` in `useAppStore.ts`

**Implementation:**
- Add `streakBreakState` to the persisted app store state
- When `recordShowUp` would reset streak to 1 (gap > grace), check if we're within the repair window of a previous break
- If within window: restore the previous streak length instead of resetting
- If outside window or no previous break: reset to 1 as today, but record the break state for future repair
- Surface the repair opportunity in the StreakCapsule (pulsing/amber state) and in a celebration interstitial: "Your streak broke, but you have 24 hours to repair it!"

**Files to modify:**
- [src/store/useAppStore.ts](src/store/useAppStore.ts) -- integrate break state into `recordShowUp`
- [src/store/useCelebrationStore.ts](src/store/useCelebrationStore.ts) -- new `celebrateStreakRepairOpportunity` / `celebrateStreakRepaired`
- [src/ui/layout/PageHeader.tsx](src/ui/layout/PageHeader.tsx) -- repair visual state in StreakCapsule

## 4. Pro Upsell on Streak Break

**Goal:** Convert the emotional moment of a streak break into a Pro conversion opportunity for free users.

**Implementation:**
- When a free user's streak breaks and `shieldsAvailable` was 0 (they had no Pro shields), calculate whether a shield *would have* saved the streak
- If yes, show a "Pro would have saved your [X]-day streak" interstitial with a CTA to the paywall
- Add `pro_only_streak_shields` to `PaywallReason` in [src/services/paywall.ts](src/services/paywall.ts)
- Track conversion rate from this surface via analytics

**Files to modify:**
- [src/services/paywall.ts](src/services/paywall.ts) -- new `PaywallReason`
- [src/store/useCelebrationStore.ts](src/store/useCelebrationStore.ts) -- streak-break celebration with Pro upsell variant
- [src/store/useAppStore.ts](src/store/useAppStore.ts) -- detect "would have been saved" condition

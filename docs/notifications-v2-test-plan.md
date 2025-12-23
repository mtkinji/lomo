# Notifications v2 (System nudges) — Test plan

This is a focused manual QA checklist for:
- Daily show-up (one-shot rescheduled)
- Daily focus (one-shot rescheduled)
- Goal nudges (one-shot, candidate selection, deep link)
- System nudge telemetry + backoff

## Preconditions
- OS permission: Allowed
- In-app: **Allow notifications from Kwilt** ON
- Create:
  - at least 1 Arc
  - at least 1 Goal in that Arc
  - at least 1 incomplete Activity under that Goal

## Settings coverage
- **Daily show-up reminder** ON and set to ~2 minutes ahead
- **Daily focus session** ON and set to ~4 minutes ahead
- **Goal nudges** ON and set to ~6 minutes ahead

## Test cases

### 1) Daily show-up schedules as one-shot
- After toggling ON, verify exactly **one** scheduled notification exists for type `dailyShowUp`.
- Wait for it to fire.
- Expected: after it fires and reconcile runs, the next occurrence is scheduled again (tomorrow or next day depending on suppression/backoff).

### 2) Daily show-up suppression after show-up today
- Complete any Activity (or otherwise trigger `recordShowUp`) so `lastShowUpDate` is today.
- Toggle daily show-up OFF then ON (forces reschedule).
- Expected: the scheduled time is **not today**; it should be **tomorrow** (or later if backoff).

### 3) Daily focus reschedules after focus completed today
- Complete a full Focus session (timer reaches 0).
- Expected: any focus notification scheduled for today is cancelled and rescheduled for tomorrow.

### 4) Goal nudge eligibility
- With NO eligible goal (no goals / no incomplete activities): goal nudge should be cancelled (none scheduled).
- With eligible goal: one goal nudge should be scheduled for `goalNudgeTime` (default 4pm).

### 5) Goal nudge suppression after show-up today
- Ensure `lastShowUpDate` is today.
- Expected: goal nudge cancels (or schedules for a future day), i.e. no same-day goal nudges after show-up.

### 6) Deep link correctness
- Fire a dev goal nudge or wait for scheduled.
- Tap notification.
- Expected: `Goals → GoalDetail(goalId) → Plan tab` and app shell remains intact.

### 7) Backoff (ignore twice)
- Ensure goal nudge scheduled today at ~1–2 minutes ahead.
- Let it fire twice on two days (or simulate by manipulating device time).
- Do NOT open from the notification (ignore).
- Expected: after two consecutive no-opens for `goalNudge`, the next schedule should skip an extra day (backoff).

### 8) Open telemetry
- Tap a `dailyShowUp`, `dailyFocus`, or `goalNudge` notification.
- Expected: `SystemNudgeLedger` records an open entry for that date, and `consecutiveNoOpenByType[type]` resets to 0.

## Debug helpers
Recommended: use the existing DevTools notification fire helper:
- `NotificationService.debugFireNotification('goalNudge')`
- `NotificationService.debugFireNotification('dailyShowUp')`
- `NotificationService.debugFireNotification('dailyFocus')`



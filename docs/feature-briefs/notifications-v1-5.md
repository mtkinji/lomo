## feature brief — Notifications v2 (System nudges) — MVP Launch Addendum

### Purpose

Ship a “v1.5” notifications upgrade that matches the intent of the existing notifications feature brief while staying launch-safe:

- Clearer notification copy (“what is the action?”).
- Goal-level notification strategy (bounded, non-spammy).
- Caps/backoff for non-explicit nudges.
- Deep links that preserve the app shell/canvas model.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Existing feature brief: `docs/notifications-paradigm-prd.md`
- Implementation: `src/services/NotificationService.ts`
- Settings UI: `src/features/account/NotificationsSettingsScreen.tsx`

---

## Current state (in code)

Implemented (current):

- Activity reminders scheduled from `Activity.reminderAt`.
- Daily show-up scheduled from `notificationPreferences.dailyShowUpTime`.
- Tap handling deep-links to Activities list or Activity detail.
- Goal nudges (system nudge) with caps/backoff and deep links.

Remaining launch checks:

- Run the manual QA checklist (see `docs/notifications-v2-test-plan.md`) to confirm all system nudge rules behave as expected on device.

---

## Notification types (MVP)

### 1) Activity reminder (explicit)

- Trigger: `Activity.reminderAt` set in future.
- Never capped by the app (user intent).
- Copy requirements:
  - Title includes Activity title.
  - Body includes Goal title (and optionally Arc name when short).
- Tap behavior:
  - Navigate to Activity detail canvas inside app shell.

### 2) Daily show-up (explicit)

- Trigger: user enables daily show-up + selects time.
- Max 1/day.
- Optional skip if user already showed up today (already implemented).
- Tap behavior:
  - Navigate to the primary daily canvas (currently Activities list).

### 3) Goal nudge (system nudge; new)

Purpose: when users have goals but no explicit reminder set, give a gentle daily pointer to a concrete canvas.

- Trigger: user opts into “Goal nudges” (new toggle) OR defaults on with an easy off switch (decide once).
- Frequency:
  - Max 1/day.
  - Only send if there exists:
    - an active Arc, and
    - at least one active Goal in that Arc with at least one incomplete Activity.
- Selection heuristic (MVP):
  - Prefer a goal with a scheduled Activity today, else the goal with most incomplete activities.
- Copy:
  - Title: “Tiny step for: {Goal title}”
  - Body: “Open kwilt to choose one activity and keep momentum.”
- Tap behavior:
  - Navigate to Goal detail, Plan tab (or closest equivalent) inside app shell.

---

## Caps and backoff (MVP)

### Principles

- **Never cap explicit reminders** (`reminderAt`).
- Cap only system nudges (goal nudges now; streak/reactivation later).

### MVP caps

- Daily show-up: 1/day (already true)
- Goal nudges: 1/day
- Global system nudge cap: 2/day (future-proofing; allows adding streak later without blowing up)

### Data to store (local-only)

- `lastSentAtByType: Record<type, ISO>`
- `sentCountByDate: Record<YYYY-MM-DD, number>`
- (optional) `lastTappedAtByType` to support future backoff

---

## Implementation notes

- Keep scheduling in `NotificationService` so all notification decisions funnel through one module.
- Add a new notification payload type:
  - `type: 'goalNudge'`
  - `goalId: string`
- Update tap handling switch to route goal nudges into `GoalDetail`.

---

## Acceptance criteria

- Activity reminders show the Activity title (and goal context) in notification copy.
- Goal nudges never exceed 1/day and are skipped when irrelevant.
- Notification taps deep-link to the correct canvas and do not break shell/canvas structure.

---

## JTBDs served

This feature brief serves:

- **`jtbd-trust-this-app-with-my-life`** — caps/backoff, clearer copy, and goal-level strategy are the *concrete* mechanisms by which notifications stay calm and respectful of attention. Notifications are the highest-risk trust surface in the app; this feature brief is largely a trust-protection feature brief in disguise.
- **`jtbd-recover-when-i-drift-from-an-arc`** — goal nudges are the explicit channel for "the system noticed an Arc has gone quiet." The acceptance criterion "skipped when irrelevant" is what keeps this from sliding into shame-prompting.
- **`jtbd-move-the-few-things-that-matter`** — Activity reminders and goal context support keeping the few active Goals alive, so movement happens on what matters rather than on whatever was urgent today.

**Stress-test result**: The hypothesis that "notifications are a *modality* serving multiple JTBDs, not a JTBD themselves" holds — this feature brief genuinely serves three different JTBDs. The taxonomy does not need a separate "receive notifications" JTBD node.

See [`docs/jtbd/_index.md`](../jtbd/_index.md) for the taxonomy.


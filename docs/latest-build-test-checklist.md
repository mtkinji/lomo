# Latest build testing checklist (TestFlight)

Build under test: **iOS 1.0.26 (build 46)**

## Paste-ready TestFlight notes (short)

Please focus testing on:
- **Archive/restore** for Arcs + Goals (toasts + navigation + archived sections).
- **Notifications** (daily show-up, daily focus, goal nudges): scheduling, deep links, suppression after “show up”, and avoiding duplicates.
- **AI credits**: credits decrement, low-credit warning toast, and paywall/upgrade messaging when credits are exhausted.

Also do a quick **app-shell regression**: primary nav/drawer works and every screen stays within the usual margins/canvas (no full-bleed weirdness).

If you hit issues, include: device + iOS version, timezone, whether notifications are allowed in iOS Settings, and (for notification bugs) the exact time you toggled settings and what fired.

## Detailed checklist (manual QA)

### 0) Smoke: app shell + navigation integrity
- **Drawer/menu**: open/close from top-left, navigate between **Arcs / Goals / Activities / Settings**.
- **App shell preserved**: each screen keeps the normal shell (primary nav + margins) and the **canvas** content doesn’t overlap headers or clip at the bottom.
- **Cold start**: kill app, reopen, verify you land cleanly and data renders.

### 1) Archive / restore (Arcs + Goals)

#### Arcs list + archive section
- Create 2+ arcs (or use existing ones).
- From **Arcs list**:
  - Verify **archived arcs are hidden by default**.
  - Expand **Archived (N)** → archived items appear; collapse hides them again.

#### Arc detail archive/restore behavior
- Open an Arc → use the **… menu** (or archive CTA if visible) to **Archive**.
  - Expected: confirm dialog, then **toast “Arc archived”**, and you’re returned to the Arcs list (so you’re not “stuck” inside an archived detail view).
- Open the archived Arc from the Archived section → **Restore**.
  - Expected: confirm dialog, toast **“Arc restored”**, and the Arc shows back in the main list.

#### Goals list + archive section
- Create 2+ goals (or use existing ones).
- From **Goals list**:
  - Verify **archived goals are hidden by default**.
  - Expand **Archived (N)** → archived items appear; collapse hides them again.

#### Goal detail archive/restore behavior
- Open a Goal → archive it.
  - Expected: confirm dialog, **toast “Goal archived”**, and you’re returned to the previous screen.
- Open an archived Goal → restore it.
  - Expected: confirm dialog, toast **“Goal restored”**, goal returns to the active list.

#### Limit interaction (Free tier)
- On Free tier, hit the **“active goals per Arc”** limit (create goals until you’re blocked).
- Archive one goal in that Arc, then try creating a new goal again.
  - Expected: archiving removes it from the active count, so creating a new goal succeeds.

### 2) Notifications (daily show-up / daily focus / goal nudges)

Preconditions:
- iOS Settings → Notifications → Kwilt: **Allow Notifications = ON**
- In app: **Settings → Notifications**

#### Basic scheduling + no duplicates
- Turn on:
  - **Daily show-up reminder**
  - **Daily focus session**
  - **Goal nudges**
- Set each time to **~2–6 minutes ahead** (stagger them if possible).
- Wait for them to fire.
  - Expected: each category schedules **one** upcoming notification (no duplicate spam).
  - Expected: after a notification fires, it reschedules for the next valid day.

#### Deep links
- Tap a **goal nudge** notification.
  - Expected: app opens to the relevant goal (Goal detail / plan context), with the app shell intact.

#### Suppression after “show up”
- Do something that counts as “showing up” (e.g., create an Activity or complete one).
- Re-toggle daily show-up OFF → ON (forces reschedule).
  - Expected: daily show-up does **not** schedule again for today (it pushes to tomorrow or later).

#### “Setup next step” when empty
- Make your “today” empty (no goals OR no activities), with daily show-up enabled.
  - Expected: the morning notification becomes a **setup/empty-state** style nudge.
  - Tap it: expected to land on **Activities** with a clear next-step prompt (no broken navigation).

### 3) Activities: reminders + draft fields regression
- Create an Activity with:
  - **Title**
  - **Checklist steps** (add/remove)
  - **Tags**
  - **Deadline (due date)**
  - **Time trigger (reminder)**
  - **Repeat trigger**
  - **Time estimate**
  - **Difficulty**
- If notifications are enabled, set an Activity reminder for **~2 minutes ahead** and confirm it fires.
- Edit the Activity reminder time, confirm the old reminder doesn’t fire (no double reminders).

### 4) AI credits + gating
- Find your credit status in **Settings** (credits remaining this month).
- Trigger a few AI actions (any mix is fine): arc/goal/activity AI helper, tag suggestions, etc.
  - Expected: credits decrement by 1 per AI “consume”.
  - When remaining drops low, expected: a **toast** warning with remaining credits.
- When credits hit 0:
  - Expected: AI entry points show an upgrade/paywall message instead of silently failing.
  - Expected: no negative credit counts; app stays usable in manual flows.



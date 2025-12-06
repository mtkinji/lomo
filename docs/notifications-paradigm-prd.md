## Kwilt Notifications System PRD

This document defines the **local notifications system** for Kwilt and how it supports the broader **Engagement and Motivation System** described in `docs/engagement-and-motivation-system.md`.

The goal is to introduce **gentle, predictable notifications** that help users keep showing up for their life architecture (Arcs → Goals → Activities → Chapters), without overwhelming them or violating the app’s calm, identity-first ethos.

---

## 1. Objectives

### 1.1 Primary Goals

- **Support daily “show up” behavior**
  - Use notifications to gently remind users to open the app, review Today, and take one tiny step.

- **Make Activity reminders reliable**
  - When a user sets an Activity reminder (via `reminderAt` in existing UX), notifications fire at the right time and are cancelled when no longer relevant.

- **Enable streak protection and reactivation**
  - Provide a minimal set of Duolingo-style nudges (streak-preserving and win-back) that respect attention and align with Kwilt’s tone.

- **Respect user agency and OS constraints**
  - Clear, predictable settings and permission flows.
  - Strong defaults that are helpful but not pushy.

### 1.2 Non‑Goals (v1)

- No server-side push notifications (local-only, on-device).  
- No in-app notification inbox or feed.  
- No changes to **Activity Detail UX** or major navigation structure.  
- No cross-device sync of scheduled notifications beyond what is implied by existing state.

---

## 2. User Scenarios

1. **Activity reminder fires on time**
   - I set `reminderAt` on an Activity. At that time, I get a notification that:
     - Names the Activity.
     - Connects it to its Arc/Goal when possible.
     - Tapping it takes me directly to that Activity in the canvas, framed by the regular app shell.

2. **Daily “show up” reminder**
   - I configure a daily reminder (e.g., 8am). Each day around that time, I get a gentle nudge:
     - “Take 60 seconds to review Today.”
     - Tapping takes me to the Today tab canvas.

3. **Streak-saving nudge**
   - I have a streak of showing up. On a day when I haven’t opened the app by my normal time:
     - I get a soft reminder: “You’re 3 days into a showing-up streak. One tiny step keeps it alive.”

4. **Reactivation after a gap**
   - I drop off for a while (no opens or Activities for N days).  
   - I eventually get a respectful, self-compassionate nudge inviting me to restart with one small step.

5. **Full control over notifications**
   - I can open Settings and:
     - See whether system notifications are allowed.
     - Toggle categories (Activity reminders, daily show-up, streak/reactivation).
     - Turn everything off from within the app, with guidance on how to fully disable via OS settings if desired.

---

## 3. Notification Types (v1)

All notifications must:

- Be **short, concrete, and identity-aware** when possible.  
- Deep-link into an appropriate **canvas** while preserving the **app shell**.

### 3.1 Activity Reminder (Core v1)

- **Trigger:**
  - Activity with a `reminderAt` value in the future is created or updated.

- **Cancel/update when:**
  - Activity is completed, archived, or deleted.
  - `reminderAt` is cleared or changed.
  - User disables the “Activity reminders” category.

- **Copy patterns (examples):**
  - Title: “Time for: {Activity title}”  
  - Body: “Connected to {Goal/Arc name}. Take a tiny step now.”

- **Tap behavior:**
  - Navigates to `ActivityDetailScreen` for that Activity in the Activities feature, inside the usual app shell.

### 3.2 Daily Show-Up Reminder (Core v1)

- **Trigger:**
  - User opts into a daily reminder and sets a preferred time.

- **Logic:**
  - One notification per day, around configured time, unless we know the user already opened Today or completed an Activity earlier that day (optional optimization).

- **Copy patterns:**
  - Title: “Align your day with your arcs”  
  - Body: “Open Kwilt to review Today and choose one tiny step.”

- **Tap behavior:**
  - Navigates to `TodayScreen` canvas.

### 3.3 Streak-Saving Nudge (Optional v1.1)

- **Trigger:**
  - User has an active streak (see `engagement-and-motivation-system.md`).  
  - It’s within a time window where they normally engage and they haven’t yet taken a streak-qualifying action today.

- **Copy patterns:**
  - Title: “You’ve been showing up”  
  - Body: “You’re {N} days in. One tiny action today keeps the streak alive.”

- **Tap behavior:**
  - Navigates to `TodayScreen`, optionally scrolled to a suggested Activity.

### 3.4 Reactivation Nudge (Optional v1.1)

- **Trigger:**
  - No app opens or Activity completions for N days.

- **Copy patterns:**
  - Title: “Stories pause. They don’t end.”  
  - Body: “Ready to restart with one small step for {Arc name}?”

- **Tap behavior:**
  - Navigates to `TodayScreen` or a lightweight “pick one Arc to restart” surface in the Today canvas.

---

## 4. UX and Copy Guidelines

- **Identity-first framing**
  - Whenever possible, reference the Arc or identity direction (“Stewardship”, “Project Finisher”) rather than only the task.

- **Tiny, do-able asks**
  - Every notification should invite a **single, low-friction action**:
    - Open Today.
    - Look at one Activity.
    - Mark progress or done.

- **Tone**
  - Warm, calm, gently insistent.
  - No shaming; lapsed users get self-compassionate language.

- **Frequency caps**
  - Global hard cap per day (e.g., 2–3 notifications max, configurable later).  
  - Per-type caps (e.g., at most one reactivation nudge in a given window).  
  - Back-off logic if a user consistently ignores a type of notification.

---

## 5. Functional Requirements

### 5.1 Notification Service Module

Create a `NotificationService` (name flexible) encapsulating all notification-related logic.

- **Responsibilities**
  - Initialize OS notification integration.  
  - Track and expose OS permission status.  
  - Schedule and cancel local notifications.  
  - React to changes in:
    - Activities (especially `reminderAt` and completion state).
    - Engagement metrics (show-up streaks, inactivity windows) as available.
    - App-level notification preferences.

- **API surface (conceptual)**
  - `init()` – hydrate permissions, load app-level preferences, reconcile scheduled notifications on app start.  
  - `ensurePermissionWithRationale(reason)` – triggers in-app soft ask and OS dialog if appropriate.  
  - `scheduleActivityReminder(activity)` / `cancelActivityReminder(activityId)`  
  - `scheduleDailyShowUp(time)` / `cancelDailyShowUp()`  
  - `scheduleStreakNudge(context)` / `scheduleReactivationNudge(context)` (later phases).  
  - `syncFromActivities(activities)` – reconcile all Activity-based notifications.  
  - `applySettings(notificationPreferences)` – update scheduling based on new app-level settings.

Implementation detail (library choice, exact function names) is out of scope for this PRD but must support iOS and Android local notifications with scheduling and cancellation.

### 5.2 Subscribing to Activity Changes

The service must **subscribe to Activity lifecycle events** in the domain/store layer without changing Activity Detail UX.

- **Events to handle**
  - Activity created.  
  - Activity updated (especially `reminderAt`, status, and any due fields).  
  - Activity completed, archived, or deleted.

- **Behavior**
  - On create/update: schedule or reschedule a reminder if:
    - `reminderAt` is set and in the future.  
    - Notification permissions and category settings allow reminders.
  - On complete/archive/delete or when `reminderAt` is cleared:
    - Cancel any pending reminder for that Activity.

### 5.3 App Start and Resume Reconciliation

- On `init()` or app resume, the service should:
  - Read all Activities from the store.  
  - Recompute which reminders should exist (based on Activity state and app-level preferences).  
  - Ensure that:
    - Stale notifications are cancelled.  
    - Missing notifications are scheduled.

This protects against out-of-sync states after app restarts, OS restarts, or library-level quirks.

---

## 6. Permissions and Settings

### 6.1 OS Permissions

- **Strategy**
  - Use a **soft in-app rationale** screen or dialog before the system prompt:  
    - Explain that Kwilt will send **gentle reminders** to support Arcs and Activities.  
    - Let the user explicitly tap “Allow notifications” before presenting the OS dialog.

- **When to ask**
  - On the first attempt to:
    - Schedule an Activity reminder (`reminderAt` set).  
    - Enable a daily show-up reminder in settings.
  - Do **not** ask on first app launch with no clear user intent.

- **States to track**
  - `osPermissionStatus`: `notRequested | authorized | denied | restricted`.  
  - Once denied, avoid repeatedly prompting; instead:
    - Surface a Settings entry that explains how to enable notifications in OS Settings.

### 6.2 In-App Notification Settings

Add a **Notifications** section under the existing Account/Settings screens (using the existing shell/canvas model).

- **Global view**
  - Show OS permission status.  
  - If blocked at OS level, show explanation and a “Open system settings” CTA.

- **App-level toggles**
  - `notificationsEnabled` (master toggle inside the app).  
  - `allowActivityReminders`  
  - `allowDailyShowUp` (with time-of-day picker).  
  - `allowStreakAndReactivation` (if included v1 or v1.1).

- **Behavior**
  - Toggling off a category cancels outstanding notifications of that type.  
  - Toggling off `notificationsEnabled` cancels all and prevents new scheduling, without changing OS permission state.

---

## 7. Data and State

### 7.1 Activity Model

Leverage the existing Activity domain model; `reminderAt` is the primary field for v1.

- **Optional additions (implementation detail, not required for conceptual v1)**
  - `localNotificationId?` per Activity per device to simplify cancel/update.  
  - `dueAt?` if/when due-based reminders are added.  
  - Lightweight metadata structure for future recurrence or multiple reminders.

### 7.2 Notification Preferences Model

Store app-level preferences (likely in `useAppStore`):

- `notificationsEnabled: boolean`  
- `osPermissionStatus: enum`  
- `allowActivityReminders: boolean`  
- `allowDailyShowUp: boolean`  
- `dailyShowUpTime: time-of-day`  
- `allowStreakAndReactivation: boolean` (for future expansion)

---

## 8. Non-Functional Requirements

- **Reliability**
  - Scheduled notifications should fire within an acceptable window of the scheduled time.  
  - Behavior should be consistent across app restarts; on-device persistence must be handled carefully.

- **Performance**
  - Scheduling and cancellation must be non-blocking and not degrade UI responsiveness.

- **Privacy**
  - Notification content should include only data already visible in-app and avoid sensitive details beyond Activity/Goal/Arc naming.

- **Respect for attention**
  - Honor caps and back-off rules; err on the side of fewer, more meaningful notifications rather than more.

---

## 9. Analytics and Evaluation

- **Activation**
  - % of active users who enable notifications.  
  - % of users who configure daily show-up reminders.  

- **Engagement**
  - Notification open rate and tap-through rate, per type.  
  - Change in:
    - Daily/weekly show-up rates.  
    - Activities completed with reminders vs without.  
    - Streak lengths.

- **Quality**
  - App-level opt-outs per category.  
  - OS-level opt-out rates.  
  - Qualitative feedback (support tickets, interviews).

---

## 10. Phasing

### Phase 1 – Foundations

- Implement `NotificationService` with:
  - OS permission management.  
  - Activity-based reminders via `reminderAt`.  
  - Simple app-level settings for enabling/disabling notifications and Activity reminders.  
  - Navigation from notifications into Activity detail and Today canvases.

### Phase 2 – Daily Show-Up

- Add daily show-up reminder configuration.  
- Wire show-up detection (based on Today visits / Activity completion).  
- Introduce basic streak-preserving copy (without complex sequences).

### Phase 3 – Streak and Reactivation Flows

- Add streak and inactivity tracking based on the engagement system.  
- Implement streak-saving and reactivation notifications under clear caps and back-off rules.  
- Iterate copy and timing based on real engagement data.

---

## 11. Open Questions

- Exact thresholds for:
  - What counts as “showing up” in code (e.g., any Activity completion vs just anchored ones).  
  - Inactivity window lengths before reactivation nudges.  
  - Daily frequency caps per user segment.

- Library choice and platform nuances:
  - Which Expo/React Native notifications API to standardize on (and any constraints).  
  - How to handle edge cases like time zone changes and OS-level “Focus” modes.

- Copy and brand voice:
  - Final notification copy variants per type and per state (e.g., early streak vs long streak vs lapsed).

These should be resolved in collaboration between product, design, and engineering when implementing the first phases, with this PRD as the behavioral and architectural guide.

---

## 12. Implementation Checklist

Use this as the living checklist as you implement the notifications + engagement work. Update checkboxes as tasks are completed.

### Phase 0 – Decisions & Design

- [x] Decide on `expo-notifications` as the standard notifications stack and document any constraints.  
- [x] Spike a minimal PoC using `expo-notifications`:
  - [x] Schedule a local notification.  
  - [x] Handle notification tap and navigate to the primary daily canvas (Activities stack).  
- [x] Finalize definitions for:
  - [x] What counts as “showing up” in code (day with ≥1 Activity completion).  
  - [ ] Initial inactivity thresholds for reactivation (e.g., 7 days).  
- [x] Draft initial notification copy variants for:
  - [x] Activity reminders.  
  - [x] Daily show-up reminders.

### Phase 1 – Notifications Foundations (Infra + Activity Reminders)

- [x] Create `NotificationService` module:
  - [x] Implement `init()` to hydrate permissions/preferences and reconcile scheduled notifications.  
  - [x] Implement OS permission helpers (`getOsPermissionStatus`, `ensurePermissionWithRationale`).  
  - [x] Implement `scheduleActivityReminder(activity)` / `cancelActivityReminder(activityId)`.  
  - [x] Implement `applySettings(notificationPreferences)` to respond to settings changes.  
- [x] Wire `NotificationService.init()` into app bootstrap (`App.tsx` / `RootNavigator`).  
- [x] Implement Activity lifecycle subscriptions:
  - [x] On Activity create/update, schedule/reschedule reminders based on `reminderAt` and preferences.  
  - [x] On Activity complete/archive/delete or `reminderAt` cleared, cancel reminders.  
- [x] Implement app start/resume reconciliation:
  - [x] Read Activities from store and recompute which reminders should exist.  
  - [x] Cancel stale notifications and schedule missing ones.  
- [x] Implement basic Notifications section in Settings:
  - [x] Show OS permission status.  
  - [x] Add `Allow notifications` (global) toggle.  
  - [x] Add `Activity reminders` toggle.  
  - [x] Persist preferences in `useAppStore` (or equivalent).  
  - [x] Ensure toggles immediately update `NotificationService` and cancel/reschedule as needed.  
- [x] Implement navigation from Activity reminder taps into `ActivityDetailScreen` within the app shell.

### Phase 2 – Engagement Foundations (Show-Up Streak + Daily Nudge)

- [x] Add engagement state to the store:
  - [x] `lastShowUpDate`.  
  - [x] `currentShowUpStreak`.  
  - [x] `recordShowUp()` and `resetStreak()` helpers.  
- [x] Fire `recordShowUp()` when:
  - [x] An Activity is completed (with guard to avoid double-counting per day).  
- [x] Add streak UI to `TodayScreen` canvas:
  - [x] Display current show-up streak with on-brand styling.  
  - [ ] Add minimal celebratory variants for key milestones (e.g., 3, 7 days).  
- [x] Extend Settings → Notifications:
  - [x] Add `Daily show-up reminder` toggle.  
  - [x] Add `dailyShowUpTime` picker.  
- [x] In `NotificationService`:
  - [x] Implement `scheduleDailyShowUp(time)` / `cancelDailyShowUp()`.  
  - [x] Optionally skip daily show-up notification if show-up already recorded that day.  
- [x] Validate that daily show-up notifications deep-link correctly into the primary daily canvas without breaking shell/canvas structure.

### Phase 3 – Rich Loops (Streak Save + Reactivation + Tuning)

- [ ] Implement streak-save logic:
  - [ ] Detect when a user has an active streak and has not shown up by a configured time window.  
  - [ ] Schedule at most one streak-save notification per applicable day.  
  - [ ] Add app-level `allowStreakAndReactivation` toggle and respect it.  
- [ ] Implement reactivation logic:
  - [ ] Track `lastActiveDate` in the store.  
  - [ ] Detect inactivity windows (e.g., 7 days without show-up).  
  - [ ] Schedule bounded reactivation notifications with self-compassionate copy.  
  - [ ] On tap, navigate to Today with a gentle “welcome back” banner.  
- [ ] Add centralized caps and back-off:
  - [ ] Enforce global max notifications per day per user.  
  - [ ] Enforce per-type limits (e.g., reactivation).  
  - [ ] Track ignored streaks per type and throttle types that are consistently ignored.  
- [ ] Wire analytics:
  - [ ] Events for notification scheduled/fired/tapped by type.  
  - [ ] Events for streak length changes and reactivation events.  
  - [ ] Basic dashboards/queries to review these metrics.

### Phase 4 – Polish, Copy, and Docs Sync

- [ ] Tune notification copy with design to ensure tone matches `ux-style-guide.md`.  
- [ ] Refine streak and celebration visuals in Today to match shell/canvas design standards.  
- [ ] Update `engagement-and-motivation-system.md` with any implementation-driven learnings or changes.  
- [ ] Update this PRD’s phasing and checklist as the system evolves.  



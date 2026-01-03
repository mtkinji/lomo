# Geolocation-based Activity Completion Offers (Arrive/Leave) — PRD

### Summary
Add an opt-in system that lets users attach a **place** to an Activity and configure a **trigger** (“when I arrive” / “when I leave”). When the trigger fires, Kwilt creates a **completion offer** (usually a local notification) prompting the user to mark the Activity as done (or snooze / disable).

This feature must preserve the fundamental UX layering:
- **App shell**: primary nav + consistent margins + global settings.
- **App canvas**: Activity editing + completion prompt surfaces where the action happens.

---

### Goals
- **Reduce “forgot to mark done”** by prompting at the moment the user naturally transitions (arrive/leave).
- Provide **user control**: global enable/disable + per-Activity configuration + guardrails (cooldowns, quiet hours).
- Be **battery-safe** and **spam-safe** (dedupe, caps, jitter handling).
- Fit into existing architecture: `NotificationService` + background reconcile patterns.

### Non-goals (v1)
- Route tracking / continuous fitness tracking.
- Social sharing / server-side location processing by default.
- Perfect reliability: OS background delivery is inherently best-effort; we will design graceful fallbacks.

---

### User stories
- As a user, I can set an Activity’s location to “Gym” and choose **Prompt me when I leave** so I remember to mark it done.
- As a user, I can choose **Prompt me when I arrive** for “Buy groceries” so I don’t forget at the store.
- As a user, I can disable location prompts globally, or for a specific Activity.
- As a user, I can snooze the prompt if I’m busy, or tap “Mark done” directly from the notification.

---

### UX / Product surfaces

### App shell surfaces
- **Settings → Notifications (or a new “Location” settings area)**:
  - Toggle: **Location-based completion offers**
  - Controls:
    - **Trigger defaults**: arrive / leave / ask-per-activity (optional)
    - **Quiet hours** (optional v1.5): don’t prompt during sleep hours
    - **Cooldown** (default 2h per Activity)
    - **Daily cap** (default 2 offers/day total)
  - Permission affordances: show current OS permission state and “Open system settings” if denied.

### App canvas surfaces
- **Activity edit / detail**:
  - Section: **Location**
    - Place picker (label + coordinates + radius)
    - Trigger: **arrive** / **leave**
    - Optional: “Only if not already done today” (for repeating Activities)
    - Optional: “Delay prompt by X minutes” (e.g., leave → prompt 5 min later)

### Prompt surfaces (completion offers)
- **Primary**: local notification
  - Title: “Mark done?”
  - Body: “Did you finish ‘Gym workout’?”
  - Actions:
    - **Mark done**
    - **Snooze** (e.g. 15m / 1h)
    - **Disable for this Activity**
- **Secondary** (in-app): if the app is foregrounded when the trigger fires, show a lightweight in-app offer banner/sheet instead of a notification.

---

### FTUE interstitial (recommended)
Because this feature touches **trust** (location) and **permissions** (location + notifications), it should be introduced during FTUE as an *optional* interstitial.

- **Placement**: after the existing notifications interstitial and before the “Build your path forward” screen.
- **Primary action**: “Enable” (turns on `locationOfferPreferences.enabled`).
- **Secondary action**: “Not now” (proceeds without enabling).
- **Copy goal**: explain *what* happens (“arrive/leave prompts for Activities with a place”) and *what doesn’t* (“we won’t constantly track you” / “only for Activities you attach a place to”).
- **Permissions**:
  - v1: do **not** request OS location permission during FTUE; request only when the user actually attaches a place to an Activity (higher intent, less drop-off).
  - v1.5+: optionally offer a “Continue & allow location” flow for users who want it immediately.

---

### System design (high level)

Kwilt already has a strong pattern for notifications:
- Central `NotificationService` that schedules + listens for opens and deep-links into the app.
- A background reconcile task (`expo-background-fetch` + `expo-task-manager`) to “heal” missed schedules and enforce caps/ledger policy.

We’ll extend this pattern with a parallel pipeline:

1) **Location Engine**: registers OS geofences (best-effort) for Activities with location rules.
2) **Location Event Ingest**: receives arrive/leave events (TaskManager callback).
3) **Offer Engine**: evaluates eligibility + dedupes using a local ledger and user preferences.
4) **Delivery**:
   - If app is foreground: in-app offer surface.
   - Else: schedule/dispatch a local notification (via `NotificationService`) containing `activityId` + context.

Key principle: **location events do not directly mark done**. They only produce an **offer**.

---

### Data model (proposed)

Per-Activity location rule (stored on the Activity object or in a parallel index keyed by Activity id):

```ts
export type LocationTrigger = 'arrive' | 'leave';

export type ActivityLocationRule = {
  enabled: boolean;
  place: {
    label: string;            // "Gym", "Trader Joe's"
    latitude: number;
    longitude: number;
    radiusM: number;          // default 150m (tunable)
  };
  trigger: LocationTrigger;   // arrive | leave
  delayMs?: number;           // optional, e.g. leave → prompt after 5m
  cooldownMs?: number;        // per-activity cooldown, default from global prefs
  onlyIfIncomplete?: boolean; // true by default
};
```

Global preferences (parallel to existing `notificationPreferences`):

```ts
export type LocationOfferPreferences = {
  enabled: boolean;
  // Optional: distinct from notificationsEnabled (but offers typically need notifications for background UX).
  requireNotifications?: boolean;

  // Safety rails:
  dailyCap: number;            // default 2
  globalMinSpacingMs: number;  // default 6h (align with system nudges)
  defaultCooldownMs: number;   // default 2h per activity

  // Optional quiet hours:
  quietHours?: { startHHmm: string; endHHmm: string };
};
```

Offer ledger (local-only idempotence + analytics-friendly):

```ts
export type LocationOfferLedger = {
  // Last time we observed a transition for a specific activity/place
  lastEventAtByActivityId?: Record<string, string>; // ISO
  // Last time we surfaced an offer (notification or in-app)
  lastOfferAtByActivityId?: Record<string, string>; // ISO
  // Optional: per-day send counts
  sentCountByDate?: Record<string, number>; // YYYY-MM-DD local
};
```

---

### Eligibility & guardrails

### Deduping / jitter handling
Location can “bounce” at the boundary. To avoid spam:
- **Hysteresis**: consider adding an implicit buffer (e.g., radiusM + 25m for leave, radiusM − 25m for arrive) if supported.
- **Min dwell** (optional v1.5): require the user to be inside/outside for \(N\) minutes before counting the transition.
- **Event cooldown**: ignore repeated events for the same Activity within \(cooldownMs\).

### Offer policy checks (in order)
- **Global enabled**: location offers enabled.
- **OS permissions**: appropriate location permission level granted (platform-specific).
- **Notifications**:
  - If background prompting is desired, require notifications permission (`NotificationService.ensurePermissionWithRationale`).
  - If notifications disabled, still allow **foreground in-app** offers (optional; decide per v1 scope).
- **Activity state**:
  - Only offer if Activity exists and is not already `done` (or “done today” for repeating).
- **Global caps**:
  - Daily cap across all location offers.
  - Minimum spacing between offers (global).

### Output behaviors
- **Foreground**: show in-app offer immediately (or after delay).
- **Background**: schedule a one-shot notification “now + delayMs”.

---

### Platform considerations (important)

### Permissions UX
We should present permission prompts only when the user opts in:
- When user toggles on **Location-based completion offers** or adds a location rule to an Activity:
  - Explain “We use your location to detect arrive/leave for this Activity. Kwilt does not share this location unless you choose to.”
  - Request the minimum permission needed:
    - iOS: typically “Always” is required for geofence triggers in background.
    - Android: background location may be required depending on API level and geofencing behavior.

### Background reliability
Geofence delivery is best-effort:
- OS may delay/skip events due to power modes, permission changes, device reboots, app being force-quit.
- Design for graceful degradation:
  - On app open, **reconcile** and ensure geofences are registered for currently-enabled rules.
  - Maintain a ledger so we can avoid double-firing if the OS delivers late.

### Region limits
Typical OS limits exist (varies by platform/OS):
- Keep v1 scoped to a **small number of active geofences**:
  - Prioritize: Activities that are not done + are “important” (e.g., priority 1) + most recently updated.
  - Or cap to N active rules (e.g., 20) and surface that clearly in settings.

---

### Notification integration (proposal)

Add a new notification payload type:

```ts
type NotificationData =
  | { type: 'locationCompletionOffer'; activityId: string; trigger: 'arrive' | 'leave' };
```

Handling:
- Tapping notification navigates to the Activity detail and opens a lightweight “Mark done?” confirmation (or marks done directly if that’s consistent with UX).
- Action buttons:
  - “Mark done” dispatches the same state update as existing completion toggles.
  - “Snooze” schedules another one-shot notification.
  - “Disable” turns off the Activity’s location rule (and updates geofence registrations).

---

### Analytics (recommended)
- **LocationOfferEligible**: event received, passed eligibility checks (include trigger, activityId, rule radius, delay).
- **LocationOfferSuppressed**: reason (cooldown, cap, quiet hours, already done, missing permission, etc.).
- **LocationOfferShown**: channel (in_app vs notification).
- **LocationOfferAction**: mark_done / snooze / disable / dismiss.

---

### Rollout plan

### Phase 0 — Spec & instrumentation
- Finalize data model + UI surfaces.
- Add analytics + local ledgers.

### Phase 1 — Foreground-only (low risk)
- Only show in-app offers when app is active and user enters/leaves a place (using a manual “Check-in” button or foreground location polling).
- Validates UX, copy, and guardrails without background complexity.

### Phase 2 — Background geofences (full experience)
- Register geofences with TaskManager.
- Drive offers via background events.
- Add reconcile-on-launch.

### Phase 3 — Scaling & refinement
- Prioritization strategy for region limits.
- Dwell time/hysteresis improvements.
- Quiet hours and smarter “done today” semantics for repeating Activities.

---

### QA / test plan
- **Permission flows**: allow/deny/restrict; ensure settings UI reflects state.
- **Spam safety**: boundary bounce, repeated triggers, multiple Activities in same place.
- **Edge cases**:
  - Activity deleted while geofence registered
  - Activity marked done before delayed offer fires
  - User disables notifications but keeps location offers enabled (expected behavior defined)
  - Timezone changes affecting daily caps
- **Deep-link correctness**: tapping notification consistently lands in the correct Activity and applies actions.

---

### Open questions
- Should location offers be a subcategory under notifications, or a parallel setting (since foreground offers don’t require notifications)?
- For repeating Activities, what does “already done” mean:
  - done ever, done today, or done since last trigger?
- Do we want “arrive AND leave” as a combined option, or keep v1 as single trigger per Activity?
- How should we prioritize geofences when over the OS cap (priority 1, soonest scheduled, recency, etc.)?



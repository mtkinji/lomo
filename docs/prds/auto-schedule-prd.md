## PRD — Auto‑Schedule (calendar connections + scheduling guidance + auto placement)

### Purpose

Let users connect the calendar(s) they actually use and configure simple scheduling guidance so **Kwilt can automatically place Activities onto the user’s calendar** (or propose a plan the user confirms).

This feature should preserve Kwilt’s UX layering:
- **App shell**: navigation + gutters remain intact.
- **App canvas**: scheduling configuration, previews, and activity placement happen inside the normal screens/sheets (never a new shell).

### References

- Calendar model + ICS export foundation: `docs/prds/calendar-export-ics-prd.md`
- Activity fields: `Activity.scheduledAt?: string | null` (see `src/domain/types.ts`)
- AI/tool evolution already planned: `docs/ai-chat-architecture.md` (`suggestScheduleForActivities`, `scheduleActivitiesOnCalendar`)

---

## Problem

Users already plan their time in calendar apps. Even if they like Kwilt’s Activities, they won’t reliably execute unless:
- Activities become “real time blocks” in the calendar they live by, and
- Scheduling stays lightweight, safe, and reversible.

We want to support a spectrum:
- “Help me plan” (suggested schedule + confirmation)
- “Keep me on track” (auto-schedule with guardrails)

---

## Product principles

- **User-controlled automation**: scheduling never happens without an explicit opt-in; always offer preview + undo.
- **Calendar-native**: create real calendar events in the user’s chosen calendar(s).
- **Low-friction first**: start with device calendar integration (no OAuth) where possible; expand later.
- **Safety over cleverness**: fewer, more predictable decisions beat a “smart” system that surprises.
- **Explainable**: show why something was placed where it was (rules, windows, conflicts).

---

## Proposed feature shape (two versions)

### Version A (recommended first): “Auto‑Schedule Assist” (plan → user confirms)

Kwilt generates a proposed schedule for selected Activities and the user taps **Apply** to create calendar events and set `scheduledAt`.

- Pros: safer, easier trust, fewer edge cases, no background rescheduling required.
- Cons: not fully “auto”.

### Version B (later): “Auto‑Schedule” (continuous placement + repair)

When Activities are created/updated (or at a daily cadence), Kwilt automatically places or adjusts Activities within user-defined guardrails.

- Pros: real automation.
- Cons: requires conflict detection, change logs, and strong undo/lock semantics.

This PRD defines both, with **V1 targeting Version A** and laying a clean path to Version B.

---

## UX

### Entry points

1. **Settings → Scheduling** (app-level config)
   - Connect calendars / pick destination calendar
   - Set scheduling guidance (windows, days, limits)
   - Toggle “Assist” (V1) and later “Auto” (V2)

2. **Activities**
   - Bulk action: “Schedule week…” / “Auto‑schedule” (opens preview)
   - On Activity detail: “Schedule” (existing manual affordance expands into preview flow)

3. **(Optional) AI planning mode**
   - A “Weekly planning” workflow in `AgentWorkspace` that can:
     - propose a plan (`suggestScheduleForActivities`)
     - apply it (`scheduleActivitiesOnCalendar`)

### Where the user sees “their plan” (V1)

In V1 (Assist), the “plan” is simply: **Activities that now have `scheduledAt` + calendar event linkage**.

Primary surface (recommended): **the user’s calendar app**.
- Once Apply is tapped, events exist in the calendar the user already lives in. That *is* the plan.
- Kwilt’s job is to make it easy to create/revise those blocks without introducing a new, bulky planning screen.

Secondary surfaces:
- **Today**: show a compact “Scheduled today” block (derived from `scheduledAt`) with:
  - quick actions: “Reschedule”, “Open in calendar”
  - optional “Schedule more…” CTA when today is empty
- **Activities list**: add a lightweight filter/segment (e.g. “All / Scheduled / Unscheduled”) so users can find what Kwilt has placed without a new screen.
- **Activity detail**: shows the current scheduled slot and the “Open in calendar” link, plus “Unschedule”.

### Settings → Scheduling (app-level config)

Config fields (initial set):

- **Calendar destination**
  - **Calendar access**: permission + source selection
  - **Destination calendar**: where Kwilt writes events (default: a dedicated “Kwilt” calendar)
- **Time windows**
  - Workdays: e.g., Mon–Fri
  - Windows per day: e.g., 7:00–8:30, 12:00–13:00, 18:00–21:00
  - Optional “Focus days” (e.g., Tue/Thu evenings)
- **Pacing**
  - Max scheduled minutes/day and minutes/week
  - Minimum buffer between Kwilt events (e.g., 15m)
  - Avoid scheduling after a certain time (e.g., after 9pm)
- **Conflict policy**
  - Only schedule into free time (default)
  - Allow “tentative” overlay (later; provider dependent)
- **Stability policy**
  - Don’t move events within 24h
  - Respect “locked” activities (manual pin)

### Scheduling preview (V1 Assist)

Preview shows:
- A list of proposed time blocks (Activity title, duration, day/time, reasoning tags)
- Conflicts (if any) and suggested fixes
- **Apply** (creates calendar events + sets `scheduledAt`)
- **Edit** (tap to adjust slot)
- **Cancel**

After Apply:
- A lightweight success banner + “Undo” (removes created events and reverts `scheduledAt`).

---

## Data model (proposed additions)

We already have:
- `Activity.scheduledAt?: string | null` — intended start timestamp.

Add:

- **Activity scheduling metadata**
  - `scheduledDurationMinutes?: number | null` (freeze duration used for calendar block)
  - `scheduleSource?: 'manual' | 'assist' | 'auto'` (who set it)
  - `lockedSchedule?: boolean` (user pins; prevents auto moves)

- **Calendar linkage**
  - `calendarEvent?: { provider: 'device' | 'google' | 'microsoft' | 'caldav'; calendarId: string; eventId: string } | null`

- **App-level scheduling profile**
  - Add `scheduling?: SchedulingPreferences` under `UserProfile.preferences` (additive, optional):
    - destination calendar id
    - weekly windows + pacing constraints
    - enable flags (assist enabled, auto enabled)
  - This matches existing app patterns: `UserProfile` is already stored/updated via `updateUserProfile`, and can later be synced server-side.

Note: even if we start local-first, the **profile shape should be server-storable** for portability.

---

## Scheduling engine (V1 Assist)

### Inputs

- Candidate activities (selected list, or “unscheduled + due soon”)
- Activity properties:
  - duration estimate (`Activity.estimateMinutes`, fallback default e.g. 30m)
  - deadlines / preferred date (if present)
  - locked/blocked flags
- User `UserProfile.preferences.scheduling` (SchedulingPreferences)
- Calendar availability (free/busy) from the chosen provider

### Output

- A proposed set of placements:
  - `activityId`, `startAt`, `endAt`, `reasonCodes[]`
  - and optionally `conflicts[]`

### Placement rules (first pass)

- Only place into configured windows.
- Respect max minutes per day/week.
- Prefer earlier slots before deadlines.
- Spread similar activities (avoid back-to-back if buffer set).
- Never place overlapping existing events (default).

### Conflict handling (V1)

- If no valid slots: show “needs manual scheduling” list with suggested next actions:
  - expand windows
  - reduce minutes/week
  - pick fewer activities

---

## Integrations strategy

### V1: device calendar integration (recommended)

Goal: avoid OAuth initially by using native calendar access:
- **iOS**: EventKit
- **Android**: Calendar Provider

Implementation approach:
- Use `expo-calendar` (already present in `package.json`) behind a `CalendarIntegration` interface so we can later swap in OAuth-backed providers without rewriting feature UX.
- Create (or select) a dedicated “Kwilt” calendar as the default destination to keep writes isolated and easy to disable/delete.

Capabilities needed for V1:
- Request permission
- List calendars
- Create/update/delete events
- Read events for free/busy approximation (time range queries)

Limitations (acceptable for V1):
- Free/busy is approximated by reading events; some calendars may not expose full details depending on OS settings.

### MCP play (where it helps, and where it doesn’t)

MCP is most valuable once we move beyond “device calendar” and want a clean, tool-like abstraction for many integrations (Google/Microsoft calendars, task apps, etc.)—especially for AI-driven planning workflows.

Recommended stance:
- **V1 (device calendar via `expo-calendar`)**: MCP is not necessary. Native modules are simpler, faster, and avoid network/auth complexity.
- **V2+ (OAuth providers + richer integrations)**: MCP becomes a strong fit as the **integration interface** behind `external_integration` tools like `scheduleActivitiesOnCalendar`.

Concrete MCP concept:
- Build an internal `CalendarIntegration` interface in the app/server.
- Implement provider connectors as MCP servers (or wrap existing connectors behind MCP):
  - `calendar.list_calendars`
  - `calendar.freebusy`
  - `calendar.create_event`
  - `calendar.update_event`
  - `calendar.delete_event`
- The kwilt “tool registry” (see `docs/ai-chat-architecture.md`) maps `scheduleActivitiesOnCalendar` → the calendar MCP client.

What this unlocks:
- **User-chosen providers/apps**: “use Google Calendar for work, Apple Calendar for personal” without custom provider code per surface.
- **Agentic planning**: `suggestScheduleForActivities` (AI) → `calendar.freebusy` (MCP) → `calendar.create_event` (MCP).
- **Future app integrations**: similar MCP servers for Notion/Todoist/Things, etc., while keeping Kwilt UX consistent.

Guardrails:
- Keep MCP calls **server-side** once OAuth tokens are involved (auditability + secret handling).
- Maintain the same **preview + apply** UX even if MCP enables deeper automation; avoid background surprise edits.

### V2+: provider OAuth + server-side orchestration

Add integrations:
- Google Calendar (OAuth)
- Microsoft Outlook/Graph
- CalDAV (Apple/others) if needed

Server responsibilities:
- Store tokens
- Run free/busy queries reliably
- Perform event writes
- Support webhooks for changes (later)

The tool registry mapping from `docs/ai-chat-architecture.md` remains the same; only implementations move server-side.

---

## Permissions, privacy, and safety

- **Minimize scopes**: only request calendar access needed for the chosen capability.
- **User transparency**:
  - show which calendar we write to
  - show what data we read (time blocks only vs event details)
- **Event content**:
  - event title = Activity title
  - description can include a deep link back to Kwilt (and optionally Goal name)
  - avoid sensitive AI-generated text by default
- **Undo + audit**:
  - every apply action records a change set so we can undo reliably
- **Rate limiting** (V2):
  - cap automatic edits per day
  - never reschedule within the “stability window”

---

## Rollout plan

### Phase 0 (already): manual calendar export

- `.ics` export via share sheet (`docs/prds/calendar-export-ics-prd.md`)

### Phase 1 (V1): Assist preview + apply (device calendar)

- Settings scheduling profile + calendar destination
- “Schedule…” preview for:
  - selected Activities
  - or “Schedule my week” (top N unscheduled)
- Apply creates events + sets `scheduledAt` + stores linkage
- Undo removes created events and reverts scheduling fields

### Phase 2 (V2): Auto-schedule toggle (still device calendar)

- Auto-schedule on Activity creation / weekly planning
- Lock/pin activities to prevent movement
- Basic conflict repair (only for future events outside stability window)

### Phase 3 (V3): OAuth providers + reliability upgrades

- Google/Microsoft integrations via server
- Optional webhook-driven resync

---

## Success metrics

- **Activation**: % of users enabling Scheduling Assist and connecting a destination calendar
- **Adoption**: events created per active user/week
- **Trust**: undo rate; “lock activity” usage; disable rate after enabling
- **Outcome**: completion rate of scheduled vs unscheduled activities

---

## Acceptance criteria (V1 Assist)

- User can:
  - grant calendar permission
  - select a destination calendar
  - generate a schedule preview for selected activities
  - apply it and see real calendar events created
  - undo the apply and see events removed
- Applying sets `Activity.scheduledAt` and persists calendar linkage.
- App shell/canvas structure remains intact (no new top-level navigation shell).



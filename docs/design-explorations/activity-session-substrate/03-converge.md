# Converge: Activity Session Substrate

## Qualitative Scoring

| Alternative | Strategic fit | V1 buildability | Product clarity | Future leverage | Risk |
| --- | --- | --- | --- | --- | --- |
| Schedule-Only Substrate | Medium | Strong | Strong | Medium | Under-abstraction |
| Unified Activity Session Substrate | Strong | Medium | Strong if quiet | Strong | Over-abstraction if surfaced |
| Engagement Evidence Ledger | Medium | Medium | Medium | Strong for Chapters | Does not solve scheduling first |
| Focus Session As Canonical Session | Medium | Strong | Medium | Medium | Over-forces Focus |
| Cross-App Session Platform | Strong later | Weak now | Weak now | Strong later | Premature platform work |

## Chosen Alternative

Choose **Unified Activity Session Substrate, schedule-first**.

Define one internal Activity-session contract broad enough to later connect planned calendar sessions, Focus engagement, and Chapter evidence. Ship only the schedule-session slice first. The substrate should be present in naming, tests, and domain helpers, but the visible product should remain Activity Detail and Plan.

## Capability Delta

Today, the user cannot:
- Reliably distinguish planned calendar blocks from actual engagement.
- Schedule one Activity into multiple planned attempts without task duplication.
- Give Chapters future access to grounded attempt evidence without time tracking.
- Preserve a stable conceptual bridge from mobile Plan to future desktop/agent surfaces.

After this concept ships, the product can:
- Represent a planned attempt as an Activity session.
- Keep one Activity as the durable intention while multiple sessions carry time-bound attempts.
- Preserve a next-session projection for existing surfaces.
- Later attach Focus engagement and Chapter reflection to the same session lineage.

Still intentionally not supported after the first release:
- Visible session dashboard.
- Automatic AI multi-session planning.
- Focus auto-start from scheduled time.
- Chapter planning or future prescription.
- Cross-app shared session infrastructure.

## Reductive Design Pass

Smallest elegant version:
- Add a quiet `ActivitySession` domain contract.
- Implement only `kind: 'scheduled'` sessions in the first build.
- Keep existing Activity Detail and Plan surfaces.
- Keep `scheduledAt` as a projection, not the source of truth.
- Add clear tests for projection and duplicate prevention.

Can enhance existing features:
- Activity Detail: schedule state and "Add another session."
- Plan: multiple blocks for one Activity.
- Focus: future hook to attach actual engagement, no V1 UI.
- Chapters: future evidence source, no V1 UI.

Refuse to add:
- A Sessions tab.
- Time totals.
- Productivity scoring.
- Streaks or missed-session pressure.
- Cross-app synchronization in V1.
- AI interpretation of session meaning before there is dogfood evidence.

## Activation And Learning Path

Activate only when the user schedules or interacts with scheduled Activities:
- First scheduled Activity creates the first session.
- Attempting the same time resolves to the existing session.
- Choosing a different time exposes "Add another session."
- Plan block interactions are session-specific.

Teach contextually:
- Use labels like `Add another session`, `Move session`, and `Already scheduled there`.
- Avoid introducing "Activity Session Substrate" or "session ledger" to users.

Natural adoption:
- Andrew schedules one Activity into two planned blocks, later starts Focus from one of them, and later sees that the Activity still feels like one coherent to-do.

## Accepted Trade-offs

- Accept a slightly broader internal model than the schedule-only slice needs so the names and tests do not fight future Focus/Chapter integration.
- Accept that Focus and Chapters will not consume sessions in the first build.
- Accept a compatibility projection to protect current UI and sync paths.

## Rejected Trade-offs

- Do not build a generic cross-app session platform yet.
- Do not make Focus Sessions the only kind of session.
- Do not store only retrospective evidence and ignore planned attempts.
- Do not expose session history as a management surface.

## Build Plan

### Stage 1: Domain Substrate

- Define `ActivitySession` as an internal domain type.
- Define `ActivitySessionKind = 'scheduled' | 'focus' | 'evidence'` or reserve future values while implementing only `scheduled`.
- Add helpers:
  - `getActiveActivitySessions(activity)`
  - `deriveNextScheduledSession(activity, now)`
  - `projectActivityScheduleFields(activity)`
  - `isDuplicateScheduledSession(candidate, existingSessions, tolerance)`
  - `upsertScheduledSessionFromCalendarEvent(activity, sessionInput)`
- Add tests before wiring UI.

### Stage 2: Compatibility Adapter

- Keep `scheduledAt` and `calendarBinding` in sync with the next active scheduled session.
- Preserve legacy provider fields as derived compatibility fields.
- Ensure old single-scheduled Activities can be read as one scheduled session without destructive migration.

### Stage 3: Activity Detail Scheduling

- Convert schedule commit to create/update scheduled sessions.
- Exact duplicate attempts resolve to the existing session.
- Different slots require explicit "Add another session."
- Existing schedule drawer stays the primary surface.

### Stage 4: Plan Rendering And Actions

- Render scheduled sessions as blocks, not one block per Activity.
- Move/unschedule operate on the selected session.
- Existing unscheduled recommendation logic continues to exclude Activities already scheduled for the same time window.

### Stage 5: Focus/Chapter Readiness

- Add future-safe ids/fields so a Focus Session can later reference a scheduled session.
- Do not change Focus UI yet.
- Do not change Chapter generation yet.
- Add documentation for how Chapters may later consume session evidence.

## Stated Bet

We're betting that a quiet Activity-session substrate will make Kwilt's planning, doing, and reflection surfaces cohere without adding visible complexity. If it turns out the abstraction is too broad, we will keep the schedule-session implementation and defer Focus/Chapter integration rather than force the platform idea.

## Success Signal

The build plan is successful when the first implementation can support multiple managed scheduled sessions for one Activity, prevent duplicate calendar writes, and preserve existing scheduled surfaces through projection, while leaving Focus and Chapters behavior unchanged.

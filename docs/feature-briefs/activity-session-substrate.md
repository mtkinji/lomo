---
id: brief-activity-session-substrate
title: Activity Session Substrate
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-trust-this-app-with-my-life
related_briefs:
  - todo-schedule-sessions
  - auto-schedule
  - calendar-export-ics
  - dynamic-next-best-action
  - focus-protection
  - chapters-retrospective-sensemaking
owner: andrew
last_updated: 2026-07-08
---

# Activity Session Substrate

## Summary

Kwilt should treat an Activity as the durable intention and a session as a bounded attempt to work on that intention. The first buildable release should not expose "sessions" as a new product concept. It should quietly introduce the substrate through scheduled sessions, so one to-do can be planned into multiple calendar blocks while exact duplicates are prevented and existing Activity/Plan surfaces remain coherent.

## Design Challenge

How might Kwilt let Marcus place one meaningful to-do into time more than once, across a day or week, without turning the app into a time tracker or creating another planning system to maintain?

## Product Bet

If Kwilt separates durable intentions from bounded attempts internally, then Plan, Focus, and Chapters can become one coherent lifecycle:

- Activity: the thing Marcus means to move forward.
- Scheduled session: a planned attempt at a specific time.
- Focus session: a protected doing interval, later attachable to a planned attempt.
- Chapter evidence: retrospective proof and meaning, later attachable to what actually happened.

The bet is not that users want to manage sessions. The bet is that Kwilt needs a session-shaped substrate so scheduling, doing, and reflection can become trustworthy without exposing more machinery.

## Target User And Job

Target audience: burned-out productivity power users.

Representative persona: Marcus.

Hero JTBD: `jtbd-move-the-few-things-that-matter`.

Job-flow pressure point: Marcus has already captured too much and needs to decide what is worth doing next, place it into real time, and later understand whether the day actually moved what mattered.

## Scope

### In Scope

- Introduce an internal scheduled-session domain contract for Activities.
- Allow one Activity to own multiple distinct scheduled sessions.
- Prevent exact duplicate scheduled sessions for the same Activity and same time window.
- Recover from ambiguous calendar-provider writes without creating duplicate external events.
- Keep existing `scheduledAt` and calendar-binding behavior working through a next-session compatibility projection.
- Render and act on multiple scheduled blocks for the same Activity in Plan.
- Keep Activity Detail scheduling understandable for the first and second session.

### Out Of Scope

- Focus-session linking UI.
- Chapters prompt or generation changes.
- Cross-app session syncing.
- Session dashboards or history management.
- Time totals, productivity scores, or missed-session scoring.
- AI-generated multi-session plans.
- Treating scheduled calendar blocks as due dates.

## Domain Contract

V1 should keep the model narrow and schedule-first:

```ts
type ActivitySessionKind = 'scheduled';
type ActivitySessionStatus = 'scheduled' | 'cancelled';

type ActivitySession = {
  id: string;
  activityId: string;
  kind: ActivitySessionKind;
  status: ActivitySessionStatus;
  start: string;
  end: string;
  source: 'activity-detail' | 'plan' | 'calendar-recovery';
  calendarBinding?: {
    provider: 'apple' | 'google' | 'expo-calendar';
    calendarId?: string;
    eventId?: string;
    externalIdentifier?: string;
  };
  createdAt: string;
  updatedAt: string;
};
```

Future fields such as `linkedFocusSessionId` or `evidenceNoteId` should remain design notes until there is a real Focus or Chapters integration. The code should leave a clean attachment point without pretending the linkage exists.

Storage can start inline on Activity if that keeps migration risk lower. If the helper boundaries are clean, a later normalized table/store can preserve the same domain contract.

## Build Plan

### Stage 1: Domain Helpers

Write regression-first tests around pure scheduled-session helpers:

- `getActiveActivitySessions(activity)`
- `deriveNextScheduledSession(activity, now)`
- `projectActivityScheduleFields(activity, now)`
- `isDuplicateScheduledSession(activity, candidate)`
- `upsertScheduledSessionFromCalendarEvent(activity, session, providerResult)`
- `cancelActivitySession(activity, sessionId)`
- `moveActivitySession(activity, sessionId, nextWindow)`

Acceptance criteria:
- Exact duplicate windows are rejected.
- Adjacent or distinct windows are allowed.
- Cancelled sessions do not project as the next schedule.
- The next active scheduled session drives compatibility fields.
- Provider recovery updates the intended session instead of adding another one.

### Stage 2: Compatibility Projection

Keep existing screens working while sessions are introduced:

- `scheduledAt` projects from the next active scheduled session.
- Existing calendar-binding fields project from that same session.
- Existing Activities without sessions continue to behave as they do today.
- No destructive migration is required for the learning release.

Acceptance criteria:
- Today, Activity Detail, and Plan agree on the next scheduled time.
- Old single-scheduled Activities remain readable.
- Removing the feature flag or hiding the second-session UI leaves first-session scheduling intact.

### Stage 3: Activity Detail Scheduling

Make the Activity Detail schedule sheet session-aware without making the user learn the model:

- First schedule action works as it does now.
- If the Activity already has a scheduled session, the UI can offer another distinct session.
- Exact duplicate copy is calm and specific.
- Moving or unscheduling one session does not affect the others.

Acceptance criteria:
- A user can schedule the same Activity twice on the same day at different times.
- A user cannot accidentally schedule the same Activity twice for the same time window.
- Calendar-provider error copy distinguishes permission failure from duplicate/recovered provider state where practical.

### Stage 4: Plan Rendering And Actions

Plan should treat each scheduled session as a block while preserving the Activity relationship:

- Multiple Plan blocks can link to the same Activity.
- The selected block determines move/unschedule behavior.
- Calendar recovery remains idempotent per session.
- Button copy continues to name the chosen time window, not the substrate.

Acceptance criteria:
- Duplicate Plan blocks at the exact same time cannot be created by retrying.
- Distinct Plan blocks for the same Activity remain individually actionable.
- Plan never implies there are multiple separate to-dos when there is one Activity with multiple sessions.

### Stage 5: Focus And Chapters Readiness

Do not ship visible Focus or Chapters behavior in this release. Prepare only the seams that make the later work honest:

- Session IDs are stable enough for a future Focus run to reference.
- Session status and timestamps can support later "planned vs happened" reasoning.
- Chapters can later consume completion evidence without turning Activities into retrospective objects.

Acceptance criteria:
- No Focus UI changes.
- No Chapter generation changes.
- Future integration notes live in code comments or design docs only where they reduce ambiguity.

## Product Surface Notes

Activity Detail should stay practical: "Schedule," "Add another time," "Move," and "Unschedule" are enough. Avoid explaining the lifecycle inline.

Plan should remain the execution canvas. It can show multiple blocks for one Activity, but it should not introduce a session-management mode.

Today should continue to answer "what is next?" through the compatibility projection, not become a place to manage every planned attempt.

## Verification

Run:

```bash
npm run product:lint
npm run verify:changed -- --run
```

Add focused Jest coverage for the domain helpers before changing UI code. The critical regression is the TestFlight bug pattern: an ambiguous provider write must not surface as failure while still creating duplicate overlapping calendar events.

Manual TestFlight verification should cover:
- Schedule a new Activity once.
- Retry the same schedule action after an ambiguous provider response.
- Add a second distinct session for the same Activity.
- Move only one session.
- Unschedule only one session.
- Confirm Plan and Activity Detail remain consistent.

## Success Signals

- The user can schedule multiple real working sessions for one to-do without duplicate overlap.
- Existing scheduling behavior feels more trustworthy, not more complex.
- The codebase gains a durable place to reason about planned attempts.
- Future Focus and Chapters work can attach to sessions without retrofitting the Activity model again.

## Open Questions

- Should V1 store sessions inline on Activity, or introduce a normalized store/table immediately?
- What duplicate tolerance should count as the same window: exact start/end only, or small calendar-provider drift?
- How many future sessions should Activity Detail show before collapsing?
- Should cancelled sessions remain hidden forever in V1, or be retained for future history/evidence?
- Should provider recovery create a session if the external event exists but local session creation failed?
- When Focus eventually starts from a scheduled session, does it claim the session, copy it, or simply reference it?

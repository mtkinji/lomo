---
id: brief-activity-areas
title: Activity Areas
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-action-contexts, todo-list-grouping-config, todo-organization-triage, auto-schedule]
owner: andrew
last_updated: 2026-06-25
---

# Activity Areas

## Context

Kwilt's to-do model is gaining smarter priority, recommendations, grouping, and scheduling. The missing user-owned signal is the part of life a to-do belongs to. "Work" and "Personal" already exist implicitly in scheduling inference, but they are too narrow and not inspectable. **Area** turns that hidden scheduling domain into a calm, Settings-managed concept that can help scheduling and recommendations without making capture heavier.

## Target audience

Aspirational family organizers need Kwilt to help ordinary work, family, home, personal, and health commitments move in the right part of life. Area matters for this audience because a mixed list is not only a priority problem; it is also a fit problem.

## Representative persona

Maya has a crowded Activity list with work follow-ups, household tasks, family logistics, and personal care. She wants Kwilt to know which commitments belong in which part of her day without making her maintain a full productivity system.

## Aspirational design challenge

How might we help Maya tell Kwilt which part of life a to-do belongs to, so the app can schedule and recommend it in fitting moments, while preserving capture-first behavior and avoiding taxonomy maintenance?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Areas matter because the few things that matter often belong to different life domains and need different scheduling windows.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "See what matters," "Know the next doable action," and "Schedule or hand off" as 2. Areas improve those steps by giving scheduling and recommendations a user-owned life-domain signal instead of relying only on inference.

## JTBD framing

When I capture a to-do, I want Kwilt to understand which part of life it belongs to, so it can help me schedule and act on it at a fitting time without making me classify everything up front. This primarily serves `jtbd-carry-intentions-into-action`, under `jtbd-move-the-few-things-that-matter`, with guardrails from `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life`.

## Design

### Core behavior

Add **Areas** as a Settings-managed list of life domains. Activities can optionally reference one primary Area. Scheduling setup uses Areas to define when different parts of life usually fit.

Default Areas:

- Work
- Personal
- Family
- Home
- Health

Defaults are intelligent starting points, not a required taxonomy. Users can add, rename, reorder, and hide/archive Areas from Settings. Hiding or archiving an Area does not delete Activities.

### User-facing vocabulary

- Field label: `Area`
- Empty state: `No area`
- Scheduling copy: `Usually fits`
- Setup prompt: `When do these areas usually fit?`

Avoid user-facing words like `scope`, `domain`, `taxonomy`, `classification`, or `availability rule`.

### Data model

Proposed additive shape:

```ts
type ActivityArea = {
  id: string;
  label: string;
  order: number;
  archivedAt?: string | null;
  isDefault?: boolean;
  scheduling?: {
    enabled?: boolean;
    windows?: AreaAvailabilityWindow[];
    fallbackMode?: 'work' | 'personal' | 'flexible';
  };
};

type AreaAvailabilityWindow = {
  weekday: number;
  start: string;
  end: string;
};

type Activity = {
  areaId?: string | null;
};
```

Implementation should prefer the repo's existing user-preferences shape. If scheduling currently depends on `Activity.schedulingDomain`, Area should become the durable user-facing source and `schedulingDomain` should either remain a compatibility field or become derived from Area fallback mode.

### Settings Areas

Settings owns durable Area management:

- list default and custom Areas;
- add Area;
- rename Area;
- reorder Areas;
- hide/archive Area;
- edit Area scheduling availability.

Settings should not become an Area dashboard. It is management, not a daily surface.

### Activity assignment

Activity detail shows optional Area metadata. Quick Add and AI may suggest an Area when confidence is high, but raw capture never requires it.

Assignment rules:

- An Activity can have zero or one primary Area in V1.
- `No area` remains valid.
- AI may suggest, not silently apply, unless the user accepted a clear rule later.
- If an Area is archived, old Activities should still display its label or a graceful archived state.

### Scheduling setup

Scheduling setup uses Areas through the question: **When do these areas usually fit?**

Each Area can have soft availability windows. Scheduling proposals prefer the Activity's Area windows. If the Activity has no Area, scheduling falls back to existing inference and general availability.

Area availability is a soft constraint by default:

- urgent due work can still be proposed outside the normal Area window when the preview explains the exception;
- the user can manually pick another time;
- locked/manual schedules still win;
- scheduling remains preview + apply + undo.

### Recommended and Smart order

Area may contribute bounded context evidence to Smart order and Recommended. It should not overpower urgency, importance, readiness, or confidence.

Examples:

- During a Work window, Work Area Activities can rise.
- During a Family evening window, Family Area Activities can rise.
- Personal Activities do not disappear; they simply compete less loudly when the current Area signal is different.

Do not add Area grouping or Area chips in V1. Revisit if users ask to scan a master list by Area.

### Relationship to adjacent concepts

| Concept | Meaning |
| --- | --- |
| Area | Which part of life this Activity belongs to. |
| Goal | What outcome or identity direction this Activity supports. |
| Tag | Flexible lightweight label. |
| Context | When/where/how this Activity is doable. |
| Schedule | The committed or proposed time placement. |
| Priority/rank | What matters now after considering importance, urgency, readiness, and fit. |

## Success signal

Users understand Area as "which part of life this belongs to," assign or accept Areas on scheduled Activities, and scheduling proposals feel more fitting with fewer wrong-window corrections. Unassigned Activities still feel normal.

## Open questions

- Should default Areas be deletable, or hide/archive-only after seeding?
- Should Area availability initially reuse existing work/personal windows, or introduce per-Area windows immediately?
- Where should Area appear in Quick Add refinement without slowing capture?
- Should Area suggestions come from rules first, AI first, or only Activity detail?
- When should Area become available as a grouping or saved-view filter, if ever?

## Spec refinement

Before implementation, resolve:

- the exact preference storage location for `areas`;
- whether `Activity.areaId` is local-only first or synced immediately;
- the migration path from existing `schedulingDomain`;
- the minimum Settings UI that supports defaults, edit, reorder, and archive;
- the test matrix for Area-aware scheduling fallback and unassigned Activities.

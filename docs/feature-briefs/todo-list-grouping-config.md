---
id: brief-todo-list-grouping-config
title: To-Do List Grouping Config
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-organization-triage, dynamic-next-best-action, desktop-app]
owner: andrew
last_updated: 2026-06-23
---

# To-Do List Grouping Config

## Context

Kwilt's to-do organization work is moving toward Smart order, Recommended, and explicit exception states so a crowded Activity list feels oriented before the user configures anything. That remains the right default. But users still need a simple way to change the visual shape of a list when they are scanning a pile: by Goal, schedule, status, or another meaningful dimension. Grouping should provide that presentation lens without turning Activities into a power-user task manager or making users maintain a visible priority taxonomy.

## Target audience

Aspirational family organizers need Kwilt to help ordinary personal and household to-dos feel organized without setup work. Grouping matters for this audience when a list has enough real-life variety that one continuous list is hard to scan, but a full custom view would feel like too much machinery.

## Representative persona

Maya is using Kwilt because it helps her and her family keep track of real commitments. In this situation, she has a crowded list with a mix of errands, household follow-ups, scheduled work, blocked items, Goal-linked work, and unanchored captures. She wants the list to take a shape she can understand quickly, without becoming a productivity hobbyist.

## Aspirational design challenge

How might we help Maya choose a simple, trustworthy sectioning lens for a crowded to-do list, while preserving capture-first behavior and keeping Smart order as the default organizing intelligence?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The demand spine is helping Maya keep real commitments moving. Grouping only matters if it reduces noise around the few things that deserve attention and helps her get back to action.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "See what matters" and "Know the next doable action" as 2. Kwilt currently captures Activities and supports views/sorts, but crowded lists do not yet offer a clear sectioning model for scanning by Goal, schedule, status, or other meaningful dimensions. This feature improves the "See what matters" step while supporting, but not replacing, the "Know the next doable action" step.

## JTBD framing

When my Kwilt to-dos have become crowded, I want to choose the shape that makes the list easiest to scan right now, so that I can find the next meaningful action without maintaining another task-management system. This primarily serves `jtbd-move-the-few-things-that-matter`, with support from `jtbd-carry-intentions-into-action`, `jtbd-capture-and-find-meaning`, and `jtbd-trust-this-app-with-my-life`.

## Design

### Core behavior

Add a `Grouping` config to the Activities/to-do list controls. Grouping changes how the current result set is sectioned. It does not change which Activities are included, how Activities are stored, or what state an Activity is in.

V1 should support a small deterministic set of groupings:

- `None`: render the current list as one continuous ordered list.
- `Goal`: group by linked Goal, with a `None` section for Activities without a Goal.
- `Schedule`: group by practical schedule buckets such as Overdue, Today, Upcoming, Someday/Unscheduled, and Completed when completed Activities are visible.
- `Status`: group by user-facing states such as Ready, Waiting, Later, Needs review, and Scheduled when those concepts exist in the current model.

Do not expose grouping by hidden rank keys, internal reason codes, or `Recommended`. Those are infrastructure or computed surfaces, not stable grouping dimensions.

### Relationship to Smart order, sorting, and Recommended

Grouping and sorting are separate controls:

- Filtering decides which Activities are in the list.
- Grouping decides how those Activities are sectioned.
- Sorting decides the order of Activities inside each section.
- Smart order is the default ordering intelligence, not a grouping.
- Recommended is a computed surface, not a group.

By default, All to-dos should remain ungrouped Smart order. If the user chooses a grouping while Smart order is active, Kwilt should keep Smart order inside each group. If the user chooses a strict field sort such as due date, last modified, or title, that field sort should order items inside each group.

The Recommended module should hide when the user chooses a strict field sort because the user has asked for a field-ordered list. It may remain above a grouped Smart order list if the current view is still recommendation-led and the grouping does not make the recommendation feel like it is ignoring the user's command.

### View config and persistence

Grouping should be represented in the same configuration family as view filters and sorts. Saved/custom views should persist the selected grouping. System views should keep predictable defaults; if the current app already remembers local sort/filter choices for system views, grouping can follow the same behavior. If not, system views should avoid surprising persistence until the view-state model is explicit.

Proposed view-config shape:

```ts
type ActivityGroupingField =
  | 'none'
  | 'goal'
  | 'schedule'
  | 'status';

type ActivityViewGrouping = {
  field: ActivityGroupingField;
};
```

If the existing view config already has a broader field/config pattern, prefer extending that pattern rather than introducing a parallel model.

### Section behavior

Group headers should be quiet and scan-friendly. Empty groups should be omitted. Each visible group header should show a simple record count and an expand/collapse affordance. Expanding or collapsing a group should animate the section open or closed without reordering or mutating Activities. The animation should respect reduced-motion settings if the platform exposes them.

Any null value for the selected grouping criterion should render under `None`. This applies across groupings: no Goal, no schedule bucket, or no status value should all use the same `None` label. `None` is neutral, not corrective. Capture-first behavior means an Activity without a Goal, schedule, or status is still valid.

Suggested section labels:

| Grouping | Sections |
| --- | --- |
| Goal | Goal title sections, then `None` |
| Schedule | `Overdue`, `Today`, `Upcoming`, `Someday`, `None`, `Completed` when visible |
| Status | `Ready`, `Scheduled`, `Waiting`, `Later`, `Needs review`, `None` |

Within each grouping, section ordering should be deterministic and unsurprising. For Goal grouping, use the current Goal display/order convention if one exists; otherwise sort sections by the first Activity position in the current ordered list, then place `None` last unless the current list order clearly surfaces Activities without Goals first.

### Availability rules

Not every grouping belongs everywhere. The control should hide or disable groupings that do not make sense in the current context.

- Hide `Status` until Ready, Waiting, Later, and Needs review are real list semantics, or ship it with only the statuses that already exist.
- Hide completed-only groups unless the current view includes completed Activities.
- Avoid grouping by Goal in a Goal-scoped detail list unless the product wants sub-grouping later.

If the UI explains unavailable options, the copy should be concrete, for example: "This view is already scoped to one Goal."

### Copy posture

Use practical sectioning language: `Grouping`, `None`, `By Goal`, `By Schedule`, `By Status`. Avoid productivity-app or dashboard language such as "optimize," "health," "rank health," "inbox zero," or "clean up your backlog."

Use `Status` rather than `Action state` in user-facing controls. There is no compelling user-facing reason to expose `Action state`: it is useful as an internal modeling distinction from schedule state, but `Status` is shorter, familiar, and appropriate for a grouping control. If the implementation still uses an internal `actionState` field, map it to `Status` in labels, analytics names intended for product review, and help text.

### Acceptance criteria

- Given the user selects `Grouping: None`, the Activities list renders as one continuous ordered list with no group headers.
- Given the user selects any other grouping, each visible group has a label, record count, and expand/collapse control.
- Given an Activity has a null value for the selected grouping field, it appears in a group labeled `None`.
- Given a group is collapsed or expanded, the transition is animated and does not reorder or mutate Activities.
- Given a platform reduced-motion setting is available and enabled, the expand/collapse transition avoids unnecessary motion.
- Given the user selects `Grouping: Status`, the UI labels the grouping as `Status`; no user-facing surface should say `Action state`.
- Given the implementation uses an internal `actionState` field, it maps that field to the user-facing `Status` grouping label.
- Given a group has zero records, that group is not rendered.

### Non-goals

- Grouping does not replace Smart order.
- Grouping does not create or edit Activity state.
- Grouping does not infer or assign Goal links.
- Grouping does not make `Recommended` a persisted group.
- Grouping does not introduce a dashboard or analytics-style summary.
- Grouping does not require users to create a custom view before using it.

## Success signal

Qualitatively, users with crowded to-do lists say grouped lists are easier to scan, while still trusting Smart order or Recommended for the next action. Behaviorally, users try grouping from an existing list control, return to saved/custom views with grouping intact, and do not need to manually relabel Activities just to make grouping useful.

## Open questions

- Which existing view config type should own `grouping`?
- Do system views currently persist local sort/filter state, and should grouping follow that behavior?
- What are the exact current user-facing names for Activity status and schedule buckets?
- Should grouped lists support drag-reorder inside groups, and if so only for Smart order/manual rank?

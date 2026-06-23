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
- `Schedule`: group incomplete Activities by practical schedule buckets: Overdue, Today, Upcoming, and None.
- `Status`: group incomplete Activities by the user-facing status display layer: Active, Needs review, Waiting, Later, and None.

Do not expose grouping by hidden rank keys, internal reason codes, or `Recommended`. Those are infrastructure or computed surfaces, not stable grouping dimensions.

Status grouping requires a small reconciliation layer before it ships. It should not expose the raw `Activity.status` values (`planned`, `in_progress`, `done`, `skipped`, `cancelled`) as section labels. For grouping, `Status` should map from the attention/action state that users can understand:

| Source state | Status group |
| --- | --- |
| `priorityState: active` or missing priority state on an incomplete Activity | `Active` |
| `priorityState: needs_review` | `Needs review` |
| `priorityState: waiting` | `Waiting` |
| `priorityState: later` | `Later` |
| Unknown or corrupt status input | `None` |

Closed Activity statuses (`done`, `skipped`, `cancelled`) do not participate in Status grouping. They remain in the existing completed/closed surface when that surface is visible.

### Relationship to Smart order, sorting, and Recommended

Grouping and sorting are separate controls:

- Filtering decides which Activities are in the list.
- Grouping decides how those Activities are sectioned.
- Sorting decides the order of Activities inside each section.
- Smart order is the default ordering intelligence, not a grouping.
- Recommended is a computed surface, not a group.

By default, All to-dos should remain ungrouped Smart order. If the user chooses a grouping while Smart order is active, Kwilt should keep Smart order inside each group. If the user chooses a strict field sort such as due date, last modified, or title, that field sort should order items inside each group. Sorting must never reorder the group headers themselves; group order is fixed by the selected grouping type.

The Recommended module should hide when any grouping is applied. It should also hide when filters are applied or when the user chooses a strict field sort, because those controls are explicit requests to reshape the visible list.

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
  collapsedGroupKeys?: string[];
};
```

If the existing view config already has a broader field/config pattern, prefer extending that pattern rather than introducing a parallel model. Collapse state should be preserved across sessions at the saved-view level by storing collapsed group keys with the view's grouping config. Default to expanded groups when no collapsed state is stored.

### Section behavior

Group headers should be quiet and scan-friendly. Empty groups should be omitted. Each visible group header should show a simple record count and an expand/collapse affordance. Expanding or collapsing a group should animate the section open or closed without reordering or mutating Activities. The animation should respect reduced-motion settings if the platform exposes them.

Any null value for the selected grouping criterion should render under `None`. This applies across groupings: no Goal, no schedule bucket, or no status value should all use the same `None` label. `None` is neutral, not corrective. Capture-first behavior means an Activity without a Goal, schedule, or status is still valid.

Schedule grouping uses a single schedule date key. Prefer `scheduledAt` when present because it represents a committed start time; otherwise use `scheduledDate`. Do not use `reminderAt` for Schedule grouping in V1. Reminder-only Activities should appear under `None` and can still show reminder metadata on the row.

Schedule buckets:

| Bucket | Rule |
| --- | --- |
| `Overdue` | Incomplete Activity whose schedule date key is before today in the user's local timezone |
| `Today` | Incomplete Activity whose schedule date key is today in the user's local timezone |
| `Upcoming` | Incomplete Activity whose schedule date key is after today |
| `None` | Incomplete Activity with no `scheduledAt` or `scheduledDate` |

Do not create a separate `Someday` bucket in V1. It overlaps conceptually with `Upcoming` and `None`, and would ask users to infer too much from a grouping label.

Group labels:

| Grouping | Sections |
| --- | --- |
| Goal | Goal title sections, then `None` |
| Schedule | `Overdue`, `Today`, `Upcoming`, `None` |
| Status | `Active`, `Needs review`, `Waiting`, `Later`, `None` |

Group ordering is fixed by grouping type. V1 should not add a secondary "sort groups" affordance; that would make a simple scan lens feel like a view builder. If group ordering feels wrong in practice, revisit the fixed order before adding user-configurable group sorting.

| Grouping | Group order |
| --- | --- |
| Goal | Goal priority ascending (`1`, `2`, `3`, no priority), then Goal title A-Z, then Goal id for stability, then `None` last |
| Schedule | `Overdue`, `Today`, `Upcoming`, `None` |
| Status | `Active`, `Needs review`, `Waiting`, `Later`, `None` |

The strong opinion is that grouping should be a lens over the current ordered list, not a second ordering system. Sort choices affect rows inside each group only. Goal grouping uses Goal priority first because that is the clearest existing signal for which Goal deserves attention, then alphabetical order because it is predictable and easy to scan. Schedule and Status use fixed semantic orders.

Completed and closed Activities stay outside grouping. If the view shows completed items, render them in the existing `Completed & closed` section as a flat list. Do not put completed rows into Schedule, Status, or Goal groups, and do not add a `Completed` group inside grouped results.

### Availability rules

Not every grouping belongs everywhere. The control should hide or disable groupings that do not make sense in the current context.

- Hide `Status` until Active, Needs review, Waiting, and Later are real list semantics, or ship it with only the statuses that already exist.
- Hide completed-only groups unless the current view includes completed Activities.
- Avoid grouping by Goal in a Goal-scoped detail list unless the product wants sub-grouping later.

If the UI explains unavailable options, the copy should be concrete, for example: "This view is already scoped to one Goal."

### Copy posture

Use practical sectioning language: `Grouping`, `None`, `By Goal`, `By Schedule`, `By Status`. Avoid productivity-app or dashboard language such as "optimize," "health," "rank health," "inbox zero," or "clean up your backlog."

Use `Status` rather than `Action state` in user-facing controls. There is no compelling user-facing reason to expose `Action state`: it is useful as an internal modeling distinction from schedule state, but `Status` is shorter, familiar, and appropriate for a grouping control. If the implementation uses an internal status-like source field, map it to `Status` in labels, analytics names intended for product review, and help text.

### Acceptance criteria

- Given the user selects `Grouping: None`, the Activities list renders as one continuous ordered list with no group headers.
- Given the user selects any other grouping, each visible group has a label, record count, and expand/collapse control.
- Given an Activity has a null value for the selected grouping field, it appears in a group labeled `None`.
- Given a group is collapsed or expanded, the chevron/toggle rotates and the panel open/close transition is animated without reordering or mutating Activities.
- Given a platform reduced-motion setting is available and enabled, the expand/collapse transition avoids unnecessary motion.
- Given the user selects `Grouping: Status`, the UI labels the grouping as `Status`; no user-facing surface should say `Action state`.
- Given the implementation uses an internal status-like source field, it maps that field to the user-facing `Status` grouping label.
- Given a group has zero records, that group is not rendered.
- Given the user applies any grouping other than `None`, the Recommended module is hidden.
- Given the user applies any filter, the Recommended module is hidden.
- Given the current view shows completed items, completed/closed Activities render in the existing flat completed section rather than inside groups.
- Given the user collapses groups in a saved view, the collapsed group keys are restored after app restart.
- Given the user groups by Schedule, `scheduledAt`/`scheduledDate` determine the group and reminder-only Activities appear under `None`.
- Given the user groups by Goal, group headers are ordered by Goal priority, then Goal title, then Goal id, with `None` last.
- Given the user applies a sort while grouping is active, that sort orders Activities inside each group and does not change group header order.

### Non-goals

- Grouping does not replace Smart order.
- Grouping does not create or edit Activity state.
- Grouping does not infer or assign Goal links.
- Grouping does not make `Recommended` a persisted group.
- Grouping does not introduce a dashboard or analytics-style summary.
- Grouping does not require users to create a custom view before using it.
- Grouping does not add created/updated recency as a group criterion; created and updated remain sort criteria only.

## Success signal

Qualitatively, users with crowded to-do lists say grouped lists are easier to scan, while still trusting Smart order or Recommended for the next action. Behaviorally, users try grouping from an existing list control, return to saved/custom views with grouping intact, and do not need to manually relabel Activities just to make grouping useful.

## Open questions

- Which existing view config type should own `grouping` and `collapsedGroupKeys`?
- Should grouped lists support drag-reorder inside groups, and if so only for Smart order/manual rank?

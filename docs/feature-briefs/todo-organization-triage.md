---
id: brief-todo-organization-triage
title: Inferred To-Do Priority Model And Views
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [dynamic-next-best-action, background-agents-weekly-planning, desktop-app]
owner: andrew
last_updated: 2026-06-22
---

# Inferred To-Do Priority Model And Views

## Context

A customer with many Kwilt to-dos said she needed a better way to organize them. She is a mother helping her family adopt Kwilt because it has already proven useful. She is not a productivity power user and is not burned out on productivity systems; she is a person trying to become more organized and hoping the app can help. She had not discovered the views system, but the deeper issue is not only discoverability: views require the user to know what organization would help before Kwilt helps them make sense of the pile. The better answer is for Kwilt to infer priority first, keep exception states consistent and legible, and let views/recommendations reflect that model almost automatically.

## Target audience

Aspirational family organizers need Kwilt to help ordinary family and personal to-dos feel organized without requiring a productivity methodology. This feature is for users who have captured real intentions and now want the app to help them see what matters, what can wait, and what can actually be done next.

## Representative persona

Maya has found Kwilt helpful and is supporting family adoption. In this situation, she needs Kwilt to make the crowded Activity list feel already oriented: what needs attention now, what can wait, what is blocked, and what simply needs a look.

## Aspirational design challenge

How might we help Maya open a crowded Activity list, find it already organized around the next honest, possible action, and easily re-prioritize when she knows better, while preserving capture-first behavior and avoiding productivity-app setup work?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The demand spine is helping the user make real progress in the few areas they most want to grow. Organization matters only if it reduces noise around those few things.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "See what matters" and "Know the next doable action" as 2. Kwilt has Activities, Plan, recommendations, and views, but it does not yet have a global prioritization model that makes a crowded Activity list organize itself around what deserves attention, what can be done now, and what exactly should be worked on next.

## JTBD framing

When my Kwilt to-dos have accumulated into a pile, I want the app to already know what deserves attention, what can wait, and what needs clarification, so that I can keep moving the few things that matter without rebuilding another task-management system.

## Design

### Core behavior

Add a global inferred priority model for incomplete Activities. The model should be calm and inspectable, powering ordering, system views, widgets, and next-action recommendations. It is not a productivity score and should not be presented as a measure of the user's performance.

The model separates five layers:

- State: the broad action state. Most to-dos are implicitly active; exception states should be `later`, `waiting`, or `needs_review`.
- Rank: the exact order among active candidates, so Kwilt can recommend one specific next Activity instead of leaving the user to sort a pile.
- Actionability / placement: whether the Activity can reasonably be done now, is waiting on someone/something, depends on an availability window, or should be left out of the current active set.
- Reason: the inspectable evidence behind the placement, such as "Due today," "High-priority Goal," "Recently captured," or "No next step yet."
- Recommendation surface: a small computed set of high-priority, currently actionable to-dos. Recommendation is not a tier or stored state.

Prioritization should happen in multiple passes:

1. Capture-time inference: when a new to-do is created, infer an initial state/rank from the title/body, schedule/reminder, selected Goal, parent Goal priority, explicit user inputs, and quick-add defaults.
2. List-time auto-prioritization: from the to-do list, let the user re-run prioritization against transparent criteria such as Goal priority, due dates, stale scheduled items, unplanned captures, waiting markers, availability constraints, and recent edits.
3. Manual re-prioritization: let the user drag, mark, or choose a state/rank when she knows better; explicit user changes should be respected, visible, and easy to revise.

V1 should use deterministic signals first: scheduled date, reminder, explicit Activity priority, parent Goal priority, recent edits, stale scheduled dates, steps, started/completed state, and whether the Activity is unanchored. AI can enrich this system by proposing states, ranks, reasons, and criteria-based adjustments, but durable mutations must remain previewed, editable, or undoable.

### Rank storage and insertion

Prioritizing a new Activity should usually be a local insertion, not a whole-list rewrite. When a new to-do is created, Kwilt should infer the right state and then choose a rank between neighboring active Activities when applicable. For example, a new item may rank above one existing active Activity because it has a nearer due date but below another because it is less actionable.

Use hidden lexicographic rank keys as the durable source of truth for exact order among active candidates or inside an exception state. Do not use fragile display positions like `1`, `2`, `3`, `4` as the stored rank. If the new item belongs between `2` and `3`, a naive integer order would require shifting every later item. A lexicographic rank key lets Kwilt generate a new sortable string between two neighboring strings and usually update only the new or moved Activity.

Proposed fields:

- `priorityState`: user-meaningful action state such as `active`, `later`, `waiting`, or `needs_review`. If the UI says `Later`, the stored value should also be `later`.
- `priorityRankKey`: hidden sortable string used only for exact ordering inside the state or active candidate set.
- `priorityRankSource`: `inferred`, `auto`, or `manual`.
- `priorityReasonCodes`: inspectable reason codes used to explain the placement.

The displayed order can still look simple: first, second, third, important, or recommended. The rank key is infrastructure, not a field value the user should see.

Dense ranks are possible with any "insert between neighbors" scheme after repeated insertions into the same tiny interval. With lexicographic rank keys, this is not a product problem and is rarely a computational problem at Kwilt scale; it is a maintenance condition. If no reasonably short key can be generated between two neighbors, or if keys in a state become too long, Kwilt can rebalance that state by rewriting hidden rank keys into evenly spaced values while preserving the exact visible order. Rebalancing should be scoped to one state/viewable order where possible, should not change state/rank semantics, and should not emit user-facing "priority changed" events.

Whole-list re-ranking should be reserved for explicit list-time auto-prioritization, where Kwilt explains the criteria and the user can review or undo meaningful changes. Rank-key rebalancing is different: it is invisible storage maintenance that preserves the current order.

### Manual re-prioritization

Manual re-prioritization is not only an error correction path. It is how Maya teaches Kwilt what matters in a moment the app cannot fully infer. V1 should make at least one manual move obvious from the list: move an item up/down within its current surface, move it to another state, or mark it as important/pinned.

Manual changes should be visible in the reason layer, for example "Moved by you" or "Pinned by you," and should outrank ordinary model inference until the user changes it again or chooses to re-run auto-prioritization.

### Scheduling and actionability

Priority must not collapse into "do now." A high-priority Activity can be important and still belong later because it is waiting on someone else, requires a business or service that is not available right now, needs a certain location/context, or does not fit the user's current calendar constraints.

The priority model should feed scheduling recommendations and Auto-Schedule Assist rather than compete with them. Kwilt already has due dates, reminders, and recurrence; those schedule fields should remain the schedule model instead of becoming a priority state. A to-do can be active and scheduled, waiting and scheduled, or later and recurring. A high-priority but currently unavailable Activity should surface as "important, schedule later" rather than being demoted or falsely recommended.

Any auto-scheduling path should follow the existing Auto-Schedule brief posture: explain the criteria, preview placements, respect conflicts and locked/manual schedules, and offer undo.

### Relationship to views

Views remain useful, but they should consume the priority model rather than asking the user to invent organization from scratch. System views should include priority-aware surfaces such as Recommended, Ready/Active, Waiting, Later, Needs review, Unplanned, Recently captured, Stale scheduled, and Goal gaps. Custom views can still exist, but the default experience should feel like it already has a point of view. The list-time auto-prioritization affordance should explain the criteria it is about to use before applying changes.

Recommended is a computed surface on top of states, ranks, schedule fields, and actionability. It should draw from active, ready, high-priority to-dos; it should not be stored as a tier.

The default Activities view should not become "group by priority state" by default. Most to-dos will be active, so grouping would often create one large active group plus a few exception groups. Instead, the default list should use a Kwilt-managed smart order: show a small Recommended module first, then order active to-dos by inferred rank/actionability, with Waiting, Later, and Needs review available as quiet sections, chips, or system views when they have items.

Existing sort controls should remain available, but smart order should be a first-class default mode rather than a Pro-only custom sort the user has to discover. Manual/user-selected sorts such as Due date, Priority, Last modified, or Title can temporarily override smart order for the current view. The sort drawer should explain the relationship plainly: Smart order is "Kwilt's recommended order"; custom sorts are "show this list by a field." Custom views can later filter or group by `priorityState`, but the main promise is that the default view feels organized before the user configures anything.

### Review surface

Manual triage should be a fallback for uncertainty, not the primary job. When Kwilt cannot confidently place an item, it can show a small "Needs review" surface. The user can set a state/rank, schedule it, mark it waiting, or move it to Later. Copy should stay concrete and non-therapeutic.

### AI behavior

V1 can ship with deterministic inference and light AI assistance only where the criteria are visible. A later version can add richer AI-suggested states, ranks, explanations, and cleanup proposals. AI suggestions should feel like observed evidence, not hidden authority. AI must not silently change Goal links, schedules, tags, statuses, or Arcs.

### Copy posture

Use calm orientation language. Avoid "clean up your mess," "you are behind," "inbox zero," "optimize," "system health," or dashboard-like scoring. The user's pile is evidence of real life and captured intentions, not failure.

## Success signal

Qualitatively, users with crowded Activity lists say Kwilt already seems to know what needs attention, what can be done now, and what should be scheduled later, while still letting them move things when they know better. Behaviorally, users act from priority surfaces without first changing filters or creating custom views, can identify one recommended next Activity, use auto-prioritization criteria more often than custom view setup, manually re-prioritize without opening advanced settings, and only occasionally need low-confidence review.

## Open questions

- Should the global priority model be stored on the Activity, computed at read time, or stored as an overridable computed field?
- Should V1 expose priority display styles at all, or keep the underlying rank hidden behind recommendations and ordering?
- What list-time auto-prioritization criteria should be exposed by default?
- Should exact rank be visible, hidden, or only visible inside a "why this next?" explanation?
- What is the simplest manual re-prioritization gesture for V1: drag within a view, move to Later/Waiting/Needs review, star/pin, or all three?
- Which availability constraints belong in V1: waiting-on, business hours, location, energy/context, calendar free time, or only schedule windows from Auto-Schedule Assist?
- Does Waiting deserve a first-class Activity status, or is a tag enough for V1?
- What signals should be allowed to outrank explicit user priority?
- Are inferred priority views core/free while advanced custom views remain Pro?

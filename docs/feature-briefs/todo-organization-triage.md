---
id: brief-todo-organization-triage
title: Inferred To-Do Priority Model And Views
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [dynamic-next-best-action, background-agents-weekly-planning, desktop-app]
owner: andrew
last_updated: 2026-06-24
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

### Recommended as the priority-management paradigm

The Recommended paradigm should feed the priority model rather than sit beside it. Recommended is the user's calm, everyday encounter with prioritization: Kwilt proposes a few next actions, explains the strongest reason when useful, and lets the user correct the model in place. The user should not have to open a priority dashboard, choose a context mode, or maintain P1/P2/P3 labels before Kwilt can help.

Recommended is not the whole priority system. It is a capped projection of a full-list priority calculation. The priority system should assign every incomplete to-do a current priority placement, even if only the top few are shown in the Recommended section. A user who sorts by priority should see the same underlying judgment that Recommended and Plan recommendations use, not a separate star/P1-only field that can disagree with the app's next-action logic.

The full-list priority contract should produce:

- `priorityScore`: a recomputed current score for each incomplete Activity in the current moment.
- `priorityBand`: a soft display grouping such as `Do first`, `Do next`, `Can wait`, or `Not ready`, derived from the score/state rather than manually maintained.
- `priorityState`: the existing action state (`active`, `later`, `waiting`, `needs_review`) that determines whether an item belongs in the active candidate pool.
- `priorityRankKey`: the hidden stable tie-break/order key for user/manual ordering and deterministic insertion.
- `priorityReasonCodes`: inspectable evidence handles explaining the placement.
- `priorityContext`: optional current-moment context evidence, such as surface fit, due/reminder timing, calendar fit, availability, place evidence, or recent user behavior.

Manual reorder is already part of the current priority system. When the user drags to-dos into a different order, Kwilt should treat that as explicit priority feedback for the relevant list context, not merely as cosmetic `orderIndex` maintenance. The stored manual order can remain the stable fallback/tie-breaker, while the priority engine records that the user intentionally moved something and uses that signal until a later explicit reprioritization changes it.

Sorting by Priority should sort by this current priority placement first, then fall back to rank key/manual order. It should not mean "show starred/P1 items first" once the inferred model is available. Starred/manual priority remains one input to importance; it is not the whole answer. Manual order remains a separate sort mode for users who want their saved order exactly as arranged.

Recommended has three jobs:

1. **Select** - choose a small, currently actionable set from the active candidate pool.
2. **Explain** - surface the clearest reason in plain language, such as "Due today," "Important goal," "Good at your computer," "Moved by you," or "Waiting."
3. **Learn from correction** - let ordinary actions such as moving a card, marking it Later/Waiting/Needs review, dismissing it for now, starting Focus, or completing it feed the priority model.

The recommended card itself should remain a normal to-do card. The management paradigm lives in section placement, reason text, and lightweight correction affordances, not in a special card design. If an item is in Recommended and the user drags it down, chooses Not now, moves it to Later, or marks it Waiting, that should update `priorityRankSource` / `priorityReasonCodes` or equivalent session feedback so the next recommendation set improves. If the user acts on a recommended item, that should reinforce the ranking path without adding a visible "trained by you" system.

This makes Recommended the front door to priority management:

- **Instead of** asking Maya to classify the entire list, Kwilt recommends the next few items and watches what she accepts or corrects.
- **Instead of** making priority a visible taxonomy, Kwilt keeps rank/reason infrastructure inspectable underneath a plain list.
- **Instead of** treating `Not now` as only a dismissal, Kwilt can interpret it as a temporary readiness/context signal.
- **Instead of** adding more views whenever the list feels crowded, Kwilt should first improve the scorer, explanation layer, and override memory behind Recommended.

V1 should keep this bounded. Recommended can use deterministic and current-surface evidence, manual priority/state, schedule/reminder timing, goal priority, and recent user corrections. It should not add a separate context selector, hidden broad category boosts, saved places, location permission, or a user-facing priority taxonomy. Low-confidence context should fall back to normal Recommended framing rather than pretending Kwilt knows why something is right for the moment.

### One priority engine, multiple projections

Kwilt should converge on a single priority engine that powers every priority-like surface:

- **Recommended**: top 3 active, positive-score Activities from the same ranked list.
- **Smart order**: the rest of the active list sorted by the same priority placement.
- **Priority sort**: an explicit user-requested view of the same ordering, with broader visibility than the capped Recommended module.
- **Plan recommendations**: scheduling candidates chosen from the same ranked list, then filtered by availability, existing commitments, duration, calendar write access, and whether the item is already scheduled.
- **Widgets/search suggestions/next-step surfaces**: lightweight projections of the same score/reasons rather than separate scoring formulas.

This keeps the mental model coherent: Recommended answers "what are the top few right now?", Priority sort answers "how does Kwilt currently rank the whole list?", and Plan answers "which high-priority items fit into actual time?" Those are different projections, not different priority systems.

Context can change the order, but only through explicit score components and confidence policy. For example, "Good at your computer" can help a desktop-suitable task rise while the user is on desktop, but it should not overpower due-today work or explicit manual priority unless the confidence and product rule justify it. Low-confidence context should influence ordering gently or not at all.

### Trust and transparency

Users should be able to trust the top of the list without being asked to audit a model. Transparency should be layered:

- List-level: when the list is in Smart order or Priority sort, make the ordering visible enough that users can tell priority exists. A subtle row reason, band label, or section-level explanation is better than relying only on the star icon.
- Card-level: show one short reason when useful, such as `Due today`, `Important goal`, `Moved by you`, or `Good at your computer`.
- Detail-level: a "Why this priority?" explanation can show the main components: urgency, importance, readiness, context fit, and manual/user correction.
- Correction-level: the user can say or imply `not now`, move an item, mark it Waiting/Later/Needs review, star it, schedule it, start Focus, or complete it. Kwilt should treat those actions as priority feedback where appropriate.
- System-level: view/sort controls should name the relationship plainly. `Recommended` is the top slice; `Priority` is the whole-list current order; `Manual` is the user's saved order; `Due date` is just the date field.

The copy should avoid scores and productivity jargon. Users need to know why a thing is near the top, not whether it has 184 points. The system can keep numeric scores and confidence internally for tests, ranking, and debugging. The visible cue should be calm and sparse: not every row needs a badge, but a user should not have to infer the priority system solely from position in the list.

### Buildable next slice

The next implementation slice should enhance the existing Recommended/scoring path before adding another list-management surface:

- Componentize the scorer into urgency, importance, readiness, effort/shape, bounded context fit, and confidence so priority behavior is inspectable in tests.
- Preserve the current eligibility contract: Recommended appears only where it will not fight filtering, grouping, or Kanban layout.
- Replace user-facing Priority sort semantics so it consumes the full-list priority ranking rather than only the explicit `priority` field.
- Point Plan recommendations at the same ranked priority rows before applying scheduling feasibility.
- Add or formalize correction inputs that matter for priority, especially `Not now`, manual status changes, manual reorder, Focus start, and completion.
- Store durable user corrections only when they represent an intentional priority decision; keep transient moment/context feedback session-scoped where possible.
- Render a subtle priority cue in Smart order / Priority sort so users can see why ordering changed without turning every card into a priority report.
- Make reason labels clear enough that a user can understand why the item rose without reading a model explanation.
- Verify that recommended cards remain normal to-do cards, with section placement and optional reason/correction behavior as the only prioritization surface.

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
- Should `priorityScore` be persisted for debugging/sync, computed at read time, or cached with a timestamp and reason snapshot?
- What label should the whole-list Priority sort use if "Priority" sounds too much like a static user-managed field?
- What is the simplest manual re-prioritization gesture for V1: drag within a view, move to Later/Waiting/Needs review, `Not now`, star/pin, or some combination?
- Which recommendation corrections should be durable Activity metadata versus session-scoped feedback?
- Which availability constraints belong in V1: waiting-on, business hours, location, energy/context, calendar free time, or only schedule windows from Auto-Schedule Assist?
- Does Waiting deserve a first-class Activity status, or is a tag enough for V1?
- What signals should be allowed to outrank explicit user priority?
- Are inferred priority views core/free while advanced custom views remain Pro?

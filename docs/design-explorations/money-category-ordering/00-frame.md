# Frame: money-category-ordering

## What the user said

> I need a way to manually reorder these. This deserves a design thinking exercise.

## Restated in user voice

When Maya scans household Money, she wants the categories that matter most to her family to appear first, so that the plan reflects her attention instead of a system-defined sequence.

## Target audience

`audience-aspirational-family-organizers` — people who want family finances to feel organized without becoming finance administrators.

## Representative persona

Maya is reviewing the few spending areas that matter before a household decision.

- Current situation: Summary has a stable category grid, but its order is fixed by backend `sort_order`.
- What she is trying to do: put the categories she checks most often where her eye lands first.
- Emotional tension: she wants a calm personal hierarchy, not another sorting system to configure.
- What would feel wrong: accidental rearrangement, ranking pressure, or a separate category-management dashboard.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — keep the few areas that deserve attention visible.

## Job flow step

Step 5 of `job-flow-maya-review-budget-reality-before-spending`: see the relevant category and whole-plan reality before acting. Current delivery score: 3. The grid exists and is truthful, but the most relevant category cannot be placed first by the household.

## Active anchors

- `jtbd-review-budget-reality-before-spending` — make the relevant category quicker to find.
- `jtbd-trust-this-app-with-my-life` — preserve an explicit, durable, reversible user choice.

## Friction we're addressing

The Summary grid and category pickers inherit database order. The data model already has `budget_categories.sort_order`, but there is no user-facing or atomic mutation contract for changing it.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Summary has a two-column meter grid and an overflow menu.
- Existing flow: horizontal paging changes month; tapping a meter opens category detail.
- Existing model: every active category has `sort_order`; snapshots and pickers already read it.
- Existing affordances: `react-native-draggable-flatlist`, `SortDrawer`, drag haptics, and `BottomDrawerHeader` already exist.
- Existing convention: consequential Money writes receive an authoritative server acknowledgement before success is claimed.

Constraints to preserve:

- Month paging and meter taps must remain reliable.
- Order is household data, not device-local presentation state.
- Reordering must not alter plan amounts, transaction assignments, or forecast truth.
- VoiceOver users need equivalent Move up/Move down actions.

Constraints we may challenge:

- The Summary overflow menu can gain one bounded category-management action.

Design implication: use an explicit reorder mode that reuses the existing category list and sort-order field, not ambient grid dragging or a new organization taxonomy.

## Aspirational design challenge

How might we help Maya put the household categories she checks first at the top of Money, while preserving calm scanning, month paging, and authoritative plan truth?

## Out of scope

Category groups, automatic importance ranking, pinning, per-month order, hidden categories, and AI reordering.

## Open question

None for the first learning release.

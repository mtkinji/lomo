# Converge: To-Do List Grouping Config

## Scoring

| Alternative | Maya fit | Job-flow improvement | Trust | Scope | Notes |
| --- | --- | --- | --- | --- | --- |
| A: Simple Grouping Control | Strong | Medium-strong | Strong | Low-medium | Best V1 because it adds the missing presentation lens without overhauling Activities. |
| B: Per-View Grouping Configuration | Medium-strong | Strong | Strong | Medium | Important data-shape decision; best as the persistence model behind A. |
| C: Adaptive Suggested Grouping | Strong later | Strong | Medium | High | Powerful follow-on, but premature before Smart order explanations are reliable. |
| D: Grouped System Views | Medium | Medium | Strong | Medium | Useful but risks adding more surfaces instead of improving the current one. |

## Chosen alternative

Choose **Option A with Option B compatibility**. V1 should expose Grouping as a simple list presentation control and store it in the current view configuration when the view is saveable. It should not mutate Activities or replace Smart order.

## Product shape

- Add a `Grouping` config to the Activities/to-do list controls.
- Supported V1 groupings:
  - `None` - render the list as one continuous ordered list.
  - `Goal` - group by linked Goal, with a `None` section for Activities without a Goal.
  - `Schedule` - group incomplete Activities by Overdue, Today, Upcoming, and None.
  - `Status` - group incomplete Activities by Active, Needs review, Waiting, Later, and None.
- Do not ship grouping by hidden rank, internal reason codes, or `Recommended`.
- Keep Smart order as the default ordering inside groups unless the user chooses a field sort. Sorting applies inside groups only and must not reorder group headers.
- Hide the Recommended module when grouping, filters, or a strict field sort are applied.
- Treat grouping as a projection over Activities, not a bulk edit. Changing grouping must not alter Goal links, schedule fields, tags, or status.
- Persist grouping and collapsed group keys on saved views so expand/collapse state survives app restarts.
- Empty groups should be omitted. Group headers should be quiet and scan-friendly.
- Any null value for the selected grouping criterion should render under a `None` group. For example, Activities without a Goal appear under `None`, not `Unanchored`.
- Each visible group header should show a simple count of records in that group.
- Each group should have an expand/collapse affordance with a short animation: rotate the chevron/toggle and animate the panel open/closed. The animation should respect reduced-motion settings if the platform exposes them.
- Use fixed group ordering by grouping type instead of adding a group-sort control in V1:
  - Goal: order groups by Goal priority ascending (`1`, `2`, `3`, no priority), then Goal title A-Z, then Goal id for stability, then `None` last.
  - Schedule: `Overdue`, `Today`, `Upcoming`, `None`.
  - Status: `Active`, `Needs review`, `Waiting`, `Later`, `None`.
- Completed and closed Activities stay in the existing flat `Completed & closed` section when visible; they do not appear inside grouped results.
- If a grouping option would create one giant section plus noise, it can remain available, but the default should stay `None` or Smart order for All to-dos.

## Acceptance criteria

- Given the user selects `Grouping: None`, the Activities list renders as one continuous ordered list with no group headers.
- Given the user selects any other grouping, each visible group has a label, record count, and expand/collapse control.
- Given an Activity has a null value for the selected grouping field, it appears in a group labeled `None`.
- Given a group is collapsed or expanded, the transition is animated and does not reorder or mutate Activities.
- Given the user selects `Grouping: Status`, the UI labels the grouping as `Status`; no user-facing surface should say `Action state`.
- Given the implementation uses an internal status-like state field, it maps that field to the user-facing `Status` grouping label.
- Given a group has zero records, that group is not rendered.
- Given grouping, filters, or strict field sort are applied, the Recommended module is hidden.
- Given completed/closed items are visible, they render in the existing flat completed section outside grouped results.
- Given the user collapses groups in a saved view, the collapsed group keys are restored after app restart.
- Given the user groups by Goal, group headers are ordered by Goal priority, then Goal title, then Goal id, with `None` last.
- Given the user applies a sort while grouping is active, that sort orders Activities inside each group and does not change group header order.

## Accepted trade-offs

- This adds a new presentation setting before the full Smart order model is complete.
- Grouping will make some list states more visually complex, so the default remains ungrouped Smart order.
- The implementation should share view config plumbing where possible, even if V1 only exposes it in one mobile control.
- Grouping by Goal may reveal many small sections when users have many Goals; that is acceptable as an explicit user choice.
- Grouping is useful even without AI, as long as its semantics are deterministic and predictable.
- Fixed group ordering is more important than configurability in V1 because a second group-sort control would turn grouping into a view-building exercise.
- Goal group ordering follows Goal priority first, then alphabetical title, because priority captures importance and alphabetical tie-breaking is predictable.
- Schedule grouping stays simple: Overdue, Today, Upcoming, None. A separate Someday bucket would overlap with both Upcoming and None.
- Status grouping does not expose raw Activity status values like planned/done/skipped. It uses the user-facing status display layer, while completed/closed rows stay separate.

## Rejected trade-offs

- Do not treat `Recommended` as a group.
- Do not expose hidden rank keys, reason codes, or internal ranking sources as grouping choices.
- Do not silently reassign Activities to Goals or states to make a grouping look cleaner.
- Do not require Goal selection or schedule selection before capture.
- Do not turn grouping into a dashboard with scorecards, warnings, or productivity-health language.
- Do not make custom views the only way to use grouping.
- Do not add created/updated recency as a grouping criterion; keep it as sorting only.
- Do not nest completed/closed Activities into grouped results.
- Do not add a secondary group-sort affordance in V1.

## Stated bet

We're betting that a calm grouping config will help users scan crowded to-do lists when Smart order alone is not enough, without asking them to maintain a productivity system. If grouping becomes the primary way users try to solve prioritization, we should revisit by strengthening Smart order, Recommended, and status explanations rather than adding more grouping dimensions.

## Success signal

Qualitative: users describe grouped lists as easier to scan, while still relying on Smart order or Recommended to decide what to do next.

Behavioral:
- Users try grouping from an existing list control without needing to create a custom view first.
- Users return to saved/custom views with grouping intact.
- Users do not need to manually relabel Activities just to make grouping useful.
- Users still act from Recommended/Active surfaces when they need a next action.
- Support/debug reports do not show confusion between grouping, sorting, filtering, and Activity state.

## Follow-on build questions

- Which existing view config type should own `grouping`?
- Should a grouped list support drag-reorder inside groups, and if so only for Smart order/manual rank?

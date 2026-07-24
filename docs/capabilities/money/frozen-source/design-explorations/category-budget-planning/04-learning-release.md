# Learning Release: Category Budget Planning

## Concept To Build
Budget Detail stops opening a generic quick-edit drawer; category maintenance opens the full Category settings page, while amount planning is documented as a separate future flow.

## Capability Delta
Today, the user cannot:
- tell whether the quick drawer is a drawer, page, or Category settings replacement.
- distinguish name/settings maintenance from amount allocation.

After this release, the user can:
- reach one Category settings page from Budget Detail.
- avoid duplicate controls for rollovers, forecast source, and app pauses.

Still intentionally not supported:
- target-backed amount adjustment
- cross-category rebalance
- one-off monthly exceptions

## User Experience
From Budget Detail, tapping the category title edit affordance or the overflow `Category settings` row opens `{Category} settings`. The quick-edit drawer no longer appears. Forecast source keeps using the existing forecast settings drawer.

## Existing Product Relationship
This replaces the quick-edit drawer in Budget Detail and leaves the Category settings page as the single maintenance destination. It deliberately leaves the future amount-planning flow unbuilt until MonthlyLivingPlan evidence exists.

## Buildable Slice
Must be real:
- remove `editBudgetOpen` drawer state and UI from Budget Detail.
- route title edit to Category settings.
- add editable category name inside Category settings.
- show monthly amount in Category settings without pretending raw amount editing is target-backed planning.
- remove unused quick-edit components and styles.
- add design artifacts and feature brief so the next amount-planning work has a clear target.

Can be thin or temporary:
- Category settings may continue using the existing fields it already owns.
- amount planning remains a documented next slice.

Intentionally excluded:
- new data model
- new analytics
- full target-backed allocation UI

## Release Channel
Local build. This is a reductive UX cleanup with low data risk, best verified by Andrew in the simulator.

## Brand-Goodwill Guardrails
- Delete confusing UI instead of exposing an unfinished planner.
- Do not imply Kwilt can rebalance a living target until it can show the math.
- Preserve existing settings and forecast paths.

## Reversibility
The release can be reverted by restoring the quick drawer block in Budget Detail. No migration or new persisted field is introduced.

## Permanent Product Threshold
Make this permanent if simulator review shows the route feels calmer and no core editing job is lost. Build the amount-adjustment flow only after living-target allocation receipts are available.

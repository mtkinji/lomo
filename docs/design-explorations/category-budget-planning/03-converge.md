# Converge: Category Budget Planning

## Scoring

| Alternative | Persona fit | System fit | Trust | Scope | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Settings owns all fields | Medium | High | Medium | Low | Ship the reductive part now |
| B: Detail adjust amount sheet | High | Medium | High | Medium | Plan as next learning release |
| C: Rebalance plan page | Medium | Low | Medium | High | Reject for now |
| D: Receipt-only explanation | Medium | Medium | Medium | Low | Keep as support for B |

## Chosen Direction
Remove the Budget Detail quick-edit drawer now. Category Detail edit affordances route to Category settings. Category settings remains the maintenance surface. A future Budget Detail `Adjust amount` flow should be built only when it can show source, living-target impact, and consequence.

## Capability Delta
Today, the user can open a drawer that looks like Category settings but does not do a distinct job.

After this release, the user can:
- use one clear Category settings page for category behavior and maintenance.
- avoid the confusing half-page drawer when tapping the category title.
- see the build plan for a future amount-adjustment flow that is not just a dollar input.

Still intentionally not supported:
- automatic rebalancing
- living-target impact math
- temporary monthly exceptions

## Reductive Design Decisions
- Delete the quick-edit drawer instead of polishing it.
- Do not add a second "Budget plan" page.
- Do not treat amount adjustment as a settings row until plan impact can be explained.
- Keep Forecast source in its existing drawer for now.

## Activation Path
Category title edit and overflow menu both lead to Category settings. The future `Adjust amount` affordance should appear near the meter only when the amount looks questionable or the user explicitly chooses to plan.

## Bet
We're betting that removing the duplicate drawer will make Category settings feel more authoritative and Budget Detail feel less confused. If that is not true, revisit by adding a focused amount-planning flow, not by restoring the generic drawer.

## Success Signal
In simulator review, tapping the title no longer creates a drawer/page ambiguity, and the only settings destination is the full Category settings page.

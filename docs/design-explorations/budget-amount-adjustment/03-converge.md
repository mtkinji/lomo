# Converge: Budget Amount Adjustment

## Qualitative Scoring

| Alternative | Persona fit | System fit | Trust | Scope | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Category Settings Inline Amount | Medium | High | Low-medium | Low | Reject as final model |
| B: Global Plan Settings | Medium | Low-medium | High | High | Defer |
| C: Category-Started Plan Adjustment | High | Medium | High | Medium | Choose |
| D: Detail Meter Adjustment Prompt | High | Medium | High | Medium | Use as secondary activation later |
| E: Two-Mode Amount Change | Medium-high | Medium-low | High | High | Defer |

## Chosen Direction
Choose **Category-Started Plan Adjustment**.

The amount should not be global-settings-only. The user's need starts locally: "this category number is wrong." But the save decision is plan-level: "what does this do to the rest of the month?" The best model is a category entry point that opens a plan-aware adjustment flow.

## Product Shape
In the current Category settings `Budget Plan` group:

- Keep `Monthly amount` visible.
- Add an affordance on the row, such as a chevron and accessibility label `Adjust monthly amount`.
- Change the footer from future-tense-only copy to a clearer expectation: `Changing this amount shows how the rest of the plan is affected before you save.`
- Tapping the row opens `Adjust amount`, not a generic text field.

The adjustment flow should show:

- current category amount
- new amount input
- optional source receipt: `Set by you`, `From scheduled bill`, `From recent history`, or `Starter amount`
- impact sentence:
  - `This leaves $150 unassigned in your living target.`
  - `This puts planned categories $50 over your living target.`
  - `Income is missing, so Kwilt can save this amount but cannot check the living target yet.`
- actions: `Save amount`, `Cancel`, and conditional `Review full plan`

## Capability Delta
Today, the user cannot:

- change a category amount from the settings screen where the number is shown
- know whether an amount change affects buffer or over-target state
- distinguish a quick category correction from a whole-plan rebalance

After this release, the user can:

- start an amount change from the category they are maintaining
- see one clear consequence before saving
- save a deliberate category amount without Kwilt silently rebalancing other categories
- choose to review the full plan when the change exposes a larger tradeoff

Still intentionally not supported:

- automatic rebalancing of other categories
- drag-allocation or spreadsheet-style global planning
- this-month-only exceptions
- generated category amounts from weak prediction receipts

## Reductive Design Decisions
- Do not create a global Budget Plan screen as the first release.
- Do not make `Monthly amount` a raw inline text field.
- Do not hide the edit only on Budget Detail.
- Do not ask the user to pick which other category should change.
- Do not block saving an over-target amount; state the consequence plainly.
- Do not show exact transaction evidence inside the adjustment flow.

## Activation Path
Primary activation is the `Monthly amount` row in Category settings because the screenshot already makes the amount visible there. Secondary activation can later appear on Budget Detail when the meter shows repeated over-budget or unrealistic pacing.

No broad education is needed. The row and flow should teach the model by behavior: the category number is editable, and saving it checks the plan.

## Accepted Trade-Offs
- The first version may save a user override without solving automatic allocation.
- If income/resource basis is missing, the flow must honestly degrade to "save amount without target check."
- The global planner remains deferred until repeated local changes prove the need.

## Rejected Trade-Offs
- Do not route every amount change to a global settings screen.
- Do not pretend a one-category edit can fully rebalance the household.
- Do not bury this key capability behind future-only helper text.

## System Implications
The learning slice needs a small amount-adjustment state model:

- category id
- previous amount cents
- proposed amount cents
- source label when known
- planned category total before and after
- living target/resource status when known
- impact state: `buffer_remaining`, `over_target`, `missing_resource`, or `unknown`

This can be computed from existing category amounts first, then upgraded when `MonthlyLivingPlan` becomes real.

## Bet
We're betting that a local entry point with plan-aware consequence text will feel more trustworthy than both a raw settings field and a global planning detour. If users still look for a full allocation view after changing one amount, we revisit by adding a global plan review surface as the second step.

## Success Signal
In simulator/TestFlight review, a user can open Housing settings, tap `Monthly amount`, understand the whole-plan consequence, save or cancel, and return to the settings page without feeling like the app silently changed other categories.

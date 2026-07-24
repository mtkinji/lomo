# Evaluate Learning: budget-app-unlock-review

## Learning questions
- Does the user understand that the app is paused because of the budget, not because Kwilt is punishing them?
- Does landing on Budget Detail make the review feel more trustworthy than a generic review interstitial?
- Is one reason sentence enough, or does the user need a visible reason stack?
- Does a threshold preset like `At 95% used` feel clearer than rule chips?
- Does `Keep blocked` feel like a valid successful choice?
- Does the native shield -> budget deep link -> `Open for now` path actually clear access for the configured window?

## Evidence that supports the bet
- The user completes the task without going to settings.
- The user can explain the feature as "Amazon waits until I review Shopping."
- The user does not ask what rule fired.
- The user sometimes chooses `Keep blocked`.
- `opened_for_now` clears active review-clearable restrictions for the unlock window.
- `left_blocked` records proof but keeps restrictions active.

## Evidence that disconfirms the bet
- The user hunts for settings before understanding what to do.
- The user reads the dock as a punishment or parental-control mechanism.
- The user asks for all conditions because the single reason feels untrustworthy.
- The native shield cannot reliably deep link into the budget task.
- Over-budget blocks feel wrong when they are review-clearable, or feel too harsh when they are not.

## Brand-goodwill evidence
- Copy is described as calm or helpful.
- The user treats `Keep blocked` as self-protection, not failure.
- No celebratory unlock feedback appears.
- The feature makes the budget feel useful at the moment of action.

## Instrumentation
Track or inspect:
- `budget_app_pause_shown`
- `budget_unlock_task_viewed`
- `budget_unlock_opened_for_now`
- `budget_unlock_left_blocked`
- `budget_unlock_window_expired`
- `budget_unlock_restrictions_reapplied`

Avoid tracking:
- individual selected app bundle identifiers,
- granular browsing/open attempts beyond the policy target label,
- shame-oriented "failed" or "resisted" metrics.

## Decision rule
Proceed to permanent implementation after at least one signed-device TestFlight pass where:
- Shield -> Budget Detail routing works,
- `Open for now` clears access,
- `Keep blocked` leaves access blocked,
- foregrounding reapplies shields after the window,
- the task is understandable without a walkthrough.

Revise if the user understands the shield but not the budget screen. Retire or reframe if the interaction feels controlling even with calm copy and clear agency.

## Observed learning — 2026-07-09

Andrew's signed-device use proved that Screen Time blocking and the open/keep-blocked outcomes work. The bet held technically, but the activation cadence did not: the app offers the review too often because an active restriction is treated as sufficient reason to show the unlock choice. That makes a useful interruption feel like a recurring notification.

Decision:

- Keep the budget-native review interaction.
- Change activation from `restriction exists` to `a fresh shield handoff or explicit test action requested review`.
- Consume shield handoffs once so ordinary app launches and Budget Detail visits stay quiet.
- Preserve the existing open window and keep-blocked semantics in this slice.
- Treat exact background reapplication at window expiry as separate native scheduling work; do not hide it inside prompt-cadence changes.

Evidence needed for the refinement:

- A shield action opens one review offer.
- Dismissing, opening, or keeping blocked consumes that offer.
- Reopening Kwilt Money or Budget Detail without another shield action does not offer the review again.
- The explicit Screen Time test-review action still opens the offer.

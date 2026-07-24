# Evaluate Learning: budget-reality-gate

## Learning Questions

- Does the app-open review moment feel more useful than checking a budget meter later?
- Does Maya understand the mapped meter quickly enough to make a choice?
- Does `Leave blocked` feel like a normal successful outcome?
- Does the Screen Time-style gate feel supportive rather than punitive?
- Is manual/fixture lane data enough to learn, or does lack of real transaction data undermine trust?

## Evidence Plan

Evidence that supports the bet:

- The user can explain the feature without internal language.
- The user completes review flows at the moment of intended app open.
- Both outcomes appear in history: `Open for now` and `Leave blocked`.
- The user reports that the pause changed at least one spending decision.
- The setup feels clear enough with at least one app-to-meter rule.

Evidence that disconfirms the bet:

- The user opens Kwilt Money only retrospectively.
- The gate feels annoying, parental, or easy to bypass.
- The meter does not answer "am I okay to open this now?"
- The user wants bank sync before the review loop has any value.
- The user never chooses `Leave blocked`.

Evidence that brand goodwill was protected:

- The user describes the feature as a pause, not a punishment.
- The user trusts why access is blocked.
- Reversal/removal is obvious.
- No copy creates guilt around money.

## Instrumentation

Track:

- `budget_lane_viewed`
- `budget_gate_review_started`
- `budget_gate_opened_for_now`
- `budget_gate_left_blocked`
- `budget_gate_rule_disabled`

Manual notes:

- What spending situation triggered the review?
- Did the user understand the pace label?
- Did the user feel helped, interrupted, or judged?

Do not track:

- Item-level purchases.
- Merchant-level detail beyond the explicitly configured target.
- Household-member behavior.
- Shame-coded labels like "failed" or "overspent user."

## Decision Rule

Proceed to permanent implementation if, after at least one week of self-use or
five meaningful app-open review moments, the user can name the value, trusts the
pause, and has used or seriously considered both outcomes.

Simplify if the gate is useful but setup feels heavy: keep multiple meters in
the model, but expose only one active rule and remove secondary history/setup
details.

Reframe if the gate feels wrong but the meter is useful: shift toward a runway
home meter and defer Screen Time.

Retire if neither the gate nor the meter changes behavior.

## Expected Next Action

Build the learning slice behind local/TestFlight-only assumptions, with real
persistence and a simulated Screen Time adapter first if the entitlement path is
not ready.

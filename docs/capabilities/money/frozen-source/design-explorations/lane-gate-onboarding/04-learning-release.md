# Learning Release: lane-gate-onboarding

## Concept to build

Kwilt Money guides the user through creating one budget lane first, then optionally connecting spend data and adding app controls.

## User story

Today, the app has a meter and review screen, but no setup path that creates the lane, transaction source, and app gate together.

After this release, Andrew can create one `Shopping` budget at `$100/month`, see its meter, and optionally map that meter to one selected app/site for review before access.

## Included experience

- Start setup from home or settings.
- Create budget lane name, amount, and period.
- See the first meter.
- Choose transaction source:
  - connect Plaid, or
  - use manual/dev meter values for first gate testing.
- If Plaid is connected, show suggested spend summary and accept matches.
- Optionally select apps/sites with FamilyControls.
- Show final rule summary if app controls are added.
- Activate the rule if app controls are added.
- Show first review rehearsal after activation.

## What must be real

- Persistent `BudgetLane`.
- Persistent `BudgetPeriod`.
- App/site selection boundary for FamilyControls tokens when app controls are added.
- Persistent `AppGateRule` that maps lane to selected tokens when activated.
- Review screen can load the lane from the active gate rule.
- Rule summary can explain what will happen.
- Gate can be deactivated.

## What can be thin or temporary

- Manual/dev meter values instead of Plaid for the first app-gate test.
- One unlock duration, such as 15 minutes.
- One active rule.
- Simple app/site token labels.
- Simulated shield behavior if native FamilyControls work is not ready.
- Suggested transaction review as accept-all summary.

## Release channel

Start with `Local build`, then `TestFlight build`.

Reason: FamilyControls behavior and native entitlement quirks need device validation, while copy and setup sequence can be tested locally with simulated tokens.

## Brand-goodwill guardrails

- Always show what will be shielded before activation.
- Make deactivation obvious.
- Use "wait behind this meter" language instead of "block."
- Treat `Leave blocked` as a normal outcome.
- Avoid bank or Apple permission requests before the user understands the rule.
- Never imply Kwilt can force behavior; the user chooses the pause.

## Implementation sequence

1. Build budget setup UI with lane name, amount, period, and fixture/manual lane values.
2. Persist lane, period, and app gate rule.
3. Load the rule into the existing review screen.
4. Add FamilyControls picker and token persistence.
5. Apply ManagedSettings shield for selected tokens.
6. Add Plaid-backed transaction suggestions.
7. Replace manual meter values with ledger-backed meter values.

## Permanent product threshold

Promote the setup flow when:

- A user can finish setup without asking what any technical term means.
- The final rule summary matches what actually happens.
- The selected app/site waits behind the right meter.
- The review unlock window works reliably.
- Deactivation is easy and trusted.

# Converge: lane-gate-onboarding

## Qualitative scoring

| Alternative | Persona fit | JTBD fit | System fit | Blast radius | Notes |
| --- | --- | --- | --- | --- | --- |
| App-First Gate Setup | High | High | Medium | Medium | Fast to the impulse moment, but can feel like restrictions too early. |
| Budget-First Lane Setup | High | High | High | Medium | Best trust-building sequence: budget, meter, then optional transactions and app gate. |
| Bank-First Auto-Discovery | Medium | Medium | Low | High | Powerful later; too invasive for first setup. |
| Demo-First Guided Rule | Medium | Medium | High | Low | Useful teaching layer, but not the main setup. |
| Checklist Setup | Medium | Medium | Medium | Medium | Good recovery model; avoid making it the primary UX. |

## Capability delta

Today, the user cannot:

- Create a lane.
- Connect transaction inference to that lane.
- Add app/site controls to a lane after the budget exists.
- See one plain summary of the resulting rule.
- Activate/deactivate the gate.

After this concept ships, the user can:

- Create one lane in household language.
- Connect one account or continue with manual/fixture spend.
- Review suggested transaction matches.
- Pick one or more apps/sites through FamilyControls after seeing the lane.
- Activate a rule: "Show this budget before this app opens" or "Pause this app when the budget is maxed out."
- Complete a review that unlocks the selected app for a short window.

Still intentionally not supported:

- Multi-lane bulk setup.
- Bank-first auto-generated lanes.
- AI lane discovery.
- Shared household permissions.
- Sophisticated shield deep-link behavior.

## Reductive design pass

Smallest elegant setup:

1. Name the lane.
2. Set amount and period.
3. See the meter.
4. Choose whether to keep the meter current with connected transactions.
5. Confirm suggested matches if connected.
6. Choose whether to add app controls.
7. Choose when app controls apply.
8. Review the plain rule summary if app controls are added.
9. Activate.

Refuse to add:

- Category taxonomy setup.
- A transaction ledger screen.
- A large permission explainer.
- Multiple gates before the first one works.
- Family member management.
- Time-of-day schedules.

What would make setup feel like clutter:

- Asking for every possible inference signal up front.
- Showing raw Apple token concepts.
- Explaining Screen Time internals.
- Asking the user to connect a bank before they know the lane/app value.

## Chosen alternative

Choose `Budget-First Lane Setup`.

The primary flow starts with the user's budget sentence: "I want to create a shopping budget at $100/month." The app controls come after because they are a way to support the budget, not the reason the budget exists.

## Accepted trade-offs

- Accept a slightly longer setup to build trust before app shielding.
- Accept that app controls are optional after lane creation rather than mandatory in first-run setup.
- Accept optional Plaid during early testing so FamilyControls value can be felt with fixture/manual meter data.
- Accept deterministic suggestions before AI.
- Accept that Apple shield handoff may require the user to open Kwilt Money manually.

## Rejected trade-offs

- Do not start with bank connection as the first screen.
- Do not start with Apple permissions before explaining the user-owned rule.
- Do not make the user build a full budget.
- Do not silently activate app shields without a final rule summary.

## Recommended onboarding flow

### 1. Create the budget lane

Prompt: "What budget do you want to set up?"

Example inputs:

- Shopping
- $100
- Monthly

Output:

- `BudgetLane`
- `BudgetPeriod`

### 2. Show the first meter

Show:

- lane name
- budget amount
- period
- spent so far, initially manual/dev or unknown
- remaining runway

Output:

- first `BudgetMeterSnapshot`

### 3. Keep the meter current

Prompt: "How should Kwilt keep this meter current?"

Choices:

- Connect account
- Enter spend manually for now
- Use dev/sample values

If connecting:

- show narrow copy: "Kwilt uses transactions to suggest spend for this budget."
- open Plaid Link for Transactions only
- run sync
- create suggestions

Optional inference hints:

- merchants
- account/card
- app/site
- provider category

Output:

- `LaneInferenceHint[]`
- `FinancialConnection`
- `FinancialAccount`
- `NormalizedTransaction[]`
- `AssignmentSuggestion[]`

### 4. Confirm suggested spend

Show a compact summary, not a ledger:

- suggested total
- number of matching transactions
- top merchants
- "Looks right" action
- "Review matches" secondary action

Output:

- confirmed `TransactionMeterAssignment[]`
- `MeterLedgerEntry[]`

### 5. Add app controls

Prompt after the meter exists: "Do you want any apps to wait behind this budget?"

Use FamilyControls selection only if the user opts in:

- "Choose the apps or sites that should wait behind this meter."

Output:

- `AppGateTarget`
- selected application/category/web-domain tokens

### 6. Choose the control mode

Options:

- Review before opening.
- Review when this budget is running hot.
- Pause when this budget is maxed out.

Output:

- `AppGateRule.mode`
- budget threshold policy

### 7. Rule summary

Plain-language summary:

> Before Amazon opens, show Shopping.  
> If you review it, Amazon opens for 15 minutes.  
> If Shopping is maxed out, Amazon stays paused until next month or until you change this rule.

Actions:

- Activate
- Edit lane
- Edit apps

Output:

- active `AppGateRule`
- ManagedSettings shield applied

### 8. First review rehearsal

Immediately show the review screen once:

- meter
- target apps
- `Open for now`
- `Leave blocked`

This teaches the loop before the user sees the Apple shield in the wild.

## Bet

We're betting that setup will feel best when it starts with a plain budget in the user's language, then offers bank sync and FamilyControls as supporting steps. If users still feel setup is too heavy, we should let them save the budget first and add controls later from the lane detail screen.

## Success signal

Andrew can create a `Shopping` lane at `$100/month`, connect or seed spend, optionally choose Amazon through FamilyControls, activate a maxed-out rule, and explain the result in one sentence: "Amazon pauses if my shopping budget is used up."

---
id: brief-lane-gate-onboarding
title: Category Gate Onboarding
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-put-intention-before-impulse
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: name-spending-category
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate, brief-plaid-transaction-backed-meter, brief-screen-time-controls]
owner: andrew
last_updated: 2026-06-24
---

# Category Gate Onboarding

## Context

Kwilt Money can become meaningfully different from a budget dashboard if setup starts with a simple user-owned category, then offers controls that help the user keep it. This brief defines the first setup workflow that creates a category first, then optionally adds transaction source, app/site selection, and review-gate activation.

## Product decision

Use `Category-First Gate Setup`.

The flow starts from the user's category sentence: "I want to track Shopping at $100/month." Bank sync and FamilyControls come after the category exists.

## Setup flow

1. **Create the category**
   - Prompt: "What budget do you want to set up?"
   - Example: Shopping, $100, monthly.

2. **Show the meter**
   - Name.
   - Budget amount.
   - Period, initially monthly.
   - Spent so far and remaining runway.

3. **Keep the meter current**
   - Connect account through Plaid Transactions, or use manual/dev values for now.
   - If connected, sync transactions and show a compact suggested-spend summary.

4. **Confirm suggested spend**
   - Show suggested total, transaction count, top merchants, and sync freshness.
   - Primary action: `Looks right`.
   - Secondary action: `Review matches`.

5. **Add app controls**
   - Prompt: "Do you want any apps to wait behind this budget?"
   - Use FamilyControls selection.
   - User-facing frame: "Choose what waits behind this meter."
   - Choose when controls apply: review every time, review when running hot, or pause when maxed out.

6. **Review the rule**
   - Plain summary: "Before Amazon opens, show Amazon household. If you review it, Amazon opens for 15 minutes. If the budget is maxed out, Amazon stays paused until next month or until you change this rule."

7. **Activate and rehearse**, if app controls are added
   - Apply the app/site gate.
   - Immediately show the review screen once so the user sees the loop.

## Objects created

- `BudgetLane`
- `BudgetPeriod`
- `LaneInferenceHint`
- `FinancialConnection` and `FinancialAccount`, if Plaid is connected
- `AssignmentSuggestion`, if transactions are synced
- `TransactionMeterAssignment`, when suggestions are confirmed
- `MeterLedgerEntry`
- `AppGateTarget`
- `AppGateRule`
- `BudgetReviewEvent`, after rehearsal or real review

## Acceptance criteria

- User can create one lane with amount and period.
- User can continue with manual/dev meter values or connect Plaid.
- User can select one or more app/site targets.
- User can choose whether controls apply always, only when running hot, or when the budget is maxed out.
- App shows a final rule summary before activation.
- Rule can be activated and deactivated.
- Review screen loads the lane associated with the selected app/site target.
- A completed review can unlock the selected target for the configured window in native/dev validation or simulated validation.
- Copy avoids "parental controls," "permission," "allowance," and shame language.

## Out of scope

- Multi-member household setup.
- Multiple active rules in the first slice.
- AI-generated lane discovery.
- Full transaction ledger.
- Scheduled rules.
- Advanced blocked-app deep linking from the Apple shield.

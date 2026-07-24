# Frame: lane-gate-onboarding

## What the user said

> That's amazing news! Now we need to define the right onboarding / setup workflow to take advantage of that.

## Restated in user voice

When I decide I want a simple budget, like shopping at $100/month, I want Kwilt Money to help me create that lane first, then optionally add transaction matching and app controls after the budget has a shape.

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance or productivity methodology.

## Representative persona

Maya: a parent or household lead who wants practical support before easy spending moments.

- Current situation: she knows a spending area needs a boundary, but setup across budgets, bank links, and Screen Time can feel technical.
- What she is trying to become/do: make one spending lane concrete, then decide whether it needs app-level support.
- Emotional state or tension: hopeful about a real pause, wary of invasive banking or restriction setup.
- What would make this feel wrong: a long configuration wizard, Apple/financial jargon, or being asked to understand internal rule machinery.

## Hero anchor

`jtbd-put-intention-before-impulse` - help me put a meaningful action before the apps I drift into.

## Job flow step

Local job flow: `job-flow-maya-review-budget-reality-before-spending`.

Underserved step: set up one budget lane first, then decide whether to keep it current with transactions and place selected apps behind its review.

Current product offering: fixture lane, review screen, in-memory review event, documented future Screen Time and Plaid seams.

Gap: no coherent setup flow that starts with `BudgetLane` creation, then progressively adds transaction inference hints, app gate targets, FamilyControls tokens, and review/unlock behavior.

## Active anchors

- `jtbd-put-intention-before-impulse` - setup exists to create the pre-app review moment.
- `jtbd-carry-intentions-into-action` - lane, transactions, and app gate should preserve the user's intention at the right moment.
- `jtbd-trust-this-app-with-my-life` - bank data plus app restrictions require transparency and reversibility.
- `jtbd-review-budget-reality-before-spending` - the setup creates the conditions for this local job.

## Friction we're addressing

The risk is asking the user to set up three systems: a budget, a bank connection, and Screen Time controls. The right onboarding should begin with the user's own budget sentence: "I want a shopping budget at $100/month." Only after that should Kwilt ask how to keep the lane current and whether any apps should wait behind it.

## System alignment

Constraint posture: `Extend the system`.

Current system facts:

- Existing surface: Expo app home/review/settings tabs.
- Existing flow: home meter -> review screen -> record review.
- Existing domain model: `BudgetLane`, `BudgetMeter`, `AppGateTarget`, `BudgetReviewEvent`, plus planned `FinancialConnection`, `AssignmentSuggestion`, `AppGateRule`.
- Existing platform direction: Plaid Transactions for spend data; Apple FamilyControls/ManagedSettings for app/site selection and shielding.
- Existing UX convention: calm, concrete, no shame, no dashboard-first language.

Constraints to preserve:

- The user's first setup should produce one useful budget lane, not a complete budgeting system.
- Apple FamilyControls token selection should be presented as "choose apps/sites," not as technical policy.
- Plaid should be explained as keeping the chosen meter current, not broad surveillance.
- The user must be able to remove the gate, remove the account, and edit the lane.

Constraints we may challenge:

- Settings may need a first-run setup path rather than remaining a passive tab.
- Lane creation should lead the flow; transaction inference and app selection should be progressive add-ons.
- The app may need a setup checklist/status model to explain partially complete rules.

## Aspirational design challenge

How might we help Maya create a simple budget lane first, then add transaction matching and app controls only when they make that lane more useful?

## Out of scope

- Multi-member household setup.
- Multi-lane bulk onboarding.
- Full transaction ledger.
- AI categorization.
- Production App Store entitlement language.
- Perfect blocked-app deep-link behavior from Apple's shield.

## Open question

Should app controls be prompted immediately after lane creation, or only after the user has seen the lane's meter with manual or transaction-backed spend?

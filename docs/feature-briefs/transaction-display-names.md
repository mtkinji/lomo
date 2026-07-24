---
id: brief-transaction-display-names
title: Transaction Display Names
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: match-transactions-to-lane
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-transaction-freshness-trust]
owner: andrew
last_updated: 2026-07-08
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Transaction Display Names

## Product Decision

Kwilt Money should let a user give an unreadable transaction a personal display name while preserving the raw bank/Plaid descriptor as source evidence.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `match-transactions-to-lane`
- Current score: 3.5
- Expected delivery change: 3.5 -> 4 if TestFlight verification proves renamed transactions remain recognizable and trustworthy across detail, inventory, and budget activity.
- Evidence required: ugly connected transaction -> rename -> list/activity display preferred name -> detail still shows raw bank description -> clear rename restores source-derived label.
- Map update trigger: after runtime verification with connected spend in a TestFlight build.

## User Problem

Some bank-provided transaction names are technically real but terrible as product copy. When one becomes the primary title, the screen looks broken even if the data is accurate. Maya needs to preserve the evidence but see a name she recognizes.

## User Experience

- Transaction detail shows the user-facing display name as the title.
- A small edit affordance lets the user rename the display label.
- Detail continues to show the raw source descriptor as `Bank description`.
- Transactions inventory and budget activity use the preferred display name.
- Clearing the display name returns the row to the source-derived label.
- Category controls remain visually and behaviorally separate from name editing.
- If similar-name reuse is included, it must show a preview before applying.

## Data And System Behavior

- Store display-name overrides separately from provider transactions.
- Overrides are user-owned and reversible.
- Rendering should resolve `preferredDisplayName ?? merchantName`.
- Raw `originalDescription` remains unchanged and visible on detail.
- Display names do not affect category assignment, merchant/category rules, forecasts, totals, pending/settled dedupe, or sync.
- Similar-name display rules, if added, must be distinct from category match rules.

## Copy Contract

Use:

- `Display name`
- `Bank description`
- `Use this name for similar transactions`
- `Remove display name`

Avoid:

- `Fix transaction`
- `Correct bank name`
- `AI cleaned name`
- `Merchant truth`

## Acceptance Criteria

- A user can save and clear a transaction display name.
- Detail, Transactions inventory, and budget detail activity render the preferred display name.
- Detail still shows the exact raw bank/Plaid descriptor.
- Category assignment and budget totals are unchanged by renaming.
- The selected-category secondary action no longer says `Not in a budget` while a category is selected.
- Display-name persistence is covered by focused tests.
- `npm run lint` and `npm run test:forecast` pass before a TestFlight build.

## Exclusions

- AI merchant enrichment.
- Source transaction mutation.
- Notes, receipts, or attachments.
- Household-wide naming policy.
- Category-context labels like "Rent payment" as the first slice.

## Spec Refinement

Clear enough to build with these assumptions:

- First release should prioritize one-off persisted names.
- Similar-name reuse is useful but can follow after the one-off path is proven.
- The raw bank descriptor must remain visible without requiring a hidden debug view.
- The display-name resolver should be a small shared helper so list/detail/activity surfaces do not drift.

Open implementation questions:

- Should overrides live in a new `budget_transaction_display_names` table or alongside review metadata?
- Should inflows and outflows both support display names in the first release?
- Should the edit interaction be inline or a bottom sheet?

Deferred decisions:

- AI-generated draft names.
- Similar-name display rules.
- Household/shared display-name behavior.
- Analytics beyond privacy-preserving action counts.

## Completion Checklist

- Did this change affect the mapped job step? Yes, `match-transactions-to-lane`.
- Did it add, remove, or materially alter a UX flow? Yes, it adds transaction display-name editing.
- Did it create evidence that should be added to `docs/job-delivery-map.yaml`? Only after runtime/TestFlight verification.
- Should friction or recommended next action change? Yes, if verified, add display-name correction to the transaction-review trust foundation.
- Should the delivery score change, and what proof supports that? Move toward 4 only with proof that connected transaction renames persist and render correctly across surfaces.

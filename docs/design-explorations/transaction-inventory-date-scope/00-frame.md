# Frame: transaction-inventory-date-scope

## What the user said

> I expect to get up to 12 months worth of past transactions, maybe more (if that's possible). I expect the Transactions list will contain all my transactions and somehow intelligently filter to the current month, while being clear about it.

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance methodology.

## Representative persona

Maya wants the budget meter to feel current and trustworthy without turning Kwilt Money into a finance dashboard.

- Current situation: she has connected financial accounts and expects transaction history to exist as a durable inventory.
- What she's trying to do: understand current budget reality while still being able to inspect older evidence when something looks wrong.
- Tension: hidden filters feel like missing data; unscoped ledgers feel like bookkeeping.
- What would feel wrong: a Transactions tab that says `0 / 0` when accounts clearly have transaction history.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - transaction history is trust evidence for the budget meter.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, step 4: understand spend reality in plain language. Current delivery is partial: budget meters are period-scoped, but the transaction inventory currently inherits that period scope invisibly.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - financial data must be transparent, reversible, and explainable.
- `jtbd-review-budget-reality-before-spending` - the current month still matters because the meter answers "what is true right now?"
- `jtbd-carry-intentions-into-action` - transaction review should support corrections without creating a bookkeeping chore.

## Friction we're addressing

Accounts can show transaction counts while Transactions shows none. The app is mixing two jobs: durable inventory and current-period budget evidence. The fix is to keep the inventory complete and make the date scope explicit.

## System alignment

Constraint posture: `Fit the system`

Current system facts:
- Existing surface: `app/(tabs)/transactions.tsx` already uses `KwiltPage`, `InventoryListFrame`, filter/sort controls, grouped rows, and a transaction detail sheet.
- Existing user flow: Accounts owns connection setup and sync; Transactions owns review and correction.
- Existing domain/data model: Plaid rows become `TransactionReviewRow`; budget meters should remain current-period calculations.
- Existing technical affordances: Plaid supports up to 730 days of transaction history at Item initialization; Supabase stores normalized transactions with dates; the app already loads a connected-spend snapshot.
- Existing UX/copy conventions: compact controls, visible counts, no explanatory tutorial panels, calm object-inventory language.

Constraints to preserve:
- Transactions must stay an inventory, not a dashboard.
- Budget meters and budget detail evidence should remain current-period by default.
- The existing filter/sort control grammar should carry the new date scope.

Constraints we may challenge:
- The snapshot's `transactions` field should stop meaning both "all rows" and "current period rows".

Design implication:
Use explicit date scope as an inventory control. Keep current month as the default review lens, but keep all available rows in the loaded inventory so "All" and historical ranges are one tap away.

## Aspirational design challenge

How might we help Maya review current budget reality from a complete transaction inventory, while preserving Kwilt's calm inventory shell and avoiding a finance dashboard?

## Out of scope

Custom arbitrary date picker, CSV import/export, account-specific transaction drilldowns, persisted user filter preferences, and rebuilding budget meter semantics.

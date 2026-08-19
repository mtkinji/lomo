# Chores Digital Rewards Wallet Implementation Plan

> Execute in the current `codex/chores-recurring-contract` checkout while preserving the active recurrence, correction, and caregiver-attention changes.

**Goal:** Give Labs households an authoritative digital token wallet: children earn chore tokens, set available tokens aside at a fixed cash value, and caregivers complete redemption only after making the outside-app payout.

**Architecture:** Upgrade the local Chores learning record to an append-only rewards ledger. `earn`, `reserve`, `cancel`, `settle`, and `adjust` events are the source of truth; total, available, set-aside balances, and unpaid payouts are projections. Reservation does not debit ownership; settlement atomically records payment and removes the reserved tokens. Existing version-12 records migrate once by creating deterministic opening and completed-chore earn events. UI actions call pure domain transitions through the persisted Zustand store.

**UI contract:** When Rewards is enabled, a child gets one circular wallet action at the bottom of Chores. It opens a Rewards drawer whose scan order is available tokens, cash value, set-aside tokens, pending payout, then redemption controls. A caregiver sees the same drawer with household unpaid payouts and `Paid`; this is separate from chore-review judgment. Do not add physical-token modes, approval/rejection, a reward catalog, child settlement controls, or payment-provider wiring.

## Tasks

1. Update the Chores feature brief, convergence notes, model taxonomy, learning release, evaluation notes, and UI contract to reflect reservation plus outside-app settlement.
2. Add regression-first domain tests for one-time migration, trusted and approved earns, reopen adjustments, conversion validation, immutable exchange-rate receipts, and caregiver-only settlement.
3. Add store tests for persisted conversion and settlement actions, then implement record version 13 and store migration.
4. Build `ChoreRewardsDrawer` from `BottomDrawer`, `BottomDrawerHeader`, `BottomDrawerFooter`, and canonical buttons.
5. Replace the child agreement bar with the single Rewards FAB when tokens are enabled. Add caregiver payout attention beside the existing review and Chat controls.
6. Run focused Chores domain/store/screen tests, then `npm run verify:changed -- --run` once at task completion.
7. Inspect the child wallet, conversion state, caregiver payout state, and Rewards-off state in the iOS Simulator before calling the slice complete.

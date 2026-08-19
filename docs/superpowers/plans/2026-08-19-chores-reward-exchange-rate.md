# Chores Reward Exchange Rate Implementation Plan

> **For agentic workers:** Follow this plan in the current checkout. Do not create a worktree or delegate implementation without Andrew's explicit approval.

**Goal:** Give caregivers a simple, persisted way to set the dollar value of one digital reward token.

**Architecture:** Add a caregiver-authorized pure domain transition that updates the household's current cents-per-token value. Reward reservations continue to snapshot their exchange rate, so changing the current value affects the child's available-value projection and future reservations without rewriting pending or settled payouts. Expose the setting inside the existing Chore settings drawer using the canonical input and button primitives.

**Tech Stack:** React Native / Expo, TypeScript, Zustand, Jest, React Native Testing Library.

---

## Product and UI contract

- The setting is available only to caregivers and only while digital rewards are enabled.
- The field is labeled `Dollars per token`, accepts a positive USD amount with at most two decimal places, and uses an explicit `Save token value` action.
- The drawer explains that the new value applies to new redemptions and that existing payouts keep their original value.
- A changed rate immediately updates the child's available cash equivalent.
- Pending and settled payout receipts retain the rate captured when the child set tokens aside.
- Kwilt records the agreement but does not transfer money or introduce currency selection in this slice.

## Implementation tasks

1. Add tested pure helpers for formatting and parsing the dollar input.
2. Add a tested caregiver-only domain transition for updating the current cents-per-token rate.
3. Expose the transition through the Chore learning store and persistence contract.
4. Extend `ChoreSettingsDrawer` with the conditional rate editor and explicit save action.
5. Wire the setting through `ChoresScreen` and cover the caregiver-to-child flow in screen tests.
6. Update the Chores feature brief and UI contract to distinguish the current household rate from immutable payout snapshots.
7. Run focused tests, the diff-aware completion gate, and Simulator visual/behavioral review.

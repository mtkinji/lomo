# Food Guided First Cycle Implementation Plan

**Goal:** Move a clean-account person from a fitting Recipe through a real Plan into Groceries using resumable native coachmarks, while keeping Groceries independently useful.

**Branch:** `codex/capability-first-entry-onboarding`

**Product authority:** `docs/feature-briefs/food-capability-onboarding.md`

## Task 1: Model guide progress

- [x] Add a typed checkpoint and domain-evidence reducer with focused tests.
- [x] Persist progress in the existing user-scoped capability onboarding record.
- [x] Complete only from authoritative Grocery-list evidence.

## Task 2: Remove the narrated detour

- [x] Route **Make meals easier** directly to Recipes.
- [x] Preserve exact-context bypass and resume behavior.
- [x] Keep all capability-menu entries visible.

## Task 3: Relay guidance across native surfaces

- [x] Advance from a real Recipe card to **Add to Plan**.
- [x] Create or update a person-owned Plan without requiring Household setup.
- [x] Teach bounded sharing as optional, then selected Grocery compilation.
- [x] Finish on the first real Grocery item.

## Task 4: Make pristine Groceries truthful

- [x] Offer a real manual-list start from the empty state.
- [x] Keep online shopping unavailable until actionable list items exist.
- [x] Preserve fixed-dock and completion behavior for non-empty lists.

## Task 5: Verify the learning release

- [x] Run focused model, navigation, Recipe, Plan, and Grocery tests.
- [x] Run `git diff --check` and `npm run verify:changed -- --run` once at completion.
- [x] Review the native Food entry and first coachmark hierarchy in the Simulator.
- [ ] Complete live backend mutation, dismiss/resume, large text, and Reduce Motion proof.
- [ ] Keep signed-device, TestFlight, and production proof as separate promotion gates.

# Inferred Meal Plan Household Attention Implementation Plan

> **For Codex:** Execute this plan in the current checkout. Preserve the unrelated Meal Plan drag, Grocery compiler, onboarding, and Coachmark work already present in the dirty tree.

**Goal:** Replace the manual Household member-selection prompt with a restrained automatic attention loop that leads each eligible recipient directly back to the live Plan.

**Architecture:** Postgres remains authoritative. A new candidate starts or extends a 30-minute quiet window for a Household-attached draft Plan. Per-member view and participation timestamps suppress people who already returned or contributed. A scheduled Edge Function marks recipient-owned unseen state and creates direct Meal Plan push work. Recipients can disable only the push interruption; the in-app dot remains available. Guest Share stays separate and bounded.

**Tech Stack:** React Native / Expo, Zustand, Supabase Postgres + RLS/security-definer RPCs, Supabase Edge Functions, pg_cron/pg_net, Jest, Deno tests.

## Product and UI contract

- Help a Household notice when a settled burst of new meal ideas is ready for optional input.
- Add no Plan control, member picker, formal round, inbox item, or separate results destination.
- Show one standard red dot on Recipes in the capability menu and Ideas inside Recipes while the recipient has unseen Plan activity. It is not a meal count.
- A push tap opens the exact live Plan directly through `Food > RecipeLibrary`.
- Opening the live Plan clears unseen state. Opening Recipes alone does not.
- The existing top-right Share action continues to create only a bounded guest link.
- `Household meal planning` in Notifications controls push interruption only.
- Reactions, Grocery compilation, lifecycle changes, and row edits do not schedule attention in the first release.

## Policy contract

1. A candidate insert on a Household-attached draft Plan starts or extends one quiet-period window.
2. The window becomes eligible 30 minutes after the latest candidate insert.
3. Every active adult and every child with active Meal Planning capability plus an active auth binding is eligible by default.
4. Exclude every person who added an idea in that window, viewed the Plan after the latest idea, or reacted after the window began.
5. Mark unseen state once and emit at most one idempotent push job per recipient and window.
6. Opening the live Plan records a view and clears that recipient's unseen state.
7. Disabling Household meal planning prevents push work for that account without suppressing its in-app dot.

### Task 1: Lock direct attention contracts with focused tests

Add failing assertions for inference, private copy, the `{ type: 'mealPlanAttention', planId }` payload, direct live-Plan routing, Recipes and Ideas dots, clearing on Plan view, and push preference behavior. Confirm the expected failures before implementation.

### Task 2: Add durable recipient-owned Postgres state

Create private RLS-enabled attention windows, per-member unseen state, push preferences, and a direct push outbox. Add candidate/reaction triggers, authenticated attention/view/preference RPCs, and service-role-only process/claim/complete RPCs. Keep Shared Home unchanged. Schedule a five-minute Edge Function invocation using the repository's established pg_cron/pg_net convention.

### Task 3: Add the scheduled direct-push worker

Process due windows, claim durable push jobs, send privacy-bounded Meal Plan copy with the exact Plan ID, and acknowledge or release each claim for bounded retry. Keep generic Shared Home push callers unchanged.

### Task 4: Project and clear unseen state in the existing Food flow

Query recipient-owned unseen state when the capability menu or Recipes becomes active. Render an 8-point action-attention dot on Recipes and Ideas. Record a view only when the live Plan drawer opens, then clear the local dot after the backend accepts the view. Preserve the exact Plan ID from push through navigation.

### Task 5: Retire the manual Household request path

Remove the Meal Plan callback that adds Ask Household to guest Share and remove the selected-member drawer. Preserve guest links and contextual Household setup without claiming either is a notification control.

### Task 6: Document and verify the learning release

Document the inferred policy and proof boundaries. Run focused Jest and Deno tests, migration/static checks, then `npm run verify:changed -- --run` once after the intended slice is complete. If a controlled Simulator runtime is available, review the Notifications row, guest Share sheet, Recipes/Ideas dots, and Plan deep link. Report backend deployment, actual push, signed-device, TestFlight, and production proof separately.

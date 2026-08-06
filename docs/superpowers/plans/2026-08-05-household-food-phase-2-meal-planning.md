# Household Food Phase 2: Meal Planning and Family Choice Implementation Plan

## Implementation checkpoint — August 5, 2026

Source and automated tests are complete for flexible planning horizons,
organizer finalization, explicit participant choice rounds, private responses,
Shared Home delivery, offline cache, and Activity projections. Supabase Local
execution and two-account signed-device authorization/notification proof remain
required. Child participation stays unavailable by default until that proof is
earned.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an organizer create a flexible Next meals cycle, optionally gather private bounded input from selected household members on separate devices, and finalize a versioned plan without making Activities or majority vote authoritative.

**Architecture:** Meal Planning uses server-authoritative, versioned plan/round/response tables and security-definer RPCs. Opening a choice round freezes candidate snapshots and explicit participants; each participant can read only that projection and mutate only their response until closure. Activities and Shared Home carry invitation/reminder projections, while Meal Planning owns all state and receipts.

**Tech Stack:** Supabase Postgres/RLS/RPC/Realtime, existing Household and Shared Home foundations, React Native, AsyncStorage read cache, Activity action cards, Expo notifications, Jest/RNTL, and pgTAP.

---

## Scope and file map

Create:

- `supabase/migrations/20260806020000_meal_planning.sql`
- `supabase/tests/meal_planning.sql`
- `src/capabilities/meal-planning/domain/mealPlanTypes.ts`
- `src/capabilities/meal-planning/domain/mealPlanValidation.ts` and test
- `src/capabilities/meal-planning/domain/mealPlanLifecycle.ts` and test
- `src/capabilities/meal-planning/domain/mealChoiceAggregate.ts` and test
- `src/capabilities/meal-planning/data/mealPlanningRepository.ts` and test
- `src/capabilities/meal-planning/data/mealPlanningCache.ts` and test
- `src/capabilities/meal-planning/screens/NextMealsScreen.tsx` and test
- `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx` and test
- `src/capabilities/meal-planning/screens/MealChoiceInviteScreen.tsx` and test
- `src/capabilities/meal-planning/screens/MealChoiceResponseScreen.tsx` and test
- `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx` and test
- `src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.ts` and test
- `supabase/functions/_shared/mealPlanningDelivery.ts` and Deno test

Modify Household activation, Shared Home, NotificationService, Food navigation,
Recipe snapshot reads, the Activity card registry, and safe analytics events.

## Closed lifecycle

```text
draft -> collecting_choices -> ready_to_finalize -> finalized -> archived
finalized --revise--> draft(version + 1)
choice round: draft -> open -> closed | cancelled
response: absent -> draft -> submitted -> withdrawn
```

The first response rule is exactly `pick_up_to` with limit `3`, plus `pass` and
at most one plain-text suggestion. No ranked choice, comments, public ballots,
auto-winner, or generic poll configuration.

### Task 1: Add versioned plan and round authority

**Files:** migration, pgTAP, `mealPlanTypes.ts`, validation files

- [ ] **Step 1: Write migration contract tests** requiring plan, candidate,
  round, explicit participant, response, and finalized-entry tables. Prove
  organizer access, invited projection, own-response write, uninvited household
  denial, unrelated-account denial, removed-member denial, and stale/late write
  rejection.
- [ ] **Step 2: Run `supabase test db` and the validation Jest test; verify they
  fail because the schema is absent.**
- [ ] **Step 3: Implement these public RPCs:**

```text
create_kwilt_meal_plan(household_id, horizon, candidate_snapshots)
update_kwilt_meal_plan(plan_id, expected_version, patch)
open_kwilt_meal_choice_round(plan_id, expected_version, participant_membership_ids, closes_at)
get_kwilt_meal_choice_projection(round_id)
submit_kwilt_meal_choice_response(round_id, expected_round_version, selected_candidate_ids, pass, suggestion)
withdraw_kwilt_meal_choice_response(round_id, expected_round_version)
close_kwilt_meal_choice_round(round_id, expected_version)
finalize_kwilt_meal_plan(plan_id, expected_version, selected_candidate_ids, organizer_note)
revise_kwilt_meal_plan(plan_id, expected_version)
```

Every mutation validates permanent auth, current active membership, optimistic
version, state transition, candidate membership, and role. The participant
projection returns inviter label, candidate snapshots, rule/limit, close time,
state, and only the current viewer's response. It never returns other members'
selections before close or private Recipe fields.

- [ ] **Step 4: Add `meal-planning` to the child capability catalog as
  unavailable by default; rollout explicitly enables it.**
- [ ] **Step 5: Run pgTAP/Jest and require all negative cases to pass.**
- [ ] **Step 6: Commit schema and domain types.**

```bash
git add supabase/migrations/20260806020000_meal_planning.sql supabase/tests/meal_planning.sql src/capabilities/meal-planning/domain
git commit -m "feat: add private family meal choice rounds"
```

### Task 2: Implement pure horizons, transitions, and calm aggregation

**Files:** lifecycle and aggregate files/tests

- [ ] **Step 1: Write table-driven tests** for `next_shop`, `meal_count`,
  `date_range`, and `open`; optional day placement; invalid ranges; revise;
  close/cancel; limit three; pass; suggestion; withdrawal; late response; ties;
  and no member-level rejection exposure.

```ts
expect(aggregateMealChoices({ candidates, responses })).toEqual([
  { candidateId: 'tacos', pickCount: 4 },
  { candidateId: 'soup', pickCount: 2 },
]);
expect(aggregateMealChoices({ candidates, responses })[0]).not.toHaveProperty('pickedBy');
```

- [ ] **Step 2: Implement pure functions and rerun tests.** Aggregation sorts by
  pick count then original candidate order, never names a winner, and never
  finalizes. Horizon validation requires a target count only for `meal_count`
  and ordered dates only for `date_range`.
- [ ] **Step 3: Commit the pure model.**

### Task 3: Build repository, read cache, and Realtime invalidation

**Files:** repository/cache files and tests

- [ ] **Step 1: Write tests** for organizer snapshot, participant projection,
  account-keyed cache, removed access, invalidation, closed-round conflict, no
  offline mutation queue, retry, and account switch clearing.
- [ ] **Step 2: Implement repository methods matching the RPCs.** Cache only
  validated read projections. Offline state is read-only with “Reconnect to
  respond/finalize.” Never replay a response that may cross round closure.
- [ ] **Step 3: Run and commit.**

```bash
npx jest src/capabilities/meal-planning/data --runInBand
git add src/capabilities/meal-planning/data
git commit -m "feat: sync meal planning authority"
```

### Task 4: Build organizer Next meals and editor

**Files:** `NextMealsScreen.tsx`, `MealPlanEditorScreen.tsx`, tests, navigation

- [ ] **Step 1: Write tests** for no-plan start, all horizons, Recipe search,
  leftovers, eat out, undecided, plain note, servings, optional day, reorder,
  stale save, resume, archive, and exact Recipe-version snapshot.
- [ ] **Step 2: Implement a candidate-first surface, not a calendar.** A Recipe
  candidate stores the exact `PlannedRecipeSnapshot`; plain entries use
  `meal_note`. Food resume opens the active plan, last finalized plan, or Recipe
  library in that order.
- [ ] **Step 3: Run tests and signed Simulator checks** for a three-meal next-shop
  cycle, two-week range, and open plan.
- [ ] **Step 4: Commit.**

### Task 5: Build invitation, response, aggregate, and finalization UI

**Files:** invite/response/finalize screens and tests

- [ ] **Step 1: Write tests** for explicit activated participants, invitation
  scope, pick three, pass, suggest one, revise, withdraw, expired/removed state,
  organizer close, aggregate, and finalization that may differ from top picks.
- [ ] **Step 2: Implement the bounded surfaces.** Participant UI shows inviter,
  close time, candidate snapshots, selection limit, Pass, and one suggestion.
  It never shows prices, budget, dietary notes, private Recipes, who picked
  what, or winner language. Organizer finalization chooses final entries.
- [ ] **Step 3: Run and commit.**

```bash
npx jest src/capabilities/meal-planning/screens --runInBand
git add src/capabilities/meal-planning/screens
git commit -m "feat: let the family choose meals privately"
```

### Task 6: Deliver exact Shared Home and notification invitations

**Files:** `mealPlanningDelivery.ts`, Deno test, Shared Home, NotificationService

- [ ] **Step 1: Write tests** for one idempotent delivery per participant,
  ineligible denial, neutral copy, opaque round-id payload, exact destination,
  settlement on response/close/removal, and no repeated pressure notification.
- [ ] **Step 2: Emit after round commit** with event
  `meal_choice_round`, expiry `closes_at`, and copy “Help choose the next meals” /
  “Pick what sounds good, pass, or suggest one.”
- [ ] **Step 3: Route push/Home opening through an authoritative refetch.** Closed,
  removed, and unavailable states never show stale candidates.
- [ ] **Step 4: Run and commit.**

```bash
deno test supabase/functions/_shared/__tests__/mealPlanningDelivery_deno_test.ts
npx jest src/services/NotificationService.test.ts src/features/shared-home --runInBand
git add supabase/functions/_shared/mealPlanningDelivery.ts supabase/functions/_shared/__tests__/mealPlanningDelivery_deno_test.ts src/features/shared-home src/services/NotificationService.ts src/services/NotificationService.test.ts
git commit -m "feat: deliver bounded meal choice invitations"
```

### Task 7: Add correct Activity projection and recurrence semantics

**Files:** Meal Planning card provider/test, registry, lifecycle tests

- [ ] **Step 1: Write tests** for the organizer's optional recurring reminder,
  each participant's nonrecurring round invitation, response count, choose/pass,
  closed/disconnected states, viewer reauthorization, and Activity completion or
  deletion not mutating plan/round.
- [ ] **Step 2: Implement the provider.** The recurring organizer card resolves
  the current active cycle. Participant projections are created per round and
  never inherit organizer recurrence.
- [ ] **Step 3: Run and commit.**

```bash
npx jest src/capabilities/meal-planning/activity src/store/useAppStore.lifecycle.test.ts --runInBand
git add src/capabilities/meal-planning/activity src/features/activities/actionCards src/store/useAppStore.lifecycle.test.ts
git commit -m "feat: project meal planning into to-dos safely"
```

### Task 8: Phase completion gate

- [ ] Run Supabase, Jest, Deno, product lint, and `npm run verify:changed -- --run`.
- [ ] Prove organizer and participant paths on two separately authenticated
  signed devices.
- [ ] Prove uninvited, removed, unrelated, stale, offline, expired, and shared-
  Activity-without-source-authority cases.
- [ ] Run three planning cycles across at least two horizon kinds.
- [ ] Do not begin Groceries unless organizers report that the cadence fits and
  family input removes guessing rather than adding negotiation work.

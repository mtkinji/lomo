# Capability-Routed First Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Goals-assuming first install with a resumable capability chooser and deliver **Make meals easier** as the first complete newer-capability path, from illustrated orientation through a real individual-first Meal Plan and progressive Household, Grocery, and Cook handoffs.

**Architecture:** A small capability-onboarding coordinator owns only universal Welcome, chooser selection, checkpoint/resume, and typed native handoffs. Capability contracts remain code-owned and promotion-gated; the existing Arc/Goal questionnaire remains its capability-specific journey, while Food supplies a two-moment illustrated prelude and then teaches on the existing Recipes surface. Meal Plans retain `organizer_person_id` as canonical personal ownership, make Household attachment optional, and gain an explicit attach operation so collaboration can be added later without copying the Plan or silently creating a Household.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, React Navigation, Zustand + AsyncStorage, Jest + React Native Testing Library, Supabase Postgres/RLS/RPC/Realtime, Deno Edge Functions.

---

## Delivery boundaries

- Work in `/Users/andrewwatanabe/Kwilt` on `codex/capability-onboarding-release-readiness`; do not create a worktree.
- Preserve unrelated Chores, rewards, bottom-drawer, token, and agent-code-map changes. Stage only files named by the current task.
- The development rehearsal may contain accepted-reference and development Food paths. The production chooser filters out any path whose `promotionState` is not `production`.
- Do not add disabled, preview, or **Coming soon** chooser rows.
- Do not request notifications globally before the person chooses a path. A capability asks only when its own first value needs them.
- `hasCompletedFirstTimeOnboarding` remains the compatibility signal for old app behavior, but it becomes true when the universal layer is exited; capability completion is tracked separately.
- Existing exact links, invitation payloads, authoritative restores, and returning-user setup bypass the generic Welcome and chooser.
- Individual-first Plans are authoritative Supabase records, not a local-only onboarding draft.

## File structure

### Shared coordinator

- Create `src/features/capability-onboarding/capabilityOnboardingContracts.ts` — typed path contracts, promotion filtering, and handoff definitions.
- Create `src/features/capability-onboarding/capabilityOnboardingContracts.test.ts` — contract completeness and production-filter tests.
- Create `src/features/capability-onboarding/capabilityOnboardingState.ts` — pure checkpoint/resume reducer and normalization.
- Create `src/features/capability-onboarding/capabilityOnboardingState.test.ts` — interruption, completion, and account-isolation tests.
- Create `src/features/capability-onboarding/useCapabilityOnboardingStore.ts` — persisted per-user records and hydration.
- Create `src/features/capability-onboarding/CapabilityOnboardingHost.tsx` — production-shaped full-screen host.
- Create `src/features/capability-onboarding/CapabilityWelcomeScreen.tsx` — one universal illustrated Welcome.
- Create `src/features/capability-onboarding/CapabilityPathChooserScreen.tsx` — complete eligible outcome chooser.
- Create `src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx` — routing, resumption, Look around, and accessibility behavior.
- Create `src/features/capability-onboarding/FEATURE.md` — ownership and brief links.
- Modify `App.tsx` — hydrate/start the coordinator for genuinely new users and preserve return/exact-context bypasses.
- Modify `src/store/useAppStore.ts` and `src/store/useAppStore.lifecycle.test.ts` — account-reset compatibility for coordinator state.
- Modify `src/features/onboarding/FirstTimeUxFlow.tsx` — make the Arc/Goal questionnaire a capability-owned journey with a typed completion callback.
- Modify `src/features/onboarding/ftuePermissionActions.ts` and its test — remove the universal notification step from new coordinated runs while preserving returning-user permission behavior.
- Modify `src/features/dev/DevToolsScreen.tsx` — restart the new coordinator in development.
- Modify `src/services/analytics/events.ts` — chooser/path/checkpoint/first-value event names.

### Individual-first Meal Plans

- Modify `supabase/pending-migrations/20260819181607_individual_first_meal_plans.sql` — nullable Household attachment, personal authority, create/attach RPCs, and policy updates.
- Create `src/capabilities/meal-planning/domain/individualFirstMealPlanMigration.test.ts` — static migration security contract.
- Modify `src/capabilities/meal-planning/data/mealPlanningRepository.ts` and `.test.ts` — nullable `householdId`, personal create, and explicit attach.
- Modify `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx`.
- Create `src/capabilities/meal-planning/screens/MealPlanEditorScreen.test.tsx` — clean-account create regression and existing-Household attach behavior.
- Modify `src/capabilities/meal-planning/screens/NextMealsScreen.tsx` and `.test.ts` — personal Plan presentation and conditional collaboration.
- Modify `src/capabilities/meal-planning/screens/MealChoiceInviteScreen.tsx` — require an explicitly attached Household before opening a member round.
- Modify `supabase/functions/grocery-compile/index.ts` and `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts` — authorize personal-owner draft compilation separately from Household-manager compilation.

### Food capability onboarding

- Create `src/features/household-food/onboarding/foodOnboardingModel.ts` and `.test.ts` — two fixed teaching moments and checkpoints.
- Create `src/features/household-food/onboarding/FoodOnboardingFlow.tsx` and `.test.tsx` — illustrated, manually paced flow.
- Modify `src/features/household-food/FoodNavigator.tsx` — route the onboarding intent into the existing Recipe library.
- Modify `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx` and `.test.tsx` — spotlight a real Recipe card for the onboarding intent without introducing a second picker.
- Modify `src/capabilities/meal-planning/screens/NextMealsScreen.tsx` — emit the Food first-value receipt after the durable Plan loads.
- Modify `src/capabilities/groceries/screens/GroceryListScreen.tsx` and `.test.ts` — one contextual first-use explanation after a Food-origin handoff.
- Modify `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx` and `.test.tsx` — one contextual Cook explanation without replaying onboarding.

### Documentation and verification

- Modify `docs/feature-briefs/capability-routed-onboarding.md` and `docs/feature-briefs/food-capability-onboarding.md` only when implementation evidence changes a claim.
- Modify `docs/design-explorations/food-capability-onboarding/04-readiness-audit.md` with actual proof boundaries.
- Modify `src/features/onboarding/FEATURE.md`, `src/features/guidedOverture/FEATURE.md`, and `src/features/household-food/FEATURE.md` as ownership moves into code.

---

### Task 1: Define the promotion-gated capability onboarding contract

**Files:**
- Create: `src/features/capability-onboarding/capabilityOnboardingContracts.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingContracts.test.ts`
- Create: `src/features/capability-onboarding/FEATURE.md`

- [ ] **Step 1: Write the failing contract tests**

```ts
import {
  CAPABILITY_ONBOARDING_PATHS,
  getCapabilityOnboardingPaths,
} from './capabilityOnboardingContracts';

describe('capability onboarding contracts', () => {
  it('gives every path one owner, terminal owner, archetype, handoff, and first value', () => {
    for (const path of CAPABILITY_ONBOARDING_PATHS) {
      expect(path.id).toMatch(/^[a-z0-9-]+$/);
      expect(path.promise.trim()).not.toBe('');
      expect(path.coordinatorOwnerId.trim()).not.toBe('');
      expect(path.terminalOwnerIds.length).toBeGreaterThan(0);
      expect(path.handoff.kind).toBeTruthy();
      expect(path.firstValue.event).toBeTruthy();
      expect(path.nativeLanding.root).toBeTruthy();
    }
  });

  it('keeps development Food visible in rehearsal but out of production', () => {
    expect(getCapabilityOnboardingPaths('development').map(({ id }) => id))
      .toContain('make-meals-easier');
    expect(getCapabilityOnboardingPaths('production').map(({ id }) => id))
      .not.toContain('make-meals-easier');
  });

  it('contains no disabled or coming-soon presentation state', () => {
    expect(JSON.stringify(CAPABILITY_ONBOARDING_PATHS)).not.toMatch(/disabled|coming soon/i);
  });
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run: `npm test -- --runInBand src/features/capability-onboarding/capabilityOnboardingContracts.test.ts`

Expected: FAIL because `capabilityOnboardingContracts.ts` does not exist.

- [ ] **Step 3: Implement the typed contracts**

```ts
import type { IconName } from '../../ui/Icon';

export type CapabilityOnboardingPathId =
  | 'make-progress'
  | 'capture-todos'
  | 'screen-time-controls'
  | 'make-meals-easier';

export type CapabilityOnboardingPromotionState =
  | 'development'
  | 'production';

export type CapabilityOnboardingHandoff =
  | { kind: 'identity-workflow' }
  | { kind: 'activity-create' }
  | { kind: 'screen-time-setup' }
  | { kind: 'food-meal-loop' };

export type CapabilityOnboardingContract = {
  id: CapabilityOnboardingPathId;
  promise: string;
  supportingCopy: string;
  icon: IconName;
  archetype: 'guided-creation' | 'illustrated-setup';
  coordinatorOwnerId: string;
  terminalOwnerIds: readonly string[];
  promotionState: CapabilityOnboardingPromotionState;
  handoff: CapabilityOnboardingHandoff;
  firstValue: { event: string; evidenceSource: string };
  nativeLanding: { root: string; screen?: string };
};

export const CAPABILITY_ONBOARDING_PATHS = [
  {
    id: 'make-progress',
    promise: 'Make progress on something important',
    supportingCopy: 'Turn one meaningful intention into a Goal you can begin.',
    icon: 'goals',
    archetype: 'guided-creation',
    coordinatorOwnerId: 'onboarding',
    terminalOwnerIds: ['arcs', 'goals'],
    promotionState: 'production',
    handoff: { kind: 'identity-workflow' },
    firstValue: { event: 'goal_created', evidenceSource: 'useAppStore.lastOnboardingGoalId' },
    nativeLanding: { root: 'MainTabs', screen: 'GoalDetail' },
  },
  {
    id: 'capture-todos',
    promise: 'Get a few things out of my head',
    supportingCopy: 'Capture the next things you need to remember.',
    icon: 'checklist',
    archetype: 'guided-creation',
    coordinatorOwnerId: 'onboarding',
    terminalOwnerIds: ['todos'],
    promotionState: 'development',
    handoff: { kind: 'activity-create' },
    firstValue: { event: 'activity_created', evidenceSource: 'activity repository receipt' },
    nativeLanding: { root: 'MainTabs', screen: 'ActivityDetail' },
  },
  {
    id: 'screen-time-controls',
    promise: 'Set up Screen Time controls',
    supportingCopy: 'Choose a boundary and see what will actually be enforced.',
    icon: 'shield',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'screen-time',
    terminalOwnerIds: ['screen-time'],
    promotionState: 'development',
    handoff: { kind: 'screen-time-setup' },
    firstValue: { event: 'screen_time_rule_saved', evidenceSource: 'rule delivery receipt' },
    nativeLanding: { root: 'Settings', screen: 'SettingsScreenTimeProtection' },
  },
  {
    id: 'make-meals-easier',
    promise: 'Make meals easier',
    supportingCopy: 'Choose meals, decide together, build the list, and cook with less juggling.',
    icon: 'chapters',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'household-food',
    terminalOwnerIds: ['meal-planning', 'recipes', 'groceries'],
    promotionState: 'development',
    handoff: { kind: 'food-meal-loop' },
    firstValue: { event: 'meal_plan_created', evidenceSource: 'create_kwilt_meal_plan receipt' },
    nativeLanding: { root: 'Food', screen: 'NextMeals' },
  },
] as const satisfies readonly CapabilityOnboardingContract[];

export function getCapabilityOnboardingPaths(
  surface: 'development' | 'production',
): CapabilityOnboardingContract[] {
  return CAPABILITY_ONBOARDING_PATHS.filter(
    (path) => surface === 'development' || path.promotionState === 'production',
  );
}
```

- [ ] **Step 4: Add the feature manifest**

```md
---
feature: capability-onboarding
status: active
briefs:
  - capability-routed-onboarding
  - food-capability-onboarding
owners:
  - src/features/capability-onboarding/
---

# capability onboarding

Owns universal first-install Welcome, chooser, resumption, and typed handoffs. Capability owners
retain setup, mutation, first-value evidence, and native landing responsibility.
```

- [ ] **Step 5: Run the focused test**

Run: `npm test -- --runInBand src/features/capability-onboarding/capabilityOnboardingContracts.test.ts`

Expected: PASS.

### Task 2: Build a pure resumable coordinator state machine

**Files:**
- Create: `src/features/capability-onboarding/capabilityOnboardingState.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingState.test.ts`

- [ ] **Step 1: Write reducer tests for first launch, selection, interruption, another path, and completion**

```ts
import {
  createCapabilityOnboardingRecord,
  reduceCapabilityOnboarding,
} from './capabilityOnboardingState';

describe('capability onboarding state', () => {
  it('resumes the selected capability without replaying Welcome', () => {
    const selected = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'select-path', pathId: 'make-meals-easier', now: 10,
    });
    const checkpointed = reduceCapabilityOnboarding(selected, {
      type: 'checkpoint', checkpoint: 'food:ingredients', now: 20,
    });
    expect(checkpointed).toMatchObject({
      universalState: 'chosen', selectedPathId: 'make-meals-easier', checkpoint: 'food:ingredients',
    });
  });

  it('can choose another path without deleting the prior capability checkpoint', () => {
    const food = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'select-path', pathId: 'make-meals-easier', now: 10,
    });
    const changed = reduceCapabilityOnboarding(food, {
      type: 'select-path', pathId: 'make-progress', now: 20,
    });
    expect(changed.selectedPathId).toBe('make-progress');
    expect(changed.pathCheckpoints['make-meals-easier']).toBe('selected');
  });

  it('separates leaving universal onboarding from capability first value', () => {
    const chosen = reduceCapabilityOnboarding(createCapabilityOnboardingRecord(), {
      type: 'select-path', pathId: 'make-meals-easier', now: 10,
    });
    const complete = reduceCapabilityOnboarding(chosen, {
      type: 'complete-path', pathId: 'make-meals-easier', receiptId: 'plan-1:v1', now: 20,
    });
    expect(complete.universalState).toBe('chosen');
    expect(complete.completedPaths['make-meals-easier']?.receiptId).toBe('plan-1:v1');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/capability-onboarding/capabilityOnboardingState.test.ts`

Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement the reducer and normalization**

Implement immutable actions `show-chooser`, `select-path`, `checkpoint`, `look-around`, `complete-path`, and `reset`. Store per-path checkpoints so switching paths does not delete native or coordinator progress. Reject unknown schema versions by returning `createCapabilityOnboardingRecord()`.

```ts
export type CapabilityOnboardingRecord = {
  schemaVersion: 1;
  universalState: 'welcome' | 'chooser' | 'chosen' | 'looked-around';
  selectedPathId: CapabilityOnboardingPathId | null;
  checkpoint: string | null;
  pathCheckpoints: Partial<Record<CapabilityOnboardingPathId, string>>;
  completedPaths: Partial<Record<CapabilityOnboardingPathId, { receiptId: string; completedAt: number }>>;
  updatedAt: number | null;
};
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- --runInBand src/features/capability-onboarding/capabilityOnboardingState.test.ts`

Expected: PASS.

### Task 3: Persist coordinator records per authenticated user

**Files:**
- Create: `src/features/capability-onboarding/useCapabilityOnboardingStore.ts`
- Create: `src/features/capability-onboarding/useCapabilityOnboardingStore.test.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/store/useAppStore.lifecycle.test.ts`

- [ ] **Step 1: Write tests that prove hydration and account isolation**

Use mocked AsyncStorage to prove `user-a` and `user-b` receive separate records, rehydration restores the selected Food checkpoint, and resetting app user state clears only the active user's coordinator record.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/capability-onboarding/useCapabilityOnboardingStore.test.ts src/store/useAppStore.lifecycle.test.ts`

Expected: FAIL because the persisted store and reset integration do not exist.

- [ ] **Step 3: Implement the persisted store**

Use Zustand `persist`, AsyncStorage key `kwilt-capability-onboarding-v1`, a `recordsByUserId` map, `hydrated`, and action methods that delegate to the pure reducer. `partialize` only the records map. Never use an email address as a key.

- [ ] **Step 4: Integrate account reset**

Export `resetCapabilityOnboardingForUser(userId)` from the new store and call it from the same account-switch/reset boundary that clears other user-specific local state. Do not reset all users.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --runInBand src/features/capability-onboarding/useCapabilityOnboardingStore.test.ts src/store/useAppStore.lifecycle.test.ts`

Expected: PASS.

### Task 4: Render the universal Welcome and complete chooser in development

**Files:**
- Create: `src/features/capability-onboarding/CapabilityWelcomeScreen.tsx`
- Create: `src/features/capability-onboarding/CapabilityPathChooserScreen.tsx`
- Create: `src/features/capability-onboarding/CapabilityOnboardingHost.tsx`
- Create: `src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx`
- Modify: `src/features/dev/DevToolsScreen.tsx`

- [ ] **Step 1: Write host behavior tests**

Cover one Welcome, all development-eligible rows, no internal capability labels as headings, **Something else**, **Look around**, Back, large-text-safe scrolling, and `accessibilityRole="button"` for every path.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx`

Expected: FAIL because the host is missing.

- [ ] **Step 3: Build the shared full-screen shell**

Reuse `FullScreenInterstitial`, `AppShell`, Kwilt typography/tokens, the existing Welcome illustration, manual buttons, and Reduce Motion behavior. The chooser title is **What would make Kwilt useful today?**. Render every eligible path in one scrollable list; do not add a **More** control.

- [ ] **Step 4: Add development restart entry**

Replace the retired Guided Overture restart entry with **Capability onboarding rehearsal**. Restart only the current user's coordinator record and do not clear Arcs, Goals, Activities, Recipes, Plans, or Groceries.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --runInBand src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx`

Expected: PASS.

### Task 5: Route accepted original onboarding inside the development rehearsal

**Files:**
- Modify: `App.tsx`
- Modify: `src/features/onboarding/FirstTimeUxFlow.tsx`
- Modify: `src/features/onboarding/ftuePermissionActions.ts`
- Modify: `src/features/onboarding/ftuePermissionActions.test.ts`
- Modify: `src/services/analytics/events.ts`
- Create: `src/features/capability-onboarding/capabilityOnboardingRouting.test.ts`

- [ ] **Step 1: Write routing-policy tests**

Prove development rehearsal enters the coordinator, normal clean-account launch remains on current FTUE while the release stage is `development-rehearsal`, returning users retain `ReturningUserPermissionsFlow`, exact pending context bypasses the coordinator at every stage, selecting **Make progress** starts the existing question workflow without replaying Welcome/notifications/path, and **Look around** marks only universal onboarding complete. Also prove production entry is impossible until both `make-progress` and `make-meals-easier` are production-promoted.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/capability-onboarding/capabilityOnboardingRouting.test.ts src/features/onboarding/ftuePermissionActions.test.ts`

Expected: FAIL on the new coordinator routing expectations.

- [ ] **Step 3: Separate the original capability journey from global setup**

Add `entryMode: 'legacy-first-run' | 'capability-path'` and `onCapabilityComplete(receipt)` props to `FirstTimeUxFlow`. In `capability-path` mode, begin directly at the workflow, keep the existing questionnaire and native Arc/Goal landing, and emit `{ pathId: 'make-progress', receiptId: goalId }` after the real Goal exists. Developer Tools supplies this mode from the selected coordinator record; ordinary first launch continues using `legacy-first-run` until Task 14 promotes the complete system.

- [ ] **Step 4: Add a release-stage entry policy without switching production yet**

Create a pure entry policy with `development-rehearsal` and `production` stages. At the current development stage, only Developer Tools opens the coordinator and ordinary first launch remains current FTUE. The production branch may render the coordinator only for a signed-in, non-returning, incomplete new account with no exact pending context, after both auth and coordinator hydration resolve. Do not flip the stage constant in this task.

- [ ] **Step 5: Add analytics**

Add `capability_onboarding_started`, `capability_onboarding_path_selected`, `capability_onboarding_resumed`, `capability_onboarding_path_completed`, and `capability_onboarding_looked_around`. Include stable path IDs and checkpoint names, never free-form answers.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --runInBand src/features/capability-onboarding src/features/onboarding/ftuePermissionActions.test.ts`

Expected: PASS.

### Task 6: Make Meal Plan ownership individual-first in Supabase

**Files:**
- Modify: `supabase/pending-migrations/20260819181607_individual_first_meal_plans.sql`
- Create: `src/capabilities/meal-planning/domain/individualFirstMealPlanMigration.test.ts`

- [ ] **Step 1: Review current Supabase guidance before SQL implementation**

Read `https://supabase.com/changelog.md`, current RLS documentation, and current database-function security documentation. Record only task-relevant breaking changes in the implementation notes.

- [ ] **Step 2: Write the failing static migration contract**

Assert that the migration makes `household_id` and `organizer_membership_id` nullable; keeps `organizer_person_id` non-null; rewrites `kwilt_is_meal_plan_organizer` around `kwilt_current_person_id()`; lets the existing `create_kwilt_meal_plan` signature accept an explicit null `p_household_id`; defines `attach_kwilt_meal_plan_to_household`; checks owner/caregiver membership before attachment; revokes public/anon execution; grants authenticated execution; and never creates a Household.

- [ ] **Step 3: Run and verify failure**

Run: `npm test -- --runInBand src/capabilities/meal-planning/domain/individualFirstMealPlanMigration.test.ts`

Expected: FAIL because the reserved migration is empty.

- [ ] **Step 4: Implement the migration**

The migration must:

```sql
alter table public.kwilt_meal_plans
  alter column household_id drop not null,
  alter column organizer_membership_id drop not null;

create or replace function public.kwilt_is_meal_plan_organizer(p_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1
    from public.kwilt_meal_plans plan
    where plan.id = p_plan_id
      and plan.organizer_person_id = public.kwilt_current_person_id()
      and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
  )
$$;
```

Replace `create_kwilt_meal_plan` with an optional `p_household_id`. Resolve `v_person := public.kwilt_current_person_id()` first. If Household is null, insert null attachment columns. If Household is supplied, require an active owner/caregiver membership belonging to `v_person`. In both cases call `kwilt_replace_meal_candidates` with `v_person`.

Add `attach_kwilt_meal_plan_to_household(p_plan_id, p_expected_version, p_household_id)` that locks the Plan, requires personal ownership and draft state, rejects a different existing attachment, requires owner/caregiver membership, rejects another active draft for that Household, sets Household/membership, increments version, and returns the authoritative receipt.

Explicitly revoke function execution from `public, anon`, grant it to `authenticated`, and preserve RLS on every exposed table.

- [ ] **Step 5: Run static contract and local database verification**

Run: `npm test -- --runInBand src/capabilities/meal-planning/domain/individualFirstMealPlanMigration.test.ts`

Then use the CLI help to discover the supported local reset/test command, apply migrations to the local database, and execute SQL cases for owner read/update, cross-user denial, optional Household creation, successful explicit attachment, duplicate-household-draft rejection, and anonymous denial.

Expected: all cases pass; no advisor security errors are introduced.

### Task 7: Expose personal create and explicit Household attachment in the repository

**Files:**
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.ts`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`

- [ ] **Step 1: Update failing repository expectations**

Expect `MealPlanProjection.householdId` to be `string | null`, `create({ horizon, candidates })` to send `p_household_id: null`, optional `create({ householdId, ... })` to preserve the explicit Household path, and `attachToHousehold` to invoke the new RPC with plan/version/Household IDs.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`

Expected: FAIL on the new signature and RPC.

- [ ] **Step 3: Implement the repository contract**

```ts
create(input: {
  householdId?: string | null;
  horizon: MealPlanHorizon;
  candidates: MealPlanCandidateDraft[];
}) {
  return rpc(client, 'create_kwilt_meal_plan', {
    p_household_id: input.householdId ?? null,
    p_horizon: validateMealPlanHorizon(input.horizon),
    p_candidate_snapshots: input.candidates,
  });
},
attachToHousehold(input: { planId: string; expectedVersion: number; householdId: string }) {
  return rpc(client, 'attach_kwilt_meal_plan_to_household', {
    p_plan_id: input.planId,
    p_expected_version: input.expectedVersion,
    p_household_id: input.householdId,
  });
},
```

Map absent `household_id` to `null` and preserve existing projections.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --runInBand src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`

Expected: PASS.

### Task 8: Let a clean account save and reopen a real personal Plan

**Files:**
- Modify: `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx`
- Create: `src/capabilities/meal-planning/screens/MealPlanEditorScreen.test.tsx`
- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.test.ts`
- Modify: `src/capabilities/meal-planning/screens/MealChoiceInviteScreen.tsx`

- [ ] **Step 1: Write the clean-account regression first**

Render Meal Plan Editor with recipes and `getHouseholdSnapshot` returning no Household. Select one meal and Save. Expect `repository.create` without a Household ID, navigation to `NextMeals`, and no **Set up your Household** error.

- [ ] **Step 2: Run and verify the regression fails**

Run: `npm test -- --runInBand src/capabilities/meal-planning/screens/MealPlanEditorScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.ts`

Expected: FAIL because the editor currently requires Household setup.

- [ ] **Step 3: Remove the Household create gate**

Save a new Plan with personal ownership by default. Supply `householdId` only when the route explicitly carries an already-authorized Household planning context. Keep existing edits on the existing Plan ID.

- [ ] **Step 4: Make collaboration conditional in Next Meals**

Show **Ask the family** only when `plan.householdId` exists. For a personal Plan, show a secondary **Share this plan** action that resolves an existing Household, explains the attachment, calls `attachToHousehold`, reloads the Plan, and then offers participant selection. Never create an empty Household from this action.

- [ ] **Step 5: Guard invite routing**

If an unattached personal Plan reaches `MealChoiceInviteScreen`, show a finite explanation and return to Next Meals; never call `openRound` with no Household.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --runInBand src/capabilities/meal-planning/screens/MealPlanEditorScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.ts src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`

Expected: PASS.

### Task 9: Build the two-moment Food walkthrough

**Files:**
- Create: `src/features/household-food/onboarding/foodOnboardingModel.ts`
- Create: `src/features/household-food/onboarding/foodOnboardingModel.test.ts`
- Create: `src/features/household-food/onboarding/FoodOnboardingFlow.tsx`
- Create: `src/features/household-food/onboarding/FoodOnboardingFlow.test.tsx`

- [ ] **Step 1: Write model and rendered-flow tests**

Assert the exact ordered concepts `choose-together` and `follow-through`; conditional Household language; manual Back/Next; final CTA **Browse recipes**; no questionnaire, autoplay, permission prompt, or internal capability submenu; and equivalent Reduce Motion behavior.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/household-food/onboarding`

Expected: FAIL because the Food flow is missing.

- [ ] **Step 3: Implement the fixed model**

Use the accepted copy from `docs/design-explorations/food-capability-onboarding/03-converge.md`:

1. **Find meals everyone can get behind.**
2. **Plan it. Shop it. Cook it.**

- [ ] **Step 4: Implement the shared illustrated presentation**

Use `FullScreenInterstitial`, one semantic illustration slot, a quiet two-step indicator, Back, Next, **Browse recipes**, and **Choose another path**. Audit existing assets before adding any image. If no existing image truthfully communicates a required moment, leave the semantic slot using composed existing icons during development and record the asset gap; do not generate art during this task.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --runInBand src/features/household-food/onboarding`

Expected: PASS.

### Task 10: Connect Food onboarding to the existing Recipe library

**Files:**
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx`
- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingHost.tsx`

- [ ] **Step 1: Write the vertical-slice test**

Select **Make meals easier**, advance through two moments, and assert that **Browse recipes** opens `RecipeLibrary` with a contextual intent targeting one real Recipe card.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/features/household-food/onboarding src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.ts`

Expected: FAIL because the native handoff is missing.

- [ ] **Step 3: Add Food navigation routes**

Add an optional `onboarding: 'pick-meal'` intent to the existing `RecipeLibrary` route. It does not accept a Household ID from untrusted presentation state.

- [ ] **Step 4: Guide selection on the real catalog**

Reuse `RecipeLibraryView`, its real Recipe cards, ordinary capture action, and the shared `Coachmark`. Do not introduce a reduced catalog or onboarding-owned picker.

- [ ] **Step 5: Complete only from an authoritative receipt**

Merely reaching the catalog or opening a Recipe does not complete the path. Completion still requires a later authoritative capability receipt.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --runInBand src/features/household-food/onboarding src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.ts`

Expected: PASS.

### Task 11: Preserve progressive Household voting and shared ingredient value

**Files:**
- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealChoiceInviteScreen.tsx`
- Modify: `supabase/functions/grocery-compile/index.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.test.ts`

- [ ] **Step 1: Add failing personal and attached-Plan compilation tests**

Prove a personal owner can send selected draft Recipe candidates to Groceries; a different person cannot; an attached Household Plan still requires an owner/caregiver role; provenance and quantities remain intact; and ordinary list additions remain distinct from Recipe sources.

- [ ] **Step 2: Run focused Node/Deno tests and verify failure**

Run the repository's documented Deno command for `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts` and Jest for `GroceryListScreen.test.ts`.

Expected: the personal draft action fails the current Household-membership check.

- [ ] **Step 3: Split authority by Plan attachment**

In `grocery-compile`, select `organizer_person_id` with `household_id`. For `household_id === null`, require `organizer_person_id === binding.person_id` and pass a personal-owner authority marker to the compiler/RPC. For an attached Plan, retain the active owner/caregiver membership check. Do not treat a null Household as an empty-role Household.

- [ ] **Step 4: Land in the usable shared list**

After successful compilation, open `GroceryList` using the authoritative list receipt. Show one dismissible contextual explanation that Recipe ingredients were brought together and people with explicit list access can add ordinary items. Do not replay the two Food screens.

- [ ] **Step 5: Run focused tests**

Run the focused Deno compiler test and `npm test -- --runInBand src/capabilities/groceries/screens/GroceryListScreen.test.ts src/capabilities/meal-planning`.

Expected: PASS.

### Task 12: Preserve Cook Mode as the last progressive stage

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx`
- Modify: `src/capabilities/recipes/data/cookModeEducationCache.ts`
- Modify: `src/capabilities/recipes/data/cookModeEducationCache.test.ts`

- [ ] **Step 1: Write contextual education and resume tests**

Assert the first planned-Recipe Cook entry explains touch-first cues and exact resumption once; later entries skip it; interruption restores the same Recipe/cue; and Food onboarding is never replayed.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --runInBand src/capabilities/recipes/screens/RecipeReadinessScreen.test.tsx src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx src/capabilities/recipes/data/cookModeEducationCache.test.ts`

Expected: FAIL only on the new Food-origin education contract.

- [ ] **Step 3: Extend the existing education cache**

Add a versioned `foodMealLoopCookSeen` flag scoped to the authenticated person. Preserve current Cook education state and exact session restoration. Do not add voice, background listening, or notification claims.

- [ ] **Step 4: Run focused tests**

Run the same Jest command.

Expected: PASS.

### Task 13: Prove bypass, resumption, and recovery behavior

**Files:**
- Modify: `src/features/capability-onboarding/capabilityOnboardingState.test.ts`
- Modify: `src/features/capability-onboarding/CapabilityOnboardingHost.test.tsx`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`

- [ ] **Step 1: Add end-to-end policy cases**

Cover exact Recipe share, Plan invite, Grocery handoff, Cook resume, returning user, interrupted Food walkthrough, interrupted meal selection, failed network save, choosing another path, and Look around. Every exact context must bypass global Welcome; every failed mutation must remain resumable and incomplete.

- [ ] **Step 2: Run and verify any missing behavior fails**

Run: `npm test -- --runInBand src/features/capability-onboarding src/navigation/linkingConfig.test.ts src/navigation/navigationPersistence.test.ts`

- [ ] **Step 3: Implement only the missing finite recovery transitions**

Do not delete native drafts when switching paths. On relaunch with a checkpoint offer **Continue where I left off**, **Choose something else**, and **Look around Kwilt**. Use exact object IDs only after repository revalidation.

- [ ] **Step 4: Run focused tests**

Run the same Jest command.

Expected: PASS.

### Task 14: Complete lifecycle verification and update readiness truth

**Files:**
- Modify: `docs/design-explorations/food-capability-onboarding/04-readiness-audit.md`
- Modify: `docs/feature-briefs/capability-routed-onboarding.md`
- Modify: `docs/feature-briefs/food-capability-onboarding.md`
- Modify: `src/features/onboarding/FEATURE.md`
- Modify: `src/features/guidedOverture/FEATURE.md`
- Modify: `src/features/household-food/FEATURE.md`

- [ ] **Step 1: Run focused suites once more after the final code change**

Run the coordinator, onboarding, Meal Planning, Recipe, Grocery, and Cook focused commands from Tasks 1–13.

Expected: PASS.

- [ ] **Step 2: Run Tier 2 verification once**

Run: `npm run verify:changed -- --run`

Expected: app and test typechecks, related Jest, product lint, architecture lint, and relevant Supabase checks pass. Run it again only if it fails, the result is incomplete, the diff changes, or the integration base changes; state the reason.

- [ ] **Step 3: Perform rendered Simulator acceptance**

From this checkout and branch, record commit/dirty state, Metro path/port, build/install provenance, and Simulator model/OS. Verify clean first launch, Welcome, complete chooser, Arc/Goal handoff, Food normal text, large text, VoiceOver order, Reduce Motion, interruption/relaunch, personal Plan creation, existing-Household attach/vote, ingredient list, and Cook resume. Andrew's hierarchy and experiential acceptance remains required.

- [ ] **Step 4: Keep higher lifecycle proof separate**

Run authenticated backend and signed-device checks for Household authority, Screen Time if promoted, background/resume behavior, and real notifications. Then record TestFlight and production proof independently. Do not infer any of these from Jest or Simulator.

- [ ] **Step 5: Promote atomically and update documentation to actual evidence**

Change Food's `promotionState` to `production` only after every readiness gate and required lifecycle proof passes. Then flip the entry-policy stage from `development-rehearsal` to `production` in the same reviewed release slice. Keep incomplete paths absent from the production chooser and update the Food audit with exact passed, blocked, and untested boundaries.

- [ ] **Step 6: Reconcile the durable Kwilt Activity**

Update **Build capability-routed first-install onboarding** with completed major deliverables and proof. Mark it done only after implementation and verification are genuinely complete; otherwise leave the remaining major steps planned with concise blockers.

---

## Self-review

- **Spec coverage:** Universal unknown-intent first launch, all-eligible chooser, original questionnaire preservation, Food's single connected meal loop, individual-first Plan, optional Household participation, voting, ingredients, Cook Mode, exact-context bypass, resumption, accessibility, promotion filtering, and lifecycle proof each map to a task.
- **No hidden second Food chooser:** Food always moves from two illustrated moments to contextual guidance on the real Recipe library.
- **Authority consistency:** `organizer_person_id` stays canonical; Household IDs are optional attachment, not ownership. Personal and Household Grocery compilation have separate explicit authority checks.
- **Completion consistency:** Universal exit and capability first value are distinct. Food completion requires a verified Plan receipt and native landing.
- **Release consistency:** Development rehearsal is allowed; production includes only `promotionState: 'production'` contracts.
- **Dirty-worktree safety:** Every task names exact paths and forbids broad staging.

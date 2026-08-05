# Household Food Phase 0: Foundation and Feasibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish capability boundaries, a safe Activity action-card host, a feature-gated Food shell, and reproducible Instacart, Kroger, and recipe-import feasibility evidence before product code depends on external providers.

**Architecture:** Add a typed provider registry and constrained host to Activity detail, first proving parity by adapting the existing Screen Time opportunity. Add inactive Recipes, Meal Planning, and Groceries capability manifests behind one `food-loop-v1` menu destination. Keep provider feasibility in explicit scripts that emit redacted evidence artifacts and never enter runtime bundles.

**Tech Stack:** TypeScript, React Native, Zustand, React Navigation, PostHog feature flags, Jest/RNTL, Node scripts, Supabase Edge Functions, Instacart Developer Platform, and Kroger Public APIs.

---

## Scope and file map

Create:

- `src/features/activities/actionCards/activityActionCardTypes.ts`
- `src/features/activities/actionCards/activityActionCardPolicy.ts`
- `src/features/activities/actionCards/activityActionCardPolicy.test.ts`
- `src/features/activities/actionCards/activityActionCardRegistry.ts`
- `src/features/activities/actionCards/activityActionCardRegistry.test.ts`
- `src/features/activities/actionCards/useActivityActionCard.ts`
- `src/features/activities/actionCards/ActivityActionCard.tsx`
- `src/features/activities/actionCards/ActivityActionCard.test.tsx`
- `src/features/activities/actionCards/screenTimeActivityCardProvider.ts`
- `src/features/activities/actionCards/screenTimeActivityCardProvider.test.ts`
- `src/capabilities/recipes/FEATURE.md`
- `src/capabilities/meal-planning/FEATURE.md`
- `src/capabilities/groceries/FEATURE.md`
- `scripts/food-provider-feasibility.mjs`
- `scripts/food-recipe-import-corpus.mjs`
- `docs/delivery-evidence/food/feasibility/README.md`

Modify:

- `src/domain/types.ts` — add durable opaque source and card bindings.
- `src/domain/normalizeActivity.ts` and its tests — strip malformed or oversized bindings.
- `src/features/activities/ActivityDetailScreen.tsx` — render the flagged host.
- `src/features/activities/FEATURE.md` — record the host contract.
- `src/capabilities/types.ts` and `src/capabilities/registry.ts` — add the gated Food destination without three top-level rows.
- `src/navigation/CapabilityMenu.tsx`, `src/navigation/CapabilityMenu.test.tsx`, and `src/navigation/RootNavigator.tsx` — route the Food shell.
- `src/services/analytics/events.ts` — safe host lifecycle events.
- `package.json` — reproducible feasibility commands.

Leave unchanged:

- Activity list rows; source badges begin in detail only.
- Existing Activity completion, recurrence, notification, and next-action dock semantics.
- Gmail and retailer production OAuth.
- Recipe, MealPlan, and Grocery persistence; those begin in later phases.

### Task 1: Define and normalize the Activity projection envelope

**Files:** `src/domain/types.ts`, `src/features/activities/actionCards/activityActionCardTypes.ts`, `src/features/activities/actionCards/activityActionCardPolicy.ts`, `src/features/activities/actionCards/activityActionCardPolicy.test.ts`, `src/domain/normalizeActivity.ts`, `src/domain/normalizeActivity.test.ts`

- [ ] **Step 1: Write failing policy and normalization tests**

Cover: one binding, at most three passive references, 240-character evidence,
opaque refs capped at 512 characters, unknown provider retained as unavailable,
arbitrary action payload removed, and existing Activities unchanged.

```ts
expect(normalizeActivityContext({
  sourceReferences: Array.from({ length: 5 }, (_, index) => ({
    id: `s-${index}`,
    providerId: 'meal_planning',
    resourceKind: 'choice_round',
    resourceRef: `round-${index}`,
    capturedAt: '2026-08-05T12:00:00.000Z',
    snapshot: { providerLabel: 'Meal Planning', reason: 'x'.repeat(300) },
  })),
  actionCardBinding: {
    providerId: 'meal_planning', projectionKind: 'choice_round',
    resourceRef: 'round-1', sourceVersion: '4', action: { url: 'bad' },
  },
})).toEqual({
  sourceReferences: expect.arrayContaining([expect.objectContaining({ id: 's-0' })]),
  actionCardBinding: {
    providerId: 'meal_planning', projectionKind: 'choice_round',
    resourceRef: 'round-1', sourceVersion: '4',
  },
});
expect(normalizeActivityContext(input).sourceReferences).toHaveLength(3);
expect(normalizeActivityContext(input).sourceReferences[0].snapshot.reason).toHaveLength(240);
```

- [ ] **Step 2: Run the focused tests and verify failure**

```bash
npx jest src/features/activities/actionCards/activityActionCardPolicy.test.ts src/domain/normalizeActivity.test.ts --runInBand
```

Expected: FAIL because the new contracts and normalizer do not exist.

- [ ] **Step 3: Add the closed contracts**

```ts
export type ActivityActionCardProviderId =
  | 'screen_time'
  | 'meal_planning'
  | 'groceries'
  | 'gmail';

export type ActivitySourceReference = {
  id: string;
  providerId: ActivityActionCardProviderId;
  resourceKind: string;
  resourceRef: string;
  capturedAt: string;
  snapshot: {
    providerLabel: string;
    sourceLabel?: string | null;
    reason: string;
    occurredAt?: string | null;
  };
};

export type ActivityActionCardBinding = {
  providerId: ActivityActionCardProviderId;
  projectionKind: string;
  resourceRef: string;
  sourceVersion: string | null;
};
```

Add `sourceReferences?: ActivitySourceReference[]` and
`actionCardBinding?: ActivityActionCardBinding | null` to `Activity`. Implement
`normalizeActivityContext` with explicit string trimming and caps, then call it
from `normalizeActivity` without mutating Activities that have neither field.

- [ ] **Step 4: Run tests**

Expected: both suites PASS and existing normalization snapshots remain stable.

- [ ] **Step 5: Commit the envelope only**

```bash
git add src/domain/types.ts src/domain/normalizeActivity.ts src/domain/normalizeActivity.test.ts src/features/activities/actionCards/activityActionCardTypes.ts src/features/activities/actionCards/activityActionCardPolicy.ts src/features/activities/actionCards/activityActionCardPolicy.test.ts
git commit -m "feat: add bounded activity context bindings"
```

### Task 2: Build a finite provider registry and invocation policy

**Files:** `activityActionCardTypes.ts`, `activityActionCardRegistry.ts`, `activityActionCardRegistry.test.ts`

- [ ] **Step 1: Write failing registry tests**

Prove duplicate provider IDs throw, unknown providers resolve to `unavailable`,
provider actions require a listed action id, and two invocations with the same
idempotency key return one receipt.

```ts
await expect(registry.invoke(binding, 'hidden_action', context))
  .resolves.toEqual(expect.objectContaining({ outcome: 'rejected', code: 'action_not_offered' }));
```

- [ ] **Step 2: Run the test and verify failure**

```bash
npx jest src/features/activities/actionCards/activityActionCardRegistry.test.ts --runInBand
```

- [ ] **Step 3: Implement the provider contract and registry**

```ts
export type ActivityActionCardProjection = {
  providerId: ActivityActionCardProviderId;
  projectionKind: string;
  state: 'ready' | 'completed' | 'stale' | 'disconnected' | 'unauthorized' | 'unavailable' | 'failed';
  eyebrow: string;
  title: string;
  detail: string | null;
  freshnessLabel: string | null;
  primaryAction: ActivityCardAction | null;
  secondaryAction: ActivityCardAction | null;
};

export interface ActivityActionCardProvider {
  readonly id: ActivityActionCardProviderId;
  resolve(binding: ActivityActionCardBinding, context: ActivityCardViewerContext): Promise<ActivityActionCardProjection>;
  invoke(input: ActivityCardInvokeInput): Promise<ActivityCardReceipt>;
}
```

The registry owns the provider map, validates that `actionId` is in the latest
resolved projection, and passes a generated UUID idempotency key to `invoke`.
Providers never receive navigation objects or raw analytics clients.

- [ ] **Step 4: Run the registry tests**

Expected: PASS for ready, unknown, rejection, and idempotent invocation cases.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/actionCards/activityActionCardTypes.ts src/features/activities/actionCards/activityActionCardRegistry.ts src/features/activities/actionCards/activityActionCardRegistry.test.ts
git commit -m "feat: register capability-owned activity cards"
```

### Task 3: Render one constrained card in Activity detail

**Files:** `useActivityActionCard.ts`, `ActivityActionCard.tsx`, `ActivityActionCard.test.tsx`, `ActivityDetailScreen.tsx`, `src/services/analytics/events.ts`

- [ ] **Step 1: Write component tests**

Cover ready, loading, disconnected, unauthorized, stale, failed/retry, completed,
primary action, secondary action, double-tap suppression, screen-reader labels,
and the absence of a binding.

```tsx
const { getByRole, queryByText } = render(
  <ActivityActionCard projection={readyProjection} invoking={false} onInvoke={invoke} />,
);
fireEvent.press(getByRole('button', { name: 'Choose meals' }));
expect(invoke).toHaveBeenCalledWith('choose_meals');
expect(queryByText(/resourceRef/i)).toBeNull();
```

- [ ] **Step 2: Run and verify failure**

```bash
npx jest src/features/activities/actionCards/ActivityActionCard.test.tsx --runInBand
```

- [ ] **Step 3: Implement the hook and host**

`useActivityActionCard` resolves on binding/viewer changes, cancels stale
promises, exposes one retry, and holds invocation disabled until the receipt
returns. `ActivityActionCard` uses only Kwilt-owned `Text`, `View`, `Pressable`,
`Icon`, and existing card tokens. Insert it below Activity identity/context and
above editable notes/steps; do not replace `ActivityNextActionDock`.

Gate only the renderer with:

```ts
const actionCardsEnabled = useFeatureFlag('activity-context-action-v1', __DEV__);
const actionCard = useActivityActionCard(actionCardsEnabled ? activity?.actionCardBinding : null);
```

Add safe events `ActivityContextCardViewed`, `ActivityContextCardActionInvoked`,
and `ActivityContextCardOutcome`. Properties are limited to provider,
projection kind, state, action id, outcome, and latency bucket.

- [ ] **Step 4: Run focused and Activity detail tests**

```bash
npx jest src/features/activities/actionCards/ActivityActionCard.test.tsx src/features/activities/ActivityDetailScreen.stepScreenTime.test.ts --runInBand
```

Expected: PASS with no changes to the next-action dock snapshots.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/actionCards/useActivityActionCard.ts src/features/activities/actionCards/ActivityActionCard.tsx src/features/activities/actionCards/ActivityActionCard.test.tsx src/features/activities/ActivityDetailScreen.tsx src/services/analytics/events.ts
git commit -m "feat: host capability action cards in to-dos"
```

### Task 4: Prove the provider boundary with existing Screen Time behavior

**Files:** `screenTimeActivityCardProvider.ts`, `screenTimeActivityCardProvider.test.ts`, `ActivityDetailScreen.tsx`

- [ ] **Step 1: Write parity tests**

Use the existing Focus setup eligibility inputs and assert the provider returns
the same copy, `set_up`/`not_now` actions, exact Screen Time settings return
target, and dismissal state as the bespoke opportunity.

- [ ] **Step 2: Run and verify failure**

```bash
npx jest src/features/activities/actionCards/screenTimeActivityCardProvider.test.ts --runInBand
```

- [ ] **Step 3: Implement the adapter**

Move only eligibility/presentation/action mapping into the provider. Reuse the
existing Screen Time store and navigation destination. Do not migrate the Focus
drawer's layout until signed Simulator parity is proven. Behind the feature
flag, Activity detail uses the provider; flag-off behavior remains unchanged.

- [ ] **Step 4: Run parity tests and inspect both flag states in Simulator**

Record screenshots and VoiceOver labels for flag off/on. The source checkout,
branch, commit, Metro port, installed binary, and dirty state must accompany the
runtime evidence.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/actionCards/screenTimeActivityCardProvider.ts src/features/activities/actionCards/screenTimeActivityCardProvider.test.ts src/features/activities/ActivityDetailScreen.tsx
git commit -m "refactor: project screen time through activity cards"
```

### Task 5: Add the gated Food shell and capability manifests

**Files:** `src/capabilities/{recipes,meal-planning,groceries}/FEATURE.md`, `src/capabilities/types.ts`, `src/capabilities/registry.ts`, `src/navigation/CapabilityMenu.tsx`, `src/navigation/CapabilityMenu.test.tsx`, `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write registry and menu tests**

Assert one `food` destination appears only with `food-loop-v1`; there are not
three global rows; the destination opens Recipes when no active plan/list
exists; and capability ownership remains three manifests.

- [ ] **Step 2: Run and verify failure**

```bash
npx jest src/capabilities/registry.test.ts src/navigation/CapabilityMenu.test.tsx --runInBand
```

- [ ] **Step 3: Add manifests and inactive shell route**

The Recipes, Meal Planning, and Groceries manifests name the brief, authority,
records, and exclusions. Register `food` as one grouped destination. Its route
renders a finite disabled/coming-next state until Phase 1 supplies Recipes; it
must not advertise importing, planning, shopping, or savings as available.

- [ ] **Step 4: Run tests and product lint**

```bash
npx jest src/capabilities/registry.test.ts src/navigation/CapabilityMenu.test.tsx --runInBand
npm run product:lint
```

- [ ] **Step 5: Commit**

```bash
git add src/capabilities/recipes/FEATURE.md src/capabilities/meal-planning/FEATURE.md src/capabilities/groceries/FEATURE.md src/capabilities/types.ts src/capabilities/registry.ts src/navigation/CapabilityMenu.tsx src/navigation/CapabilityMenu.test.tsx src/navigation/RootNavigator.tsx
git commit -m "feat: register the household food capabilities"
```

### Task 6: Make external feasibility reproducible and redacted

**Files:** `scripts/food-provider-feasibility.mjs`, `scripts/food-recipe-import-corpus.mjs`, `package.json`, `docs/delivery-evidence/food/feasibility/README.md`

- [ ] **Step 1: Add fixture-driven script tests**

The scripts accept `--fixture-dir` and emit JSON containing provider, operation,
status, counts, latency, capability flags, and redacted error class. Tests must
assert no key, token, URL query, product name, ingredient, or recipe body appears.

- [ ] **Step 2: Implement commands**

```json
{
  "food:feasibility": "node scripts/food-provider-feasibility.mjs",
  "food:import-corpus": "node scripts/food-recipe-import-corpus.mjs"
}
```

Supported provider cases are `instacart-list-link`, `instacart-nearby-retailers`,
`kroger-locations`, `kroger-products`, `kroger-cart-add`, and
`recipe-jsonld-import`. Live mode refuses to run without the exact provider env
variables and writes only to a caller-supplied output file under
`docs/delivery-evidence/food/feasibility/`.

- [ ] **Step 3: Run fixture mode**

```bash
npm run food:feasibility -- --fixture-dir scripts/fixtures/food-providers --output /tmp/kwilt-food-feasibility.json
npm run food:import-corpus -- --fixture-dir scripts/fixtures/recipe-import --output /tmp/kwilt-food-import.json
```

Expected: exit 0, deterministic redacted summaries, and no credential-like
strings under a secret-pattern scan.

- [ ] **Step 4: Run live proof only when credentials are supplied**

Record `proceed`, `plain_handoff_only`, or `blocked_by_access` for each provider.
Do not manufacture a passing artifact when credentials or approval are absent.

- [ ] **Step 5: Commit scripts and non-secret fixture evidence**

```bash
git add package.json scripts/food-provider-feasibility.mjs scripts/food-recipe-import-corpus.mjs scripts/fixtures/food-providers scripts/fixtures/recipe-import docs/delivery-evidence/food/feasibility/README.md
git commit -m "test: make food provider feasibility reproducible"
```

### Task 7: Phase completion gate

- [ ] Run `npm run verify:changed -- --run`.
- [ ] Run `npm run product:lint`.
- [ ] Prove Screen Time flag-off/flag-on parity in the owning Simulator runtime.
- [ ] Record provider feasibility truth without treating missing credentials as
  product failure.
- [ ] Do not start Recipe persistence until the Activity host is finite,
  provider failures degrade safely, and the Food shell makes no false claims.

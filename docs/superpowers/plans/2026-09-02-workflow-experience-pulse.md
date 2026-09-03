# Workflow Experience Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task in the current checkout. Do not create a worktree or dispatch subagents unless Andrew explicitly authorizes parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed, low-frequency contextual feedback utility that measures Satisfaction, Ease, or Clarity after five registered Money, Meals, and Screen Time moments while keeping behavioral outcomes authoritative and storing response data only in PostHog.

**Architecture:** A shared `workflow-feedback` feature owns a typed registry, pure suppression policy, identity-scoped AsyncStorage repository, ephemeral request bus, provider, standalone `BottomGuide`, and reusable inline question renderer. Capability callers publish only registered prompt IDs at stable moments. The provider arbitrates the first visible question, generates an opaque presentation ID, records bounded analytics, and never persists a response locally.

**Tech Stack:** React Native / Expo 54, TypeScript, React Context, AsyncStorage, PostHog React Native, Jest / React Native Testing Library, React Navigation, canonical Kwilt `BottomGuide` and `BottomDrawer` components.

**Source of truth:** [`docs/feature-briefs/workflow-experience-pulse.md`](../../feature-briefs/workflow-experience-pulse.md) and [`docs/design-explorations/outcome-happiness-pulse/05-evaluate-learning.md`](../../design-explorations/outcome-happiness-pulse/05-evaluate-learning.md).

**Shared-checkout constraint:** The checkout already contains unrelated work. Re-read every target file immediately before editing, stage only the named files if Andrew later requests a commit, and do not claim full-checkout verification if concurrent changes alter the diff.

---

## File map

Create under `src/features/workflow-feedback/`:

- `workflowFeedbackRegistry.ts` — prompt IDs, question copy, category scales, reasons, analytics dimensions, and registry lookup.
- `workflowFeedbackRegistry.test.ts` — completeness, uniqueness, bounded metadata, and exact pilot definitions.
- `workflowFeedbackPolicy.ts` — pure encounter, cooldown, unresolved-exposure, and session eligibility decisions.
- `workflowFeedbackPolicy.test.ts` — deterministic boundary tests with fixed timestamps.
- `workflowFeedbackStorage.ts` — versioned identity-scoped AsyncStorage envelope and safe parsing.
- `workflowFeedbackStorage.test.ts` — authenticated/anonymous isolation, corruption, and privacy tests.
- `workflowFeedbackRuntime.tsx` — request bus, provider, first-visible-wins arbitration, feature flags, identity hydration, analytics lifecycle, and response actions.
- `workflowFeedbackRuntime.test.tsx` — disabled flags, cancellation, expiry, single-terminal, and Screen Time arbitration tests.
- `WorkflowFeedbackQuestion.tsx` — shared five-choice renderer and optional bounded reason step.
- `WorkflowFeedbackQuestion.test.tsx` — accessible choices, positive close, low/mixed follow-up, Skip, and no-text-input tests.
- `WorkflowFeedbackHost.tsx` — standalone canonical `BottomGuide` presentation.
- `WorkflowFeedbackInlineSlot.tsx` — inline consumer for an already-visible guide.
- `index.ts` — public typed exports only.

Modify existing files:

- `src/services/analytics/events.ts` — five new event constants, including meal-finalize failure.
- `src/services/analytics/eventPropertySchemas.ts` — event-specific string-key allowlists.
- `src/services/analytics/analytics.test.ts` — sanitizer assertions for allowed feedback metadata and rejected private content.
- `App.tsx` — mount the provider and standalone host inside the PostHog provider branch and an inert fallback branch.
- `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx` and its focused test — request satisfaction after a saved rebalance and closed settings drawer.
- `src/capabilities/meal-planning/domain/mealPlanFinalizationTelemetry.ts` and test — bounded failure classification.
- `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx` and focused test — failure event and post-navigation prompt handoff.
- `src/features/household-food/FoodNavigator.tsx` — typed optional `NextMeals` prompt param.
- `src/capabilities/meal-planning/screens/NextMealsScreen.tsx` and focused test — consume the one-shot navigation prompt after transitions settle.
- `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx` and focused test — request Ease only after successful category correction and any merchant-rule decision.
- `src/features/screen-time/components/ScreenTimeUnlockGuideHost.tsx` and test — request Clarity or eligible clearing Ease for one guide episode.
- `src/features/screen-time/components/ScreenTimeUnlockGuide.tsx` and test — render the inline slot without stacking a second drawer.
- `docs/analytics/workflow-experience-pulse.md` — rollout flags, PostHog QA sequences, saved-query definitions, and weekly adapter contract.

Do not add a Supabase table, migration, Edge Function, free-text field, or remote percentage sampler in this plan.

### Task 1: Register the analytics contract

**Files:**

- Modify: `src/services/analytics/events.ts`
- Modify: `src/services/analytics/eventPropertySchemas.ts`
- Modify: `src/services/analytics/analytics.test.ts`

- [ ] **Step 1: Add a failing sanitizer test for bounded feedback metadata**

Add this case to `sanitizeAnalyticsProps` tests:

```ts
it('keeps only the registered workflow-feedback dimensions', () => {
  expect(sanitizeAnalyticsProps(AnalyticsEvent.WorkflowFeedbackSubmitted, {
    feedback_instance_id: '9ba92f7e-31ca-48e6-aa2d-d4310b63a38c',
    prompt_id: 'money_rebalance_satisfaction_v1',
    question_category: 'satisfaction',
    question_version: 1,
    capability_id: 'money',
    workflow_id: 'adjust_spending_plan',
    checkpoint_id: 'rebalance_saved',
    invocation_kind: 'authoritative_outcome_experience',
    response_value: 5,
    response_band: 'positive',
    sampling_policy_version: 1,
    outcome_class: 'saved',
    question_text: 'private runtime copy',
    transaction_id: 'private-transaction-id',
  })).toEqual({
    feedback_instance_id: '9ba92f7e-31ca-48e6-aa2d-d4310b63a38c',
    prompt_id: 'money_rebalance_satisfaction_v1',
    question_category: 'satisfaction',
    question_version: 1,
    capability_id: 'money',
    workflow_id: 'adjust_spending_plan',
    checkpoint_id: 'rebalance_saved',
    invocation_kind: 'authoritative_outcome_experience',
    response_value: 5,
    response_band: 'positive',
    sampling_policy_version: 1,
    outcome_class: 'saved',
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails on the missing event**

Run:

```bash
npx jest src/services/analytics/analytics.test.ts --runInBand
```

Expected: TypeScript/Jest fails because `WorkflowFeedbackSubmitted` is not registered.

- [ ] **Step 3: Add the exact event names**

Add this block near the workflow outcome events in `AnalyticsEvent`:

```ts
MealPlanFinalizeFailed: 'meal_plan_finalize_failed',
WorkflowFeedbackShown: 'workflow_feedback_shown',
WorkflowFeedbackDismissed: 'workflow_feedback_dismissed',
WorkflowFeedbackSubmitted: 'workflow_feedback_submitted',
WorkflowFeedbackFollowupSubmitted: 'workflow_feedback_followup_submitted',
```

- [ ] **Step 4: Add event-specific property allowlists**

Use one shared key array and explicit schemas:

```ts
const WORKFLOW_FEEDBACK_STRING_KEYS = [
  'feedback_instance_id',
  'prompt_id',
  'question_category',
  'capability_id',
  'workflow_id',
  'checkpoint_id',
  'invocation_kind',
  'response_band',
  'reason_code',
  'outcome_class',
] as const;

// Inside ANALYTICS_EVENT_PROPERTY_SCHEMAS:
[AnalyticsEvent.MealPlanFinalizeFailed]: schema('failure_class'),
[AnalyticsEvent.WorkflowFeedbackShown]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
[AnalyticsEvent.WorkflowFeedbackDismissed]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
[AnalyticsEvent.WorkflowFeedbackSubmitted]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
[AnalyticsEvent.WorkflowFeedbackFollowupSubmitted]: schema(...WORKFLOW_FEEDBACK_STRING_KEYS),
```

Keep `question_version`, `response_value`, and `sampling_policy_version` numeric; V1 emits policy version `1`. Do not allow arbitrary string values for these keys.

- [ ] **Step 5: Add explicit rejection coverage**

Extend the sensitive-property table with `question_text`, `workflow_object_id`, `child_membership_id`, and `selected_app_token`, and assert each is dropped.

- [ ] **Step 6: Run analytics tests**

Run:

```bash
npx jest src/services/analytics/analytics.test.ts src/services/analytics/eventRegistryCoverage.test.ts --runInBand
```

Expected: both suites pass. Registry coverage may remain red until later tasks reference all new client events; while implementing Task 1, classify only genuinely unreferenced events as `planned`, then remove that disposition as each event receives a source reference.

### Task 2: Build the immutable pilot registry

**Files:**

- Create: `src/features/workflow-feedback/workflowFeedbackRegistry.ts`
- Create: `src/features/workflow-feedback/workflowFeedbackRegistry.test.ts`
- Create: `src/features/workflow-feedback/index.ts`

- [ ] **Step 1: Write failing registry contract tests**

The tests must assert:

```ts
expect(Object.keys(WORKFLOW_FEEDBACK_REGISTRY)).toEqual([
  'money_rebalance_satisfaction_v1',
  'meal_plan_finalized_satisfaction_v1',
  'money_transaction_correction_ease_v1',
  'screen_time_block_reason_clarity_v1',
  'screen_time_block_clear_ease_v1',
]);
expect(getWorkflowFeedbackPrompt('money_rebalance_satisfaction_v1')).toMatchObject({
  category: 'satisfaction',
  questionVersion: 1,
  minimumEncounterCount: 2,
  placement: 'standalone',
});
expect(getWorkflowFeedbackPrompt('screen_time_block_reason_clarity_v1').placement).toBe('inline');
```

Also iterate every entry and assert five unique response values, values `1..5`, no empty label, four unique reasons, and no key or value containing `user`, `household`, `child`, `transaction_id`, or `plan_id`.

- [ ] **Step 2: Run the test and verify the module is missing**

```bash
npx jest src/features/workflow-feedback/workflowFeedbackRegistry.test.ts --runInBand
```

Expected: FAIL because the registry module does not exist.

- [ ] **Step 3: Define the registry types and shared scales**

Implement these exported contracts:

```ts
export type WorkflowFeedbackCategory = 'satisfaction' | 'ease' | 'clarity';
export type WorkflowFeedbackPlacement = 'standalone' | 'inline';
export type WorkflowFeedbackResponseBand = 'negative' | 'mixed' | 'positive';

export type WorkflowFeedbackChoice = Readonly<{
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  accessibilityLabel: string;
}>;

export type WorkflowFeedbackReason = Readonly<{
  code: string;
  label: string;
}>;

export type WorkflowFeedbackPrompt = Readonly<{
  promptId: WorkflowFeedbackPromptId;
  questionVersion: 1;
  category: WorkflowFeedbackCategory;
  question: string;
  choices: readonly WorkflowFeedbackChoice[];
  reasons: readonly WorkflowFeedbackReason[];
  capabilityId: 'money' | 'meals' | 'screen_time';
  workflowId: 'adjust_spending_plan' | 'finalize_meal_plan' | 'correct_transaction_category' | 'respond_to_blocked_app';
  checkpointId: 'rebalance_saved' | 'meal_plan_finalized' | 'transaction_category_corrected' | 'block_reason_rendered' | 'temporary_open_applied';
  invocationKind: 'checkpoint_experience' | 'workflow_completion_experience' | 'authoritative_outcome_experience';
  outcomeClass: 'saved' | 'finalized' | 'corrected' | 'rendered' | 'opened';
  placement: WorkflowFeedbackPlacement;
  minimumEncounterCount: 2;
}>;
```

Define `WorkflowFeedbackPromptId` as `keyof typeof WORKFLOW_FEEDBACK_REGISTRY` after constructing the object with `as const satisfies Record<string, ...>`. If TypeScript's circular inference rejects that arrangement, define the five-ID string union first and use `Record<WorkflowFeedbackPromptId, WorkflowFeedbackPrompt>`; do not widen it to `string`.

- [ ] **Step 4: Populate all five entries exactly from the feature brief**

Use these exact questions in V1:

```ts
money_rebalance_satisfaction_v1: 'How satisfied are you with this spending plan?'
meal_plan_finalized_satisfaction_v1: 'How satisfied are you with the meal plan you just made?'
money_transaction_correction_ease_v1: 'How easy was it to correct this transaction?'
screen_time_block_reason_clarity_v1: 'How clear is why this app is blocked?'
screen_time_block_clear_ease_v1: 'How easy was it to open the app temporarily?'
```

Copy the four reason codes and customer-facing labels for each prompt from the pilot table in the feature brief. Do not paraphrase at the call sites.

- [ ] **Step 5: Export a strict lookup**

```ts
export function getWorkflowFeedbackPrompt(
  promptId: WorkflowFeedbackPromptId,
): WorkflowFeedbackPrompt {
  return WORKFLOW_FEEDBACK_REGISTRY[promptId];
}

export function responseBandForValue(
  value: 1 | 2 | 3 | 4 | 5,
): WorkflowFeedbackResponseBand {
  return value <= 2 ? 'negative' : value === 3 ? 'mixed' : 'positive';
}
```

- [ ] **Step 6: Run the registry test**

```bash
npx jest src/features/workflow-feedback/workflowFeedbackRegistry.test.ts --runInBand
```

Expected: PASS.

### Task 3: Implement suppression policy and local metadata storage

**Files:**

- Create: `src/features/workflow-feedback/workflowFeedbackPolicy.ts`
- Create: `src/features/workflow-feedback/workflowFeedbackPolicy.test.ts`
- Create: `src/features/workflow-feedback/workflowFeedbackStorage.ts`
- Create: `src/features/workflow-feedback/workflowFeedbackStorage.test.ts`

- [ ] **Step 1: Write the pure policy boundary tests**

Use `2026-09-02T18:00:00.000Z` as `nowIso` and cover every decision code:

```ts
type WorkflowFeedbackIneligibility =
  | 'flag_disabled'
  | 'screen_time_flag_disabled'
  | 'session_already_shown'
  | 'minimum_encounters_not_met'
  | 'submitted_cooldown'
  | 'dismissed_cooldown'
  | 'unresolved_exposure_cooldown'
  | 'same_prompt_cooldown';
```

Tests must prove exact boundaries: 14 days after submission, 30 days after dismissal, seven days after unresolved exposure, 60 days after a same-prompt terminal, and encounter two. Assert equality at the boundary is eligible and one millisecond before is ineligible.

- [ ] **Step 2: Implement one pure eligibility function**

```ts
export function evaluateWorkflowFeedbackEligibility(input: {
  nowIso: string;
  promptKey: string;
  minimumEncounterCount: number;
  state: WorkflowFeedbackSuppressionState;
  sessionHasShown: boolean;
  enabled: boolean;
  screenTimeEnabled: boolean;
  capabilityId: 'money' | 'meals' | 'screen_time';
}): { eligible: true } | { eligible: false; reason: WorkflowFeedbackIneligibility };
```

Evaluate in this stable order: global flag, Screen Time flag, session cap, minimum encounters, unresolved exposure, submitted cooldown, dismissed cooldown, same-prompt cooldown. Parse invalid timestamps as absent; storage corruption is handled separately.

- [ ] **Step 3: Define the versioned storage envelope**

```ts
export type WorkflowFeedbackSuppressionState = {
  schemaVersion: 1;
  lastShownAt?: string;
  lastSubmittedAt?: string;
  lastDismissedAt?: string;
  unresolvedExposure: boolean;
  prompts: Record<string, {
    encounterCount: number;
    lastTerminalAt?: string;
  }>;
};
```

Use storage keys:

```ts
const keyForIdentity = (identity: { kind: 'user' | 'install'; id: string }) =>
  `workflow-feedback:v1:${identity.kind}:${encodeURIComponent(identity.id)}`;
```

The exported repository must provide `load`, `recordEncounter`, `recordShown`, `recordSubmitted`, and `recordDismissed`. Each write reads the current state, returns a new object, and writes one JSON envelope. `recordShown` sets `unresolvedExposure: true`; either terminal method sets it false and updates the matching prompt's `lastTerminalAt`.

- [ ] **Step 4: Add storage privacy and recovery tests**

Mock AsyncStorage and prove:

- User A and User B use different keys.
- Anonymous storage uses the install namespace.
- Invalid JSON and any `schemaVersion !== 1` return a fresh state without throwing.
- A serialized state contains none of `response`, `reason`, `feedback_instance_id`, `sourceKey`, or question copy.
- `recordShown` survives a simulated process restart as unresolved; `recordSubmitted` clears it.

- [ ] **Step 5: Run policy and storage tests**

```bash
npx jest \
  src/features/workflow-feedback/workflowFeedbackPolicy.test.ts \
  src/features/workflow-feedback/workflowFeedbackStorage.test.ts \
  --runInBand
```

Expected: PASS.

### Task 4: Build the request runtime and presentation UI

**Files:**

- Create: `src/features/workflow-feedback/workflowFeedbackRuntime.tsx`
- Create: `src/features/workflow-feedback/workflowFeedbackRuntime.test.tsx`
- Create: `src/features/workflow-feedback/WorkflowFeedbackQuestion.tsx`
- Create: `src/features/workflow-feedback/WorkflowFeedbackQuestion.test.tsx`
- Create: `src/features/workflow-feedback/WorkflowFeedbackHost.tsx`
- Create: `src/features/workflow-feedback/WorkflowFeedbackInlineSlot.tsx`
- Modify: `src/features/workflow-feedback/index.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Write request-bus and runtime tests before implementation**

Cover these observable cases with fake timers, mocked `InteractionManager.runAfterInteractions`, AsyncStorage, `getInstallId`, feature flags, and `useAnalytics`:

1. Disabled main flag records an encounter but never renders or emits a feedback event.
2. A cancelled request never renders.
3. A pending standalone request expires after 30 seconds.
4. The second request in one app session is suppressed after the first becomes visible.
5. A visible prompt emits one `shown`; close emits one `dismissed` and never `submitted`.
6. Rating emits one `submitted`; close after rating does not emit `dismissed`.
7. A low/mixed reason emits one `followup_submitted` with the same instance ID.
8. A second inline prompt for the same `sourceKey` cannot replace a prompt that already emitted `shown`.
9. Clearing Ease can claim the inline slot when Clarity was suppressed before visibility.
10. Switching `authIdentity.userId` reloads a different suppression namespace.

- [ ] **Step 2: Implement the ephemeral request bus**

Keep it in the runtime module and export only the typed request function:

```ts
export type WorkflowFeedbackRequest = Readonly<{
  promptId: WorkflowFeedbackPromptId;
  sourceKey: string;
  placement: WorkflowFeedbackPlacement;
}>;

export type WorkflowFeedbackHandle = Readonly<{ cancel: () => void }>;

export function requestWorkflowFeedback(
  request: WorkflowFeedbackRequest,
): WorkflowFeedbackHandle;
```

Normalize `sourceKey` by trimming, reject an empty key, create a random request token, notify the single mounted provider, and make cancellation idempotent. Never persist or emit `sourceKey`.

- [ ] **Step 3: Implement provider arbitration**

`WorkflowFeedbackProvider` must:

- Read `workflow-experience-pulse-v1` and `workflow-experience-pulse-screen-time-v1` with fallback `false`.
- Resolve identity as `user:<userId>` or `install:<getInstallId()>` and reload on user change.
- Record one encounter for each explicit caller request before policy evaluation. Call-site effects and handlers must request once per qualifying workflow occurrence.
- Defer a qualifying request through `InteractionManager.runAfterInteractions`.
- Cancel it after 30 seconds or when its handle is cancelled.
- Refuse all later requests after any presentation emits `shown` in the session.
- Generate a UUID only at visible activation.
- Call `recordShown` before emitting `WorkflowFeedbackShown`.
- Expose active presentation plus `submit`, `submitReason`, and `dismiss` through a private React context.
- Preserve exactly one terminal path with a ref/state guard.
- Treat app unmount or kill after `shown` as unresolved by doing nothing; local state already records the unresolved exposure.

Construct analytics properties only from the registry:

```ts
const baseProps = {
  feedback_instance_id: instanceId,
  prompt_id: prompt.promptId,
  question_category: prompt.category,
  question_version: prompt.questionVersion,
  capability_id: prompt.capabilityId,
  workflow_id: prompt.workflowId,
  checkpoint_id: prompt.checkpointId,
  invocation_kind: prompt.invocationKind,
  sampling_policy_version: 1,
  outcome_class: prompt.outcomeClass,
};
```

- [ ] **Step 4: Implement the shared question renderer**

`WorkflowFeedbackQuestion` receives a registry prompt and callbacks. Render the question as a heading, choices as accessible buttons with the registry labels, and an explicit Close action. After values 1–3, render only the four registered reason chips plus Done/Skip. Values 4–5 submit, show `Thanks — that helps.` with `accessibilityRole="status"`, and let the host close after 500 ms. Do not import or render `TextInput`.

Use existing Kwilt primitives (`Text`, `Button`, `VStack`, `HStack`) and theme tokens. Do not introduce a separate survey visual language.

- [ ] **Step 5: Implement both presentation adapters**

`WorkflowFeedbackHost` filters the active presentation to `placement === 'standalone'` and renders:

```tsx
<BottomGuide
  visible
  scrim="none"
  layout="floating"
  dynamicSizing
  onClose={dismiss}
>
  <WorkflowFeedbackQuestion {...questionProps} />
</BottomGuide>
```

`WorkflowFeedbackInlineSlot` accepts `{ sourceKey: string }`, filters the active presentation to the same source key and `placement === 'inline'`, and renders only `WorkflowFeedbackQuestion` inside a bounded `View`; it never renders `BottomGuide` or `BottomDrawer`.

- [ ] **Step 6: Mount the runtime inside PostHog context**

In the PostHog-enabled branch of `App.tsx`, wrap `RootNavigatorWithPostHog`, the existing hosts, and `<WorkflowFeedbackHost />` in `<WorkflowFeedbackProvider>`. In the fallback branch, wrap `RootNavigator` and the same sibling hosts in the provider too; both feature flags resolve false there, making it inert. Do not move `PortalHost` or unrelated runtime hosts.

- [ ] **Step 7: Run runtime and UI tests**

```bash
npx jest \
  src/features/workflow-feedback/workflowFeedbackRuntime.test.tsx \
  src/features/workflow-feedback/WorkflowFeedbackQuestion.test.tsx \
  --runInBand
```

Expected: PASS with no open timer or act warnings.

### Task 5: Attach Money rebalance satisfaction

**Files:**

- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: the existing focused `MoneyCategoryDetailScreen` test file, or create `src/capabilities/money/screens/MoneyCategoryDetailScreen.feedback.test.tsx` if the existing harness cannot isolate the drawer transition

- [ ] **Step 1: Write the failing attachment test**

Mock `requestWorkflowFeedback`. Exercise a successful category-settings save that emits `MoneyRebalanceSaved`. Assert the request is absent while the settings drawer is visible, then assert exactly:

```ts
expect(requestWorkflowFeedback).toHaveBeenCalledWith({
  promptId: 'money_rebalance_satisfaction_v1',
  sourceKey: 'money-rebalance-saved',
  placement: 'standalone',
});
```

Also prove failed save, stale rejection, cancellation, and forecast-only save do not request the prompt.

- [ ] **Step 2: Run the focused test and verify it fails**

Run the exact test file with `npx jest <path> --runInBand`.

- [ ] **Step 3: Add one local pending-feedback state**

After authoritative rebalance save, close the settings drawer and set a boolean `rebalanceFeedbackPending`. In an effect that observes `settingsOpen === false && rebalanceFeedbackPending`, call `requestWorkflowFeedback` once and clear the boolean. Keep `sourceKey` product-controlled and constant; the runtime's session cap prevents duplication. Do not include category ID, amount, or rebalance answer state in the request.

- [ ] **Step 4: Run the focused test**

Expected: PASS.

### Task 6: Attach meal-plan satisfaction and failure truth

**Files:**

- Create: `src/capabilities/meal-planning/domain/mealPlanFinalizationTelemetry.ts`
- Create: `src/capabilities/meal-planning/domain/mealPlanFinalizationTelemetry.test.ts`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx`
- Modify: its focused test file
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- Modify: its focused test file

- [ ] **Step 1: Write failure-classification tests**

Define only these results:

```ts
export type MealPlanFinalizeFailureClass =
  | 'version_conflict'
  | 'validation'
  | 'provider_unavailable'
  | 'unknown';
```

Use an exact allowlist rather than substring classification:

```ts
const VERSION_CODES = new Set([
  'meal_plan.version_conflict',
  'meal_plan.idempotency_conflict',
]);

const VALIDATION_CODES = new Set([
  'meal_plan.ai_evidence_unauthorized',
  'meal_plan.candidate_invalid',
  'meal_plan.date_invalid',
  'meal_plan.diners_invalid',
  'meal_plan.dish_invalid',
  'meal_plan.horizon_invalid',
  'meal_plan.idempotency_invalid',
  'meal_plan.identity_invalid',
  'meal_plan.occasion_invalid',
  'meal_plan.organizer_required',
  'meal_plan.recipe_snapshot_invalid',
  'meal_plan.recipe_snapshot_required',
  'meal_plan.servings_invalid',
  'meal_plan.state_invalid',
  'meal_plan.timing_invalid',
]);
```

Read a string `code` property when present; otherwise accept `Error.message` only when it exactly equals one of those product codes. Classify numeric status `>= 500`, `TypeError('Network request failed')`, and `TypeError('Failed to fetch')` as `provider_unavailable`. Every other value—including arbitrary raw strings and messages—returns `unknown`. Do not return, log, or emit error text.

- [ ] **Step 2: Implement the minimal pure classifier and run its test**

```bash
npx jest src/capabilities/meal-planning/domain/mealPlanFinalizationTelemetry.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Add the bounded failure event**

In the existing `catch` of `finalize`, capture:

```ts
capture(AnalyticsEvent.MealPlanFinalizeFailed, {
  failure_class: classifyMealPlanFinalizeFailure(error),
});
```

Keep the existing customer alert, but never send its message to analytics.

- [ ] **Step 4: Add a typed one-shot navigation handoff**

Change `FoodStackParamList` to:

```ts
NextMeals: {
  feedbackPromptId?: 'meal_plan_finalized_satisfaction_v1';
} | undefined;
```

On both paths that leave a successful finalization—directly and after reminder-offer close/create—replace with:

```ts
navigation.replace('NextMeals', {
  feedbackPromptId: 'meal_plan_finalized_satisfaction_v1',
});
```

Failed finalization must never set the param.

- [ ] **Step 5: Consume the handoff after navigation settles**

In `NextMealsScreen`, when the route param is present, clear it immediately with `navigation.setParams({ feedbackPromptId: undefined })`, then schedule this request through `InteractionManager.runAfterInteractions`:

```ts
requestWorkflowFeedback({
  promptId: route.params.feedbackPromptId,
  sourceKey: 'meal-plan-finalized',
  placement: 'standalone',
});
```

Cancel the interaction task and returned feedback handle on effect cleanup. The reminder drawer is already closed before this route exists.

- [ ] **Step 6: Test all three paths**

Prove direct success, reminder dismissal, and reminder creation each request once from `NextMeals`; prove failure and a normal `NextMeals` visit do not request. Run the classifier and both focused screen tests.

### Task 7: Attach transaction-correction Ease after merchant-rule resolution

**Files:**

- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: its focused test file

- [ ] **Step 1: Write failing path tests**

Cover successful `transaction_category` mutations for:

- no merchant-rule offer, followed by a stable detail or summary surface;
- offer dismissed;
- exact rule saved;
- partial rule saved.

Each path requests once only after its drawer/navigation path resolves:

```ts
{
  promptId: 'money_transaction_correction_ease_v1',
  sourceKey: 'money-transaction-category-corrected',
  placement: 'standalone',
}
```

Prove failed mutation, meaning review, plan-role override, and coverage edit do not request.

- [ ] **Step 2: Track a local pending correction receipt**

After `runReview` returns true for `transaction_category`, set `categoryCorrectionFeedbackPending`. If the outcome is `offer_rule`, retain it until the merchant-rule drawer is dismissed or its save succeeds. Otherwise request only after the category picker is closed and any `popTo('MoneySummary')` transition has been initiated.

Use one helper inside the screen:

```ts
const requestCategoryCorrectionFeedback = () => {
  if (!categoryCorrectionFeedbackPendingRef.current) return;
  categoryCorrectionFeedbackPendingRef.current = false;
  requestWorkflowFeedback({
    promptId: 'money_transaction_correction_ease_v1',
    sourceKey: 'money-transaction-category-corrected',
    placement: 'standalone',
  });
};
```

Call it from every terminal merchant-rule path and the no-offer success path. Do not call it when the underlying category mutation failed.

- [ ] **Step 3: Run the focused test**

Expected: every successful path calls once, and all negative controls call zero times.

### Task 8: Embed Screen Time Clarity and clearing Ease without a second guide

**Files:**

- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuideHost.tsx`
- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuide.tsx`
- Modify: their focused test files

- [ ] **Step 1: Write first-visible-wins tests**

Prove:

1. A visible, loaded handoff requests Clarity with `placement: 'inline'`.
2. Closing the handoff cancels its handle.
3. `opened` requests clearing Ease for the same episode key.
4. `applying`, denied, and failed do not request clearing Ease.
5. The guide renders one `WorkflowFeedbackInlineSlot` after rule details and before the action row.
6. No `BottomGuide` or second `BottomDrawer` is rendered by the inline slot.
7. Runtime arbitration keeps visible Clarity immutable; clearing Ease appears only when Clarity never became visible.

- [ ] **Step 2: Create one opaque episode key in the host**

When a new visible handoff is consumed, create an in-memory key such as `screen-time-guide-${counter}` using a module counter or random UUID. Do not derive it from the handoff, selected app, rule, child, or household. Keep it only for that mounted guide episode.

- [ ] **Step 3: Request and cancel Clarity**

After context loading completes and `ScreenTimeGuideShown` is captured, request:

```ts
requestWorkflowFeedback({
  promptId: 'screen_time_block_reason_clarity_v1',
  sourceKey: episodeKey,
  placement: 'inline',
});
```

Keep the returned handle and cancel it when the handoff closes or changes before visibility.

- [ ] **Step 4: Request clearing Ease only from an authoritative opened result**

After capturing `ScreenTimeTemporaryOpenApplied`, call the request API only when `next.status === 'opened'`:

```ts
requestWorkflowFeedback({
  promptId: 'screen_time_block_clear_ease_v1',
  sourceKey: episodeKey,
  placement: 'inline',
});
```

Do not request for `applying`; it is not an applied-device receipt. The runtime decides whether Clarity already consumed the episode.

- [ ] **Step 5: Render the shared slot in the existing guide**

Add `feedbackSourceKey?: string` to `ScreenTimeUnlockGuide` props. Render:

```tsx
{props.feedbackSourceKey ? (
  <WorkflowFeedbackInlineSlot sourceKey={props.feedbackSourceKey} />
) : null}
```

Place it after the blocking explanation/rule cards and before the final `HStack` actions. Preserve the existing guide title, result receipt, buttons, and dismissal behavior.

- [ ] **Step 6: Run focused Screen Time tests**

Run the host, guide, runtime, and `openScreenTimeRulesTemporarily` tests together. Expected: PASS. This is source proof only, not native clearing proof.

### Task 9: Add reproducible PostHog QA and reporting contracts

**Files:**

- Create: `docs/analytics/workflow-experience-pulse.md`

- [ ] **Step 1: Document flag ownership and safe defaults**

Record both flags, fallback `false`, the intended TestFlight/internal cohort, and the separate signed-device prerequisite for the Screen Time flag. State that source code cannot prove remote PostHog flag configuration.

- [ ] **Step 2: Document the exact QA sequences**

Include these valid sequences:

```text
shown -> submitted
shown -> submitted -> followup_submitted
shown -> dismissed
shown -> no terminal event (interrupted; seven-day unresolved cooldown)
```

State invalid sequences: submitted without shown, duplicate shown for an instance, submitted plus dismissed, duplicate submitted, follow-up without a 1–3 rating, and any domain ID/private content.

- [ ] **Step 3: Specify saved PostHog views**

Define saved insight/query names and required filters for:

- Satisfaction distribution and 4–5 rate by prompt/version.
- Ease and Clarity distributions separately.
- Response, dismissal, unresolved, duplicate-terminal, follow-up, and exposure-burden health.
- Money rebalance, meal finalization, transaction correction, and Screen Time open funnels with the windows from Phase 5.
- Behavioral × perception workflow buckets using aggregates, not person-level exports.

Every production query must use `app_env = production`, the founder/internal/test exclusion cohort, visible denominators, and `not measurable` below the sample floor.

- [ ] **Step 4: Specify—but do not implement—the weekly adapter**

The contract accepts only aggregate counts, distributions, rates, prompt versions, and measurement state. It times out to `not connected`, never substitutes zero, never changes the existing overall HEART verdict on unverified data, and never copies raw feedback or person rows into Supabase. Name server-side PostHog credential selection and saved-query ownership as the next integration decision.

### Task 10: Completion verification and honest release boundary

**Files:** All files changed by Tasks 1–9.

- [ ] **Step 1: Run all focused suites**

Run the registry, policy, storage, runtime, question UI, analytics, Money, Meals, and Screen Time tests named above in one Jest invocation. Expected: PASS.

- [ ] **Step 2: Run product taxonomy lint**

```bash
npm run product:lint
```

Expected: zero errors. Existing unrelated warnings may remain and must be reported as pre-existing.

- [ ] **Step 3: Run the task-completion gate once**

```bash
npm run verify:changed -- --run
```

Expected: every gate selected from the current diff passes. If concurrent unrelated work changes the diff during the run, report focused success and rerun only when the shared checkout is stable enough for a meaningful result.

- [ ] **Step 4: Run whitespace and scope checks**

```bash
git diff --check
git status --short
git diff -- docs/feature-briefs/workflow-experience-pulse.md \
  docs/design-explorations/outcome-happiness-pulse \
  docs/analytics/workflow-experience-pulse.md \
  src/features/workflow-feedback \
  src/services/analytics \
  src/capabilities/meal-planning \
  src/capabilities/money/screens \
  src/features/household-food/FoodNavigator.tsx \
  src/features/screen-time/components \
  App.tsx
```

Expected: no whitespace errors; review only the intended slice while preserving unrelated changes.

- [ ] **Step 5: Perform runtime QA with flags in a test environment**

Verify each standalone question appears after the stable qualifying surface, does not overlap another drawer/guide, is dismissible and accessible, emits one valid event sequence, and respects the second-encounter and cooldown policy. Report the checkout, branch, commit, dirty state, build/install provenance, and Metro port.

- [ ] **Step 6: Keep the production claims bounded**

Do not call the feature production-ready until:

- remote PostHog test events and saved queries are inspected;
- the main flag is confirmed disabled by default and then deliberately cohort-enabled;
- Screen Time shield handoff and `opened` clearing are reproduced on a signed physical iPhone using the intended release build;
- the Screen Time flag remains disabled until that proof passes;
- the weekly email continues to say `not connected` or `not measurable` until the aggregate adapter is separately implemented and proven.

Do not commit or push unless Andrew explicitly requests it. If he does, follow the repository's dirty-worktree staging and secret-scan rules and stage only this slice unless he explicitly authorizes `git add -A`.

## Self-review receipt

- Spec coverage: registry, five questions, attention budget, persistence boundary, event schema, all attachment points, meal failure truth, PostHog queries, HEART adapter boundary, and physical Screen Time proof each map to a task.
- Type consistency: the same five prompt IDs, three categories, response bands, placement values, source-key contract, and event property names are used throughout.
- Privacy: no task adds free text, raw errors, domain object IDs, customer content, or first-party response persistence.
- Scope: the weekly adapter and remote PostHog configuration are documented integration gates, not falsely presented as source-complete work.

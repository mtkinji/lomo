# Multimodal Money Answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the user's income spending limit visible and understandable in Money, return the same answer from Unified Chat, and offer one private weekly device check that opens the current authoritative answer.

**Architecture:** Add one pure `MoneyPlanLimitAnswer` projection owned by Money and derive it from `LivingPlanSettingsSnapshot.active`. Summary, category-impact review, and Unified Chat consume the same raw facts and formatter. Keep `money.read` bounded and read-only. Persist a single typed saved-check kind in user-scoped device storage; `NotificationService` remains the only native scheduling owner and carries no financial values in notification content.

**Tech Stack:** TypeScript, React Native, Expo Notifications, AsyncStorage, Unified Chat runtime, Supabase-backed Money repositories, Jest, React Native Testing Library.

**Scope guard:** This plan does not add SMS, arbitrary natural-language queries, generated SQL, Money mutations in Chat, server scheduling, lock-screen amounts, or autonomous rebalancing. Reuse the existing branch and checkout; do not create a worktree unless Andrew separately approves a parallel lane.

---

### Task 1: Create the shared plan-limit answer contract

**Files:**
- Create: `src/capabilities/money/domain/moneyPlanLimitAnswer.ts`
- Create: `src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts`
- Modify: `src/capabilities/money/domain/living-plan-adjustment.ts`
- Create: `src/capabilities/money/domain/living-plan-adjustment.test.ts`

- [ ] **Step 1: Write failing projection and copy tests**

Cover within, exact, over, decimal percentage, missing plan, non-ready plan,
zero resource basis, and unavailable observation time. Use cents throughout.

```ts
expect(projectMoneyPlanLimitAnswer({
  activePlan: readyPlan({ livingPercent: 70, resourceBasisCents: 480_000,
    targetCents: 336_000, plannedCents: 326_400, unassignedCents: 9_600,
    overTargetCents: 0 }),
  observedAt: '2026-07-30T18:00:00.000Z',
})).toMatchObject({
  status: 'ready', relation: 'within', plannedIncomePercent: 68,
  differenceCents: 9_600, targetPointDelta: -2,
});
```

Assert `formatMoneyPlanLimitAnswer` yields the same factual lines required by
Summary and Chat. Unavailable states must never say `$0 income` or `0% target`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts src/capabilities/money/domain/living-plan-adjustment.test.ts`

- [ ] **Step 3: Implement the discriminated union and reuse it in adjustment math**

```ts
export type MoneyPlanLimitAnswer =
  | { status: 'ready'; relation: 'within' | 'at' | 'over'; livingPercent: number;
      resourceBasisCents: number; targetCents: number; plannedCents: number;
      differenceCents: number; plannedIncomePercent: number;
      targetPointDelta: number; observedAt: string | null }
  | { status: 'unavailable'; reason: 'plan_missing' | 'plan_not_ready' |
      'income_basis_missing'; observedAt: string | null };
```

Keep the formatter deterministic and non-advisory. Refactor
`getLivingPlanAdjustmentImpact` to use the same rounding and variance helpers so
category review cannot drift from Summary or Chat.

- [ ] **Step 4: Run the tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the domain contract**

```bash
git add src/capabilities/money/domain/moneyPlanLimitAnswer.ts src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts src/capabilities/money/domain/living-plan-adjustment.ts src/capabilities/money/domain/living-plan-adjustment.test.ts
git commit -m "feat(money): add shared spending limit answer"
```

### Task 2: Load and show the answer on current-month Summary

**Files:**
- Create: `src/capabilities/money/data/loadMoneyPlanLimitAnswer.ts`
- Create: `src/capabilities/money/data/loadMoneyPlanLimitAnswer.test.ts`
- Create: `src/capabilities/money/components/MoneyPlanLimitBlock.tsx`
- Create: `src/capabilities/money/components/MoneyPlanLimitBlock.test.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`

- [ ] **Step 1: Write failing loader and component tests**

The loader calls `getLivingPlanSettings(client)` and projects the active plan
with the Money snapshot's `lastSyncedAt ?? generatedAt`. The component must show
the limit label, percentage, income basis, planned amount, variance, freshness,
and an accessible details action. Test ready, over, and unavailable states.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/data/loadMoneyPlanLimitAnswer.test.ts src/capabilities/money/components/MoneyPlanLimitBlock.test.tsx`

- [ ] **Step 3: Implement the loader and reductive block**

Load once per current snapshot and reload after `refresh()`. Render the block
only on `monthOffset === 0`; do not attach today's active plan to historical
month pages. The details action navigates to `MoneyLivingPlan`.

- [ ] **Step 4: Run tests and typecheck the touched surface**

Run: `npm test -- --runInBand src/capabilities/money/data/loadMoneyPlanLimitAnswer.test.ts src/capabilities/money/components/MoneyPlanLimitBlock.test.tsx`

Run: `npm run lint`

- [ ] **Step 5: Commit Summary visibility**

```bash
git add src/capabilities/money/data/loadMoneyPlanLimitAnswer.ts src/capabilities/money/data/loadMoneyPlanLimitAnswer.test.ts src/capabilities/money/components/MoneyPlanLimitBlock.tsx src/capabilities/money/components/MoneyPlanLimitBlock.test.tsx src/capabilities/money/screens/MoneySummaryScreen.tsx
git commit -m "feat(money): show the monthly spending limit"
```

### Task 3: Make category-change consequences explicit

**Files:**
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`

- [ ] **Step 1: Add failing review-contract tests**

Replace source-string-only assertions for the affected review with rendered
behavior where practical. Assert that a ready `LivingPlanOverridePreview` shows
resulting planned-income percentage, target percentage, dollars left/over,
percentage-point variance, every changed category name, and the unchanged-spend
statement. Assert blocked/not-ready previews refuse rather than calculate.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`

- [ ] **Step 3: Render the shared consequence vocabulary**

Use `getLivingPlanAdjustmentImpact({ currentAmountCents, before, after })`.
Resolve `planImpact.changes` to category names from the current snapshot and
show all automatic changes, excluding only a true no-op. Preserve the existing
preview/apply reconciliation path and do not introduce a second save path.

- [ ] **Step 4: Run the focused tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit the rebalance explanation**

```bash
git add src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx
git commit -m "feat(money): explain category change impact"
```

### Task 4: Extend bounded Unified Chat Money reads

**Files:**
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.test.ts`
- Modify: `src/features/unifiedChat/turnContextPhase.ts`
- Create or modify: `src/features/unifiedChat/turnContextPhase.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`

- [ ] **Step 1: Add failing snapshot, evidence, and tool-output tests**

Extend `MoneyChatSnapshot` with `planLimit: MoneyPlanLimitAnswer`. Assert
`loadDefaultCapabilitySnapshots` loads the Money snapshot and living-plan
settings together, then projects one answer. Assert `money.read` returns the
bounded `planLimit` object and formatted answer while still omitting merchant,
transaction, account name, and account mask data.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/turnContextPhase.test.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts`

- [ ] **Step 3: Implement the shared read path**

Load `getLivingPlanSettings(getSupabaseClient())` only when Money is requested.
Add the formatted limit answer to Money evidence and the `money.read` output.
Update the tool purpose to include the current plan-versus-income-limit fact;
keep version 1 if the output remains backward-compatible and additive.

The native return for the whole-plan answer must target:

```ts
{ name: 'Money', params: { screen: 'MoneySummary' } }
```

Category-specific evidence continues to return to category detail.

- [ ] **Step 4: Run tests and package typechecks**

Run the command from Step 2.

Run: `npm run lint && npm run lint:tests`

- [ ] **Step 5: Commit the bounded Chat read**

```bash
git add src/features/unifiedChat/capabilityAdapters.ts src/features/unifiedChat/capabilityAdapters.test.ts src/features/unifiedChat/turnContextPhase.ts src/features/unifiedChat/turnContextPhase.test.ts src/features/unifiedChat/unifiedChatToolProvider.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts packages/kwilt-agent-runtime/src/kwiltToolContracts.ts
git commit -m "feat(chat): answer the Money spending limit question"
```

### Task 5: Prove natural-language routing and answer truth

**Files:**
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.test.ts`
- Modify as required by the existing harness: `src/features/unifiedChat/routeUnifiedChatRequest.ts`
- Modify associated test if routing changes: `src/features/unifiedChat/routeUnifiedChatRequest.test.ts`

- [ ] **Step 1: Add failing language cases**

Include “Am I within my income spending limit?”, “Does my plan still fit the
70% limit?”, and an unavailable-evidence case. Require `money.read`, no write
tool, a direct answer before explanation, freshness, and a Money Summary return
target.

- [ ] **Step 2: Run the eval and routing tests**

Run: `npm test -- --runInBand src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/routeUnifiedChatRequest.test.ts`

- [ ] **Step 3: Make only the minimum routing/prompt change**

Keep the calculation in the tool output. The model may phrase the answer but
must not infer the target from category totals or invent missing income.

- [ ] **Step 4: Rerun and commit**

```bash
git add src/features/unifiedChat/agentCapabilityEvalCases.ts src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/routeUnifiedChatRequest.ts src/features/unifiedChat/routeUnifiedChatRequest.test.ts
git commit -m "test(chat): cover Money limit questions"
```

Omit unchanged paths from `git add` if the eval passes without production route
changes.

### Task 6: Persist one typed, user-scoped saved check

**Files:**
- Create: `src/capabilities/money/domain/moneySavedCheck.ts`
- Create: `src/capabilities/money/domain/moneySavedCheck.test.ts`
- Create: `src/capabilities/money/runtime/moneySavedCheckStorage.ts`
- Create: `src/capabilities/money/runtime/moneySavedCheckStorage.test.ts`

- [ ] **Step 1: Write failing normalization and isolation tests**

```ts
export type MoneySavedCheck = {
  id: string;
  kind: 'current_plan_within_income_limit';
  cadence: { kind: 'weekly'; weekday: number; hour: number; minute: number;
    timezone: string };
  disclosure: 'private_prompt_only';
  active: boolean;
  notificationId: string | null;
  lastRun: { status: 'opened' | 'delivery_failed'; atIso: string } | null;
  createdAtIso: string;
  updatedAtIso: string;
};
```

Cover separate user keys, malformed JSON, unsupported kinds, invalid weekdays,
timezone preservation, pause, removal, notification id update, and open-status
recording. Store no answer amounts.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/domain/moneySavedCheck.test.ts src/capabilities/money/runtime/moneySavedCheckStorage.test.ts`

- [ ] **Step 3: Implement pure normalization and AsyncStorage adapter**

Use a versioned key such as `kwilt:money:saved-checks:v1:<userId>`. Support one
record for the first release but retain a stable id and typed array envelope so
removal and later evolution do not require storing the original prompt.

- [ ] **Step 4: Run tests and commit**

```bash
git add src/capabilities/money/domain/moneySavedCheck.ts src/capabilities/money/domain/moneySavedCheck.test.ts src/capabilities/money/runtime/moneySavedCheckStorage.ts src/capabilities/money/runtime/moneySavedCheckStorage.test.ts
git commit -m "feat(money): persist a private weekly check"
```

### Task 7: Schedule and deep-link the private weekly check

**Files:**
- Modify: `src/services/NotificationService.ts`
- Modify: `src/services/NotificationService.test.ts`
- Modify: `src/capabilities/money/navigation/types.ts` only if a typed route marker is required

- [ ] **Step 1: Write failing notification tests**

Assert `scheduleMoneyCheck` requests permission only after the user opts in,
cancels the previous identifier, uses a weekly calendar trigger in local time,
and schedules only:

```ts
{
  title: 'Your weekly Money check is ready',
  body: 'Open Kwilt to see the current answer.',
  data: { type: 'moneyCheck', savedCheckId: 'money-limit' },
}
```

Assert no cents, percentage, category, account, or prompt is present. Cover
permission denial, pause/cancel, hydration after relaunch, reschedule after
timezone/cadence change, and tap navigation to current-month Money Summary.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- --runInBand src/services/NotificationService.test.ts`

- [ ] **Step 3: Extend the sole notification owner**

Add `moneyCheck` to `NotificationData`, hydrate its identifier, and expose
schedule/cancel methods. Do not count this explicit user-created check against
system-nudge caps. On tap, record only the typed check id/open time and navigate:

```ts
navigateWhenReady('Money', { screen: 'MoneySummary' });
```

Summary's existing Money refresh path is authoritative; the notification does
not contain or claim a calculated answer.

- [ ] **Step 4: Run tests and commit**

```bash
git add src/services/NotificationService.ts src/services/NotificationService.test.ts src/capabilities/money/navigation/types.ts
git commit -m "feat(notifications): add private weekly Money checks"
```

Omit `navigation/types.ts` if no route marker is necessary.

### Task 8: Add simple weekly-check management to Money Plan

**Files:**
- Create: `src/capabilities/money/components/MoneyWeeklyCheckRow.tsx`
- Create: `src/capabilities/money/components/MoneyWeeklyCheckRow.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.tsx`

- [ ] **Step 1: Write failing management tests**

Cover the off state, enable explanation, permission grant, permission denial,
active state with next cadence, pause, resume, and remove. The action must never
appear as if it changes the Money plan.

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --runInBand src/capabilities/money/components/MoneyWeeklyCheckRow.test.tsx`

- [ ] **Step 3: Implement one calm row and confirmation drawer**

Place `Weekly Money check` after the living-target explanation. Default to one
documented weekday/time chosen by product copy; show it before permission is
requested. Keep pause and remove discoverable. Scheduling is initiated here,
not by an autonomous Chat write.

- [ ] **Step 4: Run tests, typecheck, and commit**

```bash
npm test -- --runInBand src/capabilities/money/components/MoneyWeeklyCheckRow.test.tsx
npm run lint
git add src/capabilities/money/components/MoneyWeeklyCheckRow.tsx src/capabilities/money/components/MoneyWeeklyCheckRow.test.tsx src/capabilities/money/screens/MoneyLivingPlanScreen.tsx
git commit -m "feat(money): manage the weekly limit check"
```

### Task 9: Verify the integrated learning release and documentation

**Files:**
- Modify if behavior differs: `docs/feature-briefs/multimodal-money-answers.md`
- Modify after runtime evidence only: `docs/job-flows/maya-review-budget-reality-before-spending.md`
- Modify after runtime evidence only: `docs/delivery-evidence/` relevant Money record

- [ ] **Step 1: Run focused integrated tests**

```bash
npm test -- --runInBand \
  src/capabilities/money/domain/moneyPlanLimitAnswer.test.ts \
  src/capabilities/money/domain/living-plan-adjustment.test.ts \
  src/capabilities/money/data/loadMoneyPlanLimitAnswer.test.ts \
  src/capabilities/money/components/MoneyPlanLimitBlock.test.tsx \
  src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx \
  src/features/unifiedChat/capabilityAdapters.test.ts \
  src/features/unifiedChat/turnContextPhase.test.ts \
  src/features/unifiedChat/unifiedChatToolProvider.test.ts \
  src/features/unifiedChat/agentCapabilityEvalCases.test.ts \
  src/capabilities/money/domain/moneySavedCheck.test.ts \
  src/capabilities/money/runtime/moneySavedCheckStorage.test.ts \
  src/services/NotificationService.test.ts \
  src/capabilities/money/components/MoneyWeeklyCheckRow.test.tsx
```

- [ ] **Step 2: Run repository completion gates**

```bash
npm run product:lint
npm run architecture:lint
npm run verify:changed -- --run
git diff --check
```

- [ ] **Step 3: Perform iPhone 17 Simulator review**

Record checkout, branch, commit, dirty state, installed build provenance, and
Metro checkout/port. Verify current Summary ready/over/unavailable states,
historical-page omission, Dynamic Type layout, category review, Chat answer,
Money return target, weekly-check enable/pause/remove, permission denial, and
notification tap. Simulator proof does not establish real lock-screen timing.

- [ ] **Step 4: Perform signed-device/TestFlight learning proof**

With explicit release authorization, verify lock-screen privacy, weekly trigger,
timezone/relaunch behavior, background-to-foreground refresh, VoiceOver, and
comprehension with at least five participants of varied UI fluency. Only then
update delivery evidence or job-flow scores.

- [ ] **Step 5: Commit final docs/evidence changes**

```bash
git add docs/feature-briefs/multimodal-money-answers.md src/capabilities/money/FEATURE.md docs/design-explorations/multimodal-money-answers docs/superpowers/plans/2026-07-30-multimodal-money-answers.md
git commit -m "docs(money): accept multimodal answer learning release"
```

Add job-flow or delivery-evidence files only when the stated runtime proof was
actually collected.

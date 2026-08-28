# Full Conversational Control Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current checkout. Steps use checkbox (`- [ ]`) syntax for tracking. Do not create a worktree unless Andrew explicitly approves a parallel lane.

**Goal:** Make every reasonable, in-scope Kwilt capability outcome available through native UI, Kwilt Chat, Kwilt voice/Phone, and ChatGPT through the hosted connector, with the same authoritative data, authorization, review, receipt, correction, and native-handoff semantics.

**Architecture:** One canonical operation manifest defines the product action once. Capability-owned actions and repositories remain the only mutation boundary. Kwilt Chat, voice, Phone, and the external MCP connector adapt into that operation; they do not own duplicate business logic. Safe reads may execute directly, reversible low-risk writes may execute only under explicit user authority, consequential writes produce typed proposals, and Apple/provider/credential-owned work produces a durable native handoff. Games and Explore are the only program-level capability exclusions.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript, Jest/jest-expo, Supabase Postgres/RLS/Edge Functions, Deno tests, OpenAI Responses/tool calling, OAuth 2.1 MCP connector, iOS Speech/AVAudioSession, FamilyControls/ManagedSettings/DeviceActivity, EAS/TestFlight.

---

## 1. Product contract

The result of this program is not “a manifest row exists” or “Chat recognizes the phrase.” An included operation is complete only when all seven statements below are true:

1. Kwilt Chat can understand an ordinary-language request for the operation.
2. The operation reads the minimum authoritative Kwilt context required to resolve its target.
3. It executes, proposes, or creates a native/provider handoff according to one capability-owned policy.
4. ChatGPT can reach the same outcome through the hosted OAuth connector.
5. Text dictation, live voice, and Phone route through the same operation and do not maintain a second command catalog.
6. The user receives a truthful durable result: completed, proposed, pending client action, needs input, unavailable, refused, or failed.
7. The required source, backend, Simulator, physical-device, TestFlight, and production evidence exists without borrowing proof from another layer.

“Same outcome” does not require identical interaction. It means the same target, validation, authority, review requirement, mutation, final state, and receipt. ChatGPT may create a handoff that the Kwilt app completes when iOS, a financial provider, a retailer, credentials, biometrics, another person, or a legally meaningful attestation must own the final act.

## 2. Scope and final acceptance

### Included

- Relationships, Household, Profile, Arcs, Goals, To-dos, Focus, Plan, Chapters, Account settings, Money, Chores, Recipes, Cook Mode, Meal Plan, Groceries, Savings, Screen Time, Notifications, navigation, Chat, voice, and Phone.
- Every user-beneficial action exposed by the primary native surfaces in `src/capabilities/uiParityInventory.ts`.
- Every already-declared canonical operation in `src/capabilities/operations.ts`, including the current operations that still lack a mobile, server, or external provider.
- Read, create, update, delete, complete, approve, return, connect, disconnect, configure, share, import, handoff, and correction paths when the underlying capability supports them.

### Excluded from the program

- Games.
- Explore and precise location-history control.
- Developer-only diagnostics, internal evaluation controls, authentication screens, paywall mechanics, and App Store purchase UI.

### Safety boundaries that remain supported jobs

The following are not capability exclusions. Conversation must prepare and explain the job, then stop at the correct owner:

- Whole-person relationship erasure: produce a complete impact review and open the native deletion flow until dependency-aware restore exists.
- Recipe publication-rights attestation: prepare publication data, but the person must attest.
- Grocery checkout and payment: build and review the cart, then hand off to the retailer/payment owner.
- Unsupported coupon application: identify the saving and open the provider; never claim the coupon was applied.
- OAuth, bank credentials, device authorization, biometrics, Screen Time token selection, widget placement, notification permission, and calendar permission: prepare exact intent and resume after native/provider completion.

### Quantitative exit criteria

The baseline on 2026-08-27 is 145 canonical operations, 33 unresolved native intent clusters, 61 mobile `pending_provider` rows, and 70 external `pending_provider` rows. The original inventory added 83 operations. Task 7's native Chores audit then found five independently useful UI actions that had been collapsed into completion, so section 3 now adds 88 operations and the corrected planned catalog contains 233 operations before any separately reviewed manifest consolidation.

The program exits only when:

- `UI_PARITY_SURFACES` contains zero unresolved gaps for included surfaces.
- Every one of the 233 planned operations maps to exactly one audited native intent.
- Mobile coverage contains zero `pending_provider` rows.
- Phone/server coverage contains zero `pending_provider` rows.
- External coverage contains zero `pending_provider` rows.
- External states are only `exposed`, `explicit_boundary`, `not_applicable`, or `excluded`; every `explicit_boundary` has a tested supported-job handoff.
- Only Games and Explore use the program-level `excluded` state.
- Every consequential operation has an explicit proposal or native confirmation and an authoritative receipt.
- Every operation has deterministic duplicate-request behavior.
- Local Chat and hosted ChatGPT pass the generated full-catalog matrix against disposable test data.
- Signed physical-device proof passes for voice, lifecycle, Screen Time configuration, Screen Time enforcement, notification permission, biometrics, camera/photo evidence, and every OS-owned handoff.
- The release is verified independently in source/tests, Supabase, Simulator, signed device, TestFlight, and production.

If implementation discovers that an operation must be split or combined, amend section 3 and its count in the same commit as the manifest change. Never silently reduce the acceptance surface to make the numbers pass.

## 3. Exact operation expansion for the 33 gaps

Add these 88 canonical operation IDs. Each ID receives a manifest entry, tool contract where applicable, capability owner, local/mobile provider, server or durable handoff provider, external exposure decision, proof paths, and an audited UI intent.

### Household: 6

```text
household.member.update
household.member.remove
household.device.list
household.device.update
household.device.revoke
household.device.reconcile
```

### Plan: 4

```text
plan.availability.read
plan.availability.update
plan.calendars.read
plan.calendars.update
```

### Chapters: 4

```text
chapters.digest_settings.read
chapters.digest_settings.update
chapters.alignment.preview
chapters.alignment.apply
```

### Account and device settings: 32

```text
settings.appearance.read
settings.appearance.update
settings.ai_model.read
settings.ai_model.update
settings.phone_agent.read
settings.phone_agent.update
settings.connected_tools.list
settings.connected_tools.get
settings.connected_tools.connect.open
settings.connected_tools.revoke
settings.sharing.list
settings.sharing.invitation.prepare
settings.sharing.connection.revoke
settings.haptics.read
settings.haptics.update
settings.widgets.read
settings.widgets.configure
settings.execution_targets.list
settings.execution_targets.get
settings.execution_targets.create
settings.execution_targets.update
settings.execution_targets.delete
settings.destinations.list
settings.destinations.get
settings.destinations.create
settings.destinations.update
settings.destinations.delete
settings.activity_areas.list
settings.activity_areas.get
settings.activity_areas.create
settings.activity_areas.update
settings.activity_areas.delete
```

### Money: 10

```text
money.budget.read
money.budget.update
money.transaction.get
money.transaction.meaning.update
money.transaction.plan_treatment.update
money.connection.disconnect
money.connection.repair.open
money.transfer.list
money.transfer.get
money.transfer.review
```

### Chores: 20

```text
chores.list
chores.get
chores.definition.create
chores.definition.update
chores.definition.pause
chores.definition.delete
chores.occurrence.claim
chores.occurrence.release
chores.occurrence.complete
chores.occurrence.reopen
chores.occurrence.report_earlier
chores.evidence.add
chores.review.approve
chores.review.return
chores.review.leave_missed
chores.reward.read
chores.reward.configure
chores.reward.reserve
chores.reward.cancel
chores.reward.settle
```

### Recipes: 2

```text
recipes.favorite.update
recipes.visibility.update
```

### Meal Plan: 2

```text
meal_planning.preferences.read
meal_planning.preferences.update
```

### Personal Screen Time: 5

```text
screen_time.personal_rule.list
screen_time.personal_rule.get
screen_time.personal_rule.update
screen_time.personal_rule.deactivate
screen_time.personal_rule.delete
```

### Notifications: 2

```text
notifications.preferences.read
notifications.preferences.update
```

### Navigation: 1

```text
navigation.open_capability
```

## 4. Non-negotiable engineering rules

- Native UI and every conversational channel call the same capability-owned action. A Chat handler may validate, stage, or route; it may not write capability tables directly.
- A mutation resolves an exact object ID and current version before it asks for approval. Names alone are never write targets when more than one object matches.
- Authentication, OAuth scope, household role, object visibility, action authorization, and final confirmation remain separate checks.
- Reads expose the minimum result needed for the request. Money never leaks merchant/account detail through the bounded summary contract; child and household data obey actor scope.
- Consequential writes are reviewable. The proposal shows target, fields changing, material consequence, reversibility, and native destination.
- Every write uses `requestId` as an idempotency key. Retrying the same request returns the original receipt and does not duplicate the mutation.
- A server-created device action is durable and owner-scoped. It has `created`, `claimed`, `completed`, `cancelled`, and `expired` lifecycle states and a completion receipt.
- `pending_client_action` is not success. UI copy says what remains and deep-links to the exact owner.
- Voice supplies input and reads status; it does not bypass confirmation or invent a second operation registry.
- External action names and schemas are projected from canonical contracts. Hand-authored compatibility aliases may remain only while tests prove they map one-to-one.
- Games/Explore are explicit exclusions. Payment, attestation, credentials, and OS permissions are explicit final-act boundaries with supported preparation and resume flows.
- No coverage row may move to `live`, `confirmation_only`, or `exposed` merely because an ID was registered. Tests must exercise authorization, execution/handoff, duplicate request, failure truth, and receipt.

## 5. Required result model

Keep the existing `KwiltActionReceiptStatus` values and make them the cross-channel vocabulary:

```ts
type KwiltActionReceiptStatus =
  | 'completed'
  | 'proposed'
  | 'pending_client_action'
  | 'needs_input'
  | 'unavailable'
  | 'refused'
  | 'failed';
```

Add an explicit completion mode to each manifest operation:

```ts
type ConversationalCompletionMode =
  | 'direct'
  | 'reviewed_proposal'
  | 'native_handoff'
  | 'provider_handoff'
  | 'supported_boundary'
  | 'excluded';
```

Every receipt must preserve:

```ts
type ConversationalActionReceipt = {
  receiptId: string;
  requestId: string;
  operationId: string;
  source: KwiltActionSource;
  actorId: string;
  householdId: string;
  status: KwiltActionReceiptStatus;
  resultRefs: readonly { kind: string; id: string }[];
  handoffId: string | null;
  reversible: boolean;
  undoOperationId: string | null;
  createdAt: string;
};
```

## 6. Execution protocol

Work in the current checkout and ordinary branch. At the beginning of every task:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
```

Reread every affected file from disk. Preserve unrelated dirty work and stage exact paths. Use focused red/green tests during implementation, then run the diff-aware completion gate once per finished vertical slice:

```bash
npm run verify:changed -- --run
```

Run the full Jest suite only when shared Jest/runtime configuration or a broad shared store/service boundary changes. Supabase code receives its own Deno check/tests. Simulator, physical-device, TestFlight, and production proof remain separate.

## 7. Implementation tasks

### Task 0: Reconcile the integration base before implementation

**Files:** None; inspection only.

- [x] Confirm the current branch, HEAD, and dirty paths with the commands in section 6.
- [x] Classify every dirty path by owner: this program, another active Kwilt effort, or user work.
- [x] Do not edit a path owned by another active effort until its changes are committed/merged or Andrew explicitly chooses how to reconcile it.
- [x] Confirm the current inventory tests pass independently:

```bash
npx jest src/capabilities/uiParityInventory.test.ts --runInBand
```

Expected: all inventory tests pass. If the current Screen Time branch has an unrelated type error, record it as an integration-base blocker without changing that code from this plan.

- [x] Capture fresh baseline counts by importing the manifest, mobile coverage, and external coverage in a temporary read-only command. Record the counts in `docs/delivery-evidence/unified-chat/conversational-control-program.yml`.
- [x] Commit only the baseline evidence file:

```bash
git add docs/delivery-evidence/unified-chat/conversational-control-program.yml
git diff --cached --check
git commit -m "docs: establish conversational control baseline"
```

### Task 1: Make parity an executable contract

**Files:**

- Modify: `src/capabilities/uiParityInventory.ts`
- Modify: `src/capabilities/uiParityInventory.test.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.ts`
- Create: `src/features/unifiedChat/conversationalParity.ts`
- Create: `src/features/unifiedChat/conversationalParity.test.ts`
- Create: `scripts/conversational-control-parity.mjs`
- Create: `scripts/conversational-control-parity.test.mjs`
- Modify: `package.json`
- Create: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`

- [x] Write a failing test that requires every included UI intent to have at least one canonical operation, every canonical operation to appear exactly once, and every included surface to have zero unresolved gaps at final mode.
- [x] Add a proof-state projection that joins UI intent, canonical operation, tool contract, mobile provider, server/device-handoff provider, external action, and proof references.
- [x] Use this exact acceptance shape:

```ts
type ConversationalParityRow = {
  operationId: KwiltCapabilityOperationId;
  surfaceId: string;
  intentId: string;
  completionMode: ConversationalCompletionMode;
  mobile: 'ready' | 'missing_provider' | 'missing_proof' | 'excluded';
  phone: 'ready' | 'missing_provider' | 'missing_proof' | 'excluded';
  external: 'ready' | 'missing_provider' | 'missing_proof' | 'boundary' | 'excluded';
  voice: 'shared_runtime' | 'missing_conformance' | 'excluded';
  proofPaths: readonly string[];
};
```

- [x] Make the report fail on duplicate mappings, missing mappings, unknown IDs, unsupported exclusions, missing proof paths, or a `ready` state without an executable provider.
- [x] Add `npm run chat:control-parity` and include it in `chat:delivery-lint`.
- [x] Generate both human-readable Markdown and machine-readable JSON from the same in-memory projection; do not hand-maintain count prose.
- [x] Run:

```bash
node --test scripts/conversational-control-parity.test.mjs
npx jest src/capabilities/uiParityInventory.test.ts src/features/unifiedChat/conversationalParity.test.ts --runInBand
npm run chat:control-parity
```

Expected: tests pass; the parity command intentionally exits nonzero until the implementation waves remove all gaps. Support `--allow-incomplete` for baseline report generation and require no flag in the final gate.

- [x] Commit the exact Task 1 files with message `feat(chat): enforce conversational parity contract`.

### Task 2: Expand the canonical operation and tool model

**Files:**

- Modify: `packages/kwilt-agent-runtime/src/types.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `packages/kwilt-agent-runtime/src/providerRegistry.test.ts`
- Modify: `src/capabilities/operations.ts`
- Modify: `src/capabilities/operations.test.ts`
- Modify: `src/capabilities/uiParityInventory.ts`

- [x] Write failing tests for all 83 IDs in the original section 3 and a final declared-operation count of 228. Task 7 amended this to 88 added IDs and 233 total after the Chores native-action audit.
- [x] Add `settings` to `KwiltOperationOwner`, `KWILT_EXTERNAL_CONTROL_SCOPE`, and `ownerForOperation()` rather than misclassifying settings under `account`.
- [x] Add `completionMode`, typed scopes, receipt requirements, and supported-boundary metadata to manifest entries.
- [x] Define a tool contract for every direct, proposal, or handoff operation. Boundary operations without an executable final act still receive a preparation/handoff operation; they do not receive a tool that claims the prohibited act completed.
- [x] Require `effect`, `consequence`, `reversible`, `confirmation`, `providers`, input schema, output schema, and version for every tool.
- [x] Map the 33 inventory gaps to the original 83 operations and remove each resolved gap entry; preserve the five later Chores audit corrections as distinct operations.
- [x] Assert only `explore.open` and `games.open` use `completionMode: 'excluded'`.
- [ ] Run:

```bash
npx jest src/capabilities/operations.test.ts src/capabilities/uiParityInventory.test.ts packages/kwilt-agent-runtime/src/providerRegistry.test.ts --runInBand
npm run lint
npm run lint:tests
```

Expected: all 233 operations are declared and uniquely inventoried; provider readiness may remain incomplete.

- [x] Commit the exact Task 2 files with message `feat(chat): declare complete Kwilt control catalog`.

### Task 3: Standardize authorization, idempotency, handoffs, and receipts

**Files:**

- Create: `packages/kwilt-agent-runtime/src/actionExecution.ts`
- Create: `packages/kwilt-agent-runtime/src/actionExecution.test.ts`
- Create: `packages/kwilt-agent-runtime/src/deviceHandoffs.ts`
- Create: `packages/kwilt-agent-runtime/src/deviceHandoffs.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/types.ts`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Modify: `supabase/functions/_shared/serverAgentTools.ts`
- Modify: `supabase/functions/_shared/serviceAgentRunPersistence.ts`
- Create: `supabase/migrations/20260827181938_conversational_action_handoffs.sql`
- Create: `supabase/functions/_shared/__tests__/conversationalActionHandoffs_deno_test.ts`

- [x] Write failing unit tests for direct completion, reviewed proposal, native handoff, provider handoff, needs-input, unavailable, refused, failed, retry, and duplicate request.
- [x] Add one execution envelope carrying actor, household, source, operation, request ID, target version, authorization decision, and confirmation state.
- [x] Persist owner-scoped device handoffs with state transitions `created -> claimed -> completed`, `created -> cancelled`, and `created -> expired`.
- [x] Enforce a unique `(actor_id, operation_id, request_id)` idempotency constraint for receipts and handoffs.
- [x] Reject target-version conflicts as `needs_input` with a fresh candidate summary; never apply stale proposals.
- [x] Store redacted arguments and stable result references, not raw secrets, financial credentials, Screen Time opaque tokens, photo bytes, or OAuth tokens.
- [x] Make mobile, server, Phone, and MCP return the same receipt schema.
- [x] Run:

```bash
npx jest packages/kwilt-agent-runtime/src/actionExecution.test.ts packages/kwilt-agent-runtime/src/deviceHandoffs.test.ts src/features/unifiedChat/mobileToolProviderRegistry.test.ts --runInBand
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/conversationalActionHandoffs_deno_test.ts
npm run lint:supabase-functions
```

Expected: every result state and replay path passes; unauthorized cross-owner access is refused.

- [x] Commit the exact Task 3 files with message `feat(chat): add durable cross-channel action receipts`.

### Task 4: Complete Household and device control

**Files:**

- Modify: `src/features/household/data/householdActionBoundary.ts`
- Modify: `src/features/household/data/household.ts`
- Modify: `src/features/household/data/householdDeviceParticipation.ts`
- Create: `src/features/household/data/householdManagementActions.ts`
- Create: `src/features/household/data/householdManagementActions.test.ts`
- Modify: `src/features/household/HouseholdMemberDetailScreen.tsx`
- Modify: `src/features/household/HouseholdDevicesScreen.tsx`
- Create: `src/features/unifiedChat/householdToolProvider.ts`
- Create: `src/features/unifiedChat/householdToolProvider.test.ts`
- Modify: `src/features/unifiedChat/mobileToolImplementations.ts`
- Modify: `supabase/functions/_shared/serverHouseholdTools.ts`
- Modify: `supabase/functions/_shared/__tests__/serverHouseholdTools.test.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`

- [x] Regression-first: prove native member update and device actions currently bypass or lack a canonical action, then move native UI onto `householdManagementActions`.
- [x] Implement member update with exact membership ID, editable fields, expected version, caregiver authority, and a receipt.
- [x] Implement member removal as a reviewed operation that previews dependent capability grants, device assignments, shared objects, and recovery behavior before apply.
- [x] Implement device list, rename/update, revoke, and reconcile. Revoke must preserve audit history and make current participation status explicit.
- [x] Keep invitation create/accept, dependent add, child capability update, and caregiver grant update in this vertical slice; remove their existing mobile/server pending-provider states.
- [x] Add mobile proposals for member/authority mutations and direct reads for household/device inventory.
- [x] Add server execution only where RLS plus action-level Household authority can prove the actor may act. Device-local cleanup returns `pending_client_action`.
- [x] Expose the same operations externally under `household.read` and `household.write` scopes.
- [x] Add tests for self, caregiver, child, removed member, wrong household, stale version, replay, and native-handoff completion.
- [x] Run focused Jest and Deno Household tests, then `npm run verify:changed -- --run` once. The completion gate reached test typechecking and stopped only on concurrent Money test edits outside this slice; Household focused tests, app typecheck, migration contracts, and Supabase typecheck passed.
- [ ] Commit with message `feat(household): complete conversational member and device control`.

### Task 5: Complete personal and family Screen Time control

**Files:**

- Modify: `src/features/screen-time/domain/screenTimeRuleInventory.ts`
- Create: `src/features/screen-time/domain/personalScreenTimeRuleActions.ts`
- Create: `src/features/screen-time/domain/personalScreenTimeRuleActions.test.ts`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/screen-time/rule-builder/personalRuleBuilderModel.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.ts`
- Modify: `src/features/household/screenTime/familyScreenTimeCommands.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.test.ts`
- Modify: `supabase/functions/_shared/serverScreenTimeTools.ts`
- Modify: `supabase/functions/_shared/__tests__/serverScreenTimeTools.test.ts`
- Modify: `plugins/withAppleEcosystemIntegrations.js`

- [x] Regression-first: prove Chat cannot list, inspect, update, deactivate, or delete a personal rule through the canonical boundary.
- [x] Move native list/detail/update/deactivate/delete behavior onto `personalScreenTimeRuleActions`.
- [x] Return opaque rule IDs and human-readable app labels; never expose FamilyControls tokens to model context, logs, external tools, or receipts.
- [x] Keep app/category selection and initial FamilyControls authorization native. Chat and ChatGPT create an exact handoff and resume with the completed rule receipt.
- [x] Complete server/device handoff providers for personal setup, personal limit, child selection, child device setup, device release, and family configuration.
- [x] Preserve caregiver/member authorization and expected-version checks for agreements, overrides, requests, and child device actions.
- [x] Add tests for no entitlement, denied authorization, expired handoff, rule not found, stale rule, repeated request, child-scope violation, and successful resume.
- [x] Run focused Jest, plugin-generation contract tests, Deno Screen Time tests, and `npm run verify:changed -- --run`. Focused Screen Time tests, app/test typechecks, plugin contracts, Deno checks, and code-health passed. The final completion run passed all 1,086 Jest suites (6,438 passed tests, 2 skipped), product/chat delivery lint, protocol conformance, generated code-map validation, and architecture lint.
- [ ] On an entitlement-enabled physical build, prove rule creation, update, deactivation, deletion, `DeviceActivityCenter.startMonitoring`, shield activation, app unblock, and child-device receipt. Record each result separately in the program evidence file.
- [x] Commit with message `feat(screen-time): complete conversational rule control`.

### Task 6: Complete Money control without weakening Money truth

**Files:**

- Modify: `src/capabilities/money/data/moneyMutations.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/domain/categoryPlanDraft.ts`
- Modify: `src/capabilities/money/domain/transactionMeaning.ts`
- Modify: `src/capabilities/money/domain/transactionPlanTreatment.ts`
- Modify: `src/capabilities/money/domain/creditCardPaymentTransfers.ts`
- Create: `src/capabilities/money/actions/moneyControlActions.ts`
- Create: `src/capabilities/money/actions/moneyControlActions.test.ts`
- Create: `src/features/unifiedChat/moneyToolProvider.ts`
- Create: `src/features/unifiedChat/moneyToolProvider.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Create: `supabase/functions/_shared/serverMoneyTools.ts`
- Create: `supabase/functions/_shared/__tests__/serverMoneyTools_deno_test.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`

- [x] Regression-first: prove budget plan, transaction meaning/treatment, connection disconnect/repair, and transfer review lack exact canonical actions.
- [x] Move the corresponding native UI saves onto `moneyControlActions`. Transaction meaning/treatment and connection disconnect now use the shared actions directly; both the native budget editor and conversational budget action use the same governed Living Plan preview/commit primitives so Chat cannot bypass plan truth.
- [x] Implement budget read/update as an exact reviewed monthly-plan diff. Do not call provider income inference “budget,” “cash flow,” or “saved money.”
- [x] Implement transaction get, meaning update, and plan-treatment update as distinct operations with source classification, explicit meaning, planning eligibility, and expected version preserved separately.
- [x] Implement transfer list/get/review without converting transfers into spending or income.
- [x] Implement disconnect as a consequential provider operation with institution/account impact review; implement repair as a provider-owned handoff.
- [x] Keep merchant names, account numbers, access tokens, and raw transaction lists out of general Chat evidence and external summaries unless the specific scoped read requires them.
- [x] Require fresh native authentication where the current Money privacy contract requires it; ChatGPT receives `pending_client_action`, not authentication authority.
- [x] Add tests for stale budget, transfer pairing, payroll/provider inference, explicit exclusion versus `not_counted`, duplicate update, privacy lock, disconnect failure, and repair resume.
- [x] Run focused Money Jest tests, Deno Money tests, and `npm run verify:changed -- --run`. The focused gate passed 16 Jest suites (131 tests, 2 snapshots), 9 Deno tests, and all relevant Edge Function checks. The final diff-aware gate passed the complete Jest suite, app/test typechecks, Supabase lint/tests, product and Chat delivery contracts, protocol conformance, generated code-map validation, and architecture lint. Simulator proof on `iPhone 17 Pro` from this checkout rendered the Accounts connection menu plus Repair and destructive Disconnect review; the review was cancelled without changing account state.
- [x] Commit with message `feat(money): complete conversational plan and transaction control`.

### Task 7: Replace the Chores learning adapter with Activity-backed authorized actions

**Files:**

- Modify: `src/capabilities/chores/domain/choreLearning.ts`
- Modify: `src/capabilities/chores/domain/choreCreation.ts`
- Create: `src/capabilities/chores/domain/choreActions.ts`
- Create: `src/capabilities/chores/domain/choreActions.test.ts`
- Modify: `src/capabilities/chores/runtime/useChoreLearningStore.ts`
- Create: `src/capabilities/chores/data/choreRepository.ts`
- Create: `src/capabilities/chores/data/choreRepository.test.ts`
- Modify: `src/capabilities/chores/screens/ChoresScreen.tsx`
- Create: `src/features/unifiedChat/choreToolProvider.ts`
- Create: `src/features/unifiedChat/choreToolProvider.test.ts`
- Create: `supabase/functions/_shared/serverChoreTools.ts`
- Create: `supabase/functions/_shared/__tests__/serverChoreTools_deno_test.ts`
- Create: `supabase/migrations/20260827_activity_backed_chore_profiles.sql`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`

- [x] Regression-first: prove the current learning store cannot truthfully support Household-authorized Chat reads or writes.
- [x] Keep Activity as the canonical series and dated Activity occurrence as the canonical completion unit. Add only Chore profile, policy, review, evidence reference, and reward-ledger data.
- [x] Implement list/get with actor-specific projections: caregiver inventory, child assigned work, open pool, review queue, and reward balance.
- [x] Implement definition create/update/pause/delete with exact recurrence behavior and “today” versus “this and future” scope where applicable.
- [x] Implement occurrence completion, photo-evidence handoff, approve, and “Needs another pass” return. A photo is evidence, not automated proof.
- [x] Implement reward read/configure/reserve/cancel/settle. Settlement records an outside-app payout; Kwilt never moves money.
- [x] Enforce child/caregiver roles, Household Mode actor context, offline outbox replay, occurrence idempotency, and one qualifying completion credit.
- [x] Route native Chores through `choreActions` before exposing Chat providers.
- [x] Expose external reads/writes only after the production repository and authorization tests pass; until then the catalog stays `pending_provider` rather than pretending the learning adapter is real data.
- [x] Add tests for recurrence, missed occurrences, photo-required completion, approval, return, duplicate completion, correction, token reservation rate, payout settlement, unauthorized child review, and offline replay.
- [x] Run focused Chores/Activity tests, Deno tests, migration contract checks, and `npm run verify:changed -- --run`. The focused gate passed 25 Jest suites (235 tests), four Deno provider tests, four migration-contract tests, and both app/test typechecks. The diff-aware completion gate passed all 1,100 Jest suites (6,518 passed tests, 2 skipped), Supabase lint/tests, product and Chat delivery contracts, protocol conformance, code-health ratchets, generated code-map validation, and architecture lint. Native signed-in runtime and deployed Supabase proof remain separate release gates.
- [x] Commit with message `feat(chores): add Activity-backed conversational control`.

### Task 8: Complete Recipes, Meal Plan, Groceries, and Savings providers

**Files:**

- Modify: `packages/kwilt-agent-runtime/src/foodOperationContracts.ts`
- Modify: `src/capabilities/recipes/data/recipeRepository.ts`
- Create: `src/capabilities/recipes/actions/recipeControlActions.ts`
- Create: `src/capabilities/recipes/actions/recipeControlActions.test.ts`
- Modify: `src/features/household-food/data/householdMealPreferencesRepository.ts`
- Create: `src/capabilities/meal-planning/actions/mealPreferenceActions.ts`
- Create: `src/capabilities/meal-planning/actions/mealPreferenceActions.test.ts`
- Modify: `src/features/unifiedChat/mobileToolImplementations.ts`
- Create: `supabase/functions/_shared/serverFoodTools.ts`
- Create: `supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`
- Modify: `scripts/food-provider-feasibility.mjs`
- Modify: `scripts/food-feasibility.test.mjs`

- [ ] Add native capability actions for favorite/unfavorite, hide/restore, meal-preference read, and exact household meal-preference update.
- [ ] Complete server providers for recipe search/read/create/import/update/scale/fork/share/publish/delete and Cook Mode read/start/control/complete.
- [ ] Complete server providers for meal-plan create/update/candidates/round/response/finalize/revise.
- [ ] Complete server providers for stock, grocery compile/item/review/product match/handoff, opportunity/scenario, receipt, savings, and food-budget operations.
- [ ] Keep image/file selection, collaborator delivery, retailer cart opening, publication attestation, checkout, payment, and coupon application as reviewed or provider/native handoffs.
- [ ] Use stable household/recipe/plan/list/item IDs and expected versions for writes. Require the actor’s household role for shared-food mutations.
- [ ] Preserve retailer adapter truth: cart prepared/opened is not checkout; savings identified is not coupon applied; receipt extracted is not reconciled.
- [ ] Add per-family tests for authorization, idempotency, stale versions, imported-source provenance, publication rights boundary, retailer outage, partial product matches, and receipt corrections.
- [ ] Run focused food Jest tests, `npm run test:food-feasibility`, relevant Deno food tests, and `npm run verify:changed -- --run`.
- [ ] Commit with message `feat(food): complete conversational food providers`.

### Task 9: Complete Plan, Chapters, and notification settings

**Files:**

- Modify: `src/capabilities/plan/actions/planActions.ts`
- Create: `src/capabilities/plan/actions/planPreferenceActions.ts`
- Create: `src/capabilities/plan/actions/planPreferenceActions.test.ts`
- Create: `src/features/chapters/chapterAlignmentActions.ts`
- Create: `src/features/chapters/chapterAlignmentActions.test.ts`
- Modify: `src/features/chapters/ChapterDigestSettingsScreen.tsx`
- Create: `src/features/account/chapterDigestSettingsActions.ts`
- Create: `src/features/account/chapterDigestSettingsActions.test.ts`
- Modify: `src/features/account/NotificationsSettingsScreen.tsx`
- Create: `src/features/account/notificationPreferenceActions.ts`
- Create: `src/features/account/notificationPreferenceActions.test.ts`
- Modify: `src/features/unifiedChat/mobileToolImplementations.ts`
- Modify: `supabase/functions/_shared/serverAgentTools.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`

- [x] Implement availability read/update as a reviewed weekly diff with time zone and affected days.
- [x] Implement calendar preference read/update separately from provider calendar authorization. Missing authorization creates a native handoff.
- [x] Implement Chapter alignment preview as a pure read and alignment apply as an explicit Activity/Chapter proposal with exact affected IDs.
- [x] Implement Chapter digest and notification preference reads/updates; OS permission changes remain native handoffs.
- [x] Complete any existing Plan, Chapters, and notification pending providers in the same slice.
- [x] Add tests for time-zone changes, intentional availability overrides, unavailable calendars, stale alignment, notification denial, replay, and exact return.
- [x] Run focused tests and `npm run verify:changed -- --run`.
- [x] Commit with message `feat(plan): complete conversational planning preferences`.

### Task 10: Complete account settings and universal navigation

**Files:**

- Create: `src/features/account/actions/devicePreferenceActions.ts`
- Create: `src/features/account/actions/devicePreferenceActions.test.ts`
- Create: `src/features/account/actions/connectedToolActions.ts`
- Create: `src/features/account/actions/connectedToolActions.test.ts`
- Create: `src/features/account/actions/sharingActions.ts`
- Create: `src/features/account/actions/sharingActions.test.ts`
- Create: `src/features/account/actions/executionTargetActions.ts`
- Create: `src/features/account/actions/executionTargetActions.test.ts`
- Create: `src/features/account/actions/destinationActions.ts`
- Create: `src/features/account/actions/destinationActions.test.ts`
- Create: `src/features/account/actions/activityAreaActions.ts`
- Create: `src/features/account/actions/activityAreaActions.test.ts`
- Modify: the owning settings screens listed in `src/capabilities/uiParityInventory.ts`
- Modify: `src/navigation/capabilityNavigation.ts`
- Create: `src/navigation/capabilityNavigationAction.ts`
- Create: `src/navigation/capabilityNavigationAction.test.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`

- [ ] Move appearance, AI model, Phone Agent, haptics, widget preferences, connected tools, sharing, execution targets, destinations, and Activity areas behind typed capability actions used by native UI.
- [ ] Treat device-local preferences as local direct operations after an explicit request. External requests create a device handoff and become complete only after the target device applies them.
- [ ] Treat OAuth connect as `connect.open`; credentials never enter model arguments. Revocation is consequential, lists affected behavior, and returns a provider-confirmed receipt.
- [ ] Treat sharing invitations as prepared drafts until the user confirms the exact person/audience and delivery. Revocation is an explicit write.
- [ ] Validate execution targets and destinations against provider ownership and deny arbitrary URL/command injection.
- [ ] Implement `navigation.open_capability` with an enum of included capability destinations and optional stable object reference. Reject arbitrary routes.
- [ ] Add tests for every settings operation, wrong-device handoff, OAuth cancellation, revoke retry, sharing audience mismatch, unsafe destination, unknown navigation target, and resume.
- [ ] Run focused tests and `npm run verify:changed -- --run`.
- [ ] Commit with message `feat(settings): complete conversational settings control`.

### Task 11: Eliminate all pre-existing mobile and Phone pending providers

**Files:**

- Modify: `src/features/unifiedChat/mobileToolImplementations.ts`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.ts`
- Modify: capability-owned providers under `src/features/unifiedChat/`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Modify: `supabase/functions/_shared/serverAgentTools.ts`
- Modify: server providers under `supabase/functions/_shared/`
- Modify: `src/features/unifiedChat/conversationalParity.test.ts`

- [ ] Generate the remaining missing-provider list after Tasks 4-10; use the generated report rather than the original 61/70 counts.
- [ ] For every remaining row, implement exactly one of: direct provider, reviewed proposal, durable device handoff, durable provider handoff, or supported boundary.
- [ ] Reject “handler registered but dispatcher falls through” by invoking every registration once in contract tests.
- [ ] Assert mobile and Phone summaries contain zero `pending_provider` rows.
- [ ] Run:

```bash
npx jest src/features/unifiedChat --runInBand
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/*agent*_test.ts supabase/functions/_shared/__tests__/server*Tools*_test.ts
npm run chat:control-parity -- --allow-incomplete
npm run verify:changed -- --run
```

Expected: mobile and Phone have no pending provider; external and runtime proof may remain incomplete.

- [ ] Commit with message `feat(chat): complete mobile and phone provider coverage`.

### Task 12: Prove voice uses the same control plane

**Files:**

- Modify: `src/features/liveConversation/durableRealtimeTool.ts`
- Modify: `src/features/liveConversation/durableRealtimeTool.test.ts`
- Modify: `src/features/liveConversation/liveConversationSessionClient.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Create: `src/features/liveConversation/voiceOperationConformance.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `supabase/functions/_shared/liveConversationSession.ts`
- Modify: `supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts`
- Modify: `supabase/functions/_shared/serverAgentTools.ts`

- [ ] Write a generated conformance test that iterates every included operation and proves voice invokes the same canonical tool ID, result state, confirmation requirement, and durable run/receipt path as text.
- [ ] Make dictation only a composer input method and make live conversation only a streaming transport over the shared run coordinator.
- [ ] When a proposal requires visual review, voice summarizes the change and opens the durable proposal; spoken “yes” is accepted only when the operation policy allows voice confirmation and the exact pending proposal is unambiguous.
- [ ] Require native interaction for biometrics, permissions, Screen Time selections, photos, OAuth, payments, attestations, and audience-sensitive sharing.
- [ ] Preserve interruption, stop, steer, retry, background/foreground, Bluetooth route changes, and microphone denial without losing the durable action state.
- [ ] Run focused Jest/Deno voice tests and `npm run chat:protocol:conformance`.
- [ ] Commit with message `feat(voice): share complete conversational control plane`.

### Task 13: Expose the complete safe catalog to ChatGPT

**Files:**

- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.test.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcp.test.ts`
- Modify: `supabase/functions/mcp/index.ts`
- Modify: `scripts/mcp-all-tools-e2e.mjs`
- Modify: `scripts/mcp-smoke.mjs`
- Modify: `docs/feature-briefs/external-ai-connector.md`

- [ ] Generate external registrations from the canonical catalog and server/device-handoff provider registry. Keep legacy aliases in a tested compatibility table only.
- [ ] Assign least-privilege OAuth scopes by capability and effect. Reads never imply writes; household, Money, sharing, and Screen Time writes require their own scopes.
- [ ] Expose device/provider handoff tools so ChatGPT can initiate and monitor the same native completion flow.
- [ ] Ensure `tools/list` does not expose Games, Explore, internal orchestration operations, unsupported final acts, or operations without a provider.
- [ ] Return structured content with operation ID, status, result refs, proposal/handoff ID, native destination, and user-safe message.
- [ ] Test expired token, wrong audience, missing scope, revoked connection, cross-household target, schema rejection, duplicate request, provider outage, handoff expiry, and successful resume.
- [ ] Assert external coverage contains zero `pending_provider` rows.
- [ ] Run:

```bash
npm run mcp:smoke
npm run mcp:e2e -- --dry-run
npm run chat:control-parity -- --allow-incomplete
npm run lint:supabase-functions
```

Expected: all safe operations are exposed or have an explicit tested boundary; no pending provider remains.

- [ ] Commit with message `feat(mcp): expose complete Kwilt control catalog`.

### Task 14: Add security and operational hardening

**Files:**

- Modify: `supabase/functions/_shared/serviceAgentRunPersistence.ts`
- Create: `supabase/functions/_shared/conversationalControlTelemetry.ts`
- Create: `supabase/functions/_shared/__tests__/conversationalControlTelemetry_deno_test.ts`
- Create: `supabase/migrations/20260827_conversational_control_audit.sql`
- Modify: `supabase/functions/mcp/index.ts`
- Modify: `supabase/functions/agent-run/index.ts`
- Create: `docs/operations/unified-chat-runbook.md`
- Create: `docs/operations/conversational-control-incident-response.md`

- [ ] Add per-operation/channel metrics for request, authorization refusal, proposal, handoff, completion, failure, replay, latency, and stale-version conflict.
- [ ] Record catalog hash, tool version, actor/household IDs, redacted argument digest, provider, result status, receipt ID, and error code in the audit ledger.
- [ ] Add rate limits by actor, OAuth client, operation consequence, and provider cost. Retries with the same request ID do not consume a second mutation allowance.
- [ ] Add feature flags that can disable one operation/provider/channel without disabling all Chat.
- [ ] Add handoff expiration, stuck-run reconciliation, dead-letter inspection, replay-safe recovery, and provider circuit breakers.
- [ ] Add alerts for elevated refusal/failure, duplicate mutation, receipt mismatch, stalled handoff, tool-catalog drift, and OAuth scope mismatch.
- [ ] Document rollback separately for Edge Functions, database migrations, MCP catalog, mobile feature flags, and native build.
- [ ] Run security-focused Deno tests, rate-limit tests, migration checks, and a redaction snapshot test.
- [ ] Commit with message `feat(chat): harden conversational control operations`.

### Task 15: Build the full generated behavior matrix

**Files:**

- Create: `scripts/conversational-control-corpus.ts`
- Create: `scripts/conversational-control-corpus.test.ts`
- Modify: `scripts/unified-chat-live-eval.ts`
- Modify: `scripts/mcp-all-tools-e2e.mjs`
- Create: `docs/delivery-evidence/unified-chat/conversational-control-matrix.md`
- Modify: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`

- [ ] Generate at least these cases for every operation: ordinary phrasing, paraphrase, ambiguous target, unauthorized actor, missing scope, valid direct/proposal/handoff path, duplicate request, provider failure, and correction/retry.
- [ ] Add capability-specific adversarial cases for financial semantics, household roles, child privacy, Screen Time token leakage, arbitrary navigation/destination injection, sharing audience, retailer completion claims, publication attestation, and reward settlement.
- [ ] Use synthetic, disposable accounts and records. Never place Andrew’s real financial or household data in fixtures, screenshots, or reports.
- [ ] Record exact model, prompt/catalog hash, branch, commit, backend environment, account fixture, timestamp, and result artifact for every live run.
- [ ] Require 100% deterministic contract pass and zero false completion claims. Track model-understanding misses separately from provider/runtime failures.
- [ ] Run focused corpus tests and a bounded live evaluation against the intended model.
- [ ] Commit with message `test(chat): add full conversational control matrix`.

### Task 16: Validate local Kwilt Chat and Simulator behavior

**Files:**

- Modify: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`
- Create: `docs/delivery-evidence/unified-chat/simulator-control-matrix.md`

- [ ] Record checkout path, branch, commit, dirty state, installed binary/build provenance, Metro checkout, Metro port, backend environment, and test account before testing.
- [ ] On a signed-in Simulator, exercise every direct, proposal, native-handoff, supported-boundary, failure, retry, duplicate, and undo interaction family.
- [ ] Verify exact return targets, durable resume, stale-proposal recovery, truthful receipt copy, and no duplicate UI state.
- [ ] Verify every included capability is reachable by `navigation.open_capability` and returns to the same Chat thread.
- [ ] Run `npm run verify:changed -- --run` once after the implementation diff is final.
- [ ] Do not label Simulator proof as physical-device, TestFlight, or production proof.
- [ ] Commit evidence with message `test(chat): record simulator control parity`.

### Task 17: Validate the live hosted ChatGPT connector

**Files:**

- Modify: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`
- Create: `docs/delivery-evidence/unified-chat/chatgpt-control-matrix.md`

- [ ] Deploy migrations and Edge Functions only after explicit deployment authorization for that execution turn.
- [ ] Confirm OAuth discovery, authorization, refresh, revocation, `tools/list`, tool schema version, and account/household binding against the deployed connector.
- [ ] From ChatGPT developer mode, run the generated full-catalog matrix using disposable data.
- [ ] Complete native handoffs in Kwilt and verify ChatGPT observes the final receipt without claiming completion early.
- [ ] Test read-only token, missing write scope, revoked connector, wrong household, expired handoff, duplicate request, provider outage, and retry.
- [ ] Record the deployed function versions, catalog hash, OAuth client, target environment, and evidence timestamps.
- [ ] Do not label successful OAuth or `tools/list` as action coverage.
- [ ] Commit evidence with message `test(mcp): record live ChatGPT control parity`.

### Task 18: Validate signed-device voice and OS-owned actions

**Files:**

- Modify: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`
- Create: `docs/delivery-evidence/unified-chat/physical-device-control-matrix.md`

- [ ] Install a build with known branch/commit provenance on an entitlement-enabled physical iPhone and, for child controls, the intended child/shared device.
- [ ] Validate dictation, live voice, Phone continuation, interruption, stop, steer, correction, background/foreground, audio route, microphone denial, and proposal confirmation.
- [ ] Validate Screen Time authorization, token selection, rule update/deactivate/delete, monitoring, shielding, unshielding, child-device setup/release, and receipts.
- [ ] Validate notification permission, calendar permission, biometrics, camera/photo library, widgets handoff, OAuth connection, retailer handoff, and sharing review.
- [ ] Confirm all OS/provider cancellations return a recoverable truthful state and preserve the Chat thread.
- [ ] Record failures as failures; source tests and Simulator behavior cannot substitute.
- [ ] Commit evidence with message `test(chat): record signed-device control parity`.

### Task 19: Release, observe, and close the program

**Files:**

- Modify: `docs/delivery-evidence/unified-chat/conversational-control-program.yml`
- Modify: `docs/delivery-evidence/unified-chat.yml`
- Modify: `docs/job-flows/nina-trust-ai-with-my-life-system.md`
- Modify: relevant capability feature briefs and job-flow scores whose delivery actually changed

- [ ] Run the final no-exceptions gate:

```bash
npm run chat:control-parity
npm run test:chat-contracts
npm run mcp:smoke
npm run mcp:e2e
npm run verify:changed -- --run
```

Expected: zero included UI gaps, zero mobile/Phone/external pending providers, only Games/Explore excluded, all contract tests green.

- [ ] Deploy production Edge Functions and catalog with explicit authorization; verify health, catalog hash, migrations, and OAuth discovery.
- [ ] Build and submit the signed iOS build only with explicit release authorization. Record EAS build ID, commit, Apple processing state, TestFlight availability, and installed-build proof separately.
- [ ] Roll out by feature-flagged capability waves: reads, low-risk direct writes, reviewed writes, native handoffs, then consequential cross-household/provider operations.
- [ ] Watch failure, refusal, handoff-stall, duplicate, latency, and receipt-mismatch metrics through the defined observation window.
- [ ] Exercise the documented rollback for one operation in a non-production environment before broad rollout.
- [ ] Update job-flow delivery scores only from observed runtime evidence.
- [ ] Run `reflect-after-ship` after production evidence exists and record what users trusted, corrected, abandoned, or routed back to native UI.
- [ ] Commit final evidence/docs with message `docs(chat): close full conversational control program`.

## 8. Capability-wave release order

Execute Tasks 0-3 first. Then ship vertical slices in this order so each release is useful and bounded:

1. Household member authority and personal/family Screen Time.
2. Money plan, transaction truth, connection, and transfer review.
3. Activity-backed Chores, completion review, and rewards.
4. Recipes, Meal Plan, Groceries, and Savings.
5. Plan, Chapters, notifications, account settings, connected tools, sharing, and navigation.
6. Remaining existing mobile/Phone providers.
7. Voice conformance and complete ChatGPT exposure.
8. Security hardening, full matrices, signed-device proof, TestFlight, production rollout, and reflection.

Do not wait until the final wave to add ChatGPT or voice adapters for a capability. Each capability task must land its native action, local Chat adapter, server/handoff adapter, external registration, voice conformance row, focused tests, and evidence together. The later catalog-wide tasks find omissions and prove completeness.

## 9. Stop conditions

Stop the current execution task and ask Andrew before:

- deploying migrations or Edge Functions;
- changing OAuth scopes for an existing production client;
- submitting an iOS/TestFlight build;
- using real household or Money data for tests;
- creating a parallel worktree or handing implementation to subagents;
- choosing a destructive, non-restorable member/data deletion design;
- expanding the program to Games, Explore, authentication, paywall, or developer-only surfaces;
- changing a product truth boundary, such as treating payment, attestation, retailer checkout, Screen Time enforcement, or outside-app reward payout as completed inside Kwilt.

## 10. Plan self-review checklist

- [x] Confirm every one of the 33 gap clusters is represented in section 3.
- [x] Confirm the amended section 3 operation count is 88 and the corrected planned total is 233.
- [x] Confirm every current external pending-provider owner appears in Tasks 4-13: channels, chores, groceries, household, meal planning, Money, Recipes, Savings, and Screen Time.
- [x] Confirm local Chat, voice/Phone, ChatGPT, receipts, authorization, idempotency, native handoffs, live validation, physical Screen Time proof, deployment, observability, and rollback each have an explicit task.
- [x] Search the plan for placeholder markers, abbreviated implementation steps, and unresolved template brackets.
- [x] Confirm every product implementation task identifies exact files, focused tests, a completion gate, and a commit boundary.
- [x] Confirm the plan never equates source/tests, backend deployment, Simulator, physical device, TestFlight, submission, or public release.
- [x] Confirm Games and Explore are the only program-level exclusions.

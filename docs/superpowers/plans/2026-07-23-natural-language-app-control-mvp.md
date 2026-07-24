# Natural-Language App Control MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user control every capability currently available in Kwilt using ordinary language, with authoritative results and proportionate confirmation.

**Architecture:** Keep one semantic interpreter over `KWILT_OPERATION_REGISTRY`. Each operation delegates reading, validation, permission, mutation, receipt, and undo to the capability that already owns the behavior. Mobile Chat is the MVP runtime; timeline presentation and Phone Agent parity are follow-on work.

**Tech Stack:** React Native/Expo, TypeScript, Jest, `@kwilt/agent-runtime`, existing Kwilt capability services and store, hosted workbench protocol.

---

## File responsibility map

- `src/capabilities/operations.ts` — product-owned user-meaningful operations.
- `src/features/unifiedChat/chatCapabilityCoverage.ts` — conversational outcome or explicit boundary per operation.
- `src/features/unifiedChat/agentCapabilityEvalCases.ts` — ordinary utterances and expected operations.
- `src/features/unifiedChat/routeUnifiedChatRequest.ts` — deterministic shortcut versus semantic interpretation.
- `src/features/unifiedChat/runUnifiedChatTurn.ts` — interpretation through authoritative outcome.
- `src/features/unifiedChat/unifiedChatToolProvider.ts` — mobile capability-owned reads and actions.
- `src/features/unifiedChat/activityProposal*.ts` — Activity create/update/recurrence/reminder review and apply.
- `src/features/unifiedChat/planRecommendationTool.ts` and `planProposalExecutor.ts` — Plan read, recommendation, placement, and removal.
- `src/features/unifiedChat/goalProposal*.ts` — Goal review/apply and linked follow-on Activity.
- `src/features/unifiedChat/deviceToolProvider.ts` — native authorization and capability handoff.
- `components/unified-chat/KwiltChatWorkbench.tsx` in `kwilt-site` — thin clarification, review, and result rendering.

### Task 1: Make user outcomes the executable MVP contract

**Files:**
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.test.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.test.ts`

- [ ] **Step 1: Add the four standing scenarios and paraphrases**

Use this case shape:

```ts
type AppControlEvalCase = {
  prompt: string;
  expectedOperations: KwiltOperationId[];
  expectedOutcome: 'answer' | 'proposal_or_receipt' | 'native_review';
};
```

Add trash reminder, authoritative Plan tomorrow, walking Goal plus repeating Activity, and future Screen Time cases. Include at least two natural paraphrases per case.

- [ ] **Step 2: Run the focused tests and confirm they fail for missing compound outcomes**

Run:

```bash
npm test -- --runInBand src/features/unifiedChat/agentCapabilityEvalCases.test.ts
```

Expected: new compound-operation expectations fail before implementation.

- [ ] **Step 3: Require one utterance or boundary case per product operation**

Extend `chatCapabilityCoverage.test.ts` to compare covered operation ids with `KWILT_OPERATION_REGISTRY`. Missing operations must fail with their exact id.

- [ ] **Step 4: Run the contract tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts
git add src/features/unifiedChat/agentCapabilityEvalCases.ts src/features/unifiedChat/agentCapabilityEvalCases.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts
git commit -m "test: define natural language app control contract"
```

Expected: tests pass and the commit contains only the executable user contract.

### Task 2: Center each Chat turn on an ordered app-operation plan

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/types.ts`
- Modify: `packages/kwilt-agent-runtime/src/orchestrator.ts`
- Modify: `packages/kwilt-agent-runtime/src/orchestrator.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write a failing dependent-operation test**

Represent the interpreted request as:

```ts
type AppControlStep = {
  operationId: KwiltOperationId;
  arguments: Record<string, unknown>;
  dependsOn?: number;
};
```

Assert that a later operation consumes the authoritative id returned by the earlier step rather than a model-invented id.

- [ ] **Step 2: Run the focused runtime tests and confirm failure**

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/orchestrator.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
```

- [ ] **Step 3: Implement ordered capability execution**

Keep reads immediate, low-risk reversible capture eligible for direct apply, and consequential operations reviewable. Stop on required clarification or failed dependency.

- [ ] **Step 4: Normalize the visible outcome**

Use one outcome union:

```ts
type AppControlOutcome =
  | { type: 'answer'; text: string }
  | { type: 'clarification'; question: string }
  | { type: 'applied'; receiptIds: string[] }
  | { type: 'review'; proposalIds: string[] }
  | { type: 'native_handoff'; actionId: string }
  | { type: 'unsupported'; reason: string };
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/orchestrator.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
git add packages/kwilt-agent-runtime/src src/features/unifiedChat/runUnifiedChatTurn.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
git commit -m "refactor: center chat turns on app operations"
```

### Task 3: Complete recurring reminded Activity creation

**Files:**
- Modify: `src/features/unifiedChat/activityProposal.ts`
- Modify: `src/features/unifiedChat/activityProposal.test.ts`
- Modify: `src/features/unifiedChat/activityProposalExecutor.ts`
- Modify: `src/features/unifiedChat/activityProposalExecutor.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.test.ts`

- [ ] **Step 1: Write the trash-reminder conversation test**

Assert one request produces an Activity titled `Take out the trash`, weekly Tuesday recurrence, and a reminder at the supplied local time.

- [ ] **Step 2: Write the missing-time clarification test**

For “Tuesday night” without an exact stored time, expect:

```ts
{ type: 'clarification', question: 'What time Tuesday night should I remind you?' }
```

- [ ] **Step 3: Run tests and confirm both fail**

```bash
npm test -- --runInBand src/features/unifiedChat/activityProposal.test.ts src/features/unifiedChat/activityProposalExecutor.test.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts
```

- [ ] **Step 4: Reuse Activity capture, recurrence, and notification scheduling**

Do not create a Chat reminder model. Persist through the existing Activity recurrence fields and notification service.

- [ ] **Step 5: Prove reload and undo, then commit**

Assert hydration retains recurrence/reminder state and undo restores the previous Activity state.

```bash
npm test -- --runInBand src/features/unifiedChat/activityProposal.test.ts src/features/unifiedChat/activityProposalExecutor.test.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts
git add src/features/unifiedChat/activityProposal.ts src/features/unifiedChat/activityProposal.test.ts src/features/unifiedChat/activityProposalExecutor.ts src/features/unifiedChat/activityProposalExecutor.test.ts src/features/unifiedChat/unifiedChatToolProvider.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts
git commit -m "feat: create recurring reminded activities from chat"
```

### Task 4: Make Plan reads and selected apply authoritative

**Files:**
- Modify: `src/services/plan/loadPlanAgentContext.ts`
- Modify: `src/services/plan/loadPlanAgentContext.test.ts`
- Modify: `src/features/unifiedChat/planRecommendationTool.ts`
- Modify: `src/features/unifiedChat/planRecommendationTool.test.ts`
- Modify: `src/features/unifiedChat/executePlanProposalBatch.ts`
- Modify: `src/features/unifiedChat/executePlanProposalBatch.test.ts`
- Modify: `components/unified-chat/KwiltChatWorkbench.tsx` in `kwilt-site`
- Modify: `lib/unifiedChatPlanSelector.test.ts` in `kwilt-site`

- [ ] **Step 1: Write a failing authoritative Plan-read test**

Assert “What's on my Plan tomorrow?” reports explicitly planned Activities and scheduled calendar placements for the requested local date while distinguishing recommended-but-unplaced work.

- [ ] **Step 2: Write the selected-apply workbench test**

Assert pending Plan proposals render as one selectable list and emit one `proposal.decide_many` command containing only checked ids and versions.

- [ ] **Step 3: Run app and site tests and confirm failure**

```bash
npm test -- --runInBand src/services/plan/loadPlanAgentContext.test.ts src/features/unifiedChat/planRecommendationTool.test.ts src/features/unifiedChat/executePlanProposalBatch.test.ts
cd /Users/andrewwatanabe/kwilt-site
npm test -- --test-name-pattern "Plan"
```

- [ ] **Step 4: Implement through native Plan ownership**

Use `loadPlanAgentContext`, `@kwilt/plan-core`, and the existing sequential provider apply path. Do not rank or place items in the renderer.

- [ ] **Step 5: Prove partial failure and per-item undo**

Each provider event must have its own receipt; a failed item cannot mark the group applied.

- [ ] **Step 6: Run focused checks and commit separately in each repository**

Use `feat: complete conversational Plan control` for the app commit and `feat: add selected Plan recommendations from chat` for the site commit.

### Task 5: Turn a walking Goal into reliable follow-through

**Files:**
- Modify: `src/features/unifiedChat/goalProposal.ts`
- Modify: `src/features/unifiedChat/goalProposal.test.ts`
- Modify: `src/features/unifiedChat/goalProposalExecutor.ts`
- Modify: `src/features/unifiedChat/goalProposalExecutor.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write a failing Goal-plus-Activity test**

Assert the request creates a reviewable seven-day walking Goal and, after authoritative Goal creation, suggests one linked daily repeating Activity rather than seven unrelated Activities.

- [ ] **Step 2: Preserve authorship**

Assert Chat does not invent an Arc. If the user approves the repeating Activity, link it to the Goal id from the applied Goal receipt.

- [ ] **Step 3: Implement the dependent follow-on suggestion**

Keep Goal review and Activity capture as separate capability operations in one conversational thread.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/goalProposal.test.ts src/features/unifiedChat/goalProposalExecutor.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
git add src/features/unifiedChat/goalProposal.ts src/features/unifiedChat/goalProposal.test.ts src/features/unifiedChat/goalProposalExecutor.ts src/features/unifiedChat/goalProposalExecutor.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts
git commit -m "feat: suggest follow through after goal creation"
```

### Task 6: Make future capabilities conversational by registration

**Files:**
- Modify: `src/capabilities/operations.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.test.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `src/features/unifiedChat/deviceToolProvider.test.ts`

- [ ] **Step 1: Add a failing registration contract**

Assert a new operation without conversational coverage fails with its exact operation id.

- [ ] **Step 2: Prove the future Screen Time path**

Interpret child, app, and desired access, but return native review until household role, Apple authorization, device apply, and acknowledgement succeed.

- [ ] **Step 3: Keep unavailable capabilities honest**

Assert unavailable Money, Games, or Screen Time operations name the missing capability rather than inventing success or returning generic prose.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/chatCapabilityCoverage.test.ts src/features/unifiedChat/deviceToolProvider.test.ts
git add src/capabilities/operations.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts src/features/unifiedChat/deviceToolProvider.ts src/features/unifiedChat/deviceToolProvider.test.ts
git commit -m "test: require conversational coverage for app capabilities"
```

### Task 7: Prove the MVP in a signed build

**Files:**
- Modify: `docs/delivery-evidence/unified-chat.yml`
- Create: `docs/delivery-evidence/unified-chat/2026-07-23-natural-language-control.md`

- [ ] **Step 1: Run the complete local gate**

```bash
npm run verify:changed -- --run
```

- [ ] **Step 2: Run the typed matrix on a signed simulator**

Run trash reminder, Plan tomorrow, walking Goal, and Screen Time boundary from fresh threads and follow-ups.

- [ ] **Step 3: Verify authoritative state**

Inspect owning native surfaces, reload the app, and test undo where supported.

- [ ] **Step 4: Repeat text and voice on a physical device**

Keep simulator, signed physical-device, and TestFlight evidence separate.

- [ ] **Step 5: Record evidence and commit**

Record build SHA, device, commands, results, failures, and remaining boundaries without raising scores beyond the evidence.

## Self-review

- Spec coverage: directly covers trash reminder, Plan tomorrow, walking Goal follow-through, and future Screen Time.
- Reductive scope: mobile app control is required; timeline polish, Phone parity, and new native capabilities are deferred.
- Type consistency: work uses existing operation ids, capability providers, proposals, receipts, and native handoffs.
- No placeholder is required to begin Task 1.

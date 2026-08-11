# Unified Chat Semantic Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one bounded semantic planner own Unified Chat job interpretation, tool choice, evidence scope, and response shape while deterministic code enforces safety and action authority without cataloging ordinary prompt wording.

**Architecture:** Extend the existing low-reasoning agent judgment into the canonical turn-planning artifact, persist its authority and evidence decisions in the Turn Contract, and make context selection consume that contract. Deterministic classification remains a safety/fallback seed and the older semantic router remains an availability fallback; neither may override a coherent safe judgment with domain phrase locks.

**Tech Stack:** React Native, TypeScript, Jest, OpenAI Responses structured outputs, Kwilt capability manifest, durable Unified Chat run events, Next.js shared workbench.

---

## File map

- Create `docs/product/unified-chat-behavior-contract.md`: canonical product and engineering rules.
- Modify `docs/feature-briefs/unified-chat.md`, `docs/ai-chat-architecture.md`, and `src/features/unifiedChat/FEATURE.md`: link to the canonical contract and state the new proof boundary.
- Modify `src/features/unifiedChat/agentJudgment.ts`: structured authorization, evidence-scope, and response-contract fields.
- Modify `src/features/unifiedChat/agentJudgmentPrompt.ts`: semantic planning rules for recommendations, authority, broad review, and visible reasoning.
- Modify `src/features/unifiedChat/turnPlanningPhase.ts`: accept coherent semantic judgment unless a true deterministic invariant blocks it.
- Modify `src/features/unifiedChat/hybridRequestPolicy.ts`: reduce locks to the executable invariant allow-list.
- Modify `src/features/unifiedChat/requestPolicy.ts`: remove the Money incident phrase classifier while retaining safe fallback classification.
- Modify `src/features/unifiedChat/turnContract.ts`: durably preserve authority, evidence scope, and response contract with v1 read compatibility.
- Modify `src/features/unifiedChat/buildRunContext.ts` and `turnContextPhase.ts`: choose focused or broad evidence from the Turn Contract and publish truthful counted progress.
- Modify `src/features/unifiedChat/turnExecutionPhase.ts`: replace Money-specific grounding with the general reasoning and authorization contract.
- Add `unifiedChatBehaviorEvalCases.ts` and its tests: behavior families and live-model scoring.
- Add or modify focused Jest tests beside each pure logic or prompt builder change.
- Preserve the existing transaction evidence adapter and shared-workbench ordering/disclosure changes.

### Task 1: Establish the canonical contract and architectural ratchet

**Files:**
- Create: `docs/product/unified-chat-behavior-contract.md`
- Modify: `docs/feature-briefs/unified-chat.md`
- Modify: `docs/ai-chat-architecture.md`
- Modify: `src/features/unifiedChat/FEATURE.md`
- Modify: `src/features/unifiedChat/hybridRequestPolicy.ts`
- Test: `src/features/unifiedChat/hybridRequestPolicy.test.ts`

- [x] **Step 1: Add the canonical contract**

Document semantic job interpretation, action authority, tool selection, adaptive evidence, visible rationale, behavioral evaluations, and release proof as binding rules.

- [x] **Step 2: Write the failing deterministic-lock test**

Assert that ordinary Plan, relationship, and Money questions may reach agent judgment, while specialist, unsupported consequential, native-authorization, and unresolved referential-action boundaries remain locked.

- [x] **Step 3: Run the focused test and observe failure**

Run: `npm test -- --runInBand src/features/unifiedChat/hybridRequestPolicy.test.ts`

Expected: the current domain lock set prevents at least the Plan and Money semantic cases.

- [x] **Step 4: Replace the lock set with an exported invariant allow-list**

Use this exact set:

```ts
export const DETERMINISTIC_POLICY_INVARIANT_REASONS = new Set([
  'specialist-or-high-stakes-boundary',
  'native-capability-authorization-required',
  'unsupported-consequential-effect',
  'ambiguous-action-target',
]);
```

Both agent-judgment and semantic-routing decisions must consult this set.

- [x] **Step 5: Link the contract from the authoritative docs**

State that phrase fixtures are evaluations, not routes, and keep delivery score 2 at 3 until live-model and signed runtime proof pass.

### Task 2: Make the judgment artifact express the whole intended turn

**Files:**
- Modify: `src/features/unifiedChat/agentJudgment.ts`
- Modify: `src/features/unifiedChat/agentJudgmentPrompt.ts`
- Test: `src/features/unifiedChat/agentJudgment.test.ts`
- Test: `src/features/unifiedChat/agentJudgmentPrompt.test.ts`
- Test: `src/features/unifiedChat/turnPlanningPhase.test.ts`

- [x] **Step 1: Write failing parser and prompt tests**

Require these fields on strict model artifacts:

```ts
type AgentJudgmentAuthorization = 'none' | 'explicit_request' | 'accepted_prior_suggestion';
type AgentJudgmentEvidenceScope = 'none' | 'focused' | 'broad';
type AgentJudgmentResponseContract = 'direct' | 'evidence_linked';
```

Tests must reject a capability question with action authority, an action with no authority, private context with `evidenceScope: 'none'`, and a direct answer with `evidence_linked` private evidence.

- [x] **Step 2: Run the tests and observe strict-schema failures**

Run: `npm test -- --runInBand src/features/unifiedChat/agentJudgment.test.ts src/features/unifiedChat/agentJudgmentPrompt.test.ts`

- [x] **Step 3: Extend and validate the structured artifact**

Add the three fields to the JSON schema, exact-key parser, returned type, and coherence validation.

- [x] **Step 4: Teach the planner the general rules**

The prompt must explicitly say that recommendations and hypotheticals are read-only, explicit instructions or accepted concrete suggestions carry authority, broad system/pattern reviews use broad evidence, and private scratchpad is never requested or displayed.

- [x] **Step 5: Validate plans independently of model prose**

`hasCoherentExecutionPlan` must require no authority and only read tools for questions; action authority and at least one write tool for actions; and no tools, context, or authority for direct answers.

### Task 3: Persist intent and drive adaptive evidence from it

**Files:**
- Modify: `src/features/unifiedChat/turnContract.ts`
- Test: `src/features/unifiedChat/turnContract.test.ts`
- Modify: `src/features/unifiedChat/buildRunContext.ts`
- Test: `src/features/unifiedChat/buildRunContext.test.ts`
- Modify: `src/features/unifiedChat/turnContextPhase.ts`
- Test: `src/features/unifiedChat/turnContextPhase.test.ts`
- Modify: `src/features/unifiedChat/chatProgress.ts`
- Test: `src/features/unifiedChat/chatProgress.test.ts`

- [x] **Step 1: Write failing Turn Contract compatibility tests**

Version 2 persists `authorization`, `evidenceScope`, and `responseContract`; version 1 parses with safe defaults (`none`, `focused` when private, and `evidence_linked` when private).

- [x] **Step 2: Implement Turn Contract v2 with v1 reads**

New turns write v2. Corrections and retries inherit the prior action contract and the prior evidence/response decisions unless a valid new judgment supplies replacements.

- [x] **Step 3: Write failing focused-versus-broad evidence tests**

Focused selection retains relevance ranking and small budgets. Broad selection includes zero-term-overlap records from participating capabilities up to a visible ceiling of 120 and records omissions beyond the ceiling.

- [x] **Step 4: Implement semantic evidence scope**

Add `evidenceScope` to `buildRunContext`. Remove keyword-driven `broadMoneyReview`; pass `turnContract.evidenceScope` from `turnContextPhase`.

- [x] **Step 5: Publish counted evidence progress**

Build labels from actual included object types, for example `Reviewing 63 transactions and 12 budgets`, with a generic counted fallback. Use `Comparing what Kwilt found` only when an evidence-linked response is actually being composed.

### Task 4: Generalize response reasoning and authorization grounding

**Files:**
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Test: `src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts`
- Test: `src/features/unifiedChat/groundedAnswer.test.ts`

- [x] **Step 1: Write a failing general-grounding test**

An evidence-linked read-only judgment across any capability must request conclusion, observations, inference, uncertainty, and explicit no-change truth. An authorized action judgment must not receive the no-action instruction.

- [x] **Step 2: Remove `buildMoneyReviewGrounding`**

Replace it with a general function derived only from the judgment/Turn Contract:

```ts
buildTurnResponseGrounding({ authorization, evidenceScope, responseContract })
```

- [x] **Step 3: Keep model prose subordinate to outcome truth**

Ensure write tools are selected only for coherent authorized action judgments, while proposals, client actions, and receipts continue to control visible completion claims.

### Task 5: Turn incidents into behavior families

**Files:**
- Create: `src/features/unifiedChat/unifiedChatBehaviorEvalCases.ts`
- Create: `src/features/unifiedChat/unifiedChatBehaviorEvalCases.test.ts`
- Modify: `src/features/unifiedChat/requestRoutingEvalCases.ts`
- Test: `src/features/unifiedChat/requestRoutingEvalCases.test.ts`

- [x] **Step 1: Add analysis-versus-action behavior families**

Add at least ten Money/system-review variants: natural paraphrases, action-like words used analytically, dictation-like wording, a cross-capability review, explicit category creation, explicit rename, acceptance of a prior suggestion, ambiguous mutation, focused transaction lookup, and missing-data review.

- [x] **Step 2: Add expected authority, evidence scope, and response contract**

Static tests verify complete expectations and registered tool ownership. Live evaluation reports separate authority, evidence-scope, and response-contract match rates, with zero unauthorized-write cases.

- [x] **Step 3: Keep the incident transcript as evidence, not production logic**

Remove `MONEY_PLAN_RECOMMENDATION_PATTERN` and its deterministic lock. The original prompt remains only in the evaluation corpus and regression integration test.

### Task 6: Reconcile the workbench and verify the full change

**Files:**
- Preserve: `src/features/unifiedChat/capabilityAdapters.ts`
- Preserve: `src/features/unifiedChat/buildWorkbenchSnapshot.ts`
- Preserve companion repo: `components/unified-chat/KwiltChatWorkbench.tsx`
- Preserve companion repo: `lib/unifiedChatTurnPresentation.ts`

- [x] **Step 1: Verify transaction evidence and return targets**

Run the adapter and workbench snapshot tests, confirming transactions remain inspectable and proposals retain old-to-new fields.

- [x] **Step 2: Run all focused Unified Chat suites**

Run: `npm test -- --runInBand --findRelatedTests` for every modified Unified Chat source file.

- [x] **Step 3: Run the repository completion gate**

Run: `npm run verify:changed -- --base origin/main --run`

Report unrelated Plan/calendar changes separately because they share the checkout but are outside this implementation.

- [x] **Step 4: Verify the companion workbench**

Run its test suite, lint, production build, and responsive browser inspection. Confirm evidence/action support remains above the assistant footer and no development fixture remains.

- [x] **Step 5: Record the honest proof boundary**

Source, tests, local browser rendering, and build proof do not establish a deployed planner, signed-device behavior, live-model quality, or production release. Leave those gates explicit in the behavior contract, feature record, and final handoff.

## Execution result

Implemented on 2026-08-11. Focused Unified Chat tests, the full Jest suite at the verified snapshot, product lint, Chat delivery contracts, companion workbench tests, and companion production build pass. App source typecheck also passed before concurrent Plan edits advanced further in the shared checkout. The checkout-wide completion command was run but remains blocked by that unrelated Plan work: its code-health ratchet reports `PlanPager.tsx` growth, current source and test typechecks report incomplete `PlanPager.tsx` session-editor integration, and architecture lint reports increased unmarked brand-green use in `PlanSlotCapturePage.tsx`. Live-model, authenticated Money data, signed-device, and production-release gates remain intentionally open.

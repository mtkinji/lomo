# Unified Chat Five-Star Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every step of Kwilt Chat's accepted ten-step job map genuinely 5/5 through shipped behavior, durable records, automated conformance coverage, and simulator/device evidence.

**Architecture:** Continue from the merged standalone Unified Chat foundation. Native Kwilt owns identity, persistence, orchestration, capability policy, mutations, receipts, and exact return; the credential-free Kwilt-hosted workbench projects versioned snapshots and emits validated commands. Goals, To-dos, and Chapters provide the first bounded capability adapters, while legacy workflow chat remains isolated until an explicit convergence review.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9, Jest, Supabase/Postgres with RLS, Next.js workbench host, React Native WebView protocol v2, PostHog state-transition analytics.

---

## Score contract

The product score is evidence, not aspiration:

- `1` — mostly absent or represented only by strategy.
- `2` — partial local behavior without the durable trust contract.
- `3` — credible end-to-end behavior with important gaps.
- `4` — complete implementation with automated coverage, awaiting required runtime proof or one bounded resilience gap.
- `5` — shipped behavior, focused automated coverage, cross-repository protocol conformance where applicable, and the required simulator/physical-device evidence.

No documentation edit may raise a step to `5` unless `npm run chat:delivery-lint` can resolve its code, test, and runtime-evidence references.

## File map

### Product traceability

- `docs/feature-briefs/unified-chat.md` — accepted ten-step product contract.
- `docs/feature-briefs/unified-chat-foundation.md` — shipped foundation and coexistence boundary.
- `docs/delivery-evidence/unified-chat.yml` — machine-readable score and evidence ledger.
- `docs/delivery-evidence/unified-chat/README.md` — runtime evidence naming and privacy rules.
- `scripts/chat-delivery-lint.mjs` — validate score claims and referenced evidence.
- `scripts/chat-delivery-lint.test.mjs` — prove invalid 5/5 claims fail.
- `scripts/product-lint.mjs` — invoke delivery-evidence validation.
- `scripts/verify-changed.mjs` — select the delivery gate for Chat docs/code.

### Durable kernel

- `supabase/migrations/<generated>_unified_chat_trust_contract.sql` — context, events, evidence, proposals, operations, decisions, receipts, feedback, idempotency, and undo records with owner RLS.
- `src/features/unifiedChat/types.ts` — product-owned durable types.
- `src/features/unifiedChat/threadRepository.ts` — typed persistence and authoritative reloads.
- `src/features/unifiedChat/threadRepository.test.ts` — mapping, ownership-query, and idempotency coverage.
- `src/features/unifiedChat/runStateMachine.ts` — legal run transitions and stop/steer semantics.
- `src/features/unifiedChat/runStateMachine.test.ts` — transition coverage.
- `src/features/unifiedChat/workbenchProtocol.ts` — protocol v2 snapshot/command contract.
- `src/features/unifiedChat/workbenchProtocol.test.ts` — unknown, stale, duplicate, and malformed message rejection.

### Routing and capability ownership

- `src/features/unifiedChat/requestPolicy.ts` — request classification and least-privilege route policy.
- `src/features/unifiedChat/requestPolicy.test.ts` — general/context/question/action/native-control/specialist fixtures.
- `src/features/unifiedChat/capabilityContracts.ts` — context, evidence, action, receipt, undo, and return interfaces.
- `src/features/unifiedChat/capabilityRegistry.ts` — participating adapter registry.
- `src/features/unifiedChat/adapters/goalsChatAdapter.ts` — Goal context/evidence/proposal policy.
- `src/features/unifiedChat/adapters/todosChatAdapter.ts` — Activity evidence, idempotent mutation, receipt, correction, undo, and return.
- `src/features/unifiedChat/adapters/chaptersChatAdapter.ts` — read-only retrospective evidence.
- `src/features/unifiedChat/adapters/*.test.ts` — deterministic adapter conformance.
- `src/features/unifiedChat/buildRunContext.ts` — bounded selection with inclusion, omission, freshness, authority, and sufficiency.
- `src/features/unifiedChat/buildRunContext.test.ts` — retrieval budget and coverage fixtures.
- `src/features/unifiedChat/runUnifiedChatTurn.ts` — orchestration over durable records and adapters.
- `src/features/unifiedChat/runUnifiedChatTurn.test.ts` — full request-to-receipt scenarios.

### Native host and workbench

- `src/features/unifiedChat/UnifiedChatScreen.tsx` — global/contextual/resumed entry, native services, bridge commands, exact return.
- `src/features/unifiedChat/useUnifiedChatController.ts` — branchy native orchestration extracted from the screen.
- `src/features/unifiedChat/useUnifiedChatController.test.ts` — lifecycle, stop/steer, proposal, retry, and stale-command coverage.
- `src/features/unifiedChat/buildWorkbenchSnapshot.ts` — project durable state into visible scope/evidence/proposal/receipt cards.
- `/Users/andrewwatanabe/kwilt-site/lib/unifiedChatProtocol.ts` — matching protocol v2 validation.
- `/Users/andrewwatanabe/kwilt-site/components/unified-chat/KwiltChatWorkbench.tsx` — visible context tray, active composer, stop/steer, evidence, proposal, receipt, and correction.
- `/Users/andrewwatanabe/kwilt-site/components/unified-chat/*.test.tsx` — workbench behavior and accessibility coverage.

## Task 1: Make delivery scores mechanically honest

- [x] **Step 1: Write failing delivery-lint tests**

Create `scripts/chat-delivery-lint.test.mjs` with fixtures proving that a `5` fails when code, test, simulator, or physical-device evidence is missing and that scores `1`–`4` can record explicit gaps.

```js
test('rejects a five without complete evidence', () => {
  const errors = validateChatDeliveryLedger({
    steps: [{ id: 1, score: 5, code: [], tests: [], runtime_evidence: [] }],
  }, { exists: () => false });
  assert.match(errors.join('\n'), /score 5 requires code evidence/);
});
```

- [x] **Step 2: Run the test and verify red**

Run: `node --test scripts/chat-delivery-lint.test.mjs`

Expected: FAIL because `chat-delivery-lint-lib.mjs` does not exist.

- [x] **Step 3: Implement the validator and ledger**

Create `scripts/chat-delivery-lint-lib.mjs`, `scripts/chat-delivery-lint.mjs`, and `docs/delivery-evidence/unified-chat.yml`. Require ten unique steps, integer scores `1..5`, existing `code`, `tests`, and `runtime_evidence` paths, plus `simulator` and `physical_device` evidence for score 5.

```js
export function validateChatDeliveryLedger(ledger, io = { exists: fs.existsSync }) {
  const errors = [];
  const steps = Array.isArray(ledger?.steps) ? ledger.steps : [];
  if (steps.length !== 10) errors.push('unified Chat ledger must contain exactly ten steps');
  for (const step of steps) {
    if (!Number.isInteger(step.score) || step.score < 1 || step.score > 5) {
      errors.push(`step ${step.id}: score must be an integer from 1 to 5`);
    }
    if (step.score === 5) {
      for (const field of ['code', 'tests', 'runtime_evidence']) {
        if (!Array.isArray(step[field]) || step[field].length === 0) {
          errors.push(`step ${step.id}: score 5 requires ${field.replace('_', ' ')} evidence`);
        }
      }
      if (!step.proof?.simulator || !step.proof?.physical_device) {
        errors.push(`step ${step.id}: score 5 requires simulator and physical-device proof`);
      }
    }
  }
  return errors;
}
```

- [x] **Step 4: Wire the validator into development gates**

Add `chat:delivery-lint` to `package.json`; call it from `product:lint`; add it to `verify-changed` when `src/features/unifiedChat/`, the Chat briefs, or delivery evidence changes.

- [x] **Step 5: Run focused and product verification**

Run:

```bash
node --test scripts/chat-delivery-lint.test.mjs
npm run chat:delivery-lint
npm run product:lint
```

Expected: all pass while the ledger retains honest non-5 scores and named gaps.

## Task 2: Reconcile the accepted contract with the shipped foundation

- [x] Add the accepted `docs/feature-briefs/unified-chat.md` to this implementation branch.
- [x] Keep `unified-chat-foundation.md` as a shipped/accepted tranche rather than letting the `unifiedChat` feature status imply the full contract shipped.
- [x] Update `src/features/unifiedChat/FEATURE.md` so both briefs are listed and the body distinguishes shipped foundation from active full delivery.
- [x] Update `docs/job-flows/nina-trust-ai-with-my-life-system.md` to link the evidence ledger without raising its scores.
- [x] Run `npm run product:lint` and `npm run agent:map`.

## Task 3: Add the durable trust schema

- [x] Use `supabase migration new unified_chat_trust_contract` to create the migration filename.
- [x] Add owner-scoped tables for `kwilt_agent_context_refs`, `kwilt_agent_run_events`, `kwilt_agent_evidence_refs`, `kwilt_agent_proposals`, `kwilt_agent_proposal_operations`, `kwilt_agent_decisions`, `kwilt_agent_mutation_receipts`, and `kwilt_agent_feedback`.
- [x] Add a unique `(user_id, capability_id, idempotency_key)` index for applied operations and ordered `(run_id, sequence)` indexes for events/evidence.
- [x] Enable RLS, grant only `authenticated`, and require both `auth.uid() = user_id` and ownership of the parent thread/run/proposal in insert/update policies.
- [x] Add and run rollback-only SQL assertions for cross-user denial, duplicate apply rejection, and parent-ownership checks.
- [x] Apply the migration to the linked Kwilt project, verify the live RLS tables/policies/RPCs, and run Supabase advisors. Local Docker verification remains unavailable.

The central receipt shape is:

```ts
type MutationReceipt = {
  id: string;
  proposalId: string;
  operationId: string;
  capabilityId: 'todos';
  idempotencyKey: string;
  status: 'applied' | 'failed' | 'undone';
  resultingObject: CapabilityObjectRef | null;
  returnTarget: CapabilityRouteTarget | null;
  undoOperation: CapabilityOperation | null;
  appliedAt: string | null;
};
```

## Task 4: Implement legal run and proposal transitions

- [x] Write failing transition-table tests for queued, active, stopped, steered, partial, failed, complete, pending proposal, edited, rejected, deferred, approved, applying, applied, failed, and undone.
- [x] Implement pure `transitionRun` and `transitionProposal` functions that reject stale version numbers and terminal-state rewrites.
- [x] Persist every accepted transition as an ordered event.
- [x] Verify duplicate and out-of-order events cannot create contradictory snapshots.

```ts
const RUN_TRANSITIONS = {
  queued: ['active', 'stopped', 'failed'],
  active: ['steered', 'partial', 'stopped', 'complete', 'failed'],
  steered: ['active', 'partial', 'stopped', 'complete', 'failed'],
  partial: ['active', 'stopped', 'complete', 'failed'],
  stopped: [], complete: [], failed: [],
} as const;
```

## Task 5: Classify requests without attaching private context by default

- [x] Write table-driven tests for the six accepted request classes.
- [x] Implement a deterministic first-pass policy using explicit launch/context/action signals; allow the model to choose only within the bounded candidate routes supplied by native Kwilt.
- [x] Persist request class, participating capabilities, context policy, and clarification state on the run.
- [x] Prove a general question sends no personal context and invokes no capability adapter.
- [x] Prove a capability action cannot apply without an approved typed proposal.

```ts
export type UnifiedChatRequestClass =
  | 'general'
  | 'general_with_kwilt_context'
  | 'capability_question'
  | 'capability_action'
  | 'native_control'
  | 'better_served_elsewhere';
```

## Task 6: Add bounded Goals, To-dos, and Chapters evidence adapters

- [x] Define `CapabilityChatAdapter` with separate context, evidence, proposal, apply, receipt, undo, and return roles.
- [x] Implement deterministic adapters over the current app store/domain services.
- [x] Assign authority, freshness, provenance, inclusion reason, omission reason, and sufficiency to every evidence selection.
- [x] Enforce a per-capability and total evidence budget.
- [x] Keep Chapters read-only and Arcs out of the apply path.

```ts
export type EvidenceRef = {
  id: string;
  runId: string;
  capabilityId: CapabilityId;
  object: CapabilityObjectRef;
  authority: 'authoritative' | 'derived' | 'user_supplied';
  freshness: { observedAt: string; class: 'current' | 'recent' | 'stale' | 'unknown' };
  includedBecause: string;
  coverage: { sufficient: boolean; omittedCount: number; note?: string };
};
```

## Task 7: Orchestrate durable turns and restrained answers

- [x] Replace the one-request `sendCoachChat` pass-through with a staged orchestrator: classify, select context, persist evidence, request answer/proposal, persist visible output, and finalize the run.
- [x] Append user-legible run events before each durable phase without exposing hidden reasoning.
- [x] Sanitize visible assistant text before persistence and again at every outbound surface.
- [x] Support stop through `AbortController` and steer through a new durable instruction event followed by an explicit resumed run segment.
- [x] Make retry resume from durable state without duplicating the user message, proposal, or mutation.

## Task 8: Implement one complete Activity proposal-to-receipt path

- [x] Generate only a typed `create_activity` or bounded `update_activity` proposal in the first slice.
- [x] Support edit, reject, defer, and approve as durable decision records.
- [x] Apply through the To-dos adapter with an idempotency key and reload the authoritative Activity before returning success.
- [x] Persist a receipt with object id, resulting state summary, exact return target, and undo operation.
- [x] Implement undo as another idempotent capability operation and authoritative receipt.
- [x] Reserve the receipt before native mutation and reconcile reserved/applied crash windows on thread recovery.

## Task 9: Upgrade the native bridge and hosted workbench

- [x] Version both repositories to protocol v2 with shared JSON fixtures and a Giraffed v1 compatibility adapter.
- [x] Render removable launch-context chips separately from retrieved evidence.
- [x] Keep the composer enabled during active runs; send becomes stop and a new message becomes steer.
- [x] Render evidence, limits, proposal, decision, receipt, return, correction, and undo states.
- [x] Reject unknown commands, repeated request ids, stale entity versions, and commands for records outside the active thread.
- [x] Keep credentials and capability data access out of workbench JavaScript.
- [x] Route native text-document picking through the host, persist message and attachments atomically, and keep document contents out of workbench JavaScript.

## Task 10: Prove each step and only then raise scores

- [x] Run `npm run verify:changed -- --run` in Kwilt.
- [x] Run all Unified Chat Jest suites and Supabase function/schema checks.
- [x] Run `npm test` and `npm run build` in `kwilt-site`.
- [x] Run shared protocol fixtures in Kwilt, `kwilt-site`, and Giraffed's compatibility adapter.
- [ ] Exercise all ten steps signed in on an iPhone simulator and store sanitized evidence under `docs/delivery-evidence/unified-chat/`.
- [ ] Separately exercise keyboard, safe area, focus, accessibility, voice, attachment, stop, steer, background/foreground, exact return, correction, and undo on a signed physical iPhone.
- [ ] Update ledger and job-flow scores to `5` only after every referenced proof exists and `npm run chat:delivery-lint` passes.

## Self-review

- Spec coverage: all ten job steps map to a durable artifact, implementation owner, test family, and runtime proof requirement.
- Product boundary: the workbench owns interaction projection; Kwilt capabilities own evidence meaning, mutation policy, receipts, undo, and native return.
- Scope integrity: general questions remain supported without becoming the competitive thesis; Goals, To-dos, and Chapters prove the first complete vertical slice.
- Testing posture: state machines, routing, evidence selection, persistence, protocol, idempotency, and mutation paths are TDD-required; presentational styling remains implementation-first with accessibility and runtime proof.
- No false completion: the ledger cannot award a 5 from prose or passing unit tests alone.

# Unified Chat Operational Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist one typed actionable-turn contract and use it to keep routing, evidence resolution, tools, visible outcomes, and incident operations truthful across correction and retry turns.

**Architecture:** Keep the canonical capability manifest as the catalog of individual actions, then derive and persist a versioned Turn Contract whose target selector is independent of operation identity. Context authorization resolves the matching target set, the runtime composes the existing typed write over that set with a target-derived call budget, and outcome projection rejects partial coverage before proposals persist.

**Tech Stack:** TypeScript, React Native Unified Chat, `@kwilt/agent-runtime`, Jest, PostHog analytics, durable Supabase run-event payloads.

---

### Task 1: Prove bulk is not a second action registry

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/capabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Test: `packages/kwilt-agent-runtime/src/capabilityManifest.test.ts`

- [x] Add a failing projection test proving operations do not expose capability-specific bulk metadata.
- [x] Remove action-resolution modes, target types, limits, and correction flags from the canonical manifest.
- [x] Keep individual action schemas, providers, confirmation, receipts, and undo capability-owned.
- [x] Run the focused package test; it passes.

### Task 2: Durable Turn Contract

**Files:**
- Create: `src/features/unifiedChat/turnContract.ts`
- Create: `src/features/unifiedChat/turnContract.test.ts`
- Modify: `src/features/unifiedChat/turnPlanningPhase.ts`
- Modify: `src/features/unifiedChat/hybridRequestPolicy.ts`
- Modify: `src/features/unifiedChat/hybridRequestPolicy.test.ts`

- [x] Add failing tests for contract construction, latest-contract loading, correction/retry referents, constraint preservation, and legacy-thread fallback.
- [ ] Run both focused suites; expect missing exports and legacy policy behavior to fail.
- [x] Implement the schema, parser, structural referential-turn classifier, judgment-backed operation identity, generic target scope/query, and hybrid-policy inheritance from the latest contract.
- [x] Return the contract from planning and pass it through the coordinator.
- [x] Run the focused suites; all contract and policy cases pass.

### Task 3: Persist and consume capability resolution

**Files:**
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/turnContextPhase.ts`
- Modify: `src/features/unifiedChat/turnContextPhase.test.ts`
- Modify: `src/features/unifiedChat/buildRunContext.ts`
- Modify: `src/features/unifiedChat/buildRunContext.test.ts`

- [x] Add failing tests proving the scope event persists the Turn Contract and all-matching resolution works for Money, Goals, Activities, and Chapters without operation registration.
- [x] Pass the Turn Contract into context authorization and derive matching object types from the preserved target query and typed evidence.
- [x] Derive evidence and tool-call budgets from the resolved target count rather than a per-action maximum.
- [x] Preserve ordinary question and selected-object evidence budgets.
- [x] Run focused context tests; all target-set cases pass.

### Task 4: Deterministic action truth and invariants

**Files:**
- Create: `src/features/unifiedChat/turnOutcomeTruth.ts`
- Create: `src/features/unifiedChat/turnOutcomeTruth.test.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts`

- [x] Add failing tests for prepared, failed, access-contradiction, incomplete-target, partial-target, and unapplied-success states.
- [ ] Run focused tests; expect missing truth projection to fail.
- [x] Collect target coverage generically from individual and nested typed write arguments.
- [x] Discard partial proposal/client-action batches before persistence.
- [x] Integrate deterministic truth after the tool loop and before visible text is returned.
- [x] Run focused suites; every action state passes.

### Task 5: Incident replay and operational measures

**Files:**
- Create: `src/features/unifiedChat/operationalIncidentEvalCases.ts`
- Create: `src/features/unifiedChat/operationalIncidentEvalCases.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.test.ts`
- Modify: `src/services/analytics/events.ts`
- Modify: `docs/delivery-evidence/unified-chat.yml`

- [x] Add a failing structural replay for the Money emoji correction and retry transcript, plus cross-capability and metrics assertions for target scope, evidence, proposals, failed tools, and invariant codes.
- [ ] Run focused suites; expect missing incident and metric projections to fail.
- [x] Implement privacy-bounded fixtures and telemetry projection; connect it to the turn coordinator without persisting labels or message prose.
- [x] Update delivery evidence with source proof while leaving signed runtime gaps explicit.
- [x] Run incident and telemetry tests.

### Task 6: Full verification and review

**Files:**
- Review every file in `git diff --name-only`.

- [ ] Run `git diff --check`; expect no output.
- [ ] Run `npm run verify:changed -- --run`; expect every required gate to pass.
- [ ] Run `npm test -- --runInBand`; expect the full Jest suite to pass because the shared agent runtime and coordinator changed.
- [ ] Inspect `git diff`, verify no unrelated user work was changed, and document source/runtime/deployment proof boundaries.

Commits and publication are intentionally omitted from execution because the user did not request staging, committing, pushing, or a pull request.

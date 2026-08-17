# Chat Recipe Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Unified Chat stage and apply reviewed Recipe create, update, and delete operations through Recipe-owned persistence.

**Architecture:** Extend the existing typed proposal union and mobile runtime tool provider with Recipe operations. A focused Recipe proposal parser converts bounded Chat inputs into strict `ReviewedRecipeData`; a Recipe decision executor owns approval, repository mutation, store refresh, and shared receipts.

**Tech Stack:** TypeScript, React Native, Zustand, Jest, Supabase RPC-backed Recipe repository, Kwilt agent runtime.

---

### Task 1: Recipe proposal contract

**Files:** create `src/features/unifiedChat/recipeProposal.ts`; create `src/features/unifiedChat/recipeProposal.test.ts`; modify `src/features/unifiedChat/capabilityContracts.ts`; modify `src/features/unifiedChat/capabilityAdapters.ts`.

- [ ] Write failing tests for creating strict reviewed data and for patching a full current Recipe version without dropping fields.
- [ ] Run `npm test -- --runInBand src/features/unifiedChat/recipeProposal.test.ts` and confirm the missing contract fails.
- [ ] Implement bounded create/patch parsing and advertise Recipe operations in the adapter.
- [ ] Re-run the focused test.

### Task 2: Tool staging and persistence mapping

**Files:** modify `src/features/unifiedChat/unifiedChatToolProvider.ts`; modify `src/features/unifiedChat/turnExecutionPhase.ts`; modify `src/features/unifiedChat/types.ts`; modify `src/features/unifiedChat/threadRepository.ts`; create or extend focused tests beside each module.

- [ ] Write failing tests showing Recipe writes are selected, staged as explicit proposals, and round-trip through repository mapping.
- [ ] Implement Recipe proposal union members, provider staging, runtime inclusion, target mapping, and receipt capability mapping.
- [ ] Run the focused tool, phase, and repository tests.

### Task 3: Approved Recipe execution

**Files:** create `src/features/unifiedChat/executeRecipeProposalDecision.ts`; create `src/features/unifiedChat/executeRecipeProposalDecision.test.ts`; modify `src/features/unifiedChat/UnifiedChatScreen.tsx`.

- [ ] Write failing tests for approve create/update/delete and reject/defer no-op behavior.
- [ ] Implement reservation, Recipe repository save/delete, store refresh, receipt finalization, and proposal transitions.
- [ ] Route single and batch proposal decisions to the Recipe executor.
- [ ] Run focused executor and screen typechecks/tests.

### Task 4: Verification and review

**Files:** all changed files above.

- [ ] Run all focused Unified Chat and agent-runtime tests touched by the change.
- [ ] Run `npm run product:lint`.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Review `git diff --check`, the scoped diff, and record Simulator/signed-device proof as still pending if no runtime QA is performed.

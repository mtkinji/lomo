# Unified Chat Semantic Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Unified Chat interpret natural paraphrases through a structured model-assisted router while preserving deterministic safety gates, safe fallback, and a migration ledger for the legacy agent's real capabilities.

**Architecture:** A pure hybrid-policy resolver combines the existing lexical policy with a strictly parsed semantic route. High-stakes and native-control boundaries remain deterministic; exact low-risk capture may retain its fast path; all other requests may use the semantic route when confidence is sufficient. The semantic call is an internal lightweight helper and does not consume a second user credit. The live run persists only the resolved policy, so downstream evidence, proposals, and receipts keep their existing contracts.

**Tech Stack:** TypeScript, Jest, React Native service layer, OpenAI-compatible structured output through the existing Kwilt AI proxy.

---

### Task 1: Legacy capability coverage contract

**Files:**
- Create: `src/features/unifiedChat/legacyAgentCapabilityInventory.ts`
- Create: `src/features/unifiedChat/legacyAgentCapabilityInventory.test.ts`

- [ ] Define one typed inventory row per legacy tool/workflow, including legacy id, runtime destination, provider, migration state, and safety note.
- [ ] Test exact coverage of profile, Activity Guidance, Goal creation, and Arc creation assets.
- [ ] Keep migration state `planned` for operations that still use legacy direct writes.

### Task 2: Structured semantic route contract

**Files:**
- Create: `src/features/unifiedChat/semanticRequestRouter.ts`
- Create: `src/features/unifiedChat/semanticRequestRouter.test.ts`

- [ ] Write failing parser tests for valid routes, unknown capabilities, malformed confidence, hidden private-context requests, and unsupported fields.
- [ ] Define a strict JSON response schema and parser for request class, capability ids, private-context need, confidence, and concise reason.
- [ ] Build a bounded router prompt from current text, visible context labels/types, recent user/assistant turns, and live capability descriptions.

### Task 3: Hybrid deterministic and semantic policy

**Files:**
- Create: `src/features/unifiedChat/hybridRequestPolicy.ts`
- Create: `src/features/unifiedChat/hybridRequestPolicy.test.ts`
- Modify: `src/features/unifiedChat/requestPolicy.ts`

- [ ] Write failing tests proving specialist and native-control boundaries cannot be overridden.
- [ ] Test semantic correction of `Plan a lighter day for me tomorrow`, `put the school call after lunch`, Goal rename, and cross-capability review paraphrases.
- [ ] Test safe lexical fallback for missing, malformed, and low-confidence semantic routes.
- [ ] Implement the smallest resolver satisfying those invariants.

### Task 4: Internal semantic-model adapter

**Files:**
- Modify: `src/services/ai.ts`
- Create: `src/features/unifiedChat/routeUnifiedChatRequest.ts`
- Create: `src/features/unifiedChat/routeUnifiedChatRequest.test.ts`

- [ ] Add an internal-helper credit policy allowed only with the `lightweight_helper` AI job.
- [ ] Test that normal Chat calls consume a user attempt while the semantic helper is exempt.
- [ ] Call the existing structured-output transport with the router schema and parse failures as `null` rather than breaking the user turn.

### Task 5: Live turn integration

**Files:**
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] Inject a semantic-router dependency for deterministic tests.
- [ ] Resolve the hybrid policy before creating the durable run.
- [ ] Persist semantic route reason and participating capabilities without exposing raw reasoning.
- [ ] Prove model-router failure falls back and the existing general, grounded, To-do, and Plan paths remain intact.

### Task 6: Adversarial routing evaluation

**Files:**
- Create: `src/features/unifiedChat/requestRoutingEvalCases.ts`
- Create: `src/features/unifiedChat/requestRoutingEvalCases.test.ts`

- [ ] Encode representative paraphrases across general, Plan, Activities, Goals, Chapters, native control, high-stakes boundaries, follow-ups, and cross-capability requests.
- [ ] Test deterministic locked cases and hybrid semantic fixtures independently of a network model.
- [ ] Document intentionally unsupported action routes instead of expecting false completion.

### Task 7: Verification

**Files:**
- Modify as required by generated code map and product lint only.

- [ ] Run focused Jest tests for all new routing contracts.
- [ ] Run `npm run lint` and `npm run lint:tests`.
- [ ] Run `npm run product:lint` and `npm run architecture:lint`.
- [ ] Run `npm run verify:changed -- --run`.

# Unified Chat Reliability and Universal Action Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make typed and spoken Kwilt Chat a durable, trustworthy way to perform every supported user action, and expose the same governed action surface to ChatGPT and Codex through an OAuth MCP connection plus generated Kwilt skills.

**Architecture:** Keep Kwilt's database and capability services authoritative. Replace manifest-asserted tool availability with handler-backed provider registries; route UI, typed Chat, spoken Chat, and external MCP calls through the same capability-owned action contracts; run conversations as durable server-owned runs using the OpenAI Responses API; and make every action return a canonical receipt, review proposal, native handoff, or explicit unavailable result. Realtime voice may narrate and invoke a durable run, but it never owns business mutations.

**Tech Stack:** React Native / Expo SDK 54, TypeScript, Jest, Supabase Postgres and Edge Functions, OpenAI Responses API and Realtime API, JSON Schema, OAuth 2.1, MCP, Codex plugin skills.

---

## Execution posture

- Execute in the existing `/Users/andrewwatanabe/Kwilt` checkout on `feature/chat-enhancements`. The repository instruction against automatic worktrees overrides the generic planning-skill default.
- Before every task, re-read `git status --short`, the current branch/HEAD, and every affected file. Preserve unrelated Money, Household, Settings, and live-conversation work already in the worktree.
- Finish and checkpoint the in-progress mobile background-continuity slice before changing overlapping Chat runtime files.
- Apply the Kwilt pragmatic TDD rule: pure logic, prompt builders, queues, policy, Supabase functions, and bug fixes are regression-first. Presentational UI tests are required only for state, accessibility, or meaningful regression risk.
- Stage only the files named in the task. Never use `git add -A` in this dirty checkout.
- Run `npm run verify:changed -- --run` once at the end of each project, not after every task. Backend deployment, signed-app runtime proof, ChatGPT review, and public release are separate gates.

## Control-plane draft

The Kwilt control-plane MCP tools were unavailable while authoring this plan, so the following records are intended drafts and must not be treated as saved:

- Goal: **Make Kwilt Chat a reliable universal action surface**
- Activity: **Stabilize durable Chat runs and reliability gates**
- Activity: **Make native UI and Chat share capability action executors**
- Activity: **Unify spoken Chat with the durable action runtime**
- Activity: **Publish the generated Kwilt OAuth MCP and skill surface**
- Activity: **Complete remaining capability parity and release proof**

When the control plane is available, create or match the Goal first, create the Activities beneath it, and record shipped behavior only after each project's proof gate passes.

## Program invariants

1. A channel can advertise a tool only when that channel has a registered executable handler for it.
2. UI actions and conversational actions share capability-owned business functions; Chat does not automate pixels or duplicate business rules.
3. A durable run is accepted before model work begins, identified by an idempotency key, replayable after disconnect, and steerable or stoppable.
4. The model may propose a call, but deterministic policy owns authorization, confirmation, execution location, and data scope.
5. Every write produces a persisted receipt with actor, source channel, input summary, result reference, reversibility, and model/tool versions.
6. Device-only operations return a typed native handoff. They are never reported as completed by a server or external client.
7. Typed, dictated, and external requests produce the same action result for the same actor, wording, and context.
8. External clients receive a least-privilege projection of the registry; the internal tool catalog is not published wholesale.
9. A source or test pass is not runtime proof. Simulator, physical device, live backend, ChatGPT Developer Mode, submission, and public release remain separately labeled.

## Target flow

```text
Native UI ───────────────┐
Typed / dictated Chat ───┼─> capability action registry ─> policy ─> provider handler
Realtime voice ─> run ───┤                                  │          │
ChatGPT / Codex MCP ──────┘                                  │          ├─ completed receipt
                                                             │          ├─ review proposal
                                                             │          ├─ native handoff
                                                             │          └─ explicit unavailable
                                                             └─ durable audit + telemetry
```

## Launch measures

- **Durability:** no accepted golden-scenario turn is lost across app backgrounding, client retry, Edge Function retry, or reconnect.
- **Provider truth:** 100% of advertised tools have a registered handler; zero `live` coverage states derive only from manifest metadata.
- **Authorization:** 100% of destructive or consequential golden-scenario writes require the policy-defined confirmation; zero writes execute under ambiguous authority.
- **Action quality:** at least 98% correct terminal outcomes over the deterministic action corpus and at least 95% correct tool/argument decisions over the language-variance corpus before broad rollout.
- **Latency:** durable mobile acknowledgement p95 below 1.5 seconds; text first progress signal p95 below 2.5 seconds; finalized voice transcript to durable acknowledgement p95 below 2.5 seconds, measured on production-like infrastructure.
- **Parity:** every declared user-meaningful operation is classified as server execution, device execution, review proposal, native handoff, or intentionally excluded with a reason and owner.
- **Observability:** every model step, tool attempt, retry, proposal, handoff, and receipt is queryable by thread ID, run ID, request ID, actor, channel, model, prompt version, and tool version without storing unrestricted raw secrets.

## Requirement traceability

| User outcome | Primary implementation | Proof gate |
|---|---|---|
| Chat does not lose or duplicate turns | Projects 0 and 2 | Background/retry/reconnect corpus plus durable backend proof |
| Answers and tool decisions approach ChatGPT quality | Projects 2 and 7 | Responses model comparison and structured language-variance evaluation |
| Anything supported in native UI is truthfully reachable from Chat | Projects 1, 3, and 6 | Independent generated action inventory plus architecture ratchet |
| Typing and speaking have the same action semantics | Project 4 | Typed/dictated equivalence on a signed physical device |
| ChatGPT and Codex can use Kwilt through skills/connection | Project 5 | OAuth MCP tests in Developer Mode and Codex against the hosted endpoint |
| Actions remain permissioned, reviewable, and reversible | Projects 2, 3, 5, and 7 | Policy corpus, persisted receipts, review tests, and production safety alerts |

## Project 0 — Complete the durable mobile baseline

### Task 0.1: Finish the in-progress background-continuity slice

**Files:**
- Existing plan: `docs/superpowers/plans/2026-08-25-mobile-chat-background-continuity.md`
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`
- Modify: `supabase/functions/_shared/serviceAgentRunPersistence.ts`
- Add: `supabase/functions/_shared/mobileAgentRunBackground.ts`
- Add: `supabase/functions/_shared/__tests__/mobileAgentRunBackground.test.ts`
- Modify: `supabase/functions/agent-run/index.ts`
- Add: `src/features/unifiedChat/durableMobileChatTurn.ts`
- Add: `src/features/unifiedChat/durableMobileChatTurn.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Modify: `scripts/unified-chat-migration-contract.test.mjs`
- Add: `supabase/migrations/20260826012500_repair_channel_run_trigger_enqueue.sql`

- [ ] Re-read the current diff and separate background-continuity hunks from unrelated edits:

```bash
git status --short
git diff -- supabase/functions/_shared/agentRunCoordinator.ts supabase/functions/_shared/serviceAgentRunPersistence.ts supabase/functions/agent-run/index.ts src/features/unifiedChat/UnifiedChatScreen.tsx src/features/unifiedChat/UnifiedChatScreen.test.tsx
```

- [ ] Run the focused tests before changing code. Any failure must be reproduced as a regression before it is fixed:

```bash
npm test -- --runInBand src/features/unifiedChat/durableMobileChatTurn.test.ts src/features/unifiedChat/UnifiedChatScreen.test.tsx supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts supabase/functions/_shared/__tests__/mobileAgentRunBackground.test.ts
```

- [ ] Confirm the implementation preserves these exact state transitions:

```text
accepted -> queued -> active -> complete/partial
accepted -> queued -> active -> complete/partial + pending proposal
accepted -> queued -> active -> complete/partial + pending client action
accepted -> queued/active -> stopped
accepted -> active -> steered -> child run queued
accepted -> queued/active -> failed
```

- [ ] Confirm duplicate `(user_id, trigger_kind, trigger_id)` requests return the original durable identifiers. Active and terminal replays schedule no duplicate work; a replay still in `queued` may schedule a recovery claim, with the optimistic `queued -> active` transition ensuring only one worker reaches model execution.

- [ ] Run the focused tests again, then the project completion gate:

```bash
npm test -- --runInBand src/features/unifiedChat/durableMobileChatTurn.test.ts src/features/unifiedChat/UnifiedChatScreen.test.tsx supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts supabase/functions/_shared/__tests__/mobileAgentRunBackground.test.ts
npm run lint:supabase-functions
npm run verify:changed -- --run
```

- [ ] Inspect and stage only the background-continuity hunks. If an affected file contains mixed user work, use `git add -p` and leave unrelated hunks unstaged:

```bash
git diff --check
git add -p supabase/functions/_shared/agentRunCoordinator.ts supabase/functions/_shared/serviceAgentRunPersistence.ts supabase/functions/agent-run/index.ts src/features/unifiedChat/UnifiedChatScreen.tsx src/features/unifiedChat/UnifiedChatScreen.test.tsx
git add docs/superpowers/plans/2026-08-25-mobile-chat-background-continuity.md scripts/unified-chat-migration-contract.test.mjs supabase/functions/_shared/mobileAgentRunBackground.ts supabase/functions/_shared/__tests__/mobileAgentRunBackground.test.ts src/features/unifiedChat/durableMobileChatTurn.ts src/features/unifiedChat/durableMobileChatTurn.test.ts supabase/migrations/20260826012500_repair_channel_run_trigger_enqueue.sql
git diff --cached --check
git commit -m "feat(chat): keep durable mobile turns running in background"
```

### Task 0.2: Establish a versioned cross-channel reliability corpus

**Files:**
- Add: `packages/kwilt-agent-runtime/src/reliabilityCorpus.ts`
- Add: `packages/kwilt-agent-runtime/src/reliabilityCorpus.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Add: `docs/product/unified-chat-reliability-scorecard.md`

- [ ] Write failing tests for stable IDs, unique scenario IDs, required expected terminal states, required authorization expectations, and at least one typed and dictated variant for every intent.

- [ ] Add this contract without model- or channel-specific behavior:

```ts
export type ReliabilityExpectedOutcome =
  | 'completed'
  | 'needs_review'
  | 'awaiting_client_action'
  | 'needs_input'
  | 'unavailable'
  | 'refused';

export type ReliabilityScenario = {
  id: string;
  capabilityId: string;
  utterances: {
    typed: readonly string[];
    dictated: readonly string[];
  };
  expectedToolId: string | null;
  expectedOutcome: ReliabilityExpectedOutcome;
  expectedAuthorization: 'none' | 'read' | 'write_explicit';
  requiredReceiptFields: readonly string[];
};
```

- [ ] Seed scenarios for read, create, update, complete, delete, review, device-only handoff, ambiguity, retry, stop, and steer across Goals, To-dos, Plan, Money, Food, Screen Time, and Relationships.

- [ ] Document score definitions, denominator rules, exclusions, latency timestamps, and proof environments. Never mix synthetic evaluation results with production success rates.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/reliabilityCorpus.test.ts
git add packages/kwilt-agent-runtime/src/reliabilityCorpus.ts packages/kwilt-agent-runtime/src/reliabilityCorpus.test.ts packages/kwilt-agent-runtime/src/index.ts docs/product/unified-chat-reliability-scorecard.md
git diff --cached --check
git commit -m "test(chat): add cross-channel reliability corpus"
```

## Project 1 — Make provider availability executable truth

### Task 1.1: Add a generic handler-backed provider registry

**Files:**
- Add: `packages/kwilt-agent-runtime/src/providerRegistry.ts`
- Add: `packages/kwilt-agent-runtime/src/providerRegistry.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `packages/kwilt-agent-runtime/src/capabilityManifest.ts`
- Modify: `packages/kwilt-agent-runtime/src/capabilityManifest.test.ts`

- [ ] Write failing tests proving the registry rejects unknown tool IDs, duplicate tool/provider pairs, and advertised providers without handlers; prove catalog projection includes only registered handlers.

- [ ] Implement the registry with this public contract:

```ts
import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
  AgentToolProvider,
} from './types';

export type RuntimeToolHandler<Context> = (args: {
  context: Context;
  call: AgentToolCall;
  tool: AgentToolDefinition;
}) => Promise<AgentToolExecutionResult>;

export type RuntimeToolProviderRegistration<Context> = {
  toolId: string;
  provider: AgentToolProvider;
  execute: RuntimeToolHandler<Context>;
};

export type RuntimeToolProviderRegistry<Context> = {
  registrations: readonly RuntimeToolProviderRegistration<Context>[];
  has(toolId: string, provider: AgentToolProvider): boolean;
  execute(
    toolId: string,
    provider: AgentToolProvider,
    context: Context,
    call: AgentToolCall,
  ): Promise<AgentToolExecutionResult>;
};

export function createRuntimeToolProviderRegistry<Context>(args: {
  tools: readonly AgentToolDefinition[];
  registrations: readonly RuntimeToolProviderRegistration<Context>[];
}): RuntimeToolProviderRegistry<Context>;
```

- [ ] Change `projectAgentToolCatalog` to accept registry registrations rather than `RuntimeToolImplementation[]`. Delete or deprecate the declaration-only `RuntimeToolImplementation` type after all call sites migrate.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/providerRegistry.test.ts packages/kwilt-agent-runtime/src/capabilityManifest.test.ts
git add packages/kwilt-agent-runtime/src/providerRegistry.ts packages/kwilt-agent-runtime/src/providerRegistry.test.ts packages/kwilt-agent-runtime/src/index.ts packages/kwilt-agent-runtime/src/capabilityManifest.ts packages/kwilt-agent-runtime/src/capabilityManifest.test.ts
git diff --cached --check
git commit -m "refactor(agent): derive tool availability from handlers"
```

### Task 1.2: Replace mechanical mobile and server declarations with real registrations

**Files:**
- Modify: `src/features/unifiedChat/mobileToolImplementations.ts`
- Add: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Add: `src/features/unifiedChat/mobileToolProviderRegistry.test.ts`
- Modify: `src/features/unifiedChat/toolCatalog.ts`
- Modify: `src/features/unifiedChat/toolCatalog.test.ts`
- Modify: `supabase/functions/_shared/serverToolImplementations.ts`
- Add: `supabase/functions/_shared/serverToolProviderRegistry.ts`
- Add: `supabase/functions/_shared/__tests__/serverToolProviderRegistry.test.ts`
- Modify: `supabase/functions/_shared/serverAgentTools.ts`

- [ ] Write regression tests showing a manifest-only tool is absent from the channel catalog and returns `unavailable` when invoked.

- [ ] Register existing real handlers explicitly. A temporary adapter around the existing mobile/server dispatch switch is acceptable only when each registration names the actual implemented tool ID; do not map over every contract.

- [ ] Make `executeServerAgentTool` dispatch through `serverToolProviderRegistry.execute`. Preserve existing proposal, receipt, and client-action outputs byte-for-byte in tests.

- [ ] Make mobile catalog construction project from `mobileToolProviderRegistry.registrations` and channel availability. Remove the current `KWILT_TOOL_CONTRACTS.map(...)` availability shortcut.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/features/unifiedChat/mobileToolProviderRegistry.test.ts src/features/unifiedChat/toolCatalog.test.ts supabase/functions/_shared/__tests__/serverToolProviderRegistry.test.ts
npm run lint:supabase-functions
git add src/features/unifiedChat/mobileToolImplementations.ts src/features/unifiedChat/mobileToolProviderRegistry.ts src/features/unifiedChat/mobileToolProviderRegistry.test.ts src/features/unifiedChat/toolCatalog.ts src/features/unifiedChat/toolCatalog.test.ts supabase/functions/_shared/serverToolImplementations.ts supabase/functions/_shared/serverToolProviderRegistry.ts supabase/functions/_shared/__tests__/serverToolProviderRegistry.test.ts supabase/functions/_shared/serverAgentTools.ts
git diff --cached --check
git commit -m "refactor(chat): register executable channel providers"
```

### Task 1.3: Make coverage tests independent from the manifest

**Files:**
- Modify: `src/capabilities/operations.ts`
- Modify: `src/capabilities/operations.test.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.ts`
- Modify: `src/features/unifiedChat/chatCapabilityCoverage.test.ts`
- Modify: `scripts/unified-chat-migration-contract.test.mjs`
- Modify: `docs/product/unified-chat-behavior-contract.md`

- [ ] Write a failing test with a manifest entry lacking a provider registration. Assert the UI operation remains declared while Chat coverage becomes `pending_provider`, never `live`.

- [ ] Compute coverage by joining three independent facts: declared user operation, tool contract, and registered provider. Require an explicit exclusion reason for every unmatched operation.

- [ ] Update the migration contract to reject declaration-only provider arrays and direct manifest projections presented as execution coverage.

- [ ] Generate a checked-in coverage table with operation ID, tool ID, server handler, device handler, external exposure, confirmation policy, and outcome class.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/capabilities/operations.test.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts
npm run test:chat-contracts
npm run verify:changed -- --run
git add src/capabilities/operations.ts src/capabilities/operations.test.ts src/features/unifiedChat/chatCapabilityCoverage.ts src/features/unifiedChat/chatCapabilityCoverage.test.ts scripts/unified-chat-migration-contract.test.mjs docs/product/unified-chat-behavior-contract.md
git diff --cached --check
git commit -m "test(chat): enforce independent action coverage"
```

### Task 1.4: Derive strict OpenAI schemas without changing action semantics

**Files:**
- Add: `packages/kwilt-agent-runtime/src/strictToolSchema.ts`
- Add: `packages/kwilt-agent-runtime/src/strictToolSchema.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltToolContracts.test.ts`

- [ ] Write failing tests for nested objects, arrays of objects, enums, already-required fields, optional fields, nullable fields, and rejection of unsupported schema keywords.
- [ ] Implement `toStrictToolInputSchema` so every object sets `additionalProperties: false`, every property appears in `required`, and semantically optional properties accept `null` on the OpenAI wire.
- [ ] Implement `normalizeStrictToolArguments` using the original semantic schema to remove only wire-added `null` optionals before provider validation. Never drop an authored nullable value.
- [ ] Run the conversion across every `KWILT_TOOL_CONTRACTS` input schema in a test; print the tool ID on the first incompatible contract so each schema defect is fixed explicitly.
- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/strictToolSchema.test.ts packages/kwilt-agent-runtime/src/kwiltToolContracts.test.ts
git add packages/kwilt-agent-runtime/src/strictToolSchema.ts packages/kwilt-agent-runtime/src/strictToolSchema.test.ts packages/kwilt-agent-runtime/src/index.ts packages/kwilt-agent-runtime/src/kwiltToolContracts.test.ts
git diff --cached --check
git commit -m "feat(agent): derive strict tool wire schemas"
```

## Project 2 — Move planning and text execution to one durable Responses runtime

### Task 2.1: Extract portable intent and authority contracts

**Files:**
- Add: `packages/kwilt-agent-runtime/src/planning/types.ts`
- Add: `packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.ts`
- Add: `packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `src/features/unifiedChat/agentJudgment.ts`
- Modify: `src/features/unifiedChat/turnContract.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts`

- [ ] Port the current judgment/turn contract into a runtime-neutral schema. Write failing cases for ambiguous references, implicit writes, explicit destructive writes, read-only requests, device-only actions, and contradictory context.

- [ ] Implement this deterministic authority output:

```ts
export type TurnAuthorization =
  | { kind: 'none'; reason: string }
  | { kind: 'read' }
  | { kind: 'write'; explicit: boolean; confirmation: 'none' | 'review' | 'native' };

export type ResolvedTurnPolicy = {
  authorization: TurnAuthorization;
  allowedEffects: readonly ('read' | 'write')[];
  allowedToolIds: readonly string[];
  unresolvedReferences: readonly string[];
};
```

- [ ] Keep model judgment advisory. `resolveTurnPolicy` must derive allowed effects and confirmation from explicit user language, capability metadata, actor permissions, and provider location. The model cannot set `explicit: true` by itself.

- [ ] Re-export the portable types from the existing app modules so downstream callers migrate without a flag day.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.test.ts src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts
git add packages/kwilt-agent-runtime/src/planning/types.ts packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.ts packages/kwilt-agent-runtime/src/planning/resolveTurnPolicy.test.ts packages/kwilt-agent-runtime/src/index.ts src/features/unifiedChat/agentJudgment.ts src/features/unifiedChat/turnContract.ts src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts
git diff --cached --check
git commit -m "refactor(chat): share deterministic turn authority"
```

### Task 2.2: Add a real `unified_chat_agent` Responses job

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.test.ts`
- Modify: `supabase/functions/_shared/aiModelRouting.ts`
- Modify: `supabase/functions/_shared/aiRequestValidation.ts`
- Modify: `supabase/functions/ai-chat/index.ts`
- Add: `supabase/functions/_shared/__tests__/unifiedChatAgentRequest.test.ts`
- Modify: `supabase/functions/_shared/__tests__/aiModelRouting.test.ts`
- Modify: `supabase/functions/_shared/__tests__/aiRequestValidation.test.ts`

- [ ] Write a regression proving the `unified_chat_agent` header currently falls back to `default_chat`; make the test fail until the job is registered.

- [ ] Add a Responses-only job contract with `store: false`, bounded output, `parallel_tool_calls: false`, and a model route initially set to `gpt-5.6-terra`. Keep the model in routing configuration rather than call-site strings.

- [ ] Validate that the request contains only approved input item types, strict function tools, optional approved tool-search namespaces, and no client-supplied model or system policy override.

- [ ] Permit `/v1/responses` for this job in `ai-chat`. Continue rejecting OpenAI background storage because Kwilt's durable run remains canonical.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/generationJobContracts.test.ts supabase/functions/_shared/__tests__/unifiedChatAgentRequest.test.ts supabase/functions/_shared/__tests__/aiModelRouting.test.ts supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
npm run lint:supabase-functions
git add packages/kwilt-agent-runtime/src/generationJobContracts.ts packages/kwilt-agent-runtime/src/generationJobContracts.test.ts supabase/functions/_shared/aiModelRouting.ts supabase/functions/_shared/aiRequestValidation.ts supabase/functions/ai-chat/index.ts supabase/functions/_shared/__tests__/unifiedChatAgentRequest.test.ts supabase/functions/_shared/__tests__/aiModelRouting.test.ts supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
git diff --cached --check
git commit -m "feat(ai): add unified Chat Responses job"
```

### Task 2.3: Replace Chat Completions with a strict Responses adapter

**Files:**
- Add: `supabase/functions/_shared/serverAgentResponses.ts`
- Add: `supabase/functions/_shared/__tests__/serverAgentResponses.test.ts`
- Modify: `supabase/functions/_shared/serverAgentModel.ts`
- Modify: `supabase/functions/_shared/__tests__/serverAgentModel.test.ts`
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`

- [ ] Write fixtures for response text, one function call, malformed JSON arguments, multiple output items, refusal, incomplete response, proxy error, and retryable timeout.

- [ ] Translate every registered tool through `toStrictToolInputSchema` to this exact strict shape:

```ts
{
  type: 'function',
  name: tool.id,
  description: tool.purpose,
  parameters: tool.inputSchema,
  strict: true,
}
```

- [ ] Translate conversation state to Responses input items and translate each `function_call` plus `function_call_output` back into the existing bounded tool loop. Use the OpenAI `call_id` as a correlation value, not as Kwilt's idempotency key.

- [ ] Persist response ID, routed model, prompt version, tool catalog hash, latency, and token usage in run events. Do not persist unrestricted authorization headers or raw secrets.

- [ ] Delete the Chat Completions tool adapter only after all server agent model tests pass on Responses fixtures.

- [ ] Verify and commit:

```bash
npm test -- --runInBand supabase/functions/_shared/__tests__/serverAgentResponses.test.ts supabase/functions/_shared/__tests__/serverAgentModel.test.ts supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts
npm run lint:supabase-functions
git add supabase/functions/_shared/serverAgentResponses.ts supabase/functions/_shared/__tests__/serverAgentResponses.test.ts supabase/functions/_shared/serverAgentModel.ts supabase/functions/_shared/__tests__/serverAgentModel.test.ts supabase/functions/_shared/agentRunCoordinator.ts
git diff --cached --check
git commit -m "refactor(chat): run durable turns on Responses API"
```

### Task 2.4: Introduce bounded tool namespaces and server planning

**Files:**
- Add: `packages/kwilt-agent-runtime/src/toolNamespaces.ts`
- Add: `packages/kwilt-agent-runtime/src/toolNamespaces.test.ts`
- Add: `supabase/functions/_shared/serverTurnPlanning.ts`
- Add: `supabase/functions/_shared/__tests__/serverTurnPlanning.test.ts`
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`
- Modify: `supabase/functions/_shared/serverAgentModel.ts`

- [ ] Define stable namespaces: `life_structure`, `tasks_plan`, `household`, `money`, `food`, `device_wellbeing`, and `account_navigation`. Require every executable tool to belong to exactly one namespace.

- [ ] Write failing tests that no model request receives all tools, write tools are absent under `none` or `read` authorization, and a selected namespace contains at most ten initially visible functions. Deferred tools may be resolved through approved tool search.

- [ ] Have `serverTurnPlanning` request bounded judgment, resolve deterministic policy, select namespaces, and intersect `allowedToolIds` with the server provider registry before model execution.

- [ ] Record planner output and deterministic policy separately in telemetry so disagreement can be evaluated without allowing the planner to override policy.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/toolNamespaces.test.ts supabase/functions/_shared/__tests__/serverTurnPlanning.test.ts supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts
git add packages/kwilt-agent-runtime/src/toolNamespaces.ts packages/kwilt-agent-runtime/src/toolNamespaces.test.ts supabase/functions/_shared/serverTurnPlanning.ts supabase/functions/_shared/__tests__/serverTurnPlanning.test.ts supabase/functions/_shared/agentRunCoordinator.ts supabase/functions/_shared/serverAgentModel.ts
git diff --cached --check
git commit -m "feat(chat): plan bounded server tool namespaces"
```

### Task 2.5: Route all text turns through the durable server contract

**Files:**
- Add: `packages/kwilt-agent-runtime/src/channelContext.ts`
- Add: `packages/kwilt-agent-runtime/src/channelContext.test.ts`
- Modify: `src/features/unifiedChat/buildRunContext.ts`
- Modify: `src/features/unifiedChat/buildRunContext.test.ts`
- Modify: `src/features/unifiedChat/durableMobileChatTurn.ts`
- Modify: `src/features/unifiedChat/durableMobileChatTurn.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Modify: `supabase/functions/_shared/agentRuntime.ts`
- Modify: `supabase/functions/agent-run/index.ts`

- [ ] Define a versioned, size-bounded channel context packet for selected entities, attachment references, locale/time zone, screen/action origin, and available device providers. Pass references and signed object paths, never large raw files.

- [ ] Write regressions for first message, follow-up, retry, attachment, active screen context, pending proposal, pending client action, background/foreground, stop, and steer.

- [ ] Remove the temporary “simple follow-up only” eligibility once each case has a server representation. Local rendering may optimistically show the user message, but no assistant terminal answer is canonical until persisted by the durable run.

- [ ] Convert unsupported device work into `awaiting_client_action` with a typed payload. On foreground, execute through the mobile provider registry, submit the signed result, and resume the same run.

- [ ] Run the cross-channel corpus and project gate:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/channelContext.test.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/durableMobileChatTurn.test.ts src/features/unifiedChat/UnifiedChatScreen.test.tsx supabase/functions/_shared/__tests__/agentRuntime.test.ts supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts
npm run verify:changed -- --run
git add packages/kwilt-agent-runtime/src/channelContext.ts packages/kwilt-agent-runtime/src/channelContext.test.ts src/features/unifiedChat/buildRunContext.ts src/features/unifiedChat/buildRunContext.test.ts src/features/unifiedChat/durableMobileChatTurn.ts src/features/unifiedChat/durableMobileChatTurn.test.ts src/features/unifiedChat/UnifiedChatScreen.tsx src/features/unifiedChat/UnifiedChatScreen.test.tsx supabase/functions/_shared/agentRuntime.ts supabase/functions/agent-run/index.ts
git diff --cached --check
git commit -m "feat(chat): make durable runs canonical for text"
```

## Project 3 — Make native UI and Chat use the same capability actions

### Task 3.1: Add the app capability action dispatcher and canonical receipt

**Files:**
- Add: `src/capabilities/actionRuntime/types.ts`
- Add: `src/capabilities/actionRuntime/createActionRegistry.ts`
- Add: `src/capabilities/actionRuntime/createActionRegistry.test.ts`
- Add: `src/capabilities/actionRuntime/dispatchKwiltAction.ts`
- Add: `src/capabilities/actionRuntime/dispatchKwiltAction.test.ts`
- Add: `src/capabilities/actionRuntime/index.ts`
- Modify: `packages/kwilt-agent-runtime/src/types.ts`
- Add: `supabase/functions/_shared/serverActionDispatcher.ts`
- Add: `supabase/functions/_shared/__tests__/serverActionDispatcher.test.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`

- [ ] Write failing tests for duplicate operation IDs, permission denial, idempotent replay, confirmation-required results, native handoff, reversible receipts, and handler failure normalization.

- [ ] Implement the UI- and Chat-neutral wire contract in `packages/kwilt-agent-runtime/src/types.ts`; re-export it from `src/capabilities/actionRuntime/types.ts` so mobile code has one import boundary:

```ts
export type KwiltActionSource =
  | 'native_ui'
  | 'mobile_chat'
  | 'voice'
  | 'phone'
  | 'mcp'
  | 'scheduled';

export type KwiltActionRequest<Input = unknown> = {
  operationId: string;
  requestId: string;
  actorId: string;
  householdId: string;
  source: KwiltActionSource;
  input: Input;
};

export type KwiltActionReceipt = {
  receiptId: string;
  operationId: string;
  requestId: string;
  actorId: string;
  householdId: string;
  source: KwiltActionSource;
  status:
    | 'completed'
    | 'proposed'
    | 'pending_client_action'
    | 'needs_input'
    | 'unavailable'
    | 'refused'
    | 'failed';
  resultRefs: readonly { kind: string; id: string }[];
  reversible: boolean;
  createdAt: string;
};
```

- [ ] Keep capability business logic outside the dispatchers. Each mobile or server registration validates the same operation input, calls capability-owned rules with its runtime persistence adapter, and maps the result to the canonical receipt.

- [ ] Make mobile Chat provider handlers invoke this dispatcher for device-capable work rather than importing screen components or navigation state.

- [ ] Make server Chat providers invoke `serverActionDispatcher`; persist server writes in the existing `kwilt_agent_mutation_receipts` contract and map those rows to `KwiltActionReceipt`. Do not add a second generic receipt table.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/capabilities/actionRuntime/createActionRegistry.test.ts src/capabilities/actionRuntime/dispatchKwiltAction.test.ts supabase/functions/_shared/__tests__/serverActionDispatcher.test.ts
git add src/capabilities/actionRuntime packages/kwilt-agent-runtime/src/types.ts supabase/functions/_shared/serverActionDispatcher.ts supabase/functions/_shared/__tests__/serverActionDispatcher.test.ts supabase/functions/_shared/serverToolProviderRegistry.ts
git diff --cached --check
git commit -m "feat(actions): add canonical capability dispatcher"
```

### Task 3.2: Prove the pattern with the To-dos vertical slice

**Files:**
- Add: `src/capabilities/todos/actions/todoActions.ts`
- Add: `src/capabilities/todos/actions/todoActions.test.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/store/useAppStore.lifecycle.test.ts`
- Modify: `src/features/activities/useQuickAddDockController.ts`
- Modify: `src/features/activities/useQuickAddDockController.test.ts`
- Modify: `src/features/activities/ActivityDetailScreen.tsx`
- Modify: `src/features/plan/planActivityCompletion.ts`
- Modify: `src/features/plan/planActivityCompletion.test.ts`
- Modify: `src/features/unifiedChat/activityProposalExecutor.ts`
- Modify: `src/features/unifiedChat/activityProposalExecutor.test.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.ts`
- Modify: `src/features/unifiedChat/unifiedChatToolProvider.test.ts`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`

- [ ] Inventory create, update, assign, schedule, complete, reopen, and delete call sites with `rg -n "addActivity|updateActivity|removeActivity" src/features/activities src/features/plan src/features/unifiedChat src/store/useAppStore.ts`. If the branch has gained a mutation call site since plan authoring, add its exact path to this task before editing.

- [ ] Write action-level tests proving UI and Chat pass identical normalized input and receive equivalent receipts for create, complete, and delete-review flows.

- [ ] Move business mutation logic into `todoActions.ts`. Replace both UI mutation call sites and Chat handlers with calls to the same exported functions.

- [ ] Preserve native UI feedback and navigation as presentation adapters after the action resolves; do not put Toast, navigation, or React state into capability actions.

- [ ] Run focused To-do, provider, and Chat tests, then stage only the named To-do files and provider registrations:

```bash
npm test -- --runInBand src/capabilities/todos/actions/todoActions.test.ts src/features/unifiedChat/mobileToolProviderRegistry.test.ts
git diff --check
git add src/capabilities/todos/actions/todoActions.ts src/capabilities/todos/actions/todoActions.test.ts src/store/useAppStore.ts src/store/useAppStore.lifecycle.test.ts src/features/activities/useQuickAddDockController.ts src/features/activities/useQuickAddDockController.test.ts src/features/activities/ActivityDetailScreen.tsx src/features/plan/planActivityCompletion.ts src/features/plan/planActivityCompletion.test.ts src/features/unifiedChat/activityProposalExecutor.ts src/features/unifiedChat/activityProposalExecutor.test.ts src/features/unifiedChat/unifiedChatToolProvider.ts src/features/unifiedChat/unifiedChatToolProvider.test.ts src/features/unifiedChat/mobileToolProviderRegistry.ts supabase/functions/_shared/serverToolProviderRegistry.ts
git diff --cached --check
git commit -m "refactor(todos): share actions across UI and Chat"
```

### Task 3.3: Add an architecture ratchet for migrated operations

**Files:**
- Modify: `scripts/architecture-lint-lib.mjs`
- Modify: `scripts/architecture-lint-lib.test.mjs`
- Modify: `scripts/architecture-lint.mjs`
- Add: `scripts/action-runtime-boundary.json`
- Modify: `docs/agent-code-map.md`

- [ ] Write failing lint fixtures for a migrated screen directly importing a repository mutation and for a Chat provider duplicating a capability mutation.

- [ ] Add a checked-in boundary manifest listing migrated operation IDs, allowed action modules, and forbidden direct mutation import patterns. Start with To-dos; expand only when each capability migration lands.

- [ ] Make architecture lint reject new bypasses without creating a giant baseline of unrelated pre-existing violations.

- [ ] Document how to locate an operation contract, its action handler, channel providers, receipt, and UI entry point.

- [ ] Verify and commit:

```bash
node --test scripts/architecture-lint-lib.test.mjs
npm run architecture:lint
git add scripts/architecture-lint-lib.mjs scripts/architecture-lint-lib.test.mjs scripts/architecture-lint.mjs scripts/action-runtime-boundary.json docs/agent-code-map.md
git diff --cached --check
git commit -m "test(actions): enforce migrated action boundaries"
```

### Task 3.4: Migrate the core life-structure and household action groups

**Files:**
- Add: `src/capabilities/life-structure/actions/arcActions.ts`
- Add: `src/capabilities/life-structure/actions/arcActions.test.ts`
- Add: `src/capabilities/life-structure/actions/goalActions.ts`
- Add: `src/capabilities/life-structure/actions/goalActions.test.ts`
- Add: `src/capabilities/life-structure/actions/chapterActions.ts`
- Add: `src/capabilities/life-structure/actions/chapterActions.test.ts`
- Add: `src/capabilities/relationships/actions/relationshipActions.ts`
- Add: `src/capabilities/relationships/actions/relationshipActions.test.ts`
- Add: `src/capabilities/plan/actions/planActions.ts`
- Add: `src/capabilities/plan/actions/planActions.test.ts`
- Modify: `src/store/useAppStore.ts`
- Modify: `src/features/arcs/ArcsScreen.tsx`
- Modify: `src/features/arcs/ArcDetailScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/goals/GoalsScreen.tsx`
- Modify: `src/features/chapters/ChapterAlignScreen.tsx`
- Modify: `src/features/chapters/ChapterDetailScreen.tsx`
- Modify: `src/features/account/ProfileSettingsScreen.tsx`
- Modify: `src/features/friends/FriendsScreen.tsx`
- Modify: `src/features/household/HouseholdMemberDetailScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/plan/usePlanSlotCapture.ts`
- Modify: `src/features/plan/usePlanSessionEditor.ts`
- Modify: `src/features/unifiedChat/arcProposalExecutor.ts`
- Modify: `src/features/unifiedChat/goalProposalExecutor.ts`
- Modify: `src/features/unifiedChat/profileProposalExecutor.ts`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`
- Modify `scripts/action-runtime-boundary.json`
- Modify `docs/product/unified-chat-behavior-contract.md`

- [ ] Migrate one capability per commit in this order: Goals/Arcs, Chapters/Profile, Relationships/Household, then Plan.

- [ ] For each capability, inventory operations, write action tests first, move business logic once, replace native and Chat call sites, add provider registrations, expand the architecture ratchet, and update coverage.

- [ ] Require explicit confirmation for deletes, relationship changes, publishing/sharing, and schedule changes with downstream household effects.

- [ ] Run only the affected capability tests during each migration. After the final capability, run:

```bash
npm run test:chat-contracts
npm run architecture:lint
npm run verify:changed -- --run
```

- [ ] Commit each capability separately with these messages: `refactor(arcs): share actions across UI and Chat`, `refactor(goals): share actions across UI and Chat`, `refactor(household): share actions across UI and Chat`, and `refactor(plan): share actions across UI and Chat`.

## Project 4 — Put spoken Chat on the same durable action runtime

### Task 4.1: Route finalized transcripts through durable runs

**Files:**
- Modify: `src/features/liveConversation/openAiRealtimeEvents.ts`
- Modify: `src/features/liveConversation/openAiRealtimeEvents.test.ts`
- Modify: `src/features/liveConversation/liveConversationSessionClient.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Modify: `supabase/functions/_shared/liveConversationSession.ts`
- Modify: `supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts`

- [ ] Write a regression proving a finalized voice transcript creates the same versioned channel context and durable run request as equivalent typed text.

- [ ] Preserve interim transcription only as UI state. Submit exactly one durable request per finalized utterance using a stable utterance ID as the trigger ID.

- [ ] Persist voice metadata—session ID, utterance ID, transcript confidence when available, locale, interruption state, and timing—without changing action authorization.

- [ ] Render status and the terminal response from durable run events. Remove any separate voice-only business action path.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/features/liveConversation/openAiRealtimeEvents.test.ts src/features/unifiedChat/UnifiedChatScreen.test.tsx
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts
git add src/features/liveConversation/openAiRealtimeEvents.ts src/features/liveConversation/openAiRealtimeEvents.test.ts src/features/liveConversation/liveConversationSessionClient.ts src/features/unifiedChat/UnifiedChatScreen.tsx src/features/unifiedChat/UnifiedChatScreen.test.tsx supabase/functions/_shared/liveConversationSession.ts supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts
git diff --cached --check
git commit -m "feat(voice): send transcripts through durable Chat"
```

### Task 4.2: Upgrade to speech-to-speech Realtime with one durable tool

**Files:**
- Add: `src/features/liveConversation/durableRealtimeTool.ts`
- Add: `src/features/liveConversation/durableRealtimeTool.test.ts`
- Modify: `src/features/liveConversation/liveConversationSessionClient.ts`
- Modify: `supabase/functions/_shared/liveConversationSession.ts`
- Modify: `supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts`
- Modify: `src/features/liveConversation/conversationSpeechRuntime.ts`

- [ ] Add a single Realtime function tool named `kwilt.run` whose strict input is `{ realtimeItemId: string, channelContextVersion: number }`. The client resolves the finalized transcript already observed for that input item; it must ignore model-authored transcript text.

- [ ] Configure the routed Realtime model as `gpt-realtime-2.1` in server configuration. The client receives an ephemeral session and cannot select a model or widen tools.

- [ ] Implement `kwilt.run` as a bounded wait for the matching finalized input transcription, followed by durable-run enqueue and event subscription. If transcription never finalizes, return `needs_input` rather than inventing intent. Realtime may say acknowledgement/progress and read the terminal result, but only the durable provider registry may mutate Kwilt data.

- [ ] Make barge-in cancel speech output, not the durable mutation. A user saying “stop” must separately transition the durable run through its stop contract.

- [ ] Remove the separate TTS path only after signed-device testing proves equivalent accessibility, interruption, route changes, Bluetooth behavior, and fallback transcription.

- [ ] Verify and commit:

```bash
npm test -- --runInBand src/features/liveConversation/durableRealtimeTool.test.ts
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts
npm run verify:changed -- --run
git add src/features/liveConversation/durableRealtimeTool.ts src/features/liveConversation/durableRealtimeTool.test.ts src/features/liveConversation/liveConversationSessionClient.ts supabase/functions/_shared/liveConversationSession.ts supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts src/features/liveConversation/conversationSpeechRuntime.ts
git diff --cached --check
git commit -m "feat(voice): connect Realtime speech to durable actions"
```

### Task 4.3: Complete signed-device voice proof

**Files:**
- Add: `docs/qa/unified-chat-voice-proof.md`
- Update: `docs/product/unified-chat-reliability-scorecard.md`

- [ ] Deploy the required Edge Functions to a non-production environment and record function commit/config provenance.
- [ ] Build and install a signed app from the same commit. Record checkout, branch, commit, dirty state, Metro path/port, native build identifier, backend project, and model routes.
- [ ] Run typed/dictated equivalence, backgrounding, network interruption, retry, stop, steer, ambiguous write, confirmed write, device handoff, Bluetooth, route change, and reduced-motion/accessibility scenarios.
- [ ] Attach timestamps/run IDs and redact household content. Mark Simulator-only cases separately from physical-device proof.
- [ ] Do not enable broad rollout until the launch measures pass or an explicit waiver is recorded.

## Project 5 — Generate the OAuth MCP and Kwilt skills from the same registry

### Task 5.1: Project an external-safe action catalog

**Files:**
- Add: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Add: `packages/kwilt-agent-runtime/src/externalActionCatalog.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcp.test.ts`

- [ ] Add explicit external metadata to action registrations: exposure state, OAuth scopes, consequence, confirmation, redaction policy, and compatibility aliases.

- [ ] Generate MCP tool definitions only when the operation has a server handler, is externally exposed, and its required scopes are satisfiable. Device-only operations may expose a status/read tool, but not a falsely executable write.

- [ ] Keep each tool schema strict and human-auditable. Preserve current 26 MCP tool names as aliases for one compatibility version while generated canonical names roll out.

- [ ] Write snapshot tests for names, JSON Schemas, annotations, scopes, and alias mapping. A manifest-only action must never appear.

- [ ] Verify and commit:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/externalActionCatalog.test.ts supabase/functions/_shared/__tests__/externalMcp.test.ts
git add packages/kwilt-agent-runtime/src/externalActionCatalog.ts packages/kwilt-agent-runtime/src/externalActionCatalog.test.ts packages/kwilt-agent-runtime/src/index.ts supabase/functions/_shared/externalMcp.ts supabase/functions/_shared/__tests__/externalMcp.test.ts
git diff --cached --check
git commit -m "feat(mcp): generate external action catalog"
```

### Task 5.2: Execute MCP writes through the canonical server dispatcher

**Files:**
- Modify: `supabase/functions/_shared/externalMcpWrite.ts`
- Modify: `supabase/functions/_shared/externalMcp.ts`
- Modify: `supabase/functions/mcp/index.ts`
- Add: `supabase/functions/_shared/__tests__/externalMcpActionParity.test.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcpWrite.test.ts`

- [ ] Add parity tests proving mobile Chat and MCP produce the same action receipt for equivalent authorized server actions.

- [ ] Replace direct MCP repository writes with the server action dispatcher. Retain MCP request parsing, OAuth actor resolution, idempotency, and protocol formatting as adapters.

- [ ] Return MCP structured content containing canonical receipt ID, operation, status, result references, confirmation/handoff state, and a concise text summary.

- [ ] Keep audit records and idempotency keys stable across compatibility aliases. Delete duplicated write branches only after parity tests cover every current write tool.

- [ ] Verify and commit:

```bash
npm test -- --runInBand supabase/functions/_shared/__tests__/externalMcpActionParity.test.ts supabase/functions/_shared/__tests__/externalMcpWrite.test.ts
npm run lint:supabase-functions
git add supabase/functions/_shared/externalMcpWrite.ts supabase/functions/_shared/externalMcp.ts supabase/functions/mcp/index.ts supabase/functions/_shared/__tests__/externalMcpActionParity.test.ts supabase/functions/_shared/__tests__/externalMcpWrite.test.ts
git diff --cached --check
git commit -m "refactor(mcp): share canonical action execution"
```

### Task 5.3: Add least-privilege capability scopes and review contracts

**Files:**
- Add: `supabase/migrations/20260826160000_add_external_action_scopes.sql`
- Modify: `supabase/functions/_shared/externalMcpOAuth.ts`
- Modify: `supabase/functions/_shared/__tests__/externalMcpOAuth.test.ts`
- Modify: `supabase/functions/mcp/index.ts`
- Modify in `/Users/andrewwatanabe/kwilt-site`: `components/oauth/OAuthConsentClient.tsx`
- Modify in `/Users/andrewwatanabe/kwilt-site`: `lib/oauthConsent.ts`
- Modify in `/Users/andrewwatanabe/kwilt-site`: `lib/oauthConsent.test.ts`
- Modify: `docs/feature-briefs/external-ai-connector.md`
- Modify: `docs/product/unified-chat-behavior-contract.md`

- [ ] Define scopes by capability and effect, including at minimum `life.read`, `life.write`, `household.read`, `household.write`, `money.read`, `money.write`, `food.read`, and `food.write`. Keep destructive review as policy, not a magic broad OAuth scope.

- [ ] Write migration and token-validation tests before implementation. Existing broad tokens must map to an explicit compatibility policy with a removal date; do not silently grant new capabilities.

- [ ] Require MCP clients to supply stable request IDs for writes. Route consequential actions to persisted review proposals when the actor's instruction is not explicit enough for direct execution.

- [ ] Show requested scopes, household, data categories, and write effects in the connection consent UI and plugin description.

- [ ] Inspect the kwilt-site branch, HEAD, status, and instructions before editing; commit its consent-screen changes separately from the Kwilt backend migration.

- [ ] Verify and commit the Kwilt backend slice:

```bash
npm run lint:supabase-functions
npm run verify:changed -- --run
git add supabase/migrations/20260826160000_add_external_action_scopes.sql supabase/functions/_shared/externalMcpOAuth.ts supabase/functions/_shared/__tests__/externalMcpOAuth.test.ts supabase/functions/mcp/index.ts docs/feature-briefs/external-ai-connector.md docs/product/unified-chat-behavior-contract.md
git diff --cached --check
git commit -m "feat(oauth): scope external Kwilt actions"
```

- [ ] In `/Users/andrewwatanabe/kwilt-site`, run `npm test` and `npm run build`, stage only `components/oauth/OAuthConsentClient.tsx`, `lib/oauthConsent.ts`, and `lib/oauthConsent.test.ts`, then commit `feat(oauth): explain Kwilt capability scopes`.

### Task 5.4: Update and validate the Codex/ChatGPT plugin package

**Files in `/Users/andrewwatanabe/kwilt-agent-plugins`:**
- Modify: `.codex-plugin/plugin.json`
- Modify: `skills/kwilt/SKILL.md`
- Modify: `skills/kwilt-control-plane/SKILL.md`
- Modify: `README.md`
- Modify: `SUBMISSION.md`
- Modify: `chatgpt-app-submission.json`
- Modify: `docs/mcp-verification.md`
- Modify: `docs/reviewer-test-plan.md`

- [ ] Before editing, inspect that repository's branch, HEAD, status, instructions, and current MCP endpoint. Do not assume its clean state from plan-authoring time.

- [ ] Update skills to teach canonical read/act/review/receipt/undo flows and the generated action discovery contract. Skills must not promise actions absent from the external-safe catalog.

- [ ] Update permissions, privacy descriptions, screenshots, test prompts, support text, and compatibility notes to match the live OAuth scopes and tool schemas.

- [ ] Test in ChatGPT Developer Mode and Codex against the deployed non-production MCP endpoint. Record OAuth consent, read, safe write, reviewed write, replay, revoked token, expired token, and unavailable device-action outcomes.

- [ ] Validate JSON with `jq empty .codex-plugin/plugin.json chatgpt-app-submission.json mcp.json`, scan for stale broad-scope claims with `rg -n "read/write|read write|26 tools|26-tool" . --glob '!*.png'`, commit the named files in that repository, and report the Kwilt server commit and plugin commit separately. Public directory submission is a later external gate.

## Project 6 — Complete action parity capability by capability

### Task 6.0: Freeze the remaining action inventory before migration

**Files:**
- Add: `scripts/generate-unified-action-inventory.mjs`
- Add: `scripts/generate-unified-action-inventory.test.mjs`
- Add: `docs/product/unified-chat-action-inventory.md`
- Modify: `package.json`

- [ ] Write a failing generator test proving the inventory joins manifest operations, tool contracts, mobile/server registrations, external exposure, architecture-boundary status, declared source references, and independently scanned mutation call sites by stable operation ID.
- [ ] Generate deterministic Markdown sorted by capability then operation. Include both declared and scanned exact mutation source paths plus a `source_hash` so missing declarations and branch drift are visible before a capability migration begins.
- [ ] Add `chat:action-inventory` to regenerate and `chat:action-inventory:check` to fail when the checked-in inventory differs.
- [ ] Treat this generated file as the exact file/call-site authority for Tasks 6.1–6.4. Regenerate before each capability; if source paths changed, update the plan's affected-file checklist before editing.
- [ ] Verify and commit:

```bash
node --test scripts/generate-unified-action-inventory.test.mjs
npm run chat:action-inventory:check
git add scripts/generate-unified-action-inventory.mjs scripts/generate-unified-action-inventory.test.mjs docs/product/unified-chat-action-inventory.md package.json
git diff --cached --check
git commit -m "build(chat): generate universal action inventory"
```

### Task 6.1: Migrate Money without weakening accounting truth

**Files:**
- Read first: `docs/capabilities/money/README.md`
- Add: `src/capabilities/money/actions/moneyActions.ts`
- Add: `src/capabilities/money/actions/moneyActions.test.ts`
- Modify: `src/capabilities/money/data/moneyMutations.ts`
- Modify: `src/capabilities/money/data/moneyMutations.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.ts`
- Modify: `src/capabilities/money/data/livingPlanRepository.test.ts`
- Modify: `src/capabilities/money/screens/MoneyLivingPlanScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`
- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Modify: `scripts/action-runtime-boundary.json`
- Modify: `docs/product/unified-chat-action-inventory.md`

- [ ] Inventory plan target, monthly plan, target difference, expenses, funding sources, saved money, and internal transfers as distinct operations.
- [ ] Write regression tests proving equal-and-opposite internal transfers are not reported as spending and ambiguous payment pairs remain reviewable.
- [ ] Route UI, Chat, voice, and external-safe Money actions through the same functions; require review for destructive reconciliation, account changes, or low-confidence transaction classification.
- [ ] Run `npm test -- --runInBand src/capabilities/money/actions/moneyActions.test.ts src/capabilities/money/data/moneyMutations.test.ts src/capabilities/money/data/moneyRepository.test.ts src/capabilities/money/data/livingPlanRepository.test.ts src/capabilities/money/domain/creditCardPaymentTransfers.test.ts`, then `npm run verify:changed -- --run`.
- [ ] Stage the named Money files, provider/catalog/boundary changes, and regenerated inventory only; run `git diff --cached --check`; commit `refactor(money): share actions across UI and Chat`.

### Task 6.2: Migrate Food and meal-planning actions

**Files:**
- Add: `src/capabilities/recipes/actions/recipeActions.ts`
- Add: `src/capabilities/recipes/actions/recipeActions.test.ts`
- Add: `src/capabilities/meal-planning/actions/mealPlanActions.ts`
- Add: `src/capabilities/meal-planning/actions/mealPlanActions.test.ts`
- Add: `src/capabilities/groceries/actions/groceryActions.ts`
- Add: `src/capabilities/groceries/actions/groceryActions.test.ts`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.ts`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.test.ts`
- Modify: `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- Modify: `src/capabilities/groceries/screens/KrogerCartScreen.tsx`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`
- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Modify: `scripts/action-runtime-boundary.json`
- Modify: `docs/product/unified-chat-action-inventory.md`

- [ ] Preserve authored yield, `Makes …`, batch multipliers, ingredient scaling, provenance, retailer availability, and cart review contracts.
- [ ] Write action tests for find/import/save recipe, add to meal plan, compile groceries, adjust quantities, and review retailer-cart handoff.
- [ ] Keep retailer checkout as explicit external/native handoff unless a server provider has authenticated execution and policy approval.
- [ ] Run `npm test -- --runInBand src/capabilities/recipes/actions/recipeActions.test.ts src/capabilities/meal-planning/actions/mealPlanActions.test.ts src/capabilities/groceries/actions/groceryActions.test.ts src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/groceries/data/groceryRepository.test.ts`, then `npm run verify:changed -- --run`.
- [ ] Stage the named Food files, provider/catalog/boundary changes, and regenerated inventory only; run `git diff --cached --check`; commit `refactor(food): share actions across UI and Chat`.

### Task 6.3: Migrate Screen Time and other device-governed actions

**Files:**
- Add: `src/features/screen-time/actions/screenTimeActions.ts`
- Add: `src/features/screen-time/actions/screenTimeActions.test.ts`
- Modify: `src/features/screen-time/domain/screenTimeGuideActions.ts`
- Modify: `src/features/screen-time/domain/screenTimeGuideActions.test.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffStore.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffStore.test.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffForegroundSync.ts`
- Modify: `src/features/screen-time/runtime/screenTimeHandoffForegroundSync.test.ts`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/unifiedChat/deviceToolProvider.ts`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `scripts/action-runtime-boundary.json`
- Modify: `docs/product/unified-chat-action-inventory.md`

- [ ] Classify each operation as server-readable, device-executable, OS-confirmed, or excluded. Do not represent Screen Time configuration as a completed server write.
- [ ] Write signed-client handoff tests for payload signing, actor/device binding, expiry, replay prevention, result submission, and resumed durable run.
- [ ] Route native UI through the same device action handlers used by Chat handoffs.
- [ ] Complete physical-device proof before marking these operations `live`.
- [ ] Run `npm test -- --runInBand src/features/screen-time/actions/screenTimeActions.test.ts src/features/screen-time/domain/screenTimeGuideActions.test.ts src/features/screen-time/runtime/screenTimeHandoffStore.test.ts src/features/screen-time/runtime/screenTimeHandoffForegroundSync.test.ts`, then `npm run verify:changed -- --run`.
- [ ] Stage the named Screen Time files, provider/boundary changes, and regenerated inventory only; run `git diff --cached --check`; commit `refactor(screen-time): share device actions across UI and Chat`.

### Task 6.4: Close the remaining operation inventory

**Files:**
- Add: `src/capabilities/chores/actions/choreActions.ts`
- Add: `src/capabilities/chores/actions/choreActions.test.ts`
- Add: `src/capabilities/games/actions/gameActions.ts`
- Add: `src/capabilities/games/actions/gameActions.test.ts`
- Add: `src/capabilities/explore/actions/exploreActions.ts`
- Add: `src/capabilities/explore/actions/exploreActions.test.ts`
- Add: `src/capabilities/account/actions/accountActions.ts`
- Add: `src/capabilities/account/actions/accountActions.test.ts`
- Modify: `src/capabilities/chores/screens/ChoresScreen.tsx`
- Modify: `src/capabilities/games/navigation/gamesRouter.ts`
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.tsx`
- Modify: `src/features/account/SettingsHomeScreen.tsx`
- Modify: `src/features/unifiedChat/mobileToolProviderRegistry.ts`
- Modify: `supabase/functions/_shared/serverToolProviderRegistry.ts`
- Modify: `packages/kwilt-agent-runtime/src/externalActionCatalog.ts`
- Modify: `scripts/action-runtime-boundary.json`
- Modify: `docs/product/unified-chat-action-inventory.md`
- Modify: `docs/product/unified-chat-behavior-contract.md`

- [ ] Work the generated coverage table until every declared operation has exactly one truthful channel outcome and an accountable owner.
- [ ] Migrate one capability per commit with regression-first action tests and no declaration-only provider registrations.
- [ ] Keep navigation-only commands as typed navigation results, not fake business receipts.
- [ ] Intentionally excluded operations require a product/safety reason, user-facing explanation, and reconsideration trigger.
- [ ] Run each new action test after its capability migration, followed by `npm run test:chat-contracts`, `npm run architecture:lint`, `npm run chat:action-inventory:check`, and one final `npm run verify:changed -- --run`.
- [ ] Commit Chores, Games, Explore, and Account separately with `refactor(chores): share actions across UI and Chat`, `refactor(games): register conversational actions`, `refactor(explore): share actions across UI and Chat`, and `refactor(account): register governed app actions`.

## Project 7 — Evaluate, harden, and release

### Task 7.1: Build continuous cross-channel evaluation

**Files:**
- Add: `scripts/unified-chat-reliability-eval.mjs`
- Add: `scripts/unified-chat-reliability-eval.test.mjs`
- Modify: `package.json`
- Modify: `docs/product/unified-chat-reliability-scorecard.md`

- [ ] Build deterministic offline checks for registry coverage, policy, schemas, receipts, replays, and state transitions.
- [ ] Build opt-in live-model evaluation that rephrases corpus utterances but scores structured tool, arguments, authorization, and outcome—not prose similarity.
- [ ] Pin dataset and prompt versions, retain failure artifacts with redaction, and compare candidate model routes against the current production route before promotion.
- [ ] Add `test:chat-reliability` for offline CI and keep live evaluation out of default local verification unless credentials and an explicit flag are present.
- [ ] Verify and commit:

```bash
node --test scripts/unified-chat-reliability-eval.test.mjs
npm run test:chat-reliability
npm run verify:changed -- --run
git add scripts/unified-chat-reliability-eval.mjs scripts/unified-chat-reliability-eval.test.mjs package.json docs/product/unified-chat-reliability-scorecard.md
git diff --cached --check
git commit -m "test(chat): gate cross-channel reliability"
```

### Task 7.2: Add production reliability and safety dashboards

**Files:**
- Add: `supabase/migrations/20260827160000_add_agent_reliability_metrics.sql`
- Add: `supabase/functions/_shared/agentRunTelemetry.ts`
- Add: `supabase/functions/_shared/__tests__/agentRunTelemetry.test.ts`
- Modify: `supabase/functions/_shared/agentRunCoordinator.ts`
- Modify: `supabase/functions/_shared/serviceAgentRunPersistence.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.test.ts`
- Add: `docs/operations/unified-chat-reliability.md`

- [ ] Emit accepted, first-progress, model-step, tool-attempt, proposal, handoff, receipt, retry, stop, failure, and terminal timestamps with correlation IDs.
- [ ] Add dashboards/queries for acceptance latency, terminal latency, lost-run rate, replay rate, tool error rate, confirmation rate, handoff completion, policy disagreement, and top unavailable operations by channel.
- [ ] Alert on accepted runs without terminal state, duplicate non-idempotent writes, elevated auth failures, and tool/provider catalog mismatches.
- [ ] Document rollback switches for server Responses, Realtime voice, each capability provider, and external write exposure.
- [ ] Verify and commit:

```bash
npm test -- --runInBand supabase/functions/_shared/__tests__/agentRunTelemetry.test.ts src/features/unifiedChat/unifiedChatTelemetry.test.ts
npm run lint:supabase-functions
npm run verify:changed -- --run
git add supabase/migrations/20260827160000_add_agent_reliability_metrics.sql supabase/functions/_shared/agentRunTelemetry.ts supabase/functions/_shared/__tests__/agentRunTelemetry.test.ts supabase/functions/_shared/agentRunCoordinator.ts supabase/functions/_shared/serviceAgentRunPersistence.ts src/features/unifiedChat/unifiedChatTelemetry.ts src/features/unifiedChat/unifiedChatTelemetry.test.ts docs/operations/unified-chat-reliability.md
git diff --cached --check
git commit -m "feat(chat): add reliability operations telemetry"
```

### Task 7.3: Complete staged runtime proof and rollout

**Files:**
- Update: `docs/product/unified-chat-reliability-scorecard.md`
- Add: `docs/qa/unified-chat-release-proof.md`
- Update: `docs/qa/unified-chat-voice-proof.md`
- Update: `docs/feature-briefs/unified-chat.md`
- Update: `docs/feature-briefs/unified-chat-operational-control-plane.md`
- Update: `docs/feature-briefs/live-conversational-action-runtime.md`
- Update: `docs/feature-briefs/external-ai-connector.md`
- Update: `docs/job-flows/nina-trust-ai-with-my-life-system.md`

- [ ] Gate 1: source/tests—focused regressions, `npm run verify:changed -- --run`, and clean staged diff checks.
- [ ] Gate 2: backend—deployed migration/function provenance, authenticated runs, retry/replay, receipts, and observability.
- [ ] Gate 3: signed Simulator—typed conversation, backgrounding, proposals, native handoffs, and UI parity.
- [ ] Gate 4: physical device—voice, Screen Time/device work, Bluetooth/audio routes, background/foreground, interruption, and poor network.
- [ ] Gate 5: external clients—ChatGPT Developer Mode and Codex OAuth connection against the exact hosted MCP endpoint.
- [ ] Gate 6: staged rollout—internal household, small cohort, then broader release with rollback thresholds.
- [ ] Gate 7: submission/public release—record App Store/TestFlight and ChatGPT directory status separately; never infer public availability from a successful build or deployment.
- [ ] After each proven capability tranche, update `docs/job-flows/nina-trust-ai-with-my-life-system.md` delivery evidence and run `npm run jtbd:lint`.

## Explicit non-goals

- No pixel-tapping or accessibility-tree robot as the primary universal-action architecture.
- No hidden permission escalation based on model confidence or friendly wording.
- No wholesale UI redesign; native presentation changes only where shared action state or confirmation requires them.
- No move of authoritative business data into OpenAI conversation storage.
- No claim of full UI parity until the independent coverage table and runtime proof agree.
- No public-release claim until the relevant store/directory has actually approved and published the version.

## Final definition of done

- Every user-meaningful operation has one canonical action contract, truthful channel outcomes, policy, real provider registrations, receipts/handoffs, tests, and an owner.
- Native UI and all conversational channels call the same capability business function for every migrated mutation.
- Typed and spoken turns survive disconnect/backgrounding and converge on the same durable terminal state.
- Server text uses the approved Responses job with strict, bounded tools and eval-gated routing.
- The hosted OAuth MCP catalog is generated from externally safe real handlers and executes through the canonical dispatcher.
- The Kwilt plugin skills describe and exercise the live catalog without overstating availability.
- Reliability, safety, latency, and parity launch measures pass in the correct proof environments, with rollback controls documented.

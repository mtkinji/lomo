# Unified Chat Agent Runtime — Plan Foundation Implementation Plan

> **For Codex:** Use `executing-plans` to implement this plan in the dedicated `codex/unified-chat-agent-runtime` worktree. Apply Kwilt's pragmatic TDD posture: routing, prompt/tool discovery, scheduling transforms, and shared package code are test-first.

**Goal:** Make “What should I add to my plan tomorrow?” route to real Plan context and produce grounded, structured recommendations through reusable agent-tool contracts, while leaving authoritative Plan apply UI to the next independently executable plan.

**Architecture:** Add a small internal `@kwilt/agent-runtime` package containing environment-neutral tool metadata, discovery inputs, consequence policy, and execution-result envelopes. Unified Chat maps request intent to this registry and invokes a Plan recommendation adapter built on the existing deterministic scheduling engine. This plan intentionally stops at recommendation output because direct multi-item Plan proposal/apply requires a coordinated hosted-workbench protocol and persistence migration; those form the next subsystem plan.

**Tech stack:** TypeScript 5.9, React Native/Expo, Jest, npm workspaces, existing Plan scheduling services, existing Unified Chat durable run repository.

---

## Task 1: Reproduce and repair the Plan routing regression

**Files:**

- Modify: `src/features/unifiedChat/requestPolicy.test.ts`
- Modify: `src/features/unifiedChat/requestPolicy.ts`

1. Add a failing table test for “What should I add to my plan tomorrow?” and close paraphrases. Assert `requestClass: 'capability_question'`, `participatingCapabilities: ['plan']`, `usePrivateContext: true`, and no clarification.
2. Run `npm test -- --runInBand src/features/unifiedChat/requestPolicy.test.ts` and confirm the current ownerless-action failure.
3. Add `plan` to `UnifiedChatCapabilityId`, detect personal Plan/day-planning language, and classify interrogative recommendation intent before generic action verbs. Preserve direct “Add milk” capture and the ownerless “Change it for me” clarification.
4. Run the focused test again and confirm it passes.

## Task 2: Establish portable tool and policy contracts

**Files:**

- Create: `packages/kwilt-agent-runtime/package.json`
- Create: `packages/kwilt-agent-runtime/tsconfig.json`
- Create: `packages/kwilt-agent-runtime/src/types.ts`
- Create: `packages/kwilt-agent-runtime/src/policy.ts`
- Create: `packages/kwilt-agent-runtime/src/policy.test.ts`
- Create: `packages/kwilt-agent-runtime/src/index.ts`
- Modify: `tsconfig.json`

1. Write failing tests for provider types (`server`, `device`, `channel`, `connector`), the six execution-result envelopes, and deterministic consequence policy: authorized read can execute, low-risk reversible capture can execute when explicitly requested, reviewable writes propose, consequential/external/shared writes require confirmation, and unavailable providers yield pending or unavailable rather than success.
2. Run `npm test -- --runInBand packages/kwilt-agent-runtime/src/policy.test.ts` and confirm the module is absent/failing.
3. Implement data-only contracts with no React Native, Supabase, or model SDK imports. Add the workspace package path to root TypeScript resolution.
4. Run the package test and `npm run lint`.

## Task 3: Add progressive tool discovery

**Files:**

- Create: `packages/kwilt-agent-runtime/src/discovery.ts`
- Create: `packages/kwilt-agent-runtime/src/discovery.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Create: `src/features/unifiedChat/toolCatalog.ts`
- Create: `src/features/unifiedChat/toolCatalog.test.ts`

1. Write failing discovery tests proving a Plan recommendation request loads only Plan read/recommendation tools, an ordinary general question loads none, and unavailable provider prerequisites remain visible to routing.
2. Implement exact capability-based discovery over versioned tool definitions. Do not add an LLM classifier or expose every tool schema to every turn.
3. Register the initial `plan.read_day_context` and `plan.recommend_day` definitions plus existing Activity mutation semantics as catalog metadata.
4. Run both focused suites.

## Task 4: Build a deterministic Plan recommendation adapter

**Files:**

- Create: `src/features/unifiedChat/planRecommendationTool.ts`
- Create: `src/features/unifiedChat/planRecommendationTool.test.ts`
- Reuse: `src/services/plan/planScheduling.ts`
- Reuse: `src/services/plan/planDates.ts`

1. Write failing tests using seeded Activities, Goals, Arcs, availability, calendar ids, and busy intervals. Cover tomorrow resolution, bounded recommendation count, exclusion of completed/already-scheduled items, ordered reasons, and `no_write_calendar`/`no_open_slot` truth.
2. Implement an injected, pure adapter around `proposeDailyPlan`. Return serializable recommendation records containing activity id/title, proposed start/end when available, priority position, concise reason inputs, and placement limitation. Do not read stores or calendars inside the pure adapter.
3. Run the focused suite and existing `src/services/plan/planScheduling.test.ts` tests.

## Task 5: Feed Plan evidence and recommendations into a Unified Chat run

**Files:**

- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/capabilityAdapters.test.ts`
- Modify: `src/features/unifiedChat/buildRunContext.ts`
- Modify: `src/features/unifiedChat/buildRunContext.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`
- Modify: `src/features/unifiedChat/threadRepository.ts`

1. Add failing tests showing the exact prompt retrieves bounded Plan candidates and produces a short recommendation answer rather than the deterministic clarification. Assert the initiating `userMessageId` remains attached to the run.
2. Add an injected Plan context loader at the screen/service boundary. It may read the current stores and calendar preferences, but the recommendation adapter remains pure. Missing calendar access must become an explicit limitation, not a failed run.
3. Append durable internal events for tool discovery and recommendation completion. Do not persist raw model reasoning or private context beyond existing evidence rules.
4. Render the first release as concise assistant Markdown plus a single native “Review tomorrow in Plan” return action. Do not claim items were added; direct multi-item apply is intentionally outside this plan.
5. Run the focused Unified Chat suites.

## Task 6: Verify product and architecture contracts

**Files:**

- Verify: `docs/feature-briefs/unified-chat.md`
- Verify: `src/features/unifiedChat/FEATURE.md`
- Verify: `docs/design-explorations/unified-chat-capability-complete-tools/`

1. Run `npm run product:lint` and resolve any brief/manifest drift.
2. Run `npm run architecture:lint`.
3. Run `npm run verify:changed -- --run`.
4. Manually issue the exact prompt in a signed-in iOS simulator. Confirm real recommendations, no generic clarification, honest missing-calendar behavior, stable composer controls, and the Plan return path. Record simulator/device boundaries explicitly.

## Follow-on plan boundary

The next plan will add typed multi-item Plan proposals, persistence/migrations, hosted-workbench selection controls, authoritative calendar apply/recovery, batch idempotency, receipts, correction, and native exact return. It must coordinate the Kwilt app protocol with the hosted workbench source; recommendation-only output must never be described as direct apply.


# On-Device Response Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unsafe or slow local drafts from degrading Chat, capture physical-device latency evidence, and allow every promoted local cohort to be disabled remotely without another app release.

**Architecture:** The existing generation-job contract gains explicit first-useful-output and total-duration measurement targets. The local provider withholds cumulative snapshots until a task-owned deterministic fidelity check passes, continues healthy native work after a missed target, and reports content-free timing and warm-state evidence. A demotion-only PostHog policy cache can disable bundled local defaults but cannot remotely promote a challenger. Development builds expose explicit benchmark actions through the existing Dev Tools screen and share the native JSON artifact.

**Tech Stack:** TypeScript, Jest, React Native, AsyncStorage, PostHog feature flags, Swift/Apple Foundation Models, Expo native modules.

---

### Task 1: Guard progressive local output

**Files:**
- Modify: `src/features/unifiedChat/onDeviceGenerationQuality.ts`
- Modify: `src/features/unifiedChat/onDeviceGenerationQuality.test.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.test.ts`

- [x] Add a failing test proving `I'm hungry.` is never published for `Rewrite this more warmly: I will be late.` while a later snapshot containing `late` is published.
- [x] Export `canPublishOnDeviceGenerationSnapshot({ task, prompt, output })`; for rewrite/proofread it must reject empty text, response prefaces, and output with no meaningful source-word overlap.
- [x] Apply the snapshot predicate before `onUpdate` and rerun both quality/provider suites.

### Task 2: Measure local latency targets without time-based fallback

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.test.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.test.ts`

- [x] Add failing contract tests for `targetFirstUsefulOutputMs` and `targetTotalDurationMs` on every local job.
- [x] Add fake-timer provider tests proving streaming and final-only work continue locally after missing their measurement targets.
- [x] Keep the targets observational; cancel native generation only for user cancellation and use cloud only after actual local unavailability, errors, or final quality rejection.
- [x] Return `firstOutputMs`, `durationMs`, and `warmState` as content-free provider evidence without changing persisted response content.

### Task 3: Add demotion-only remote rollback

**Files:**
- Create: `src/features/unifiedChat/onDeviceGenerationPolicy.ts`
- Create: `src/features/unifiedChat/onDeviceGenerationPolicy.test.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`

- [x] Write failing tests for cached disablement, missing/invalid flag fallback, remote re-enable, and the invariant that challenger/disabled jobs cannot be remotely promoted.
- [x] Implement one PostHog boolean flag per job using `kwilt-on-device-generation-<job-id>`, cache only explicit remote decisions in AsyncStorage, and make policy reads await cache hydration before generation.
- [x] Resolve effective promotion as `disabled` when the remote decision is false; otherwise retain the bundled promotion exactly.
- [x] Re-read PostHog's cached flags at each local attempt and persist bounded job decisions only—never prompts, outputs, user ids, or device identifiers.

### Task 4: Capture and export physical-device evidence

**Files:**
- Modify: `src/services/analytics/events.ts`
- Modify: `src/services/analytics/analytics.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`
- Modify: `src/features/unifiedChat/onDeviceGenerationBenchmark.ts`
- Modify: `src/features/unifiedChat/onDeviceGenerationBenchmark.test.ts`
- Modify: `src/features/dev/DevToolsScreen.tsx`

- [x] Add failing execution tests for provider start, first safe output, final duration, fallback start, fallback completion, and warm-state metadata with no content fields.
- [x] Emit a dedicated content-free Chat response latency event with numeric `first_output_ms`, `total_ms`, and `fallback_ms`, plus bounded provider/outcome/job/warm-state fields.
- [x] Extend the benchmark payload builder to select cases and variants; test a 30-cold/30-prewarmed `thread_title` gate and the existing two-repetition full corpus.
- [x] Add explicit Dev Tools actions that run the quick corpus or title gate through `runBenchmark`, then open the iOS share sheet for `file://<returned-path>`.

### Task 5: Verify before rebuilding

**Files:**
- Modify: `docs/feature-briefs/on-device-generative-routing.md`
- Modify: `docs/design-explorations/on-device-generative-routing-strategy/05-evaluate-learning.md`

- [x] Record the safe-reveal, observational target, disclosed fallback, rollback, telemetry, and explicit benchmark contracts.
- [x] Run focused Jest suites, `npm run lint`, `npm run lint:tests`, and `npm run verify:changed -- --run`.
- [x] Confirm `git diff --check`, no prompt/output analytics, no provider controls in ordinary Chat, and preservation of the pre-existing Conversation Mode files.

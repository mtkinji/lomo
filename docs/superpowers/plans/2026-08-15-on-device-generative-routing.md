# On-Device Generative Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Kwilt’s portable generation-job contract, preserve the existing Chat local-first behavior on that contract, and add on-device-first opening-thread titles with cloud fallback.

**Architecture:** Add provider-neutral job definitions to `@kwilt/agent-runtime`, project existing cloud routing from those definitions, and let the native Chat provider consume local job budgets and instructions. The first new cohort injects an optional on-device title generator into existing background title maintenance; a missing, failed, or invalid local title falls through to the existing cloud helper without affecting the visible answer.

**Tech Stack:** TypeScript, Jest, Expo Modules, Apple Foundation Models, Supabase Edge Functions/Deno imports, React Native.

---

### Task 1: Define the portable generation-job contract

**Files:**
- Create: `packages/kwilt-agent-runtime/src/generationJobContracts.ts`
- Create: `packages/kwilt-agent-runtime/src/generationJobContracts.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`

- [ ] **Step 1: Write failing contract tests**

Cover stable job lookup, local promotion and budgets for the five existing Chat tasks plus `thread_title`, cloud-only exclusions, privacy-aware fallback values, and frozen contract objects.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx jest packages/kwilt-agent-runtime/src/generationJobContracts.test.ts --runInBand`

Expected: FAIL because the generation contract module does not exist.

- [ ] **Step 3: Implement the minimal typed registry**

Define `KwiltGenerationJobId`, `KwiltCloudTier`, `KwiltCloudFallbackPolicy`, `KwiltLocalPromotion`, `KwiltGenerationJobContract`, `KWILT_GENERATION_JOB_CONTRACTS`, and `getKwiltGenerationJobContract`. Include every current server `KwiltAiJob` plus `chat_rewrite`, `chat_proofread`, `chat_shorten`, `chat_summarize`, `chat_brainstorm`, and `thread_title`.

- [ ] **Step 4: Export the contract and rerun the test**

Run the same Jest command and expect PASS.

### Task 2: Project cloud model routing from the shared registry

**Files:**
- Modify: `supabase/functions/_shared/aiModelRouting.ts`
- Modify: `supabase/functions/_shared/__tests__/aiModelRouting.test.ts`
- Modify: `src/services/ai.ts`

- [ ] **Step 1: Add failing parity tests**

Assert that every server-routable job resolves the cloud model recorded by the portable contract, unknown jobs still normalize to `default_chat`, image generation retains its explicit image-model override, and local-only additions do not change existing cloud assignments.

- [ ] **Step 2: Run the Deno-compatible Jest test and verify failure**

Run: `npx jest supabase/functions/_shared/__tests__/aiModelRouting.test.ts --runInBand`

- [ ] **Step 3: Replace the duplicate server model map**

Import the portable contract source from `packages/kwilt-agent-runtime`, derive `KwiltAiJob` from the portable id type, and resolve cloud models from contract data. Keep route allowlisting and image override behavior unchanged.

- [ ] **Step 4: Replace the duplicate client job union**

Import the portable type into `src/services/ai.ts`; preserve existing `getCoachAiJob` behavior and cloud headers.

- [ ] **Step 5: Rerun focused server and AI service tests**

Run: `npx jest supabase/functions/_shared/__tests__/aiModelRouting.test.ts src/services/ai.test.ts --runInBand`

### Task 3: Make existing Chat local eligibility contract-driven

**Files:**
- Modify: `src/features/unifiedChat/localChatRoute.ts`
- Modify: `src/features/unifiedChat/localChatRoute.test.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.test.ts`

- [ ] **Step 1: Add failing route and provider tests**

Assert that task input limits and output-token budgets come from the registered job, a disabled local promotion routes to cloud, and all existing boundaries remain unchanged.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx jest src/features/unifiedChat/localChatRoute.test.ts src/features/unifiedChat/onDeviceChatProvider.test.ts --runInBand`

- [ ] **Step 3: Map Chat tasks to portable job ids**

Keep the public route result task names stable, but derive maximum input length, local-default eligibility, and maximum response tokens from the registry instead of duplicated constants.

- [ ] **Step 4: Rerun focused tests**

Expect all existing and new cases to pass.

### Task 4: Add on-device-first opening-thread titles

**Files:**
- Modify: `src/features/unifiedChat/threadTitle.ts`
- Modify: `src/features/unifiedChat/threadTitle.test.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.test.ts`
- Modify: `src/services/ai.ts`
- Modify: `src/services/ai.test.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write failing prompt, provider, and fallback tests**

Cover a bounded plain-text title prompt, local output passing through `normalizeSuggestedThreadTitle`, successful local title bypassing the cloud helper fetch, invalid/unavailable/failed local output making exactly one existing cloud helper request, and title failure never breaking the answer.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx jest src/features/unifiedChat/threadTitle.test.ts src/features/unifiedChat/onDeviceChatProvider.test.ts src/services/ai.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts --runInBand`

- [ ] **Step 3: Extend the title policy with an optional local generator**

Add `generateOpeningTitle?: (turns: CoachChatTurn[]) => Promise<string | null>` to the existing background title policy. Try it first; only call the cloud title helper when it returns null or throws.

- [ ] **Step 4: Implement the local title job**

Build a bounded transcript prompt, call the same native provider using `thread_title` instructions and the registry token budget, normalize the result, and emit content-free provider telemetry. Do not delay the main Chat answer.

- [ ] **Step 5: Rerun focused tests**

Expect successful local title generation to avoid the second cloud request and all fallback cases to preserve existing behavior.

### Task 5: Product links and verification

**Files:**
- Modify: `src/features/unifiedChat/FEATURE.md`
- Verify: design exploration, feature brief, portable registry, mobile route, native provider, and server routing diffs.

- [ ] **Step 1: Run product and architecture lint**

Run: `npm run product:lint && npm run architecture:lint`

- [ ] **Step 2: Run the complete focused suite**

Run: `npx jest packages/kwilt-agent-runtime/src/generationJobContracts.test.ts supabase/functions/_shared/__tests__/aiModelRouting.test.ts src/features/unifiedChat/localChatRoute.test.ts src/features/unifiedChat/onDeviceChatProvider.test.ts src/features/unifiedChat/threadTitle.test.ts src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts src/services/ai.test.ts --runInBand`

- [ ] **Step 3: Run the repository completion ritual**

Run: `npm run verify:changed -- --run`

- [ ] **Step 4: Perform runtime proof**

Build/install from `/Users/andrewwatanabe/Kwilt` on `codex/ai-chat-dogfood`, record HEAD and dirty state, and verify one eligible local writing task, one local title success without a helper cloud call, and one forced/unavailable fallback. Keep physical-iPhone cold/warm, energy, thermal, and repeated-use proof explicitly open unless run on signed hardware.

- [ ] **Step 5: Review the final diff**

Confirm no provider selector, no direct model mutations, no prompt/response analytics, no cloud-model changes, and no unrelated dirty files were staged or overwritten.

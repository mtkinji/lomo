# On-Device Response Latency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bounded Chat generations feel immediate while preserving quality through selective local promotion, deterministic validation, and seamless cloud fallback.

**Architecture:** Apple Foundation Models will publish cumulative response snapshots through the existing Expo module while keeping one fresh session per isolated request. Unified Chat will project those snapshots as an ephemeral assistant message in the existing workbench timeline and persist only the validated final response. The AI proxy and client will support SSE only for plain text completions with no tools or structured output; every other request retains the current buffered contract.

**Tech Stack:** Swift and Apple Foundation Models, Expo Modules events, React Native/TypeScript, Jest, Supabase Edge Functions, OpenAI Chat Completions SSE.

---

## Product and UI contract

Job: When Nina asks Kwilt for a bounded writing transformation, she needs a useful answer to begin appearing immediately, so she can trust Chat without choosing or supervising infrastructure.

Authority chain: accepted on-device routing brief -> Unified Chat durable run contract -> existing Kwilt workbench timeline -> Apple Foundation Models and OpenAI streaming APIs.

Three-second read: the requested answer is already appearing in the ordinary assistant position.

Primary action: continue reading; Stop remains the existing active-turn action.

Primary information: the cumulative generated answer.

Secondary information: existing run progress until the first response text arrives.

Reveal later: nothing.

Scan order: user message -> progressive assistant answer -> composer.

Must not add: provider labels, model controls, local/cloud badges, quality warnings, duplicate bubbles, or settings.

Reuse map: response -> existing assistant message rendering; active work -> existing run/composer state; fallback -> existing cloud route.

Nearest precedent: the current Unified Chat assistant timeline; streaming changes timing, not visual hierarchy.

External exemplar ledger: N/A.

Behavior sources: automatic invisible routing and fallback from `docs/feature-briefs/on-device-generative-routing.md`; durable final-message ownership from `runUnifiedChatTurn`; existing workbench protocol v2 for rendering.

Unresolved decisions: physical-device energy and thermal thresholds remain a later evidence gate, not a user-facing choice.

Required states: local streaming, validated local completion, local validation failure with cloud replacement, cancellation, unsupported device, cloud streaming, and buffered structured/tool responses.

Proof path: iPhone 17 Pro Simulator from `/Users/andrewwatanabe/Kwilt` on `codex/ai-chat-dogfood`; physical iPhone remains separately labeled.

### Task 1: Encode the measured local quality boundary

**Files:**
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.ts`
- Modify: `packages/kwilt-agent-runtime/src/generationJobContracts.test.ts`
- Create: `src/features/unifiedChat/onDeviceGenerationQuality.ts`
- Create: `src/features/unifiedChat/onDeviceGenerationQuality.test.ts`
- Modify: `src/features/unifiedChat/threadTitle.ts`
- Modify: `src/features/unifiedChat/threadTitle.test.ts`

- [ ] **Step 1: Write failing promotion and quality tests**

Assert that `chat_shorten` and `chat_brainstorm` are challenger jobs, proofread/rewrite/summarize remain local-default, overlong summaries fail closed, and `Title: Efficient Saturday Routine` normalizes to `Efficient Saturday Routine`.

The quality API is:

```ts
export type OnDeviceGenerationQualityResult =
  | { accepted: true; text: string }
  | { accepted: false; reason: 'empty' | 'preface' | 'not_concise' };

export function validateOnDeviceGenerationResult(input: {
  task: OnDeviceGenerationTask;
  prompt: string;
  output: string;
}): OnDeviceGenerationQualityResult;
```

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```bash
npx jest packages/kwilt-agent-runtime/src/generationJobContracts.test.ts src/features/unifiedChat/onDeviceGenerationQuality.test.ts src/features/unifiedChat/threadTitle.test.ts --runInBand
```

Expected: failures for the two promotions, missing quality module, and unstripped title prefix.

- [ ] **Step 3: Implement the smallest deterministic boundary**

Trim output, reject common response prefaces, require summaries to be materially shorter than their supplied source, demote the two failed benchmark cohorts, and strip one leading `Title:` label before existing title validation.

- [ ] **Step 4: Rerun and confirm GREEN**

Run the command from Step 2 and expect all suites to pass.

### Task 2: Stream Apple snapshots and prewarm outside the request path

**Files:**
- Modify: `modules/kwilt-foundation-models/ios/KwiltFoundationModelsModule.swift`
- Modify: `modules/kwilt-foundation-models/index.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.ts`
- Modify: `src/features/unifiedChat/onDeviceChatProvider.test.ts`

- [ ] **Step 1: Write failing provider tests**

Use a fake native module that emits cumulative events for one request id. Assert that the provider ignores other request ids, publishes snapshots only for proofread/rewrite, validates the final result, removes its listener on success/failure/cancellation, and exposes idempotent prewarming.

The provider contract becomes:

```ts
export type GenerateOnDeviceChatResponse = (
  request: OnDeviceChatRequest,
  signal?: AbortSignal,
  onUpdate?: (text: string) => void,
) => Promise<OnDeviceChatResult>;

export async function prewarmOnDeviceChatModel(
  nativeModule?: FoundationModelsProviderModule | null,
): Promise<void>;
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx jest src/features/unifiedChat/onDeviceChatProvider.test.ts --runInBand
```

- [ ] **Step 3: Add the native event and warmup lifecycle**

Register `Events("onGenerationSnapshot")`, replace the production `respond` call with `streamResponse`, emit `{ requestId, text, durationMs }` cumulative snapshots, and still resolve `generateText` with the validated final native output contract. Keep the actor queue and fresh session per request. Retain one prewarm session in the actor and make repeated `prewarm` calls no-ops.

- [ ] **Step 4: Subscribe, validate, and clean up in TypeScript**

Subscribe before `generateText`, filter by request id, publish only strong streaming cohorts, validate final output, map rejection to `quality_gate_failed`, and remove the subscription in `finally`.

- [ ] **Step 5: Rerun provider tests**

Run the command from Step 2 and expect PASS.

### Task 3: Project streaming text into the existing assistant position

**Files:**
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.ts`
- Modify: `src/features/unifiedChat/buildWorkbenchSnapshot.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`

- [ ] **Step 1: Write failing projection and execution tests**

Add a presentation-only `streamingResponse: { runId: string; text: string }`. Assert that an active run receives one synthetic assistant message at `${runId}:streaming`, the timeline replaces the progress row with that message, complete runs ignore stale streaming state, and execution forwards cumulative local/cloud updates without persisting partial text.

- [ ] **Step 2: Run and confirm RED**

```bash
npx jest src/features/unifiedChat/buildWorkbenchSnapshot.test.ts src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts --runInBand
```

- [ ] **Step 3: Implement transient projection**

Extend `WorkbenchPresentation`, append a sanitized synthetic message only while the matching run is queued/active, and point only the projected run at that message id. Do not mutate the durable aggregate.

- [ ] **Step 4: Thread progress through execution**

Add this optional input callback:

```ts
onResponseProgress?: (progress: { runId: string; text: string }) => void;
```

Pass it to the on-device provider and plain cloud chat options. Do not forward updates from recovery/tool/structured branches where partial prose is not authoritative.

- [ ] **Step 5: Wire the screen without adding UI**

Store the latest progress item in screen state, include it in `buildWorkbenchSnapshot`, clear it before each new attempt and in `finally`, and invoke `prewarmOnDeviceChatModel()` once when the enabled Chat surface mounts.

- [ ] **Step 6: Rerun focused tests**

Run the command from Step 2 and expect PASS.

### Task 4: Stream plain cloud completions through Supabase

**Files:**
- Create: `supabase/functions/_shared/aiChatCompletionStream.ts`
- Create: `supabase/functions/_shared/__tests__/aiChatCompletionStream.test.ts`
- Modify: `supabase/functions/ai-chat/index.ts`
- Modify: `src/services/ai.ts`
- Modify: `src/services/ai.test.ts`

- [ ] **Step 1: Write failing SSE parser tests**

Define a pure parser that accepts arbitrarily split UTF-8 chunks, returns cumulative assistant text deltas, captures the final usage object, ignores `[DONE]`, and rejects malformed event payloads without corrupting already parsed text.

```ts
export type ChatCompletionStreamUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export function createChatCompletionStreamAccumulator(): {
  push(chunk: Uint8Array): { textDeltas: string[]; usage: ChatCompletionStreamUsage | null };
  finish(): { textDeltas: string[]; usage: ChatCompletionStreamUsage | null };
};
```

- [ ] **Step 2: Run and confirm RED**

```bash
npx jest supabase/functions/_shared/__tests__/aiChatCompletionStream.test.ts src/services/ai.test.ts --runInBand
```

- [ ] **Step 3: Add proxy pass-through streaming**

For `stream: true` chat completions, force `stream_options.include_usage = true`, request `text/event-stream` upstream, wrap the upstream body in a forwarding `ReadableStream`, parse only for content-free usage telemetry, and return headers immediately. Schedule final usage and request telemetry with `EdgeRuntime.waitUntil` when available. Keep all non-stream routes byte-for-byte on the current buffered path.

- [ ] **Step 4: Add client SSE consumption**

Request streaming only when `onTextUpdate` is provided and the request has no tools, structured response format, or web search. Parse cumulative text, invoke `onTextUpdate`, and return the same final string contract used by persistence. Tool loops and maintenance calls remain buffered.

- [ ] **Step 5: Rerun stream and AI tests**

Run the command from Step 2 and expect PASS.

### Task 5: Record evidence and verify the real path

**Files:**
- Modify: `docs/feature-briefs/on-device-generative-routing.md`
- Modify: `docs/design-explorations/on-device-generative-routing-strategy/05-evaluate-learning.md`
- Modify: `App.tsx`

- [ ] **Step 1: Remove automatic benchmark execution**

Keep the explicit native benchmark hook available for development, but remove the app-root environment-triggered run so ordinary development launches cannot accidentally execute 48 generations.

- [ ] **Step 2: Record measured promotion decisions**

Document Simulator-only evidence: proofread/rewrite strong and sub-second, summarize useful around two seconds, shorten/brainstorm not promoted, streaming first output 0.3–0.6 seconds, and physical-device energy/thermal proof still open.

- [ ] **Step 3: Run focused and diff-aware verification**

```bash
npm run lint
npm run lint:tests
npm run verify:changed -- --run
```

- [ ] **Step 4: Build and inspect Simulator behavior**

Build/install the native app on the sole iPhone 17 Pro Simulator. Verify progressive proofread/rewrite text occupies one assistant position, final text persists once, Stop cancels, forced local rejection falls through without duplicate text, and unsupported local availability retains cloud behavior.

- [ ] **Step 5: Review scope and dirty-work preservation**

Confirm there are no provider controls or analytics containing prompt/response text, no edits in `/Users/andrewwatanabe/kwilt-site`, and the pre-existing Conversation activation files remain preserved and unstaged unless Andrew later asks to commit all.

# Conversation Mode Streaming and Latency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended only when Andrew explicitly asks for subagents) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kwilt conversation mode acknowledge longer work immediately with a truthful Marin progress phrase, then begin a concise useful response quickly without retaining generated conversation recordings, while shortening ordinary agent composition from the current 3.9-second median through a safe one-model fast path.

**Architecture:** Keep the cost-conscious cascade: realtime transcription → Kwilt's existing text agent → OpenAI Speech API. Add privacy-safe phase timing first, then let stable, context-free conversation turns bypass the redundant model-based judgment call while preserving the full judgment/tool path for private context and actions. Persist the final assistant message as usual, and let an authenticated Supabase Edge Function stream that owner-scoped message directly to Expo Audio with no generated-audio file.

**Tech Stack:** React Native 0.83, Expo SDK 55, TypeScript, `expo-audio`, `expo-file-system`, Supabase Auth/Postgres/Edge Functions, OpenAI Chat Completions and Speech APIs, Jest, Deno tests, PostHog metadata-only telemetry, signed iPhone verification.

---

## Product and proof contract

### User outcome

When the user finishes a short spoken request, Kwilt should begin a useful spoken answer quickly enough to feel like a dependable home assistant. The same concise answer remains visible in the durable Chat timeline. Generated audio is ephemeral and is never retained as conversation history.

### Current measured baseline

- Historical production agent runs, last 14 days: 17 completed or partial runs.
- Agent answer-ready latency: p50 3,929 ms; p90 12,945 ms.
- Historical assistant length: p50 199 characters; p90 628 characters.
- Authenticated Marin speech generation plus complete response transfer:
  - 37 characters: p50 1,445 ms across five calls.
  - 90 characters: p50 1,681 ms across five calls.
  - 210 characters: p50 2,634 ms across three calls.
- These are separate agent and speech measurements, not a microphone-to-speaker trace.
- Current speech waits for the complete MP3, encodes it as base64 JSON, writes a cache file, and only then creates the player.
- Current ordinary Chat planning can make a sequential `gpt-5.6-luna` judgment request before the `gpt-4o-mini` answer request.

### Release gates

For stable, ordinary conversation turns with no tool or private-context requirement:

- agent turn start → persisted answer: p50 ≤ 2,000 ms and p90 ≤ 4,000 ms;
- end of speech → truthful progress speech, when the turn qualifies: p50 ≤ 750 ms and p90 ≤ 1,250 ms;
- end of speech → first useful audio: p50 ≤ 3,000 ms and p90 ≤ 6,000 ms;
- interruption → audible stop: p95 ≤ 300 ms;
- no generated audio remains after normal completion, interruption, app restart, or a one-hour legacy-cache sweep;
- fast-path routing must not reduce action/context safety on the regression corpus;
- a status sound, animation, or generic acknowledgement does not count as useful audio.

Progress speech does not replace the useful-answer gate. It makes longer waits
legible by naming work that has actually started. It must run concurrently with
agent work, never serialize planning behind another network request, and never
claim that Kwilt found, changed, saved, scheduled, or completed anything.

Complex tool turns do not inherit the ordinary-turn latency target. They must expose an honest working state and may speak a truthful progress phrase only when it does not imply success.

### Cost and privacy boundaries

- Continue using the Speech API, not speech-to-speech Realtime output.
- Streaming transport must not change the chosen speech model's billing class.
- Never place message text, a Supabase access token, or an OpenAI credential in the stream URL.
- The stream URL may contain only the assistant message UUID. The request must carry the user's Supabase bearer token and publishable key in headers.
- The Edge Function must select the assistant message through the caller's RLS-scoped Supabase client.
- Return `Cache-Control: no-store`; do not write audio to Supabase Storage or Postgres.
- Keep the speech model and voice environment-configurable because current OpenAI documentation is inconsistent about the long-term status of `gpt-4o-mini-tts` even though the current TTS guide still recommends it and Marin.
- Progress phrases are a structured set of 24 bundled, non-personal Marin
  recordings: eight truthful work-state families with three reviewed variants
  each. They are intentional app assets, not retained conversation audio. Their
  text is fixed in source, contains no user data, and requires no request-time
  TTS. Selection is deterministic and session-local, avoids immediate repeats,
  and never derives wording from the user's message.

## File structure

### Create

- `src/features/liveConversation/conversationLatency.ts` — metadata-only milestone tracker and duration buckets.
- `src/features/liveConversation/conversationLatency.test.ts` — monotonic timing, missing-stage, and privacy-shape tests.
- `src/features/liveConversation/conversationTurnProfile.ts` — decides whether a turn qualifies for the safe one-model conversation path and owns the concise-response contract.
- `src/features/liveConversation/conversationTurnProfile.test.ts` — fast-path allow/deny corpus.
- `src/features/liveConversation/conversationProgressCue.ts` — maps authorized work state to a fixed truthful phrase and local Marin asset.
- `src/features/liveConversation/conversationProgressCue.test.ts` — cue eligibility, truth, and non-interference tests.
- `src/features/liveConversation/conversationProgressSpeech.ts` — local cue playback and arbitration with final streamed speech.
- `src/features/liveConversation/conversationProgressSpeech.test.ts` — start, cancellation, overlap, and barge-in tests.
- `scripts/generate-conversation-progress-audio.mjs` — reproducibly generates only the reviewed fixed Marin phrases and their hashes.
- `src/features/liveConversation/liveConversationSpeech.ts` — authenticated remote stream player, cancellation, start timeout, and full-file fallback.
- `src/features/liveConversation/liveConversationSpeech.test.ts` — URL/header/player/fallback/cancellation contracts.
- `src/capabilities/recipes/voice/cookVoiceCacheCleanup.ts` — bounded cleanup of legacy `kwilt-cook-voice-*` files.
- `src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts` — TTL and filename-selection tests.
- `assets/audio/conversation/{current-lookup,kwilt-lookup,multi-source,prepare-review,compare-calculate,thoughtful-reasoning,retry-recover,general-work}-{01,02,03}.mp3` — 24 reviewed Marin progress clips, three variants for each truthful work-state family.
- `assets/audio/conversation/manifest.json` — phrase, model, voice, and SHA-256 identity for each reviewed clip.

### Modify

- `docs/feature-briefs/live-conversational-action-runtime.md` — replace the obsolete sub-second target with measured staged gates and record the accepted streaming decision.
- `src/features/unifiedChat/UnifiedChatScreen.tsx` — mark latency milestones, pass conversation interaction mode, speak the persisted assistant message, and make speaking state truthful.
- `src/features/unifiedChat/runUnifiedChatTurn.ts` — accept interaction mode and expose privacy-safe phase milestones.
- `src/features/unifiedChat/turnPlanningPhase.ts` — apply the conversation fast-path decision before model judgment.
- `src/features/unifiedChat/turnExecutionPhase.ts` — add the concise spoken-answer prompt and output-token bound.
- `src/features/unifiedChat/hybridRequestPolicy.ts` — preserve existing full judgment behavior outside eligible conversation turns.
- `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts` — verify milestones and one-model routing.
- `src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts` — verify action/context turns remain on the full path.
- `src/services/ai.ts` — accept a per-request `maxOutputTokens` and send it as `max_tokens`.
- `src/services/analytics/events.ts` — register one metadata-only conversation latency event.
- `src/features/unifiedChat/unifiedChatTelemetry.ts` — build bounded latency telemetry with no content fields.
- `src/features/unifiedChat/unifiedChatTelemetry.test.ts` — assert the telemetry allowlist.
- `supabase/functions/_shared/cookVoiceSpeech.ts` — validate stream message IDs and build the shared provider request.
- `supabase/functions/_shared/__tests__/cookVoiceSpeech_deno_test.ts` — validate GET parsing, bounded message text, provider format, and cache headers.
- `supabase/functions/cook-voice-speech/index.ts` — preserve POST compatibility and add authenticated GET streaming from an owner-scoped assistant message.
- `src/capabilities/recipes/voice/cookVoiceNaturalSpeech.ts` — call legacy cache cleanup and retain the full-file fallback.

No schema migration and no new audio-storage table are required. The durable `kwilt_agent_messages` row already owns the authoritative text and RLS policy.

## Task 1: Correct the accepted brief and lock the measurable contract

**Files:**
- Modify: `docs/feature-briefs/live-conversational-action-runtime.md`

- [ ] **Step 1: Replace the unsupported sub-second target**

Replace the current ordinary-turn paragraph with:

```markdown
For stable ordinary conversation turns that require neither private Kwilt
context nor tools, the staged target from end-of-speech to first useful audio is
p50 at or below three seconds and p90 at or below six seconds on a signed device
and representative network. Agent turn start to persisted answer must be p50 at
or below two seconds and p90 at or below four seconds for that class. A status
sound, animation, or generic acknowledgement does not count as a useful
response. Complex tool turns may take longer but must expose an honest working
state and must not claim success before an authoritative capability receipt.
When deterministic classification shows that a turn will use the full path,
Kwilt may immediately play one fixed Marin phrase naming the work that started;
progress-audio targets are p50 at or below 750 ms and p90 at or below 1,250 ms
and remain separate from useful-answer latency.
```

- [ ] **Step 2: Record the accepted delivery decision**

Add this paragraph under the current proof boundary:

```markdown
The accepted speech delivery path streams the authenticated Speech API response
to native playback after the assistant message is durably persisted. The stream
resolves text by owner-scoped assistant message id, sends no message text in a
URL, sets `Cache-Control: no-store`, and creates no durable audio object. The
existing full-file path remains a temporary fallback until signed-device stream
proof passes. Qualifying longer turns may concurrently play one bundled,
non-personal Marin progress phrase selected from deterministic work state. Fast
direct turns remain silent so an acknowledgement cannot delay the answer.
```

- [ ] **Step 3: Verify taxonomy and document formatting**

Run:

```bash
npm run jtbd:lint
```

Expected: exit 0 with the existing `serves:` references valid.

- [ ] **Step 4: Commit the contract**

```bash
git add docs/feature-briefs/live-conversational-action-runtime.md
git commit -m "docs: set conversation latency contract"
```

## Task 2: Add privacy-safe end-to-end latency milestones

**Files:**
- Create: `src/features/liveConversation/conversationLatency.ts`
- Create: `src/features/liveConversation/conversationLatency.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/services/analytics/events.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.test.ts`
- Test: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`

- [ ] **Step 1: Write the failing latency tracker tests**

Create tests around this public contract:

```ts
import { createConversationLatencyTracker } from './conversationLatency';

describe('createConversationLatencyTracker', () => {
  it('projects durations from speech stop without retaining content', () => {
    let now = 1_000;
    const tracker = createConversationLatencyTracker(() => now);
    tracker.mark('speech_stopped');
    now = 1_180;
    tracker.mark('transcript_final');
    now = 1_260;
    tracker.mark('turn_started');
    now = 2_100;
    tracker.mark('planning_complete');
    now = 2_300;
    tracker.mark('context_ready');
    now = 2_900;
    tracker.mark('answer_ready');
    now = 3_350;
    tracker.mark('playback_started');

    expect(tracker.snapshot()).toEqual({
      transcript_final_ms: 180,
      turn_start_ms: 260,
      planning_complete_ms: 1100,
      context_ready_ms: 1300,
      answer_ready_ms: 1900,
      first_audio_ms: 2350,
    });
    expect(JSON.stringify(tracker.snapshot())).not.toMatch(/prompt|message|text|transcript/i);
  });

  it('omits stages that have not happened', () => {
    const tracker = createConversationLatencyTracker(() => 500);
    tracker.mark('speech_stopped');
    expect(tracker.snapshot()).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tracker test and observe the expected failure**

Run:

```bash
npx jest src/features/liveConversation/conversationLatency.test.ts --runInBand
```

Expected: FAIL because `conversationLatency.ts` does not exist.

- [ ] **Step 3: Implement the milestone tracker**

Create `conversationLatency.ts` with this interface and behavior:

```ts
export type ConversationLatencyMilestone =
  | 'speech_stopped'
  | 'transcript_final'
  | 'turn_started'
  | 'planning_complete'
  | 'context_ready'
  | 'answer_ready'
  | 'progress_audio_started'
  | 'speech_request_started'
  | 'playback_started';

const OUTPUT_KEYS: Partial<Record<ConversationLatencyMilestone, string>> = {
  transcript_final: 'transcript_final_ms',
  turn_started: 'turn_start_ms',
  planning_complete: 'planning_complete_ms',
  context_ready: 'context_ready_ms',
  answer_ready: 'answer_ready_ms',
  progress_audio_started: 'first_progress_audio_ms',
  speech_request_started: 'speech_request_ms',
  playback_started: 'first_audio_ms',
};

export function createConversationLatencyTracker(now = () => performance.now()) {
  const marks = new Map<ConversationLatencyMilestone, number>();
  return {
    mark(name: ConversationLatencyMilestone) {
      if (!marks.has(name)) marks.set(name, now());
    },
    snapshot(): Record<string, number> {
      const origin = marks.get('speech_stopped');
      if (origin === undefined) return {};
      return Object.entries(OUTPUT_KEYS).reduce<Record<string, number>>((result, [name, key]) => {
        const value = marks.get(name as ConversationLatencyMilestone);
        if (value !== undefined && key) result[key] = Math.max(0, Math.round(value - origin));
        return result;
      }, {});
    },
  };
}
```

- [ ] **Step 4: Expose phase milestones from the durable turn**

Add to `RunUnifiedChatTurnInput`:

```ts
interactionMode?: 'text' | 'conversation';
onLatencyMilestone?: (
  milestone: 'turn_started' | 'planning_complete' | 'context_ready' | 'answer_ready',
) => void;
```

Mark `turn_started` immediately on entry, `planning_complete` after
`planUnifiedChatTurnPhase`, `context_ready` after `authorizeUnifiedChatContextPhase`,
and `answer_ready` only after the assistant message has been inserted and the run
has been finalized. Do not pass text, identifiers, or context into the callback.

- [ ] **Step 5: Add bounded analytics projection**

Register:

```ts
UnifiedChatConversationLatency: 'unified_chat_conversation_latency',
```

Add a builder that emits only:

```ts
{
  outcome,
  planning_strategy,
  request_class,
  transcript_final_bucket,
  planning_complete_bucket,
  context_ready_bucket,
  answer_ready_bucket,
  first_progress_audio_bucket,
  first_audio_bucket,
  interrupted,
  fallback_used,
}
```

Use bounded buckets `under_1s`, `1_2s`, `2_3s`, `3_6s`, `6_10s`, and
`over_10s`. Add a test that rejects keys matching
`prompt|message|text|transcript|object_id|thread_id|run_id`.

- [ ] **Step 6: Wire the screen-level tracker**

In `UnifiedChatScreen.tsx`, create one tracker per finalized utterance. Mark
`speech_stopped`, `transcript_final`, `speech_request_started`, and
`playback_started` from the actual state transitions. Pass the four turn
milestones through `runUnifiedChatTurn`. Publish the analytics event after
playback starts, terminal fallback, or interruption.

- [ ] **Step 7: Run focused tests**

```bash
npx jest \
  src/features/liveConversation/conversationLatency.test.ts \
  src/features/unifiedChat/unifiedChatTelemetry.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts \
  --runInBand
```

Expected: all selected suites pass and telemetry contains no user-authored data.

- [ ] **Step 8: Commit instrumentation**

```bash
git add \
  src/features/liveConversation/conversationLatency.ts \
  src/features/liveConversation/conversationLatency.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.ts \
  src/features/unifiedChat/UnifiedChatScreen.tsx \
  src/services/analytics/events.ts \
  src/features/unifiedChat/unifiedChatTelemetry.ts \
  src/features/unifiedChat/unifiedChatTelemetry.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts
git commit -m "feat: measure conversation turn latency"
```

## Task 3: Make ordinary conversation turns concise

**Files:**
- Create: `src/features/liveConversation/conversationTurnProfile.ts`
- Create: `src/features/liveConversation/conversationTurnProfile.test.ts`
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/services/ai.ts`
- Test: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`

- [ ] **Step 1: Write the failing response-contract tests**

```ts
import { conversationResponseContract } from './conversationTurnProfile';

describe('conversationResponseContract', () => {
  it('requests an answer-first response that is short enough to speak', () => {
    expect(conversationResponseContract).toEqual({
      maxOutputTokens: 96,
      instruction:
        'Conversation mode: answer first in one or two short sentences. Aim for 120–160 characters. Do not use headings, lists, throat-clearing, or a closing offer unless the user asks for detail.',
    });
  });
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

```bash
npx jest src/features/liveConversation/conversationTurnProfile.test.ts --runInBand
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the response contract**

Export exactly the tested `conversationResponseContract` object. Keep the
written timeline and spoken answer identical in this release; do not create a
hidden longer answer or a second speech-only summary.

- [ ] **Step 4: Add a bounded model-output option**

Extend `CoachChatOptions`:

```ts
maxOutputTokens?: number;
```

When building the Chat Completions body, apply a bounded integer:

```ts
if (options?.maxOutputTokens !== undefined) {
  body.max_tokens = Math.max(32, Math.min(1200, Math.floor(options.maxOutputTokens)));
}
```

Add service tests for values below 32, above 1,200, and the conversation value
96. The existing Edge proxy remains the final 1,200-token safety clamp.

- [ ] **Step 5: Apply the concise contract only in conversation mode**

When `interactionMode === 'conversation'`, append the tested instruction to
`launchContextSummary`. Pass `maxOutputTokens: 96` only when the turn has no
runtime tools, structured response format, web search, or recovery contract.
Text Chat and every tool, structured-output, web-search, and recovery request
retain their existing token ceilings. A conversational tool result may still
receive the short-answer instruction on its final prose round, but it must not
remove receipt, uncertainty, or review language.

- [ ] **Step 6: Run focused tests**

```bash
npx jest \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.test.ts \
  src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts \
  --runInBand
```

Expected: all selected suites pass; text mode is unchanged.

- [ ] **Step 7: Commit the response contract**

```bash
git add \
  src/features/liveConversation/conversationTurnProfile.ts \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/unifiedChat/turnExecutionPhase.ts \
  src/services/ai.ts \
  src/features/unifiedChat/runUnifiedChatTurn.test.ts \
  src/features/unifiedChat/turnExecutionPhase.agentJudgment.test.ts
git commit -m "feat: keep conversation answers concise"
```

## Task 4: Remove the redundant judgment call from safe ordinary turns

**Files:**
- Modify: `src/features/liveConversation/conversationTurnProfile.ts`
- Modify: `src/features/liveConversation/conversationTurnProfile.test.ts`
- Modify: `src/features/unifiedChat/turnPlanningPhase.ts`
- Modify: `src/features/unifiedChat/hybridRequestPolicy.ts`
- Test: `src/features/unifiedChat/agentJudgmentEvalCases.test.ts`
- Test: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`

- [ ] **Step 1: Write the fast-path eligibility tests**

Add a pure resolver with this input:

```ts
type ConversationPlanningInput = {
  interactionMode: 'text' | 'conversation';
  requestClass: UnifiedChatRequestClass;
  usePrivateContext: boolean;
  participatingCapabilityCount: number;
  informationNeed: 'stable' | 'current';
  attachmentCount: number;
  activeContextCount: number;
  hasPendingWork: boolean;
};
```

Test this matrix:

```ts
it.each([
  ['conversation', 'general', false, 0, 'stable', 0, 0, false, 'fast_direct'],
  ['text', 'general', false, 0, 'stable', 0, 0, false, 'full'],
  ['conversation', 'general', false, 0, 'current', 0, 0, false, 'full'],
  ['conversation', 'capability_question', true, 1, 'stable', 0, 1, false, 'full'],
  ['conversation', 'capability_action', true, 1, 'stable', 0, 0, false, 'full'],
  ['conversation', 'general', false, 0, 'stable', 1, 0, false, 'full'],
  ['conversation', 'general', false, 0, 'stable', 0, 0, true, 'full'],
] as const)(
  'selects %s %s as %s',
  (interactionMode, requestClass, usePrivateContext, capabilityCount, informationNeed,
   attachmentCount, activeContextCount, hasPendingWork, expected) => {
    expect(resolveConversationPlanningStrategy({
      interactionMode,
      requestClass,
      usePrivateContext,
      participatingCapabilityCount: capabilityCount,
      informationNeed,
      attachmentCount,
      activeContextCount,
      hasPendingWork,
    })).toBe(expected);
  },
);
```

- [ ] **Step 2: Run the eligibility tests and observe the expected failure**

```bash
npx jest src/features/liveConversation/conversationTurnProfile.test.ts --runInBand
```

Expected: FAIL because `resolveConversationPlanningStrategy` is absent.

- [ ] **Step 3: Implement the fail-closed resolver**

Return `fast_direct` only when every allow condition in the first matrix row is
true. Return `full` for every unrecognized value or added requirement. This is
an optimization allowlist, not a broad intent classifier.

- [ ] **Step 4: Apply the resolver before model judgment**

In `planUnifiedChatTurnPhase`, compute the deterministic policy and current
information need first. If the resolver returns `fast_direct`:

```ts
const requestedAgentJudgment = planningStrategy === 'fast_direct'
  ? null
  : shouldAttemptAgentJudgment(deterministicPolicy)
    ? await input.requestJudgment(/* existing request */)
    : null;

const semanticRoute = planningStrategy === 'fast_direct'
  ? null
  : /* existing semantic route logic */;
```

Return `planningStrategy` as part of `PlannedUnifiedChatTurn` for telemetry. The
answer request still goes through the existing `default_chat` model and durable
message/run persistence.

- [ ] **Step 5: Prove that safety-shaped turns remain full-path**

Extend the existing judgment evaluation corpus to assert `full` for:

- “Add milk to my grocery list.”
- “What is left in my Food budget?”
- “Move that to tomorrow.”
- “What happened in my last Chapter?”
- “What is the weather right now?”
- any turn with a text attachment;
- any turn with active Kwilt context;
- any turn referring to pending proposed work.

Also assert that “Explain why leaves change color” in conversation mode selects
`fast_direct` and calls `requestJudgment` zero times while calling
`sendCoachChat` exactly once.

- [ ] **Step 6: Run routing and phase tests**

```bash
npx jest \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/unifiedChat/agentJudgmentEvalCases.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts \
  --runInBand
```

Expected: fast direct turns make one model call; action, context, current-data,
attachment, and pending-work turns retain the full path.

- [ ] **Step 7: Commit the one-model fast path**

```bash
git add \
  src/features/liveConversation/conversationTurnProfile.ts \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/unifiedChat/turnPlanningPhase.ts \
  src/features/unifiedChat/hybridRequestPolicy.ts \
  src/features/unifiedChat/agentJudgmentEvalCases.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts
git commit -m "perf: use one model for safe conversation turns"
```

## Task 4A: Speak a truthful progress cue while longer work runs

**Files:**
- Create: `src/features/liveConversation/conversationProgressCue.ts`
- Create: `src/features/liveConversation/conversationProgressCue.test.ts`
- Create: `src/features/liveConversation/conversationProgressSpeech.ts`
- Create: `src/features/liveConversation/conversationProgressSpeech.test.ts`
- Create: `scripts/generate-conversation-progress-audio.mjs`
- Create: `assets/audio/conversation/current-lookup-01.mp3`
- Create: `assets/audio/conversation/current-lookup-02.mp3`
- Create: `assets/audio/conversation/current-lookup-03.mp3`
- Create: `assets/audio/conversation/kwilt-lookup-01.mp3`
- Create: `assets/audio/conversation/kwilt-lookup-02.mp3`
- Create: `assets/audio/conversation/kwilt-lookup-03.mp3`
- Create: `assets/audio/conversation/multi-source-01.mp3`
- Create: `assets/audio/conversation/multi-source-02.mp3`
- Create: `assets/audio/conversation/multi-source-03.mp3`
- Create: `assets/audio/conversation/prepare-review-01.mp3`
- Create: `assets/audio/conversation/prepare-review-02.mp3`
- Create: `assets/audio/conversation/prepare-review-03.mp3`
- Create: `assets/audio/conversation/compare-calculate-01.mp3`
- Create: `assets/audio/conversation/compare-calculate-02.mp3`
- Create: `assets/audio/conversation/compare-calculate-03.mp3`
- Create: `assets/audio/conversation/thoughtful-reasoning-01.mp3`
- Create: `assets/audio/conversation/thoughtful-reasoning-02.mp3`
- Create: `assets/audio/conversation/thoughtful-reasoning-03.mp3`
- Create: `assets/audio/conversation/retry-recover-01.mp3`
- Create: `assets/audio/conversation/retry-recover-02.mp3`
- Create: `assets/audio/conversation/retry-recover-03.mp3`
- Create: `assets/audio/conversation/general-work-01.mp3`
- Create: `assets/audio/conversation/general-work-02.mp3`
- Create: `assets/audio/conversation/general-work-03.mp3`
- Create: `assets/audio/conversation/manifest.json`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/liveConversation/conversationLatency.ts`
- Modify: `src/features/liveConversation/conversationLatency.test.ts`

- [ ] **Step 1: Write the failing family and non-repeating selection tests**

The cue is selected from work Kwilt has already classified, never from generated
prose or the user's message text. Split selection into two pure decisions:

1. `resolveConversationProgressFamily` maps authorized work facts to one of
   eight reviewed families.
2. `chooseConversationProgressCue` deterministically rotates among that
   family's three variants using the turn ID and the two most recent cue IDs
   from the same family.

Test this public shape:

```ts
import {
  CONVERSATION_PROGRESS_CUES,
  chooseConversationProgressCue,
  resolveConversationProgressFamily,
} from './conversationProgressCue';

describe('conversation progress cues', () => {
  it.each([
    [{ planningStrategy: 'fast_direct', requestClass: 'general', capabilityIds: [], informationNeed: 'stable' }, null],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'current' }, 'current_lookup'],
    [{ planningStrategy: 'full', requestClass: 'capability_question', capabilityIds: ['plan'], informationNeed: 'stable' }, 'kwilt_lookup'],
    [{ planningStrategy: 'full', requestClass: 'capability_question', capabilityIds: ['plan', 'goals'], informationNeed: 'stable' }, 'multi_source'],
    [{ planningStrategy: 'full', requestClass: 'capability_action', capabilityIds: ['todos'], informationNeed: 'stable' }, 'prepare_review'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', workKind: 'compare_or_calculate' }, 'compare_or_calculate'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', workKind: 'thoughtful_reasoning' }, 'thoughtful_reasoning'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable', recoveryKind: 'retry' }, 'retry_or_recover'],
    [{ planningStrategy: 'full', requestClass: 'general', capabilityIds: [], informationNeed: 'stable' }, 'general_work'],
  ] as const)('maps authorized work to a truthful family', (input, expected) => {
    expect(resolveConversationProgressFamily(input)).toBe(expected);
  });

  it('keeps the spoken vocabulary fixed and reviewable', () => {
    expect(Object.values(CONVERSATION_PROGRESS_CUES).map((cue) => cue.text)).toEqual([
      'Checking the latest.',
      'Looking that up now.',
      'Getting the current details.',
      'Checking what’s in Kwilt.',
      'Looking in Kwilt now.',
      'Pulling up the details.',
      'Checking a few things.',
      'Putting that together.',
      'Looking across the details.',
      'Preparing that for review.',
      'Getting that ready.',
      'Preparing the proposed change.',
      'Working that out.',
      'Comparing those now.',
      'Checking how those compare.',
      'Hmm. Let me think that through.',
      'That needs a little thought.',
      'Let me work through that.',
      'Trying that again.',
      'Taking another pass.',
      'Giving that another try.',
      'Working on that.',
      'Taking a closer look.',
      'Getting that together.',
    ]);
  });

  it('uses all three family variants before repeating one', () => {
    const recentCueIds: string[] = [];
    const selected = ['turn-1', 'turn-2', 'turn-3'].map((turnId) => {
      const cueId = chooseConversationProgressCue({
        family: 'current_lookup',
        turnId,
        recentCueIds: recentCueIds.slice(-2),
      });
      recentCueIds.push(cueId);
      return cueId;
    });
    expect(new Set(selected)).toHaveLength(3);
  });

  it('is deterministic for the same turn and recent history', () => {
    const input = { family: 'general_work', turnId: 'turn-42', recentCueIds: ['general_work_01'] } as const;
    expect(chooseConversationProgressCue(input)).toBe(chooseConversationProgressCue(input));
  });
});
```

Also test that cue selection accepts no transcript/message-text field, keeps at
most two recent IDs per family in session memory, and does not persist the
rotation history to a user profile, thread, database, or analytics. A private
capability read must choose the generic `kwilt_lookup` family; it must not speak
Money, Screen Time, a person's name, or other sensitive domain detail.

The selector input may include only bounded, already-authorized work facts such
as `workKind: 'compare_or_calculate'` or `recoveryKind: 'retry' | 'fallback'`.
Those facts must come from the existing deterministic/planning state; the cue
module must not inspect raw user language to manufacture a more specific claim.

- [ ] **Step 2: Run the selector tests and observe the expected failure**

```bash
npx jest src/features/liveConversation/conversationProgressCue.test.ts --runInBand
```

Expected: FAIL because the cue selector does not exist.

- [ ] **Step 3: Implement fixed families and a truthful 24-cue manifest**

Define the eight work-state families explicitly:

```ts
export type ConversationProgressFamily =
  | 'current_lookup'
  | 'kwilt_lookup'
  | 'multi_source'
  | 'prepare_review'
  | 'compare_or_calculate'
  | 'thoughtful_reasoning'
  | 'retry_or_recover'
  | 'general_work';
```

Implement the 24 IDs and exact phrases asserted above, with IDs
`current_lookup_01` through `general_work_03` and matching hyphenated asset
filenames. `resolveConversationProgressFamily` must return no family for
`fast_direct`, boundary, clarification, stopped, failed, or replayed turns.
`retry_or_recover` is allowed only after a retry/recovery operation has actually
started; it cannot be inferred from slow work. The generic `kwilt_lookup` family
stands in for private capability reads rather than speaking sensitive names.

`chooseConversationProgressCue` must hash the immutable turn ID only to choose a
starting point, then skip the two recent IDs from that family. This produces
variety without nondeterministic tests, model-written wording, or a persisted
behavior profile. Keep the recent-history ring in the active conversation
session only and clear it when conversation mode ends.

Treat 24 clips as the reviewed launch library, not a permanent ceiling. Add a
new family or variant only when signed-device sessions show a repeated truthful
work state that the existing library handles awkwardly. Do not grow a
capability-by-capability phrase catalog: it increases app size and review cost,
and it makes private or inaccurate spoken details more likely.

- [ ] **Step 4: Generate and verify the 24 bundled Marin assets**

Create `scripts/generate-conversation-progress-audio.mjs`. The script must hold
the 24 exact phrase/file pairs above and call the authenticated deployed
`cook-voice-speech` function so `OPENAI_API_KEY` remains only in Supabase. Read
the function URL, publishable key, and a short-lived signed-in user access token
from environment variables without logging them. Send a bounded server-owned
style ID (`attentive_progress` or `thoughtful_progress`), never arbitrary voice
instructions. Write the 24 decoded MP3 files and
`assets/audio/conversation/manifest.json` with cue ID, family, phrase, model,
voice, style ID, byte length, duration, and SHA-256 for each file. Run:

```bash
node scripts/generate-conversation-progress-audio.mjs
```

Expected: 24 non-empty MP3 files and a manifest whose hashes match a fresh
SHA-256 calculation. The complete bundled library must remain at or below 1.5
MB. Listen to every clip on the built-in speaker and reject any clip with
leading silence, clipped speech, a wording mismatch, a noticeably different
pace or loudness, or a duration above 3,000 ms in Expo Audio. The generated
launch set measured 1,320–2,760 ms at a natural pace; do not compress the tone
to satisfy an artificial sub-1.4-second ceiling. Shorten and
re-review the source phrase instead of speeding up one outlier independently.

These clips are permanent product assets. They do not contain or derive from a
user's conversation and are outside the ephemeral user-audio cleanup rule.

- [ ] **Step 5: Write failing playback-arbitration tests**

Test these contracts with an injected player:

```ts
it('starts a qualifying local cue while agent work continues', async () => {
  const speech = createConversationProgressSpeech(playerFactory);
  const completion = speech.start('current_lookup_01', onStart);
  expect(playerFactory).toHaveBeenCalledWith(
    CONVERSATION_PROGRESS_CUES.current_lookup_01.source,
    expect.objectContaining({ downloadFirst: false, updateInterval: 100 }),
  );
  expect(onStart).not.toHaveBeenCalled();
  harness.emit({ playing: true, didJustFinish: false });
  expect(onStart).toHaveBeenCalledTimes(1);
  harness.emit({ playing: false, didJustFinish: true });
  await completion;
});

it('cancels a cue that has not started when the final answer is ready', async () => {
  const speech = createConversationProgressSpeech(playerFactory);
  void speech.start('general_work_01');
  await speech.finishBeforeFinalAnswer();
  expect(harness.remove).toHaveBeenCalledTimes(1);
});

it('never overlaps the progress cue and final answer', async () => {
  const speech = createConversationProgressSpeech(playerFactory);
  void speech.start('multi_source_01');
  harness.emit({ playing: true, didJustFinish: false });
  let finalMayStart = false;
  const finalReady = speech.finishBeforeFinalAnswer().then(() => { finalMayStart = true; });
  expect(finalMayStart).toBe(false);
  harness.emit({ playing: false, didJustFinish: true });
  await finalReady;
  expect(finalMayStart).toBe(true);
});
```

Also verify that barge-in stops the cue immediately, does not resume it, and
does not start the final response for the interrupted turn.

- [ ] **Step 6: Implement local progress playback**

Resolve and play the bundled asset immediately after deterministic request
classification, before awaiting model judgment or context loading. Add a
metadata-only `onProgressCue(cueId)` callback from `planUnifiedChatTurnPhase`
through `runUnifiedChatTurn`; the screen starts the local clip without awaiting
it. Agent/context work must continue concurrently. Before final speech begins:

- cancel a cue that has not become audible;
- let an audible cue finish only while its reviewed total duration remains under 3,000 ms;
- never overlap cue and final speech;
- stop both on barge-in, conversation stop, route interruption, or unmount.

The final-answer scheduler owns arbitration. The progress player must never
create a cache file, make a network request, or write a timeline message.

- [ ] **Step 7: Track progress latency separately from useful-answer latency**

Mark `progress_audio_started` from the player's first `playing === true` update.
Add `first_progress_audio_bucket` to the metadata-only event. Keep
`first_audio_bucket` tied to the final useful answer, so the cue cannot make the
main latency metric look successful.

- [ ] **Step 8: Run cue, timing, and routing tests**

```bash
npx jest \
  src/features/liveConversation/conversationProgressCue.test.ts \
  src/features/liveConversation/conversationProgressSpeech.test.ts \
  src/features/liveConversation/conversationLatency.test.ts \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts \
  --runInBand
```

Expected: fast direct turns remain silent, longer turns start one fixed cue,
each family rotates through three appropriate variants before repeating,
progress and useful-answer latency remain separate, and interruption stops all
speech.

- [ ] **Step 9: Commit truthful progress speech**

```bash
git add \
  src/features/liveConversation/conversationProgressCue.ts \
  src/features/liveConversation/conversationProgressCue.test.ts \
  src/features/liveConversation/conversationProgressSpeech.ts \
  src/features/liveConversation/conversationProgressSpeech.test.ts \
  src/features/liveConversation/conversationLatency.ts \
  src/features/liveConversation/conversationLatency.test.ts \
  src/features/unifiedChat/UnifiedChatScreen.tsx \
  scripts/generate-conversation-progress-audio.mjs \
  assets/audio/conversation/current-lookup-*.mp3 \
  assets/audio/conversation/kwilt-lookup-*.mp3 \
  assets/audio/conversation/multi-source-*.mp3 \
  assets/audio/conversation/prepare-review-*.mp3 \
  assets/audio/conversation/compare-calculate-*.mp3 \
  assets/audio/conversation/thoughtful-reasoning-*.mp3 \
  assets/audio/conversation/retry-recover-*.mp3 \
  assets/audio/conversation/general-work-*.mp3 \
  assets/audio/conversation/manifest.json
git commit -m "feat: speak truthful conversation progress"
```

## Task 5: Stream owner-scoped assistant speech from the Edge Function

**Files:**
- Modify: `supabase/functions/_shared/cookVoiceSpeech.ts`
- Modify: `supabase/functions/_shared/__tests__/cookVoiceSpeech_deno_test.ts`
- Modify: `supabase/functions/cook-voice-speech/index.ts`

- [ ] **Step 1: Write failing request and response tests**

Add tests for these pure contracts:

```ts
expect(parseCookVoiceSpeechMessageId(
  'https://example.test/cook-voice-speech?message_id=9b183337-2d1d-4ad9-8f48-507fd7d77906',
)).toBe('9b183337-2d1d-4ad9-8f48-507fd7d77906');

expect(parseCookVoiceSpeechMessageId(
  'https://example.test/cook-voice-speech?message_id=not-a-uuid',
)).toBeNull();

expect(buildCookVoiceSpeechProviderBody('A short answer.', {
  model: 'gpt-4o-mini-tts',
  voice: 'marin',
})).toEqual({
  model: 'gpt-4o-mini-tts',
  voice: 'marin',
  input: 'A short answer.',
  response_format: 'mp3',
  speed: 1,
});

expect(cookVoiceSpeechStreamHeaders('audio/mpeg')).toMatchObject({
  'Content-Type': 'audio/mpeg',
  'Cache-Control': 'no-store',
});
```

- [ ] **Step 2: Run the Deno test and observe the expected failure**

```bash
npm run test:supabase-functions
```

Expected: FAIL on the new undefined exports.

- [ ] **Step 3: Implement shared parsing and provider-body helpers**

Keep the existing 1,200-character sanitization. Add strict UUID parsing,
provider-body construction, and no-store stream headers to
`_shared/cookVoiceSpeech.ts`. Do not accept arbitrary text from a GET query.

- [ ] **Step 4: Add authenticated GET streaming without breaking POST**

In `cook-voice-speech/index.ts`:

1. Allow `GET, POST, OPTIONS` in CORS.
2. Authenticate the bearer token exactly as today.
3. For GET, create a Supabase client with the caller's authorization header.
4. Select `body` from `kwilt_agent_messages` where `id = message_id` and
   `role = assistant`; rely on RLS to enforce ownership.
5. Reject missing, non-owner, non-assistant, empty, or over-1,200-character
   messages without revealing whether another user's row exists.
6. Request MP3 from the configured model and voice.
7. Return `new Response(upstream.body, ...)` immediately rather than calling
   `arrayBuffer()` or base64-encoding the stream.
8. Propagate request cancellation to the upstream fetch.
9. Preserve the existing POST JSON response as the full-file fallback during
   rollout.

The successful streaming branch must have this shape:

```ts
if (!upstream.ok || !upstream.body) {
  return json(upstream.ok ? 502 : upstream.status, {
    error: { code: 'speech_failed', message: 'Natural voice is unavailable.' },
  });
}
return new Response(upstream.body, {
  status: 200,
  headers: {
    ...corsHeaders,
    ...cookVoiceSpeechStreamHeaders(
      upstream.headers.get('content-type') ?? 'audio/mpeg',
    ),
  },
});
```

- [ ] **Step 5: Add source-contract tests for privacy and streaming**

Assert that the GET branch:

- never reads `text` from `URLSearchParams`;
- queries `kwilt_agent_messages` through a caller-authenticated client;
- restricts role to `assistant`;
- returns `upstream.body` directly;
- sets `Cache-Control: no-store`;
- does not call `arrayBuffer`, `encodeBase64`, Storage, or an audio table.

- [ ] **Step 6: Run Supabase tests and lint**

```bash
npm run test:supabase-functions
npm run lint:supabase-functions
```

Expected: all Deno tests pass and function lint exits 0.

- [ ] **Step 7: Commit the server stream**

```bash
git add \
  supabase/functions/_shared/cookVoiceSpeech.ts \
  supabase/functions/_shared/__tests__/cookVoiceSpeech_deno_test.ts \
  supabase/functions/cook-voice-speech/index.ts
git commit -m "feat: stream authenticated conversation speech"
```

## Task 6: Play the remote stream without creating an audio file

**Files:**
- Create: `src/features/liveConversation/liveConversationSpeech.ts`
- Create: `src/features/liveConversation/liveConversationSpeech.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`

- [ ] **Step 1: Write failing player contract tests**

Use injected dependencies and assert this behavior:

```ts
it('plays an authenticated message stream without downloadFirst', async () => {
  const createPlayer = jest.fn(() => playerHarness.player);
  const speech = createLiveConversationSpeech({
    getAccessToken: async () => 'user-token',
    getPublishableKey: () => 'publishable-key',
    getFunctionUrl: () => 'https://project.functions.supabase.co/cook-voice-speech',
    createPlayer,
    fallback: { speak: jest.fn(), stop: jest.fn() },
  });

  const completion = speech.speakMessage({
    id: '9b183337-2d1d-4ad9-8f48-507fd7d77906',
    body: 'A short answer.',
  });

  expect(createPlayer).toHaveBeenCalledWith(
    {
      uri: 'https://project.functions.supabase.co/cook-voice-speech?message_id=9b183337-2d1d-4ad9-8f48-507fd7d77906',
      headers: {
        Authorization: 'Bearer user-token',
        apikey: 'publishable-key',
        'x-kwilt-client': 'kwilt-mobile',
      },
    },
    expect.objectContaining({
      downloadFirst: false,
      keepAudioSessionActive: true,
    }),
  );
  expect(createPlayer.mock.calls[0][0]).not.toHaveProperty('text');
  playerHarness.emit({ playing: true, didJustFinish: false });
  playerHarness.emit({ playing: false, didJustFinish: true });
  await completion;
});
```

Also test that stop removes the player, a start timeout invokes the existing
full-file fallback once, and an interrupted stream never falls back and resume
speaking after cancellation.

- [ ] **Step 2: Run the player tests and observe the expected failure**

```bash
npx jest src/features/liveConversation/liveConversationSpeech.test.ts --runInBand
```

Expected: FAIL because the player module does not exist.

- [ ] **Step 3: Implement authenticated remote playback**

Create a player with:

```ts
createAudioPlayer(
  {
    uri: `${functionUrl}?message_id=${encodeURIComponent(message.id)}`,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
      'x-kwilt-client': 'kwilt-mobile',
    },
  },
  {
    downloadFirst: false,
    keepAudioSessionActive: true,
    preferredForwardBufferDuration: 0,
    updateInterval: 100,
  },
);
```

Call `player.play()` immediately. Fire `onStart` only after a status update has
`playing === true`. Resolve on `didJustFinish`; remove the player on finish,
stop, timeout, unmount, or a newer response. Use an eight-second start watchdog
for the first rollout. A stream failure before playback starts may invoke the
existing full-file speech path; interruption and explicit stop must not.

- [ ] **Step 4: Integrate persisted-message playback**

Replace the current `cookVoiceSpeech.speak(response)` call in
`UnifiedChatScreen.tsx` with `liveConversationSpeech.speakMessage(message, ...)`.
Pass the actual latest assistant message object so the server can resolve its
durable UUID. Keep Cook Mode on the existing speech policy in this slice.

- [ ] **Step 5: Make UI state truthful**

Do not set `state: 'speaking'` before invoking the player. Keep `thinking` with
`message: 'Preparing voice…'` while the stream connects, and set `speaking` only
inside `onStart`. When the user starts speaking, stop the player before returning
to `listening`.

- [ ] **Step 6: Run player and screen tests**

```bash
npx jest \
  src/features/liveConversation/liveConversationSpeech.test.ts \
  src/features/liveConversation/liveConversationState.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.test.ts \
  --runInBand
```

Expected: remote playback starts without a local file, speaking state begins at
actual playback, and barge-in removes the player.

- [ ] **Step 7: Commit native stream playback**

```bash
git add \
  src/features/liveConversation/liveConversationSpeech.ts \
  src/features/liveConversation/liveConversationSpeech.test.ts \
  src/features/unifiedChat/UnifiedChatScreen.tsx
git commit -m "feat: play conversation speech as a stream"
```

## Task 7: Sweep legacy temporary audio safely

**Files:**
- Create: `src/capabilities/recipes/voice/cookVoiceCacheCleanup.ts`
- Create: `src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts`
- Modify: `src/capabilities/recipes/voice/cookVoiceNaturalSpeech.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`

- [ ] **Step 1: Write the failing cleanup-selection tests**

```ts
import { shouldDeleteLegacyCookVoiceFile } from './cookVoiceCacheCleanup';

describe('shouldDeleteLegacyCookVoiceFile', () => {
  const now = Date.UTC(2026, 7, 10, 18);

  it('deletes only stale Kwilt voice cache files', () => {
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'kwilt-cook-voice-1.mp3', modificationTime: now - 3_600_001,
    }, now)).toBe(true);
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'kwilt-cook-voice-2.mp3', modificationTime: now - 60_000,
    }, now)).toBe(false);
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'family-photo.jpg', modificationTime: now - 86_400_000,
    }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the cleanup test and observe the expected failure**

```bash
npx jest src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts --runInBand
```

Expected: FAIL because the cleanup module does not exist.

- [ ] **Step 3: Implement the one-hour bounded sweep**

Use `new Directory(Paths.cache).list()`. Delete only `File` entries whose name
starts with `kwilt-cook-voice-`, whose modification time is non-null, and whose
age exceeds one hour. Catch individual file errors so cleanup can never prevent
conversation or Cook Mode from starting. Guard the sweep so it runs at most once
per app process. Never recurse and never delete another cache prefix.

- [ ] **Step 4: Invoke cleanup at safe lifecycle points**

Call the sweep once when conversation mode starts and before the legacy natural
speech path creates a new file. Existing normal-finish and stop deletion remain
in place.

- [ ] **Step 5: Run cleanup and natural-speech tests**

```bash
npx jest \
  src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts \
  src/capabilities/recipes/voice/cookVoiceNaturalSpeech.test.ts \
  src/capabilities/recipes/voice/cookVoiceSpeechPolicy.test.ts \
  --runInBand
```

Expected: stale legacy files are selected, unrelated cache files are preserved,
and the full-file fallback still deletes its active file.

- [ ] **Step 6: Commit legacy cleanup**

```bash
git add \
  src/capabilities/recipes/voice/cookVoiceCacheCleanup.ts \
  src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts \
  src/capabilities/recipes/voice/cookVoiceNaturalSpeech.ts \
  src/features/unifiedChat/UnifiedChatScreen.tsx
git commit -m "fix: sweep legacy conversation audio cache"
```

## Task 8: Verify, deploy, measure, and decide whether the cheap path passes

**Files:**
- Modify after observed proof: `docs/feature-briefs/live-conversational-action-runtime.md`
- Modify after observed proof: `docs/delivery-evidence/unified-chat.yml`

- [ ] **Step 1: Run focused source verification**

```bash
npx jest \
  src/features/liveConversation/conversationLatency.test.ts \
  src/features/liveConversation/conversationTurnProfile.test.ts \
  src/features/liveConversation/liveConversationSpeech.test.ts \
  src/capabilities/recipes/voice/cookVoiceCacheCleanup.test.ts \
  src/features/unifiedChat/agentJudgmentEvalCases.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.test.ts \
  src/features/unifiedChat/unifiedChatTelemetry.test.ts \
  --runInBand
npm run test:supabase-functions
npm run lint:supabase-functions
```

Expected: all selected Jest and Deno tests pass.

- [ ] **Step 2: Run repository completion gates**

```bash
npm run verify:changed -- --base origin/main --run
git diff --check
```

Expected: all derived gates pass. Any manual native or visual follow-up printed
by `verify:changed` remains open until performed.

- [ ] **Step 3: Deploy only the changed speech function**

The installed CLI supports server-side bundling with `--use-api`. Deploy exactly
the changed function with JWT verification left enabled by default:

```bash
npx supabase functions deploy cook-voice-speech --use-api
```

Do not pass `--no-verify-jwt`, `--prune`, or another function name. Record the
returned function version.

- [ ] **Step 4: Prove authenticated chunked delivery**

Using a test assistant message owned by the signed-in test account, verify:

- HTTP 200;
- `Content-Type: audio/mpeg`;
- `Cache-Control: no-store`;
- first byte arrives before the response finishes;
- another user receives the same not-found response as a nonexistent message;
- user and assistant messages above 1,200 characters are rejected consistently;
- canceling the client request closes the stream without a retained object.

Do not print access tokens or message text in the timing output.

- [ ] **Step 5: Run the signed-device conversation matrix**

Use one checkout and record branch, commit, dirty state, installed binary,
development-server owner/port, device, network, and audio route. Collect at
least 20 ordinary stable turns and 10 full-path context/action turns across:

- built-in speaker;
- AirPods or another Bluetooth route;
- interruption while Kwilt is speaking;
- weak but usable network;
- background then foreground;
- incoming audio-session interruption;
- stream failure with full-file fallback;
- qualifying full-path work starts the correct progress phrase within the progress gate;
- repeated qualifying work rotates through all three appropriate family variants before repeating;
- private capability work uses a generic Kwilt phrase and never speaks sensitive domain or person names;
- fast-direct work stays silent rather than delaying the useful answer;
- progress speech does not trigger false user-speech detection or interrupt itself;
- a ready final answer never overlaps or talks over an active progress phrase;
- app force-quit followed by legacy cache sweep.

For ordinary turns, report p50 and p90 for transcript final, progress playback
when eligible, planning complete, answer ready, first byte when available, and
final playback start. Report silent-fast-turn count, progress-cue count, false
self-interruption count, stall count, fallback count, interruption p95, and
response character distribution.

- [ ] **Step 6: Apply the decision rule**

Keep the cascaded low-cost path when all ordinary-turn gates pass and no safety
regression appears. If agent answer-ready remains above p50 2,000 ms, inspect the
new phase distribution in this order:

1. If planning dominates, expand `fast_direct` only through new fail-closed
   corpus cases; never include actions, current information, attachments,
   pending work, or private context.
2. If answer generation dominates, retain the 96-token cap and add Chat
   Completions text streaming for direct turns so the timeline can render early;
   do not synthesize speech until the first complete, stable sentence is known.
3. If context loading dominates full-path reads, prefetch only the deterministic
   capability set in parallel with judgment and discard prefetched data when
   final authorization does not include it.
4. If speech connection dominates, compare MP3 and AAC through the same remote
   Expo player. Build a native 24 kHz PCM queue only if both miss the first-audio
   gate on physical devices.
5. Consider speech-to-speech Realtime only after these measured optimizations
   miss the gate and a current cost comparison is documented.

- [ ] **Step 7: Update proof documentation without overstating it**

Record source tests, deployed function version, Simulator evidence, signed
device evidence, and production timing evidence as separate proof levels. Change
the open question in the feature brief only if the signed-device matrix resolves
it. Update the Unified Chat delivery evidence with exact observed metrics and
remaining audio-route or model-lifecycle risks.

- [ ] **Step 8: Commit observed proof**

```bash
git add \
  docs/feature-briefs/live-conversational-action-runtime.md \
  docs/delivery-evidence/unified-chat.yml
git commit -m "docs: record conversation streaming proof"
```

## Self-review checklist

- [ ] The plan preserves the durable Chat timeline and capability authority.
- [ ] Ordinary fast turns make one answer-model call; action/context turns keep full judgment.
- [ ] Conversation text never enters a URL or audio store.
- [ ] Streaming begins only from an owner-scoped assistant message.
- [ ] Speaking state begins only when playback actually starts.
- [ ] Progress speech names work that actually started and never implies success.
- [ ] Each of eight truthful work-state families has three reviewed variants, and session-local selection avoids repeats until the family is exhausted.
- [ ] Cue selection never derives wording from user text or persists a listening/phrase profile.
- [ ] Fast-direct turns do not play a progress cue that could delay the answer.
- [ ] Progress and useful-answer latency remain separate metrics.
- [ ] Bundled cue assets contain no user data and are intentionally retained app assets.
- [ ] Stop and barge-in cancel playback and prevent fallback resurrection.
- [ ] Legacy cleanup targets only stale `kwilt-cook-voice-*` cache files.
- [ ] Metrics contain durations and bounded classifications only.
- [ ] The low-cost path has explicit pass/fail gates before any Realtime escalation.
- [ ] Simulator, signed-device, deployed-function, and production proof remain distinct.

## Intended outcome

The first release should immediately narrate qualifying longer work with a
sub-second local Marin cue, remove one sequential model request from the safest
and most common conversational class, reduce the spoken answer itself, and begin
playing the final Marin answer while later audio is still arriving. Together,
those changes are expected to make unavoidable waiting understandable and move
an ordinary turn from the current estimated 5.4-plus seconds after transcript
final toward the three-second median useful-audio target without adopting full
speech-to-speech Realtime pricing. The instrumentation task comes first so the
result is accepted or rejected from observed physical-device data, not from the
estimate.

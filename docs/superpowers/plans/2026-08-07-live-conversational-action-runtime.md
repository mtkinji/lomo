# Kwilt Live Conversational Action Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable spoken-conversation channel over Kwilt's existing Agent Runtime, prove it in regular Cook Mode feature code with natural hands-free recipe actions, and then reuse it in Unified Chat and another contextual capability.

**Architecture:** Begin with the smallest cascaded path: Cook Mode records, transcribes, delegates interpretation and tools to Kwilt's existing Agent Runtime, and plays authenticated natural speech. A local native voice-processing layer owns echo cancellation, barge-in detection, playback cancellation, and utterance pre-roll. Realtime remains a replaceable transport option only if the cascaded path misses signed-device latency or interruption gates. Cook Mode is the first vertical proof, while its deterministic parser and touch controls remain complete fallbacks. No internal feature flag is part of this learning release.

**Tech Stack:** React Native 0.83, Expo SDK 55 development builds, TypeScript, `expo-audio`, an Expo local iOS voice-processing module, authenticated OpenAI transcription and speech endpoints through Supabase Edge Functions, Supabase Postgres, `@kwilt/agent-runtime`, Jest, Deno tests, physical iPhone and Bluetooth audio verification. Realtime/WebRTC is conditional rather than first-release infrastructure.

---

## August 7 sequence amendment

The Realtime/WebRTC project below is deferred. It is retained as the escalation
path, not as the prototype-one implementation sequence. Prototype one ships in
the normal Cook Mode path with no feature flag and proves these gates first:

1. authenticated natural speech with a quiet device-speech fallback;
2. native echo-cancelled speech detection that can stop active playback;
3. the existing record, upload, transcribe, and deterministic command loop;
4. signed-device latency, interruption, first-word retention, speaker, and
   Bluetooth testing;
5. one recipe-grounded agent action with an authoritative receipt.

Only move to Project 1's Realtime transport if the cascaded path misses the
signed-device experience gates. Until then, its unchecked tasks are not current
prototype commitments.

---

## Product and execution contract

The first complete proof must support this uninterrupted flow:

```text
Start Cook Mode
→ ask “How much buttermilk?”
→ hear a recipe-grounded answer
→ interrupt the answer with “Actually, this feels like two steps”
→ hear a concise proposed dry/wet split
→ say “Yes”
→ see the Cook Session become six cues
→ say “Start a five-minute timer”
→ finish the cook
→ review “Keep the step split in Your version?”
→ create a new immutable private Recipe version
→ inspect a Cook Record and mutation receipt
```

These boundaries are non-negotiable:

- No long-lived OpenAI credential is shipped to the app.
- The realtime model may call only tools discovered for the current session.
- A model response cannot prove that a Kwilt action occurred.
- Every applied write has stable target identity, expected version, idempotency
  key, capability validation, and authoritative receipt.
- Touch navigation and deterministic local voice commands remain usable when the
  agent or network is unavailable.
- Raw audio is not retained by default.
- Canonical Recipes are never mutated by a person's Cook Session.

## File responsibility map

- `src/features/liveConversation/contracts.ts` — shared live-session, audio-state,
  event, context, and transport contracts.
- `src/features/liveConversation/liveConversationStateMachine.ts` — deterministic
  lifecycle, interruption, reconnect, and fallback transitions.
- `src/features/liveConversation/realtimeTransport.ts` — WebRTC peer connection,
  audio track, data channel, OpenAI event parsing, interruption, and teardown.
- `src/features/liveConversation/realtimeSessionClient.ts` — authenticated request
  for an ephemeral session secret.
- `src/features/liveConversation/useLiveConversation.ts` — React lifecycle that
  binds transport events to the shared state machine and Agent Runtime bridge.
- `src/features/liveConversation/liveAgentBridge.ts` — maps Realtime function calls
  to discovered Kwilt tools and returns typed results without allowing the model
  to claim success independently.
- `supabase/functions/live-conversation-session/index.ts` — authenticated,
  entitlement-aware ephemeral Realtime session creation.
- `supabase/functions/_shared/liveConversationSession.ts` — request validation,
  prompt/tool scoping, model allowlist, expiry, and response normalization.
- `packages/kwilt-agent-runtime/src/liveConversation.ts` — channel-independent
  tool-call/result and progress acknowledgement contracts.
- `src/capabilities/recipes/agent/recipeCookToolCatalog.ts` — Recipes tools and
  consequence/confirmation policy.
- `src/capabilities/recipes/agent/recipeCookToolProvider.ts` — exact Cook Session
  reads plus authoritative session navigation and timer actions.
- `src/capabilities/recipes/domain/recipeCookAdjustment.ts` — typed session
  adjustments, invariants, and Cook Record differences.
- `src/capabilities/recipes/domain/recipeRevisionProposal.ts` — validated recipe
  revision proposal and expected-version application contract.
- `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx` — projects shared live
  conversation state into the existing landscape/portrait surface.
- `src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx` — review and save
  confirmed Cook differences into Cook History or Your version.
- `src/features/unifiedChat/UnifiedChatScreen.tsx` — later adopts the shared live
  conversation hook rather than its discrete transcription loop.

## Project 1: Realtime native transport and shared session substrate

### Task 1: Add the native WebRTC dependency behind a build-safe adapter

**Files:**
- Modify: `package.json`
- Modify: `app.config.ts`
- Create: `src/features/liveConversation/nativeWebRtc.ts`
- Create: `src/features/liveConversation/nativeWebRtc.test.ts`

- [ ] Install the SDK-55-compatible native dependencies:

```bash
npm install react-native-webrtc@124.0.8 @config-plugins/react-native-webrtc@14.0.0
```

- [ ] Write `nativeWebRtc.test.ts` to mock `react-native-webrtc` and assert that
  `createPeerConnection()`, `getUserAudioStream()`, and `releaseUserAudioStream()`
  expose no OpenAI credential and release every acquired track.
- [ ] Add `'@config-plugins/react-native-webrtc'` to the Expo plugin list in
  `app.config.ts`; retain the existing microphone usage description and update it
  to name hands-free Cook Mode and Chat conversation.
- [ ] Implement `nativeWebRtc.ts` as the only module importing
  `react-native-webrtc`, so the rest of the app remains testable without native
  globals.
- [ ] Run:

```bash
npm test -- --runInBand src/features/liveConversation/nativeWebRtc.test.ts
npx expo config --type public
npx expo-doctor
```

Expected: the focused test passes, Expo config contains the plugin, and Doctor
reports no new incompatible dependency.

### Task 2: Define and test the shared live-session state machine

**Files:**
- Create: `src/features/liveConversation/contracts.ts`
- Create: `src/features/liveConversation/liveConversationStateMachine.ts`
- Create: `src/features/liveConversation/liveConversationStateMachine.test.ts`

- [ ] Define `LiveConversationState` as:

```ts
export type LiveConversationStatus =
  | 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'
  | 'interrupted' | 'reconnecting' | 'fallback' | 'ended';

export type LiveConversationState = {
  sessionId: string | null;
  status: LiveConversationStatus;
  transportAttempt: number;
  activeResponseId: string | null;
  pendingToolCallIds: string[];
  lastReceiptId: string | null;
  fallbackReason: 'offline' | 'permission' | 'transport' | 'model' | null;
};
```

- [ ] Write transition tests for connect, listen, user-speech interruption,
  pending asynchronous tool calls, authoritative receipt, reconnect, fallback,
  teardown, and rejection of stale events from an earlier session ID.
- [ ] Implement a pure reducer. A model `response.done` event must not set
  `lastReceiptId`; only a capability result with `status: 'completed'` and a
  receipt may do so.
- [ ] Run:

```bash
npm test -- --runInBand src/features/liveConversation/liveConversationStateMachine.test.ts
```

Expected: all transitions pass without timers, network calls, or React.

### Task 3: Mint scoped ephemeral Realtime credentials server-side

**Files:**
- Create: `supabase/functions/_shared/liveConversationSession.ts`
- Create: `supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts`
- Create: `supabase/functions/live-conversation-session/index.ts`
- Create: `supabase/functions/live-conversation-session/config.toml`
- Create: `src/features/liveConversation/realtimeSessionClient.ts`
- Create: `src/features/liveConversation/realtimeSessionClient.test.ts`

- [ ] Define a request containing `channel`, `launchContext`, `locale`,
  `timeZone`, and requested capability IDs. Reject unknown fields, unauthenticated
  users, temporary accounts, unknown capabilities, prompts over 12,000
  characters, and non-allowlisted models.
- [ ] Generate a Realtime session using `OPENAI_API_KEY` only inside the Edge
  Function. Return only the ephemeral client secret, model, expiry, and normalized
  granted capability IDs.
- [ ] Scope Cook Mode sessions initially to Recipes tools; do not expose the full
  Kwilt catalog in the Realtime session prompt.
- [ ] Test that serialized responses never contain `OPENAI_API_KEY`, the bearer
  token, Recipe private notes, or undiscovered tool definitions.
- [ ] Run:

```bash
deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/liveConversationSession_deno_test.ts
npm test -- --runInBand src/features/liveConversation/realtimeSessionClient.test.ts
```

Expected: authentication and scope tests pass; the client handles expiry and
normalized server errors without rendering raw upstream messages.

### Task 4: Implement WebRTC audio, interruption, and function-call transport

**Files:**
- Create: `src/features/liveConversation/realtimeTransport.ts`
- Create: `src/features/liveConversation/realtimeTransport.test.ts`
- Create: `src/features/liveConversation/useLiveConversation.ts`
- Create: `src/features/liveConversation/useLiveConversation.test.tsx`

- [ ] Implement an `RTCPeerConnection`, add the microphone track, attach remote
  audio, and open an `oai-events` data channel.
- [ ] Configure semantic VAD for natural pauses, automatic response creation, and
  response interruption when new user speech begins.
- [ ] On interruption, cancel the active response and truncate unheard assistant
  audio so server conversation history matches what the user actually heard.
- [ ] Parse only the event allowlist used by Kwilt: session lifecycle, input speech
  start/stop, response audio, response completion, function arguments, function
  completion, error, and rate-limit updates.
- [ ] Teardown closes the data channel, peer connection, remote audio, and every
  local track exactly once across exit, app backgrounding, navigation loss, and
  transport error.
- [ ] Test event ordering, duplicate events, stale response IDs, interruption,
  malformed function arguments, reconnect backoff, and teardown idempotency.
- [ ] Run:

```bash
npm test -- --runInBand src/features/liveConversation/realtimeTransport.test.ts src/features/liveConversation/useLiveConversation.test.tsx
npm run lint
```

Expected: all transport tests pass with mocked WebRTC and no credential in test
snapshots or logs.

### Task 5: Prove the native transport before building recipe writes

**Files:**
- Create: `docs/testing/live-conversation-physical-device-matrix.md`

- [ ] Build and install a development client containing WebRTC:

```bash
npx expo run:ios --device
```

- [ ] Record the exact checkout, branch, commit, dirty state, installed binary,
  Metro port, and Realtime model in the matrix.
- [ ] Exercise iPhone speaker, receiver, wired audio when available, AirPods,
  Bluetooth reconnect, Control Center route change, app interruption, incoming
  call interruption, screen rotation, and a ten-minute foreground session.
- [ ] Exercise kitchen noise: running water, exhaust fan, music, utensil impact,
  another nearby voice, short pauses, and interruption while Kwilt speaks.
- [ ] Require natural barge-in, no self-transcription of Kwilt's own audio, no
  leaked API credential, and complete audio teardown after exit.

Expected: this gate either produces signed physical-device evidence or blocks
Projects 2–4 with the exact native failure. Simulator audio is supplementary and
cannot satisfy the gate.

## Project 2: Shared agent bridge and Recipes read/action provider

### Task 6: Add live-conversation contracts to the shared Agent Runtime

**Files:**
- Create: `packages/kwilt-agent-runtime/src/liveConversation.ts`
- Create: `packages/kwilt-agent-runtime/src/liveConversation.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/index.ts`
- Create: `src/features/liveConversation/liveAgentBridge.ts`
- Create: `src/features/liveConversation/liveAgentBridge.test.ts`

- [ ] Define strict `LiveToolCall`, `LiveToolResult`, `LiveProgress`, and
  `LiveReceiptProjection` types that reuse existing `AgentToolDefinition`,
  `AgentToolExecutionResult`, proposal, and receipt semantics.
- [ ] Reject unknown tools, arguments outside the discovered input schema,
  repeated identical calls in one turn, calls after cancellation, and model text
  that claims a write succeeded without a completed result.
- [ ] Permit one short spoken progress acknowledgement for an asynchronous tool;
  it must describe work in progress and never fabricate the result.
- [ ] Run:

```bash
npm test -- --runInBand packages/kwilt-agent-runtime/src/liveConversation.test.ts src/features/liveConversation/liveAgentBridge.test.ts
npm run lint
```

Expected: tool calls and results retain the existing capability-owned authority.

### Task 7: Register the read-only and reversible Cook Mode tool surface

**Files:**
- Create: `src/capabilities/recipes/agent/recipeCookToolCatalog.ts`
- Create: `src/capabilities/recipes/agent/recipeCookToolCatalog.test.ts`
- Create: `src/capabilities/recipes/agent/recipeCookToolProvider.ts`
- Create: `src/capabilities/recipes/agent/recipeCookToolProvider.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`

- [ ] Register exact tool IDs and policies:

```text
recipes.cook.read_context       read   confirmation none
recipes.cook.navigate           write  confirmation none, session reversible
recipes.cook.repeat             read   confirmation none
recipes.cook.timer              write  confirmation none, session reversible
recipes.cook.answer_question    read   confirmation none
```

- [ ] The read result includes the exact Recipe version, current cue, adjacent
  cues, serving scale, current-step ingredient references, timers, and media
  metadata; it excludes unrelated Recipe notes and household records.
- [ ] Navigation and timer writes call the existing Cook Session state machine
  and repository. They return the updated revision and an authoritative
  session-scoped receipt.
- [ ] Grounded answers distinguish saved Recipe evidence from inference. Food
  safety, allergy, and substitution uncertainty must not be represented as saved
  Recipe fact.
- [ ] Run focused catalog/provider tests and `npm run architecture:lint`.

Expected: natural-language interpretation may vary, but every executed result is
deterministic, version-checked, and idempotent.

### Task 8: Replace Cook Mode's primary loop while retaining deterministic fallback

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx`
- Modify: `src/capabilities/recipes/components/CookVoiceStatus.tsx`
- Modify: `src/capabilities/recipes/components/CookVoiceStatus.test.tsx`
- Retain: `src/capabilities/recipes/voice/cookVoiceCommandParser.ts`
- Retain: `src/capabilities/recipes/voice/cookVoiceController.ts`

- [ ] Bind Cook Mode to `useLiveConversation` after microphone consent. Project
  `listening`, `thinking`, `speaking`, `interrupted`, and `fallback` into the
  center footer control without adding transcript chrome to the main surface.
- [ ] Let the user interrupt spoken output. Spoken tool completion and visible
  Cook Session state must agree before Kwilt says “done.”
- [ ] If realtime connection fails, switch to the existing deterministic
  record/transcribe/parser loop and complete touch controls without displaying
  raw transcription messages.
- [ ] Add component tests for read-only conversation, timer execution,
  interruption, fallback, media pause/resume, navigation exit, and stale session
  events.

Expected: Cook Mode supports natural read/action turns and remains fully usable
when the agent is absent.

## Project 3: Agentic Cook adjustments, history, and durable revision

### Task 9: Define structured Cook differences and session adjustments

**Files:**
- Create: `src/capabilities/recipes/domain/recipeCookAdjustment.ts`
- Create: `src/capabilities/recipes/domain/recipeCookAdjustment.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookStateMachine.ts`
- Modify: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Create: `supabase/migrations/20260807190000_recipe_cook_differences.sql`

- [ ] Define difference kinds `ingredient_quantity`, `ingredient_substitution`,
  `instruction_split`, `instruction_clarification`, and `timing` with stable
  original target IDs, before/after values, user confirmation time, source turn
  ID, scope (`session_only` or `saved_revision`), and resulting Recipe version ID.
- [ ] Add a `propose_adjustment` event and an `apply_session_adjustment` event.
  Applying requires matching Cook Session revision and expected Recipe version;
  repeated idempotency keys return the first receipt.
- [ ] Validate that a step split changes exactly one step into two or more ordered
  steps, preserves every ingredient quantity unless explicitly included in the
  same confirmed operation, and retains or explicitly reassigns timers/media.
- [ ] Store differences as immutable Cook Record children rather than a mutable
  counter or overwritten note.
- [ ] Add migration tests for owner RLS, RPC-only writes, exact-version conflict,
  idempotent replay, and denial to another person.

Expected: no model-generated adjustment can bypass the pure validators or write
directly to Recipe tables.

### Task 10: Add agentic Recipes tools for session adaptation

**Files:**
- Modify: `src/capabilities/recipes/agent/recipeCookToolCatalog.ts`
- Modify: `src/capabilities/recipes/agent/recipeCookToolProvider.ts`
- Create: `src/capabilities/recipes/agent/recipeCookAdjustmentPrompt.ts`
- Create: `src/capabilities/recipes/agent/recipeCookAdjustmentPrompt.test.ts`
- Create: `src/capabilities/recipes/agent/recipeCookAdjustmentEvalCases.ts`

- [ ] Register:

```text
recipes.cook.propose_adjustment  write  confirmation explicit when inferred
recipes.cook.apply_adjustment    write  confirmation inherited from proposal
```

- [ ] Supply the agent with the exact Recipe version, current cue, adjacent cues,
  stable ingredient/step/media IDs, user utterance, and allowed operation schema.
  Do not supply unrelated personal context.
- [ ] Observation language such as “this feels like two steps” returns one
  concise spoken proposal. Explicit language such as “split this into dry and wet
  steps” may apply to the current session after validation because it is local and
  reversible.
- [ ] Add eval cases for dry/wet split, simultaneous actions, multi-vessel steps,
  ingredient shortage, unsafe substitution, ambiguous pronoun, mid-step request,
  already-completed step, stale Recipe version, media reassignment, and refusal to
  make an unrelated change.

Expected: the user states the problem naturally; the agent authors the operation.
No eval asks the user to dictate replacement recipe text.

### Task 11: Persist Cook History and reviewed private Recipe revisions

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeCookLearning.ts`
- Create: `src/capabilities/recipes/domain/recipeRevisionProposal.ts`
- Create: `src/capabilities/recipes/domain/recipeRevisionProposal.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Modify: `supabase/migrations/20260807190000_recipe_cook_differences.sql`

- [ ] Derive “Made N times” from completed Cook Records for the stable Recipe ID;
  do not store a mutable count on Recipe.
- [ ] Show the most recent meaningful differences on Recipe Home and provide a
  chronological history projection tied to exact Recipe versions.
- [ ] At completion, summarize confirmed session differences and offer **Keep in
  Your version** or **Not this time**. A catalog Recipe creates a private fork;
  a private Recipe creates a new immutable version.
- [ ] Apply through an RPC that checks owner, expected Recipe version, proposal
  state, and idempotency key, then atomically writes the new Recipe version,
  marks the Cook difference `saved_revision`, and emits a mutation receipt.
- [ ] Test stale-version recovery, offline pending state, fork lineage, duplicate
  apply, private history visibility, and preservation of the prior version.

Expected: Cook History remains truthful even when the current Recipe later
changes, and no canonical Recipe is overwritten.

## Project 4: Cross-app reuse and production proof

### Task 12: Adopt the same live channel in Unified Chat

**Files:**
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.test.tsx`
- Modify: `src/features/unifiedChat/unifiedChatVoice.ts`
- Modify: `docs/feature-briefs/unified-chat.md`

- [ ] Replace Unified Chat's primary discrete voice path with
  `useLiveConversation`, while retaining its current transcription path as
  fallback.
- [ ] Project durable Agent messages, proposals, tool results, and receipts into
  both the visible timeline and spoken conversation without duplicating runs.
- [ ] Verify stop, steer, interruption, leave/resume, proposal approval, receipt,
  correction, and undo through one shared thread/run identity.

Expected: Cook Mode and Chat share transport and coordinator code; neither imports
the other's UI or capability provider.

### Task 13: Prove one additional contextual capability

**Files:**
- Modify: `src/features/activities/ActivitiesScreen.tsx`
- Modify: `src/features/activities/ActivitiesScreen.contextualChat.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`

- [ ] Launch live conversation with one selected Activity context.
- [ ] Support “mark this done” through the existing Activity provider and receipt,
  then support “actually undo that” through the existing undo contract.
- [ ] Confirm Recipes code is absent from the Activity bundle path and that the
  same live session types, transport, bridge, and receipt projection are reused.

Expected: the substrate is demonstrated as a Kwilt capability rather than a Cook
Mode feature.

### Task 14: Run reliability, privacy, cost, and physical-device gates

**Files:**
- Create: `src/features/liveConversation/liveConversationEvalCases.ts`
- Create: `scripts/live-conversation-live-eval.ts`
- Create: `docs/testing/live-conversation-release-evidence.md`
- Modify: `package.json`

- [ ] Add deterministic contract tests for tool scope, permission, expected
  version, idempotency, receipt truth, fallback, and audio teardown.
- [ ] Add recorded/noise-augmented evaluation cases for natural language,
  interruption, pauses, kitchen noise, ambiguous commands, corrections, and
  unsupported requests. Track accepted action, corrected proposal, safe
  abstention, wrong action, latency, and tool-call count separately.
- [ ] Add `npm run live-conversation:eval` and require the eval report to record
  model snapshot, prompt version, tool-catalog version, environment, and date.
- [ ] Verify no raw audio retention, no long-lived client credential, redacted
  traces, owner-scoped context, and deletion/correction behavior.
- [ ] Measure end-of-speech to first-audio latency, interruption latency, tool
  acknowledgement latency, action completion latency, reconnect rate, and cost
  per ten-minute session.
- [ ] Run:

```bash
npm run verify:changed -- --run
npm run test:chat-contracts
npm run test:supabase-functions
npm run live-conversation:eval
```

- [ ] Repeat the physical-device matrix on the signed candidate build and a
  TestFlight build. Source tests, Simulator, signed-device, and TestFlight proof
  remain distinct in the evidence document.

Expected: production rollout remains blocked if the agent makes an unauthorized
write, speaks success without a receipt, fails audio teardown, exposes another
person's context, or lacks a complete touch fallback.

## Self-review

- Spec coverage: transport, natural conversation, interruption, tool calls,
  Cook actions, agentic adjustments, Cook History, durable revisions, fallback,
  cross-app reuse, privacy, and proof gates each map to a numbered task.
- Boundary check: the Realtime model owns conversational timing; the shared Agent
  Runtime owns orchestration; each capability owns authoritative effects.
- Scope check: Projects 1–4 are independently gated. Recipe writes do not begin
  until the native transport passes a physical-device spike.
- Proof check: no plan step equates source/tests, Simulator, signed device,
  TestFlight, or deployed backend evidence.

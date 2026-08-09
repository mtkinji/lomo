# Chat Conversation Mode Implementation Plan

**Goal:** Make live conversation a first-party mode of Unified Chat, preserving
the visible durable timeline and existing capability authority while targeting a
sub-second median first useful response.

**Architecture:** A reusable native `liveConversation` transport obtains a
short-lived transcription-session credential from an authenticated Supabase
Edge Function and connects over WebRTC to `gpt-live-transcribe`. The transport
publishes normalized state and transcript events. Unified Chat owns persistence:
finalized user utterances enter the existing `runUnifiedChatTurn` pipeline,
assistant text is spoken in the shared Marin voice, and snapshots project
live/provisional state into the existing hosted workbench. The Chat widget
deep-links into the same route with `mode=conversation`; no credential is stored
in the widget or client bundle.

**Authority boundary:** The live transcription session is only the microphone,
turn-taking, and provisional-transcript channel. It does not generate assistant
answers, mutate Kwilt records, or claim action success. The current Chat runtime
remains authoritative for answers, tools, proposals, receipts, correction, and
undo. Raw audio is not retained by default.

## 1. Shared session endpoint

- Add a pure request/session builder and Deno tests under
  `supabase/functions/_shared/`.
- Add `live-conversation-session`, authenticate the Supabase user, derive a
  privacy-preserving safety identifier, use the existing remote
  `OPENAI_API_KEY`, and return only a bounded ephemeral client secret.
- Configure the function with the repository's existing JWT/auth pattern.

## 2. Native live-transcription substrate

- Add the Expo-compatible `react-native-webrtc` package and config plugin.
- Add test-driven state reduction and OpenAI event normalization under
  `src/features/liveConversation/`.
- Add a session client that fetches the ephemeral secret, exchanges SDP, owns
  the peer/data channel, and tears down microphone/audio resources idempotently.

## 3. Unified Chat ownership and protocol

- Extend the workbench protocol with conversation states, provisional
  transcript, `conversation.start`, and `conversation.stop`.
- Route a finalized utterance through the existing durable turn path exactly
  once; keep discrete dictation as a separate composer affordance/fallback.
- Speak each authoritative assistant response through the existing authenticated
  speech endpoint, defaulting to Marin while preserving the visible text.
- Project live state into snapshots without creating a second transcript or
  run model.

## 4. Hosted workbench and widget

- Mirror the protocol change in `kwilt-site` and add a compact conversation
  control/status treatment that leaves the timeline dominant and scrollable.
- Add `mode=conversation` to Chat route parsing.
- Change the widget action to the explicit label `Talk to Kwilt` and deep-link
  into a fresh Chat conversation.

## 5. Verification and gates

- Run focused Jest/Deno/Node tests, both repository typechecks, and Kwilt's
  `npm run verify:changed -- --run` completion ritual.
- Inspect the hosted workbench at supported sizes and accessibility scale.
- Build a new native development binary before Simulator proof because WebRTC is
  a native dependency. Signed-device permission, audio-route, interruption,
  barge-in, background/foreground, and latency measurements remain release gates.
- Record end-of-speech to first useful audio; accept median under 1s and p95
  under 2s for ordinary turns. Do not substitute connection time or generic
  acknowledgement latency.

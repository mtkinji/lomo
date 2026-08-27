---
feature: liveConversation
audiences: [audience-aspirational-family-organizers, audience-ai-native-life-operators]
personas: [Maya, Nina]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-trust-this-app-with-my-life
  - jtbd-get-help-without-retelling-my-life
  - jtbd-stay-in-control-of-ai-actions
briefs:
  - live-conversational-action-runtime
status: draft
last_reviewed: 2026-08-07
---

# Live Conversation

Reusable native foreground-audio channel for first-party Chat conversation and
future contextual surfaces. A dedicated `gpt-live-transcribe` session owns
WebRTC media, turn detection, interruption, and provisional transcription.
Unified Chat owns every finalized durable turn and all capability authority, and
its assistant text is spoken through the shared Marin voice. Long-lived provider
credentials and raw audio are never stored on device.

Current proof: session request policy, safety identifier, event normalization,
state reduction, exactly-once finalized-utterance dispatch, and durable typed/
spoken run parity have automated coverage. The durable channel context retains
bounded session, utterance, finalization-source, locale, interruption, and timing
provenance without persisting interim transcript deltas. A new native build and
signed-device audio/latency verification are still required.

Adds a reusable realtime spoken-conversation channel over Kwilt's shared Agent
Runtime. Cook Mode is the first proving surface; capability-owned tools,
permissions, receipts, and fallback behavior remain authoritative.

## Planned surfaces in this folder

- Shared live-session contracts and state machine.
- Native realtime audio transport and interruption handling.
- Bridge from spoken function calls to discovered Kwilt capability tools.

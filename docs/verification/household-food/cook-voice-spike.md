# Cook voice feasibility and proof boundary
Recorded: 2026-08-05

## Current decision

The source implementation uses explicit push-to-talk through Kwilt's existing
foreground audio-recording and authenticated transcription path. Deterministic
commands are parsed locally and routed to the Recipe Cook Session state machine.
Unrecognized, negated, injected, or open-ended requests do not mutate cooking
progress. Touch controls and local in-app timers remain complete when voice or
the network is unavailable.

Continuous listening, realtime VAD, on-device recognition, background wake
phrases, and spoken TTS acknowledgements are not enabled. G3 remains
`blocked_physical_device`; this source-level choice prevents the rest of Cook
Mode from depending on an unproven continuous transport.

## Proven in source tests

- next/back/repeat/position, ingredient lookup, session controls, duration and
  ordinal timer commands;
- negation, prompt injection, low-confidence/out-of-scope handling;
- duplicate transcript suppression and no-active-session behavior;
- foreground recording cancellation on Cook Mode exit;
- visible Off, Listening, and Thinking states with permanent touch fallback.

## Evidence still required before stronger claims

Run all transports on a signed physical iPhone using the intended backend and
record median/P95 command latency, interruption behavior, kitchen-noise false
activation, microphone permission recovery, 20-minute battery impact, network
loss, audio retention, provider limits, and native-build implications.

Runtime provenance for this source pass:

- Checkout: `/Users/andrewwatanabe/Kwilt/.worktrees/household-food-ai-exploration`
- Branch: `codex/household-food-ai-exploration`
- Starting HEAD: `f7e852897144aac58e666dc1bb1c81681d92b419`
- Installed binary/device/OS: not exercised
- Metro owner/port: none
- Transcription provider: not invoked

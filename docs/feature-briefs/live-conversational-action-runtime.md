---
id: brief-live-conversational-action-runtime
title: Kwilt Live — reusable hands-free conversational action runtime
status: accepted
audiences: [audience-aspirational-family-organizers, audience-ai-native-life-operators]
personas: [Maya, Nina]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-get-help-without-retelling-my-life, jtbd-stay-in-control-of-ai-actions]
related_briefs: [brief-unified-chat, brief-kwilt-phone-agent]
owner: andrew
last_updated: 2026-08-10
---

# Kwilt Live — Reusable Hands-Free Conversational Action Runtime

## Context

Cook Mode currently records one utterance, uploads it for transcription, routes
the resulting text through a bounded command parser, speaks a device-generated
response, and starts recording again. That loop supports touch-equivalent
commands, exact ingredient lookup, and timers, but it does not provide natural
interruptible conversation, open-ended reasoning, or agent actions. Andrew wants
Cook Mode to feel like a high-quality driving conversation: the user speaks
naturally, Kwilt understands the active context, performs appropriate actions,
and explains what it did without requiring touch or command syntax.

The capability must not become a Cook Mode-only assistant. Kwilt Chat
already defines a channel-independent Agent Runtime with typed tools, policy,
proposals, receipts, recovery, and capability ownership. Kwilt Live adds a
spoken-conversation channel to that runtime. Chat is the first-party home for
the durable conversation, while Cook Mode remains the most demanding contextual
surface. The first learning release is regular product code, not a hidden or
internally flagged variant.

## Target audience

Primary: aspirational family organizers. Maya is cooking with occupied hands and
divided attention. She needs one useful thing at a time and cannot stop to learn
voice grammar, inspect a chat transcript, or author structured recipe edits.

Secondary: AI-native life operators. Nina expects conversation to carry context,
invoke tools, and maintain truthful state across Kwilt rather than becoming a
voice skin over isolated screens.

## Representative persona

Maya is midway through a recipe when she realizes an instruction combines two
distinct actions or that she has less of an ingredient than expected. She says
what she notices in ordinary language. Kwilt should recognize the practical
problem, ask only the question needed to proceed safely, adapt the current Cook
Session when authorized, and remember confirmed differences for later review.

## Aspirational design challenge

How might we let Maya converse naturally with Kwilt while her hands and attention
are occupied, while preserving capability-owned authority, privacy, reversibility,
and a complete touch fallback?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — in this context, help Maya finish the
ordinary work of feeding the household without turning cooking into phone work.

## Job flow step

`job-flow-maya-feed-household-with-less-work`, steps 16–18:

- **Cook one cue at a time** currently scores 1. Cook Mode has deterministic
  sessions, cues, timers, persistence, and a landscape surface, but native-device
  proof and conversational adaptation remain incomplete.
- **Stay hands-free** currently scores 1. The source contains a foreground
  record/transcribe/speak loop, not a realtime agent conversation.
- **Keep what was learned** currently scores 1. Cook Records, private notes, and
  review-required recipe-edit proposals exist, but structured per-cook
  differences and durable revision application are incomplete.

## JTBD framing

When Maya is cooking and notices a problem, she wants to say it naturally and
have Kwilt help immediately so that she can keep cooking without touching the
phone or reconstructing context. The interaction must satisfy
`jtbd-carry-intentions-into-action` while preserving
`jtbd-trust-this-app-with-my-life`, `jtbd-get-help-without-retelling-my-life`, and
`jtbd-stay-in-control-of-ai-actions`.

## Current proof boundary

Confirmed in source on August 7, 2026:

- Cook Mode records discrete utterances through `expo-audio` and the existing
  Unified Chat transcription endpoint.
- `cookVoiceCommandParser.ts` handles a fixed set of navigation, timer, position,
  and ingredient-query forms.
- Open-ended recipe questions are explicitly declined rather than routed to an
  intelligence provider.
- Speech output now requests authenticated cloud-generated audio and plays it
  through `expo-audio`, with `expo-speech` retained only as a quiet failure
  fallback. Deployment and signed-device voice-quality proof remain pending.
- Cook Sessions, exact Recipe-version identity, timers, Cook Records, private
  notes, and review-required recipe-edit proposals exist in source.
- Unified Chat defines a channel-independent bounded agent loop, capability
  manifest, proposals, device actions, mutation receipts, and idempotency rules.
- No source evidence establishes a Realtime API transport, a Recipes tool
  provider in the shared runtime, a deployed Cook agent path, or signed-device
  conversational proof.

The current shared conversation transport uses a dedicated
`gpt-live-transcribe` session over WebRTC for continuous foreground audio, turn
detection, interruption, and provisional transcription. Final utterances enter
the existing Unified Chat turn pipeline, which remains the authority for durable
messages, assistant answers, tools, proposals, receipts, corrections, and undo.
Authoritative assistant text is spoken through Kwilt's existing authenticated
speech endpoint, defaulting to Marin. Cook Mode retains its deterministic local
command lane and complete touch controls. This cost-conscious cascaded path is
accepted only if signed-device measurements satisfy the response and barge-in
gates; otherwise a full speech-to-speech Realtime transport remains an option.

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

The accepted speech delivery path streams the authenticated Speech API response
to native playback after the assistant message is durably persisted. The stream
resolves text by owner-scoped assistant message id, sends no message text in a
URL, sets `Cache-Control: no-store`, and creates no durable audio object. The
existing full-file path remains a temporary fallback until signed-device stream
proof passes. Qualifying longer turns may concurrently play one bundled,
non-personal Marin progress phrase selected from deterministic work state. Fast
direct turns remain silent so an acknowledgement cannot delay the answer.

## Design

### One runtime, multiple conversational channels

```text
Cook Mode / Chat / Phone / future contextual surfaces
                     ↓
          Live Conversation Session
       audio, turn-taking, interruption, speech
                     ↓
             Kwilt Agent Runtime
     context, tool discovery, policy, proposals
                     ↓
          Capability-owned providers
   Recipes · Activities · Plan · Money · Games · …
                     ↓
       authoritative result and receipt
                     ↓
            spoken + visual response
```

The conversation channel owns recording, turn detection, interruption, and
speech playback. The model may interpret an utterance and call a discovered tool.
It does not own Kwilt data, permissions, mutation truth, or durable success
claims. Deeper reasoning and multi-step work delegate to the existing server
agent coordinator while the Cook Mode session remains responsive.

### Cook Mode interaction contract

Example:

```text
Maya:  This feels like two different steps.
Kwilt: It does: first the dry ingredients, then the wet ingredients.
       Want me to split it?
Maya:  Yes.
Kwilt: Done for this cook. You're on the dry ingredients step now.
```

The visible Cook Mode changes immediately to six cues. The current cue contains
the dry action and dry ingredients; the next cue contains the wet action and wet
ingredients. The Cook Record retains the confirmed difference. After cooking,
Kwilt asks whether to save it into **Your version**. A durable recipe change
creates a new immutable Recipe version and never changes a canonical publication.

Observation language invites one concise proposal. Explicit reversible commands
may apply to the current Cook Session immediately. Durable recipe revisions,
sharing, purchases, money changes, and other consequential actions retain their
capability-owned confirmation policy.

### Chat conversation contract

Conversation mode is a mode of the current Chat thread, not a separate inbox or
ephemeral voice history:

- the existing timeline remains visible and scrollable while listening and
  speaking;
- provisional user transcription is visible, then one finalized utterance is
  persisted as one normal user message;
- assistant words appear in the same timeline while they are spoken and settle
  into one normal assistant message;
- tool progress, proposals, receipts, corrections, and undo remain ordinary
  timeline events owned by the existing Chat runtime;
- ending conversation mode returns to the composer in the same thread; and
- a Chat widget may enter a fresh thread directly in conversation mode, but its
  label must make the microphone transition explicit and the first permission
  gate must remain visible.

### Conversation session contract

A `LiveConversationSession` carries:

- person, channel, launch context, locale, and timezone;
- authenticated transport with no long-lived model credential on device;
- allowed capability/tool scope discovered for the current context;
- ordered user, assistant, tool-call, tool-result, interruption, and receipt
  events;
- audio state (`connecting`, `listening`, `thinking`, `speaking`, `interrupted`,
  `recovering`, `unavailable`);
- a deterministic fallback provider for commands available without the agent.

Raw audio is not retained by default. Durable records contain confirmed
transcripts or action summaries only when required for conversation continuity,
Cook History, proposals, receipts, correction, or user-visible review.

### Recipes provider

The first Recipes tool surface is deliberately bounded:

- read the exact current Cook Session, cue, Recipe version, ingredients, media,
  and active timers;
- advance, go back, repeat, read an ingredient amount, and manage timers;
- answer a recipe-grounded question while naming insufficient evidence;
- propose and apply a reversible current-session adjustment;
- record a confirmed substitution, quantity difference, timing difference, or
  step split in the Cook Record;
- propose a durable private Recipe revision against an expected version;
- apply the revision only after the owning Recipes policy authorizes it.

Every write uses a typed operation, stable target identity, expected version,
idempotency key, validation, and authoritative receipt.

### Failure and fallback

- Touch controls remain complete and do not depend on the model.
- The existing deterministic command parser remains available when conversational
  conversation is unavailable.
- A missed utterance returns quietly to listening or says “Try that again”; raw
  infrastructure errors never appear in recipe content.
- A tool timeout may receive a short spoken progress acknowledgement, but Kwilt
  does not say an action succeeded before the capability returns a receipt.
- If a proposed recipe transformation cannot be validated, Kwilt may preserve it
  as a private observation but does not apply it.

### Cross-app expansion

Cook Mode proves continuous foreground audio, contextual grounding, low-risk
device actions, and one reviewed durable write. After that proof, the same
`LiveConversationSession` channel can host:

- full voice in Unified Chat;
- hands-free Activity capture and Plan adjustments;
- contextual conversation from Goals, Money, Games, or Screen Time under each
  capability's policy;
- the Phone Agent through its existing server/channel provider rather than a
  separate intelligence system.

No capability becomes writable merely because voice exists. Each one registers
its own evidence, tools, consequence policy, confirmation, receipts, and undo.

## Learning release sequence

1. **Natural speech path:** replace device speech with authenticated generated
   audio in regular Cook Mode while preserving the quiet system fallback.
2. **Native barge-in spike:** prove echo-cancelled input, immediate playback
   cancellation, utterance pre-roll, and route changes on a physical iPhone.
3. **Read-only Cook conversation:** natural questions, repeat, position, and
   ingredient amounts with no recipe mutation.
4. **Reversible Cook actions:** navigation and timers through Recipes-owned tools.
5. **Session adaptations:** step split, quantity difference, and substitution
   proposals applied only to the current Cook Session.
6. **Cook History and revisions:** structured differences, completion review,
   immutable private Recipe revisions, receipts, and correction.
7. **Shared-channel adoption:** Unified Chat voice uses the same transport and
   coordinator; one non-Recipes capability proves reuse.

## Success signal

On a signed physical iPhone in an ordinary noisy kitchen, Maya can complete a
multi-turn, interruptible, hands-free Cook Session; ask a contextual question;
operate a timer; identify a step that should be split; authorize the split using
ordinary speech; see the session update; finish cooking; and optionally save the
change into a new private Recipe version. Every visible and spoken success claim
matches an authoritative result, and loss of the realtime service leaves a
complete touch and deterministic-command fallback.

The shared capability is proven when Unified Chat and one additional contextual
surface use the same live-session transport, event model, policy bridge, and
receipt projection without importing Recipes-specific logic.

## Open questions

- Whether the WebRTC transcription plus Marin speech path meets the
  physical-device quality and latency gate or should be replaced by a full
  speech-to-speech Realtime transport.
- Whether confirmed spoken transcripts belong in durable Chat history by default
  or whether Cook Mode should retain only action summaries and receipts.
- Which low-risk operations beyond the current Cook Session earn standing voice
  permission after self-use.

# Learning Release: CarPlay And Driving Mode

## Concept To Build

Build a voice-first **Drive With Kwilt** CarPlay channel that completes a few trusted Chat and Explore jobs without requiring the user to touch iPhone.

## Capability Delta

Today, the user cannot:

- launch Kwilt as a CarPlay app;
- speak a contextual request to Kwilt from the car display;
- ask whether Explore is recording or request nearby Explore candidates through Chat;
- receive an authoritative spoken action result and resume it later in mobile Chat.

After this release, the user can:

- start a push-to-talk Kwilt conversation from CarPlay;
- ask a read-only Plan question, create one low-risk To-do, check or explicitly control Explore recording, and ask for nearby candidates;
- hear a concise response and hand a chosen destination to Apple Maps;
- find the same durable thread and receipts on iPhone after the drive.

Still intentionally not supported:

- Explore map rendering, turn-by-turn navigation, passive hot-mic listening, complex proposal editing, Money writes, Screen Time, Games, family location, or full mobile Chat parity.

## User Experience

The CarPlay home screen opens Kwilt directly into a voice-control state. The user taps once, speaks, hears a short processing cue, then receives a concise spoken answer. If the request creates a low-risk To-do, Kwilt speaks the saved title and date from the authoritative receipt. If the request needs visual or complex review, Kwilt says it saved the conversation to continue after the drive without claiming that the action happened.

For Explore:

- “Is Explore recording?” answers from current state.
- “Start exploring” or “Stop exploring” changes only the explicit manual-outing state and confirms the result.
- “What is nearby?” returns at most three ephemeral candidates.
- “Take me to the second one” opens the destination in Apple Maps; it does not create a Place or visit.

## Existing Product Relationship

This enhances Unified Chat as another trusted channel and Explore as a capability with a constrained conversational adapter. It leaves the mobile Chat timeline, Explore map, Places drawer, recording preferences, and recaps intact.

## Buildable Slice

Must be real:

- approved voice-based conversational CarPlay entitlement and signed provisioning;
- generated native CarPlay scene with supported iOS availability checks;
- push-to-talk audio lifecycle and spoken output;
- authenticated Unified Chat thread/run persistence while iPhone is locked;
- capability-owned Plan read and Activity create paths;
- Explore recording-state read/control and ephemeral native Nearby search;
- receipt-based spoken success and ordinary mobile Chat continuation;
- Apple Maps destination handoff;
- network, cancellation, timeout, reconnect, and locked-data failure handling.

Can be thin or temporary:

- Andrew-only entitlement/test account;
- a fixed four-request standing matrix;
- one compact root template rather than a broader browse hierarchy;
- manual session notes instead of production analytics.

Intentionally excluded:

- custom Explore map, automatic narration, proactive coaching, long answers, all-capability Chat parity, new storage models, or a generic driving settings screen.

## Release Channel

**Local signed build**, then **TestFlight for Andrew** after the entitlement and real head-unit proof. CarPlay Simulator proves template and lifecycle behavior; an actual CarPlay vehicle or head unit is required to evaluate microphone routing, audio coexistence, glance time, reconnects, locked-device behavior, and real distraction.

## Brand-Goodwill Guardrails

- Voice begins only after an explicit tap; no passive listening.
- Responses are short by default and can offer to continue after arrival.
- Kwilt never asks the user to pick up the phone.
- No false success: every applied action comes from an authoritative capability receipt.
- Nearby stays private and ephemeral; no raw route, Place identity, or visit timestamp enters analytics.
- The experience stops cleanly when CarPlay disconnects and never corrupts Explore recording.

## Reversibility

Keep the CarPlay scene behind build configuration until the entitlement and product behavior are ready for everyone, because Apple notes that an entitled CarPlay app icon cannot be selectively hidden per user. The adapter adds no new durable domain model; disabling the scene leaves ordinary Chat, Explore, widgets, and mobile flows unchanged.

## Permanent Product Threshold

Promote the channel when Andrew can complete the standing matrix across at least ten real drives with no phone handling, no false action receipts, reliable locked-device operation, acceptable audio interruption behavior, and a clear reason to return after arrival.

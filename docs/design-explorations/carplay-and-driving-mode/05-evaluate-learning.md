# Evaluate Learning: CarPlay And Driving Mode

## Learning questions

1. Does voice-first Kwilt solve a recurring driving need, or is the desire primarily to glance at the Explore map?
2. Which requests naturally occur in the car: capture, Plan questions, Explore state, nearby discovery, reflection, or something else?
3. Can users predict what Kwilt will do from a short spoken exchange?
4. Can the current Chat trust contract survive without a detailed visual proposal surface?
5. Does the post-drive continuation feel useful, or does it create cleanup work?
6. Does driving-aware iPhone presentation help in non-CarPlay cars without misclassifying passengers?
7. Can the Expo/native/React Native lifecycle, auth, audio, and protected-data stack operate reliably while connected and locked?

## Evidence plan

Supporting evidence:

- repeated voluntary use across real drives;
- zero need to pick up iPhone to complete the supported matrix;
- concise voice turns that users understand on first listen;
- exact agreement between spoken success, persisted receipt, and mobile Chat state;
- continued threads are reopened after parking;
- nearby-to-navigation handoffs occur without recommendations being mistaken for visits;
- audio behaves correctly with music, podcasts, calls, Siri, and route prompts.

Disconfirming evidence:

- the user repeatedly wants to inspect fog geometry rather than speak;
- long response retries, network delay, or transcription errors increase distraction;
- the user cannot tell whether an action applied or was deferred;
- passengers are repeatedly forced into a driving presentation;
- Explore recording changes, duplicates, or stops across CarPlay lifecycle transitions;
- the entitlement is rejected because Kwilt's proposed use does not meet the voice-based conversation criteria.

Brand-goodwill evidence:

- the experience feels quieter than using iPhone;
- the microphone never appears active outside an explicit voice turn;
- failures end safely and preserve the user's words when possible;
- no private location content appears unexpectedly on the car display.

## Instrumentation

Record only a small channel-level event set:

- CarPlay session connected/disconnected;
- voice turn started/completed/cancelled/failed;
- request class and capability ids, not raw transcript;
- action applied/deferred/failed with receipt existence;
- destination handoff attempted/completed;
- mobile continuation opened after a CarPlay thread.

Manual field notes should capture car/head-unit model, iOS version, phone locked state, audio source, driving/passenger role, and whether phone handling occurred.

Do not collect raw audio, raw transcripts, route coordinates, Nearby candidates, Place names, or visit timestamps for analytics.

## Decision rule

Proceed to a permanent CarPlay channel if:

- Apple grants the entitlement;
- the supported matrix succeeds across at least ten Andrew drives and two materially different CarPlay environments;
- no applied action lacks a matching receipt;
- no supported flow requires touching iPhone;
- at least two of the supported jobs recur naturally across drives;
- real use demonstrates that the experience lowers attention cost.

Revise if voice is useful but the operation set is wrong, responses are too long, or post-drive continuation is unclear. Simplify to glanceable Explore/Chat state if active conversation is rarely used. Retire the CarPlay app direction if entitlement or locked-device reliability prevents an honest product, while retaining any valuable opt-in driving-aware iPhone work.

Consider a separate Explore navigation strategy only if users repeatedly ask for the visual map and Kwilt can articulate a real turn-by-turn discovery job with safe maneuvers, route quality, rerouting, and navigation-specific field proof.

## Expected next action

Before engineering, prepare the entitlement narrative and a four-flow interaction script, then run a native feasibility spike for CarPlay scene lifecycle, audio, auth while locked, and durable Chat continuation.

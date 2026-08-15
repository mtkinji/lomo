# Learning Release: Unified Chat local-first inference

## User experience

There is no new setting or badge. The user types in the existing composer and receives an answer in the existing timeline.

## Must be real

- tiny authored social responses avoid model calls;
- eligible self-contained text tasks call Apple Foundation Models on supported iOS devices;
- local unavailability or failure falls through to the existing cloud model in the same turn;
- cancellation reaches the native generation task;
- routing and provider outcomes are observable without recording prompt or response content.

## Intentionally excluded

- private Kwilt context and conversation history;
- attachments, current web information, capability actions, proposals, and receipts;
- background generation and app-launch prewarming;
- a provider selector or an on-device quality claim for ineligible hardware.

## Release proof

Source tests prove route eligibility and fallback. A signed physical device must separately prove Apple Intelligence availability, cold and warm latency, cancellation, memory pressure, energy/thermal behavior, repeated use, and the absence of a paid request for an eligible successful local turn.

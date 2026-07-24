# Diverge: Kwilt Money Native Integration And Shared Settings

Axis of variation: how much standalone Money shell and settings structure survives the native port.

## A. Nested Money Application

Embed Money's existing Expo Router shell and settings largely intact beneath a Kwilt route.

- Persona fit: superficially fast, but repeated shell concepts make Maya learn where she is.
- System fit: poor; introduces a second router, settings home, auth assumptions, and lifecycle owners.
- Best when: the products must remain operationally independent.
- Fails when: the goal is one coherent public application.
- Primer check: fails calm UX and system coherence; discard.

## B. Capability-Native Port With Shared Settings Grammar

Translate Money's three local places into a nested React Navigation capability. Keep global ownership in Kwilt, promote Money's grouped settings surfaces into shared UI, and let capabilities contribute only named destinations.

- Persona fit: strongest; one app and one settings model, while Money still feels financially trustworthy.
- System fit: extends the accepted capability registry, lifecycle, settings ownership, shared session, and native targets.
- Best when: correctness and long-term coherence matter more than a bulk-copy shortcut.
- Fails when: slices are allowed to become permanent placeholders or parity is judged only by tests.
- Primer check: pass; no dashboard is added to Settings, capture is unaffected, and language stays concrete.

## C. Global Shell With Separate Capability Settings Hubs

Port Money's screens natively but keep a Money Settings home alongside Kwilt Settings.

- Persona fit: preserves local familiarity but leaves users deciding which settings universe owns a choice.
- System fit: mixed; navigation is native, ownership is duplicated.
- Best when: capabilities have unrelated accounts and release trains.
- Fails when: auth, subscriptions, privacy/legal, notifications, and deletion are shared.
- Primer check: fails reductive design by preserving two durable concepts for one job; discard.

## Recommendation

Choose B. It preserves Money's native product truth while removing standalone shell duplication. The smallest system extension is a Money navigator, capability-owned runtime/repository, and settings contribution contract built on shared settings primitives.

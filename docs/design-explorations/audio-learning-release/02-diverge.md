# Diverge: Audio delivery

Axis of variation: where long-form audio lives and what happens on first play.

## A. Bundle every approved track

All music ships inside the native binary. Playback and offline behavior remain simple, but the approved catalog adds roughly 26 MiB before future enhancements and works against the explicit bundle-size goal.

- Persona fit: immediate and reliable, but hidden install cost affects everyone.
- System fit: smallest code change.
- Best when: the catalog is permanently tiny and offline use dominates.
- Fails when: the library grows or tracks are replaced after learning.
- Anti-pattern check: passes calm UX, fails reductive delivery.

## B. Stream every continuous track

All Focus and game music uses public immutable URLs. The binary shrinks, but every session depends on network availability and repeated playback may repeatedly consume data.

- Persona fit: no download ceremony, but weak offline trust.
- System fit: moderate; source maps change to URLs.
- Best when: connectivity is effectively guaranteed.
- Fails when: a saved favorite is unavailable or buffering interrupts play.
- Anti-pattern check: fails the no-surprise reliability bar without fallback.

## C. One bundled fallback plus stream-and-cache

Keep Deep Work Drift bundled. Every other continuous track has an immutable CDN URL and deterministic cache file. Play the cached file when present; otherwise stream immediately and cache silently. Prefetch the saved Focus selection and game music at naturally early moments.

- Persona fit: feels immediate, keeps offline grace, and adds no download management.
- System fit: extends the existing catalog while preserving stable ids and surface ownership.
- Best when: most sessions are connected but the product must fail calmly.
- Fails when: the first stream and cache download duplicate bytes; measure and refine if material.
- Anti-pattern check: passes. No dashboard, streak, gate, or new user-maintained concept.

## D. Download before first play

Selecting a track starts a complete download and playback begins only afterward. It produces a clean persistent local source and one network transfer, but visibly delays the moment the user asked to make immediate.

- Persona fit: reliable after download, poor at selection time.
- System fit: technically straightforward.
- Best when: files are small or users explicitly manage offline media.
- Fails when: a four-minute track takes several seconds on cellular service.
- Anti-pattern check: fails the requested friction bar.

## Recommendation

Choose **C**. It is the only option that simultaneously reduces the binary, keeps first play immediate, preserves an offline fallback, and avoids a download-management UI.

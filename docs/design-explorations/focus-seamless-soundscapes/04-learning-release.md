# Learning Release: Seamless Focus environments

## Concept To Build

Focus offers one calm grouped soundscape choice whose music and nature tracks continue without an attention-breaking ending.

## Capability Delta

Today, the user cannot rely on the six remote music tracks to disappear into the background across their loop boundary.

After this release, the user can select corrected music or five nature environments from the existing Focus setup and keep that selection across sessions.

Still intentionally unsupported: layering, rotation, favorites, managed downloads, and permanent playback-architecture expansion.

## User Experience

The Soundscape field remains between duration and Start. Opening it shows No audio when allowed, then Music and Nature groups with one selected state. Starting Focus behaves as it does today.

## Buildable Slice

Must be real:

- Eleven corrected or generated content-addressed remote MP3 objects.
- Lossless working masters and three-repeat audition artifacts retained outside the app bundle.
- Seam, loudness, peak, silence, byte-size, URL, cache, and source tests.
- Stable catalog ids and persisted-store compatibility.
- Grouped setup and in-session selection using current components.

Can be thin:

- Music v2 glue generation is used only where deterministic crossfade candidates are not musically acceptable.
- One fixed nature candidate per category ships after review; rejected generations remain authoring artifacts.

Intentionally excluded:

- New navigation, audio previews, track artwork, mixing, telemetry about listening content, or automatic selection.

## Release Channel

Local and signed-device learning release first. TestFlight is a later release gate, not implied by merged source.

## Brand-Goodwill Guardrails

- No abrupt unique events or startling gain.
- Audio failure never blocks Focus.
- Existing saved ids continue to resolve.
- Nature labels remain literal and familiar.

## Reversibility

Every addition is a catalog entry and picker row. A candidate can be removed in source without a migration; immutable objects may remain harmlessly stored.

## Permanent Product Threshold

Repeated signed-device Focus use shows no noticed seam, no background/lock interruption regression, and the larger picker still scans as one quick choice.

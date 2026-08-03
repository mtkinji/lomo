# Learning Release: Adventure playback

## Approved refinement — 2026-08-03

Ship this as Recorded Path playback. Prioritize a continuous, recognizable route; synchronized fog reveal; gradual elevation color; direct chart scrubbing; and automatic pause during map manipulation. Do not expose “Adventure” or make honest gaps a normal visual state. Bounded, validated Apple Maps reconstruction may repair plausible quarter-mile acquisition misses while the original samples remain unchanged.

## Concept To Build

A completed deliberate Adventure returns as one private recap whose exact route, fog reveal, and elevation profile can be replayed or scrubbed together.

## Capability Delta

Today, the user cannot:

- inspect altitude changes from a completed session;
- replay the order in which a route and fog clearing occurred.

After this release, the user can:

- see a trusted elevation-by-distance profile for one deliberate Adventure;
- press Replay or Pause;
- drag the elevation profile to inspect the corresponding route point and fog state.

Still intentionally not supported:

- all-time history playback;
- automatic playback on every recap;
- workout statistics, route inference, or public sharing.

## User Experience

After Stop and recap resolution, Explore shows the completed map and a compact profile in the existing recap drawer. Replay fits the route on the map and advances a visible point through the route while the retained path and fog clearing appear progressively. The profile remains directly adjustable. Done keeps its existing behavior.

## Existing Product Relationship

This enhances the existing map, session model, elevation presentation, and Exploration Recap. It adds no navigation destination or persistent preference.

## Buildable Slice

Must be real:

- time-based playback projection over retained session points;
- trusted, gap-preserving elevation profile;
- progressive route/fog display on iOS and the existing non-iOS fallback;
- Replay, Pause, direct scrub, accessibility adjustment, and Reduce Motion behavior;
- focused domain and screen regression coverage.

Can be thin or temporary:

- playback duration may use one bounded compression policy;
- the recap is the only playback entry in this learning release.

Intentionally excluded:

- session library, seasonal timeline, photos, Place annotations, speed controls, and aggregate climb metrics.

## Release Channel

Local signed-device build first. Route fidelity, fog animation, touch scrubbing, screen-lock acquisition, battery, and thermal behavior need real-device observation before TestFlight claims.

## Brand-Goodwill Guardrails

- Never call interpolated or absent altitude a measurement.
- Never imply that playback repaired a missing route.
- Never force or celebrate playback.
- Keep the experience private and skippable.

## Reversibility

Playback adds derived UI and pure projection logic without changing stored sessions. It can be hidden or removed without migration or data loss.

## Permanent Product Threshold

The interaction becomes permanent when several signed-device Adventures replay smoothly, the elevation profile is recognizable and trustworthy, reduced-motion behavior is sound, and the feature increases the perceived value of manual recording without making recap feel slower or busier.

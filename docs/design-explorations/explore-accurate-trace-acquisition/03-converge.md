# Converge: Adventure route, elevation, and playback

## Approved refinement — 2026-08-03

“Adventure” is no longer user-facing because ordinary walks, errands, drives, and outings can be worth recording. The surface uses **Record a Path**, **Recording**, **Explore Recap**, and **Recorded Paths**. The visual route is the hero, with Silver Mist reveal and elevation as synchronized supporting layers.

Routine gaps are a product defect, not a presentation motif. The path should normally appear continuous. Raw samples remain preserved, while plausible misses up to roughly a quarter mile can be reconstructed along Apple Maps roads or paths and stored as separate presentation evidence. Visible failure treatment is reserved for genuinely indefensible interruptions.

## Decision

Build **Replay this Adventure** with **Scrub the memory** as one interaction: a completed deliberate Adventure retains its exact recorded route, shows a compact elevation-by-distance profile, and lets the user either play the outing or drag across the profile to inspect it.

## Qualitative comparison

| Alternative | Meaning and trust | System fit | Blast radius | Decision |
| --- | --- | --- | --- | --- |
| Replay this Adventure | High | High | Medium | Build |
| Living recap | Medium | Good | Medium | Defer automatic playback |
| Scrub the memory | High | High | Medium | Build with Replay |
| Watch my world open | Potentially high | Weak-to-medium today | High | Preserve future provenance |

## Capability delta

Today, Maya can finish an outing and see its final route and discovered Places, but cannot revisit the sequence or understand its climbs and descents.

After this increment, a single deliberate Adventure recap can replay its retained route and fog reveal while a cursor moves through an honest elevation profile. Dragging the profile inspects the same evidence directly.

Still intentionally unsupported: inferred road geometry, workout scoring, forced automatic recap animation, exact replay of unsupported legacy history, and an all-time timeline surface.

## Reductive design decisions

- Enhance the existing recap and map; add no screen, tab, recording mode, or setting.
- One compact elevation profile is both visualization and scrub control.
- One Replay/Pause control owns time-based playback.
- Start/high/low/finish context appears only when trusted altitude evidence exists.
- Do not add speed selection, laps, pace, calories, ascent totals, achievements, or sharing.
- Reduce Motion keeps the static chart and direct inspection but suppresses automatic route animation.

## System implications

- Playback is derived from ordered `ExplorePoint.recordedAt` values and adds no acquisition or battery cost.
- The displayed route and fog geometry are projected from a prefix of the selected session while prior sessions remain the baseline.
- The chart breaks across missing or untrusted elevation instead of inventing a measured profile.
- All-time playback remains future work; forward data should retain the event times needed to reconstruct it honestly.

## Activation

The feature appears only after a deliberate Adventure with enough route evidence. The completed state is shown first. Replay begins only after the user presses Replay or scrubs the profile, so finishing an outing remains immediate and calm.

## Bet

We are betting that synchronizing the exact route, fog reveal, and elevation profile will make deliberate Adventures feel worth starting without turning Explore into a fitness tracker. If playback feels ornamental or obscures route-quality problems, retain the static profile and remove the animation before expanding the surface.

## Success signal

On a signed iPhone, Andrew can record a representative walk, stop it, replay the full retained route smoothly, scrub to a recognizable climb, and see fog reveal only where the retained evidence supports it.

# Diverge: Adventure playback

## Axis of variation

The alternatives vary by playback scope and activation: explicit single-session playback, automatic recap animation, direct user scrubbing, or an all-time retrospective. All enhance the existing Explore session and recap; none creates a new Arc, Goal, Activity, or Chapter, and none blocks capture.

## A — Replay this Adventure

The completed recap offers **Replay**. The map begins with the fog state that existed before the session, then advances through the session's timestamped points. The exact route grows, Silver Mist dissipates, a location marker moves, and the elevation chart cursor advances in sync. Play/pause and a simple progress scrubber are available; playback can be dismissed immediately.

- Audience/persona fit: strong for Maya because it makes a deliberately recorded family outing recognizable without asking her to curate it.
- Design-challenge answer: spends no additional recording energy; it reuses the exact evidence collected because the user chose Adventure fidelity.
- System fit: strong. Reuses stored sessions, point timestamps, current map geometry, fog renderer, elevation profile, and recap drawer. The smallest extension is a derived playback cursor/state.
- Best when: one session has trustworthy, adequately spaced points and the user wants to revisit it.
- Fails when: the route itself is incomplete, playback recomputes expensive geometry on every animation frame, or pre-session fog cannot be separated honestly.
- Four-object/capture-first stance: remains an Explore reflection over a session and never delays Start or Stop.
- Anti-pattern check: pass; private, user-invoked, skippable, and not scored.

## B — Living recap

When a deliberate Adventure ends, the recap opens with a short compressed animation: the path and fog reveal over roughly several seconds, then settle into the static route and elevation profile. A Replay affordance remains, but there is no full transport-control surface in the first version.

- Audience/persona fit: potentially delightful for Maya and exceptionally low effort.
- Design-challenge answer: gives emotional payoff immediately after the higher-fidelity recording choice.
- System fit: good. Uses the same derived state as A but activates automatically within the current recap.
- Best when: sessions are short enough to summarize clearly and the animation feels like reflection rather than celebration theater.
- Fails when: the user is trying to finish quickly, reduced-motion is not honored, or repeated recaps make the animation feel fussy.
- Four-object/capture-first stance: remains a recap treatment; Stop completes immediately and the animation is always skippable.
- Anti-pattern check: conditional pass. Respect Reduce Motion, never block Done, and do not use confetti, scores, streaks, or achievement language.

## C — Scrub the memory

The static elevation profile is also the timeline. Dragging across it progressively reveals the route and fog up to the selected point while highlighting the corresponding location on the map. Nothing plays automatically; lifting the finger returns to the completed view or leaves the selected moment visible.

- Audience/persona fit: strong for a calm, exploratory recap because Maya controls attention and pace.
- Design-challenge answer: directly connects climbs, descents, route position, and fog discovery without adding transport controls.
- System fit: strong. Reuses the proposed chart and needs only a normalized progress selection plus incremental geometry.
- Best when: the user is curious about a particular climb, turn, or Place.
- Fails when: the chart is too small to manipulate accurately, accessibility alternatives are absent, or progressive fog rendering cannot stay smooth.
- Four-object/capture-first stance: optional reflection after capture; VoiceOver needs equivalent previous/next-moment navigation.
- Anti-pattern check: pass; user-driven and meaning-oriented rather than metric-oriented.

## D — Watch my world open

An explicitly opened retrospective plays retained sessions chronologically so the full private map becomes known over days, months, or a selected season. Adventures, ambient paths, and supported Place blooms appear at their recorded times. The experience may eventually become source material for a retrospective Chapter, but it is not itself a Chapter and makes no AI interpretation.

- Audience/persona fit: emotionally powerful for Maya when enough history has accumulated.
- Design-challenge answer: elevates fog from a current map effect into a private record of lived territory.
- System fit: weak-to-medium today. Session timestamps and explored-cell `firstExploredAt` values help, but exact legacy fog, missing/deleted sessions, and user-created Place timing are not uniformly reconstructable.
- Best when: forward-collected history has durable event provenance and the user deliberately chooses a date range.
- Fails when: the animation implies completeness, long histories overwhelm rendering/storage, or the result feels like surveillance rather than reflection.
- Four-object/capture-first stance: a retrospective Explore view that may inform a Chapter only through a later, separate confirmation flow.
- Anti-pattern check: conditional pass. Keep it private by default, avoid heat maps and movement scores, and disclose incomplete history calmly.

## Divergence checkpoint

A and C are the strongest first-release candidates and can coexist: **Replay** provides the cinematic sequence, while the elevation chart provides precise user-controlled scrubbing. B is a presentation choice that should be tested cautiously. D is the larger vision, but it should be designed as a forward-compatible historical capability rather than promised as exact for existing data.

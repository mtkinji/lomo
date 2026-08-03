# Evaluate Learning: Adventure playback

## Approved refinement — 2026-08-03

The primary success condition is that representative signed-device Recorded Paths appear continuous and geographically recognizable without user repair. Reconstruction should follow roads or paths where Apple Maps can defend the route. Visible gaps should be rare exceptional failures, not evidence that the product is being honest.

## Learning questions

- Does Replay make a deliberate Adventure feel meaningfully more valuable than a static line?
- Can the user connect a climb or descent in the profile to the correct map location?
- Does progressive fog feel like an honest reconstruction rather than an animation laid over missing evidence?
- Is playback smooth for realistic point counts without excessive memory or thermal load?
- Does the recap remain calm and quick to dismiss?

## Supporting evidence

- A signed-device walk survives screen lock and yields a continuous recognizable route.
- Replay reaches every retained point in order and Pause/Resume preserve position.
- Scrubbing the chart moves to the expected route coordinate.
- Weak altitude samples produce gaps or a restrained unavailable state, not false precision.
- Andrew chooses Replay again on later manual outings without prompting.

## Disconfirming evidence

- The underlying route still contains routine acquisition gaps.
- Fog appears ahead of the playback point or reveals unsupported territory.
- The chart suggests terrain changes that are GPS noise.
- Touch scrubbing fights drawer scrolling or is inaccessible.
- Animation stutters, heats the device, or makes completing a recap feel slow.

## Instrumentation

Use local development diagnostics for point count, playback frame index, and render timing during signed-device evaluation. Do not transmit raw route, altitude, Place, or playback-position analytics. Record qualitative observations manually.

## Decision rule

Keep Replay and scrubbing after at least three representative signed-device Adventures—ordinary walk, vehicle outing, and elevation-changing route—show recognizable acquisition, truthful profiles, smooth playback, and no critical accessibility failure. Simplify to the static elevation profile if playback adds little meaning; return to acquisition policy if the route itself remains unreliable.

## Expected next action

If the single-session experience earns its place, add a durable private Adventure-history entry before considering seasonal or all-time fog playback.

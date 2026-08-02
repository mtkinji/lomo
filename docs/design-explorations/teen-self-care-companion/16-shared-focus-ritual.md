# Shared Focus Ritual

## Frame

The prototype can already start a fifteen-second Focus session and route its
completion through the same bounded care receipt as another meaningful action.
But the experience is still mostly a timer near the Pet. The habitat does not
yet communicate that the person and creature have entered a shared state.

In user voice: when I choose to focus with my companion, I want the little world
to settle with me so its presence feels supportive rather than distracting.

This serves `jtbd-put-intention-before-impulse`,
`jtbd-carry-intentions-into-action`, and `jtbd-trust-this-app-with-my-life`.
The ritual supports attention; it cannot become another streak, score, breathing
requirement, surveillance mechanism, or reason the Pet depends on the person.

## Alternatives

### Timer beside the existing world

Keep the current countdown and let ordinary visitors, weather, and touch
continue. This proves completion routing but does not create shared presence.

### Guided breathing exercise

Add inhale/exhale instructions and ask the person to follow the Pet. This could
be useful in another context, but it changes a general Focus session into a
specific wellness intervention the person did not request.

### Habitat-wide shared stillness

The Pet travels beneath the old tree, curls into its authored sleeping pose,
and breathes quietly. Wildlife exits, weather sway softens, the camera settles,
and a faint in-world light cadence makes the stillness perceptible. The person
keeps the ordinary countdown and receives one existing care opportunity at
completion.

## Convergence

Choose **habitat-wide shared stillness**.

- Travel to shelter remains physical and authored; the Pet does not teleport.
- A portable focus clock owns duration, elapsed time, remaining time, and
  completion.
- Wildlife clears at entry and cannot spawn during the session.
- Wind and rain keep their meaning but quiet enough that the curled breathing
  becomes the visual center.
- Direct world-play yields while focus is active so accidental taps cannot pull
  the companion away.
- A subtle light cadence sits inside the habitat rather than as a progress ring
  or gamified meter.
- Reduce Motion uses one stable pool of quiet light with no pulse.
- Completion wakes the Pet gently, then creates the same one-per-day Focus
  receipt already owned by the care loop.

## Portable engine contract

- Focus state carries `durationMs`, `elapsedMs`, `remainingMs`, `active`, and
  `completed` without knowing about React, Canvas, iOS, web, or desktop.
- A pure atmosphere resolver maps that state to bounded `hush` and `breath`
  values.
- World logic uses `hush` to reduce decorative sway; renderers use `breath` for
  a platform-appropriate environmental cadence.
- Product state continues to decide whether Focus completion makes today's one
  care moment available.

## Acceptance evidence

- Focus begins by clearing an active visitor and walking toward the old tree.
- No autonomous visitor appears while focus remains active.
- The habitat visibly quiets while weather identity remains legible.
- The curled Pet's breathing is the only meaningful cadence in the shot.
- Direct taps cannot pull the Pet out of the ritual.
- Reduce Motion preserves a calm, stable focus state.
- The end of the prototype session creates one ordinary Focus receipt and no
  parallel progress system.

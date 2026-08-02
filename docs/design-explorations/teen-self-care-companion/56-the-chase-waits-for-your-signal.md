# Pet Engine Study 56 — The Chase Waits for Your Signal

## Frame and system alignment

> A beautiful chase should not be something the person merely watches. The
> visitor, Moss, and the person's hand should share one readable action line.

Charlie remains a provisional teen participant within the Pet prototype's
learning audience. The existing world already gives Baby, Young, and Guardian
different wildlife at progressively higher layers, and Moss now turns before
committing so no pursuit reads backward. The remaining friction is agency:
ordinary wildlife episodes resolve automatically, so the person can admire the
animation without feeling that they helped set it in motion.

Restated in user voice: **When a tiny creature enters Moss's world, I want my
touch to matter to what happens next, so that the meadow feels like a place we
are playing in together rather than a scene I am watching.**

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

This continues the underserved `Notice non-metric progress` step in
`job-flow-sarah-see-who-im-becoming`, currently scored 3. Maturity should feel
like new physical possibility, not a meter or unlock toast. Trust requires the
invitation to remain optional, finite, quiet, and non-punitive.

Constraint posture: **Fit and extend the existing visitor episode.** Reuse the
three visitors, visitor performance clips, attention beat, planted turn,
stage-specific pursuit, camera, soundscape, direct world-space touch, and
contextual dock. Add no quest, score, capture reward, combat framing, joystick,
new visitor art, particle effect, or permanent control.

**Design challenge:** How might the meadow let Charlie release one beautiful,
maturity-shaped chase with a touch, while preserving Moss's autonomy and the
quiet life of the habitat?

## Divergence

### Make every visitor directly steerable

Dragging an insect could turn wildlife into another toy, but it would collapse
the difference between a living visitor and the golden leaf. It also asks the
person to puppeteer too much of the scene.

### Add a chase button

A dock button would be obvious, but it would detach the action from the visitor
and make the world feel like a menu of animations.

### Hold one shared action line

The visitor enters at the layer Moss has grown into. Moss notices it and turns.
For one generous beat, the visitor holds its lateral position while continuing
its own attached wing, glow, antenna, or leg acting. The dock names the single
available gesture. Touching the visitor releases the already-established
directional chase. If untouched, Moss chooses to go after it after the beat.

## Convergence

Choose **hold one shared action line**.

The authored sentence is:

1. a stage-specific visitor enters the current camera shot;
2. Moss acquires it with eyes, ears, and head before moving;
3. the visitor pauses in world space but remains visibly alive;
4. Moss plants and faces the visitor's current side;
5. the contextual dock says `Touch the moss crawler`, `Touch the firefly`, or
   `Touch the sky moth`;
6. the person's touch commits the exact current side and releases the chase;
7. Baby stalks on the terrain, Young pounces through the middle layer, and
   Guardian takes the high aerial line;
8. if the person does nothing, Moss commits independently after one calm beat;
9. contact and recovery finish before the living day continues.

We're betting that **one optional touch at the anticipation beat** will make an
existing animation feel co-authored without making Moss feel obedient. If it
feels like a reaction-time game, lengthen the invitation and further soften the
copy before adding any stronger control.

## UI contract

Job: When Charlie and Moss notice the same visitor, Charlie needs one clear way
to enter the moment so the chase feels shared.

Primary action: Touch the visitor while Moss holds the action line.

Must show: the visitor in world space; Moss planted and facing it; one current
gesture instruction; the stage-specific pursuit after touch.

Reveal later: higher visitor layers and more acrobatic pursuit emerge only
through growth.

Must not add: tutorial modal, chase button, countdown, score, target reticle,
reward, failure state, streak, inventory, combat, or dialogue.

Required states: approach, attention, shared invitation, touched commitment,
ignored commitment, left and right targets, Baby/Young/Guardian outcomes,
Focus interruption, direct-hand interruption, and Reduce Motion.

## Portable engine contract

- Only authored shared visitor episodes request a touch; inspector-only
  autonomous visitor QA may retain its direct chase path.
- The shared invitation freezes lateral visitor travel, not visitor life:
  attached legs, antennae, wings, glow, and weather material continue.
- The visitor owns one generous world-space hit target appropriate to its
  visible scale.
- `beginVisitorChase` samples the visitor's current side once, commits the same
  direction to Moss, the visitor's escape, the intercept, and the camera, and
  cannot reverse mid-performance.
- Ignoring the invitation commits the same function after a finite duration;
  it never produces failure, guilt, or an unfinished need.
- Reduce Motion preserves the touch decision and final directional meaning
  without animated pursuit.
- The first breeze remains the opening playable lesson. The shared visitor is
  the next authored living-day episode, making the interaction language deepen
  rather than repeat.

## Learning release and evaluation

The private site remains the release channel. Supporting evidence is that a
fresh tester understands the visitor itself is touchable; Moss visibly waits;
touch and inaction both resolve cleanly; every form uses a different reachable
layer; left and right commitments never read backward; and no instruction
persists after commitment.

Disconfirming evidence is a visitor that feels frozen or dead, an invitation
that feels like a quick-time event, a touch target too small for a phone, Moss
teleporting or reversing, a chase that can be farmed as progress, or a scene
that traps Focus or direct play.

## Spec refinement

The existing visitor drawings and character clips are sufficient; no new art
generation is required. Visitor hit-testing, invitation timing, commitment,
and living-day ordering are pure engine logic and are test-first. Dock copy and
visual hierarchy are verified at 390 × 844 on the private production site.

# Pet Engine Study 25 — The Sky Opens as Moss Grows

## Frame and system alignment

> I should feel like the character can evolve from a baby to a powerful adult
> creature. I am not just watching that world. I am playing with my little
> character from it.

When Charlie returns to Moss after meaningful days in Kwilt, he should feel the
creature's growth through what they can do together—not only through a larger
silhouette or an evolution cut scene. The world should literally become more
reachable as Moss matures.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie as the teen participant. The hero job
is `jtbd-move-the-few-things-that-matter`. This study most directly serves
`jtbd-feel-arc-progress-without-tracking-tools`, with
`jtbd-help-us-enjoy-being-together` and `jtbd-trust-this-app-with-my-life` as
supporting jobs. It strengthens **Keep using the system because it feels
helpful, not fussy** in `job-flow-maya-move-family-life-forward` (3/5).

Constraint posture: **Extend the system.** Preserve one canvas, one hand-mote,
authored clips, stage manifests, grounded contact, weather and Focus priority,
and the portable world state machine. Make the existing hand relationship
stage-aware instead of adding a power menu, ability tree, tutorial, score, or
second control surface.

How might we help Charlie feel Moss becoming genuinely more capable through
play, while preserving calm progression, believable physical commitment, and
freedom from stats or grinding?

## Anchor assessment

### Restated in user voice

When I return after doing things that matter in my real life, I want playing
with Moss to feel newly possible, so I can sense that we have grown together
without reading a level, score, streak, or progress dashboard.

### Matches

- `jtbd-feel-arc-progress-without-tracking-tools` — maturity becomes a felt
  change in reachable play rather than a numeric claim.
- `jtbd-help-us-enjoy-being-together` — each form gives a person a new playful
  movement to discover or show someone beside them.
- `jtbd-trust-this-app-with-my-life` — authored reach limits keep the creature
  physically coherent rather than granting arbitrary animation on demand.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
```

## Yes-and decision

Broad expansion is intentionally skipped. The larger opportunity is a complete
capability curve in which weather, wildlife, play, and Focus all deepen with
maturity. This study should prove the smallest legible version: the same direct
hand gesture reaches a different layer of the world at each life stage.

## Divergence

Axis of variation: **how should maturity become playable?**

### Faster versions of the same move

Baby walks slowly, Young runs, and Guardian runs faster. This is easy to build,
but it makes growth feel quantitative and game-stat-like. The silhouette grows;
the relationship does not.

### Stage-specific command buttons

Add Pounce and Fly controls as Moss evolves. The capability delta is obvious,
but the interface becomes a game controller and teaches the engine instead of
letting the person discover the creature.

### The sky opens through the same gesture

Keep drawing one finger through the world. Baby follows a light that settles
near the ground. Young can commit to a middle-layer bound. Guardian can launch
into a high aerial reach. Height, authored animation, camera framing, and
landing all express maturity without adding a control.

### Autonomous showcase scenes

After evolution, Moss performs a new acrobatic cut scene. This creates a strong
reveal but leaves the person watching instead of playing. It can support the
evolution ceremony later, but it cannot be the core proof.

## Convergence

Choose **the sky opens through the same gesture**.

The playable grammar is:

1. Baby's mote settles into the low world; Moss watches or toddles toward it.
2. Young can follow low light normally and bound toward a middle-height light.
3. Guardian keeps the low and middle vocabulary, then uses its authored aerial
   performance for a high light.
4. A vertical gesture near Moss is enough to invite a jump; horizontal distance
   is not required.
5. Once an acrobatic commitment begins, pointer updates may refine the landing
   point but never restart the clip on every frame.
6. Release commits to the last reachable point; Moss lands before greeting.
7. A held light after landing becomes quiet attention, not an automatic loop of
   repeated jumps.
8. Focus and settled rain shelter remain stronger than play.

The person controls invitation, direction, and height. Moss owns reachable
height, gait, launch vocabulary, landing, and refusal.

### Capability delta

Today, the person's hand can guide all three forms horizontally, but vertical
movement does not reveal maturity. After this study, one gesture makes Baby,
Young, and Guardian feel physically different: the world has layers that only
growth can unlock. The person still cannot fly Moss continuously, steer it in
midair like a cursor, chain acrobatics, spend energy, fail a jump, or pull Moss
out of shelter or Focus.

### Reductive decisions

- No ability buttons, labels, level numbers, skill tree, stamina, or tutorial.
- No new animation art; compose the existing discover, walk, run, pounce, and
  aerial authored rows into a stage-aware direct-play performance.
- No repeated jump loop while the finger remains held.
- No hidden score or receipt from casual play.
- No change to the healthy-action growth thresholds in this study.

We're betting that **new reachable space** will communicate evolution more
powerfully than a larger body or faster movement alone. If people do not notice
the difference without reading the inspector, revisit the mote's reachable
height, anticipation, camera width, and landing beat before adding controls.

## Learning release

The private standalone site remains the release channel. Study 25 must include
stage-aware hand reach, Young bound, Guardian aerial reach, vertical invitation
near the creature, one committed landing, held-after-landing attention, reduced
motion meaning, Focus/rain priority, deterministic inspector evidence, and no
regression to low hand following, tap, pinch, rollover, or wind-leaf play.

## Evaluation plan

At a 390 x 844 viewport:

1. drag upward near Baby and confirm the light stays low and Baby remains
   grounded;
2. repeat as Young and confirm one authored bound reaches the middle layer;
3. repeat as Guardian and confirm a high light earns a visibly wider aerial
   performance;
4. move the finger sideways during commitment and confirm facing and landing
   update without animation restart or backward travel;
5. hold after landing and confirm Moss watches rather than jumping repeatedly;
6. release during each stage and confirm a grounded landing precedes greeting;
7. verify low drags retain walk/run behavior and direct rollover still wins;
8. try during Focus and settled rain shelter and confirm no invitation occurs;
9. repeat with Reduce Motion and confirm the stage-specific meaning remains
   without airborne travel.

Supporting evidence is that a person can predict which part of the world each
form can reach after one playful attempt. Disconfirming evidence is a flying
cursor, repeated pogoing, a Baby performing Guardian movement, a clip that
restarts under the finger, an airborne greeting, or an inspector-only
difference.

## Spec refinement

Pure world logic owns stage-specific reachable height, action selection,
commitment duration, landing, release, reduced-motion behavior, and priority.
`guideWorldWithHand` must receive the current stage. The world needs distinct
`hand-pounce` and `hand-aerial` actions so camera and clip selection remain
renderer-neutral. Canvas continues to own only pointer arbitration and mote
drawing. Existing authored clips supply body motion; world position supplies
horizontal commitment and must return to ground before `hand-found`. Tests must
precede state-machine implementation. No user-owned decision remains for this
prototype study.

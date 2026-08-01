# Pet Engine Study 24 — Moss Follows Your Hand

## Frame and system alignment

> I should not only feel immersed in this beautiful tiny world. I should feel
> that I can control the character within it, just enough to be really
> engaging.

When Charlie opens Pet during a small pause, he wants his hand to become part
of the scene and Moss to respond with its own weight, attention, and choice, so
play feels like touching a living anime creature rather than issuing commands
to a sprite.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie as the teen participant. The hero job
is `jtbd-move-the-few-things-that-matter`; this study directly serves
`jtbd-trust-this-app-with-my-life`, `jtbd-help-us-enjoy-being-together`, and
`jtbd-feel-arc-progress-without-tracking-tools`. It strengthens **Keep using
the system because it feels helpful, not fussy** in
`job-flow-maya-move-family-life-forward` (3/5) and **Notice an opportunity to
play together** in `job-flow-maya-start-playing-together` (2/5).

Constraint posture: **Extend the system.** Keep the one canvas, world-space
pointer conversion, tap-to-move, high tap, rollover, pinch, wind leaf, authored
locomotion, weather priorities, Focus, and portable runtime. Add one continuous
touch relationship that composes those systems rather than another control.

How might we help Charlie feel that his hand has entered Moss's world, while
preserving Moss's agency, grounded motion, calm pacing, and freedom from needs,
scores, or failure?

## Anchor assessment

### Restated in user voice

When I have a small opening, I want to reach into the little world and have the
creature genuinely notice and follow me, so it feels like playful company—not
an animation I trigger and watch from outside.

### Matches

- `jtbd-trust-this-app-with-my-life` — tactile causality and authored limits
  make the creature feel crafted rather than mechanically reactive.
- `jtbd-help-us-enjoy-being-together` — the gesture creates immediate,
  pressure-free play that another person can discover by passing the phone.
- `jtbd-feel-arc-progress-without-tracking-tools` — the creature's growing
  movement confidence remains the emotional expression of progress.

```yaml
serves: [jtbd-trust-this-app-with-my-life, jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools]
```

## Yes-and decision

Broad expansion is intentionally skipped. This is a bounded refinement of the
existing direct-touch vocabulary. The larger opportunity is a portable gesture
relationship shared by future pets, but this study should prove one expressive
hand-to-creature loop before defining a generalized interaction kit.

## Divergence

Axis of variation: **what does continuous touch mean inside the world?**

### Pet the body

A slow stroke across Moss's head or back produces a lean, blink, tail response,
and stage-specific nuzzle. This is emotionally direct, but it requires a new
high-quality body-contact animation family and precise anatomy hit regions.
Without that art, it would be the most disappointing possible approximation.

### Direct pursuit

Moss follows the raw finger coordinate while the person drags. This is easy to
understand, but it risks joystick motion, sliding feet, animation restarts, and
the sense that Moss has no agency.

### A little light from your hand

After the finger begins to travel, one restrained sun-mote appears at the touch
point. Moss notices before moving, then walks or runs toward it with a humane
dead zone. The mote follows the hand; Moss follows with inertia. On release,
Moss completes the last few steps, finds the light, greets the person, and lets
it fade. Rain shelter and shared Focus remain stronger than the invitation.

### Draw a path

The finger paints a short glowing path and Moss follows the completed curve.
This could create cinematic movement, but path drawing adds invisible planning,
cornering, and collision rules before the basic relationship is proven.

All alternatives preserve the existing Kwilt actions, add no speech, score,
streak, care debt, inventory, joystick, persistent route, or consumer-facing
instruction.

## Convergence

Choose **a little light from your hand**.

The smallest elegant sequence is:

1. a tap remains the existing tap interaction;
2. a deliberate drag interrupts ambient direction and wakes one small mote;
3. Moss first turns and watches without translating;
4. beyond a dead zone, Moss walks, then runs if the hand opens real distance;
5. the target may move while Moss is traveling, but feet and facing never
   restart or reverse on every pointer frame;
6. on release, Moss commits to the last reachable place;
7. Moss arrives, performs one warm greeting, and the mote fades;
8. rain shelter and active Focus do not yield to the hand.

The mote is interaction feedback, not a collectible or world object. It leaves
no persistence and carries no reward. The user controls the invitation and
direction; Moss owns attention, gait, arrival, and refusal.

### Capability delta

Today, the person can tap discrete destinations and manipulate one leaf, but
cannot maintain an ongoing spatial relationship with Moss. After this study,
the person can guide Moss continuously through the habitat and feel Moss notice,
follow, and find them. They still cannot steer every frame, pull Moss out of
shelter or Focus, fail the interaction, or make Moss dependent on touch.

### Reductive decisions

- No joystick, path line, tutorial, gesture label, haptic meter, or mode switch.
- No new authored character row until continuous control proves emotionally
  valuable; use discover, walk, run, and greet as a coherent performance.
- No persistence, reward, care receipt, or life echo from casual hand play.
- No second cursor effect and no touch particle field.
- Pinch, wind-leaf drag, rollover, and ordinary taps keep their existing
  precedence.

We're betting that **responsive attention plus locomotion inertia** will make
Moss feel more alive than either raw finger-following or another standalone
animation. If it feels like cursor chasing, revisit anticipation, dead zones,
and release commitment before authoring petting clips.

## Learning release

The private standalone site remains the release channel. The build must include
one portable hand-guide state, deliberate-drag activation, world-space target
updates, walk/run/dead-zone selection, committed release and greeting, a single
diegetic mote, rain/Focus refusal, touch-priority preservation, Reduce Motion
meaning, deterministic inspector evidence, and no regression to tap, pinch,
rollover, or wind-leaf play.

## Evaluation plan

At a 390 x 844 viewport:

1. drag slowly near Moss and confirm attention precedes movement;
2. open distance and confirm grounded walk becomes run without sliding or
   screen-space reversal;
3. curve back across Moss and confirm facing changes once through real motion,
   not as a jittering restart;
4. release and confirm Moss commits, arrives, greets, and returns to quiet;
5. repeat at baby, young, and Guardian scale;
6. verify a tap, high tap, rollover, pinch, and wind-leaf grab retain precedence;
7. try during rain shelter and Focus and confirm Moss notices neither invitation;
8. repeat under Reduce Motion and confirm a stable attention-to-arrival meaning.

Supporting evidence is a gesture that a first-time person can discover without
copy, a readable relationship between hand and creature, grounded locomotion,
and an ending that feels affectionate rather than rewarded. Disconfirming
evidence is a cursor, joystick, sliding rig, glowing UI ornament, accidental
activation during taps, or Moss abandoning safety and stillness.

## Spec refinement

Pure world logic owns guide activation, target clamping, gait thresholds,
release commitment, refusal, and recovery. Canvas owns pointer arbitration and
the one rendered mote. The state must distinguish `quiet`, `held`, and
`released`; only a deliberate one-pointer drag may activate it. Wind-leaf
ownership, pinch, and rollover remain higher-specificity gestures. Focus and
settled rain shelter are non-interruptible. Tests must precede world-state
changes. No user-owned decision remains before this prototype study.

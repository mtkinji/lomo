# Pet Engine Study 23 — The Wind Finds the Toy

## Frame and system alignment

> The world should not merely contain several good animations. It should form
> one beautiful little event that I can enter and play inside.

When Charlie opens Pet during a small pause, he wants the habitat to make one
inviting thing happen and then respond immediately to his hand, so Moss feels
like a creature from a beautifully directed world rather than a collection of
demonstrations.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie as the teen participant. The hero job
is `jtbd-move-the-few-things-that-matter`; this study most directly serves
`jtbd-trust-this-app-with-my-life` and
`jtbd-help-us-enjoy-being-together`. It strengthens the weak **Keep using the
system because it feels helpful, not fussy** step in
`job-flow-maya-move-family-life-forward` (3/5) and the weak **Notice an
opportunity to play together** step in `job-flow-maya-start-playing-together`
(2/5).

Constraint posture: **Extend the system.** Keep the existing portable world,
weather arrival, authored wind-brace, golden wind leaf, stage-specific catch
vocabulary, direct manipulation, camera, and quiet recovery. Add only the
causal handoff between them.

How might we help Charlie feel invited into one tiny anime-like event, while
preserving direct control, calm pacing, no failure state, and the rule that
Moss never becomes a need to maintain?

## Anchor assessment

### Restated in user voice

When I have a small opening, I want Kwilt's little world to invite me into
something delightful that responds to my touch, so coming back feels like
entering a living place rather than checking another system.

### Matches

- `jtbd-trust-this-app-with-my-life` — emotional craft and reliable causality
  make the capability feel worth returning to.
- `jtbd-help-us-enjoy-being-together` — the episode turns an unstructured pause
  into easy play without setup, scoring, or coordination.
- `jtbd-feel-arc-progress-without-tracking-tools` — the creature and habitat
  remain an ambient emotional receipt, not another progress dashboard.

```yaml
serves: [jtbd-trust-this-app-with-my-life, jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools]
```

## Yes-and decision

Broad expansion is intentionally skipped. This is not a new capability,
platform, object, or economy; it is a bounded elevation from isolated reactions
to a causal playable episode. The larger opportunity is authored micro-episodes
that hand control between the world and the person, but this study should prove
one before defining a catalog.

## Divergence

Axis of variation: **what natural event invites the person into play?**

### A summer-shower choice

Clouds arrive, Moss notices rain, and the person can tap the old tree to seek
shelter or tap a puddle to play. This is emotionally rich, but a believable
puddle interaction needs a new splash performance and risks implying a choice
that the current engine cannot yet honor beautifully.

### The wind finds the toy

A breeze arrives, Moss braces, and the gust loosens the golden leaf from the old
tree. Moss stays planted and reads its path. The person can catch the leaf in
flight, drag it, and toss it somewhere new; if they do nothing, Moss completes
one stage-appropriate catch. This composes existing world and animation
systems into a new experience with no new maintenance concept.

### Dusk wakes the fireflies

The light falls, several fireflies appear, and Moss follows them through the
meadow. This would deepen atmosphere, but it first requires a time-of-day and
lighting system. Multiple visitors could also make the scene visually busy and
less directly controllable.

### A life echo opens the episode

Every To-do, Focus, or Play receipt triggers a short cinematic response around
its new habitat trace. This strongly connects life to the world, but it would
make every meaningful action demand attention and could turn gentle memories
into reward fanfare.

All four alternatives leave Arc, Goal, Activity, and Chapter ownership
unchanged, never block capture, never expose private receipt content, and add
no score, streak, need meter, collection, or anthropomorphic AI.

## Convergence

Choose **the wind finds the toy**.

The current engine already has the right vocabulary, but its parts wait for
separate triggers. The smallest elegant version creates one causal chain:

1. breeze arrives by degrees;
2. Moss performs its authored wind brace;
3. the gust dislodges the golden leaf;
4. Moss plants its feet and follows the moving leaf with its gaze;
5. the person may catch, drag, and retoss it while it is moving;
6. otherwise baby waits for ground play, young leaps, and Guardian meets it in
   the air;
7. one catch and quiet return end the episode.

The Wind inspector control becomes a deterministic way to replay the episode.
Autonomous weather may produce it only when no visitor, Focus session, or other
episode already owns the scene. Direct touch retains immediate priority.

### Capability delta

Today, the user can manipulate a perched leaf and can observe wind, but wind
does not discover the toy and invite play. After this study, one weather event
naturally hands the scene to the person without a tutorial or button inside the
consumer world. The user still cannot fail, collect the leaf, earn points, or
make Moss sad by ignoring it.

### Reductive decisions

- No episode picker, tutorial card, prompt bubble, success state, or new
  consumer control.
- No second toy and no inventory.
- No random trigger until the deterministic Wind path is visually proven.
- No new persistence; the leaf always returns quietly.
- No collision between visitor play and leaf play.

We're betting that **causal handoff plus optional direct interruption** will
feel more like playing inside a directed animated world than adding another
standalone clip. If it does not, revisit staging, gaze, and timing before adding
more episode types.

## Learning release

The private standalone site remains the release channel. The real build must
include a portable wind-leaf invitation state, one deterministic release path,
mid-flight grab ownership, stage-specific ignored-path catches, Reduce Motion
meaning, weather/visitor/Focus priority, inspector evidence, and a quiet end.

The episode is discovered through the world. The inspector may expose its
state for critique, but the phone capability adds no explanatory UI. Existing
To-do, Focus, Play, life echoes, direct taps, rollover, pinch, soundscape, and
living-day behavior remain intact.

## Evaluation plan

At a 390 x 844 viewport:

1. choose baby, trigger Wind, and watch brace become a grounded toy invitation;
2. repeat with young and Guardian, confirming increasing aerial confidence;
3. grab the leaf while it is moving, redirect it, and confirm Moss follows the
   hand rather than the old prediction;
4. ignore it and confirm one automatic catch and quiet return;
5. trigger Focus, rain, a visitor, and direct taps during the episode to verify
   priority and interruption;
6. repeat under Reduce Motion and confirm the leaf lands without decorative
   flight but the invitation remains understandable.

Supporting evidence is a legible cause-and-effect chain, immediate touch
ownership, one coherent camera story, stage difference, and no pressure to
interact. Disconfirming evidence is an unexplained flying prop, competing
wildlife, a missed grab, backward travel, a tutorial dependency, or a sequence
that feels like a canned cutscene.

## Spec refinement

World logic owns invitation timing and priority. The immutable wind flight
profile continues to own physics; stage manifests own body acting; Canvas owns
only rendering and pointer routing. The leaf hit target may accept `perched`,
`flying`, or `landed`, but never `caught`. The wind-brace completion may start
an invitation only when the current breeze is settled, the leaf is perched,
and no visitor or Focus session is active. Tests must precede state-machine and
hit-target changes. No user-owned decision remains before this prototype study.

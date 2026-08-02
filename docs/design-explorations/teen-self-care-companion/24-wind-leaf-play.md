# Pet Engine Study 20 — Wind-Leaf Play

## Frame and system alignment

> I should feel like I am playing with a little creature from a beautiful anime
> world, not merely watching it or issuing commands.

When I visit Pet just to be with Moss, I want something in the habitat that I
can move and watch Moss respond to moment by moment, so our interaction feels
like shared play rather than a sequence of buttons.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as a
  provisional teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-carry-intentions-into-action`,
  `jtbd-see-who-im-becoming`, and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** Family participation is 2/5 and continued use is 3/5.
- **Constraint posture:** Extend the existing Pet world.

The current system already supports world-space touch, authored travel, jump,
pounce, aerial acrobatics, stage-specific behavior, weather, direct-preemption
rules, camera direction, sound, and a quiet living-day director. The missing
capability is a sustained interaction whose outcome is jointly shaped by the
person and Moss.

**Design challenge:** How might we let Charlie play continuously with Moss
inside the meadow, while preserving animal-like agency, immediate control,
calm attention, and the absence of scores or needs?

## Yes-and decision

This is a bounded interaction refinement, so broader expansion is intentionally
skipped. The job elevation is from “Moss performs when I tap” to “Moss notices
what I am doing and plays back.” Keep the existing Pet-capability frame.

## Divergence

### 1. Affection gesture

Press and stroke Moss to produce a stage-specific lean, nuzzle, and release.
This is intimate and easy to understand, but it mostly changes the reaction to
touch; it does not create much space for playful improvisation.

### 2. Wind-leaf plaything

A single golden leaf hangs within the old tree. The person can grab it, drag it
through the scene, and toss it. Moss tracks it continuously, then pursues or
intercepts it using maturity-specific physical vocabulary. This turns the
habitat itself into the interface and gives the person control over a target
without directly puppeteering Moss.

### 3. Trick controls

Expose a small set of commands such as sit, jump, roll, and chase. This is
predictable and game-like, but repeats capabilities already available through
direct touch and adds permanent interface furniture to the world.

All three fit the four-object model by remaining optional Pet-capability play;
none creates a Goal, Activity, Arc, or Chapter, and none blocks capture. The
wind leaf best serves the design challenge without productivity voice,
streaks, scores, forced attention, or anthropomorphic AI.

## Convergence

Choose **wind-leaf plaything**.

The smallest elegant version has one generous invisible grab target attached
to one visible leaf. While held, the leaf follows the finger in world space and
Moss keeps its body grounded while its gaze and facing follow. On release, the
leaf travels through a short bounded arc. Baby waits for a ground-level chance,
young commits to a playful descending leap, and Guardian can intercept it
higher with the existing aerial vocabulary. The leaf always returns quietly to
the old tree after the scene.

There is no win state, catch count, accuracy grade, inventory, unlock, reward,
cooldown meter, tutorial overlay, or persistent affection value. Focus clears
the plaything and owns the scene. Reduce Motion preserves grabbing, tracking,
and a grounded catch without a ballistic arc.

We are betting that continuously controlling one habitat object while Moss
responds with visible agency will change the experience from a command demo
into genuine play. If it instead feels like dragging a cursor while a canned
animation runs, the next revision should improve gaze, interception, and
release timing rather than add more toys.

## Learning release

The private mobile-first site gains one real renderer-neutral plaything state:
perched, held, flying, landed, caught, and returned. The pure engine owns world
coordinates, bounded throw physics, maturity mode, one stable catch target,
priority, and recovery. Canvas owns the golden-leaf drawing and pointer hit
testing. Existing authored Moss clips own the physical performance.

The intro teaches the interaction in one sentence. The consumer frame adds no
button. The inspector may expose leaf phase and target for diagnosis. Prototype
weather controls, healthy-action simulations, Focus, living-day episodes,
camera direction, sound, mute, and Reduce Motion must continue to work.

## Evaluation

At phone scale:

1. grab the leaf near the old tree and move it slowly around Moss;
2. release it low as baby, mid-height as young, and high as Guardian;
3. throw left and right across the Pet;
4. interrupt an ambient scene, then start Focus while the leaf is active;
5. repeat under rain, close zoom, mute, and Reduce Motion.

Supporting evidence:

- Moss visibly faces and tracks the held leaf without jitter;
- release direction and leaf motion agree;
- Moss turns before committing and never performs a backward catch;
- each stage reaches a meaningfully different height and physical idea;
- the camera keeps both Moss and the leaf visible during commitment;
- Focus removes the toy immediately and settles normally;
- no interaction creates pressure, points, collection, or maintenance;
- after recovery, the meadow becomes quiet again.

Disconfirming evidence includes a leaf that is too hard to grab, backward or
oscillating pursuit, the Pet sliding under a fixed animation, the toy obscuring
healthy-action controls, or repeated play making the world feel busy.

## Observed prototype evidence

Local browser QA exercised real pointer input against the rendered phone frame.
The leaf grabbed from the shelter tree, followed a continuous drag, preserved a
rightward/upward throw, landed once, and returned after one catch. Baby tracked,
approached, and caught the landed leaf. Young progressed through `leaf-track`,
`leaf-pounce`, and `leaf-catch`; Guardian progressed through `leaf-aerial` and
`leaf-catch`. In all three observations, facing agreed with the committed travel
direction and no backward catch appeared. This is desktop browser evidence for
the portable engine and phone composition, not yet an iPhone touch evaluation.

## Spec refinement

Pure plaything physics and stage-response selection require tests first. Pointer
handling and Canvas drawing may be implementation-led. The first release uses
one deterministic leaf and one catch per throw; multi-touch play, multiple
toys, collision puzzles, scores, accessories, and persistence are deliberately
deferred. No user-owned decision remains before implementation.

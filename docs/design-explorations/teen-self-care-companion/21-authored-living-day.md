# Pet Engine Study 17 — An Authored Living Day

## Frame and system alignment

> The tiny world should feel inhabited even before the user touches it.

When I open Pet without a task to perform, I want to catch Moss already living
a small, coherent life, so the creature feels worth returning to without
demanding anything from me.

The primary audience remains `audience-aspirational-family-organizers`, with
Maya as the canonical representative and Charlie as the provisional teen
participant. The hero job remains `jtbd-move-the-few-things-that-matter`; this
study most directly serves `jtbd-feel-arc-progress-without-tracking-tools` and
`jtbd-trust-this-app-with-my-life`. It addresses the weak **Keep using system**
step in `job-flow-maya-move-family-life-forward` by making a return emotionally
rewarding without adding administration.

Constraint posture: **Extend the system.** The existing portable world state,
authored clips, weather grammar, stage wildlife, direct manipulation, Focus
ritual, and durable blooms remain authoritative. The extension is a small
renderer-neutral director that decides when one of those systems may form a
scene.

How might we help Charlie feel that Moss has a life worth quietly observing,
while preserving immediate control, shame-free care, privacy, and the calm
spaces that make limited animation beautiful?

## Yes-and decision

This is a bounded refinement of the existing living-world direction, so broad
adjacency expansion is intentionally skipped. The job elevation is from
“Moss reacts when a button is pressed” to “Moss inhabits a place I recognize.”
The frame remains unchanged.

## Alternatives

### More independent timers

Add separate clocks for roaming, sleeping, bloom visits, weather, and wildlife.
This is easy to layer onto the current canvas, but multiple clocks can collide,
cancel one another, or create nonstop activity. It fails the anime-inspired
cadence because nothing directs the whole shot.

### Needs simulation

Give Moss energy, temperature, curiosity, and comfort drives, then let the
highest drive choose behavior. This could create emergent variety, but hidden
needs quickly become meters, maintenance, and implied neglect. It also makes
the Pet's behavior harder to author and explain.

### One scene director

Use a deterministic, portable director that allows one bounded episode at a
time: roam the meadow, revisit a remembered bloom, rest beneath the old tree,
notice stage-appropriate wildlife, or experience weather. Every episode has a
quiet lead-in, an authored action, a readable hold, and a recovery. Direct
touch, Focus, evolution, and new Kwilt consequences preempt it immediately.

## Convergence

Choose **one scene director**. It extends the existing behavior vocabulary
rather than creating needs, meters, controls, or another persistence model.

The smallest elegant version:

- one episode at a time;
- a deterministic sequence with conditional bloom visits;
- stage-scaled roaming distance;
- a finite tree-rest scene;
- existing weather and wildlife invoked through the same schedule;
- long quiet intervals between scenes;
- no new consumer UI;
- inspector-only visibility into the director's current episode;
- Reduce Motion preserves the scene's meaning without travel.

The director does not remember unfinished scenes across visits. Durable blooms
remain the only world memory. It does not infer mood, create needs, reward idle
watching, or make Moss lonely when the capability is closed.

We're betting that authored rhythm—not more simultaneous animation—is what
makes the world feel alive. If the result still feels mechanical, revisit the
episode performances and environmental staging before increasing randomness
or adding more episode types.

## Learning release

The standalone private site remains the release channel. The real code slice
must include a deterministic director, priority/preemption rules, bloom revisit,
stage-scaled roaming, tree rest, shared scheduling for weather and wildlife,
Reduce Motion semantics, and inspector evidence. Timings may remain accelerated
for Andrew's evaluation. Production accounts, sync, notifications, analytics,
and app navigation remain excluded.

The release succeeds when a viewer can leave the controls alone and observe a
quiet but coherent sequence, then tap at any moment and feel that Moss responds
to them rather than finishing a canned demo.

## Evaluation plan

Watch three uninterrupted minutes at phone scale, then interrupt several
episodes with ground taps, high taps, Focus, Play, and a completed To-do.

Supporting evidence:

- scenes never overlap or rapidly chain;
- Moss revisits a real remembered bloom rather than an arbitrary prop;
- baby, young, and guardian roam with visibly different confidence;
- rest ends naturally and never implies hunger, sadness, or neglect;
- touch redirects Moss on the next frame;
- Focus, evolution, progress blooms, weather, and wildlife retain priority;
- the world is interesting to watch without becoming visually busy.

Disconfirming evidence includes repetitive pacing, Moss appearing indecisive,
ambient behavior fighting user input, or viewers reading rest as a need they
must fix.

## Observed prototype evidence

- The local site held a quiet centered composition for five seconds before the
  first scene, then moved baby Moss exactly 44 world pixels with the authored
  walk and returned to quiet.
- After a simulated To-do opened a bloom, the director waited, roamed once,
  then entered `memory-notice` → `seek-memory` → `remember` beside that same
  durable bloom.
- Tree rest placed Moss beneath the authored old-tree canopy and used the curled
  sleep performance without exposing a need, warning, or meter.
- A direct pointer interaction during an ambient scene produced `jump` on the
  next reported runtime frame and returned the director to a fresh quiet state.
- Desktop browser visual QA confirmed the scene composition and inspector
  evidence. The capability itself remains the fixed 390px phone-scale surface;
  a separate narrow-device browser or signed-device pass remains required
  before claiming native mobile proof.

## Spec refinement

The director owns sequencing only. `PetWorldState` continues to own physical
action and portable semantics; authored sprite clips continue to own anatomy.
The first sequence is deterministic so failures can be reproduced. A later
study may introduce seeded variation only if this authored baseline feels
alive. No user-owned decision remains before this prototype slice can be built.

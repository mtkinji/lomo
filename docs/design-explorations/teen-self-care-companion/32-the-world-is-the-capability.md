# Pet Engine Study 28 — The World Is the Capability

## Frame and system alignment

> I should feel like I am immersed in this beautiful, tiny world. I am not
> merely watching it; I can play with the little character who lives there.

Moss now has authored acting, locomotion, direct touch, weather instincts,
wildlife, play, Focus, life echoes, and evolution. The phone composition still
steps out of that world to explain those systems through a conventional card:
a separate app header, a receipt panel, three controls, a growth countdown, and
eight progress marks. The engine increasingly feels like a place while the
capability around it still feels like a prototype dashboard.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie. The hero job is
`jtbd-move-the-few-things-that-matter`; this study serves
`jtbd-carry-intentions-into-action`,
`jtbd-feel-arc-progress-without-tracking-tools`,
`jtbd-help-us-enjoy-being-together`, and
`jtbd-trust-this-app-with-my-life`. It strengthens **Keep using the system
because it feels helpful, not fussy** in
`job-flow-maya-move-family-life-forward` (3/5).

Constraint posture: **Fit the system.** Keep one persistent Pet capability,
the existing 160 × 240 renderer contract, direct manipulation, one daily care
moment, accelerated prototype mornings, and the external engine inspector.
Change only the consumer composition: the world becomes the dominant surface,
while Kwilt actions occupy one calm dock at its edge.

How might we let Charlie step into Moss's little world immediately, while still
making healthy action, care, growth, accessibility, and truthful prototype time
understandable?

## Anchor assessment

When I visit Moss, I want to arrive in a living place and touch what is
happening there, so real progress feels like part of our shared story rather
than another set of controls and counters.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-feel-arc-progress-without-tracking-tools, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
```

## Yes-and decision

Expansion is skipped. This is a bounded composition refinement of the existing
Pet capability, not a new navigation model, game HUD, onboarding system, or
full-screen app mode. The job elevation is experiential: every engine layer
already built becomes easier to feel because conventional product furniture no
longer divides it into separate panels.

## Divergence

Axis of variation: **where does product UI sit relative to the habitat?**

### Make the current card larger

Increase the scene height and retain the header, receipt, action row, and growth
meter beneath it. This is low risk, but the world remains one module inside a
dashboard.

### Put every control over the scene

Float weather, progress, actions, care, camera, and sound directly over the
habitat. This maximizes pixels for scenery but turns the world into a game HUD,
obscures Moss's ground plane, and makes accidental touch ownership likely.

### Let the world own the capability

Start the scene at the capability's top edge. Let the identity/weather bar and
live scene language float lightly in the sky, where they cannot cover Moss or
steal touch. Place the one current Kwilt choice in a calm dock that feels
attached to the world rather than stacked beneath a picture. Replace the
countdown and eight marks with one stage sentence: care is remembered and
nothing is lost. Keep every engine and time control outside in the inspector.

## Convergence

Choose **let the world own the capability**.

The composition becomes:

1. one rounded phone-scale world, without a white header separating it from
   the habitat;
2. Moss, day, weather, and sound in a translucent sky bar;
3. one compact live caption in the upper atmosphere, following the actual
   scene instead of replacing it with receipt copy;
4. the full uninterrupted ground plane for tapping, dragging, jumping,
   rollover, leaf play, and pinch;
5. one calm dock at the world's edge showing only the action available now;
6. one sentence about Moss's current form and the permanence of care;
7. all playback, weather, stage, palette, rig, and time controls remaining in
   the visibly separate inspector.

### Capability delta

Today, the user watches a world and then operates controls beneath it. After
this study, the Pet capability reads as one continuous place with a single
contextual edge, and the person's attention can stay on Moss while choosing a
real Kwilt action. This release still does not hide the Labs framing, connect
production Kwilt data, add a joystick, create a tutorial overlay, expose a
need, or turn evolution into a visible score.

### Reductive decisions

- Remove the consumer-facing eight-mark progress meter and exact threshold
  countdown; keep truthful thresholds in engine state and the inspector.
- Collapse header, weather, and live scene language into the world rather than
  adding a full-screen mode.
- Keep one action dock instead of floating three persistent game buttons over
  the meadow.
- No HUD, inventory, need bars, forecast, level, tutorial furniture, or camera
  control.
- Do not alter Moss's renderer, world coordinates, behavior priority, or
  persistence contract for this composition study.

We're betting that **one continuous world plus one quiet Kwilt edge** will make
the same engine feel playable and cinematic instead of technically impressive
but presented as a demo. If it still feels like an app card, the next revision
should make care itself a direct in-world object before adding more scenery or
animation.

## Learning release and evaluation

The private site remains the release channel. At 390 × 844, arrive at the top
of the page and verify that the complete Pet capability fits as one dominant
world; Moss and the ground remain unobscured; the sky bar and live caption stay
legible across sun, wind, and rain; direct touch, leaf drag, pinch, and rollover
still own their gestures; each daily action phase exposes exactly one dock
state; evolution remains understandable without a counter; and the inspector
still begins clearly outside the consumer experience.

Disconfirming evidence is a caption covering Moss, controls intercepting meadow
touch, a dock that reads like a dashboard, loss of stage comprehension, a
consumer-facing engine control, or a phone composition that requires scrolling
to understand the current moment.

## Spec refinement

This study needs no new persisted state. Markup should create one explicit
`world-dock` containing the existing mutually exclusive daily-phase branch and
one nonnumeric stage sentence. The capability header and live message become
pointer-transparent overlays except for the sound control. The scene retains
its exact aspect ratio and renderer input contract. Tests should assert the
Study 28 language, the world-first wrapper, the absence of the eight-care meter,
and the continued presence of all three meaningful-action paths. Phone visual
QA must cover both initial choice and care-ready states.

# Pet Engine Study 29 — Touch What Changed

## Frame and system alignment

> I am not merely watching the tiny world. I am playing with the character
> inside it, and the things I do in Kwilt should become progress in that life.

Study 28 lets the meadow own the Pet capability, but one important handoff
still exits the world. A To-do, Focus session, or shared Play moment creates a
distinct living trace; Moss notices it; then the user is asked to press a
generic **Give today’s care** button in the dock. The world shows the cause,
but product chrome owns the meaningful touch.

The target remains `audience-aspirational-family-organizers`, represented by
Maya and pressure-tested through Charlie. The hero job is
`jtbd-move-the-few-things-that-matter`; this study serves
`jtbd-carry-intentions-into-action`,
`jtbd-feel-arc-progress-without-tracking-tools`, and
`jtbd-trust-this-app-with-my-life`. It strengthens **Keep using the system
because it feels helpful, not fussy** in
`job-flow-maya-move-family-life-forward` (3/5).

Restated in user voice: when one real thing changes Moss’s meadow, I want to
touch that exact change and complete the care moment there, so my progress
feels like part of a shared living story rather than a reward button.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit the system.** Keep one daily care opportunity, the
same privacy-safe source classes, the same accelerated prototype days, and the
same renderer/world contracts. Extend direct manipulation with one bounded
life-echo hit target; do not create inventory, harvesting, a resource economy,
or a second care mechanic.

How might we let Charlie complete the action-to-care loop by touching the
world itself, while preserving calm pacing, accessibility, and the truth that
nothing can be lost?

## Divergence

Axis of variation: **where does the final care touch belong?**

### Keep the dock button

Rename or restyle **Give today’s care**. This is clearest, but the causal chain
still ends outside the place that changed.

### Tap Moss

After the vignette, tapping Moss gives care. This is easy to discover but
disconnects care from the To-do bloom, Focus stilllight, or paired Play
seedheads, and overloads a tap that already means greeting.

### Touch the exact life echo

After Moss finishes noticing the new trace, that one trace gains a quiet pulse.
The dock becomes a short invitation rather than a button. Touching the bloom,
stilllight, or seedheads completes today’s care and lets Moss answer from beside
the thing the user helped create.

## Convergence

Choose **touch the exact life echo**.

The sequence becomes:

1. complete a To-do, Focus with Moss, or Play together;
2. watch its distinct trace enter the meadow and receive one protected answer;
3. let that exact trace become gently touchable only when the answer is ready;
4. show **Touch what changed** at the world’s edge, without adding another
   persistent control;
5. touch the trace to give today’s care;
6. keep ordinary taps, hand guidance, leaf play, pinch, and rollover unchanged
   everywhere else;
7. retain a keyboard-accessible action in the invitation for people who cannot
   reliably target the canvas.

### Reductive decisions

- Replace the generic care button; do not add a fourth action.
- Highlight only the newest pending source-class trace, never every memory.
- No reward claim, harvest gesture, food currency, score, inventory, or need
  meter.
- Do not put private To-do text, Focus duration, or another person’s identity
  in the world.
- The target is available only during the existing care-ready phase and is
  consumed by the existing one-daily-care transition.
- Keep the dock as accessible language and fallback, but make the meadow the
  primary path.

We’re betting that **touching the thing real life changed** will make care feel
like play inside a living anime world rather than a product transaction. If
people miss the target, adjust the visual invitation and hit area before
restoring a generic primary button.

## Learning release and evaluation

The private site remains the release channel. At 390 × 844, reset the
prototype and complete each source path. Verify that the protected vignette
finishes first; only the newest matching trace pulses; a direct tap on it gives
care exactly once; nearby taps still move or greet Moss; the invitation remains
keyboard accessible; the next-morning state appears normally; and evolution
still uses the same care thresholds and ceremony.

Disconfirming evidence is a target that is too small, an old memory receiving
care, care firing during the vignette, ordinary world touch becoming unreliable,
two care transitions from one gesture, private content entering the renderer,
or an invitation that reads like collecting loot.

## Spec refinement

Add a pure world-space hit resolver that accepts the pending source class and
returns only the newest matching life echo inside a forgiving bounded hit area.
Test newest-match preference, miss behavior, and source isolation before
connecting it to pointer handling. The canvas receives the pending source only
during `care-ready`, draws one subtle source-shaped invitation, and reports a
successful life-echo touch to the existing `care()` transition. The dock uses
one semantic button as an accessible fallback but visually reads as an
instruction attached to the world rather than a separate reward control.

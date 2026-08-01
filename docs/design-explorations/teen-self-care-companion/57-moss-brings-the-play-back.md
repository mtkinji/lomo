# Pet Engine Study 57 — Moss Brings the Play Back

## Frame and system alignment

> The current wind-leaf game ends exactly where a relationship should begin:
> Moss catches the leaf, performs one pleased pose, and the toy resets itself.

Charlie remains a provisional teen participant because Kwilt's canonical
persona taxonomy does not yet include a teen audience. The closest established
demand is Sarah's `Notice non-metric progress` step, currently scored 3/5: a
grown Moss should feel more capable through behavior, not through a level label
or progress meter.

Restated in user voice: **When Moss catches something I tossed, I want the play
to come back to me, so that it feels like we are responding to one another
rather than completing an animation.**

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit and extend the existing wind-leaf engine.** Reuse the
golden leaf, world-space touch, immutable throw physics, authored catch clips,
stage locomotion, camera director, and quiet no-input recovery. Add no new toy,
currency, fetch count, tutorial, reward, need state, dialogue, or bespoke sprite
sheet.

**Design challenge:** How might Charlie and Moss complete one reciprocal play
sentence, while preserving animal-like agency, visible maturity, direct touch,
and the world's ability to become quiet?

## Yes-and decision

This is a bounded relationship refinement, so broader expansion is
intentionally skipped. The job elevation is from “Moss reacts to my toy” to
“Moss brings the shared play back to me.” Keep the existing Pet capability and
one-toy system.

## Divergence

### Make the leaf reset more beautifully

The caught leaf could dissolve into the canopy through a prettier effect. This
improves polish but preserves the one-way interaction.

### Let Moss begin an endless fetch loop

Moss could return the leaf after every throw. This would be immediately legible
as play, but it would also create an extractive retention loop and make a quiet
ending feel like abandoning an invitation.

### Offer exactly one return

The first direct throw remembers where the person's hand released it. After the
catch, Moss carries the leaf back to that x-coordinate and offers it on the
ground. The person can touch it for one second throw or do nothing. The second
catch always resolves to quiet.

All three remain outside Arc, Goal, Activity, and Chapter state and do not block
capture. The finite return most directly changes the relationship while passing
the no-streak, no-pressure, no-anthropomorphic-AI, and calm-attention checks.

## Convergence

Choose **offer exactly one return**.

The complete action sentence is:

1. the person grabs and releases the golden leaf;
2. the throw samples weather and commits one catch target;
3. Moss turns, pursues, and catches with the form's earned reach;
4. Moss holds the catch long enough for contact to read;
5. Baby toddles the leaf back low, Young trots it back at chest height, and
   Guardian returns it on a low forward glide;
6. the leaf remains attached to Moss's forward body edge throughout travel;
7. Moss places it on the terrain where the person's hand released it;
8. the dock says `Your turn again` and names touch as optional;
9. a touch releases one second throw; no touch returns the leaf quietly;
10. the second catch always ends the exchange.

The smallest elegant version uses existing clips and one overlaid leaf rather
than generating carrying art. The engine, not Canvas, owns throw count, return
coordinate, carried attachment, offer timing, and the one-return limit. Focus
retains authority and clears the complete exchange.

We're betting that **one visible return to the person's prior hand position**
will make Moss feel reciprocal rather than reactive. If the leaf looks pasted
onto the sprite or the return does not read as “for me,” we should refine
attachment coordinates and offer acting before adding another interaction.

## Learning release

The private mobile-first site remains the release channel. The real build slice
contains carried and offered leaf phases, a stage-shaped return gait, one
generous offered-leaf hit target, a finite no-input recovery, updated contextual
copy, and renderer ordering that places the carried leaf against Moss rather
than behind the body.

The prototype intentionally does not add new generated art. That tests whether
the animation system can compose believable object attachment from approved
character clips and engine-owned coordinates. It also does not persist a fetch
state, count returns, create care credit, or allow a third throw.

## Evaluation

At phone scale:

1. throw left and right from visibly different release points in every stage;
2. confirm Moss catches, fully turns, and returns toward the original hand side;
3. inspect leaf attachment through every return frame;
4. accept the offer and confirm the second catch becomes quiet;
5. ignore the offer and confirm the same quiet outcome after one calm beat;
6. repeat with close zoom, rain, Reduce Motion, and Focus interruption.

Supporting evidence is that the return direction agrees with the original
release point, the leaf stays visibly carried, each life stage has a distinct
physical idea, the offered leaf is easy to touch, and the exchange never feels
like an obligation. Disconfirming evidence is moonwalking, a floating or
detached leaf, an offer framed like a call to action, a third throw, a camera
that loses either Moss or the destination, or any stranded state.

## Spec refinement

Pure throw-count, return-target, attachment, offer, timeout, Reduce Motion, and
one-return rules are test-first. Renderer layering and contextual copy are
implementation-led and require visual proof. The current character art is
sufficient for the first learning release; bespoke carrying frames are deferred
until observation proves composition cannot carry the idea.

## Observed prototype evidence

Local browser QA used real pointer input against the rendered phone world. A
direct Young throw recorded `1 throw` plus the actual release coordinate,
progressed through catch and `leaf-return`, kept the golden leaf on the body's
forward side during the run, and held a finite `Your turn again` offer. The
offer retained one generous world-space touch target and reset quietly when
ignored. Guardian progressed through the same engine states with its aerial
return vocabulary and a higher attachment point.

The first Guardian pass also exposed a real framing defect: reaction zoom could
place the landed leaf's grab target just outside the viewport when Moss and the
leaf occupied the widest span. Leaf invitation and tracking now use the
action-wide shot, keeping the complete direct-play line visible. This is local
desktop-browser evidence of the phone composition and portable engine, not yet
physical iPhone touch proof.

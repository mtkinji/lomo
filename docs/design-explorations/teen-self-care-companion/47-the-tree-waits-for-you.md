# Pet Engine Study 43 — The Tree Waits for You

## Frame and system alignment

Study 42 made the old tree real world geography. It also exposed the next
boundary: Moss reaches a beautiful perch, but the engine chooses the return
after a fixed hold. The person witnesses a directed vignette rather than
playing from inside it.

The target remains the provisional teen participant Charlie within
`audience-aspirational-family-organizers`. This study serves
`jtbd-feel-arc-progress-without-tracking-tools` by making maturity feel like
new agency inside a familiar place, and `jtbd-trust-this-app-with-my-life` by
keeping the interaction calm, finite, and free of score or failure.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

**Design challenge:** How might Charlie control one consequential moment from
inside the authored tree scene without turning Moss into a joystick puppet or
leaving the creature stranded when the person stops interacting?

## Divergence

### Add directional controls

Expose left, right, jump, and down buttons while perched. This gives explicit
control but overlays a platformer HUD on the meadow and asks the person to
operate Moss rather than play with Moss.

### Let every branch become a platform

Build general collision geometry and free canopy locomotion. This may be a
future engine layer, but it is too large to learn whether one authored choice
meaningfully changes the relationship.

### Let the person choose the landing

Moss holds the branch and surveys the meadow. A tap on the terrain becomes the
landing invitation. Young can reach a modest area around the tree; Guardian
can choose a much wider landing. Moss turns toward that place, performs one
committed return, lands, and releases control back to the living world. If the
person does nothing, Moss returns safely after a generous quiet hold.

## Convergence

Choose **let the person choose the landing**.

The authored sentence is:

1. touch the old tree and watch Moss earn the perch;
2. Moss settles, looks out, and waits instead of immediately leaving;
3. touch the meadow to choose a reachable landing;
4. Young bounds a short distance while Guardian crosses a wider span;
5. the engine locks facing, destination, camera, and one landing arc;
6. no input triggers a calm default return rather than an unfinished need;
7. Focus, evening, rain shelter, care echoes, and Reduce Motion retain their
   stronger authority.

We're betting that **authorship over the return** will make the scene feel like
play without weakening its anime direction. The person controls intent and
timing; the authored character controls acting.

## Learning release and evaluation

The private site remains the release boundary. At phone scale:

1. perch Young and tap near versus far terrain; verify both requests resolve
   inside Young's modest reach and use the correct facing;
2. perch Guardian and make the same requests; verify the world grants a wider
   landing range;
3. verify Moss remains planted on the branch while waiting and no ground shadow
   appears below;
4. verify one tap creates one immutable destination with no midair reversal;
5. verify no input eventually produces a safe default return;
6. verify keyboard left and right select honest landing directions;
7. verify Focus, rain shelter, and Reduce Motion remain stronger than the
   optional branch choice.

Disconfirming evidence is a teleport, indefinite trapping, a landing outside
the world, a second tap reversing an airborne Moss, a branch shadow on the
terrain, or controls that feel like a platformer overlay.

## Spec refinement

Pure world state owns the stage-specific landing reach, selected destination,
waiting timeout, facing, return arc, and immutable commitment. Canvas translates
touch or keyboard intent into that contract and renders existing authored
frames. No new art, HUD, score, currency, persistence, production data, or
general collision engine is introduced.

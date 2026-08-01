# Pet Engine Study 42 — The Old Tree Is Playable

## Frame and system alignment

> I should feel immersed in a beautiful tiny world, but I should also feel as
> though I am playing with the creature inside it.

The meadow now contains weather, direct touch, locomotion, wildlife, Focus,
life echoes, and a stage-shaped chase ladder. Yet its most important landmark
is still mostly scenery. The old tree shelters Moss from rain and anchors Focus,
but a person cannot discover anything by touching it. That makes the world
look authored while still behaving like one flat movement lane.

The target remains the provisional teen participant Charlie within
`audience-aspirational-family-organizers`. This study serves
`jtbd-feel-arc-progress-without-tracking-tools`: growth should be felt as new
possibility, not explained as a level or percentage. It also supports
`jtbd-trust-this-app-with-my-life` by keeping play self-contained, calm, and
free from a reward economy.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Extend the existing world engine.** Keep touch primary,
reuse the authored tree and stage animation vocabulary, and add one portable
habitat-affordance contract. Do not add a platformer HUD, ability labels,
collectibles, failure states, or another control panel to the capability.

**Design challenge:** How might we let Charlie discover that the familiar
meadow opens differently as Moss matures, while preserving the quiet anime
world, grounded motion, and direct-manipulation grammar?

## Divergence

### Explain the new abilities

Add stage copy such as “Guardian can reach high places.” This would make the
growth ladder legible but would leave the habitat inert and turn a felt change
into interface explanation.

### Add a separate obstacle course

Open a minigame with platforms and explicit controls. It would prove traversal,
but split Moss into a second game, discard the authored meadow, and create a
much larger physics and content commitment.

### Make the old tree respond to touch

Treat the tree as one world-space affordance. Moss first notices it, then uses
the physical vocabulary their form has earned: Baby pads to the roots and
leans in, Young springs to a low bough, and Guardian vaults to a high perch,
surveys the meadow, and returns to the terrain. The camera follows the
relationship between Moss and the landmark rather than opening UI.

## Convergence

Choose **make the old tree respond to touch**.

The authored sentence is:

1. the person roams far enough to find the old tree;
2. a tap inside its silhouette makes Moss look before moving;
3. Baby stays rooted, Young occupies the lower canopy, and Guardian reaches the
   highest stable bough;
4. Moss holds long enough for the new place to read;
5. the mature forms return through a committed landing and recover on the
   terrain;
6. ordinary touch, Focus, evening, and shelter remain stronger than decorative
   tree play.

The tree is not a general collision platform yet. It is one bounded portable
interaction with explicit world anchors, stage-shaped height, contact, camera,
and Reduce Motion behavior. That is enough to learn whether a landmark that
answers touch makes the habitat feel like a playable place rather than a
painted backdrop.

We're betting that **one familiar landmark opening vertically as Moss grows**
will make evolution feel like physical possibility and make side-scrolling
exploration worth doing. If the tree still reads as a scripted cutscene, the
next revision should make the hold or return user-directed before adding more
landmarks.

## Learning release and evaluation

The private site remains the release channel. Add a deterministic **Play at
the old tree** inspector command for QA, but leave the consumer interaction as
a direct tap on the authored tree.

At phone scale:

1. move left until the complete tree enters the shot;
2. tap its roots as Baby and verify an entirely grounded approach and lean;
3. repeat as Young and verify a readable coil, low-bough contact, hold, and
   terrain landing;
4. repeat as Guardian and verify the highest vault, stable perch, meadow survey,
   and committed descent;
5. verify branch contact never uses a ground shadow and landings never float;
6. verify Focus and rain shelter still own the tree when active;
7. verify Reduce Motion preserves recognition at the roots without vertical
   travel.

Disconfirming evidence is a teleport, a floating planted frame, Moss appearing
behind the wrong tree layer, a generic jump that misses the bough, a tap target
that steals care-echo or puddle interaction, or a tree sequence that traps
ordinary play.

## Spec refinement

Pure world logic owns the tree hit target, committed stage, anchors, phase
timing, interpolation, contact height, interruption, and Reduce Motion path, so
those contracts receive tests first. Canvas may draw the existing sprite above
the authored tree and relocate the ground cue to the branch only during the
stable perch. No new art, persistence, currency, progression threshold,
analytics, or production Kwilt integration is introduced. No user-owned
decision remains before this prototype study.

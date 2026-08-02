# Pet Engine Study 36 — The World Breathes in Layers

## Frame and system alignment

> The world should feel alive around Moss, not like a finished character moving
> across a painted backdrop.

The authored meadow now has strong illustration, causal weather, direct play,
and believable character and visitor acting. One remaining motion shortcut
breaks that illusion: the shelter tree rotates as one bitmap around its roots.
Its roots, trunk, canopy, and vines all move at the same instant and by the same
amount. Real weight works in layers. Roots hold, grass answers a gust quickly,
branches gather force, the canopy follows through, and hanging vines arrive
last. Rain makes the same materials heavier; sunlight barely moves them but
reveals a slow dappled breath.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-help-us-enjoy-being-together`
- **Active JTBDs:** `jtbd-feel-arc-progress-without-tracking-tools` and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Notice an opportunity to play together** remains 2/5.
- **Constraint posture:** Add portable environmental acting without adding weather powers, habitat inventory, a needs system, or another renderer.

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

How might the authored habitat carry weight and follow-through with the same
limited-animation discipline as Moss, while keeping the world calm, portable,
and directly playable?

## Yes-and decision

Broader expansion is skipped because this is a bounded fidelity refinement.
It does not introduce gardening, weather control, resource collection, or a new
family activity. The job elevation is subtler and more important: spontaneous
play becomes trustworthy when the place itself obeys recognizable material
rules.

## Divergence

### Keep rotating the complete tree

Reducing the angle would make the defect quieter, but the trunk and canopy would
still behave like one card. It preserves motion without proving physicality.

### Generate separate weather frame strips

New tree strips could be beautiful in this renderer, but they would duplicate
timing inside images and make palette, season, and renderer variants expensive.
The system would know only which picture to show, not what each material is
doing.

### Add a portable habitat-performance rig

Keep the approved authored tree planted as the stable mass. Resolve a small,
renderer-neutral performance snapshot for grass lead, canopy lead and follow,
vine lag, sun dapple, rain drip, and loose-leaf accents. Canvas can draw those
flexible layers over the illustration now; native, web, and desktop renderers
can later express the same material timing in their own way.

## Convergence

Choose the **portable habitat-performance rig**.

The shared rule is:

1. the trunk and roots never rotate or leave their terrain anchor;
2. foreground grass responds before the canopy so a gust visibly travels
   through the scene;
3. canopy clusters use authored holds, a brief accent, and asymmetric recovery;
4. trailing vines lag behind the canopy and settle after it;
5. breeze produces the largest lateral movement, rain limits lateral reach and
   adds downward weight and drips, and sun favors slow dapple over sway;
6. Reduce Motion resolves one stable material pose with no time-varying output;
7. existing weather state remains the only behavior authority—the habitat rig
   decorates it and never creates new weather, persistence, or rewards.

### Capability delta

Today, changing weather moves several decorations but the most important tree
tilts as a rigid whole. After this study, its roots remain visually load-bearing
while flexible parts answer in a readable sequence. Moss can still travel,
focus, chase, play, evolve, and respond to meaningful Kwilt actions through the
same world state.

### Reductive decisions

- No weather powers, forecast UI, garden management, inventory, or resources.
- No tree collision or general-purpose physics engine.
- No second animation clock in Canvas; the resolver consumes existing elapsed
  weather time.
- No full-tree deformation or image masking that could blur the approved pixel
  artwork.
- No perpetual confetti. Loose leaves and drips are restrained material accents.

We're betting that one planted mass plus a few delayed flexible layers will do
more for immersion than adding more background detail. If overlays read as
floating particles instead of parts of the tree, reduce their count and range
while preserving the timing contract.

## Learning release and evaluation

At 390 × 844, compare sun, breeze, and rain while Moss is still and while Moss
moves across the meadow. Confirm that the root and trunk stay planted; grass
visibly receives wind first; canopy motion remains attached to the existing
silhouette; vines arrive later; rain feels heavier rather than merely darker;
and sun dapple does not flash like a notification. Under Reduce Motion, compare
early and late frames and confirm the habitat is identical.

Supporting evidence is that a viewer describes wind moving *through* the meadow.
Disconfirming evidence is a rocking tree card, floating leaf clusters, grass
sliding off terrain, equal-duration oscillation, noisy perpetual particles, or
weather acting that competes with Moss.

## Spec refinement

The pure habitat resolver is test-first. Tests must prove a planted trunk,
nonlinear timing, grass lead, vine lag, distinct warm/wind/wet material response,
and a stable Reduce Motion key. Phone visual QA remains required because tests
cannot prove attachment, restraint, depth, or fidelity beside the authored art.


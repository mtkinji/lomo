# Pet Engine Study 35 — Everything Alive Has Acting

## Frame and system alignment

> I should feel immersed in a beautiful tiny world, not like one finished
> character has been placed beside a few animated symbols.

Moss now owns high-fidelity authored acting, stage-specific locomotion,
attention, acrobatics, weather behavior, direct touch, and evolution. The
wildlife that motivates those performances does not meet the same bar. The
ground crawler is a two-step block, the firefly is a blinking dot with two wing
positions, and the sky moth is a mirrored geometric flap. Their paths are
causal, but their bodies do not yet communicate weight, species, curiosity, or
escape.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as the teen participant
- **Hero JTBD:** `jtbd-help-us-enjoy-being-together`
- **Active JTBDs:** `jtbd-feel-arc-progress-without-tracking-tools` and `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** **Notice an opportunity to play together** remains 2/5, while continued use in Maya's family-life flow remains 3/5.
- **Constraint posture:** Extend the portable animation system without adding a renderer, collectible inventory, score, wildlife need, or user control.

Restated in user voice: when another little creature enters Moss's world, I
want to recognize how it moves and what caught Moss's attention, so the chase
feels like two living creatures meeting rather than a character reacting to a
marker.

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

How might we make the crawler, firefly, and sky moth feel authored enough to
belong beside Moss, while preserving the small pixel-world scale and one shared
portable engine?

## Yes-and decision

Broader expansion is skipped. This is not a bestiary, collection system,
habitat economy, quest layer, or new family game. The job elevation is that
spontaneous play becomes believable because the whole relationship on screen
has acting, not only Moss.

## Divergence

### Add more rectangles to the current drawings

Increase each silhouette and add two more age-based poses directly in Canvas.
This is fast, but timing, anatomy, and reduced-motion meaning remain implicit in
one renderer. It would improve illustration without proving an engine.

### Generate three sprite strips

Create four- or six-frame transparent atlases for the visitors and play them by
age. This can reach the strongest single-renderer artwork quickly, but it risks
inconsistent cells and returns to image sequencing without a semantic acting
contract.

### Give wildlife portable micro-rigs

Define a pure visitor-performance snapshot for body compression, wing phase,
leg phase, antenna response, glow, bank, and escape energy. Author nonlinear
limited-animation timing for each species. Canvas consumes that snapshot to
draw richer pixel creatures now; later native, web, or desktop adapters can
consume the same performance without copying behavioral timing.

## Convergence

Choose **portable micro-rigs**.

The shared rule is:

1. every visitor has a recognizable resting silhouette and at least four
   deliberately timed drawings;
2. the crawler skitters with alternating planted legs, a leaf-shell weight
   shift, antenna curiosity, and a short dirt kick when escaping;
3. the firefly separates rapid translucent wing beats from a slower warm glow
   breath, so it hovers rather than flickers as one object;
4. the sky moth owns a held upstroke, a decisive downstroke, a leaf-patterned
   body, long antennae, and a visible bank when it evades the Guardian;
5. visitor acting derives from existing age, engagement, direction, weather,
   and Reduce Motion state—no new persistence or behavior authority;
6. weather lightly affects material: warm glow in sun, lateral wing effort in
   breeze, and heavier lower flight in rain, without changing pursuit truth;
7. the existing attention, latest-side commitment, camera, sound, and stage
   ladder remain authoritative.

### Capability delta

Today, Moss notices and chases targets whose movement is correct but whose art
reads as a marker. After this study, Baby meets a grounded creature with weight,
Young follows a hovering light with independent glow and wings, and Guardian
banks after a high moth that visibly flies and evades. The release still does
not let the person collect, feed, name, own, harm, or manage wildlife.

### Reductive decisions

- No bestiary, rarity, inventory, reward, capture, species labels, or tutorial.
- No second animation runtime and no visitor image-sequence component.
- No physics rewrite; visitor performance decorates the existing causal path.
- No extra on-screen control. The inspector may expose the resolved pose for QA.
- No realistic insect rendering that competes with Moss; silhouettes remain
  stylized, warm, and readable at game-character scale.

We're betting that secondary creatures with their own limited acting will make
the existing pursuits feel like spontaneous anime-world encounters rather than
triggered animations. If the visitors become visually noisy or distract from
Moss, keep the performance contract but reduce scale, contrast, and continuous
motion rather than returning to two-state symbols.

## Learning release and evaluation

The private standalone site remains the release channel. At 390 × 844, inspect
each visitor during approach, attention, commitment, and escape in sun, breeze,
rain, and Reduce Motion. Confirm that its species is readable without text;
that motion contains holds and accents rather than equal-duration cycling; that
the crawler stays grounded; that the firefly's glow does not flash like a
notification; that the moth's bank agrees with its travel side; and that all
three remain subordinate to Moss in scale and contrast.

Supporting evidence is that the viewer watches the visitor as part of the
encounter and can describe how it moved. Disconfirming evidence is a bug icon,
arcade pickup, UI marker, distracting perpetual flutter, backward bank, floating
crawler, or artwork that looks more detailed than Moss.

## Spec refinement

Pure visitor timing and performance resolution require tests first. The
performance snapshot must be deterministic from existing world inputs and
must expose a stable reduced-motion key. Canvas may implement the pixel drawing
directly, but it cannot invent timing, bank direction, glow cadence, or escape
energy. Phone visual QA is required because unit tests cannot prove silhouette,
relative contrast, or fidelity beside Moss. No user-owned decision remains for
this prototype study.

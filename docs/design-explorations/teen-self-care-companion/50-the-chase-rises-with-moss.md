# Pet Engine Study 46 — The Chase Rises With Moss

## Frame and system alignment

> When the pet chases a flying insect, it should turn to face it and then
> realistically pounce. As it matures, it should jump higher and in more
> interesting acrobatic ways.

When something alive crosses the meadow, Charlie wants Moss to notice it,
choose an action line, and move with believable physical intention. Maturity
should be felt through which layer of the world Moss can reach, not announced
through a level badge.

The provisional teen participant Charlie remains within
`audience-aspirational-family-organizers`. This serves the underserved
non-metric progress step in `job-flow-sarah-see-who-im-becoming`, currently
scored 3, while preserving the calm, trustworthy world behavior required for a
companion a teen might revisit.

```yaml
serves: [jtbd-feel-arc-progress-without-tracking-tools, jtbd-trust-this-app-with-my-life]
```

Constraint posture: **Fit and refine the portable world engine.** Keep one
visitor system, one renderer, one stage manifest boundary, and the authored
limited-animation vocabulary. Repair commitment at the state and camera layer;
do not hide it with particles, speed, or a new clip player.

**Design challenge:** How might each form reveal a newly reachable layer of the
meadow while every chase reads as one intentional, physically coherent action?

## Yes-and check

Expansion is intentionally skipped. The larger possibility is an ecosystem
whose inhabitants reveal Moss's changing relationship to the world. The useful
proof remains one three-rung ladder, not a bestiary, quest system, capture
mechanic, or wildlife collection.

## Divergence

### Scale one jump

Use the same insect and pounce for every form, increasing height and distance.
This is cheap but makes maturity feel numerical and turns the Guardian into a
larger Young.

### Give every form a bespoke encounter engine

Build separate crawler, bug, and bird episodes with independent state machines.
This maximizes authored control but multiplies behavior bugs and weakens the
portable engine boundary.

### Raise the reachable world through one chase grammar

Baby follows a moss crawler without leaving the terrain. Young tracks a low
firefly and springs through a compact pounce. Guardian reads a high sky moth,
coils, launches, banks, reaches at the apex, lands with weight, and recovers.
All three use the same acquire, turn, commit, travel, contact, recover grammar.

## Convergence

Choose **raise the reachable world through one chase grammar**.

The chase contract is:

1. the stage selects its habitat layer and visitor;
2. eyes, ears, and head acquire the visitor before the body travels;
3. Moss plants and turns toward the visitor's latest visible side;
4. that moment locks facing, intercept, visitor escape direction, and camera
   action line;
5. the visitor may continue acting, but cannot drag the committed target;
6. Baby stalks, Young pounces, and Guardian performs the authored aerial bank;
7. horizontal travel always agrees with the facing line;
8. authored foot contact and world lift return to the terrain together;
9. the scene recovers once and returns to quiet.

We're betting that **reachable world layers** make evolution legible without
levels: ground curiosity becomes a spring, then a controlled aerial performance.
If the forms still read as the same action at three sizes, revisit silhouette
and timing before adding more visitors.

## Capability delta and reductive decisions

The existing engine already contains the stage ladder and Guardian aerial art.
The missing trust contract is immutable commitment: before this refinement, the
camera kept following the insect during Moss's planted turn and the intercept
was recalculated at takeoff, which could read as a backward launch. Afterward,
the visible turn truly owns one target and one action line through landing.

No capture, combat, reward, prompt, visitor inventory, rarity, or stage-specific
engine is added. “Invite visitor” remains the deterministic inspector control.

## Learning release and evaluation

The private phone-sized site remains the learning channel. Invite wildlife from
both sides as Baby, Young, and Guardian. Confirm the acquisition beat is visible,
the planted body does not slide as the camera frames the target, the sprite faces
the direction of travel before translation, and no target crossing can reverse
the committed launch. Verify Baby stays planted, Young occupies the low air
layer, Guardian reaches the moth with a visibly longer, higher bank, and every
form lands on the terrain.

Disconfirming evidence is an instant mirror with no readable turn, screen-space
moonwalking, a moving target dragging the camera during the coil, Guardian
looking like an enlarged Young pounce, wildlife appearing at the wrong stage,
or recovery translating after foot contact.

## Spec refinement

Pure world logic locks `targetX` when `visitor-turn` begins and reuses it at
takeoff. Camera composition uses that committed intercept while the visitor is
engaged, rather than following the visitor's live coordinate. A regression must
fail on planted screen drift and target recomputation before implementation.
Existing stage and motion tests remain the acceptance proof for crawler,
firefly, sky moth, grounded stalk, low pounce, high aerial arc, and Reduce
Motion behavior.

## Later live-play finding

A phone-sized Guardian replay found one remaining contradiction after the world
trajectory was fixed: the aerial atlas's landing recovery drawing turned the
anatomical action line against the committed direction. The engine was moving
correctly, but that single image made the end of some chases read as a backward
jump.

The manifest now composes Guardian's consistent pounce recovery drawing into
the aerial clip's landing event, then returns to the aerial settle. This keeps
head, torso, travel, and contact aligned in both mirror directions without a new
atlas or a special-case renderer. A manifest regression pins the exact cells so
future art assembly cannot silently restore the backward-facing landing.

# Stage Wildlife Ladder

## Frame

The current visitor is one low firefly for every Leafling form. It can cross the
Pet during acquisition, leaving the engine aimed at an obsolete point and
causing an immediate opposite-facing attempt. Even when direction is correct,
the same visitor and response make evolution feel like a size change rather
than a growing physical capability.

In user voice: when my creature grows, I want to notice that it can perceive
and attempt things it could not do before, so its maturity feels powerful and
alive rather than cosmetic.

This continues to serve `jtbd-carry-intentions-into-action`,
`jtbd-see-who-im-becoming`, and `jtbd-trust-this-app-with-my-life`. The world is
an emotional receipt for real Kwilt follow-through, not a collectible hunt,
score, or task economy.

Constraint posture: **extend the existing portable world engine**. Pet stage
selects a transient visitor and response vocabulary. It does not add inventory,
rarity, capture, combat, rewards, meters, or another progress model.

## Alternatives

### Scale one firefly

Keep one visitor and raise its path with each stage. This is inexpensive, but
the world still feels mechanically identical and the stages do not gain a new
kind of attention.

### Stage-specific wildlife ladder

Baby notices a small crawler at paw height, young Leafling chases a firefly at
body height, and Guardian reads a large sky moth much higher in the canopy.
Each visitor has its own path and one stage-appropriate response. Baby and young
reuse their authored pounce vocabulary; Guardian gains a dedicated aerial row
so evolution is legible through what the creature can perceive and physically
attempt.

### Timing game

Let the user tap at the moment of interception for larger aerial moves. This
could be playful later, but it adds success/failure pressure and risks turning
the habitat into a skill game before ordinary touch and autonomous life feel
believable.

## Convergence

Choose the **stage-specific wildlife ladder**.

- Baby: a moss crawler crosses the foreground. Leafling lowers, scoots, and
  makes one compact ground pounce.
- Young: a firefly bobs through the meadow. Leafling predicts its short flight
  and makes one elastic pounce.
- Guardian: a broad sky moth rides the upper air. Leafling reads the path,
  coils, launches, banks with its tail, opens into a held directional reach,
  and lands with weight.

The visitor is never caught, collected, harmed, or converted into value. It
evades after one encounter and leaves the scene. The next encounter arrives
later, preserving surprise and preventing oscillating left-right pursuit.

## Engine contract

- The portable snapshot names visitor kind, position, direction, altitude,
  engagement state, and elapsed time.
- Stage chooses the visitor kind and therefore the response vocabulary.
- Acquisition predicts one intercept point from visitor direction and speed,
  but never predicts through the Pet's body to the opposite visible side.
- Facing locks to that intercept before the first launch drawing.
- Acquisition, lowering, and coil remain planted; world translation begins on
  the authored launch drawing rather than sliding beneath the anticipation.
- Pounce and aerial-pounce preserve that facing through contact and recovery.
- At commitment the visitor turns outward on the chosen side, preventing it
  from crossing behind the Pet and reversing the visible relationship mid-shot.
- The visitor exits after one response; it cannot provoke a second reverse
  launch.
- Artwork continues to own body height, anticipation, aerial silhouette,
  contact, and recovery. World logic owns only target, facing, and horizontal
  travel.

## Activation and learning

Visitors remain occasional and may also arrive after **Play together**. They
need no tutorial: the person should discover that evolution changed what Moss
notices. The engine inspector can invite the current stage's visitor directly
for rapid family critique.

The bet is that a change in *possible behavior* will make evolution feel more
meaningful than a larger sprite alone. The dedicated Guardian row is the first
proof: the bank is a fast connective drawing, while the directionally clear
reach owns the held apex. Further investment should deepen stage-specific body
vocabulary, not add visitor inventories or reward systems.

## Acceptance evidence

- A visitor crossing the Pet cannot cause a backward or repeated pounce.
- Pet travel begins after anticipation and always agrees with the locked body
  action line.
- The Pet faces the predicted intercept before launch in both directions.
- Baby receives a ground crawler, young receives a firefly, and Guardian
  receives a high sky moth.
- Baby and young use their authored pounce; Guardian uses a dedicated authored
  aerial-acrobatics row with four airborne drawings.
- Every encounter ends once and returns to a calm world.
- Rain shelter, Focus together, direct taps, Reduce Motion, and ordinary travel
  retain priority over wildlife.

## Timing correction evidence

The initial world implementation moved `petX` from the first acquisition
drawing, even though the authored pounce and aerial rows begin with planted
notice, lowering, and coil drawings. That mismatch—not the atlas mirroring—was
the remaining source of backward-looking or sliding jumps.

The corrected runtime locks one intercept and facing at commitment, records the
launch position, keeps horizontal position fixed through anticipation, and
interpolates travel only across the authored launch-to-contact window. Browser
QA at a 390 x 844 viewport showed Guardian planted and looking up-left toward a
visible sky moth before launch; deterministic runtime tests then proved the
first travel delta is leftward under the same locked facing and that Guardian
covers more aerial distance than the young and baby responses. This is browser
prototype proof, not signed-device proof.

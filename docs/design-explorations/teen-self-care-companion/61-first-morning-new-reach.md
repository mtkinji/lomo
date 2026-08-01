# Pet Engine Study 61 — First Morning, New Reach

## The gap

Evolution changed Moss's form and animation vocabulary, but it did not guarantee
that the player would experience the new physical possibility. A Young firefly
or Guardian sky-moth could be delayed by the autonomous living-day director—or
cross the world too quickly to read.

The browser playthrough also exposed an authority conflict: evolution and
evening were dispatched together. The evolution ceremony correctly won the
frame, but it canceled the walk to the old tree and could strand a newly grown
Moss in nighttime idle.

## The scene contract

Evolution is now one continuous three-scene handoff:

1. **Transformation:** the old and new forms complete the grounded evolution
   ceremony without another world behavior competing for the frame.
2. **Home:** only after the ceremony finishes does evening begin; Moss carries
   that day's life echo to the old tree and curls up.
3. **New reach:** after the next dawn and greeting, the living-day director
   yields until one stage-authored visitor is actually active. Young sees a
   firefly in the middle air; Guardian sees a sky-moth above the canopy.

The visitor stops on a shared action line. Moss turns and waits for the player
to touch it, so the new leap or aerial vault is discovered through play rather
than announced by a tutorial or progress meter. Once the visitor is active, the
debut is consumed exactly once and ordinary weather, roaming, memories, and
play resume.

## Authority rules

- Evolution ceremony precedes evening; neither may cancel the other.
- A form debut persists across the night and cannot occur on the evolution day.
- Dawn and greeting complete before the visitor is dispatched.
- Ambient living-day scenes remain paused until the visitor is confirmed in
  the world, closing the React-to-Canvas command race.
- Focus and an already-active visitor remain stronger than a pending debut.
- The debut is an invitation, not a reward, score, need, or collectible.

## Proof

- State tests cover three- and eight-day evolution, one-shot debut persistence,
  calm-morning eligibility, and post-reaction evening timing.
- World tests prove Young receives a shared firefly and Guardian a shared
  sky-moth, and that both settle into `visitor-invite` without disappearing.
- A clean local browser journey completed Baby day 1 through Young day 4. The
  evolution ceremony finished, Moss reached `night-rest`, dawn arrived, and the
  first screen after greeting held `Touch the firefly — Moss is coiled for the
  middle air` with Lab closed.


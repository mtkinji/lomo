# Game Timer redesign: diagnosis and direction

## Diagnosis
The shipped hourglass asked a flat vector fill to behave like granular sand. The smooth shrinking block, rigid stream, and static bottom mound made the object less believable as it moved. Because the surface visually promised a physical hourglass, that mismatch was the dominant impression.

The job is not “show an hourglass.” The job is “replace the missing one-minute game piece immediately while keeping the table playful.”

## Directions considered
1. **Real granular hourglass.** Highest physical fidelity, but requires particle simulation, collision tuning, device proof, and a larger runtime/performance budget.
2. **Wind-up game timer.** A flat mechanical timer with direct rim winding, tactile ratchets, a rotating face, exact center digits, and a clear snap-to-start moment.
3. **Graphic game countdown.** A purely expressive animated timer with no physical metaphor.

## First chosen direction and observed failure
The first redesign built the wind-up timer. Simulator use showed that the motion was fun but made duration setting harder, while the rotating 0–60 labels created a false sequence and did not align consistently with the authoritative center number.

## Revised direction
Use one explicit timer: presets for common game durations, plus or minus 15-second adjustment, one Start action, an `m:ss` countdown, and an unlabeled progress ring. Preserve tactile delight in press and completion feedback, not in a required setting gesture.

## Stated bet
Visible presets and an authoritative clock will be faster and easier to trust than either simulated sand or a numbered mechanical dial. A small amount of duration choice better serves the real table job than preserving the original fixed-minute assumption.

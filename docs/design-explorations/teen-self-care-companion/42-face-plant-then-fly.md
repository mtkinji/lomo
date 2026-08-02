# Pet Engine Study 38 — Face, Plant, Then Fly

## Problem

Moss can already notice stage-specific wildlife: Baby follows a crawler, Young
follows a firefly, and Guardian reaches for a high sky moth. But a fast target
can cross Moss during the attention beat. If the engine changes facing and
starts the pursuit on the same frame, the authored anticipation drawing has no
time to establish the new action line. Even mathematically correct travel can
therefore read as a backward jump.

## Direction

Preserve the existing maturity ladder and add one physical rule: when pursuit
requires a reversal, Moss must turn and plant before launching. The visitor is
then committed to that side of the shot, the target line is frozen, and the
stage-specific performance begins.

- **Baby:** notices a moss crawler on the terrain and makes a small grounded
  pounce.
- **Young:** notices a firefly in the low air and uses the longer bounding
  pounce.
- **Guardian:** notices a sky moth in the upper air and uses the authored
  coil, rise, bank, reach, landing, and recovery performance.

This remains a behavioral-engine change, not a reward, new meter, or care
obligation. The visitor exists to reveal growth through play.

## Contract

1. Attention may follow a moving visitor freely.
2. Pursuit chooses the visitor's latest visible side.
3. If that side differs from Moss's current facing, enter a grounded
   `visitor-turn` beat first.
4. The turn beat changes facing but never changes world position.
5. Once planted, freeze facing, launch position, and target side for the whole
   pursuit.
6. An engaged visitor evades outward on the committed side and cannot cross
   behind Moss or trigger a reverse retry.
7. Reduce Motion preserves target resolution without the intermediate turn or
   animated travel.

## Bet

One readable planted turn will remove more perceived locomotion wrongness than
adding more in-between drawings to a chase whose action line is ambiguous. The
stage ladder should then read as expanding physical capability: ground,
low-air bound, upper-air acrobatics.

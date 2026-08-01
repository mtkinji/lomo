# Pet Engine Study 41 — Lock the Eyes, Then Leave the Ground

## Experiential gap

The wildlife ladder is already structurally right: Baby notices a crawler on
the terrain, Young follows a firefly in the low air, and Guardian reaches for a
sky moth above the canopy line. But the chase preparation still uses a mostly
front-facing `discover` performance, and only plays when the target changes
sides. Correct world coordinates can therefore begin without a readable body
line and look like a backward jump.

The existing intercept also aims farther through the target than the visitor
can visibly escape during the chase. Near contact, Moss can pass the insect and
leave it behind the body before recovery, undoing the directional promise made
at takeoff.

## Direction

Make every wildlife chase one continuous authored sentence:

1. eyes and ears acquire the moving visitor;
2. Moss locks the visitor's latest visible side;
3. the directional pounce or aerial clip plays its planted anticipation;
4. world translation begins on that same clip's authored launch frame;
5. the visitor remains just ahead on the committed side through contact;
6. Moss lands and releases the encounter without reversing or retrying.

The maturity ladder becomes physically visible rather than a label:

- **Baby — ground:** a moss crawler prompts a fully planted stalk;
- **Young — low air:** a firefly prompts a springing bound with modest added
  lift;
- **Guardian — upper air:** a sky moth prompts the complete aerial vault with
  the greatest engine-level reach layered beneath the authored coil, bank, and
  landing drawings.

## Engine contract

- `visitor-turn` always owns the planted anticipation, even when Moss was
  already facing the correct side.
- `visitor-turn` and its pursuit resolve to the same stage-authored clip, so the
  runtime playhead does not restart between coil and launch.
- The world action changes exactly at the clip's authored `launchAt` boundary.
- Facing, launch position, target side, and escape direction stay locked until
  landing.
- Intercept lead is capped by how far the visitor can actually remain ahead
  during the visible travel window.
- Baby uses the planted walk vocabulary throughout its crawler pursuit. Added
  maturity lift is restrained for Young and largest for Guardian; it returns
  to zero at each clip's authored contact boundary so no form floats.
- Reduce Motion keeps the existing direct target resolution and omits the
  staged travel.

## Bet

A continuous anticipation-to-launch playhead plus a target that stays ahead of
Moss will remove the backward-jump read more reliably than another coordinate
patch. The growing vertical reach should make evolution feel like expanded
physical possibility before any UI explains it.

## Learning release

Verify both leftward and rightward encounters at phone scale for all three
forms. Each must visibly aim before moving; the visitor must remain on the
facing side through the reach; Baby must stay terrain-bound; Young must gain a
small lift; Guardian must occupy the highest layer and return cleanly to the
ground.

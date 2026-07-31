# Leafling Motion Study 03

Leafling is a small leaf-and-fur creature with the alert ears, cream face, large amber eyes, layered chest leaves, sturdy paws, round haunch, and leafy tail established in `public/leafling-atlas.png`.

## Physical rules

- The world ground is a fixed horizontal coordinate.
- Every grounded frame shares one contact baseline. Standing poses contact through the paws; sleeping poses contact through the curled body.
- Anticipation moves down before action moves up. Landings compress before recovery.
- The torso carries weight. The head, ears, chest leaves, and tail follow with restrained overlap.
- Volume, face construction, markings, palette, pixel density, and viewing angle remain stable.
- Motion is authored through silhouette and pose. No floating symbols, motion lines, dust, cast shadows, floor patches, scenery, text, or frame guides belong in the sprite.
- Every row contains exactly eight separated poses, left to right, on a perfectly flat `#ff00ff` chroma background.

## Runtime rows

| Row | Behavior | Playback | Contact story |
| --- | --- | --- | --- |
| 0 | Idle | loop | Four paws remain planted while breath and attention move above them. |
| 1 | Blink | loop | Paws stay planted; eyelids close and reopen with tiny ear follow-through. |
| 2 | Greet | one-shot | Notice, crouch, hop, land, compress, recover. |
| 3 | Care | one-shot | Notice food, lower weight, nibble, chew, pleased recovery. |
| 4 | Discover | one-shot | Ears lead, head turns, torso leans, then settles over the same paws. |
| 5 | Sleep | intro plus loop | Tuck paws, turn in, wrap tail, curl fully, then breathe while resting on the body. |
| 6 | Evolve | one-shot | Brace, gather, rise, open the leafy silhouette, land in a proud broader stance. |

## Rendering contract

Each normalized cell is `128 × 128`. The authored ground-contact anchor is `(64, 120)`. Airborne height is runtime metadata, not baked-in empty space. The renderer aligns the anchor to scene ground `y = 176`, draws a contact shadow from frame metadata, and then draws the complete sprite cell with nearest-neighbor scaling.

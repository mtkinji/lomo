# Leafling Authored Play Vocabulary 01

## Shared construction

- Cells: 160 × 128 transparent pixels
- Columns: eight drawings per interaction
- Ground anchor: `(80, 120)`
- Canonical facing for jump and pounce: screen-right; renderer mirrors for screen-left
- Rollover: direction-neutral but safe to mirror
- Timing: uneven anime-inspired holds, keys, in-betweens, accents, and recovery
- Runtime sizes: baby 38 px, young 46 px, guardian 62 px tall

## Source rows

Nine generated chroma-key strips live in `source/`: jump, pounce, and rollover for baby, young, and guardian. Each strip must show exactly eight separated full-body poses on flat `#ff00ff`, with one shared invisible ground baseline, no shadow, no scenery, no text, and no detached effects.

## Runtime atlases

- `public/leafling-motion-atlas-v5.png`: existing young rows 0–8 plus jump, pounce, and rollover at rows 9–11
- `public/leafling-stage-atlas-v3.png`: existing baby/guardian rows 0–5 plus baby interactions at rows 6–8 and guardian interactions at rows 9–11

The generated artwork owns body lift, compression, reach, curl, and recovery. World state owns intent, horizontal destination, facing, camera, and completion. It must not add bounce or whole-sprite spin to these clips.

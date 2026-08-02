# Leafling Locomotion Vocabulary 01

## Shared construction

- Cells: 160 × 128 transparent pixels
- Columns: eight drawings per gait
- Ground anchor: `(80, 120)`
- Facing: authored toward screen-right; renderer mirrors for screen-left
- Timing: uneven anime-inspired holds, keys, in-betweens, and accents
- Runtime sizes: baby 38 px, young 46 px, guardian 62 px tall

## Runtime atlases

- `public/leafling-motion-atlas-v4.png`: young expressive rows 0–6, walk row 7, run row 8
- `public/leafling-stage-atlas-v2.png`: baby vocabulary row 0, guardian vocabulary row 1, baby walk/run rows 2–3, guardian walk/run rows 4–5

## Walk cycle

Eight drawings alternate diagonal contacts, transfer weight, pass the rear paw beneath the body, and reach into the opposing contact. Every frame is planted. Contact drawings hold slightly longer so the stride reads at actual phone scale.

## Run cycle

Eight drawings alternate push, flight, reach, and contact across opposing leads. Flight frames declare airborne contact and use a tighter terrain cue. The world runtime provides horizontal travel only; the authored silhouette provides compression and vertical weight.

## Asset assembly

`assemble.py` deterministically extracts the eight generated poses, preserves their shared source baseline relationship, scales them by form, pads existing square frames into the wider contract, and emits both runtime atlases. `make_qa.py` creates actual-scale world previews and animated GIFs for all six gaits.

The generated guardian walk source arrived screen-left despite the authoring brief. Assembly mirrors each cell into the canonical screen-right contract before the renderer sees it. Direction correction belongs at the asset boundary; runtime facing must remain identical across clips.

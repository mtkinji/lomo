# Pet Engine Study 62 — The Meadow Recognizes Growth

## The gap

Moss's evolution ceremony already handed the old form to the new one, but the
world watched from a fixed distance. That made Guardian's arrival depend almost
entirely on the larger sprite. The transformation needed to feel like a change
in Moss's relationship to the meadow, not an image swap inside unchanged
scenery.

## The scene contract

The ceremony now drives one bounded atmosphere shared by the renderer:

1. the camera gathers toward Moss while the old form settles;
2. warm arrival light and motes concentrate around the handoff;
3. the old tree's canopy, vines, dapple, and loose leaves answer the change;
4. Guardian's arrival releases a stronger terrain wake than Young's;
5. camera, habitat, light, and wake return fully to rest after the ceremony.

Guardian receives the stronger response because the adult form should feel able
to affect the world. The animation remains limited and authored: no constant
aura, procedural particle cloud, or Pixar-like continuous motion is introduced.

Reduce Motion preserves the warm arrival light and the clear form handoff while
removing camera travel, canopy impulse, motes, and the animated terrain wake.

## Renderer boundary

Evolution resolves to a renderer-neutral atmosphere snapshot: camera gather,
zoom, canopy impulse, arrival light, mote opacity, wake intensity, and wake
radius. Canvas consumes that snapshot today; a native, web, or desktop adapter
can reproduce the same scene without inheriting Canvas drawing code.

The camera frame is clamped to the world bounds. The authored panoramic
backdrop also clamps its parallax offset independently so camera gathering near
either edge cannot reveal an unpainted strip.

## Proof

- Evolution tests prove Guardian's environment response exceeds Young's, every
  channel starts and ends at rest, Reduce Motion stays still, and camera bounds
  cannot expose space outside the habitat.
- Habitat tests prove backdrop parallax always covers both viewport edges.
- A clean browser journey advanced Moss from Baby day 1 through Guardian day 8
  using real To-do receipts, bloom touches, evenings, and mornings. The full
  transformation showed the camera gather, canopy response, arrival light, and
  grounded Guardian with no pale seam at either edge.

The remaining truth gate is human: whether Andrew, Olive, and Charlie experience
Guardian as powerful rather than merely larger.

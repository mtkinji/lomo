# Authored Habitat Atlas

## What is failing

Leafling now has a fine-grained silhouette, facial acting, and stage-specific motion, but the live habitat is still constructed from broad rectangles. The mismatch makes the creature read as a finished sprite placed over a renderer study instead of an animal inhabiting one coherent world.

## Design principle

The habitat should quietly reflect a person's becoming. It can respond to focus, play, weather, and care, but it must never become a dashboard, health meter, collectible field, or obligation system.

## Asset contract

The portable renderer consumes three authored pixel layers:

1. **Far panorama** — a continuous 480 × 240 sky, mountain, pine, and meadow plate. It moves at reduced camera speed and carries no creature, shelter tree, labels, or weather baked into the art.
2. **Shelter tree** — a transparent world-space sprite anchored at the roots at `treeShelterX`. The renderer can apply a very small wind rotation without moving its roots.
3. **Near meadow** — a transparent 480 × 64 strip of fine grass, flowers, stones, and leaf clusters. It moves at world speed and overlaps the Pet only at paw height.

The asset pack is renderer-neutral. Canvas 2D is the study adapter; a native, web, or desktop renderer can consume the same world coordinates, layer order, and weather state.

## Engine boundary

- Artwork owns environmental texture, material detail, silhouette, and depth cues.
- World state owns camera position, weather, shelter and sun destinations, and behavior timing.
- The renderer owns layer parallax, tint, rain, light shafts, wind particles, and bounded tree/plant sway.
- No weather condition is baked permanently into the base artwork.

## Acceptance bar

- At 390 × 844, Leafling and the habitat appear to share one pixel density and palette family.
- The roots visibly meet the ground; foreground vegetation never becomes a platform.
- Left and right travel reveal new authored scenery without seams or blank edges.
- Sun, breeze, and rain change the same world rather than swapping unrelated illustrations.
- The old tree remains a legible destination for rain shelter, shade, and Focus together.
- Baby, young, and guardian remain readable against every layer.

## Stated bet

We're betting that authored environmental planes are now the dominant blocker. If the world still feels inert after this pass, the next move is not more detail; it is more causal environmental animation such as branch recoil, puddle accumulation, and small wildlife routines.

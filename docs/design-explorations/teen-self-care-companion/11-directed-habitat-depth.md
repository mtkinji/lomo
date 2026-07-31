# Directed Habitat Depth

## UI contract

**Job:** When a person visits or touches their Pet, they need to feel that the creature inhabits a responsive world, so attachment grows through shared moments rather than meters or obligation.

**Primary action:** Touch the world.

**Must show:** Layered spatial depth, the current weather's effect on the whole scene, and readable warm and sheltered destinations.

**Reveal later:** Weather triggers, runtime state, form preview, and animation mechanics remain in the existing engine inspector.

**Must not add:** Temperature or need meters, forecasts, inventory, collectibles, joystick, camera controls, permanent tutorials, guilt, illness, or another card around the world.

**Reuse map:** The existing Canvas world remains the consumer surface; direct taps, camera follow, weather controls, Pet status copy, Focus together, and bounded care receipts retain their current roles.

**Behavior sources:** The Pixel Pet Labs brief, the directed living-world decision, the user's explicit questions about wind, rain, sun, heat, and curling under a tree, and the established shame-free Pet boundary.

**Required states:** Seek sun, bask, seek shade, curl in shade, breeze, rain shelter, Focus under the tree, direct roaming, zoom, and Reduce Motion.

**Proof path:** Standalone site at a 390 × 844 phone viewport; trigger sun, wind, rain, Focus, left/right travel, and form preview; inspect visual grounding and runtime action/clip state.

## Visual direction

The habitat now uses several camera-speed layers rather than one flat backdrop: drifting sky, far mountains, nearer hills, distant pines, world-space canopy and terrain, and foreground grass that slightly overlaps Leafling's paws. The old tree is a true destination with roots, bark depth, irregular canopy clusters, hanging vines, and terrain-embedded shade. The sun patch is a pool of light inside the meadow rather than a label or button.

Weather changes those same layers. Breeze drives clouds, plants, canopy, particles, and bounded creature sway. Rain darkens the complete atmosphere, thickens clouds, adds depth-separated drops, and produces terrain ripples. Sun aligns a light shaft with the world-space warm patch as the camera moves.

## Behavior direction

Sunny weather is now a directed sequence rather than a static state:

1. Notice and walk to the warm patch.
2. Bask with a held idle performance.
3. Decide that the warmth is enough.
4. Walk back to the old tree.
5. Curl using the authored sleep clip in the canopy shade.

The engine owns timing and destinations; the renderer owns atmosphere. Reduce Motion teleports between the same semantic beats instead of deleting the story.

## Stated bet

We're betting that the world feels alive when atmosphere, destination, creature acting, and camera tell one short causal story. More decorative objects alone would not create that feeling.

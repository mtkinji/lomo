# Living World System

## Emotional target

The Pet capability should feel like playing with a beloved creature inside a beautifully directed animated world: restrained movement, atmospheric light, readable acting, and a sense that the environment exists beyond the current interaction. The reference is the feeling of a polished adventure animation, not any protected character, creature, setting, or visual design.

## Current gap

Study 05 made Leafling's animation more intentional, but the habitat remained scenery. Fireflies could recruit attention, yet wind, light, terrain, shelter, and Kwilt actions did not form one causal world. The creature could be controlled, but it did not appear to inhabit a climate.

## Alternatives considered

1. **Cinematic backdrop:** richer painted scenes and weather overlays. Highest immediate beauty, but weather would remain cosmetic and portability would be weak.
2. **Simulation-first world:** physical wind, rain, heat, hunger, and many needs. Deepest system, but too large, too game-like, and likely to create guilt or meters.
3. **Directed living world:** a small set of authored environmental events, each with an environmental expression, a creature response, and an optional user interaction. This preserves anime-style direction while keeping the engine deterministic and portable.

## Chosen direction

Build the directed living world. Weather events have three coordinated layers:

- **Atmosphere:** light, cloud, rain, wind, terrain, and ambient particles.
- **Creature acting:** attention, grounded secondary motion, travel, shelter, rest, or play.
- **Meaningful response:** the user can touch the world, focus beside the Pet, or let a real Kwilt completion change what happens next.

The first proof includes sun, breeze, and rain; an old shelter tree; rain-driven shelter seeking; grounded wind sway; a short Focus-together ritual; and a Play-together receipt that stirs the world. Weather controls remain in the engine inspector. The consumer interaction remains direct manipulation plus contextual Kwilt actions.

## Reductive decisions

- No weather forecast, temperature meter, umbrella inventory, stamina, hunger, or illness.
- No claim that missed care causes bad weather.
- No permanent joystick or camera controls.
- No separate Focus streak: Focus together produces the existing bounded receipt.
- No random severe weather or fear response in this proof.

## Portable contract

The renderer-neutral world state owns weather kind, elapsed weather time, bounded ground sway, shelter destination, Focus countdown, and completion. Canvas draws the current study; future native, web, or desktop renderers consume the same semantics without depending on Canvas pixels.

## Stated bet

We're betting that one environmental event becomes emotionally meaningful when the world, creature, and user's touch respond to it together. If rain still reads as a filter placed over a static scene, the next iteration should invest in authored weather-specific anatomy layers and a richer parallax environment before adding more weather types.

## Acceptance evidence

- Rain visibly changes sky, rainfall, and terrain and causes Leafling to travel to the tree and curl up.
- Breeze moves foliage and loose leaves while Leafling stays anchored to the ground.
- Sun creates a distinct warm destination and atmosphere.
- Focus together visibly settles the world, counts down, and resolves through the existing daily care receipt.
- Playing together creates a bounded care receipt and an immediate playful ecosystem response.
- Touch roaming, jumping, rollover, insects, zoom, reduced motion, and shame-free care continue to work.

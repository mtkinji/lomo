# Directed Weather Episodes

## Why this is the next study

Study 12 proves that the Leafling can move through a persistent habitat, react to sun, wind, rain, wildlife, growth, direct touch, and a shared Focus ritual. The pieces are real, but they can still read as separate demonstrations selected from an inspector. The next fidelity gap is **causal direction**: an event should arrive, be noticed, change the whole shot, provoke a believable animal response, remain open to touch, and resolve.

This is not a request for more particles. It is a request for the feeling of entering a beautifully directed animated world while still being able to play with the creature inside it.

## Job-flow review

Target audience: `audience-aspirational-family-organizers`  
Representative persona: Maya, with Charlie as the provisional teen participant  
Hero JTBD: `jtbd-move-the-few-things-that-matter`  
Job flow: `job-flow-maya-move-family-life-forward`

The adjacent weak steps remain **Family participation — 2/5** and **Keep using system — 3/5**. The Pet can make a completion warmer, but it will not improve voluntary return if its world feels like a decorated receipt screen. A coherent living episode is a stronger test of whether Charlie would revisit because the capability itself feels alive.

## Restated in user voice

When I return after doing something that helped real life move, I want to enter a tiny world where the sky, plants, creature, and camera all seem aware of the same moment, so that I feel like I am playing inside a beautiful animated story rather than checking a reward widget.

## Anchor assessment

- `jtbd-carry-intentions-into-action` — the warm world response should make real follow-through easier to return to without becoming payment for work.
- `jtbd-help-us-enjoy-being-together` — a completed family or friend game can create a playful episode, while connection remains the reason for play.
- `jtbd-trust-this-app-with-my-life` — the episode must stay calm, optional, interruptible, non-punitive, and honest about what caused it.

`serves: [jtbd-carry-intentions-into-action, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]`

## System alignment

Constraint posture: `Extend the system`

Preserve:

- The portable world model owns state and causality; renderers own platform-specific drawing.
- Authored character clips own body acting, contact, takeoff, landing, and recovery.
- Touch remains the primary consumer control. There is no joystick, weather dashboard, quest, score, or tutorial overlay.
- Weather is never a need meter and cannot harm the Pet.
- Focus has priority and quiets rather than competes with the world.
- Reduce Motion preserves the story while removing staged travel, sway, and pulsing transitions.

Extend:

- Weather gains an explicit arrival phase and a normalized intensity rather than changing at full strength in one frame.
- The Pet notices the event before acting on it.
- Travel shots frame a little world in front of the Pet instead of pinning it mechanically to dead center.
- The prototype may schedule occasional deterministic weather changes so the habitat can surprise a visitor without a consumer-facing control.

## Design challenge

How might we make one weather change feel like a tiny playable anime episode for Charlie, while preserving direct control, calm attention, renderer portability, and the Pet's nonverbal animal nature?

## Divergence

### A. Weather cutscene

Lock touch briefly, stage an authored camera move, play a beginning-middle-end weather sequence, then return control. This offers the strongest cinematic composition but fails the core promise that the person is playing with the creature rather than watching a reward movie.

### B. Weather mini-game

Turn wind, rain, or sun into a repeatable challenge with targets, success, and rewards. This offers explicit agency but creates a second game economy, makes weather instrumental, and risks turning the Pet capability into another thing to complete.

### C. Directed living episode

Give weather an arrival, settled state, and instinctive response. The Pet notices first, then chooses warmth or shelter; the camera leads just enough to reveal the destination. Touch remains available and can briefly redirect the Pet, but the animal's environmental instinct can reassert itself. No score, capture, reward, or forced outcome is added.

## Convergence

Choose **C. Directed living episode**.

The smallest coherent proof is all three existing weather types using one shared grammar:

1. **Arrival:** scene intensity grows from 0 to 1; the Pet notices with its authored attention clip.
2. **Response:** rain sends it to shelter, sun draws it to warmth and later shade, and wind becomes a grounded watchful hold rather than lifting the body.
3. **Shot:** the camera frames a small amount of destination-side world during directed travel.
4. **Agency:** taps still work outside Focus. A direct interaction may interrupt the response, but weather remains a persistent world fact rather than disappearing.
5. **Settled state:** the event remains readable without a meter. The inspector exposes phase and intensity only for testing.
6. **Autonomous life:** an occasional deterministic weather change may begin while the world is otherwise idle; Focus and evolution suppress it.

## Reductive decisions

- No new screen, mode, button, meter, currency, inventory, quest, or collectible.
- No lightning, danger, sickness, fear, or weather damage.
- No bespoke weather cutscene clip in this study; reuse the approved attention, walk, idle, and sleep vocabulary.
- No real-world weather API. This study proves episode direction, not data integration.
- No permanent camera setting. Shot composition remains an engine behavior.

## Activation and learning release

The episode is discovered in the existing Pet world. Prototype inspector buttons replay sun, wind, and rain; the world can also schedule a slow deterministic change during ordinary play. **Play together** remains a simulated family/friend-game receipt and can invite a breezy episode, connecting shared play to the world without claiming the Pet was the reason to play.

The learning question is not whether people notice more effects. It is whether they describe one coherent moment: “the sky changed, Moss noticed, then went somewhere for a reason,” and whether they still feel free to touch and redirect the creature.

## Acceptance evidence

- Pure world tests prove arrival timing, intensity bounds, weather-specific response, and Reduce Motion semantics.
- Camera tests prove look-ahead cannot reverse screen-space locomotion or leave the world bounds.
- Browser traces prove rain, wind, and sun each pass through arrival and settled states with the intended authored clips.
- Phone-scale visual review proves the whole scene changes together and the Pet remains grounded.
- A direct tap during a weather episode remains effective outside Focus.
- Focus still clears wildlife, suppresses play, and hushes weather without losing the underlying weather state.

## Bet

We are betting that **direction—anticipation, causality, shot composition, and recovery—will create more perceived animation quality than simply adding more frames or effects**. If the episode still reads as a weather toggle, the next revision should invest in one authored weather-specific character clip or environment layer, not add more systems.

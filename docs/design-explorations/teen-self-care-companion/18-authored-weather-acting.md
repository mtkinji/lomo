# Authored Weather Acting

## Why this is the next study

Study 13 gives weather direction: the sky changes by degrees, the Pet notices, the whole habitat responds, and the camera reveals a destination. The remaining weak seam is the Pet's acting. Wind rotates the complete grounded sprite, rain borrows the same attention performance as wildlife, and sun borrows ordinary idle. The world understands weather more specifically than the character does.

Study 14 tests whether a compact **weather acting vocabulary** can close that gap without requiring a bespoke cutscene, a physics engine, or a new atlas row for every event.

## Full-goal audit

Already evidenced:

- A persistent, phone-scale habitat with layered pixel depth.
- Direct touch for walking, running, jumping, pouncing, rolling, and pinch zoom.
- Baby, young, and guardian forms with visibly different bodies and mature aerial ability.
- Stage-specific wildlife at ground, middle-air, and high-air layers.
- Sun, wind, and rain with arrival, intensity, destinations, and autonomous timing.
- To-do, Focus together, family/friend Play together, daily care, and non-punitive growth.

Still incomplete or weak:

- The Pet does not yet perform weather-specific authored clips.
- Wind motion is applied as a rigid renderer rotation rather than readable anatomy and posture.
- The three forms react to weather with nearly the same dramatic idea, weakening the feeling of maturity.
- Andrew has not yet confirmed that the playable prototype creates the intended beautiful-anime-world feeling.

## Design challenge

How might weather visibly travel through Moss's ears, face, coat, leaf layers, tail, stance, and recovery—using the approved portable animation system—so the character appears to *act inside* the world rather than have an effect applied to it?

## Convergence

Add four renderer-neutral semantic clips to every stage manifest:

1. **Weather notice** — the sky, not a visitor, owns the eyeline and anticipation.
2. **Wind brace** — the Pet lowers its center of gravity, holds a strong key, and recovers while the habitat keeps moving.
3. **Rain flinch** — first-drop compression and a short shake precede travel to shelter.
4. **Sun bask** — a quiet eyes-closed inhale/exhale loop replaces generic idle in the warm patch.

The first proof remixes approved authored drawings from each form's existing atlas. This is intentional limited-animation direction: meaning comes from pose selection, non-linear timing, contact, and sequence, not from demanding a unique drawing for every frame. If a specific beat still fails visually, that beat—not the whole engine—earns a new authored row.

## Stage character

- **Baby:** quick, low, easily surprised; the brace compresses close to the ground and the recovery is small.
- **Young:** agile and curious; posture, ears, leaf ruff, and tail carry the weather rhythm.
- **Guardian:** deliberate and powerful; the strongest pose holds longer and returns with control rather than bounce.

The semantic clip names remain shared so all renderers and future species can implement the same behavioral contract with different drawings.

## Reductive decisions

- No weather cutscene and no control lock.
- No procedural whole-sprite wind tilt.
- No cloth, bone, or particle physics dependency.
- No damage, fear, sickness, temperature meter, or equipment.
- No new reward or progress system.
- No image generation dependency for this proof; two attempted source-row generations were rejected before producing assets, so the study changes strategy to an authored remix of already approved drawings.

## Acceptance evidence

- Pure tests prove the weather state machine requests the new semantic clips in causal order.
- Manifest tests prove all three stages own every clip, use non-linear timing, and stay within atlas bounds.
- Wind leaves the Pet's ground transform unrotated; only the authored clip and environment express the gust.
- Browser traces show `weather-notice` before `wind-brace`, `rain-flinch` before shelter travel, and `sun-bask` after warm-patch travel.
- Phone-scale visual review covers baby, young, and guardian in sun, wind, and rain.
- Touch, Focus, evolution, wildlife, and Reduce Motion retain priority and meaning.

## Bet

We are betting that **specific acting requests plus deliberate reuse of strong drawings** will feel more like anime direction than applying more continuous motion to the whole sprite. The next new art should be commissioned only for a beat that this semantic edit cannot make believable.

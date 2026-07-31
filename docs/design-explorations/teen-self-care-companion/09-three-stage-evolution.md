# Three-Stage Evolution System

## Emotional target

Growth should feel like recognizing the same small companion at three different ages—not swapping in a larger picture. A user should be able to see who Leafling is becoming while still recognizing the eyes, leaf anatomy, curiosity, and cat-like physical instincts they first met.

## Current gap

The earlier engine called one size change an evolution. The atlas, behavior vocabulary, and silhouette were identical before and after the threshold, so growth carried no authored meaning. It proved state progression, but not attachment to a changing creature.

## Chosen direction

Leafling now has three linear forms:

- **Baby:** compact seedling proportions, forehead sprout, bud tail, and round paws. Begins at zero care moments.
- **Young:** the established agile Leafling with the deepest layered animation rig. Arrives after three distinct care days.
- **Guardian:** taller stance, leaf mantle, branch crown, and plume tail. Arrives after eight distinct care days.

Every form owns the same semantic clips: idle, blink, greet, care, discover, sleep, and evolve. Baby and guardian use eight authored vocabulary drawings remixed through non-linear timing, contact, and code-driven transforms. Young keeps the full seven-row motion atlas and eye-only blink layer. Weather, world coordinates, direct touch, camera, Focus, and care state remain renderer-neutral and do not branch by form.

## Limited-animation rule

More fidelity does not mean uniform frame rate. Holds establish personality; brief key drawings carry involuntary actions; accents get time to read; recovery poses settle weight. The stage blink is open hold → 34 ms closed key → 66 ms reopen → long hold. Its body stays registered while only the eyes change visibly.

## Growth contract

- Only the day's one bounded care receipt advances growth.
- Three care moments unlock young; eight unlock guardian.
- Quiet days never subtract progress or reverse a form.
- Evolution changes the active animation manifest, display scale, silhouette, and receipt—not the user's world position or relationship history.
- Preview controls may inspect any form without changing saved care state.

## Portable asset boundary

The engine consumes transparent 128 × 128 atlas cells with a shared ground anchor at `(64, 120)`. A stage manifest selects its atlas, clip timing, contacts, events, and display size. Canvas 2D is only the current adapter; native Skia, web canvas, and desktop renderers can resolve the same state and frames.

## Stated bet

We're betting that three recognizable life stages create more anticipation and affection than either a single universal Pet or many shallow species choices. If a family cares about Leafling's growth but not about selecting among five species, the next investment should deepen one companion before expanding the roster.

## Acceptance evidence

- Baby, young, and guardian are recognizable as one species at actual iPhone game scale.
- Each form can idle, blink, greet, receive care, discover, curl to sleep, and perform an evolution beat.
- Baby and guardian remain grounded through sleep, weather shelter, movement, and rollover composition.
- Blink timing is quick and non-linear, and manual animation preview cannot be stolen by a spontaneous insect response.
- Three- and eight-care thresholds are deterministic; quiet days preserve both progress and form.

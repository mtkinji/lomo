# Pet Engine Study 60 — Playable Experience Completion Audit

## Original success condition

The learning goal is not complete when the engine has enough features. It is
complete when Andrew can play with a tiny creature inside a beautiful,
anime-quality world; feel weather and direct control; experience a clearly
different baby, young, and powerful adult form; and see ordinary Kwilt progress
become part of that world without a scorecard or care economy.

This audit treats code, tests, screenshots, and runtime output as supporting
evidence. The requested feeling remains a human evaluation and cannot be
declared from automated proof.

## Requirement-by-requirement evidence

| Requirement | Current evidence | Judgment |
| --- | --- | --- |
| Beautiful limited-animation character | Three distinct authored atlases; nonlinear holds, keys, in-betweens, accents, recovery, face-only blink, planted contact, and weather acting; current production screenshots retain the approved illustrated Moss. | Technically and visually supported; Andrew's emotional-quality judgment remains required. |
| Beautiful tiny world | Authored panorama, old tree, near meadow, parallax, flexible habitat acting, weather overlays, day/night, puddles, wildlife, and life echoes render through one Canvas world. | Proven in current production render. |
| Immediate immersion | `?play=1` removes study copy and the permanent inspector; the complete capability fits one desktop viewport and Lab is optional disclosure. An iPhone 17 Pro Simulator Safari pass exposed and then closed a mobile grid-centering defect: the capability now stretches across the 402px device viewport with header, world, dock, sound, and Lab controls inside the visible phone width. | Proven in fresh production navigation and the local iPhone 17 Pro Simulator runtime. Physical-device ergonomics and performance remain unproven. |
| Direct playful control | Production pointer proof produced a correctly faced rightward walk; high touch requested jump; the same engine owns affection, rollover, hand guide, pinch zoom, tree play, leaf toss/return, visitor chase, and terrain choices. | Proven for direct locomotion/jump in current production; broader gesture vocabulary is covered by deterministic tests and earlier browser studies. |
| Causal sun, wind, and rain | Weather arrives, earns attention, moves habitat materials, changes Moss's acting and decisions, changes leaf physics, and leaves an after-rain puddle. Baby/Young share the shelter choice; Guardian helps a wet firefly. | Proven by engine tests and production weather controls. |
| Baby → Young → powerful Guardian | Care thresholds are three and eight distinct days; forms use 38px, 46px, and 62px presentation; each owns different locomotion, reach, visitor layer, tree height, puddle response, weather acting, sound, and evolution ceremony; Guardian adds aerial acrobatics and terrain wake. | Proven by current source, tests, and prior rendered form studies. Whether Guardian *feels powerful enough* remains a family-playtest judgment. |
| Focus with the creature | Immersive browser proof entered Focus, chose a place, waited for Moss to arrive, and reached the grounded curled shared-stillness scene. Completion plants a still-light at that coordinate. | Proven in the Sites-compatible browser runtime. |
| To-do becomes lived-world progress | Current production proof changed a completed To-do receipt into `bloom-notice` and added a persistent `todo` life echo. | Proven in production. |
| Family/friend play becomes lived-world progress | Current production proof changed the Play receipt into a breeze, ground visitor, tracking response, and persistent `play` life echo. | Proven in production. |
| Healthy patterns without pressure | One care moment per prototype day, no loss across quiet days, no depletion, illness, streak guilt, countdown failure, rescue score, currency, or notification pressure. Unanswered invitations resolve autonomously. | Proven by state-machine tests and explicit exclusions. |
| Portable engine boundary | Renderer-neutral world, animation, camera, sound mix, habitat, evolution, focus, visitor, plaything, and persistence contracts feed the Canvas adapter; web, desktop, and native can supply adapters without changing behavior authority. | Proven at the source boundary; only the web Canvas adapter is visually exercised. |

## Live production playthrough evidence

On the fresh private immersive route:

1. the world rendered without study chrome or inspector;
2. Lab opened and closed without resetting the world;
3. Rain continued after Lab closed;
4. a right-side terrain touch requested `walk`, faced right, and played the
   authored walk clip;
5. a high touch requested the jump vocabulary;
6. `Complete a To-do` entered `bloom-notice` and persisted a `todo` echo;
7. `Play with family or a friend` introduced breeze, a crawler, tracking, and a
   persistent `play` echo;
8. the same production bundle exposes the tested Focus, lifecycle, weather,
   stage, reset, sound, and accessibility controls through Lab.

The same source was then opened through Safari on an iPhone 17 Pro Simulator.
Runtime instrumentation confirmed `innerWidth`, document client width, screen
width, and visual viewport width were all 402px at scale 1. That pass caught the
mobile immersive capability at `x = -128…202` under its inherited desktop grid
centering. Replacing only the narrow immersive layout with a stretched vertical
flex container produced a full-width phone render with no horizontal overflow.

## Evidence that is still missing

- Andrew, Olive, and Charlie have not yet evaluated the new immersive route as
  a continuous play experience.
- An iPhone 17 Pro Simulator Safari capture now proves the 402px viewport,
  safe-area presentation, full-width world, and visible dock. It does not prove
  physical-device touch ergonomics, sound, or sustained frame pacing.
- No human has yet answered whether the Guardian reads as a genuinely powerful
  evolved creature rather than merely a larger and more capable sprite.
- Automated timing and clip-role tests cannot prove the holistic “beautiful
  anime I can play with” feeling.

## Completion decision

Keep the overall goal active. The prototype has reached the point where adding
another isolated mechanic before a family playtest risks feature accumulation
instead of improving the intended feeling.

The next truthful gate is a short unprompted playtest on the immersive URL:

1. play without opening Lab for several minutes;
2. open Lab only to move through Baby, Young, Guardian, and the three weather
   states;
3. try Focus, a To-do consequence, and a Play consequence;
4. record the first moment that felt alive, the first moment that felt like a
   prototype, and whether Guardian felt meaningfully powerful;
5. use those observations—not another feature checklist—to choose the next
   engine or presentation study.

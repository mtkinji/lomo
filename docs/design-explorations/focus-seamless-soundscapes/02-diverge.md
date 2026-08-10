# Diverge: Focus seamless soundscapes

Axis of variation: where continuity is created and how much playback architecture changes.

## A. Prompt-only regeneration

Regenerate each track with “seamless loop” instructions and ship the preferred candidate.

- Fit: lowest editing effort and can preserve the intended sound.
- Best when: the model produces a truly loopable composition and encoder metadata is honored.
- Fails when: musical endings, fades, or the iOS seek-to-zero transport remain audible.
- Anti-pattern: passes UI reduction; fails the reliability bar without measurement.

## B. Deterministic offline loop mastering

Choose an internal musical continuation point, bridge or crossfade the tail into the head, rotate the file so the transition lives inside the master, normalize once, and audit repeated playback.

- Fit: works with current files and immutable catalog delivery.
- Best when: a compatible section exists and the transition can be judged by ear.
- Fails when: a generated composition has no musically compatible boundary.
- Anti-pattern: passes; no new product concept.

## C. ElevenLabs-assisted bridge plus deterministic mastering

Use Music v2 inpainting to generate a glue section conditioned on the existing track, then perform exact trim, rotation, loudness, repeat rendering, and seam acceptance locally. Use Sound Effects v2 loop generation for pure nature ambience, then assemble longer non-repetitive masters when needed.

- Fit: preserves more of the current musical identity while giving difficult seams new material.
- Best when: the current track is worth retaining but its ending and beginning cannot meet naturally.
- Fails when: no candidate bridge preserves tempo, harmony, and texture.
- Anti-pattern: passes when generation remains a candidate stage rather than automatic acceptance.

## D. Native runtime crossfade engine

Keep ordinary masters and schedule two native players with an overlap before every boundary.

- Fit: can hide diverse source endings and support future transitions.
- Best when: native scheduling remains reliable while locked/backgrounded.
- Fails when: JavaScript timing or remote buffering owns the seam; materially larger native blast radius.
- Anti-pattern: UI passes, implementation is disproportionate before source repair is tested.

## Recommendation

Choose **C**, with **B** as the deterministic baseline. Escalate to **D** only if corrected masters still reveal a transport gap on a signed physical iPhone.

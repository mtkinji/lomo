# Leafling — Grounded Pet Engine Study

A standalone, mobile-first learning prototype for Kwilt's portable Pixel Pet animation system.

The prototype lets a tester:

- inspect seven independently authored Leafling animation clips;
- pause and step through the exact atlas cells used by the renderer;
- observe planted, resting, and airborne ground-contact states;
- compare 38px baby, 46px young, and 62px guardian game-character scales;
- see a one-time sleep transition resolve into a curled breathing loop;
- tap the world to walk, run, and jump while a wider camera follows;
- pinch from a full habitat view to a temporary 2.25x close-up;
- watch autonomous fireflies recruit attention and provoke a pounce;
- swipe across Leafling to curl, roll over on the ground, and uncurl;
- inspect anime-style holds, keys, in-betweens, accents, and recovery timing;
- see a face-only 184 ms blink composed over a locked full-body key pose;
- move through sun, wind, and rain that affect both the habitat and Leafling;
- watch Leafling seek the old tree and curl up when rain reaches the meadow;
- start a fifteen-second Focus-together ritual that resolves through the same bounded Kwilt receipt path;
- let a Play-together receipt stir the breeze and invite a small visitor;
- simulate a completed To-do or Focus session;
- give one care moment per prototype day;
- return after quiet days without loss or punishment;
- hear and mute nonverbal sounds;
- accelerate time through a young form after three care moments and a guardian form after eight.

The pure TypeScript runtime owns clip timing, loop windows, frame events,
ground anchors, contact states, movement offsets, contact-cue metadata, world
coordinates, camera follow, transient zoom, weather response, shared-focus state,
and autonomous behavior targets.
The same snapshot contract carries both masked anatomy layers and stage-specific
animation manifests. The young Leafling can change its eyes without redrawing
or moving its body; baby and guardian use compact authored key-pose vocabularies
with non-linear limited-animation timing.
Canvas 2D is the current renderer adapter. It places Leafling low in the scene,
draws contact cues inside the terrain rather than as a separate platform, and
leaves open world space for future locomotion. Native and desktop renderers can
consume the same frame snapshots.

Pet state stays in the current browser. The prototype does not connect to a
Kwilt account, production data, Chat, notifications, Money, or Screen Time.

## Local use

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm test
```

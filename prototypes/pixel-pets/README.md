# Leafling — Grounded Pet Engine Study

A standalone, mobile-first learning prototype for Kwilt's portable Pixel Pet animation system.

The prototype lets a tester:

- inspect twelve dedicated Leafling clips, including authored walk, run, jump, pounce, and rollover acting;
- pause and step through the exact atlas cells used by the renderer;
- observe planted, resting, and airborne ground-contact states;
- compare 38px baby, 46px young, and 62px guardian game-character scales;
- see a one-time sleep transition resolve into a curled breathing loop;
- tap the world to walk, run, and jump while authored footfalls and a wider camera follow;
- pinch from a full habitat view to a temporary 2.25x close-up;
- discover a stage-specific wildlife ladder: baby follows a ground crawler, young chases a firefly, and guardian performs a high aerial interception of a sky moth;
- swipe across Leafling to curl, roll over on the ground, and uncurl;
- inspect anime-style holds, keys, in-betweens, accents, and recovery timing;
- see a face-only 184 ms blink composed over a locked full-body key pose;
- move through sun, wind, and rain that affect both the habitat and Leafling;
- watch Leafling seek the old tree and curl up when rain reaches the meadow;
- watch Leafling follow a sunny patch, bask briefly, then independently return to the old tree's shade;
- travel through an authored panorama, root-anchored shelter tree, fine foreground meadow, and weather overlays at different camera depths;
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
autonomous behavior targets, and the directed sun-to-shade sequence.
The same snapshot contract carries both masked anatomy layers and stage-specific
animation manifests. The young Leafling can change its eyes without redrawing
or moving its body; all three forms now own distinct eight-drawing walk, run,
jump, pounce, and rollover clips with non-linear limited-animation timing and
explicit ground contact. World state owns destinations, facing, and camera
travel; the drawings own lift, body turn, anticipation, impact, and recovery.
Visitor pursuit uses one side-stable intercept and one recovery, so a crossing
visitor cannot make Leafling turn away, launch backward, or oscillate into a
second pounce.
The renderer-neutral habitat manifest carries a 480 × 240 far panorama, a
root-anchored shelter tree, and a transparent near-meadow layer. Canvas 2D is
the current adapter. It places Leafling low in the scene, draws contact cues
inside the terrain rather than as a separate platform, and layers weather over
the same authored place. Native, web, and desktop renderers can consume the
same world coordinates, habitat assets, and frame snapshots.

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

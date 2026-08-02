# Guardian Aerial Acrobatics 01

## Purpose

Guardian's sky-moth response must reveal a physical ability that baby and young
Leafling do not have. It is not the ordinary high-tap jump played faster. The
row is a mature, catlike aerial performance: read the flight path, coil, launch,
bank through the air with the tail steering, reach at the apex, then land with
weight and composure.

## Construction

- One eight-pose horizontal source strip on flat `#ff00ff`.
- 160 x 128 transparent runtime cells; row 12 of the stage atlas.
- Canonical facing is screen-right. The renderer mirrors the complete row for
  a left-side target.
- Ground anchor is `(80, 120)` for planted poses.
- The artwork owns compression, lift, bank, twist, reach, landing, and recovery.
- The world engine owns facing, target interception, horizontal travel, camera,
  and encounter completion.

## Performance drawings

1. Read the high flight path and hold.
2. Deep asymmetric coil with haunches loaded and tail counterbalancing.
3. Explosive diagonal launch.
4. Long rising extension with one forepaw leading.
5. Banked aerial turn: chest partly toward camera, body curled, tail steering.
6. Suspended reaching apex, silhouette fully open toward screen-right.
7. Four-paw landing compression with mantle and tail following through.
8. Proud, calm recovery looking back toward the visitor's path.

The bank is a readable piece of aerial body acting, not a renderer rotation or
whole-sprite spin. The face remains recognizable in every drawing. No motion
lines, dust, sparkles, shadow, scenery, detached effects, or captured prey.

## Timing target

Anime-inspired limited timing: a readable 180 ms sightline hold; fast 70/55 ms
coil and launch; a 65 ms rising connection; a quick 75 ms bank; a held 150 ms
directional reaching apex; a weighty 110 ms landing; and 260 ms recovery.

# Evaluate Learning: Seamless Focus environments

## Learning questions

- Do the repaired musical tracks disappear into the background across at least three boundaries?
- Do 30-second generated nature loops become predictably repetitive during an ordinary Focus session, or do they need longer assembled masters?
- Does Music/Nature grouping keep the picker legible with twelve total choices including No audio?
- After source repair, does iOS still expose a transport gap while foregrounded, locked, or backgrounded?

## Evidence

- Automated source measurements and three-repeat audition renders for all eleven remote tracks.
- Fixed-volume listening notes for headphones and iPhone speaker.
- Simulator proof for selection/persistence only.
- Signed physical-iPhone proof for background, lock, silent switch, Bluetooth route, and repeated boundaries.

Supporting evidence: no audible boundary, no boundary silence, stable loudness, correct cache reuse, and a picker that can be scanned without hunting.

Disconfirming evidence: a recognizable cadence every loop, a repeated singular nature event, a click/gap on device, unexpected selection reset, or a menu too long to use comfortably.

## Instrumentation

Do not record which soundscape a person listens to. Existing local selection state is sufficient. Keep mastering measurements and manual acceptance notes in the audio manifest; use native crash breadcrumbs only for playback failures already covered by the service.

## Decision rule

- Promote tracks that pass automated policy and repeated physical-device listening.
- Re-master or replace any track with a recognizable boundary.
- If multiple corrected sources share a remaining iOS gap, build the native transport fix.
- If the picker is visually dense, move the same grouped rows into the Canonical small-set drawer without adding another settings surface.

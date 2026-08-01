# Guardian Aerial Acrobatics Visual QA

## Source correction

The generated strip contained eight strong drawings but started with an
airborne extension instead of the requested sightline hold. The approved row
therefore uses the established Guardian upward-attention drawing as frame 1,
then deterministically orders seven generated drawings into coil, launch, rise,
bank, reach, landing, and recovery.

Two source poses overlapped horizontally in the generated sheet. Assembly keeps
only the largest connected character component inside each selected crop,
removing intruding pixels from neighboring poses before nearest-neighbor
normalization. All eight approved cells stay inside the 160 x 128 cell with the
ground anchor at `(80, 120)`.

## Runtime review

Reviewed in the authored meadow at a 390 x 844 mobile viewport:

- `runtime-guardian-aerial-apex.png`: frame 6 of 8. The sky moth is high and to
  the left; Guardian is airborne, mirrored left, and visibly reaches toward it.
  The directional reach—not the front-facing bank—owns the 150 ms apex hold.
- `runtime-guardian-aerial-landing.png`: frame 7 of 8. All four paws compress
  into the ground plane; the character does not float or land on a detached
  disk.
- After the 260 ms recovery, the world returned to `idle` and the visitor
  readout returned to `quiet`.

The encounter initially allowed the moth to cross behind Guardian after launch.
Runtime review caught the resulting composition mismatch. The behavior engine
now makes an engaged visitor evade outward on the committed side, preserving
the same visible relationship through the entire shot and preventing a reverse
retry.

## Palette review

`palette-apex-contact-sheet.png` captures the held reaching apex in moss,
lagoon, ember, clay, and sky. The stepped sky-moth silhouette keeps a dark edge,
bright wing field, and distinct body in all five treatments; Guardian's cream
face, reaching paws, and tail-led diagonal remain legible against both cloud and
mountain detail.

Family playtesting should still judge whether the moth is charming enough and
whether the acrobatics feel surprising after repeated encounters. Those are
experience questions rather than missing atlas, direction, grounding, or
palette evidence.

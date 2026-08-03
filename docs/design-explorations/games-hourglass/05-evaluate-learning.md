# Evaluate Learning: Games Hourglass

## Learning questions
- Is the fixed one-minute utility enough for the physical-game moment?
- Is flipping more immediate and satisfying than operating a generic countdown?
- Does the animation remain legible without becoming distracting?
- Does optional music strengthen play, or does it compete with conversation?
- Does Physical arm and flip reliably without accidental starts?
- Do people naturally prefer Physical, Classic, or Simple for different table positions?

## Evidence plan
Use each style in at least three real timed turns, including Physical on a signed phone. Note whether anyone needs instruction, mistrusts the finish, triggers a false start, reaches for touch instead of motion, asks for another duration, or keeps music enabled.

Supporting evidence is starting within seconds, leaving the phone visible through the turn, noticing the finish without alarm, and naturally flipping again. Disconfirming evidence is duration workarounds, accidental reset, timer drift, visual confusion, or immediate music muting.

## Instrumentation
No behavioral analytics are needed for this Andrew-first release. Use direct observation and device/runtime logs only for failures.

## Decision rule
- Keep and release normally if three real turns complete accurately and the interaction needs no explanation.
- Simplify if controls or animation distract from the countdown.
- Add duration choice only after repeated real-game demand.
- Keep Physical as the default only if end-over-end turns are dependable and naturally understood; otherwise retain it as an optional face.
- Commission a dedicated track only if music is naturally used and the borrowed bed feels mismatched.

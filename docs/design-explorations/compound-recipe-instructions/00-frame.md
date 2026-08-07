# Frame: Compound Recipe Instructions

## What the user said

> Each phase needs to be represented coherently in the detail page and separately in Cook Mode.

## Restated in user voice

When Maya is deciding whether she can make a recipe and then cooking it with occupied hands, she wants the same trustworthy sequence to read naturally as an overview and deliver one useful action at a time, so she never has to reinterpret or relocate her place.

## Target audience and persona

`audience-aspirational-family-organizers`, represented by Maya. She wants to feed her household with less repeated work, not manage a recipe-production system.

## Hero anchor and job-flow steps

- `jtbd-move-the-few-things-that-matter`
- `jtbd-trust-this-app-with-my-life`
- Job-flow step 3: recognize whether the Recipe fits tonight.
- Job-flow step 16: cook one cue at a time.

## System alignment

Constraint posture: `Extend the system`.

Recipe versions already own ordered instruction records, while Cook Mode already derives deterministic cues and persists a global cue index. Extend each instruction into a phase that may contain ordered cues. Both Recipe Home and Cook Mode must consume one normalization path. Legacy and server-backed recipes without explicit cues remain valid as one-cue phases; the starter catalog can compile its authored sentences into stable cue records.

Preserve:

- immutable Recipe-version ownership;
- one dominant cue in Cook Mode;
- readable, non-card-heavy Recipe Home detail;
- existing touch, voice, timer, ingredient-reference, media, and resume behavior;
- no green outside an explicit brand moment.

## Aspirational design challenge

How might we help Maya understand the whole cooking sequence and then follow its smallest useful actions, while preserving one authoritative Recipe version and one-cue-at-a-time calm?

## Out of scope

AI rewriting, automatic semantic phase titles, a new recipe-authoring workflow, and backend schema migration.


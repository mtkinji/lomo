---
id: brief-compound-recipe-instructions
title: Compound recipe instructions
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop, object-detail-media-shell, global-recipe-catalog]
owner: andrew
last_updated: 2026-08-07
---

# Compound Recipe Instructions

## Context

Recipe Home currently renders each stored instruction as one paragraph, and Cook Mode treats that paragraph as one cue. The 500-recipe starter catalog contains 2,410 stored instructions; 2,190 contain multiple sentences, all 500 recipes contain at least one compound instruction, and 799 instructions contain three or more sentences. The structure is therefore a catalog-wide need, not a pancake exception.

## Target audience

Aspirational family organizers need a trustworthy cooking sequence without turning food into another system to administer.

## Representative persona

Maya needs to understand whether a Recipe is practical, then cook it while her hands and attention are occupied. She should not have to translate a paragraph differently on Recipe Home and in Cook Mode.

## Aspirational design challenge

How might we help Maya understand the whole cooking sequence and then follow its smallest useful actions, while preserving one authoritative Recipe version and one-cue-at-a-time calm?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — feeding the household is real progress; the UI should remove rereading and re-entry rather than add recipe administration.

## Job flow step

This improves step 3, “Recognize whether it fits tonight,” and step 16, “Cook one cue at a time,” in `job-flow-maya-feed-household-with-less-work`.

## JTBD framing

When Maya is deciding whether she can make a recipe and then cooking it with occupied hands, she wants the same trustworthy sequence to read naturally as an overview and deliver one useful action at a time, so she never has to reinterpret or relocate her place. This serves `jtbd-move-the-few-things-that-matter` and the calm reliability of `jtbd-trust-this-app-with-my-life`.

## Design

### Shared structure

An existing Recipe instruction is a phase. A phase owns stable identity, position, an optional meaningful label, full text for portability, and zero or more explicit ordered cues. A cue owns stable identity, position, action text, and optional media identity. A shared normalizer returns explicit cues when present and one legacy cue when absent.

The starter catalog compiler converts the already authored sentence boundaries inside each phase into stable explicit cues. It does not split semicolon clauses or invent phase titles. Server-loaded and user-authored Recipes remain backward compatible as one-cue phases until a reviewed authoring path exists.

### Recipe Home projection

Recipe Home displays one neutral numbered circle per phase. The phase's cues appear as separate action lines in one text column. Meaningful labels may sit above a phase; the generic catalog label “Cook” does not render. The screen adds no cards, sub-number badges, controls, or legend.

### Cook Mode projection

Cook Mode flattens the same ordered phases into cues. The action text remains dominant. Context reads `Phase 2 of 5 · Action 1 of 2` when a phase has multiple cues, and `Phase 1 of 5` when it has one. Next/back/voice advance cues; the phase changes only after its last cue. Ingredient references, timers, readiness cues, and media derive from the current cue. Cached sessions created against phase-only cue counts reconcile to the first cue of their previous phase.

### UI contract

- Job: when reading or cooking a Recipe, Maya needs to understand the sequence and act on one useful instruction so she can cook without rereading.
- Authority: this brief, the Meals job flow, local Recipe contracts, the Object Detail Candidate, and the existing Cook Mode local composition.
- Three-second read: Recipe Home — Instructions and ordered phases; Cook Mode — current action and phase context.
- Primary action: Recipe Home — Continue cooking; Cook Mode — Next/Finish.
- Primary information: phase order on detail; current cue in Cook Mode.
- Secondary information: phase/action position, current ingredients, timer/media affordances.
- Reveal later: import-boundary editing, semantic titles, and richer technique guidance.
- Scan order: Instructions → phase number/title → cue lines; Cook Mode action → ingredients/readiness → transport.
- Must not add: cards per phase, a mode switch, green state styling, automatic AI rewriting, or duplicate instruction storage.
- Proof path: Meals → Buttermilk pancakes → Instructions → Continue cooking on the owned iPhone 17 Pro Simulator, including portrait and landscape.

## Success signal

Buttermilk pancakes still reads as five coherent phases on Recipe Home, while Cook Mode exposes the two bowl-whisk actions separately with correct phase/action context. All 500 starter Recipes compile to non-empty ordered cues, and existing legacy Recipes remain valid.

## Spec refinement

- Explicit cue identity is optional at the persisted Recipe boundary for this release; legacy content normalizes safely.
- Starter-catalog sentence boundaries are accepted as authored migration boundaries; semicolon clauses remain together.
- Backend cue persistence and independent cue editing are intentionally deferred because they require a separately reviewed authoring/data migration.
- Existing phase-level media attaches to the first cue unless a cue-specific media reference exists.
- Active cached sessions reconcile only when the cue count changed; phase position is preserved and timers retain their first-cue identity.

## Open questions

- After local cooking evaluation, should semantic phase titles become an explicit authoring field?


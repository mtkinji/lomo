---
id: brief-family-recipe-capture
title: Intent-first family recipe capture
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop]
owner: andrew
last_updated: 2026-08-06
---

# Intent-first family recipe capture

## Context

Recipe capture already supports links, text, voice dictation, photos, evidence review, and manual entry, but its first choice is framed around transport. A person preserving family food knowledge should not have to understand Kwilt’s import mechanics before beginning.

## Target audience

Aspirational family organizers want to preserve recipes their household actually uses without becoming cookbook administrators.

## Representative persona

Maya has a family sourdough crepe recipe and also wants a dependable standard crepe recipe. She needs two trustworthy, separately findable Recipes—not a configurable variant system.

## Aspirational design challenge

How might we help Maya bring over a family recipe and a familiar alternative in the form each already exists, while preserving exact wording, private ownership, and one calm next action?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — preserved food knowledge should make the next real meal easier.

## Job flow step

Improve steps 1–2 of `job-flow-maya-feed-household-with-less-work`: collect what is worth keeping and make the recipe trustworthy.

## JTBD framing

When food knowledge is worth keeping, capture it without transcription becoming admin (`jtbd-capture-and-find-meaning`) and make the review, privacy, and completion states dependable (`jtbd-trust-this-app-with-my-life`).

## Design

The Add Recipe drawer offers three intent-led choices:

1. **Family recipe** — photo, paste, dictate, or type.
2. **Recipe from the web** — import from one link.
3. **Start blank** — use the existing manual editor.

Family and web entry render focused states without a mode switch. Both use the existing import repository and evidence-backed review editor. Family capture states that the draft stays private to the household and nothing saves before review. Successful manual and imported saves replace the editor with the resulting Recipe Home.

No Recipe variant model is introduced. Sourdough and standard crepes remain separate private Recipe identities and are distinguishable by title, source, description, and ingredients.

## Acceptance criteria

- Add Recipe choices are understandable without knowing import terminology.
- Family entry exposes camera, photo library, paste, and keyboard dictation in one surface.
- Web entry asks only for a URL.
- Extracting, error, review, and saving states remain explicit.
- Successful save opens the authoritative Recipe Home.
- Back navigation protects unsaved reviewed changes.
- Dynamic Type, keyboard, scrolling, touch labels, and narrow width remain usable.
- No ingredient, method, or family attribution is invented.

## Spec refinement

The family recipe’s exact content is intentionally unresolved and is a user input, not an implementation assumption. The standard recipe may be imported as a private, person-owned copy from its attributed public source through the finished UI. This release does not alter backend authority or publishing rights.

## Success signal

Andrew adds the standard crepe recipe from its source and can immediately explain how he would capture the family sourdough version, with both paths ending at a trustworthy Recipe Home.

## Open questions

- Which physical or digital source holds the family sourdough recipe?

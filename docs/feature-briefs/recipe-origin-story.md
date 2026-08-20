---
id: brief-recipe-origin-story
title: Recipe origin story
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-08-20
---

## Context

Catalog Recipes need consistent equipment, origin, history, and imagery. Place must be rendered from reviewed structured data, not generated as illustrative artwork.

## Target audience

Aspirational family organizers want trustworthy recipes without learning a research or mapping tool.

## Representative persona

Maya is deciding whether a meal looks good and belongs in the household’s real cooking rhythm.

## Aspirational design challenge

How might we help Maya understand a meal’s place and story while preserving a calm Recipe Home and an honest boundary around AI output?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — reduce the work between finding a plausible meal and cooking it.

## Job flow step

Maya feed-household step 3, “Recognize whether it fits tonight,” score 1: Recipe Home needs better media, readiness, source, and hierarchy.

## JTBD framing

When a recipe is unfamiliar, Maya wants enough credible place and historical context to recognize what it is and trust the recipe, without losing the practical cook path.

## Design

- AI produces researched drafts with coordinates, map framing, three-digit ISO country IDs, history, sources, and exact recipe-grounded equipment.
- Drafts do not become reviewed records automatically.
- Reviewed records render in one Recipe Home section using `react-native-maps` and geographic markers.
- Hero-image prompts explicitly prohibit maps, globes, flags, and cartographic graphics.
- Missing or pending enrichment adds no placeholder section.

## Success signal

One reviewed Recipe Home can show a real map and nuanced sourced history while the title, meal image, ingredients, method, and cooking action retain hierarchy.

## Spec refinement

The initial learning release uses a non-interactive map to protect scrolling and avoid implying directions. Runtime visual and VoiceOver proof remain required before promotion.

## Open questions

- Whether long histories should collapse after real-device visual review.

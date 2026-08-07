---
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
---

# Frame: Family recipe capture

## What the user said

> I have a family recipe for sourdough crepes, and need another for non sourdough crepes. Make sure the UX/UI for getting those added is extremely good.

## Restated in user voice

When one crepe recipe lives in family memory and I also need a dependable standard version, help me preserve both as clearly distinct recipes without transcription becoming a project, so I can find the right one and trust what was saved.

## Target audience

`audience-aspirational-family-organizers` — people preserving useful family knowledge without wanting to administer a cookbook system.

## Representative persona

Maya has a recipe card, note, or remembered method worth keeping and wants a familiar alternative beside it.

- Current situation: the recipe may be on paper, in Notes, or in someone’s words.
- What she is trying to do: get both recipes into Meals accurately and findably.
- Emotional tension: family wording matters, but a long form feels like work.
- What would feel wrong: invented details, unclear privacy, or merging two meaningfully different recipes into one “variation.”

## Hero anchor

`jtbd-move-the-few-things-that-matter` — preserving food knowledge should remove work from future cooking and planning.

## Job flow step

Steps 1–2 of `job-flow-maya-feed-household-with-less-work`: collect what is worth keeping, then make the recipe trustworthy. The implementation already supports photo, text, URL, manual entry, review, and private Recipe versions; the entry UI currently asks for transport before intent and the manual save return path does not reveal the saved recipe.

## Active anchors

- `jtbd-capture-and-find-meaning` — capture must stay lighter than transcription.
- `jtbd-trust-this-app-with-my-life` — Kwilt must not invent or lose family recipe details.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: the Meals inventory dock opens `RecipeCaptureDrawer`.
- Existing flow: capture choice → import or manual entry → review → private recipe.
- Existing model: Recipe owns immutable versions, provenance, and private access.
- Existing affordances: URL/text/photo extraction, evidence review, manual editor, Recipe Home.
- Existing convention: one dominant next action and quiet progressive disclosure.

Constraints to preserve:

- Never invent Andrew’s sourdough ingredients or method.
- Keep sourdough and standard crepes as separate Recipe identities.
- Preserve source/story without requiring cookbook organization.
- Nothing saves until the user reviews it.

## Aspirational design challenge

How might we help Maya bring over a family recipe and a familiar alternative in the form each already exists, while preserving exact wording, private ownership, and one calm next action?

## Out of scope

Recipe-family graphs, variant inheritance, public publishing, collections, and automatic substitution between sourdough and standard batter.

## Open question

The family sourdough recipe’s exact source content still has to come from Andrew; Kwilt must make providing it effortless rather than filling the gap itself.

# Frame: Contextual Recipe Chat

## What the user said
> Add the contextual AI affordance to chat about this meal, with contextual offers such as ingredient substitutions and a personal recipe revision.

## Restated in user voice
When I am looking at a meal and need to make it work for real life, help me ask from the recipe I already have so I do not need to restate its ingredients, method, or context.

## Target audience
`audience-aspirational-family-organizers` — people who want family food to take less repeated work.

## Representative persona
Maya is deciding whether and how a recipe can work for her household tonight. She is not trying to operate an AI recipe studio.

- Current situation: the recipe looks promising, but one practical constraint may block it.
- What she is trying to do: adapt the meal without losing the trustworthy original.
- Tension: substitutions and revisions are useful only when the recipe remains understandable and under her control.
- What would feel wrong: a generic Chat with no recipe facts, or an AI rewrite that silently replaces the original.

## Hero anchor
`jtbd-move-the-few-things-that-matter` — carry the household food decision forward with less work.

## Job flow step
Step 3, **Recognize whether it fits tonight**, is scored 1. Recipe Home now improves appetite, effort, servings, and planning hierarchy; practical adaptation still requires leaving the recipe or restating it elsewhere.

## Active anchors
- `jtbd-move-the-few-things-that-matter` — remove friction between finding a recipe and making it workable.
- `jtbd-trust-this-app-with-my-life` — preserve explicit evidence, review, and mutation authority.

## Friction we're addressing
Recipe Home contains the facts, while ordinary Chat starts without a useful recipe-shaped invitation. Maya has to invent a prompt and repeat context before getting help.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Recipe Home already uses the canonical left-anchored Action Dock.
- Recipes inventory, Goals, and To-dos already launch the shared Unified Chat drawer.
- Fresh contextual Chat already supports visible removable scope and creates no durable thread until first send.
- Recipe versions are immutable; changes require capability-owned review and an explicit commit.

Constraints to preserve:
- One durable Chat destination, no recipe-specific assistant.
- Recipe facts are authorized evidence, not copied into hidden prompt prose.
- Offer cards begin conversations immediately and do not claim a Recipe write.
- The original recipe remains unchanged until an explicit reviewed recipe operation exists and is accepted.

Design implication: add one standard Chat action beside the Recipe Home dock and let the native host provide recipe-specific starter cards to the shared workbench.

## Aspirational design challenge
How might we help Maya turn a promising recipe into a workable household meal, while preserving the trusted original and explicit control over changes?

## Out of scope
Automatic recipe mutation, silent pantry inference, a new recipe-chat backend, or a replacement for Meal Plan, Groceries, and Cook Mode.

## Open question
Which offer becomes the most common natural first turn after dogfooding?

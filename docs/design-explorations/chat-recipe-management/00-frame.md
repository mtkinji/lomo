# Frame: Chat Recipe Management

## What the user said
> Chat needs the ability to create and manage recipes directly from within it. Add that now.

## Restated in user voice
When a recipe idea or correction is already being discussed in Chat, help me turn it into a trustworthy private Recipe without making me repeat the work in another screen, so I can keep feeding my household with less transcription and less doubt.

## Target audience
`audience-aspirational-family-organizers` — family organizers who want ordinary household follow-through without maintaining a productivity system.

## Representative persona
Maya is discussing a dish while deciding what her family might eat. She wants the useful result preserved, but does not want Chat to silently rewrite family knowledge.

## Hero anchor
`jtbd-move-the-few-things-that-matter` — carrying a useful food idea into a real household recipe is the progress, not producing more chat text.

## Job flow step
Steps 1–2 of `job-flow-maya-feed-household-with-less-work`: collect what is worth keeping and make the recipe trustworthy. Both currently score 2/5 because capture and review exist in Recipes, but Chat cannot carry the conversation into the durable Recipe record.

## Active anchors
- `jtbd-capture-and-find-meaning` — preserve the useful recipe at the moment it appears.
- `jtbd-trust-this-app-with-my-life` — make every write inspectable, versioned, and explicitly approved.

## Friction we're addressing
Chat can read Recipe evidence and discuss a new recipe, but its mobile runtime cannot stage Recipe mutations. It therefore produces a dead-end refusal even when the canonical agent manifest already describes create, update, and delete operations.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Unified Chat proposal cards, decisions, receipts, and Recipe return targets.
- Existing user flow: the model selects typed tools; Chat stages reviewed proposals; the owning capability applies approved changes.
- Existing domain/data model: private Recipe identity plus immutable versions, optimistic version checks, soft deletion, and Recipe-owned storage/cache refresh.
- Existing technical affordances: Recipe evidence adapter and canonical `recipes.create`, `recipes.update`, and `recipes.delete` tool contracts already exist.
- Existing UX/copy conventions: proposals describe the exact consequence; prose alone never proves a write.

Constraints to preserve:
- Recipes owns validation, persistence, optimistic concurrency, and deletion semantics.
- Create, update, and delete require review; no silent recipe mutation.
- Existing public catalog recipes are not treated as editable private records.

Design implication:
Extend the shared proposal and receipt lane to Recipes and teach the mobile tool provider to stage complete reviewed Recipe data. Do not add a separate Chat mode or shortcut users into Recipe Edit as the primary behavior.

## Aspirational design challenge
How might we help Maya preserve and correct a family recipe without leaving the conversation, while preserving Recipe authority and explicit review?

## Out of scope
Recipe publication, rights attestation, collaborator invitations, image extraction, and Meal Plan changes.

## Open question
None blocks the learning release; imported source material continues to use the existing import-review contract.

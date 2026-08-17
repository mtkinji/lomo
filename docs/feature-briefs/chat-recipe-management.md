---
id: brief-chat-recipe-management
title: Chat Recipe Management
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-unified-chat, brief-family-recipe-capture]
owner: andrew
last_updated: 2026-08-16
---

# Chat Recipe Management

## Context
Unified Chat can read authoritative Recipe evidence and the canonical tool manifest already describes Recipe mutations, but the mobile execution lane cannot stage or apply them. A conversation that produces a recipe therefore dead-ends at the moment the user asks Kwilt to preserve it.

## Target audience
Aspirational family organizers need the food cycle to carry forward without rebuilding the same knowledge in several surfaces.

## Representative persona
Maya has already done the thinking in Chat. She wants that work preserved as a private family Recipe, while retaining a clear chance to catch mistakes before it becomes durable.

## Aspirational design challenge
How might we help Maya preserve and correct a family recipe without leaving the conversation, while preserving Recipe authority and explicit review?

## Hero JTBD
`jtbd-move-the-few-things-that-matter` — the useful outcome is moving the household food decision forward, not generating a longer answer.

## Job flow step
`job-flow-maya-feed-household-with-less-work`, steps 1–2: collect what is worth keeping and make it trustworthy. Current delivery is 2/5; this brief closes the Chat-to-durable-Recipe handoff but does not yet prove import extraction or signed-device capture.

## JTBD framing
When a recipe idea or correction is already in Chat, help me capture it where I am and review exactly what will change, so I can trust Kwilt with family food knowledge without repeating the work.

## Design
- Add Recipes to Unified Chat's runtime action lane.
- `recipes.create` stages a complete reviewed private Recipe payload.
- `recipes.update` resolves an authoritative Recipe, merges a bounded patch into its complete current version, and stages the next immutable version with the current optimistic version.
- `recipes.delete` resolves an authoritative private Recipe and stages an explicitly destructive soft-delete proposal.
- All writes use existing proposal decisions. Approve calls Recipe-owned persistence and refresh; reject/defer do not mutate.
- Applied receipts use capability `recipes`, object type `recipe`, and the existing Recipe Home return target. Deleted recipes have no open target.
- Chat prose may describe only staged or receipt-backed outcomes.

## Acceptance criteria
- Natural create, update, and delete requests route to Recipes and require typed tool execution.
- Invalid or ambiguous Recipe targets produce a useful boundary, not a guessed write.
- Update preserves every field outside the requested patch and rejects stale versions.
- Approval persists through the Recipe repository and refreshes the Recipe store.
- Reject/defer perform no Recipe write.
- Proposal and receipt mapping survives thread reload.
- Focused tests cover tool staging, decision execution, repository mapping, routing, and return navigation.

## Spec refinement
The existing manifest's generic Recipe objects are not sufficiently buildable. The mobile provider will accept a bounded Recipe draft/patch shape and translate it into the existing strict `ReviewedRecipeData`; the backend contract and immutable Recipe schema remain unchanged. Undo is intentionally omitted from Chat receipts for this learning release because Recipe update/delete undo lacks an authoritative repository contract; “reversible” means a follow-up version can correct content, not that Chat should expose an unsafe one-tap undo.

## Success signal
Local Chat can stage, approve, reload, and open create/update/delete Recipe outcomes with no loss of unchanged content and no unsupported-action refusal.

## Open questions
- Does signed-device dogfood show that the proposal card is scannable enough for long recipes?

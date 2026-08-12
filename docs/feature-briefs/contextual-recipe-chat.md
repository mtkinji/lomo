---
id: brief-contextual-recipe-chat
title: Contextual Recipe Chat
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [unified-chat, object-detail-media-shell]
owner: andrew
last_updated: 2026-08-12
---

# Contextual Recipe Chat

## Context
Recipe Home now helps Maya understand and plan a meal, but practical adaptation still requires leaving the recipe or opening generic Chat and repeating what is already on screen.

## Target audience
Aspirational family organizers want the food cycle to take less repeated work without operating a meal-planning or AI system.

## Representative persona
Maya has found a promising recipe and needs to account for a missing ingredient, household variation, limited time, different servings, or what is already in the kitchen.

## Aspirational design challenge
How might we help Maya turn a promising recipe into a workable household meal, while preserving the trusted original and explicit control over changes?

## Hero JTBD
`jtbd-move-the-few-things-that-matter` — help carry a real household meal decision forward.

## Job flow step
`job-flow-maya-feed-household-with-less-work`, step 3: **Recognize whether it fits tonight**. Recipe Home's visible facts are improving, but practical adaptation is not yet contextual or connected.

## JTBD framing
When Maya is looking at a recipe and needs to make it work for real life, she wants help grounded in the recipe she already has, so she can decide and adapt without restating everything or losing control of the original.

## Design
- Add the standard `navAiGuide` Chat control as the Recipe Home Action Dock's separate right item. Keep the plan-first split action left aligned.
- Open the canonical `UnifiedChatDrawer` at its existing 60%/100% snap points with title `Chat about this meal`, placeholder `Ask about this meal`, and a removable Recipe scope chip.
- A fresh Recipe detail launch projects four host-owned contextual offer cards into the shared workbench:
  - **Swap an ingredient** — ask which ingredient and constraint matter before recommending a consequence-aware swap.
  - **Make it ours** — talk through a personal variation and show the revision before anything is saved.
  - **Fit tonight** — ask about time, servings, and equipment before adapting.
  - **Use what we have** — ask what is in the kitchen and separate workable swaps from remaining needs.
- Selecting a card immediately submits its full prompt through the ordinary Chat send path. The request appears as the first user turn in the timeline and the response begins without a second tap.
- First send creates the normal durable Chat thread and attaches the exact Recipe identity/version. Recipe evidence includes title, description, effort, yield, ingredients, instructions, and notes.
- The workbench receives credential-free snapshot data and validates at most six bounded offers. The native host remains the authority for context and copy.
- This release is analysis-first. A card and assistant prose cannot claim that a Recipe version was saved. Recipe mutation remains a capability-owned reviewed operation with an explicit apply result.

## UI contract
Job: When a visible recipe almost fits, help the person ask the smallest useful adaptation question so the meal can move forward.

Authority chain: user decision → food job flow and Recipe contracts → Kwilt Action Dock and Unified Chat → local tokens/components → standard native accessibility behavior.

Three-second read: meal-plan action left, Chat action right; after launch, four recognizable ways to make the recipe work.

Primary action: Add to/Open Meal Plan remains primary on Recipe Home. In Chat, sending the edited prompt is primary.

Reveal later: actual answer, proposals, and any future Recipe apply/receipt flow.

Must not add: header crowding, AI label, auto-send, carousel, new settings, pantry claims, or silent recipe writes.

Required states: fresh contextual cards, optimistically visible submitted offer, active response, durable thread reopen, context removed, unavailable recipe, and no-offer fallback watermark.

Proof path: Recipe Home on iPhone 17 Pro Simulator → Chat dock control → four cards → select → request appears in timeline and response begins → inspect recipe evidence → close and return.

## Activation and learning release
Activation is organic at Recipe Home, where the person can already see the meal's facts. Ship first as a local build. Observe comprehension, offer selection, evidence use, and mutation expectations before adding Recipe proposal persistence.

## Success signal
A person selects a useful offer without instruction, immediately sees it as a user turn, receives a response grounded in the exact recipe, and returns to Recipe Home without an accidental or implied write.

## Spec refinement
- The four offers are a bounded first ranking, not personalization.
- “Make it ours” is intentionally conversational until Recipe proposal/apply/receipt support is complete.
- Existing Quick Start card anatomy is reused; contextual offers replace the fresh drawer watermark only when the native host supplies them.
- Acceptance requires native and hosted protocol tests, focused Recipe evidence tests, diff-aware app verification, site tests/typecheck, and actual Simulator visual/interaction proof when the runtime is available.

## Open questions
- Does “Make it ours” need more explicit “draft” language after observed use?
- Which offer should lead after dogfooding?

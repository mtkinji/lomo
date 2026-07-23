# Learning Release: Chat Turn-Coherent Timeline

## Concept To Build

Render Unified Chat as a chronological stack of causally coherent turns, with live progress inline and durable evidence, decisions, and outcomes anchored to the request that produced them.

## Capability Delta

Today, the user cannot:

- Continue a resumed thread without new messages appearing above older evidence, proposals, and receipts.
- Reliably tell which prompt owns the active Working indicator or a durable action artifact.
- See a later correction to an old artifact without either searching backward or risking duplicated history.

After this release, the user can:

- Continue from the bottom of a thread whose prior turns remain complete and stable.
- See Working directly beneath the request being processed.
- Understand each turn's answer, evidence, proposal, and receipt as one causal sequence.
- Undo or correct an older artifact and see both its updated truth and one compact latest-action acknowledgement when needed.

Still intentionally not supported:

- AI-selected ordering, manual reordering, an action shelf, or a full audit feed.
- Visible internal reasoning or low-value persistence events.

## User Experience

The user reopens a Chat containing an earlier action turn. Its evidence, proposal, and receipt remain directly beneath the earlier request. The user sends a new prompt; it appears below the entire earlier turn and Working appears immediately below it. As the run resolves, its answer and any supporting artifacts fill that same turn without moving older or newer turns.

If the user later acts on an old receipt after newer turns exist, the old receipt updates to its current truth and a compact correction echo appears at the bottom. Immediate same-turn corrections update in place.

## Existing Product Relationship

This enhances the existing hosted Unified Chat timeline and keeps all existing record renderers, native bridge ownership, proposal policy, receipts, composer behavior, and exact-return navigation. It replaces type-bucket rendering; it does not add another product surface.

## Buildable Slice

Must be real:

- An ordered, versioned turn projection referencing durable messages, runs, evidence, proposals, and receipts.
- Stable optimistic-turn insertion and reconciliation.
- Deterministic within-turn semantic ordering.
- Inline active, failed, stopped, retry, and completed run placement.
- Correct resumed-thread ordering across multiple completed turns.
- Original-artifact updates plus bounded correction echoes for later user-initiated changes.
- Scroll anchoring to the active/latest turn without moving the user's viewport unexpectedly while reading history.
- Protocol, projection, renderer, and regression tests.

Can be thin or temporary:

- Turn grouping may rely on spacing and existing card margins before introducing any new visual connector.
- Correction echoes may use existing compact receipt styling.
- Developer-only invariant diagnostics may report orphaned artifacts without new production analytics.

Intentionally excluded:

- Database migration when existing run/message/proposal relationships can produce the projection.
- New user settings, timeline filters, turn labels, timestamps on every row, or artifact drag-and-drop.
- Cross-thread aggregation.

## Release Channel

**TestFlight build** after signed-in simulator regression proof. The workbench should accept both the current projection and the new turn projection during rollout so the deployed web surface and native builds remain compatible. Physical-iPhone resume, scrolling, optimistic insertion, and correction behavior are required learning evidence.

## Brand-Goodwill Guardrails

- Never move an older turn below a newer turn.
- Never invent ownership for an orphaned artifact; omit it with internal diagnostics or show an honest bounded failure state.
- Keep current state truthful without flooding the timeline with internal transitions.
- Do not log message content for ordering analytics.

## Reversibility

Keep existing durable arrays and renderers. Gate turn-aware rendering on the presence of a validated turn projection, with the existing renderer available as a temporary rollback path during the TestFlight learning window. No user data migration or destructive rewrite is required.

## Permanent Product Threshold

Promote the turn-aware renderer when simulator and physical-device runs prove multi-turn resume, live Working placement, optimistic reconciliation, evidence/proposal/receipt ownership, later correction behavior, accessibility reading order, and stable scrolling without contradictory or duplicated history.

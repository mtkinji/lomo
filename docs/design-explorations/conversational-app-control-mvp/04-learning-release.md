# Learning Release: Conversational App Control MVP

## Concept To Build

Kwilt Chat controls the app's current capabilities from ordinary language.

## Capability Delta

Today, the user cannot reliably create a recurring reminded Activity in one conversation, ask what is officially on tomorrow's Plan, or create a Goal and immediately turn it into repeating follow-through.

After this release, the user can state those intentions naturally, let Chat inspect the minimum relevant state, complete low-risk work or review consequential work, and receive a truthful saved result.

Still intentionally unsupported: Screen Time enforcement before the native capability exists; silent external, shared, destructive, subscription, or household actions; image understanding; general background projects; Phone Agent parity.

## User Experience

The user types or speaks in existing Chat. Kwilt answers reads directly, asks at most one necessary clarification, performs low-risk reversible work, and presents native confirmation only when required. The result is the resulting Goal, Activity, Plan placement, or handoff—not instructions for doing it manually.

## Existing Product Relationship

Chat controls existing capabilities. It does not replace their screens, models, priority methods, permissions, or undo.

## Buildable Slice

Must be real:

- Activity create with recurrence and reminder.
- Authoritative Plan read for a requested date.
- Goal create followed by a linked repeating-Activity suggestion and apply path.
- Operation coverage that fails when a current operation lacks a conversational route or explicit boundary.
- Signed-build proof of saved state, reload, and undo where supported.

Can be thin: plain text confirmation, minimal evidence display, and one clarification at a time.

Intentionally excluded: Phone Agent and server deployment as blockers, timeline refinement, and new native capability development.

## Release Channel

TestFlight for Andrew-only dogfooding after signed-simulator proof.

## Brand-Goodwill Guardrails

- Never say an action completed until the owner confirms it.
- Preserve the user's wording for names and titles.
- Ask only for information required to complete the operation.
- Keep consequential confirmation explicit and specific.

## Reversibility

The Chat feature flag can hide the surface. Capability mutations retain existing undo or recovery. No MVP operation creates a parallel data model.

## Permanent Product Threshold

The standing command matrix succeeds across fresh and resumed conversations, and failures state an actionable boundary rather than producing unrelated prose.

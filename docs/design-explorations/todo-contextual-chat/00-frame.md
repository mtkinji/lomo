# Frame: Contextual Chat From To-dos

## What the user said

> Add an AI button to the right of Search in the To-dos bottom row. Let the user stay in the context of To-dos, while producing a real conversation that also exists in Chat.

## Restated in user voice

When I am looking at my to-dos and need help making sense of or acting on them, I want to ask from right here without restating what I am looking at or entering a separate AI mode, so I can move the work forward and continue the same conversation later in Chat.

## Target audience

`audience-ai-native-life-operators` — people who expect AI help to be callable from the work in front of them, with visible scope and durable continuity.

## Representative persona

Nina is looking at a real To-dos inventory and wants to ask a practical question about it.

- Current situation: the visible list and selected view already express useful context.
- What she is trying to do: ask naturally, inspect any proposed change, and return to the authoritative list.
- Emotional state or tension: interested in leverage, but wary of hidden context and parallel AI workflows.
- What would make this feel wrong: an empty generic chat, a non-durable coach drawer, an AI-only task editor, or a thread that silently inherits stale scope.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — contextual help is only useful if its scope, actions, and continuity remain legible.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, especially:

- Step 1, arrive with visible scope and an exact return destination: delivery score 4, but contextual entry currently lives in the standalone Chat navigation path rather than directly beside To-dos.
- Step 10, resume later: delivery score 4 through durable Unified Chat threads, but the legacy To-do coach drawer does not share that durable thread model.

Marcus and Maya are secondary design lenses: the affordance should reduce list-management work, not introduce another planning layer or require AI vocabulary.

## Active anchors

- `jtbd-get-help-without-retelling-my-life` — the To-dos surface should carry a visible, bounded launch context.
- `jtbd-stay-in-control-of-ai-actions` — To-dos remains the authoritative editor and mutation owner.
- `jtbd-move-the-few-things-that-matter` — the conversation should help the user reach a useful native outcome, including one rich action or a complete bounded set of repetitive changes, not celebrate task volume.

## serves snippet

`serves: [jtbd-get-help-without-retelling-my-life, jtbd-stay-in-control-of-ai-actions, jtbd-move-the-few-things-that-matter]`

## Friction we're addressing

The To-dos screen has a strong capture dock and Search affordance, but help requires leaving the immediate surface or using the older Activity Coach workflow. That older drawer is optimized for creating suggested to-dos, writes through a separate workflow, and does not become a durable Unified Chat thread.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: To-dos already has a floating bottom row with Quick Add and Search; its layout reserves trailing space for sibling affordances.
- Existing user flow: Unified Chat already supports global, capability, and object launches, visible removable context, durable threads, capability-owned proposals and receipts, and exact native return.
- Existing domain/data model: Activities remain the plan-in-motion objects. Chat owns conversation records; To-dos owns Activity state and mutation policy.
- Existing technical affordances: `UnifiedChatLaunchContext` supports `todos` at inventory or Activity detail scope. The repository persists threads, messages, runs, context references, proposals, and receipts.
- Existing UX convention: `BottomDrawer` is already used throughout To-dos, and the capability menu represents Chat with the shared `navAiGuide` icon. The older `ActivityCoachDrawer` proves a full-height conversational drawer is technically possible, but it should not remain a second conversation backend.

Constraints to preserve:

- One durable Chat system; no To-dos-only transcript store or AI mode.
- Visible, removable scope; current screen location is not unlimited permission.
- To-dos remains visible or one gesture away and remains authoritative after changes.
- Capture-first Quick Add remains the dominant wide action.
- A contextual launch must not attach To-dos scope to an unrelated existing thread without an explicit choice.

Constraints we may challenge:

- Unified Chat currently presents as a standalone screen. The same conversation workbench needs an embeddable host presentation.
- The legacy Activity Coach drawer should be retired or reduced once Unified Chat covers its useful creation path.

Design implication: add a new doorway and presentation for the existing Chat capability, not a new coach. Preserve one thread identity while adapting its chrome to the To-dos host.

## Aspirational design challenge

How might we help Nina ask for practical help from the To-dos she is already looking at, while preserving visible scope, one durable Chat history, and To-dos as the authoritative place where changes become real?

The practical job includes both synthesis and operation: rich one-or-many capture, reminder/calendar coordination, and reviewable changes across every To-do matching an explicit bounded request.

## Out of scope

Ambient AI recommendations, automatic list reorganization, household visibility changes, new Activity fields, and a universal side-by-side shell redesign.

## Open question

Does repeated dogfood favor a fresh contextual thread per intent, or explicit resumption of a recent To-dos thread?

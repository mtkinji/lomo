# Capability conversation continuity — 2026-07-24

## Goal

Let people continue, correct, redirect, and combine Kwilt requests in ordinary language while preserving exact authoritative identity, optimistic versions, declared operation order, proposal review, native authorization, and honest failure boundaries.

## Architectural result

Kwilt Chat now persists one capability-independent `conversation_referent` envelope for pending work. Each ordered item carries its internal proposal identity, proposal version, capability owner, operation type, authoritative target identity when one exists, target optimistic version, user-safe label, and declared sequence.

The envelope is internal. Model grounding receives only the capability operation, safe label, and authoritative target/version needed for tool execution; proposal ids are deliberately omitted. Visible responses continue through `sanitizeVisibleAssistantText`, and typed control responses never interpolate machine identities.

Reload resolves the referent from the immediately preceding durable run event. For older or non-mobile channel work that did not emit the event, it reconstructs the same typed envelope from hydrated pending proposals attached to that run. A later unrelated run clears the short-follow-up referent by construction.

## Conversation matrix proven in code

| Conversation | Durable behavior | Evidence |
| --- | --- | --- |
| “No, the other one.” | With exactly two referenced proposals, rejects the first by exact id/version and keeps the second. Any larger or missing set asks which change. | `typedTurnControl.test.ts`; `runUnifiedChatTurn.continuity.test.ts` |
| “Move it to Friday.” | Edits exactly one referenced Activity proposal through the versioned proposal-decision RPC and persists the advanced proposal version for reload. | `runUnifiedChatTurn.continuity.test.ts` |
| “Only add the first two.” | Preserves declared order, leaves the first two pending for review, and rejects only the tail. | `runUnifiedChatTurn.continuity.test.ts` |
| “Cancel that.” | Cancels every proposal in one exact referenced compound set; unrelated multiple pending actions still require one useful clarification. | `runUnifiedChatTurn.test.ts`; `runUnifiedChatTurn.continuity.test.ts` |
| “Do the same for next week.” | Clones exactly one pending Activity creation seven days later as a second reviewable proposal, preserves the original, and uses `targetId: null` rather than inventing an object id. | `runUnifiedChatTurn.continuity.test.ts` |
| “Create the Goal and give me a daily way to follow through.” | Stages only the Goal first; the linked daily Activity is offered only after approval returns the authoritative Goal id. | `runUnifiedChatTurn.appControl.test.ts`; `executeGoalProposalDecision.test.ts` |
| “Add milk and call Mom.” | Stages two ordered Activity proposals and persists the ordered pending-work referent. | `runUnifiedChatTurn.test.ts`; `runUnifiedChatTurn.phases.test.ts` |
| “Two hours early afternoon” → “One to three.” | Retains the exact versioned Plan Activity through clarification and stages one matching Plan proposal only after the precise interval arrives. | `runUnifiedChatTurn.test.ts`; `unifiedChatToolProvider.test.ts`; `2026-07-23-local-runtime-boundary.md` |

Typed referent construction is parameterized across Arcs, Goals, To-dos, Plan, Chapters, Profile, and Relationships. Plan’s pre-proposal `awaiting_placement` referent remains backward compatible; once a Plan proposal exists, the general pending-work envelope takes over.

## Ordered and dependent work boundaries

- Sibling proposals preserve declared order and remain independently reviewable.
- Full selection validation occurs before ordered Plan batch application.
- A Goal plus daily follow-through is not treated as two independent creates: the Goal proposal pauses the dependent Activity until native approval returns the real Goal id.
- Native client actions remain a `native_handoff` outcome and do not imply completion.
- Cancellation, prefix selection, other-selection, weekday edit, and next-week repetition bypass model reinterpretation only for narrow anchored phrases; ordinary language outside those exact shapes remains model-routed.

## Automated proof

`npm run verify:changed -- --run` passed after the continuity changes:

- 277 Jest suites, 1,993 tests.
- 14 Deno tests.
- 27 durable Chat contract tests.
- App and test typechecks, code-health ratchet, Supabase function checks, product lint, Chat delivery lint, protocol conformance, code-map generation, and architecture lint.
- Pre-existing warnings only: seven feature briefs not registered in a manifest and eleven legacy raw `Text` imports outside this change.

## Runtime boundary

The fresh simulator matrix is still required for correction, cancellation, compound work, reload preservation, and exact native return. Until those rows are captured, Phase 5 remains in progress even though the focused and full automated gates are green.

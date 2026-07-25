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
| “Only add the first two.” | Preserves declared order, leaves the first two pending for review, rejects only the tail, and persists a resequenced referent containing only the survivors. | `runUnifiedChatTurn.continuity.test.ts` |
| “Cancel that.” | Cancels every proposal in one exact referenced compound set; unrelated multiple pending actions still require one useful clarification. | `runUnifiedChatTurn.test.ts`; `runUnifiedChatTurn.continuity.test.ts` |
| “Do the same for next week.” | Clones exactly one pending Activity creation seven days later as a second reviewable proposal, preserves the original, and uses `targetId: null` rather than inventing an object id. | `runUnifiedChatTurn.continuity.test.ts` |
| “Create the Goal and give me a daily way to follow through.” | Stages only the Goal first; the linked daily Activity is offered only after approval returns the authoritative Goal id. | `runUnifiedChatTurn.appControl.test.ts`; `executeGoalProposalDecision.test.ts` |
| “Add milk and call Mom.” | A narrow explicit two-item capture is decomposed deterministically, stages two ordered Activity proposals, keeps both reviewable, and persists the ordered pending-work referent. Ambiguous lists and non-To-do domains remain model-routed. | `requestPolicy.test.ts`; `runUnifiedChatTurn.test.ts`; `autoApplyCreatePolicy.test.ts`; signed-in simulator replay |
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

- 277 Jest suites, 1,996 tests.
- 14 Deno tests.
- 27 durable Chat contract tests.
- App and test typechecks, code-health ratchet, Supabase function checks, product lint, Chat delivery lint, protocol conformance, code-map generation, and architecture lint.
- Pre-existing warnings only: seven feature briefs not registered in a manifest and eleven legacy raw `Text` imports outside this change.

## Runtime boundary

### Compound capture and cancellation — accepted

The first fresh replay exposed two independent failures rather than being accepted as proof:

1. The model followed the To-do grounding instruction to prepare at most one operation, so only “Call Mom” became a proposal and “Milk” appeared as an unreviewable card.
2. After deterministic decomposition staged both creates, the shell's single-create convenience policy auto-applied the first proposal and left only the second reviewable.

The corrected boundary is now deterministic and bounded: only a simple explicit two-item capture whose second clause begins with its own action verb is decomposed. The model is not called for that shape. Auto-apply remains available for exactly one explicit reversible create, but is disabled when a run contains multiple pending creates.

Fresh signed-in iPhone 17 Pro simulator proof on the rebuilt current worktree:

- `Add milk and call Mom` produced the exact response `I prepared 2 To-dos for review.`
- Both `Milk` and `Call Mom` rendered as separate `CREATE TO-DO?` proposals with independent `Not now`, `Change`, and `Create` controls.
- The exact verified follow-up `Cancel that` bypassed the model, changed both proposal cards to `REJECTED`, returned `Okay—I won't make those changes.`, and rendered two separate correction echoes.
- Accepted screenshots: `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 19.12.14.png` and `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 19.15.06.png`.
- Pre-fix failure screenshot retained for comparison: `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 18.45.14.png`.
- Native build boundary: `npx expo run:ios --device "iPhone 17 Pro"` completed with 0 errors and installed/opened `com.andrewwatanabe.kwilt`; Metro then loaded the branch bundle with the main checkout's local environment and explicit local Chat flags.

### Selection, weekday correction, reload, and native return — accepted

A fresh self-contained replay first exposed one more durable-identity failure: after `Only add the first one`, Kwilt rejected the tail but left the prior two-item `conversation_referent` as the latest durable referent. The exact next turn `Move it to Friday` therefore asked which proposal the user meant. The selection control run now writes a new referent containing only the kept proposals, in declared order with sequences starting at one. A regression test proves that payload before the implementation is accepted.

Fresh signed-in iPhone 17 Pro simulator proof on the rebuilt current worktree:

- `Add phase five test and call phase five test two` produced two independent reviewable To-do proposals.
- `Only add the first one` rejected `Call phase five test two`, kept `Phase five test` reviewable, and advanced the durable referent to that single survivor.
- `Move it to Friday` edited the survivor without clarification and retained its review controls.
- A Metro reload preserved the edited proposal, its rejected sibling, and the exact conversation chronology.
- Creating the survivor replaced the proposal with its authoritative inventory receipt. Tapping that receipt opened the exact native `Phase five test` To-do with `Due date · Jul 24, 2026` (Friday).
- Accepted screenshots: `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 19.44.28.png`, `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 19.44.48.png`, and `/Users/andrewwatanabe/Desktop/Simulator Screenshot - iPhone 17 Pro - 2026-07-24 at 19.45.34.png`.
- All runtime-only test To-dos were removed afterward through their native detail screens.

The replay also exposed and fixed the singular response `kept the first one changes`; the deterministic response is now `Okay—I kept the first change for review and removed the rest.`

### Remaining runtime boundary

The applied inventory receipt exposes its reversible action through a left-swipe. The available simulator control translated the attempted swipe into a tap and opened the exact native record instead. Automated protocol, snapshot, executor, and renderer tests cover `receipt.undo`, but a fresh signed-in physical swipe → undone receipt replay has not yet been captured. Native deletion was used only to clean up the test records and is not counted as Chat undo proof. Phase 5 remains in progress until that exact undo row is proven.

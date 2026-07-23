# Converge: Chat Turn-Coherent Timeline

## Qualitative comparison

| Direction | Nina / trust | Causal clarity | System fit | Migration risk | Calm mobile UX |
| --- | --- | --- | --- | --- | --- |
| Timestamp Stream | Medium | Low | Medium | Low | Medium |
| Semantic Turn Stack | High | High | High | Low | High |
| Append-Only Event Journal | Medium | High | Low | High | Low |
| Transcript Plus Action Shelf | Low | Low | Medium | Medium | Low |

## Chosen direction

**Semantic Turn Stack with compact correction echoes.** Turns are strictly chronological relative to one another. Within a turn, visible artifacts follow deterministic causal roles rather than raw timestamps:

1. User request.
2. Active Working/progress state while the run is live.
3. Visible assistant answer, when present.
4. Supporting evidence disclosure attached to the answer or decision it supports.
5. Proposal or decision artifact, when required.
6. Authoritative receipt or outcome.

The live Working item occupies a stable inline position immediately below the request that started it. Completion resolves that position inside the same turn; it never floats above older artifacts or below a newer turn.

## Later corrections and state changes

- Background or same-turn state completion updates the owning artifact in place.
- A user action on the latest turn, such as immediately deleting a newly created To-do, updates that turn in place without adding ceremony.
- A user action on an older artifact after one or more later turns exist updates the original artifact's truth and appends one compact correction echo at the bottom, linked back to the original turn.
- Internal retries and reconciliation do not create visible echoes unless they materially change what the user believes happened.

This is deterministic product logic, not model-selected chronology.

## Capability delta

Today, Nina cannot continue an existing Chat without newer messages being placed above older evidence, decisions, and receipts.

After this change, Nina can reopen a durable thread, send a message, and see the new request and its live state appended below the complete history. Every artifact remains attributable to the turn that caused it, and later corrections remain visible without falsifying the original location.

Still intentionally unsupported:

- AI re-ranking of turns or artifacts.
- A general activity feed or compliance audit log.
- Exposing hidden reasoning, internal tool traces, or every persistence transition.
- Dragging or manually reorganizing conversation history.

## Reductive design decisions

- Enhance the existing timeline; add no new screen, tab, shelf, mode, or setting.
- Add no visible “Turn 1” labels unless testing proves grouping cannot be understood through spacing and adjacency.
- Do not display timestamps on every artifact.
- Do not duplicate an old receipt at the bottom for automatic state reconciliation.
- Keep one live Working surface per active turn.
- Let intelligence collapse secondary detail in old turns, but never let it change turn ownership or order.
- Reuse existing message, run, evidence, proposal, receipt, and inventory renderers.

## System implications

- Add an explicit ordered turn projection to the shared workbench contract; retain existing durable arrays as the records referenced by that projection.
- Project `userMessageId`, stable turn order, and semantic item references so the workbench does not infer causality from array position or timestamps.
- Derive receipt ownership through receipt -> proposal -> run.
- Handle messages without runs as standalone chronological turns.
- Make optimistic sends append a temporary turn and reconcile it into the persisted turn without moving it.
- Validate that each visible artifact appears in exactly one turn, with orphan handling that is honest and non-destructive.
- Keep the projection headless so Kwilt and Giraffed can render product-specific visuals from the same ordering semantics.

## Activation

No tutorial or announcement. The correction activates automatically whenever Chat renders or resumes a thread. Natural adoption is simply the absence of timeline-order confusion: the user continues from the bottom without stopping to audit prior cards.

## Bet

We're betting that strict chronology between turns plus deterministic causal ordering within turns will make durable Chat feel trustworthy without visible turn chrome. If users still cannot associate evidence or receipts with the right request, we would first strengthen spacing and local attachment cues—not add a separate activity surface or AI ordering.

## Success signal

In a resumed multi-turn thread containing evidence, an applied proposal, and a receipt, a new prompt and its Working state appear last; the user can identify which turn owns every artifact; and a later Undo remains understandable without moving or duplicating unrelated history.

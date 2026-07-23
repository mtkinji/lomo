# Diverge: Chat Turn-Coherent Timeline

## Axis of variation

What owns visible order: wall-clock timestamps, semantic conversation turns, an append-only event journal, or a separate action surface?

## Alternative A: Timestamp Stream

Flatten every message, run, evidence record, proposal, and receipt into one list and sort it by `createdAt`. Active progress receives the current time and appears at the bottom.

- Audience/persona fit: Familiar and immediately legible to Nina.
- Design-challenge answer: Guarantees that newer persisted records appear below older persisted records.
- System fit: Requires projected timestamps for every artifact but leaves the existing type arrays mostly intact.
- Best when: Every visible record is created once, events complete in order, and later state changes do not need special treatment.
- Fails when: Asynchronous persistence timestamps differ from causal order, a receipt updates long after its proposal, optimistic records reconcile with server time, or Undo changes an old artifact.
- Four-object model: Neutral; it affects Chat presentation rather than Arc, Goal, Activity, or Chapter semantics.
- Capture-first: Pass; sending remains unblocked.
- Primer anti-pattern check: Pass, though a raw timestamp ledger risks feeling mechanical and administrative.

## Alternative B: Semantic Turn Stack

Project the thread into ordered turns. Each turn owns the user request, its run, visible assistant output, evidence, proposal, and outcome. Turns are strictly chronological; artifacts inside a turn occupy deterministic causal slots. Active progress temporarily occupies the run slot directly below its request.

- Audience/persona fit: Strong. Nina sees which request produced each piece of evidence and each action.
- Design-challenge answer: Preserves chronology without pretending that wall-clock time is the same as causal meaning.
- System fit: Extends the versioned workbench projection with explicit turn/item references while retaining durable record types as source of truth.
- Best when: A request can produce multiple durable artifacts and the conversation must remain understandable after resume.
- Fails when: Later actions affecting old artifacts are only updated in place and the user cannot see what just happened.
- Four-object model: Pass; Activity receipts remain capability-owned artifacts inside the Chat turn that produced them.
- Capture-first: Pass; turn construction happens after capture and never blocks it.
- Primer anti-pattern check: Pass; no dashboard, score, or new user-maintained concept is introduced.

## Alternative C: Append-Only Event Journal

Treat every visible state transition as a new timeline event. Proposal approved, receipt applied, receipt undone, retry started, and retry completed all append at the bottom; earlier rows never change.

- Audience/persona fit: Strong for auditability, weaker for calm everyday use.
- Design-challenge answer: Produces an indisputable chronological ledger.
- System fit: Requires a broader durable event model for all artifact transitions and likely migration/backfill rules.
- Best when: Compliance-grade audit history is the primary job.
- Fails when: Ordinary conversations become long operational logs that obscure the user's words and Kwilt's useful answer.
- Four-object model: Pass semantically, but risks turning Activity changes into administrative noise.
- Capture-first: Pass technically.
- Primer anti-pattern check: Borderline failure: it tends toward a dense activity dashboard. It would need aggressive collapse, which then weakens the reason to choose it.

## Alternative D: Transcript Plus Action Shelf

Keep only messages and Working state in strict conversational order. Move evidence, proposals, and receipts to a separate persistent action shelf or drawer outside the transcript.

- Audience/persona fit: The transcript becomes simple, but Nina must look in two places to understand what happened.
- Design-challenge answer: Removes cross-type ordering problems from the transcript rather than solving causal ownership.
- System fit: Reuses separate arrays but adds a new mobile surface and navigation state.
- Best when: Actions are independent work items rather than consequences of a conversation.
- Fails when: Evidence and receipts need to explain or prove the adjacent answer or request.
- Four-object model: Weak; capability artifacts become detached from the conversation that authorized them.
- Capture-first: Pass.
- Primer anti-pattern check: Fail without revision; it creates a dashboard-like secondary surface and increases maintenance.

## Divergence finding

The meaningful choice is not how clever sorting should be. It is whether the product treats the timeline as a list of independently sorted records or as a sequence of causally owned turns. Timestamp intelligence is too weak, and an event journal or action shelf is too heavy. The Semantic Turn Stack is the only alternative that directly serves the trust job while remaining reductive.

# Frame: chat-turn-coherent-timeline

## What the user said

> I would want all new messages to be below the ones before them. The working indicator should appear in the correct spot, in line. There might be some intelligence to not 100% chronological.

## Restated in user voice

When I return to an existing Chat and continue the conversation, I want every new turn to advance downward from what already happened, so I can immediately understand what caused what, where Kwilt is working now, and whether an evidence, decision, or receipt belongs to this request or an earlier one.

## Target audience

`audience-ai-native-life-operators` — people who already use AI to operate across real work and personal context, and who require the system to remain inspectable and trustworthy as conversations accumulate durable actions.

## Representative persona

Nina already expects a chat timeline to behave like a coherent causal record, not merely a collection of messages and cards.

- Current situation: She reopens a thread that already contains evidence, an applied To-do proposal, and a receipt, then sends a new prompt.
- What she's trying to become/do: Continue operating from prior context without reconstructing which artifact belongs to which turn.
- Emotional state or tension: She is willing to let AI work near her life system, but contradictory ordering makes her pause and audit the interface instead of trusting it.
- What would make this feel wrong to her: A newer message appearing above older outcomes, a live indicator detached from the prompt that started it, or presentation intelligence that silently rewrites causal history.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — the timeline must be calm, truthful, and understandable without vigilance.

## Job flow step

Step 10, **Resume and correct**: Kwilt currently restores durable messages, runs, evidence, proposals, and receipts. The job flow scores this 4/5, but the physical-use screenshot exposes an important gap: restoration preserves each record type while losing the causal order between record types. For this timeline sub-step, delivery is effectively 3/5 until a resumed thread reads in the same order in which its turns occurred.

## Active anchors

- `jtbd-trust-this-app-with-my-life` — causal ordering is a basic reliability and calm-UX promise.
- `jtbd-understand-why-ai-suggested-this` — evidence has meaning only when its relationship to the triggering request and answer is legible.
- `jtbd-stay-in-control-of-ai-actions` — proposals and receipts must remain attached to the turn that authorized or produced them.

## Friction we're addressing

The current surface renders all messages first, then a live run, then all evidence, proposals, and receipts. On a resumed thread, a new prompt therefore appears above older action artifacts. The data is durable, but the visible story is causally false and the active working state appears in the wrong place.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: the hosted Unified Chat timeline embedded in the native Kwilt shell.
- Existing user flow: a user message starts a run; the run may retrieve evidence, produce an answer or proposal, and later produce an authoritative receipt.
- Existing domain/data model: `AgentMessage`, `AgentRun`, `EvidenceRef`, `AgentProposal`, and `MutationReceipt` remain separate durable records linked by `runId`, `messageId`, and `proposalId`.
- Existing technical affordances: the repository orders each record stream internally, and the native host projects the streams into a versioned workbench snapshot.
- Existing technical constraint: the snapshot exposes separate type arrays rather than an explicit ordered timeline; messages carry `createdAt`, while several other projected artifacts omit presentation-order metadata.
- Existing UX convention: conversation progresses downward; the composer stays at the bottom; useful evidence, decisions, outcomes, and honest failures remain durable.

Constraints to preserve:

- Older turns never move below newer turns.
- A new user message is appended after every visible artifact from prior turns.
- The active Working indicator appears directly after the user message that started the run and is replaced or resolved in that same turn position.
- Evidence, proposals, receipts, failures, retries, corrections, and undo remain durable and attributable to their owning run or decision.
- Durable product records remain the source of truth; a rendered card is only a projection.
- Presentation must not expose hidden reasoning or invent unsupported causal relationships.

Constraints we may challenge:

- Separate arrays as the sufficient presentation contract.
- Pure timestamp ordering inside a turn when causal sequence is more truthful than creation time.
- Treating every state update as a new timeline row rather than updating an existing durable artifact in place.

Design implication:

Use the **turn** as the presentation unit. Turns are strictly chronological relative to one another; inside a turn, artifacts follow a semantic causal sequence such as request -> live progress -> evidence -> answer or decision -> authoritative outcome. Intelligence may decide whether secondary detail is collapsed or omitted, but it must not move an artifact outside its owning turn or reorder causal history.

## Aspirational design challenge

How might we help Nina resume a durable AI conversation and understand each request, evidence trail, decision, and outcome at a glance, while preserving strict chronology between turns and allowing causal—not merely timestamp-based—ordering within a turn?

## Out of scope

- Redesigning the composer or voice-capture controls.
- Changing capability permissions, proposal policy, or mutation semantics.
- Adding model reasoning or internal tool traces to the visible timeline.
- Replacing durable records with a presentation-only event log.

## Open question

When an old artifact changes later—for example, an applied receipt is undone—should the original turn update in place, should a small new correction event append to the latest turn, or should both happen?

# Frame: Unified Chat operational control plane

## What the user said

> Make this reliably operationalized, using the same systems patterns as dependable agent products.

## Restated in user voice

When I correct or retry a Kwilt action, I want Chat to preserve what I meant, use the capability data it already has, and tell me the authoritative outcome, so I do not have to supervise the system or reconstruct my life context.

## Target audience

`audience-ai-native-life-operators`: people comfortable delegating meaningful work to AI when its scope and effects remain inspectable.

## Representative persona

Nina is willing to let Kwilt operate near her life system, but loses trust when a retry forgets its subject or prose contradicts the actual records and tool outcome.

## Hero anchor

`jtbd-trust-this-app-with-my-life` — continued use depends on reliable continuity, truthful outcomes, and reversible capability-owned action.

## Job flow step

The primary gap is step 10 of `job-flow-nina-trust-ai-with-my-life-system`: resume, correct, retry, audit, or undo later. The current score is 4, but dogfood has shown that correction scope and action grounding can still drift within one thread.

## Active anchors

- `jtbd-get-help-without-retelling-my-life` — retries must retain bounded relevant context.
- `jtbd-understand-why-ai-suggested-this` — evidence and coverage must remain inspectable.
- `jtbd-stay-in-control-of-ai-actions` — typed proposals and receipts remain authoritative.

## Friction we're addressing

The current pipeline persists messages, runs, evidence, proposals, and receipts, but it can reconstruct turn meaning from prose at each stage. Routing, evidence selection, tool planning, and visible response can therefore disagree even though each component is locally reasonable.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Unified Chat timeline and composer.
- Existing flow: plan, authorize context, execute bounded tools, persist proposals, finalize a durable run.
- Existing model: durable run events, evidence refs, proposals, receipts, and conversation referents.
- Existing affordance: run-event payloads can persist typed internal state without a new table or migration.
- Existing convention: capability owners validate actions; model prose is never proof of an effect.

Constraints to preserve:

- No new dashboard, settings surface, or universal automation permission.
- Private context remains least-privilege and capability scoped.
- Financial changes remain reviewable proposals.
- Native capabilities retain mutation, receipt, correction, and undo ownership.

Constraint to challenge:

- A chat message and inferred request policy are not sufficient durable representations of an actionable turn.

## Aspirational design challenge

How might we help Nina correct or retry one life-system action without reconstructing its scope, while preserving least-privilege context, capability authority, and truthful outcomes?

## Out of scope

New native capability editors, silent financial writes, universal cross-capability batch transactions, and a user-facing agent operations dashboard.

## Open question

None for this learning release; complete cross-capability batch mutation semantics remain a separately accepted follow-on.

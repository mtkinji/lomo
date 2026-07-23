---
id: brief-chat-turn-coherent-timeline
title: Turn-coherent Unified Chat timeline
status: draft
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-understand-why-ai-suggested-this, jtbd-stay-in-control-of-ai-actions]
related_briefs: [unified-chat]
owner: andrew
last_updated: 2026-07-22
---

# Turn-coherent Unified Chat timeline

## Context

Unified Chat persists messages, runs, evidence, proposals, and receipts correctly, but the hosted workbench renders those records in type buckets. In a resumed thread, a new prompt and Working state therefore appear above older evidence and applied action artifacts. The timeline contains the right records while presenting a causally false story.

## Target audience

AI-native life operators need durable AI conversations to remain inspectable as they accumulate real personal context and actions. Ordering is not cosmetic for this audience: it determines whether the system's evidence and authority can be trusted.

## Representative persona

Nina reopens a thread that already contains a To-do update, its evidence, and its authoritative receipt. She sends a new request and expects the conversation to advance downward without auditing which cards belong to which run.

## Aspirational design challenge

How might we help Nina resume a durable AI conversation and understand each request, evidence trail, decision, and outcome at a glance, while preserving strict chronology between turns and allowing causal—not merely timestamp-based—ordering within a turn?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — Chat must present a calm, truthful causal record before Nina can let it operate near her life system.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, Step 10, **Resume and correct**. The current job-flow score is 4/5 because durable state restores, but physical-use evidence shows that cross-type ordering is misleading. This brief restores turn coherence and supports raising the sub-step back from an effective 3/5 after device proof.

## JTBD framing

When Nina continues an existing Chat, she wants every new turn to appear after what already happened, with evidence, decisions, and outcomes attached to the request that produced them, so she can understand why Kwilt acted and remain in control without reconstructing chronology herself.

## Design

### Governing rule

Chronological between turns; causal within turns.

- A newer turn never appears above any visible artifact from an older turn.
- A user request begins a turn.
- Working appears inline immediately below the request that started the active run.
- Completion resolves the same turn position rather than appending by artifact type.
- Intelligence may collapse secondary detail but may not change turn ownership or order.

### Turn projection

Extend the versioned workbench snapshot with an ordered headless projection that references existing durable records rather than replacing them:

```ts
type AgentWorkbenchTimelineItem =
  | { kind: 'message'; id: string }
  | { kind: 'run'; id: string }
  | { kind: 'evidence'; ids: string[] }
  | { kind: 'proposal'; id: string }
  | { kind: 'receipt'; id: string }
  | { kind: 'correction'; id: string; targetItemId: string };

type AgentWorkbenchTurn = {
  id: string;
  sequence: number;
  userMessageId?: string;
  runId?: string;
  items: AgentWorkbenchTimelineItem[];
};
```

The exact type names may change during implementation, but these semantics may not:

- The projection contains stable references, not duplicate authoritative payloads.
- `AgentRun` projects its `userMessageId` as well as `assistantMessageId`.
- Evidence and proposals join through `runId`; receipts join through proposal -> run.
- Messages without runs become standalone chronological turns.
- Every visible artifact belongs to exactly one turn.
- Orphaned records are never silently guessed into a turn.

### Within-turn ordering

Use deterministic semantic slots:

1. User request.
2. Active Working/progress state.
3. Visible assistant answer, if present.
4. Evidence disclosure attached to the result it supports.
5. Proposal or decision, if present.
6. Authoritative receipt or outcome.

Not every turn uses every slot. Empty slots add no chrome.

### Optimistic and live behavior

- Sending creates a temporary bottom turn immediately.
- The optimistic turn reconciles to its persisted message/run identity without changing position.
- An active run has one live inline renderer.
- Stop, steer, retry, failure, and completion update that owning run position.
- Auto-scroll follows the active turn only when the user was already near the bottom; it does not pull a user away from older history they are intentionally reading.

### Corrections and Undo

- Automatic or same-turn state changes update the original artifact in place.
- An immediate user action on the latest turn also updates in place.
- A user action on an older artifact after later turns exist updates the original artifact and appends one compact correction item at the bottom linking back to it.
- Internal reconciliation does not append visible correction items unless it materially changes the user's believed outcome.

### Reduction

- Reuse all existing message, run, evidence, proposal, receipt, and Activity inventory renderers.
- Add no turn numbers, ordering setting, separate action shelf, activity feed, or timestamps on every artifact.
- Prefer spacing and adjacency over borders or nested cards to communicate grouping.
- Do not expose hidden reasoning or internal persistence events.

### Compatibility and rollback

- Keep existing snapshot arrays during rollout.
- Add the turn projection in a backward-compatible protocol step or coordinated protocol version.
- The hosted workbench validates the projection before using it and can temporarily fall back while compatible native builds roll out.
- No database migration is required unless implementation proves existing relationships insufficient.

## Success signal

On simulator and physical iPhone, a resumed thread containing an older answer/evidence/proposal/receipt turn followed by a new prompt always renders the new prompt and Working state last. Completing, stopping, retrying, steering, correcting, opening native detail, returning, and undoing never move an artifact outside its owning turn, duplicate visible history, or unexpectedly change the user's scroll position.

## Learning release

Use a TestFlight build after signed-in simulator proof. See [`04-learning-release.md`](../design-explorations/chat-turn-coherent-timeline/04-learning-release.md) and [`05-evaluate-learning.md`](../design-explorations/chat-turn-coherent-timeline/05-evaluate-learning.md).

## Spec refinement

- The product-owned decisions are resolved: strict turn chronology, semantic within-turn slots, bounded correction echoes, and no AI ordering.
- Implementation must choose backward-compatible optional projection versus a coordinated protocol version after inspecting the shared workbench deployment path; either choice must retain a safe rollout window.
- Acceptance requires projection tests, visible DOM-order tests, signed-in simulator evidence, and physical-iPhone TestFlight evidence.
- Styling beyond the minimum spacing needed to make turn ownership legible is intentionally deferred.

## Open questions

No blocking product questions. Protocol rollout mechanics remain an engineering decision constrained by backward compatibility and verification evidence.

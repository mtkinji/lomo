---
id: brief-unified-chat-operational-control-plane
title: Unified Chat operational control plane
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
related_briefs: [brief-unified-chat]
owner: andrew
last_updated: 2026-08-04
---

# Unified Chat Operational Control Plane

## Context

Dogfood showed a native Unified Chat thread loading current Money categories, discarding them during context selection, losing Money scope on a correction, failing rename calls, and then claiming it could not access category names. Local safeguards address the exact failure, but durable trust requires the stages to share one typed operation contract.

## Target audience

AI-native life operators grant AI meaningful context and authority only when continuity, evidence, permission, and outcomes remain inspectable.

## Representative persona

Nina corrects “emoji at the end” to “emoji at the beginning” and expects the correction to remain attached to the same reviewable Money action without naming every category again.

## Aspirational design challenge

How might we help Nina correct or retry one life-system action without reconstructing its scope, while preserving least-privilege context, capability authority, and truthful outcomes?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — Chat must be dependable enough that the user does not need to supervise its internal boundaries.

## Job flow step

This improves `job-flow-nina-trust-ai-with-my-life-system` steps 2–5 and 10: express intent, establish bounded scope, retrieve evidence, understand result and limits, and resume/correct/retry later. Source proof cannot raise those steps to 5; signed Simulator and physical-device evidence remain required.

## JTBD framing

When a user corrects or retries a capability action, they want Kwilt to retain the minimum exact context, show what it used, and prepare only the intended reviewable change so they remain the author of their life without retelling it.

## Design

### Durable Turn Contract

Every run persists a versioned contract in its existing scope event payload:

```ts
type UnifiedChatTurnContract = {
  schemaVersion: 1;
  userJob: string;
  desiredOutcome: string;
  constraints: string[];
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  action: null | {
    operationIds: string[];
    targetScope: 'selected_objects' | 'all_matching';
    targetQuery: string;
  };
  referent: null | { runId: string; kind: 'correction' | 'retry' };
};
```

Older runs remain readable. A referential correction or retry inherits the preceding contract's capability and action scope before semantic routing is allowed to reinterpret it.

### Generic action composition

Bulk is not a capability or operation. It is a turn-level selector over the same canonical individual actions the app already exposes. `all_matching` resolves the complete target set from the participating capability's typed evidence and the preserved target query, then stages the selected write once per target or with a target collection when the tool schema supports one. The tool-call budget derives from the resolved target count. No operation declares bulk support, allowed cardinalities, target limits, or correction behavior.

This means a newly registered individual action automatically receives selected-object and all-matching composition. The capability still owns validation, confirmation, apply, receipt, and undo for that individual action; Unified Chat does not invent actions the app cannot perform.

### Truth projection and invariants

Capability-action status is compiled from selected evidence, typed write arguments, tool events, proposals, native handoffs, and receipts. The model may explain but cannot override these facts. Every resolved target id must be covered by a typed write. If any target is missing, the partial batch is discarded before proposal persistence. The runtime also resolves loaded-record access contradictions, incomplete target sets, unresolved action targets, and success claims without authoritative state.

### Incident evaluation and operations

Redacted structural incident fixtures preserve the full multi-turn shape. Contract version, target scope, referent kind, evidence counts, failed-tool counts, proposal counts, and invariant codes use the existing event/analytics infrastructure without duplicating private content.

## Learning release

Implement locally in mobile Unified Chat with Money category rename as the incident proof and Goals, Activities, and Chapters as cross-capability regressions. Add no new surface or migration. Proceed to signed Simulator and TestFlight dogfood only after diff-aware verification and incident replay pass.

## Success signal

The original correction and retry transcript consistently retains Money scope, selects every current category and no plan-limit record, produces reviewable proposals or an honest failure, and cannot display an access or success claim contradicted by run facts.

## Spec refinement

- The event payload is the persistence boundary; a table migration is intentionally unnecessary.
- Cardinality is inferred once per turn and is independent of operation identity.
- Every canonical individual write action receives the same composition semantics without a bulk-action registry.
- The first release uses existing typed proposals and groups them as pending work; atomic apply across unrelated capabilities remains out of scope.
- Model-generated explanatory prose may be retained only when it does not contradict deterministic status.
- Required proof: red-green unit tests, related integration tests, product/architecture/chat contract lint, then signed runtime evidence before a shipped claim.

## System boundary

This removes bulk-action enumeration. It does not remove the necessary capability contract for an individual action: an operation must still have a typed tool/provider and capability-owned review/apply path before Chat can perform it.

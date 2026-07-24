# Unified Chat Capability Completion Program Implementation Plan

> **Superseded as the active roadmap:** preserve this document as implementation inventory and architecture history. The reductive MVP is now [`2026-07-23-natural-language-app-control-mvp.md`](2026-07-23-natural-language-app-control-mvp.md): conversational control of capabilities that already exist in Kwilt, proven first on mobile through user-outcome acceptance scenarios.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kwilt Chat accept ordinary language, reason over the right account context, and perform every meaningful user-facing Kwilt operation through a shared, permissioned, durable runtime that also backs Phone Agent.

**Architecture:** One channel-independent coordinator owns semantic routing, progressive tool discovery, bounded model/tool iteration, interruption, durable runs, and proposal/receipt chronology. Capability providers own evidence, validation, permission, authoritative mutation, undo, and native return. Mobile Chat uses server, device, and connector providers directly; external MCP projects the server-capable catalog; Phone Agent is another channel over the same server coordinator.

**Tech Stack:** React Native/Expo, TypeScript, Jest, Supabase/Postgres/Edge Functions, OpenAI-compatible structured tool calling, `@kwilt/agent-runtime`, native iOS providers, hosted Kwilt workbench protocol.

---

## Completion contract

“Any app function” means every meaningful user intent represented by a native Kwilt operation, not every UI gesture. Each operation must appear in `CHAT_CAPABILITY_COVERAGE` with one of four truthful states:

- `live`: Chat can perform it and reconcile an authoritative result.
- `pending_provider`: the tool semantics exist but a server/device/connector provider is not yet complete.
- `confirmation_only`: Chat can understand and stage it, but native authorization or a consequential confirmation remains mandatory.
- `excluded`: Chat must refuse it for a named product, safety, or platform reason.

The goal is complete only when no operation remains accidentally unrepresented, every `live` operation has routing/provider/policy/idempotency/receipt tests, every non-live operation produces an honest boundary, the signed app passes the standing prompt matrix, and Phone Agent uses the same authenticated coordinator for server-capable work.

## Capability scope

| Domain | Required intents |
| --- | --- |
| General Chat | ordinary questions, follow-ups, attached text, bounded personal context, safe current-source/specialist boundaries |
| Profile | read bounded preferences; update explicitly supplied profile fields |
| Arcs | list/get, draft/create, update, archive/delete, exact return |
| Goals | list/get, draft/create, update, complete/archive/delete, check in, sharing handoff |
| Activities | list/get/search, capture, update, steps CRUD/reorder/complete, complete/delete, focus, reminders, repeat, location, attachments, sharing handoff |
| Plan | inspect/recommend, schedule/reschedule/remove, multi-select apply, calendar reconciliation, availability/preferences handoff |
| Chapters | list/get/current, reflect, update private note, alignment handoff |
| Native controls | open/start Focus, notification authorization, Screen Time configuration/enforcement, native navigation |
| Account/system | settings navigation, connection/permission status, subscription/account deletion confirmation surfaces; never silent destructive account actions |
| Channels | mobile Chat and Phone Agent share threads/runs/tools; telephony consent and compliance remain channel-owned |

### Task 1: Make capability coverage executable

**Files:**
- Create: `src/features/unifiedChat/chatCapabilityCoverage.ts`
- Create: `src/features/unifiedChat/chatCapabilityCoverage.test.ts`
- Modify: `src/features/unifiedChat/legacyAgentCapabilityInventory.ts`
- Modify: `src/features/unifiedChat/toolCatalog.ts`

- [ ] Write a failing contract test that requires all external MCP tools, all legacy AgentWorkspace assets, every active `CAPABILITY_REGISTRY` id, and the native intents in the table above to have one unique coverage row.
- [ ] Give every row a stable tool id, provider, consequence, confirmation policy, implementation state, and proof paths.
- [ ] Reject `live` rows without a registered tool, executor/proposal path, receipt path, and tests.
- [ ] Generate human-readable coverage totals from the same manifest so documentation cannot drift from code.

### Task 2: Replace one-shot action schemas with a bounded tool loop

**Files:**
- Create: `packages/kwilt-agent-runtime/src/orchestrator.ts`
- Create: `packages/kwilt-agent-runtime/src/orchestrator.test.ts`
- Modify: `packages/kwilt-agent-runtime/src/types.ts`
- Modify: `src/services/ai.ts`
- Create: `src/features/unifiedChat/runDiscoveredToolLoop.ts`
- Create: `src/features/unifiedChat/runDiscoveredToolLoop.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`

- [ ] Define model-independent `AgentToolCall`, `AgentToolResult`, and bounded loop state with maximum rounds/calls, sequential writes, interruption, and repeated-call detection.
- [ ] Extend the AI transport to accept progressively discovered function schemas and return tool calls without executing application state inside `src/services/ai.ts`.
- [ ] Execute read tools immediately; convert reviewable writes into durable proposals; execute only explicitly authorized low-risk reversible capture; return tool results to the model until a final answer or bound is reached.
- [ ] Persist discovery, call, result, proposal, and recovery events in causal order without raw chain-of-thought.
- [ ] Remove the legacy `ChatMode` executor only after parity tests prove every legacy asset has moved.

### Task 3: Complete Activity and Plan parity

**Files:**
- Modify: `src/features/unifiedChat/activityProposal.ts`
- Modify: `src/features/unifiedChat/activityProposalExecutor.ts`
- Modify: `src/features/unifiedChat/types.ts`
- Modify: `src/features/unifiedChat/threadRepository.ts`
- Modify: `src/features/unifiedChat/workbenchProtocol.ts`
- Create: `src/features/unifiedChat/activityToolProvider.ts`
- Create: `src/features/unifiedChat/activityToolProvider.test.ts`
- Modify: `src/features/unifiedChat/planProposalExecutor.ts`

- [x] Add typed operations for Activity steps, completion, delete, focus handoff, reminders, repeat, location, and attachment/share handoffs.
- [x] Reuse the Activity update proposal for Phone reminder and focus-today requests; retain native notification settings and soft Plan semantics.
- [x] Persist an owner-scoped Focus device handoff without claiming that opening the sheet started a timer.
- [ ] Preserve optimistic versions and stable step ids; never implement step edits as an unreviewable model-authored whole-array overwrite.
- [x] Reuse the existing Plan schedule executor for schedule/reschedule/remove and retain sequential batch apply with one receipt per event.
- [ ] Prove stale state, double apply, partial provider failure, undo, and exact native return.

### Task 4: Complete Goals, Arcs, Chapters, and Profile

**Files:**
- Create: `src/features/unifiedChat/goalToolProvider.ts`
- Create: `src/features/unifiedChat/arcToolProvider.ts`
- Create: `src/features/unifiedChat/chapterToolProvider.ts`
- Create: `src/features/unifiedChat/profileToolProvider.ts`
- Create corresponding `*.test.ts` files
- Modify: `src/features/unifiedChat/capabilityAdapters.ts`
- Modify: `src/features/unifiedChat/types.ts`
- Modify: `src/features/unifiedChat/executeProposalDecision.ts`

- [ ] Add bounded Arc evidence and Goal/Arc/Chapter/Profile tool definitions using the existing external MCP schemas as semantic parity inputs.
- [ ] Preserve the existing Arc/Goal domain prompts and structured drafts, but adopt through durable proposals and authoritative providers.
- [ ] Add typed create/update/archive/delete/check-in/note operations, risk-specific confirmation, idempotency, receipts, undo where truthful, and exact native return.
- [ ] Keep identity inference and sharing decisions deliberate; never silently invent an Arc, invite another person, or broaden visibility.

### Task 5: Complete device-owned and consequential operations

**Files:**
- Create: `src/features/unifiedChat/deviceToolProvider.ts`
- Create: `src/features/unifiedChat/deviceToolProvider.test.ts`
- Modify: `src/features/unifiedChat/UnifiedChatScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Reuse Screen Time, Focus, calendar, notification, location, attachment, and sharing owners in their existing feature folders.

- [ ] Represent unavailable device work as durable `pending_client_action`, not model success.
- [ ] Resume pending work in the foreground with native authorization and an explicit consequence summary.
- [ ] Reconcile Focus/calendar/notification/Screen Time state after the native owner completes or declines.
- [ ] Require explicit confirmation for external, shared, enforcement, subscription, and destructive operations.

### Task 6: Move coordination server-side and adopt Phone Agent

**Files:**
- Create: `supabase/functions/agent-run/index.ts`
- Create: `supabase/functions/_shared/agentRuntime.ts`
- Create corresponding `_shared/__tests__` files
- Modify: `src/services/phoneAgent.ts`
- Modify: `supabase/functions/_shared/phoneAgent.ts`
- Modify: `docs/feature-briefs/kwilt-phone-agent.md`

- [ ] Run authenticated server-capable reads and writes through the same versioned catalog and policy used by mobile Chat and external MCP.
- [ ] Persist resumable loop state and device-action requests against canonical threads/runs.
- [ ] Route Phone Agent ordinary reasoning and server tools through this coordinator while keeping recording consent, disclosure, opt-out, and telephony timing deterministic.
- [ ] Prove a phone-started run can pause for device confirmation and resume in mobile Chat without duplicating work.

### Task 7: Close quality, UX, and release proof

**Files:**
- Expand: `src/features/unifiedChat/requestRoutingEvalCases.ts`
- Create: `src/features/unifiedChat/agentCapabilityEvalCases.ts`
- Modify: `docs/delivery-evidence/unified-chat.yml`
- Modify: `docs/feature-briefs/unified-chat.md`
- Modify: `src/features/unifiedChat/FEATURE.md`

- [ ] Cover ordinary questions, paraphrases, ellipsis/follow-ups, multi-capability plans, corrections, cancellations, unavailable providers, adversarial instructions, and every manifest operation.
- [ ] Add telemetry for route/tool choice, unsupported intent, proposal correction, provider outcome, reconciliation, and next-turn correction without storing raw personal prompts.
- [ ] Run `npm run verify:changed -- --run`, companion workbench tests/build, protocol conformance, and Supabase function tests.
- [ ] Dogfood typed and voice requests on a signed simulator and physical device, including background/restore, offline/failure, stale state, double apply, exact return, and Phone Agent continuity.
- [ ] Do not mark the program complete while any `live` claim lacks runtime proof or any meaningful app operation lacks an explicit manifest state.

## Execution order

Tasks 1–4 complete the high-frequency in-app expectation first. Task 5 adds native and consequential actions. Task 6 makes the runtime channel-independent for Phone Agent. Task 7 is a continuous gate and the final completion audit. No commit, merge, deployment, migration, or TestFlight submission occurs without Andrew authorizing that distinct phase.

## Current execution checkpoint — 2026-07-23

- `KWILT_OPERATION_REGISTRY` now owns the product-level user-meaningful operation inventory outside Chat. The Chat manifest must match it exactly and inherits each operation owner; prompt-eval execution expectations are checked against the same manifest outcome classes. The former duplicate native-intent array is removed. Compound capture is no longer trapped by the single-To-do deterministic fast path: semantic routing and the bounded tool loop can stage separate native Activity proposals.
- Mobile and Phone capability truth is now represented independently in `CHAT_CAPABILITY_COVERAGE`; eval outcomes derive from that manifest and Phone success is checked against the real server catalog.
- Authenticated mobile Plan conversation carryover is proven locally through one exact pending Plan proposal using Plan's capability-owned priority method.
- The canonical server coordinator can read bounded Arcs, Goals, Activities, Chapters, Profile display fields, and show-up state; capture an explicitly authorized low-risk Activity; and stage supported native handoffs.
- Ordinary contextual questions can call multiple owner-scoped read tools in one bounded server turn; synthesis is instructed to preserve capability-owned priority and status rather than inventing a competing ranking.
- Server-discovered Arc create/update/delete, Goal create/update/delete, and Chapter private-note update now stage durable proposals through `stage_kwilt_agent_proposal`. Existing-object changes are owner- and version-grounded; Goal creation validates an optional parent Arc. Mobile Chat hydrates the same records and retains each capability's existing review, authoritative apply, receipt, recovery, and undo path where supported.
- Server-discovered Activity update/complete/delete, stable step create/update/complete/delete/reorder, and recurrence now use that same proposal path. Reassignment validates the destination Goal owner, and step operations retain stable ids instead of replacing a model-authored whole array.
- Capability ownership now explicitly includes prioritization and presentation: conversational channels project existing deterministic priority, proposal, review, receipt, and native-return methods instead of creating parallel AI-only behavior.
- The server coordinator deterministically replaces false model success wording for proposals and pending native actions, so staged work is never reported as applied.
- Native Plan and server Phone recommendation now call the same `@kwilt/plan-core` priority and eligibility kernel. The phone link persists a bounded IANA timezone, and the canonical run grounds relative dates before requiring an explicit `targetDate` tool argument. The recommendation result preserves the owned priority order and labels every item unplaced because that read does not load calendar availability.
- Phone-authored Plan schedule/reschedule/remove and grouped chunks now stage the exact durable Plan operations consumed by mobile review. Schedule validates an owner-scoped Activity version, the persisted write-calendar preference, and its active owned provider account; reschedule/remove preserve the prior provider binding and timezone-correct Plan date. Chunk groups are inserted through one atomic service-only RPC, then retain sequential provider apply, per-event receipts, recovery, partial-failure reporting, and undo on mobile.
- Phone requests to manage Plan availability or calendars now stage the existing native Plan-preferences destination; no setting change is claimed during the Phone turn.
- The local coaching Profile remains authoritative. Domain sync publishes only profile id, display name, age range, and optimistic version to a new owner-scoped server projection. Phone Profile reads use that projection, and Phone edits stage the existing `update_profile` operation for native review, apply, receipt, recovery, and undo. Email, birthdate, identity summaries, and raw coaching context never enter the projection.
- Relationship memory no longer depends on incidental Activity creation or a Phone-only path. The canonical catalog reads the existing owner-scoped People/Memory/Event/Cadence model and interprets explicit named-person facts through a bounded schema. A dedicated `remember_relationships` permission gates Phone writes. Mobile uses one authenticated endpoint with its existing causal run identifiers; both channels enter the same service-only transactions. Remember, read-before-correct, and read-before-forget all write applied proposal/operation/receipt/action-log evidence, and native hydration retains those records. Exact correction and individual memory/event/cadence forgetting receipts now restore atomically through the existing native Undo command. Remember can be compensated through exact-record forgetting but does not yet have one-tap receipt Undo. Whole-person forgetting is explicitly excluded until dependent review and restore exist; deployment and signed channel proof remain open.
- `agent-run` and queued Phone work now share `createServiceAgentRunPersistence`; the authenticated endpoint no longer carries a second persistence implementation.
- These server additions remain delivery code only. The migration and Edge Functions have not been deployed, and signed Phone-to-mobile runtime continuity remains unproven.

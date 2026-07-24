---
feature: unifiedChat
audiences: [audience-ai-native-life-operators, audience-burned-out-productivity-power-users]
personas: [Nina, Marcus]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
briefs:
  - unified-chat-foundation
  - unified-chat
  - chat-turn-coherent-timeline
status: shipping
last_reviewed: 2026-07-23
---

# Unified Chat

Standalone, durable, multi-conversation Chat powered by the extracted shared agent workbench and evolving into the first channel over Kwilt's capability-complete agent runtime.

## Delivery state

The standalone foundation and capability runtime are implemented in the isolated delivery branch: hybrid deterministic/semantic routing, progressive versioned tools, bounded evidence, typed and recoverable Activity/Plan/Goal/Arc/Profile/Chapter changes, explicit People/Memory/Event/Cadence interpretation across mobile and Phone, device handoffs, Goal check-in draft review, show-up reads, explicit typed cancellation, route/tool/outcome telemetry, and a queued server coordinator for Phone Agent. Mobile and Phone capability states are tracked independently so one channel cannot borrow another channel's success. Capability-owned priority, proposal, approval, receipt, recovery, and native-return methods are reused in Chat rather than reimplemented as AI-only behavior. A product-level operation registry outside Chat now owns the complete user-meaningful operation inventory; Chat coverage must match it exactly and inherits each operation's capability owner, so adding native behavior without a conversational implementation or explicit boundary fails the contract test. Ordinary contextual questions can combine multiple owner-scoped server reads in one bounded turn while preserving each capability's authoritative priority and status. The deterministic single-To-do fast path now refuses compound capture syntax, allowing requests such as “Add milk and call Mom” to reach semantic interpretation and produce separate Activity proposals through the bounded tool loop. The server coordinator can stage 23 reviewed-write intents—Profile display-field update; Arc create/update/delete; Goal create/update/delete; Activity update/complete/delete, stable step create/update/complete/delete/reorder, recurrence, reminder, and focus-today; Chapter private-note update; and Plan schedule/reschedule/remove plus grouped chunk scheduling—as the same durable proposals consumed by mobile Chat. Mobile and Phone can also read existing relationship context, remember an explicitly stated fact, and read-before-correct or forget one exact optimistic-versioned relationship record. All four operations reuse the owner-scoped Phone Agent records and authoritative Chat receipts. It deterministically reports staged proposals as not applied regardless of model wording. Existing production proof still covers the earlier trust path only. The broader `unified-chat` brief remains active until migrations and functions are explicitly deployed and signed simulator, physical-device, and Phone Agent continuity evidence are complete.

## Ownership

- Owns `kwilt_agent_threads`, `kwilt_agent_messages`, and `kwilt_agent_runs`.
- Native Kwilt owns auth, AI requests, persistence, navigation, and bridge validation.
- The hosted workbench receives credential-free snapshots and emits versioned commands.
- Existing `AiChatScreen`, `AgentWorkspace`, and `AiChatPane` remain the owners of onboarding, Arc/Goal creation, To-do management, and other contextual workflow chat.
- `docs/delivery-evidence/unified-chat.yml` is the authoritative step-level implementation scorecard.

## Current learning-release limits

- Text, native voice, explicit Kwilt-object context, and up to three durable text-document attachments are complete. Binary and image attachments remain intentionally unsupported until Chat can inspect their contents truthfully.
- No existing-chat migration or automatic handoff.
- Mobile chunked calendar scheduling creates a reviewed proposal and durable receipt per provider event, applies chunks sequentially, tracks every binding on the Activity, and can undo one chunk without erasing its siblings. Phone now stages the entire 2–10 proposal group through one atomic RPC, then mobile uses that same batch review and per-event apply path. Phone can stage the 23 Profile, Arc, Goal, Activity, Chapter, and Plan reviewed-write intents above. Phone Plan read/recommend uses the same deterministic priority kernel as native Plan and linked-user timezone context, while honestly returning unplaced items without calendar availability. Explicit schedule/reschedule/remove and chunk requests validate the owned Activity and configured provider calendar before staging; no calendar write occurs until native approval. Reminder requests reuse the Activity update proposal; only the native notification service schedules or cancels the device notification after approval and subject to device settings. Focus-today remains the existing soft, reversible Plan signal. Profile remains local and authoritative: domain sync publishes only id, display name, age range, and optimistic version to an owner-scoped server projection; Phone reads that projection and stages edits for the existing native Profile review/apply/receipt/undo path. Focus, Activity location, attachment selection, Activity sharing, Goal sharing, and Plan preference management are owner-scoped durable device handoffs into their existing native surfaces; none claims that the device-side effect already happened.
- Goal check-ins are prepared as local drafts and always open the existing audience-aware native approval sheet; Chat never publishes them directly.
- Delivery scores remain evidence-gated in `docs/delivery-evidence/unified-chat.yml` and cannot reach 5 without simulator plus physical-device proof.

## Next learning release

Apply the new migrations and functions only after explicit authorization, then prove the standing typed/voice matrix on a signed simulator and physical device. The highest-risk runtime checks are Plan recommendation/apply, stale and duplicate proposal handling, Goal check-in audience review, pending device-action resume, background/restore, and a phone-started run continuing in mobile Chat without duplicate work.

The latest local runtime boundary is recorded in `docs/delivery-evidence/unified-chat/2026-07-23-local-runtime-boundary.md`: authenticated thread hydration, the shared workbench, capability-owned Plan priority presentation, typed durable referent carryover, and an exact pending Plan proposal are proven locally. Automated contract proof also covers cross-domain contextual synthesis from multiple authoritative reads, 23 Phone-to-mobile reviewed-write intents, deterministic staged-action response truth, the shared server persistence adapter, bounded native Profile projection and reviewed edit parity, timezone-grounded Phone Plan recommendations from the same native priority kernel, atomic grouped Plan proposal staging, Activity-owned reminder/focus-today review, and owner-scoped native handoffs for Focus, location, attachments, and Activity/Goal sharing; those server changes remain undeployed. Proposal application/recovery, native handoff completion, unapplied database/functions, physical-device behavior, and Phone Agent continuity remain open.

Relationship memory now has explicit shared server tools rather than depending on whether the model incidentally creates a To-do. `relationships.read` projects bounded People, memory, event, and cadence rows. `relationships.remember` accepts one named person plus strict typed details, requires the separate `remember_relationships` Phone permission on Phone, writes all records and trust evidence atomically, and suppresses duplicate legacy extraction for that job. Mobile Chat calls the same authenticated provider with its existing thread, run, and user-message causal identifiers. `relationships.correct` and `relationships.forget` first require the exact record id and optimistic version returned by `relationships.read`, then write an applied proposal, operation, receipt, and action log in the same transaction. Exact corrections and individual memory/event/cadence forgetting can be undone from that receipt through an owner-scoped atomic restore. Remembering is compensatable by forgetting the exact records it returns, but does not yet expose one-tap receipt Undo. Whole-person forgetting is excluded from both channels until Kwilt can review and restore every dependent relationship record safely. There is deliberately still no parallel CRM or People-list surface.

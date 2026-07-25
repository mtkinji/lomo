# Unified Chat Phase 7 — Cross-channel and proactive continuity

> Execute this plan in the `codex/kwilt-chat-trust-program` worktree. Keep Phase 6 multimodal work paused.

## Goal prompt

Make Kwilt Chat one trustworthy coordination surface across mobile Chat, Phone Agent, and scheduled/background work. Reuse the canonical Kwilt thread, run, proposal, client-action, and receipt records; preserve capability ownership; make retries resume the same work; distinguish reminders, recurring Kwilt actions, monitors, background analysis, and native-device enforcement; and never claim an effect is complete until its authoritative provider has produced the matching receipt or delivery checkpoint.

This phase builds and proves the coordination substrate. It does **not** ship the separate Weekly Options product, a general automation-rules UI, outbound voice, or Phase 6 attachments/artifacts.

## Architectural decision

`kwilt_agent_threads` and `kwilt_agent_runs` remain the causal conversation ledger. Channel jobs and proactive work items are delivery/execution ledgers that must link back to that canonical ledger; they are not alternate chat histories. Capability proposals, pending client actions, and mutation receipts remain the only truth for domain effects.

Supabase Queues and Cron are valid future execution engines, but the current repository already has a Postgres lease/retry worker. Phase 7 hardens and generalizes that model first, preserving migration reversibility and avoiding a second queue technology during the trust program.

## Phase 7A — Provenance and replay-safe execution

### Work

- Add typed run provenance: `initiator`, `trigger_kind`, stable `trigger_id`, and optional `parent_run_id`.
- Accept only these trigger kinds: `user_message`, `reminder`, `recurring_kwilt_action`, `monitor`, `background_analysis`, and `native_device_enforcement`.
- Persist provenance through the authenticated `agent-run` endpoint, the service persistence adapter, Phone jobs, and mobile thread hydration.
- Make a replayed completed/partial run return its already-persisted assistant answer.
- Keep the original external request id across retries. A retry must never create a second canonical run merely because delivery checkpointing failed.

### Done when

- Unit tests prove malformed trigger provenance is rejected.
- Coordinator tests prove a replayed terminal run loads its persisted answer without calling the model or tools.
- Channel-worker tests prove retry uses the same request id and resumes delivery from the durable checkpoint.
- Mobile repository tests prove Phone/background provenance survives hydration.

## Phase 7B — One proactive work ledger

### Work

- Add an owner-readable, service-write-only `kwilt_agent_work_items` table for scheduled/background occurrences.
- Store work kind, capability owner, stable idempotency key, target channel, due time, state, lease/attempt data, and links to thread, run, proposal, client action, or receipt as applicable.
- Add service-only enqueue, claim, retry, and finish RPCs with owner checks, bounded leases/attempts, `FOR UPDATE SKIP LOCKED`, and terminal-state validation.
- Encode completion requirements by work kind:
  - `reminder`: complete only after a channel/device delivery checkpoint.
  - `recurring_kwilt_action`: complete only after a capability receipt; otherwise remain proposed/pending.
  - `monitor`: complete after a persisted observation and delivery checkpoint; it cannot mutate capability state.
  - `background_analysis`: complete after a persisted assistant result/proposal and optional delivery checkpoint.
  - `native_device_enforcement`: complete only after a native client action reports completion; server execution remains pending.
- Keep Phone prompt rows as the current product-specific schedule definition, but link each claimed occurrence to the canonical work ledger instead of treating the prompt state as proof of a Kwilt domain effect.

### Done when

- Migration contract tests cover RLS, grants, owner-link validation, idempotent enqueue, lease recovery, bounded retry, and kind-specific completion requirements.
- Pure policy tests cover every work kind and reject false terminal completion.
- Phone follow-up worker tests show delivery can finish a reminder but cannot claim an Activity/Plan mutation without a receipt.

## Phase 7C — Cross-channel continuation and visible truth

### Work

- Project origin channel and trigger provenance into the mobile Chat aggregate and workbench snapshot.
- Add calm source/continuation timeline language only where it helps causality (for example, “Started by Phone Agent” or “Prepared in the background”); do not turn Chat into an operations console.
- Ensure a Phone-started thread appears in mobile Chat with the same run, proposal, pending device action, and receipt records.
- Preserve deterministic STOP/HELP behavior outside the model path.

### Done when

- Snapshot/timeline tests prove one ordered causal history for mobile-, Phone-, and background-origin work.
- A Phone-origin pending native action remains explicitly pending in mobile Chat until the device transition completes.
- STOP/HELP tests prove no run or work item is created.

## Phase 7D — Deployment and proof

### Work

- Run targeted Jest and Deno tests after each vertical slice.
- Run Supabase migration validation and security advisors before deployment.
- Deploy authorized migrations and affected Edge Functions only after local gates pass.
- Verify the live schema/RPC contracts with authenticated owner and service-role queries where credentials permit.
- Record server deployment, simulator proof, physical-device proof, Twilio provider proof, and TestFlight proof as separate evidence levels.

### Done when

- `npm run verify:changed -- --run` passes.
- Live migration/function versions and read/write policy behavior are recorded, or the exact credential boundary is documented without inference.
- Automated proof covers crash/retry/idempotency and false-completion prevention.
- Physical Phone-to-mobile and signed-device proof is either captured or explicitly deferred because the user is away; it is never inferred from tests or deployment.

## Phase-complete definition

Phase 7 is complete when a user-originated Phone request and a scheduled/background occurrence can both be represented as one canonical causal history, retries cannot duplicate model work, every proactive category has an enforceable completion contract, mobile can hydrate the provenance and pending/receipt truth, all local verification gates pass, and every unverified provider/device boundary is named precisely.

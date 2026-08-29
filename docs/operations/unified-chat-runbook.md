# Unified Chat operations runbook

This runbook covers the shared conversational control plane used by Kwilt Chat, voice, Phone Agent, scheduled runs, and the external ChatGPT/MCP connector. A green source build is not deployment proof. Record the environment, function versions, migration state, catalog hash, native build, and account fixture for every operational claim.

## Normal checks

1. Confirm the deployed catalog hash matches the intended commit and only one hash is active per channel.
2. Inspect `kwilt_conversational_control_alerts` for elevated failure/refusal, replay spikes, receipt mismatch, OAuth scope mismatch, catalog drift, and stalled work.
3. Inspect open rows in `kwilt_conversational_provider_circuits` and pending rows in `kwilt_conversational_control_dead_letters`.
4. Run `reconcile_kwilt_conversational_control(15, 100)` from a service-role operator context. It expires overdue handoffs and moves stale queued/active runs to a truthful failed state with dead-letter evidence.
5. Verify any user-visible completion against the durable run plus action receipt. A proposal, handoff, retailer link, or OAuth launch is not completion.

Never paste raw arguments, OAuth credentials, Screen Time tokens, phone numbers, household details, or financial data into incident notes. The audit ledger stores a digest of already-redacted arguments.

## Surgical controls

Use `kwilt_conversational_control_flags` to disable one operation, provider, channel, or an exact combination. Prefer the narrowest matching row. Record a reason and the incident/change reference. Removing or enabling that exact row restores only that slice.

Provider circuits open automatically after repeated recorded failures and retry after five minutes. Operators may keep a provider open during an active incident. Do not disable all Chat because one provider or consequential operation is unhealthy.

Rate limits are enforced atomically by actor, OAuth client, consequence, and provider. Reusing the same actor/operation/request ID is treated as replay and does not consume a second mutation allowance. Never change the request ID merely to bypass a limit.

## Recovery

- For a replay, return the existing durable outcome; do not repeat the mutation.
- For an expired handoff, create a new reviewed handoff only after confirming the target/version is still current.
- For a stalled run, preserve its failed/dead-letter record and retry with an explicit new request. Do not rewrite the old run as complete.
- For a stale-version conflict, reread the exact target and request clarification or stage a fresh proposal.
- For a receipt mismatch, stop the affected operation/provider and escalate. Do not infer which side succeeded.

## Rollback boundaries

- Edge Functions: redeploy the last known-good function bundle; verify health and catalog hash afterward.
- Database migration: prefer a forward corrective migration. Do not drop audit, receipt, handoff, or dead-letter evidence. Disable the affected operation first if correction is unsafe while live.
- MCP catalog: disable affected external registrations or operation flags, restore the prior catalog, then verify OAuth discovery and `tools/list` separately from execution.
- Mobile feature flags: disable the narrow native provider/handoff while leaving unrelated Chat capabilities available.
- Native build: stop rollout or return to the previous TestFlight/App Store build. This does not roll back already-deployed Edge Functions or migrations.

## Release proof

Before broad rollout, exercise one non-production rollback, validate direct/proposal/handoff/replay/failure families with disposable data, and keep Simulator, physical-device, TestFlight, deployed backend, and production evidence separate.

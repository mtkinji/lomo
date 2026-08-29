# Conversational control incident response

## Triage

1. Identify the exact operation, provider, channel, catalog hash, first observed time, and affected environment.
2. Classify the symptom: authorization refusal, elevated failure, duplicate/replay, receipt mismatch, stalled run/handoff, catalog drift, OAuth scope mismatch, or possible private-data exposure.
3. Apply the narrowest operation/provider/channel flag. For suspected duplicate mutation, receipt mismatch, authorization bypass, or private-data exposure, disable the affected write path immediately.
4. Preserve audit, receipt, handoff, run, and dead-letter records. Never delete evidence as a recovery step.

## Containment by incident type

- Authorization or cross-household concern: disable the operation on the affected external or Phone channel; revoke the connector/token when appropriate; verify actor and Household authority before re-enabling.
- Duplicate mutation: keep the original request ID, inspect its durable receipt, and prevent retries with invented keys.
- Provider outage: open only that provider circuit. Keep unrelated providers and native-only actions available.
- Catalog drift: stop the newer/unknown catalog from receiving writes, compare deployed hashes and tool versions, then restore one intended catalog.
- OAuth scope mismatch: revoke the affected connector grant and require a fresh least-privilege authorization. Do not broaden scopes to make a request pass.
- Stalled handoff/run: run bounded reconciliation, inspect the dead letter, and retry only after checking current target/version.
- Receipt mismatch: treat completion as unknown, disable the operation/provider, and reconcile the authoritative system before communicating an outcome.
- Suspected data exposure: disable the surface, preserve only redacted/digested evidence, rotate affected credentials, and follow the privacy/security escalation process.

## Validation before reopening

Use disposable records to prove authorization refusal, valid execution, duplicate replay, provider failure, stale version, handoff expiry, and recovery. Confirm the audit alert clears, the intended catalog hash is singular, the provider circuit is closed, and no pending dead letters remain unexplained.

Reopen in waves: reads, low-risk direct writes, reviewed writes, native handoffs, then consequential cross-household/provider operations. Record who approved reopening, the exact environment and versions, and the observation window.

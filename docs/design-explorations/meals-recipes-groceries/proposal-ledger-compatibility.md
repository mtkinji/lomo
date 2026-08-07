# Food Proposal Ledger Compatibility

Status: preflight contract proven; persistence migration required before native writes
Last reviewed: August 5, 2026

Food uses Kwilt's canonical `kwilt_agent_proposals`,
`kwilt_agent_proposal_operations`, `kwilt_agent_decisions`, and
`kwilt_agent_mutation_receipts` lifecycle. It does not create a Food-specific
proposal table.

## Existing field fit

| Food requirement | Existing ledger field or representation |
|---|---|
| Capability owner | `capability_id` on proposal, operation, and receipt |
| Typed operation | `operation_type` plus capability-owned validation of `payload` |
| Idempotency | `idempotency_key`, unique per user and capability |
| Expected resource version | Typed operation `payload`; promoted to a named operation-contract field in code |
| Evidence references | Existing run evidence plus immutable identifiers serialized with the operation |
| Person decision | `kwilt_agent_decisions` with proposal version, action, patch, and note |
| Recovery | Receipt transitions through `reserved`, `applied`, `failed`, and `undone` |
| Undo | `undo_operation`, `status`, and `undone_at` |
| Exact return | `resulting_object_type`, `resulting_object_id`, `result_state`, and `return_target` |

Compatibility tests cover import approval, plan finalization, opening a family
choice round, publication, product confirmation, and accepting a Savings Plan.
They also prove stale-version rejection before reservation, idempotent retry,
decline and edit, truthful partial-batch outcomes, reserved-receipt recovery,
and unavailable-provider failure.

## Native Food blocker and narrow migration plan

The generic lifecycle fits, but the current database parentage does not:
`thread_id` and `run_id` are non-null foreign keys on proposals, and
`thread_id` is non-null on receipts. Native Food review can exist without a
conversation and must not create a synthetic Chat thread.

Before Phase 1 persists native proposals, review one migration that:

1. Adds `origin_channel` with a constrained value such as `native_food`,
   `unified_chat`, `phone`, or `connector`.
2. Makes proposal `thread_id`, `run_id`, and `message_id` nullable as a group
   for non-conversational origins; preserves their existing foreign keys when
   present.
3. Makes receipt `thread_id` nullable and derives proposal ownership through
   `proposal_id`; receipts never float without a proposal.
4. Adds database checks requiring thread and run for `unified_chat`, and
   forbidding a run without a thread for every origin.
5. Adds first-class operation columns for expected resource version, evidence
   references, return target, and reversibility if queryability proves useful;
   otherwise retains them in the validated operation payload for the first
   vertical slice.
6. Updates RLS/RPC predicates to resolve the authenticated owner from the
   proposal and capability resource, not from a Chat thread alone.
7. Keeps all existing Chat rows and APIs backward compatible with a backfilled
   `unified_chat` origin.

This migration needs its own regression-first review because nullability and
authorization change together. The preflight intentionally supplies the typed
contract and tests, not a premature database migration.

# Stashed SQL follow-up investigation

Source: `main` at `a663a7e7`, inspected November 1, 2026 (November 2 UTC).
Working branch: `codex/sql-regression-followup`.
Disposition: retain one application repair and three corrected test fixtures;
do not restore the old catalog diagnostics as a product fix.

## Findings

| Saved work | Current evidence | Decision |
| --- | --- | --- |
| Shared-contact trigger | Current source fails with `record "new" has no field "intended_recipient_user_id"` when inserting a delivery. The same function body is still deployed. | Keep the nested table-specific branches. This is a real application defect, not obsolete work. |
| Contextual UGC test | Fails because moderation-table SELECT correctly raises permission denied. The corrected test requires that denial. | Keep the fixture correction; do not broaden access. |
| Plaid lifecycle test | Fails on an empty replay because it assumes an existing auth user. The corrected test creates its own user and rolls back. | Keep the isolated fixture. |
| Chat trust test | Missing `trigger_id` causes the first failure. After the stashed correction, its attachment payload fails the newer multimodal contract. | Keep distinct trigger IDs and add `kind`, `inspection_status`, and `inspection_failure` to both attachment calls. No runtime validation is relaxed. |
| Catalog crash diagnostics | The original catalog test and the instrumented stashed copy both pass locally. | Keep the existing test. Do not infer a catalog application fix or call the historical crash resolved. |

The two SQL stashes contain identical changes. They remain preserved. The old
onboarding replay stash is retired separately and is not part of this work.
PR #197 also contains dinner catalog work and grant/replay prerequisites; this
investigation does not establish that entire PR's readiness.

## Verification

The six targeted SQL files pass after the corrections: targeted contact trigger,
Shared Home deliveries, contextual UGC, Plaid lifecycle, Chat trust, and global
recipe catalog. The new trigger regression fails against the original function
and passes against the repair. It checks both row shapes, both block directions,
inserts/updates, system deliveries, and untargeted invites. Independent read-only
review found no actionable issue in the five-file implementation/test delta.

[Results, source hashes, migration manifest, and logs](evidence/sql-followup-2026-11-01/results.json)
record the negative controls and passing cases. This was an isolated PostgreSQL
17.11 Homebrew cluster with a private Unix socket and no network listener. It
replayed 267 current application migrations, substituting three historical
ordering repairs from PR #197 (`94f6c1ac`), followed by that PR's explicit grant
baseline. Auth, storage, realtime, Vault, and scheduling used documented minimal
service substitutes; cron and network jobs did not execute. This is diagnostic
application SQL evidence, not a complete Supabase service replay.

The live backend reports PostgreSQL 17.6 on Linux; the local server is 17.11 on
macOS and has no JIT provider. These differences prevent using the local catalog
pass to close the older Supabase backend crash. A read-only scan of the last
24 hours found no matching missing-field or signal-11 log entries; that does not
prove the affected workflows succeeded or that the latent defect is harmless.

## Integration and deployment boundaries

The restored trigger SQL is byte-identical to the stashed repair. It now uses a
fresh CLI-generated forward migration,
`20261102031926_repair_targeted_contact_trigger.sql`, after current migrations.
It changes only the existing trigger function body and preserves its invoker
security, empty search path, privileges, and bilateral block checks.

At the investigation checkpoint, no production mutation, app release, or merge
had been performed. The original
`scripts/public-data-api-grants.test.mjs` and its baseline migration are still
on unmerged PR #197, not current `main`; this branch does not silently import
that larger change. Deployment of the trigger repair required its own review
and approval. PR #197 still needs service-equivalent SQL validation before its
historical catalog-crash gate can be closed.

## Production deployment — November 2, 2026

PR #201 merged as `0ffa7844` after review, local verification, and CI. Andrew
then explicitly approved deploying its trigger repair. Supabase applied the
reviewed SQL from `9e428f46` and assigned ledger version `20261102140026`.
The repository migration was renamed to
`20261102140026_repair_targeted_contact_trigger.sql` to match; its bytes and
SHA-256 are unchanged. The earlier test manifest retains the original filename
as historical evidence of the tested candidate.

The [deployment receipt](evidence/contact-trigger-deployment-2026-11-02.json)
records exact ledger SQL and function-body matches, unchanged function identity,
owner, invoker security, empty search path, privileges, and both enabled trigger
bindings. All 444 security advisory findings were unchanged after excluding
observation timestamps. This is deployment-contract evidence; behavioral tests
remain the isolated PostgreSQL evidence above. No household rows were written
for verification, and no signed-in live delivery, physical-device acceptance,
or app release was performed.

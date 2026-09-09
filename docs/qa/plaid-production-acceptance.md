# Plaid production acceptance — September 8, 2026

## Scope and provenance

Source checkout: `/Users/andrewwatanabe/Kwilt`; branch `codex/plaid-production-completion`; base `88cb2b77a700c9da59f482a0e2a30f2df781ccd2`. Plaid changes are uncommitted. Existing Explore, Focus, Plan and verify-changed modifications belong to other work and are preserved. This task later used the existing simulator for a transaction-refresh check; no dev server, new build, or app install was started by this task.

## Baseline audit

- Production approved, Transactions enabled, Pay As You Go. Security questionnaire and use cases completed despite overview counters.
- Major US OAuth institutions enabled; registered redirect `https://app.kwilt.app/plaid/oauth`; live AASA authorizes the current app identifier and path.
- Production API logs: Link token creation succeeded August 30; sync succeeded September 3. Database: 3 production connections and 3,828 transactions. This is historical operation, not proof of the September 8 App Store build.
- Deployed source recovered: sync v26 and exchange v24. Disconnect function absent; database status constraint excluded disconnected/disconnecting. No Plaid webhook receiver or cron.

## Repair acceptance evidence

- Deno function suite: 141 passed, zero failures. Covers signature/age/body integrity, durable enqueue HTTP behavior, disconnect reservation/idempotency, sync pagination restart and durable continuation, failure state, and duplicate identity. Full Edge Function typecheck passed.
- Transactional database test `supabase/tests/plaid_lifecycle.sql`: exclusive connection lease, webhook generation preserved across job completion, health revision preventing stale sync from clearing new events, repair completion, token removal, and service-only grants. Run against the candidate migration in a transaction with rollback before deployment.
- Native Jest checks: 14 passed across three suites, covering prepared Link, cancellation, exchange, repair success/failure, duplicate confirmation cancellation, and sanitized diagnostics.
- Two migrations applied: `20260908172819_plaid_production_lifecycle.sql` and `20260908172957_schedule_plaid_sync_worker.sql`.
- Final deployed versions: webhook 2, worker 2, disconnect 2, sync 28, exchange 26, create-Link-token 27. Read back all six bundles and confirmed every local dependency matches the deployed source.
- Live production evidence at 17:36 UTC: all three connections healthy, no errors, all three webhook URLs registered, refreshed between 17:29:38 and 17:31:03 UTC. Durable queue and staging both empty. One-minute worker schedule active.
- Plaid dashboard recorded successful production `/item/webhook/update`, `/transactions/sync`, `/webhook_verification_key/get`, and signed Item webhook delivery (HTTP 200). Authenticated worker returned HTTP 200; unsigned webhook and unauthenticated worker/disconnect returned 401.
- Repository completion gate: final run passed 1,189 Jest suites / 7,419 tests, but failed the same three existing migration-fixture tests because their referenced files are absent from HEAD. App and test typechecks, code-health ratchet, and audio gates passed before Jest. Backend typechecking, all 141 Deno tests, and architecture lint were run separately and passed; architecture reports 10 existing warnings. The rerun was justified by final continuation handling and the expanded backend test command.
- Logs: `/tmp/kwilt-plaid-deno-tests-final.log`, `/tmp/kwilt-plaid-deno-check-final.log`, `/tmp/kwilt-plaid-verify-final.log`.

## Required published-device checks

| Check | Required evidence | State |
| --- | --- | --- |
| New bank link | Installed App Store version/build; authenticated Pro user; provider Link session; stored connection and initial import | Needs physical device and user bank authentication |
| OAuth return | Bank app installed and browser fallback; cold/warm return to Kwilt | Needs physical device |
| Later transactions | Provider webhook accepted, durable job drained, new rows/freshness visible in app | Signed webhook and live sync passed; new-transaction/device observation pending |
| Repair | Update-mode success, server confirms bank state, repair warning clears | Needs bank-authenticated fixture/device |
| Cancel | User cancels Link; no new connection, no misleading success | Native Jest passed; published-device observation pending |
| Disconnect | Provider removal confirmed; token removed, job removed, no further sync | SQL/unit evidence passed; disposable provider fixture pending |
| Account deletion | Provider removal and existing account-deletion acceptance matrix | Existing account-delete code present; task has not deleted a real account |

Do not check dashboard tasks off based on these source tests. Code completion, deployed backend proof, and signed-device proof remain separate.

## Operational design

Plaid signs the webhook, which verifies ES256, key status, five-minute age, and exact raw-body SHA256. The receiver durably enqueues before acknowledgment. A dedicated-secret worker drains bounded batches with backoff and expired-lease recovery. The daily freshness sweep queues only unqueued Items and does not reset retries. Connection leases serialize sync/disconnect; webhook health revisions prevent later sync from erasing a newer warning. Explicit repair completion verifies provider state.

Duplicate checks are scoped to the same owner/environment/institution. Only equal provider-returned persistent account IDs authorize removal of a newly created redundant Item. Matching name/mask/type/subtype sets trigger a user confirmation before exchange; those weaker identifiers never authorize automatic removal. The new confirmation and explicit repair completion require the next signed app release. Distinct household members may legitimately connect the same joint account.

## References

- https://plaid.com/docs/api/webhooks/webhook-verification/
- https://plaid.com/docs/link/duplicate-items/
- https://plaid.com/docs/transactions/sync-migration/

## Release handoff

The backend deployment is already in production and benefits the existing app. A new signed app build is needed for local Link diagnostics, the duplicate-bank confirmation, and explicit server-verified repair completion. This task has not built, submitted, or installed that release. Coordinate it with the checkout owner because unrelated native Focus, Explore, and Plan work is in progress. Preserve the installed version/build in device evidence.

Run the table above with a disposable linked bank connection for disconnect; do not remove any existing real connection merely to produce test evidence. Automatic backend freshness is confirmed; newly arriving transaction visibility and device OAuth return still require observation.

The worker secret is retained only in Supabase Vault; the temporary local credential file was removed after the final authenticated HTTP 200 probe. RLS intentionally grants no client policies on the service-only queue, leases, and staging tables.

## Existing completion-gate failures

The following absent migration fixtures prevent a green repository-wide gate; none was removed by this task:

- `20260903132918_contextual_ugc_safety.sql`
- `20260903142313_restore_personal_meal_plan_grocery_authority.sql`
- `20260903144422_repair_legacy_planned_recipe_scale.sql`

## September 8 Budget refresh timeout repair

The simulator displayed `Money could not read transactions: canceling statement due to statement timeout`, followed by `Couldn't refresh`. This occurred after successful Plaid sync: the failing path is `createMoneyRepository.loadSnapshot` → paginated `budget_transactions` read with a connection environment join → RLS `can_access_budget_user(user_id)`. That predicate repeatedly computed canonical household membership for each row.

- Current checkout/branch/base remain as listed above; unrelated dirty work preserved. Read-only simulator inspection found booted iPhone 17 Pro, installed version 1.0.118 (118). No app rebuild, launch, install, or Metro takeover occurred; no listener was found on port 8081.
- Authenticated production query reproduction: 4,960 ms for one 1,000-row page; the same query with a three-second timeout failed inside `budget_canonical_adult_owner_user_id`.
- Migration `20260908193625_cache_money_transaction_read_authority.sql` deployed. It changes only the transaction SELECT policy to evaluate actor context in uncorrelated subqueries. Existing child denial, canonical-owner precedence, legacy sharing, anonymous denial, and write policies are preserved.
- Candidate narrow query: 13 ms. Post-deployment query selecting all transaction columns plus connection environment: 18 ms. These are database timings, not complete UI refresh timings.
- `supabase/tests/money_transaction_read_authority.sql` reproduces the old timeout and passes after the fix. It compares visible owner IDs and per-owner row counts against the unchanged canonical predicate for every current auth user, then tests missing identity and anonymous denial. All work rolls back. Fixture coverage depends on current data; independent review also checked branch equivalence against the existing predicate.
- Security advisors before and after deployment compared: no new findings. The user subsequently confirmed successful Budget refresh, taking approximately 5–8 seconds.
- Completion gate log: `/tmp/kwilt-money-read-verify.log`. App/test typechecks and preceding gates passed; Jest passed 1,189 suites / 7,420 tests and failed the same three pre-existing missing migration fixtures listed above. The SQL regression and production query verification passed independently. Other tasks continued modifying the shared checkout during this run; no repository-wide clean-state claim is made. A read-only simulator screenshot after deployment showed Explore, so Budget refresh confirmation remains pending.

## Remaining refresh latency work

The user confirmed Budget refresh succeeds after the RLS repair, with approximately 5–8 seconds of total wait. This confirms the timeout recovery in the simulator, not a signed physical-device test.

The full refresh path is Budget `refreshBudget` → connected activity reconciliation → bank sync → governed foundation → optional classification → living-plan evaluation → final snapshot. Live database statement deltas around an explicit simulator transaction check showed four history pages for living-plan evaluation and four for the visible snapshot. Aggregate database time for those two page sets was about 46 ms and 166 ms; network round trips and the other sequential phases remain outside those figures. The actual PostgREST lateral-join query shape also completed in about 21 ms after the RLS change.

- **Deployed:** `sync-plaid-transactions` version 29 runs at most two independent bank connections concurrently. Per-connection leases remain active; all bank operations settle before reporting failure, receipts retain order, and foundation writes remain serialized within the request. Read-back bundle equals local source. Edge typecheck and all 145 backend tests passed.
- **App source, next build:** both history consumers now request the first page, then at most three pages concurrently. For four-page history this reduces each download from four sequential request waves to two. Short histories still use one request; results retain order; required-page failures reject rather than silently truncate. Callers that do not opt in remain sequential. Focused pagination/repository/living-plan tests: 28 passed.
- **Runtime limit:** the explicit transaction check completed and showed `Just now`; UI automation's observation interval was too coarse to establish an exact end-to-end duration. The simulator still runs 1.0.118 and does not contain the new app-side batching. No quantified whole-refresh speedup is claimed yet.
- **Verification:** completion gate repeated because app batching changed after the backend-only run. Final log `/tmp/kwilt-money-refresh-final-verify.log`: 1,190 Jest suites / 7,424 tests passed; the same three pre-existing missing-migration suites failed. App and test typechecks plus preceding gates passed. No whole-repository green claim.

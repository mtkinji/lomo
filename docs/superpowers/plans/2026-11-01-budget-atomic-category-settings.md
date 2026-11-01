# Atomic Budget category settings implementation plan

Execute inline in the existing checkout. Use regression-first SQL and TypeScript tests and a read-only code review. Do not deploy the new schema without explicit approval after the implementation is reviewable.

**Goal:** A single Save changes name, amount/funding, role, and rollover together, with one durable receipt, concurrency rejection, and safe recovery after a lost response.

**Architecture:** A capability-owned command prepares one immutable request. A Postgres RPC resolves the canonical household owner, checks category/plan versions, serializes owner plan changes, validates the complete settings and reviewed governed candidate, commits all writes and the receipt together, and returns persisted values. The request ID and body survive uncertain retries. Snapshot reads are recovery work after a confirmed receipt, not part of the write outcome.

## Server boundary

- Add a CLI-generated migration for `save_budget_category_settings` and `get_budget_category_settings_receipt`, backed by an RPC-only private receipt table keyed by actor and request ID.
- Reuse the existing governed promotion implementation through a private helper that takes a verified owner. Keep the existing public promotion API and legacy actor ownership behavior intact; the new command uses canonical household ownership.
- Use a consistent owner lock before plan/category locks. Check both category and plan `updated_at`; reject different request bodies under the same ID, stale active versions, malformed settings, and mismatched reviewed allocations. A downstream governance failure must roll back category, plan, override, and active version together, then retain a rejection receipt. Replaying a rejected request must never become a new write.
- Explicitly revoke table access from API roles. Restrict RPC execution to authenticated permanent adults with current owner authority. Receipt lookup rechecks actor/owner authority; revoked members cannot recover receipts.
- Add `supabase/tests/category_settings_command.sql`: success, full rollback after a late failure, same-request replay, changed-body rejection, stale row/active-version rejection, governed promotion, canonical caregiver, child/unrelated/anonymous/signed-out denial, and private receipt privileges. Exercise concurrent retries before deployment.

## Client boundary (after server contract is verified)

- Add typed settings request/receipt/outcome module and a repository RPC adapter; preserve request identity across unknown outcomes and expose receipt lookup.
- Carry category and plan concurrency versions in snapshots and confirmed patches.
- Replace the screen's multiple writes with one command. Keep the entire save/preview operation locked; preserve entered work on rejection or unknown outcome. Only discard the draft after confirmation.
- Reuse governed preview validation and candidate payload construction. Resolve household owner consistently for preview evidence and active-plan reads; do not silently bypass governance for a second adult.
- Apply all confirmed fields and versions locally, then reconcile once. A failed refresh must not turn a confirmed save into a failed save.
- Native and conversational settings callers share the same command policy; do not preserve an alternative fragmented full-settings path.

## Verification and delivery

- Run SQL regression red before implementing the RPC, then green against an isolated PostgreSQL database with production definitions and test users only. Record any reduced harness limitations.
- Run focused client regressions, scoped `verify:local`, grants checks, and read-only review.
- Keep compatibility/deployment, integration gate, installed-device save/reopen/offline/retry flows and latency measurements separate. The atomic-save finding stays open until the full path and relevant environment are verified.


## Server implementation evidence (November 1)

Completed locally: `supabase/migrations/20261101154005_atomic_budget_category_settings.sql`, `supabase/tests/category_settings_command.sql`, and `scripts/money/verify-category-settings-postgres.py`.

Run the repeatable isolated check with:

```sh
python3 scripts/money/verify-category-settings-postgres.py --pg-bin /opt/homebrew/opt/postgresql@17/bin
```

The runner creates a new socket-only PostgreSQL 17 cluster, loads the historical production table/trigger/governance/owner-helper definitions used by this command, applies the migration, exercises rollback/replay/actor/governance cases and two-session serialization, then removes the cluster. It never uses app connection configuration. Auth JWT functions and SELECT policies are harness substitutes; this is not a full Supabase migration replay or deployed-environment proof.

The contract initially failed because the atomic RPC did not exist. Later regressions reproduced alias ambiguity and disabled-governance amount overwrite before corrections. The reversal lock-order check failed before correction because reversal read active-plan state while another command held the owner lock. Final read-only review found no remaining material issues in the server slice. Current results prove SQL behavior under this harness, not client integration. The subsequent client follow-up below adds command/request recovery, current-state versions and provider integration. Screen wiring, household preview ownership and release compatibility remain required before this feature is complete or ready to deploy.


## Client command and provider follow-up (November 1)

Implemented locally: immutable request preparation from exact category/plan versions and the reviewed candidate, an actor-bound RPC adapter, an actor/category-scoped AsyncStorage request journal, coalesced identical submissions, and explicit receipt recovery. Unknown outcomes retain the original request/body across controller recreation; a failed refresh is outside the write outcome. The provider exposes load/save operations, applies complete confirmed fields and row versions, starts one background refresh, and suppresses results from an obsolete account session. Recovered old receipts do not overwrite a snapshot whose row versions have moved on.

Review found and regression tests reproduced a session change between auth preflight and RPC dispatch, recovery-ID loss after an unavailable retry, reserve history loss, and over-permissive rollover receipt validation. Both RPCs now enforce the expected actor. The server persists selected business rejections after rolling back all attempted settings; replay returns that rejection rather than ever retrying its writes. Infrastructure/auth failures cannot resolve an earlier unknown outcome. Rollover validation permits only the trigger's confirmed-month contribution normalization. Snapshot and patch reserve calculations share signed spending/credit accumulation, including current-month refunds against older spending.

Focused evidence: 44 adapter/controller/patch tests passed before the later reserve-credit and provider regressions; the latest provider/read-lifecycle/patch run passed 40 tests across three suites. The isolated PostgreSQL 17.11 runner passes actor, rollback, durable rejection/replay, governance and concurrent request/reversal cases. Task-wide scoped verification is recorded in the assessment after the final run.

Still open: connect the settings drawer to these provider methods with draft recovery and a lock covering preview through save; align household preview/evidence reads; unify conversational callers; add compatibility/release checks; verify installed-device save/reopen/offline/retry behavior and latency. No atomic-settings migration, command or provider change has been deployed, and the current settings drawer still calls the original fragmented write path.


Final local command/provider check: `verify:local` passed in 114.66 seconds across 29 selected files, with 242 related suites / 1,696 passing tests / two skipped, both typechecks, architecture (44 tooling tests), code health, explicit grants and whitespace. Ten other changed files were outside the scope. Final read-only review has no remaining material findings in this slice. The fresh isolated SQL runner passed as well. Derived monthly-plan summaries are invalidated after confirmation until refreshed, aggregate forecasts use shared projection, and duplicate receipt callbacks reconcile once. Screen wiring and household preview authority are the next implementation slice, not verified outcomes.

## Settings drawer contract

Repository/platform: `/Users/andrewwatanabe/Kwilt`, Expo/React Native app, iOS and Android. Job: change a category's name, contribution, role and rollover together, and know whether the change saved. Success means one confirmed request, preserved inputs on error, and recoverable pending work after reopening. The next task is returning to the category with its confirmed values while reconciliation refreshes the wider plan.

Authority: the user's reliability requirement, Money's existing product contract, native accessibility requirements, Kwilt's UI constitution/input guidance and owned controls, then RNR's generic anatomy. Reuse the existing category-settings grouping (`SettingsGroup`, `SettingsTextInputRow`, `SettingsChoiceRow`, `MoneyRolloverSettings`) and `BottomDrawer`/header/Button; `bottomAccessory` is an existing compatibility seam, not a new canonical pattern. The supplied screenshot is current-product failure evidence, not an external style exemplar. No styling or dependency change is required.

Three-second read and scan order: category settings, editable values, one Save changes action or Check save recovery action with its outcome. Required states: loading recovery, editable, preview/save locked, rejected with inputs retained, uncertain with the original request frozen, recovered confirmation, and recovery-read failure with retry. Closing is disabled during the active preview/save operation; leaving the screen still suppresses obsolete UI effects. A pending save survives leaving/reopening through the device journal. Do not add confirmation dialogs or a second keyboard/scroll owner. Reduction/craft pass keeps the existing surface and makes its single primary action explain the actual operation.

Proof path: Budget → category → Category settings → edit/save/reopen; inject late/failed response, refresh failure, stale category, double tap, and account change in focused behavioral tests. Then inspect the real native route, keyboard, loading/error/read-only recovery states and persisted values on a named installed build. Automated proof is not native acceptance. Household preview reads must resolve the same owner as the atomic save without broadening write privileges.

## Drawer integration and household preview follow-up

The native category settings caller now prepares and submits one atomic request. The editor captures original row versions, reads the actor/category journal before enabling edits, locks through preview and submission, restores unknown requests for Check save, keeps rejected inputs open, and ignores obsolete session/preview responses. Reserve settings retain their carry-forward policy without also enabling monthly rollover. Dismissal is disabled through the owned drawer's `dismissable` API while saving, rather than only guarding its close callback. Existing forecast and cover editors keep their separate operation contracts.

Category preview resolves the household owner once and passes that scope through settings, active-plan and evidence reads. This is explicitly scoped to the category preview path; general plan settings/reconciliation and conversational command migration still need their own owner/write-policy alignment. The new CLI-generated migration `20261101163341_household_category_settings_preview_read.sql` grants current permanent adults SELECT on the canonical owner's planning basis and plan config while preserving write privileges. The existing owner config read policy now also excludes anonymous sessions.

Regression evidence includes actual screen interaction tests with real owned fields/buttons and a test drawer host; the host does not prove native animation/keyboard behavior. The PostgreSQL harness now loads original living-plan RLS/grants and canonical access helpers, and reproduces caregiver basis/config denial before the policy fixes. It verifies owner/adult reads, unchanged basis writes, and child/unrelated/anonymous/revoked denial. Review caught the config read gap and native dismissal contract; both have failing-then-passing regressions and a clean follow-up review.

Native proof remains open: the booted iPhone 17 Pro Simulator has Kwilt 1.0.127 (127), not this candidate, and no Metro server was running on 8081 when inspected. No app was launched or production schema changed by this follow-up. Current source/bundle and test evidence must not be described as installed-device acceptance.

## Conversational Budget update follow-up

Native Chat budget-amount proposals now use the same atomic category settings command as the drawer. The prior governed/direct split boundary and its post-commit full snapshot read have been removed. Each confirmed proposal produces a stable actor- and intent-derived request UUID, preserves the original category fields/versions, resolves canonical household scope for preview, and writes through the shared durable journal. The server receipt lookup now also returns the original request under its existing actor/owner checks, enabling recovery after relaunch or on a different device without rebuilding the request from changed Budget state.

Recovery checks that exact operation before current snapshot/version checks. A matching current amount cannot establish success. An uncertain response, canceled recovery authentication, or unavailable entitlement check leaves the proposal applying; a durable server rejection may fail it. Confirmed writes remain recoverable if Chat receipt finalization or status transition fails. A recovered server result also resolves its matching local journal through the shared command lock, preserving any different pending save. The action wrapper no longer caches rejected promises that prevent a later recovery attempt.

Regression tests cover the actual Chat boundary with the shared repository/journal, lost response and cleanup, a second device with no journal, original request identity, canonical preview scope, stale proposals, preservation of another drawer save, and confirmed writes followed by unavailable snapshots or Chat bookkeeping. SQL tests assert the original request is returned without changing the receipt's original confirmed fields; existing actor/revoked/anonymous checks remain. Review found canceled-auth false failure and retained-journal blocking; both were reproduced and corrected. Integration checks and review follow-up are recorded in the assessment. No new migration has been applied and no runtime has been launched.

Open beyond this slice: compatibility/release gates, general Money owner/actor alignment, bounded history/read-model work, native save/reopen/offline/retry behavior, and actual device latency measurements. Other Money proposal types and standalone category rename/forecast/cover flows retain their existing contracts; this is not a claim that every Money mutation has been unified.

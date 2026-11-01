# Budget quality assessment and improvement program

Date: 2026-11-01. Status: baseline assessed; improvement program active, not completed or released.
Framework: [Kwilt product and engineering quality index](product-and-engineering-quality-index.md).

## Latest status

| Workstream | Current evidence | Remaining gate |
| --- | --- | --- |
| Original missing rollover column | Approved production schema repair verified | Confirm Andrew's installed workflow |
| Category settings and Chat amount changes | Shared atomic command, durable recovery, household preview; local tests/SQL/review passed | Backend compatibility, authorized deployment, native save/reopen/retry acceptance |
| Read performance | Equivalent reads coalesced; Chat avoids a full post-save snapshot; repeated merchant normalization removed with identical synthetic snapshot results | Bounded history/read model and named-device latency measurements |
| Household read consistency | Snapshot, active plan and income evidence use one resolved owner; missing/denied reads distinguished | General settings/reconciliation writes, deployment and native caregiver acceptance |
| Transaction rendering/accessibility | Virtual list retains full data while bounding mounted controls; isolated real-screen Simulator cases and fresh-launch large text checked; scoped local gate passed | Native scroll/pull gestures, in-session text resizing, shared-caller acceptance and release-mode latency |
| Release reliability | Read-only backend contract wired into supported TestFlight releases; local failure fixtures pass | Configure release read token, deploy approved compatible backend, verify API/native acceptance |

The earlier local command/drawer/Chat candidate passed 1,313 Jest suites with 8,229 tests, two skipped tests and two snapshots. Typechecks, Chat delivery/contracts, architecture, code-health, explicit grants and whitespace also passed. The isolated PostgreSQL contract and an iOS bundle export passed separately. That export predates the release-configuration and projection follow-ups below. The later transaction slice now has [partial native fixture evidence](evidence/budget-native-2026-11-01/README.md) using current screen JavaScript in an existing development host. No new native build or migration was deployed; this is not production or signed-in workflow acceptance.

## Decision

Budget has useful domain foundations and substantial tests, but its save/read orchestration and deployment guarantees do not meet the reliability of a frequently used household finance workflow. Improve those boundaries first. A visual redesign or file-splitting exercise would leave the principal failures intact.

The primary audience is Maya, the family organizer. The relevant job is [review household money reality before spending or changing the plan](../jtbd/move-the-few-things-that-matter/review-budget-reality-before-spending.md). The weakest steps in the [Money job flow](../job-flows/maya-review-budget-reality-before-spending.md) for this assignment are correcting a plan, receiving a trustworthy result, and trusting the pattern enough to repeat it. Andrew's repeated failures and delays are current user evidence; historical delivery scores are not fresh acceptance of the present build.

Product/release owner: Andrew. Implementation/evidence owner: the agent executing this program. Production changes retain explicit action-specific approval; the prior rollover approval was not blanket approval for later schema changes.

## Candidate and proof boundaries

- Source: `/Users/andrewwatanabe/Kwilt`, branch `codex/simple-dinner-expansion`, HEAD `94f6c1ac31d245a600d21c5b71e144308894f334`.
- Starting checkout had unrelated SQL regression/grant documentation edits. Preserve them. The rollover schema-contract test belongs to this thread's preceding repair.
- Live backend: Kwilt project `sqxwjtorodqjdfnuvprf`. Read-only inspection for this assessment; the separately approved rollover repair was applied earlier in this thread.
- A booted iPhone 17 Pro simulator was discoverable, but no Metro listener was running on 8081. No current app build/install provenance or measured interaction was established. This assessment does not claim Simulator, hardware, or TestFlight acceptance.
- The initial assessment was documentation only. The read-lifecycle follow-up below changes client source locally; no new client build has been installed or released. The index itself is not automatic enforcement.

## Initial measurements

| Observation | Result | What it proves / does not prove |
| --- | --- | --- |
| `npm test -- --runInBand src/capabilities/money` | 115 suites, 665 tests passed; 20.122 seconds | Current capability Jest baseline. Does not exercise real network/device performance or all SQL/Edge Function contracts. |
| `npm run architecture:lint` | 44 tooling tests passed; lint passed with zero warnings | Existing architecture/style rules hold; these rules do not enforce atomic category saves or request budgets. |
| `npm run product:lint` | Zero errors, 10 existing missing-manifest-reference warnings; Chat delivery/parity checks passed | References are consistent; not evidence of current Budget workflow quality. |
| Code-health analyzer restricted to non-test Money TS/TSX | 124 files, 19,426 lines; five files over 800 lines, two over 1,500; eight `as any`, zero `@ts-ignore` | Maintainability baseline using the repo's analyzer (which counts the terminal newline). No automatic quality score inferred. |
| Test-source inventory | 22 of 115 test files read source text | Some checks establish syntax/layout contracts rather than interaction behavior. The category-detail test file checks source text and does not render its save workflow. |
| Live aggregate transaction inventory | Largest two owner histories contain 3,979 and 3,177 rows | Full-history reads are material at actual usage volume. No identities or transaction content retained here. |
| Live cumulative `pg_stat_statements` | Two high-total-cost transaction-query variants: 1,767 calls averaging 526.92 ms / max 7,962.68 ms, and 697 calls averaging 594.08 ms / max 6,629.92 ms | Historical database burden, not current-build p95. Statistics reset is 2025-12-23; variants span deployments and workloads. |
| Fresh authenticated-role read-only EXPLAIN ANALYZE | Narrow production-connection join, sorted transaction page of 1,000: 69.078 ms execution, 3.639 ms planning; scans 3,979 matching transactions before the top-N result | Current bounded relational-query evidence. This omits full selected fields, PostgREST JSON, transport, device projection, and rendering. Do not substitute it for app latency. |
| Live rollover schema | Migration `20261013123903`, field, validator, constraint and trigger verified after approved repair; temporary-row history tests passed | Specific backend mismatch repaired. App save on Andrew's installed phone remains to be confirmed. |

## Initial assessment by discipline

| Area | Practice maturity | Current outcome evidence | Principal gap / next action |
| --- | --- | --- | --- |
| Purpose and scope | Documented / implemented | Passed for this assignment's framing | Prioritize fast, reliable corrections and trustworthy results. |
| Audience/jobs/research | Documented; references checked | Incomplete | Direct complaint is strong evidence of failure; measure exact affected journeys. |
| Whole-job delivery | Implemented | Failed in reported use; partial repair verified | Repeated save/refetch/relaunch and same-household cases need current proof. |
| Interaction/accessibility | Implemented; selected rules enforced | Unverified for current installed build | Preserve draft and whole-operation pending state; verify taps, keyboard, accessibility and recovery. |
| Architecture/ownership | Implemented; selected lint rules enforced | Incomplete | Category orchestration is split across screen, provider, repository and governed plan logic. |
| Data integrity | Constraints, receipts, some atomic RPCs implemented | Incomplete | A settings Save is multiple durable writes; actor/owner use differs across repositories. |
| Reliability/recovery | Cache, version guards, some typed errors implemented | Incomplete | Commit versus refresh failures, races and duplicate submissions lack a unified contract. |
| Performance/scaling | Partial telemetry and parallel reads implemented | Incomplete | No current device latency baseline; full-history rereads and repeated plan reads are visible in source. |
| Security/privacy | RLS, grants, Pro boundaries implemented | Incomplete | Existing protection is meaningful; no fresh complete actor matrix or privacy-runtime audit in this pass. |
| Maintainability | Types, domain modules and ratchets implemented | Mixed | Large screens exist, but request/state ownership is the more consequential problem. |
| Verification/review | Automated checks implemented | Passed for named checks, incomplete for workflows | Add behavior tests for settings saves, races, retries and deployed schema compatibility. |
| Delivery/operation | Migration/release machinery implemented | Failed compatibility gate in this incident | App required an unapplied migration; preflight currently exists as an unwired SQL check. |
| Observability/support | Coarse mutation events implemented | Incomplete | No stage breakdown, exact-build latency distribution, or known affected-operation denominator. |
| Outcome learning | Job flow and evidence contracts documented | Stale / incomplete | Existing split scorecard has no installed-build identity, zero observation days and no household assessments. |

## Initial findings and root-cause confidence

### BQ-01 — A settings Save is not one atomic command (high priority)

Confirmed source: `MoneyCategoryDetailScreen.tsx` calls `updateCategoryPlan` separately for amount/funding, rollover, and plan role, followed by `renameCategory`. Each has independent persistence and some start their own background refresh. If a later operation fails, earlier changes can already be durable. Provider `savingCategory` covers individual operations, not the complete screen save; the screen has no independent whole-save lock.

The rollover incident confirms one rejection on this path. Partial persistence and duplicate submission are source-supported risks requiring failure-injection reproduction; this audit did not deliberately corrupt a live budget to demonstrate them.

Required change: one capability-owned settings command with explicit expected versions, canonical owner/actor checks, atomic server commit, an idempotency key retained across uncertain retries, and one authoritative receipt. Include governed allocations, category identity, role and rollover in the transaction when they change together. Native and conversational callers must use the same policy boundary. Do not replace this with an ordered sequence of individually atomic writes.

### BQ-02 — Small changes cause expensive repeated reads (high priority)

Confirmed source: `moneyRepository.loadSnapshot` loads all accessible transaction history and allocations, then loads the active plan and its evidence. `collectAllPages(..., 1000, 3)` is bounded concurrency, not a 3,000-row truncation. At baseline, `MoneyDataContext.refreshInBackground` started a new snapshot load per call; discarded results still consumed work. The local follow-up below coalesces selected equivalent reads; full-history loads and reads after distinct writes remain.

For a 3,979-row history, an active plan, one allocation page and current schema, the source path entails 16 data requests plus three `auth.getUser` invocations (SDK transport/cache behavior may affect actual HTTP counts). These are partly parallel; this is not 19 serialized round trips. The governed category-save branch calls `loadMoneyPlanProjection` on a snapshot that `loadSnapshot` has already projected. Settings/preview/reconciliation also independently read active plan and full-history evidence.

Required change: a coherent read model and shared request lifecycle. Coalesce equivalent in-flight reads; invalidate on confirmed mutations and identity changes; avoid reusing a pre-mutation result as fresh. Separate the first useful Budget answer from paged historical inventory while preserving complete rollover evidence. Load one version-pinned authoritative plan after commit. Measure request counts before/after and preserve truth at 4k/10k histories.

### BQ-03 — Successful writes and read recovery have inconsistent semantics (high priority)

Confirmed source: bounded transaction writes patch immediately and treat background failure separately. In contrast, category creation, splits and saved-resource changes can persist and then reject because their subsequent full snapshot fails. Governed category commits can similarly fail during the follow-up projection after persistence. A generic failed-save result then cannot tell the user whether retrying would duplicate or replace work.

Required change: explicit `confirmed`, `rejected`, and `outcome_unknown` write results, durable operation identity and receipts. A refresh failure after confirmed persistence must report saved-but-refresh-pending; an unknown write must be reconciled before replay. Preserve unsaved drafts on actual rejection.

### BQ-04 — Local confirmed state is not uniformly complete (high priority)

Confirmed source: repository category receipts include `planRole` and forecast settings, but `MoneyDataContext.applyCategoryMutation` and `ConfirmedCategoryPatch` do not forward/apply those fields. Transaction patches also do not carry the confirmed `updatedAt`; a following action may use an older concurrency version until refresh. Some totals intentionally await authoritative refresh, but the UI needs an explicit pending-reconciliation state instead of implying current truth.

Required change: typed receipts and a single projection path that carry all changed fields and versions, invalidate dependent answers explicitly, and agree with refetch. Add immediate-second-action and failed-refresh regressions.

### BQ-05 — Household ownership is not uniform across read paths (investigation priority)

Confirmed source: shared ledger reads rely on RLS, but `getActiveLivingPlan`, settings, plan-limit evidence and client reconciliation explicitly filter by the authenticated user's ID. Live active-plan RLS allows `can_access_budget_user(user_id)`, and only one active plan exists. This creates an apparent actor-versus-owner discrepancy for a second adult; it is not yet a reproduced failing spouse workflow.

Required investigation/change: exercise owner, adult, child, unrelated and revoked-member contexts. Resolve canonical budget owner once at the trusted boundary; retain actor for audit. Do not broaden access or guess owner from the first returned row. Preserve standalone-user semantics and Pro/privacy boundaries.

### BQ-06 — Release compatibility is not enforced (confirmed incident)

The installed feature used `rollover_policy` while production lacked its migration. Read fallback made the screen usable enough to reach a write that could not succeed. The error wrapper mislabeled the write failure as a read failure. The repair is deployed, but the systemic condition remains.

Required change: a versioned required-capability/schema contract checked against the release target, plus a forward-compatible app policy for unavailable capabilities. Gate the exact mobile/Edge Function candidate against columns, RPC signatures, grants and relevant RLS behavior. Run `category_rollover_schema_contract.sql` as part of that process. A source migration file and migration-name listing alone are insufficient.

### BQ-07 — Workflow verification and latency evidence are weaker than test counts suggest

All 665 capability tests passed while the reported production mismatch existed before the repair. Category settings tests mostly search source strings; they do not drive a combined save and fail its second operation. Money Maestro flows focus on splits, require authenticated runtime/fixture parameters, and are not current evidence of rollover/category save coverage. The scheduled full-suite configuration is not proof that such fixtures exist or the run succeeds.

Mutation analytics contain operation, outcome and four coarse duration buckets; there is no read-stage timing or this-build p95 report. `MoneyTransactionsScreen` renders grouped inventory rows inside a scrolling page without list virtualization. This is a plausible rendering cost at large histories, not a measured hardware bottleneck yet.

Required change: realistic behavior fixtures and a current runtime measurement harness. Keep financial content out of analytics. Name build, device, network, history size, stage durations, request counts and sample counts. Add a small mandatory category/rollover/transaction acceptance suite; retain the useful existing domain tests.

## Improvement sequence and acceptance matrix

These are engineering acceptance targets, not claims of achieved performance. Refine them with the measured device baseline without weakening integrity requirements.

| Phase | Work and owning files | Acceptance evidence |
| --- | --- | --- |
| 1. Establish reproducible workflow contracts | `MoneyDataContext.test.tsx`, category-settings behavioral harness, repository mocks and isolated SQL fixtures | Reproduce partial-save exposure, refresh-after-commit ambiguity, duplicate tap, stale second action and equivalent refresh duplication. Establish owner/adult differences. Keep real-money data untouched. |
| 2. Make settings saves transactional | New capability command/receipt module; `MoneyCategoryDetailScreen.tsx`, `MoneyDataContext.tsx`, `moneyRepository.ts`, governed-plan RPC migration | Combined name/amount/role/rollover save is all-or-nothing; unauthorized/stale versions reject with zero changes; uncertain retry has one result; rapid double tap creates one command; no-op does no writes; refetch/relaunch agree. Production migration requires separate approval after local evidence. |
| 3. Correct receipt and recovery semantics | `moneyConfirmedPatches.ts`, `moneyDataState.ts`, repository/action contracts | Every confirmed field/version appears immediately; failure to refresh cannot relabel a successful write as rejected; dependent financial answers remain truthfully stale until reconciled; no duplicate creation on retry. |
| 4. Reduce and coordinate read work | `moneyRepository.ts`, `moneyPlanProjection.ts`, `livingPlanRepository.ts`, `livingPlanReconciliation.ts`, provider request lifecycle | One equivalent in-flight read per owner/version; one plan projection per accepted snapshot; superseded results cannot win; cached opening is independent of provider sync; totals and rollover are exact at 0/1k/4k/10k rows. Compare request counts and transferred bytes. |
| 5. Optimize measured hot paths | Transaction inventory, snapshot projection and database reads/indexes only where measurements justify | Virtualized inventory if render measurements confirm cost; no cursor gaps/duplicates under sync; query-plan evidence for any index or RLS change; fresh owner/adult/child denial tests. |
| 6. Enforce deployment and operating checks | Release scripts/CI, schema contract, capability manifest, telemetry | Missing required schema/RPC/grant blocks affected release; live target check is distinguishable from unit tests; known-compatible release receipt; allowlisted failure/stage metrics and actionable recovery. |
| 7. Validate installed experience and repeat use | Named Simulator candidate, then authorized TestFlight/device release and observation | Acceptance scenarios below pass on real gestures; no regressions in current-month truth, history, pending-to-posted replacement, privacy or shared household operation. Reassess this document and job flow from observed results. |

Required workflow cases: cold/warm open; pull-to-refresh during a save; amount-only, role-only, rename-only and combined saves; enable/disable/backdate rollover including a deficit; category change and immediate second change; split/correct/reverse; airplane mode before and after confirmed commit; lost response; stale competing household edit; account/session change; process relaunch and refetch.

Provisional performance targets for a named reference phone and representative 4k-transaction household: visible tap feedback within 100 ms, cached useful Budget view within 250 ms, fresh answer p95 within 1.5 seconds on a declared healthy network, simple confirmed change p95 within 750 ms, governed combined save p95 within 2 seconds. Provider bank sync is separately timed and must not block navigation or a previously loaded answer. Sample at least 30 repetitions per measured case; treat this as an engineering comparison, not statistical reliability proof. Repeated retries, missing schema, data loss, unauthorized access, duplicate mutations, and incorrect balances have a zero-tolerance acceptance criterion regardless of latency.

## Baseline status before implementation follow-ups

- Completed: framework discovery; current-source trace; capability test/static baseline; live aggregate/query inspection; documented assessment and ordered improvement program.
- Previously completed in this thread: approved rollover backend repair, with schema/temporary-row checks and access verification.
- Next: phase 1 behavioral reproductions, then the atomic settings/receipt boundary. Keep the request-count baseline alongside correctness work so performance improves as part of the implementation.
- Still unproven: current installed-device failures after the rollover repair, full owner/adult workflow matrix, measured current-build p50/p95, production end-to-end acceptance, and sustained improvement.
- No new production mutation, release, commit, or push is claimed by this assessment. The broader user goal remains active.


## Implementation follow-up: shared read lifecycle

Local source work, November 1, 2026; same checkout and HEAD, uncommitted. [Implementation plan](../superpowers/plans/2026-11-01-budget-read-lifecycle.md).

Behavioral regressions reproduced five failures before the fix: an initial read overwrote a confirmed note, an initial error surfaced after confirmation, overlapping manual refreshes duplicated the load, a manual refresh duplicated a post-edit background load, and a completed read wrote the cache after unmount. A sixth regression showed a delayed device-cache load replacing newer server data.

The provider now shares pending initialization/manual/background snapshot requests within the current mutation generation. Confirmed writes invalidate earlier reads; a governed promotion starts a new generation before its second read. Completed and failed requests are removed so a subsequent refresh can retry. Initialization checks both its session and mutation generation before accepting data or errors. A late cache result cannot replace an accepted server snapshot. Provider cleanup invalidates pending read results and late initialization classification callbacks. Read-only code review identified that disconnect and plan reversal also need invalidation after their writes; both now request `refresh({ afterMutation: true })`. Deferred regressions for the public refresh option and actual disconnect action failed before that correction and pass afterward. Review also caught setup sharing a pre-write read after account reconciliation; successful current reconciliation now advances the generation before publishing its snapshot. That ordering regression failed first and passes after the fix. Final read-only review reported no remaining findings within this slice; broader pre-existing mutation/session completion paths remain open.

Focused local verification: `MoneyDataContext.test.tsx`, `moneySnapshotRequests.test.ts`, and `moneyPlanLifecycle.test.ts` passed together: **3 suites / 33 tests**, 2.815 seconds. The provider tests include the production initialization branch with backend operations mocked; they do not execute live governance. Request-count assertions establish two overlapping manual refreshes perform one snapshot load, while a post-edit refresh starts a distinct load from the pre-edit read. No latency percentage is inferred.

This is partial progress on BQ-02 and the ordering portion of BQ-03. It does not make category settings atomic, provide durable unknown-outcome recovery, bound full-history reads, fix receipt completeness, or verify installed-device performance. Those findings remain open. Final scoped `verify:local` passed in 28.88 seconds after review corrections: 10 related Jest suites / 117 tests, app and test typechecks, code-health ratchet, architecture lint (44 tooling tests, zero warnings), and whitespace checks. All checks executed freshly for this candidate. The scope includes the provider, loader, tests, reversal caller, implementation plan, and this assessment; 11 other changed files were excluded. Unrelated SQL/grants work and the preceding rollover artifacts were not certified by this scoped run. `agent:map` generated no diff. Eighteen relative documentation links resolved.

No commit, push, new deployment, Simulator install, or hardware validation occurred in this slice. The source passed local handoff checks; integration still requires the uncached gate and runtime acceptance. Documentation was updated afterward only to record these results.


## Implementation follow-up: atomic settings server boundary

Local and not deployed. [Atomic settings plan](../superpowers/plans/2026-11-01-budget-atomic-category-settings.md) tracks the complete path; the screen still uses its original multi-write save until client integration is ready.

The new settings RPC commits category identity, amount/funding, role, rollover, governed override/version, and an actor-scoped receipt in one transaction. It checks category and plan versions, canonical household authority, reviewed allocations and active-plan versions. Repeated identical request IDs return their original receipt; conflicting reuse is rejected. Receipt lookup rechecks current actor/owner access. Metadata-only edits remain possible when promotion is disabled; allocation edits cannot bypass an existing active plan.

The isolated PostgreSQL 17.11 regression verified late-failure rollback, basic and governed replay, stale row/active-version rejection, matching reviewed amounts, canonical caregiver writes, child/unrelated/anonymous/signed-out denial, revoked caregiver receipt denial, and private receipt access. Review caught reversal lock ordering and alternate category identities; both now have reproduced regressions and corrections. Two-session checks observed a duplicate request waiting for the first commit and returning exactly the same receipt, and reversal waiting on the owner lock before inspecting active-plan state. The repeatable runner creates and removes its own cluster, using production definitions for the tested tables/functions/triggers but minimal JWT and read-policy substitutes. Full Supabase schema replay remains a separate gate.

BQ-01 and BQ-03 remain open: the server command is implemented locally, but native/conversational caller integration, durable client request recovery, compatibility gating, production deployment and installed-device workflow proof are still required. No new production change was authorized or performed by this slice.

Server-slice local handoff check: scoped `verify:local` passed in 3.06 seconds (whitespace, code-health ratchet, seven explicit-grant checks). Seventeen other changed files were omitted; this pass does not re-certify the preceding client slice or unrelated SQL work. The separate PostgreSQL runner passed on a fresh cluster, including a run with conflicting inherited PG connection variables to verify isolation. Code-map generation produced no diff. No runtime is left running from these database checks.


## Implementation follow-up: durable category settings client boundary

Local only. The app now has typed request preparation, actor-bound RPC dispatch, a durable per-account/category request journal, receipt recovery, and provider operations for a single atomic settings command. Exact category and plan versions travel through snapshots and confirmations. The provider confirms a successful save before its one background read and suppresses old-session results. Recovery cannot replace a newer snapshot with an older receipt.

Regression-first review corrected four failure cases: account switching after auth preflight, clearing recovery state after an unavailable retry, losing historical reserve contributions/spending, and accepting unrelated rollover settings in a receipt. Server business rejections now have durable receipts too; a delayed duplicate cannot apply an already rejected request. Shared reserve math also preserves current-month credits against older spending.

BQ-01/BQ-03/BQ-04 remain open for end-to-end acceptance. The settings screen still uses its original write path; household preview ownership, shared conversational command routing, compatibility/release gates, installed-device behavior and latency measurement remain required. No deployment or device evidence is implied by these local changes.


Provider review also reproduced a stale governed monthly-plan summary after a confirmed save followed by an offline refresh. The patch now removes that derived summary until authority is available, recomputes aggregate forecasts from category projections, and retains the stale indicator. Duplicate callers sharing a request cause only one reconciliation read. These are provider and state tests; they do not establish installed UI behavior.


Client/provider local handoff verification passed in 114.66 seconds: 242 related Jest suites, 1,696 passing tests and two skipped; app/test TypeScript checks; code-health ratchet; architecture lint with 44 tooling tests and no warnings; seven explicit-grant checks; and whitespace checks. All those checks executed freshly for the final code candidate. The 29-file scope includes the preceding read-lifecycle slice and the atomic SQL contract; ten other dirty files were excluded. An earlier verification run was interrupted after review identified the derived-summary issue, and is not passing evidence. The final isolated PostgreSQL 17.11 run also passed, including the exact late constraint-failure assertion, durable rejection replay, actor binding and two-session checks. Read-only review found no remaining material issues in this local command/provider slice. `agent:map` produced no diff. No new native runtime or production change was made.

## Implementation follow-up: category drawer uses the atomic command

The settings drawer now uses the new atomic provider operation instead of separate amount, rollover, role and name writes. It loads recovery state before enabling edits, locks preview through save, preserves unknown requests for Check save, retains rejected inputs, and uses the versions captured when editing began. Late previews are ignored after a draft or account change. Reserve carry-forward no longer sends a contradictory monthly-rollover flag. Unknown outcomes are recorded separately from confirmed/failed mutation outcomes and do not emit trusted-decision success.

Canonical household scope now reaches category preview settings, evidence and active-plan reads. Database regressions exposed missing caregiver SELECT access to both planning basis and plan config. A local migration repairs those reads without granting writes and rejects anonymous owner-config reads. The harness now includes the original living-plan read policies and canonical access helper, making those failures observable under RLS rather than only in mocks. General Money plan writes and conversational callers remain separate open work; this does not close all of BQ-05.

Read-only review found two material gaps (config visibility and drawer dismissal during save); both were corrected with reproduced regressions. Screen tests use real settings fields/buttons and a test drawer host, so native dismissal/keyboard/accessibility acceptance remains unverified. The available Simulator app is 1.0.127 (127), with no current-source runtime provenance. Both new migrations remain local and undeployed. BQ-01 remains open for conversational callers, compatibility, release and installed workflow acceptance.

The final drawer/household slice passed scoped local verification in 106.91 seconds: 246 related Jest suites, 1,722 passing tests and two skipped, both typechecks, architecture, code-health, explicit-grant and whitespace checks. The current iOS JavaScript/Hermes export also passed. Export is build evidence, not installation or native interaction evidence.

Conversational tracing additionally found that recovery accepted a matching category amount as proof of the original request, while receipt-finalization failures marked already committed actions as failed. The next slice must recover the exact server operation before reading current state, preserve uncertain/applying receipts, and share the category settings command. A matching amount from another edit is not a receipt.

## Implementation follow-up: conversational Budget update receipts

Chat budget-amount proposals now share the drawer's atomic command and canonical household preview scope. The old branch that committed and then required a full snapshot to declare success has been removed. One pre-save snapshot supplies fresh fields for a new request; recovery uses the original stored request and server receipt before touching current Budget state. Request identity survives relaunch and device changes. The action wrapper permits a later recovery attempt rather than caching a rejected promise forever.

A matching amount no longer proves the proposal saved. Unknown outcomes and confirmed writes with interrupted Chat bookkeeping remain applying for recovery. Authentication or entitlement checks that cannot run during recovery do not rewrite a previously uncertain save as failed. Only durable Budget rejections establish failure during recovery. Matching local journal cleanup uses the shared command lock and preserves a different pending drawer save. This closes the identified local Chat amount-save orchestration gap, with backend compatibility and native acceptance still open. Standalone rename, forecast/cover and other Money command paths have not been generalized by this slice.

Final Chat follow-up verification ran freshly in 166.62 seconds over 53 selected task files. Removal of the old save boundary made the verifier require the full Jest suite: 1,313 suites, 8,229 passed tests, two skipped and two passed snapshots. All required checks passed with no code-health ratchet findings or architecture warnings. Eleven other changed files were outside that scope; the generated code map and navigation documentation receive a separate documentation check. An earlier run was interrupted to replace an untyped test argument and is not completion evidence. The isolated PostgreSQL 17.11 run passed the added original-request recovery checks and existing authorization/concurrency cases. Read-only review has no remaining material findings after the timestamp-normalization cleanup regression. The updated iOS Hermes export passed; it was not installed. No commit, push, integration gate or production mutation occurred in this follow-up.

## Implementation follow-up: release backend compatibility

The supported TestFlight wrapper now checks the target backend before starting EAS build/auto-submit. The [Money backend release contract](../development/money-backend-release-contract.md) binds the resolved Expo target to Kwilt, compares actual catalog objects and function bodies with the source contract, checks required permissions/household policies, and stops on incomplete or unavailable evidence. Store-build configuration rejects backend overrides after dotenv; all `.env*` variants are excluded from release archives.

Regression-first review corrected effective-target validation, household helper privileges and receipt table shape. The isolated PostgreSQL runner now exercises the original rollover preflight and deliberate schema/RPC/grant/body/policy breaks in rolled-back fixtures. Native API/cache behavior and device performance remain separate. The CLI read token is not provisioned by this task; its absence intentionally prevents release. Live catalog inspection through the connected Supabase tool found the repaired rollover dependencies and rejected the undeployed new command/policies, as expected. No deployment occurred.

Final release-contract evidence: 46 focused Node tests passed, and the isolated PostgreSQL 17.11 suite rejected nine separate deliberate contract breaks while retaining the atomic-save/household/concurrency tests. The full local gate passed in 149.70 seconds: 1,313 Jest suites, 8,229 passing tests, two skipped tests, two snapshots, app typecheck, architecture, code health, release/upload tests and verification-tooling tests. A subsequent selector/test-only strengthening passed its own scoped gate in 5.05 seconds; it adds the contract tests when package, Expo/EAS configuration or any migration changes, preserving every original protected gate and order. Read-only review found no remaining blocking issues.

The final 41-check live catalog observation passed 23 checks and failed the 18 checks belonging to the still-undeployed receipt store, atomic/promotion functions and preview policies. The local CLI resolved the effective release target and then stopped for its missing read token. These are distinct observations; the Management API transport has unit coverage but has not been exercised end-to-end with a local/CI release token. Existing production promotion, governed-change and reversal body hashes match the historical source definitions used to build the new migration, reducing the risk of overwriting an unknown live function revision. No migration, build upload, commit or push occurred in this follow-up.

## Implementation follow-up: measured snapshot projection cost

The initial desktop experiment isolated merchant matching as a larger projection cost than repeated category scans in this fixture. Every transaction previously normalized rule text and merchant text repeatedly while scanning the rules. The snapshot now prepares rules once, normalizes each distinct merchant once, and reuses matches and misses only for that snapshot. First-rule precedence, exact versus partial semantics and category-reference handling remain unchanged. No history is truncated and no balance or rollover formula changes.

The [recorded experiment](evidence/budget-snapshot-2026-11-01.json) uses synthetic data: 24 categories, six accounts, two years of dated transactions, splits, credits, pending items, saved resources, reserve anchors and rollover schedules. On an Apple M5 / Node 24.14.0, five warmups then 40 samples per case produced:

| Transactions | Rules | Before median / p95 | After median / p95 |
| --- | --- | --- | --- |
| 1,000 | 40 | 8.731 / 11.931 ms | 1.462 / 1.673 ms |
| 4,000 | 40 | 34.916 / 37.072 ms | 5.736 / 6.031 ms |
| 10,000 | 40 | 89.225 / 91.391 ms | 14.659 / 15.444 ms |

All eight complete before/after snapshot hashes agree, including 0/1k/4k/10k cases with zero rules as a control. These comparison cases have 80 repeated merchant names. A separate all-unique-name run exercises cache misses and maximum temporary cache cardinality: with 113 rules, 4k transactions measured 8.313 / 8.747 ms and 10k measured 22.731 / 24.125 ms. There is no before timing for that expanded fixture. A read-only production aggregate found one owner with 113 rules; no merchant text, transaction contents or owner identifiers were read for this observation.

Reproduce with `npx tsx scripts/money/benchmark-snapshot.ts` and `npx tsx scripts/money/benchmark-snapshot.ts --unique-merchants`. The runner now includes relevant source/fixture hashes. Initial comparison runs captured only HEAD plus dirty state; their exact source fingerprints are unavailable. This is desktop Node 24 evidence, outside the repository's Node 22 engine range, not Hermes/device, network, authenticated API or UI latency acceptance. It does not explain the entirety of the reported slowness. BQ-02 remains open for bounded reads and measured native interaction.

Regression-first evidence: the new history-cost test failed with 4,000 rule-text preparations instead of one, while 11 matching behavior tests passed. After the fix, both snapshot suites passed 26 tests. Read-only review found no functional regression and requested the additional unique-name case and source provenance, now included in subsequent benchmark runs.

Final scoped local verification passed in 110.78 seconds: 245 related Jest suites, 1,701 passing tests and two skipped, app/test typechecks, release-contract tests, architecture, code health and whitespace. The initial attempt exposed a Node/React Native URL type conflict in the benchmark; importing Node's URL explicitly fixed it before the passing run. Seventy-five other changed files were omitted; this result does not certify them. The generated code map was refreshed. No current-source native install, integration gate, commit, push, upload or deployment occurred in this slice.

## Implementation follow-up: one household owner throughout snapshot reads

The base snapshot relied on household RLS while the active-plan pointer and income-evidence queries explicitly filtered by the signed-in actor. For a caregiver, that could omit the household's active plan or use a different basis. The repository now verifies the actor once, resolves the owner through the existing authenticated server RPC once, and passes that owner to every base query, compatibility fallback, transaction/allocation page, active-plan lookup and evidence query. Immutable version/component/receipt reads follow the selected plan pointer. RLS remains the authorization boundary; the explicit filters narrow the requested dataset and do not grant access. An unavailable owner lookup stops the read before loading table data, without actor fallback.

A synthetic regression reproduced mixed categories/missing owner plan before the fix. The corrected snapshot keeps 4,001 transactions, including the historical transaction on the last page that changes rollover, and reads the owner's plan and planning basis with one `auth.getUser` call and one owner RPC. Additional cases exercise all category/plan column fallbacks and 2,002 split allocation rows over three pages, excluding another owner's allocation from totals. For the earlier 3,979-row active-plan source example, the count becomes 17 data/RPC requests plus one auth invocation, compared with 16 plus three; SDK transport/caching and actual latency are not measured by those counts. This is a scope and duplicate-auth correction, not bounded-history completion.

Permission errors whose text named optional tables previously became successful reads with missing allocations or retained income evidence. New failing tests reproduced this. Only the specific missing-table codes (`PGRST205`, `42P01`) now permit those compatibility fallbacks. A permission or other read error wins even when the other optional evidence source is missing. Failed reads therefore remain failures instead of silently changing the displayed financial facts.

The isolated PostgreSQL test now reads the actual living-plan pointer, version, component, receipt and income-source policies under owner/caregiver/child/unrelated JWTs; it also checks owner resolution and revoked access. The first run exposed an omitted legacy membership grant in the harness. Importing the historical membership policies, helper and explicit SELECT grants repaired the test setup. The expanded PostgreSQL 17.11 suite then passed, including atomic-command, concurrency and release-contract negative cases. It remains a selected-schema harness with JWT/category/plan SELECT substitutes, not a full Supabase replay or live API test. No server schema changes were made in this slice; the two earlier local migrations remain undeployed.

Read-only review found no actionable issue. Its suggested fallback and multi-page allocation coverage is now included. General settings and automatic reconciliation writes still need actor/owner alignment; this closes the traced snapshot path, not all of BQ-05. Native caregiver behavior and end-to-end latency remain unverified.

Compatibility boundary: explicit owner filters also narrow the legacy household fallback to the server's selected owner dataset. A read-only production aggregate found zero active legacy non-owner members (without a canonical adult binding) with their own financial connections or categories at this observation. This reduces current migration risk but is not a permanent guarantee. Bank-link/repair handlers still contain actor-scoped paths; caregiver linking and any legacy multi-owner transition need separate acceptance alongside the open BQ-05 work. No rows were moved or deleted.

Final local verification passed freshly in 102.64 seconds: 219 related Jest suites, 1,536 passing tests and two skipped, both typechecks, architecture, code-health, release-contract and whitespace checks. The preceding run passed its checks but was correctly marked stale because the generated code map changed during execution; it is not the completion receipt. The final scope includes the refreshed map and omits 75 other changed files. No integration gate, native install, commit, push, upload or production mutation occurred in this slice.

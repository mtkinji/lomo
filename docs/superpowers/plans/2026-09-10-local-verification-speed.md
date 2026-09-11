# Local Verification Speed Implementation Plan

> **For agentic workers:** Execute inline with the executing-plans skill. Andrew authorized implementation in the existing checkout; do not create a worktree or weaken merge/deploy gates.

**Goal:** Shorten local feedback and eliminate redundant local verification while preserving the existing integration and deployment protections.

**Architecture:** Keep `verify:changed`, CI, coverage, and deployment entry points protected. Extract its existing planning function without changing its output, and add a separate `verify:local` CLI with explicit scope, dependency-aware Jest selection, incremental TypeScript, local success receipts, and timing reports. Local receipts never satisfy integration or deployment gates.

**Tech Stack:** Node built-ins, Git, existing Jest 29 and TypeScript 5.9. No new runtime dependency or native-runtime ownership.

**Starting state:** Normal checkout `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with unrelated Home, Plan, Activities, Chat, and keyboard edits. Preserve those changes. No merge, push, deployment, or release is part of this task.

## Requirements and proof

| Requirement | Evidence |
|---|---|
| Preserve integration gate selection and execution | Capture representative legacy plans before extraction; exact comparison tests plus CLI execution tests |
| Preserve release processes | Compare workflow, EAS, and release-script bytes and existing npm command values against the starting state |
| Scope local work explicitly | Tests for file/directory scopes, missing paths, renames/deletions, and omitted dirty work reporting |
| Avoid whole-suite escalation from file count alone locally | A 21-file feature change selects related tests locally and the full suite in the protected planner |
| Cover configuration, deleted sources, and changed tests | Regression tests for full local fallback and direct test selection |
| Reuse only valid local results | Content/config/base/environment/dependency invalidation; failed, corrupted, interrupted, or stale results cannot pass from cache |
| No local bypass in CI | Local CLI refuses CI execution; protected CLI never reads local receipts |
| Faster static checking and measurable execution | Separate incremental TypeScript files; cold/warm real runs and per-command timing records |
| Preserve product-quality evidence | Document targeted native acceptance, regression-first logic, and unchanged integration/release obligations |

## Task 1: Characterize and isolate protected planning

Files: `scripts/verify-changed.mjs`, `scripts/verification/plan.mjs`, `scripts/verification/plan.test.mjs`, `scripts/verification/fixtures/protected-plans.json`.

- [x] Capture the original planner's outputs for empty, UI, domain, test-only, 20/21-source, runtime/config, backend, documentation, audio, chat, package, and deployment changes.
- [x] Add failing exact-output tests using `assert.deepEqual(buildVerificationPlan(files, base), expected)`; run `node --test scripts/verification/plan.test.mjs` and confirm the missing implementation fails.
- [x] Extract `buildVerificationPlan(files, base)` and call it from the original CLI. Preserve all protected commands, ordering, reasons, manual requirements, and uncached execution.
- [x] Rerun characterization and the existing `scripts/verify-changed-lib.test.mjs` tests.

## Task 2: Implement local selection and explicit scope

Files: `scripts/verification/local-plan.mjs`, `scripts/verification/local-plan.test.mjs`, `scripts/verification/local-state.mjs`, `scripts/verification/local-state.test.mjs`, `scripts/verify-local.mjs`.

- [x] Write regression tests for `buildLocalPlan(files, {base, workers, cacheDir, exists})`: 21 ordinary sources stay related; test-only edits execute tests; shared config and source deletions select all tests; arguments remain separate even when paths contain shell syntax.
- [x] Add `--files <paths...>` and repeatable `--scope <directory>` with validated repo-relative paths; default to the complete changed set. Include rename sources and deleted files. Report omitted dirty paths as unverified by this run.
- [x] Reuse protected non-Jest checks; locally replace typechecks with `--incremental --tsBuildInfoFile <git-cache>/<app-or-tests>.tsbuildinfo`. Deduplicate chat lint already invoked by product lint. Keep code-map generation explicit rather than silently mutating docs during local verification.
- [x] Run `node --test scripts/verification/local-plan.test.mjs scripts/verification/local-state.test.mjs` through red/green.

## Task 3: Implement safe local execution, receipts, and timing

Files: `scripts/verification/local-code-health.mjs`, `scripts/verification/local-code-health.test.mjs`, `scripts/verification/local-runner.mjs`, `scripts/verification/local-runner.test.mjs`, `scripts/verification/cli.test.mjs`, `package.json`.

- [x] Add tests for successful reuse, failed-check invalidation, changed inputs during execution, malformed receipts, process errors, exclusive execution, and refusal in CI.
- [x] Store receipts and JSON timing reports under Git metadata, outside tracked source. Key cacheable checks by command, repository content and base, Node/platform/environment, ignored root environment files, and installed dependency metadata. Do not cache external/native/backend results.
- [x] Execute argument arrays without a shell. Use an exclusive local-run lock and reject stale results when inputs change during a run. Expose `--force`, `--workers`, `--json`, and `--report`.
- [x] Add `verify:local` and `test:verification` npm commands; retain every existing command value. Do not change CI or deployment workflow files.
- [x] Run all verification-tooling tests, including protected CLI execution with local receipts present.

## Task 4: Adopt, benchmark, and verify

Files: `AGENTS.md`, `docs/automated-testing-strategy.md`, `docs/development/local-verification.md`.

- [x] Make `verify:local` the task-completion default; retain `verify:changed` for integration/merge/release and explain that scoped results do not approve omitted work.
- [x] Document high-value test authoring, focused watch commands, native acceptance, exact release evidence, and unchanged-result reuse. Track useful failures and escaped defects instead of test counts.
- [x] Benchmark serial versus limited-worker execution on the same representative suites. Adopt parallel workers only if measured beneficial; expose override either way.
- [x] Run real cold and warm local checks; validate skipped commands retain original result time and changed dependencies invalidate them. Record results and honest limitations.
- [x] Run `npm run verify:changed -- --run` once against the finished checkout, review the final diff, and compare protected entry points against the starting snapshot. Report unrelated failures separately if concurrent work prevents a whole-checkout pass.
- [x] Audit each requirement above before marking the goal complete. Leave work uncommitted for review unless Andrew requests publication.

## Implementation evidence

- Protected selection: all 20 pre-extraction fixture plans match; tooling self-tests are additive.
- Independent review found and verified fixes for interrupted-zero-exit receipts and omitted TypeScript script tests.
- Local-only batched Git reads returned identical contents and code-health summaries for 3,277 baseline files: 30.476s original, 0.131s batched. Existing protected code-health implementation is unchanged.
- Real local run: 8.82s with warm incremental TypeScript; identical repeated run: 2.40s with explicit receipt reuse.
- Eight-suite worker benchmark found no warm advantage for two workers, so the default remains serial.
- All nine captured workflow/release files and every pre-existing npm command value remain unchanged.

## Completion audit

- Scope and selection: 68 verifier tests passed under Node 22.23.2, including protected golden plans, test-only and deleted-source selection, CLI refusal in CI, argument safety, result invalidation, and process interruption.
- Protected execution: `npx --yes --package=node@22.23.2 -- npm run verify:changed -- --run` exited 0. It ran app/test TypeScript, the original code-health command, 1,222 Jest suites (7,557 passed tests, 2 skipped), product/chat/architecture checks, chat contracts, code-map generation, and the new verifier self-tests.
- Source review: independent read-only review verified both reported fixes; a real process-tree probe confirmed an interrupted wrapper cannot leave a successful receipt or running grandchild.
- Deployment protection: all nine starting workflow/release file digests and every existing npm command value match. No merge, push, deployment, or native-runtime changes were performed.
- Performance: measured results and their boundaries are in `docs/development/local-verification.md`; raw logs are retained in Git metadata.
- Repository state: existing `main` checkout and HEAD retained. Unrelated app work preserved; the protected gate regenerated the existing agent code map. Changes remain uncommitted for review.
- Evidence documentation was finalized after the automated run. Verification source and test code were unchanged after that run; the final documentation edits receive a focused lint/whitespace check rather than repeating unrelated Jest work.

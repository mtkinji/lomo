# Faster local verification, protected integration

`verify:local` shortens development feedback. `verify:changed` remains the uncached integration command used by PR CI. All pre-existing CI checks, coverage, EAS commands, deployment workflows, reviews, and release approvals retain their role. This change does not merge, deploy, or approve a release.

## Everyday commands

Preview before executing:

```bash
npm run verify:local -- --scope src/features/shared-home
npm run verify:local -- --run --scope src/features/shared-home
npm run verify:local -- --run --files src/domain/activityRecurrence.ts src/domain/activityRecurrence.test.ts
```

Paths are repository-relative; `--scope` can be repeated. `--files` accepts existing unchanged files as well as changed or deleted files. Empty scopes, missing files, invalid Git refs, and unknown flags fail clearly. With no scope, selection includes all committed changes since the base plus staged, unstaged, untracked, deleted, and renamed paths.

Scoped runs report other dirty files explicitly. They do not certify those files. App/test typechecks and some static gates still inspect shared contracts across the checkout. Preserve unrelated dirty work, and report unrelated failures separately.

During editing, use the smallest meaningful feedback loop:

```bash
npm test -- --runInBand --runTestsByPath src/domain/activityRecurrence.test.ts
npm test -- --watch --runTestsByPath src/domain/activityRecurrence.test.ts
```

Use the relevant running native flow for visual changes. Keep the current development build and runtime owner when possible; rebuild native code when native inputs require it. Keyboard-visible typing, drawer touchability, backend authorization, and signed-device behavior each require evidence at the appropriate layer.

## Local selection

- Ordinary source/JSON/test edits in app, package, and TypeScript/JavaScript script directories use Jest's related-test graph, including changed test files themselves. The number of selected source files does not trigger a full local suite.
- Shared runtime/configuration/dependency changes or removed sources select the full local suite. Removed imports cannot be reliably traced from the current dependency graph.
- Script changes run existing companion tests. Verification-tooling changes run the whole small verifier self-test suite, including the protected-planner regression fixtures.
- App and test typechecks retain their existing configs and use separate incremental state files. Existing `lint` and `lint:tests` npm commands remain unchanged.
- Local code health reads immutable baseline blobs in one Git batch and uses the existing summarization and ratchet rules. Its inputs and summary are verified against the protected reader. The protected code-health command and implementation remain unchanged.
- Local checks deduplicate chat lint already performed by product lint. Code-map generation is an explicit follow-up, avoiding edits caused by a local verification run. The protected verifier retains its original behavior.
- Native/manual checks are displayed and never satisfied by a cached local result. A green local automation report is not native acceptance.

## Result reuse and provenance

The cache and timing records live in `git rev-parse --git-path kwilt-verification`, outside tracked source. No source file or dependency is modified to store a receipt. Entries include the command, input digest, original completion time, duration, and exit status.

Cacheable checks currently include app/test typechecks, local code health, Jest, and local Node tooling tests. Other checks, including backend/external-state checks, execute each time. Cache keys cover the command arguments, Git HEAD and base, tracked working/index contents, untracked inputs, root `.env*` contents, Node executable/version, platform, environment variables, and installed dependency metadata. Installed files include ctime as well as mtime/size; linked dependency targets are traversed with cycle protection. Environment values are hashed, not written into reports.

The fingerprint is deliberately conservative: unrelated source changes can invalidate a local result. This favors correctness over maximum hit rate. Do not use these receipts for checks dependent on a live service, the current wall clock, arbitrary ignored files, or state outside the fingerprint. Use `--force` for fresh execution when such state matters. Integration and deployment always use their existing fresh gates.

The runner invalidates an old receipt before rerunning a command. Failures, process errors, malformed receipts, and interrupted runs cannot create a successful receipt. If inputs change while checks run, the run exits nonzero as stale and does not cache its new results. An exclusive lock protects shared TypeScript state; an existing verifier or its still-running child is not restarted merely because another task wants a check.

```bash
npm run verify:local -- --report
npm run verify:local -- --report --json
npm run verify:local -- --run --force --scope src/features/shared-home
npm run verify:local -- --run --workers 2 --scope src/features/shared-home
```

`--json` previews plans or reads reports; it is intentionally separate from `--run`, whose subprocess output is streamed live. `latest.json` records the most recent run; `history.jsonl` records earlier timings. A reused result shows its original timestamp and duration, not a claim of fresh test execution.

## Merge and deployment boundary

Before integration, merging, or publication, retain:

```bash
npm run verify:changed -- --run
```

PR CI continues to pass `--base origin/main`. The protected planner retains its original commands, thresholds, order, and manual follow-ups for existing change categories. Tooling changes add a verifier self-test; they remove no existing gate. Protected execution never reads local receipts. `verify:local` refuses execution when CI, GitHub Actions, or EAS build markers are active.

The existing full CI/coverage and release workflows are not replaced by this command. Check the actual candidate and preserve required approvals, backend/native evidence, and TestFlight/production proof. A local pass is not merge permission or release availability.

## Measuring improvement

Use per-command timing reports to compare the same scope on the same inputs. Separate warm execution, successful-result reuse, and focused selection; they measure different benefits. Benchmark serial and bounded-worker Jest runs before changing worker defaults. Defaulting every small run to more workers can cost more than it saves.

Review waiting time, test-maintenance time, meaningful failures caught, and escaped-defect severity after using the workflow. Keep regression-first tests for real bugs and meaningful logic; avoid adding tests solely to grow test counts or mirror implementation details. Feedback targets are seconds for focused checks, usually under two minutes for local task automation, and under ten minutes for broad CI feedback; these are operating targets, not promises for every change.

### Measured on September 10, 2026

Normal Kwilt checkout on `main`, source HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with unrelated unfinished app changes; Node 22.23.2. These are local measurements, not CI or release timings.

| Measurement | Result | Proof boundary |
|---|---|---|
| Original versus batched code-health baseline reader | 30.476 seconds → 0.131 seconds | All 3,277 file inputs and their summaries matched exactly |
| Complete local code-health command after optimization | 0.496 seconds | Same existing summarization and regression thresholds, including current working files |
| Local automation for `src/domain/limits.test.ts`, with warm TypeScript state | 8.82 seconds | App/test types, code health, whitespace, and 4 Jest tests all passed |
| Immediate identical local run | 2.40 seconds | Fresh fingerprint/whitespace checks; original successful types, code health, and Jest results reused |
| Eight representative suites, 65 tests, warm serial versus 2 workers | 1.153 versus 1.152 seconds | No meaningful worker advantage; default remains serial, override available |

The initial app/test typechecks took 15.79/15.58 seconds to create incremental state; subsequent executions took 2.41/2.29 seconds. Cache states differ, so these are cold/warm observations rather than a claimed universal speedup. A concurrent edit during an earlier measurement caused a nonzero stale result and no new receipts, as designed; it is excluded from passing-run timings.

Raw local timing/provenance records are under `.git/kwilt-verification-baseline/` and `.git/kwilt-verification/history.jsonl`. These ignored artifacts are supporting local evidence; the checked-in regression tests preserve selection and safety behavior for future changes.

The final protected gate exited 0: app/test TypeScript, original code health, 1,222 Jest suites (7,557 passed tests, 2 skipped), product/chat/architecture checks, chat contracts, code-map generation, and all 68 verifier tests passed. These are automated source checks; no native/device acceptance or deployment was performed for this tooling change. All nine captured workflow/release files and every pre-existing npm command value matched the starting snapshot.

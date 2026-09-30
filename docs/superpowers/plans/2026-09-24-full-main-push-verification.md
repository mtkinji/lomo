# Full Main-Push Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every ordinary direct push to `main`, every pull request, and every TestFlight build run the complete Jest coverage suite without restoring full-suite cost to the implementation loop or each commit.

**Architecture:** Keep `verify:local` focused. Add a tested pre-push classifier and a `verify:push` runner that refuses a dirty or mismatched main candidate, then runs the uncached changed-file gate followed by the complete coverage suite. Install tracked composite Git hooks through `core.hooksPath` while preserving Git LFS behavior, and make PR CI and TestFlight invoke the same full-suite boundary explicitly.

**Tech Stack:** Node.js ESM, `node:test`, Bash Git hooks, npm scripts, GitHub Actions, Jest.

---

### Task 1: Specify main-push behavior

**Files:**
- Create: `scripts/push-verification.test.mjs`
- Create: `scripts/push-verification-lib.mjs`

- [x] **Step 1: Write failing parser and candidate-policy tests**

Cover ordinary branch pushes, direct `main` pushes, explicit `feature:main` pushes, deletions, multiple refs, dirty candidates, and a local SHA that does not equal `HEAD`.

- [x] **Step 2: Run the focused test and confirm RED**

Run: `node --test scripts/push-verification.test.mjs`

Expected: FAIL because `push-verification-lib.mjs` does not exist.

- [x] **Step 3: Implement the pure policy**

Export functions that parse Git's four-field pre-push lines, detect a non-deletion update to `refs/heads/main`, and return explicit candidate validation errors for dirty or non-HEAD pushes.

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test scripts/push-verification.test.mjs`

Expected: all policy tests pass.

### Task 2: Add the push runner and preserve Git LFS hooks

**Files:**
- Create: `scripts/verify-push.mjs`
- Create: `scripts/install-git-hooks.mjs`
- Create: `.githooks/pre-push`
- Create: `.githooks/post-commit`
- Create: `.githooks/post-checkout`
- Create: `.githooks/post-merge`
- Modify: `package.json`
- Test: `scripts/push-verification.test.mjs`

- [x] **Step 1: Add failing contract tests**

Require `verify:push` and `hooks:install` package commands, postinstall hook installation, strict tracked hook scripts, pre-push input replay to both Kwilt verification and Git LFS, and the three LFS lifecycle hooks.

- [x] **Step 2: Run the focused test and confirm RED**

Run: `node --test scripts/push-verification.test.mjs`

Expected: FAIL on missing commands and hook files.

- [x] **Step 3: Implement the runner and installer**

`verify-push.mjs` must read the captured ref updates, exit immediately when `main` is not a target, validate a clean exact `HEAD` candidate, then run:

```text
npm run verify:changed -- --run --base origin/main
npm run test:ci
```

The tracked pre-push hook must capture stdin once, run Kwilt verification with that input, then replay the same input to `git lfs pre-push`. The installer must set the repository-local `core.hooksPath` to `.githooks` without replacing a different custom hook path silently.

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test scripts/push-verification.test.mjs`

Expected: all push and hook contracts pass.

### Task 3: Require broad tests in hosted integration and release paths

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/ios-testflight.sh`
- Modify: `scripts/ios-testflight-contract.test.mjs`
- Test: `scripts/push-verification.test.mjs`

- [x] **Step 1: Add failing workflow and release-order assertions**

Require PR CI to run `npm run test:ci`, and require TestFlight to run the full suite after `verify:changed` but before EAS build/submit.

- [x] **Step 2: Run the contract tests and confirm RED**

Run: `node --test scripts/push-verification.test.mjs scripts/ios-testflight-contract.test.mjs`

Expected: FAIL because PR CI and TestFlight do not yet contain the full-suite commands.

- [x] **Step 3: Update CI and TestFlight**

Add a PR-only full Jest coverage step while retaining the existing diff-aware gate. Insert `npm run test:ci` into the strict TestFlight wrapper between protected verification and EAS build.

- [x] **Step 4: Run the contract tests and confirm GREEN**

Run: `node --test scripts/push-verification.test.mjs scripts/ios-testflight-contract.test.mjs`

Expected: all workflow and ordering contracts pass.

### Task 4: Document, install, and verify

**Files:**
- Modify: `docs/automated-testing-strategy.md`
- Modify: `docs/development/local-verification.md`
- Modify: `scripts/generate-agent-code-map.mjs`
- Modify: `package-lock.json`

- [x] **Step 1: Document the new cadence**

State that commits remain cheap, pushes targeting `main` require a clean exact candidate plus protected and full coverage gates, PR CI repeats full coverage, and TestFlight repeats it before build.

- [x] **Step 2: Install hooks locally**

Run: `npm run hooks:install`

Expected: `git config --local core.hooksPath` reports `.githooks` and existing Git LFS behavior remains represented by the tracked hooks.

- [x] **Step 3: Run verification-tooling tests**

Run: `npm run test:verification`

Expected: all verification and release contract tests pass.

- [x] **Step 4: Run scoped completion verification**

Run: `npm run verify:local -- --run --files package.json package-lock.json scripts/push-verification-lib.mjs scripts/push-verification.test.mjs scripts/verify-push.mjs scripts/install-git-hooks.mjs scripts/ios-testflight.sh scripts/ios-testflight-contract.test.mjs .githooks/pre-push .githooks/post-commit .githooks/post-checkout .githooks/post-merge .github/workflows/ci.yml docs/automated-testing-strategy.md docs/development/local-verification.md scripts/generate-agent-code-map.mjs`

Expected: selected static checks and verification-tooling tests pass; unrelated dirty files remain explicitly outside scope.

No commits, staging, pushes, or releases are authorized by this plan.

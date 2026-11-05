# Native CI feedback implementation plan

**Goal:** Stop rebuilding a compatible iOS test host for JavaScript/test-only changes, and make native failures diagnosable without waiting for unrelated long tests.

**Architecture:** A native-host job fingerprints Expo CNG source inputs and resolved CocoaPods dependencies plus the exact Xcode/SDK/architecture/build recipe, restores only an exact compatible binary, and saves a verified host before UI tests begin. A separate test job downloads that immutable host, serves the current checkout's JavaScript, and restores Metro's content-addressed transform cache. Explicit smoke versus acceptance and test-group inputs permit focused retries without representing them as release acceptance.

**Execution:** Inline in the existing checkout, ordinary branch `codex/native-ci-feedback` from `a9262407`. No worktree; PR #203 and its in-flight run remain untouched. No merge/release waiver. Native host reuse proves compatibility, never current JavaScript acceptance.

**Files:** `.github/workflows/e2e-maestro.yml`; `scripts/e2e/native-host.mjs` and tests; simulator/test-group runner helpers; existing Metro configs; Budget flow decomposition; `scripts/e2e-maestro-runtime.test.mjs`; verification selector/tests; native CI operating documentation.

- [x] Diagnose latest startup failure from retained screenshot, commands and device log; fix only confirmed causes.
- [x] Add failing tests for host compatibility keys, corrupted/mismatched artifact rejection, native input invalidation, workflow gate selection and diagnostics preservation.
- [x] Implement exact native host reuse with build provenance and checksum verification; publish host before test jobs, including on runs whose tests later fail.
- [x] Add Metro transform-cache reuse, phase timings, bounded setup/test commands and immediate diagnostics per group. Keep failures visible; no assertion retries that turn a failing flow green.
- [x] Separate Budget navigation/refresh smoke from complete 4,000-row acceptance. Default release dispatch remains complete acceptance. Expose targeted group dispatch and label its narrower proof.
- [ ] Verify focused tests, real local package/restore and native smoke, task-completion and protected integration checks, independent review. Checkpoint a bounded follow-up commit/PR.
- [ ] Verify hosted cold build then compatible cache hit and targeted retry before claiming latency improvement. Preserve startup failure uncertainty until its actual regression passes.

## Measurement and acceptance

Record queue time separately from compute; publish native cache hit/miss, original host commit, current JS commit, Xcode/SDK/architecture, per-phase elapsed times and test group/suite. Target warm focused feedback under 10 minutes, not a guaranteed SLA. A cold native build may remain about 25 minutes, but must not recur for a YAML-only change. Full inventory acceptance remains mandatory for this Budget release and must not silently become smoke-only. Hosted resource-capacity and device/release proof remain independent.

## Evidence motivating the change

Run 41921173255 compiled for 25m39s and spent 9m35s on auth startup/testing. DevTools now passed; onboarding failed waiting for Workspace native fixture, while Arc and Focus passed. Its full diagnostics are still pending at plan creation. Earlier run 41894523986 attempt 2 passed complete Budget acceptance. The current release candidate remains a9262407 and is not changed by this follow-up branch.

## Local evidence (2026-11-04)

The failed hosted onboarding launch was an Expo manifest timeout (NSURLErrorDomain
-1001), with malformed parent asset paths in Metro. Fixture workspaces and the
resolved-manifest transport passed all four local workspace flows in 2m29s; the
cached bundle warmed in 2s. Original native binary: db7856ba Debug2.0.2(135),
installed on disposable Simulator 282D12B9-82BD-4D37-8DAF-A8A08F2EECAD. Current
JavaScript: dirty codex/native-ci-feedback based on a9262407. Metro port8081,
owned and stopped by the runner. This is not evidence for a newly compiled host.

Actionlint passed. Independent review's resolved-Pods cache finding was fixed and
re-reviewed without further blockers. Actual Expo fingerprint tests now prove
lock invalidation and UUID/test-YAML stability. Full local Jest passed 1,320 suites,
8,333 tests (2 skipped). The local aggregate receipt correctly marked itself stale
because untracked native diagnostics changed during the run; diagnostics are now
ignored. The protected integration gate must establish final-source verification.
Hosted cold-build/cache-hit and complete acceptance evidence are still pending.

Protected `verify:changed --run --base a9262407` passed on the final implementation.
Auth passed (bundle3s/UI18s); quick Budget navigation and refresh passed
(bundle10s/UI44s). No hosted latency result or new-host claim is made yet.

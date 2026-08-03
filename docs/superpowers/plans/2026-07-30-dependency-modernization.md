# Kwilt Dependency Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Kwilt from a drifted Expo SDK 54 installation to a healthy, supportable Expo SDK 57 stack through independently reversible changes, without knowingly changing product behavior.

**Architecture:** Treat dependency modernization as a release program, not a bulk `npm update`. First restore internal SDK 54 consistency, then remove deprecated/runtime-sensitive APIs, then update third-party packages in bounded cohorts, and only then advance Expo one SDK at a time. Every cohort has its own commit, verification evidence, native build, rollback point, and explicit stop condition.

**Tech Stack:** Expo SDK 54-57, React 19.1-19.2, React Native 0.81-0.86, TypeScript, Jest, npm workspaces, CocoaPods, EAS Build/TestFlight, Maestro, Expo Doctor.

---

## Safety contract

No dependency change can be guaranteed never to break anything. This plan instead establishes a no-known-regression contract:

1. Never run upgrade work from a dirty checkout or while another checkout owns Metro, the Simulator, or a native build.
2. Never combine an Expo SDK transition with unrelated feature work.
3. Keep every dependency cohort independently revertible; do not use `npm audit fix --force`.
4. A cohort advances only after its declared source, test, native-build, and runtime gates pass.
5. Preserve the previous signed/TestFlight build as the rollback binary until the replacement clears the observation window.
6. A source/test pass is not native proof. Simulator proof is not signed-device proof. TestFlight installation is not production-behavior proof.
7. If a gate fails, stop that cohort, record the exact failure and last known-good commit, and either repair within the cohort or revert the whole cohort.

## Program entry conditions

Do not begin implementation from the current `codex/family-screen-time-learning-slice` checkout. It contains unrelated tracked and untracked work as of July 30, 2026.

- [x] Finish, preserve, or otherwise disposition the current family Screen Time work.
- [x] Return the normal checkout to clean `main` and fast-forward to `origin/main`.
- [x] Confirm there are no relevant stashes and no other checkout owns Metro or a native runtime.
- [x] Create one ordinary branch, `codex/dependency-modernization`, in `/Users/andrewwatanabe/Kwilt`. Do not create a worktree unless Andrew separately approves parallel implementation.
- [x] Record the starting commit, installed TestFlight version/build, Xcode version, Node version, npm version, CocoaPods version, Metro port/owner, Simulator device, and signed-device availability in the plan's execution log.

Commands:

```bash
cd /Users/andrewwatanabe/Kwilt
git status --short --branch
git fetch origin
git rev-list --left-right --count origin/main...HEAD
git stash list
git worktree list
node --version
npm --version
xcodebuild -version
pod --version
```

Expected: clean `main`, `0 0` against `origin/main`, no task-related stash, and one declared runtime owner.

## Verification matrix

Every cohort runs the repository completion gate:

```bash
npm run verify:changed -- --run
```

Add these gates according to risk:

| Cohort | Additional required proof |
| --- | --- |
| Manifest/tooling only | `npm ci`, Expo install check, Expo Doctor, app/test typecheck |
| Pure JS library | Focused Jest plus full Jest when shared stores/services change |
| Native module | Clean Pods/native build, Simulator launch, focused native flow |
| Audio/background/location/notifications | Signed physical-device flow, background/lock-state check |
| Expo SDK | Clean iOS build, Maestro smoke, all extension targets, signed device, TestFlight |
| RevenueCat/Plaid/HealthKit/Screen Time | Sandbox or signed entitlement/device flow as applicable |

The minimum user-flow regression set for every SDK transition is:

- Authentication and restored session
- Root navigation restoration and deep links
- Activities: create, edit, complete, drag/reorder, reminders, quick add
- Unified Chat: text, streaming, Markdown, attachment selection, voice recording/playback
- Plan and calendar scheduling
- Notifications and background task registration
- Explore map, permissions, location recording, and Silver Mist concealment
- Money: accounts, transaction display, Plaid Link sandbox, RevenueCat entitlement/paywall
- Games: audio, orientation, local table, remote join/deep link
- Household and family Screen Time setup surfaces
- Widgets and Live Activity extension launch
- Apple Health authorization/read path

## Task 1: Capture a reproducible pre-upgrade baseline

**Files:**

- Create: `docs/engineering/dependency-modernization-baseline.md`
- Read: `package.json`
- Read: `package-lock.json`
- Read: `app.config.ts`
- Read: `app.json`
- Read: `ios/Podfile`
- Read: `ios/Podfile.lock`
- Read: `patches/react-native-maps+1.20.1.patch`
- Read: `patches/react-native-drawer-layout+4.2.0.patch`

- [x] **Step 1: Capture manifest, native, compatibility, and security evidence**

```bash
git rev-parse HEAD
git status --short --branch
npm ci
npm ls --all --json > /tmp/kwilt-npm-ls-before.json || true
npm outdated --json > /tmp/kwilt-npm-outdated-before.json || true
npx expo install --check
npx expo-doctor@latest
npm audit --json > /tmp/kwilt-npm-audit-before.json || true
npm audit --omit=dev --json > /tmp/kwilt-npm-audit-production-before.json || true
npx expo-modules-autolinking verify -v
```

Expected: the baseline reproduces the known SDK 54 mismatches, missing `expo-asset`, duplicate `expo-constants`, Jest type mismatch, and React Native Directory warnings without modifying tracked files.

- [x] **Step 2: Write the baseline document**

Record exact versions, command results, direct/transitive audit paths, native patches, deprecations, and current proof boundaries. Classify each item as `blocking`, `cohort candidate`, `SDK-coupled`, `security review`, or `defer`; do not reduce the report to the raw audit count.

- [x] **Step 3: Establish a green behavioral baseline**

```bash
npm run lint
npm run lint:tests
npm test -- --runInBand
npm run product:lint
npm run architecture:lint
npm run verify:changed -- --run
```

Expected: all gates pass or every pre-existing failure is recorded before dependency changes begin.

- [x] **Step 4: Commit the baseline alone**

```bash
git add docs/engineering/dependency-modernization-baseline.md
git commit -m "docs: capture dependency modernization baseline"
```

## Task 2: Restore Expo SDK 54 internal consistency

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.config.ts`
- Modify or remove after reconciliation: `app.json`
- Modify if dependency resolution changes: `ios/Podfile.lock`
- Test: existing repository verification suites

- [x] **Step 1: Pin the supported Node line across local and CI environments**

Use one declared LTS Node version supported by SDK 54 through SDK 57. At execution time, confirm it against Expo's compatibility table; SDK 57 currently requires Node 22.13.x or later. Add the selected version to `package.json` `engines`, `.nvmrc`, and every GitHub workflow that currently specifies Node 20.

Verification:

```bash
node --version
npm ci
```

Expected: local and CI use the same supported major and `npm ci` has no engine warning.

- [x] **Step 2: Apply Expo's SDK 54-compatible versions**

```bash
npx expo install expo@~54.0.36 \
  expo-auth-session@~7.0.11 \
  expo-asset \
  expo-clipboard@~8.0.8 \
  expo-dev-client@~6.0.21 \
  expo-file-system@~19.0.23 \
  expo-font@~14.0.12 \
  expo-image-picker@~17.0.11 \
  expo-linear-gradient@~15.0.8 \
  expo-localization@~17.0.9 \
  expo-notifications@~0.32.17 \
  expo-status-bar@~3.0.9 \
  expo-web-browser@~15.0.11 \
  jest-expo@~54.0.17
npm install --save-dev @types/jest@29.5.14 patch-package@8.0.1
npm uninstall @types/react-native eas-cli
npm dedupe
```

Do not accept a lockfile that changes React, React Native, Reanimated, Worklets, Screens, Maps, Plaid, RevenueCat, or HealthKit outside the declared SDK 54 cohort.

- [x] **Step 3: Reconcile dynamic app configuration**

Compare `app.json` with the fully evaluated `app.config.ts`. Move any still-live value into `app.config.ts`, then remove the redundant static file so Expo Doctor has one configuration owner. Preserve version/build synchronization and every widget, Screen Time, HealthKit, location, notification, and associated-domain setting.

Verification:

```bash
npx expo config --type public > /tmp/kwilt-expo-public-config.json
npx expo config --type introspect > /tmp/kwilt-expo-introspect.json
```

Expected: bundle IDs, build/version, plugins, permissions, entitlements, extensions, and deep-link domains match the baseline.

- [x] **Step 4: Resolve remaining Doctor findings deliberately**

Fix the nested local-module `ios`/`android` ignore pattern. Rename the conflicting `storybook` npm script only if the binary collision remains. Either add a React Native Directory exclusion with a written justification for `kwilt-nearby-table` and Plaid, or retain the warning as a documented upstream limitation.

- [x] **Step 5: Regenerate native dependencies and verify SDK 54**

```bash
npm ci
npx pod-install ios
npx expo install --check
npx expo-doctor@latest
npm run verify:changed -- --run
```

Expected: no Expo version mismatch, no missing native peer, no duplicate Expo native module, and no test-type mismatch. Any consciously retained Doctor warning is listed in the baseline with an owner and rationale.

- [ ] **Step 6: Build and run the SDK 54 native shell**

Build, install, bundle, session restoration, initial sync, and the available deliberate Simulator smoke passed on the declared Simulator on 2026-08-03. The checkbox remains open because the signed-device gates recorded in the baseline are incomplete; the declared iPhone was still offline.

```bash
npx expo run:ios
```

Expected: the app links without the prior `expo-dev-launcher`/`RCTPackagerConnection` failure, launches from the declared checkout and Metro server, and passes the minimum user-flow set.

- [x] **Step 7: Commit only the SDK 54 alignment cohort**

```bash
git add package.json package-lock.json app.config.ts .nvmrc .github ios docs/engineering/dependency-modernization-baseline.md
git commit -m "chore: align Expo SDK 54 dependencies"
```

## Task 3: Remove deprecated audio APIs before SDK 55

**Files:**

- Modify: `src/services/soundscape.ts`
- Modify: `src/services/uiSounds.ts`
- Modify: `src/services/attachments/activityAttachments.ts`
- Modify: `src/features/unifiedChat/unifiedChatVoice.ts`
- Reuse: `src/capabilities/games/audio/useGameFeedback.ts`
- Reuse: `src/capabilities/games/audio/usePatternAudio.ts`
- Create: focused audio contract tests beside each migrated service
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add regression tests for existing audio contracts**

Mock `expo-audio` and cover: one-shot sound replay, soundscape loop/load/fade/stop, app foreground/background recovery, voice-record permission denial, record/start/stop URI return, and attachment duration preservation.

Run each new test first and confirm it fails because the service still imports `expo-av`.

- [ ] **Step 2: Migrate playback to `expo-audio`**

Use `createAudioPlayer`/`replace`, `play`, `pause`, `seekTo(0)`, loop, volume, and `remove` behind the current service functions. Preserve the public service interfaces so screens and Focus behavior do not change. Use `setAudioModeAsync` for silent-mode, interruption, recording, and background behavior.

- [ ] **Step 3: Migrate voice recording to `expo-audio`**

Use the recorder permission and recorder lifecycle APIs, retain the existing result shape, preserve microphone-denial messaging, and verify the recorded file remains uploadable through the attachment service.

- [ ] **Step 4: Remove `expo-av` only after imports reach zero**

```bash
rg -n "expo-av" src packages modules
npm uninstall expo-av
```

Expected: `rg` returns no runtime or type import and the package is absent from both manifest and lockfile.

- [ ] **Step 5: Verify on Simulator and signed hardware**

Test UI completion sounds, Games sounds, soundscape looping and lock-screen continuation, interruption by another audio app, voice recording, voice playback, and attachment upload.

- [ ] **Step 6: Commit the audio migration alone**

```bash
git add src package.json package-lock.json
git commit -m "refactor: migrate audio runtime to expo-audio"
```

## Task 4: Modernize background work and file-system usage

**Files:**

- Modify: `src/services/notifications/notificationBackgroundTask.ts`
- Modify: `src/services/health/healthBackgroundTask.ts`
- Modify: `src/services/attachments/activityAttachments.ts`
- Modify: `src/services/heroImages.ts`
- Modify: `src/utils/persistImageUri.ts`
- Modify: `src/features/unifiedChat/unifiedChatAttachmentPicker.ts`
- Modify: `src/features/unifiedChat/unifiedChatVoice.ts`
- Modify: associated focused tests
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Lock down current scheduling behavior with regression tests**

Cover task naming, registration idempotency, minimum intervals, unregister behavior, unavailable-module fallback, health synchronization, and notification delivery outcomes.

- [ ] **Step 2: Replace `expo-background-fetch` with `expo-background-task`**

Keep Task Manager task identifiers stable where the platform permits. Map the existing success/no-data/failure outcomes to the new task result contract and preserve the current best-effort behavior when background execution is unavailable.

- [ ] **Step 3: Migrate each `expo-file-system/legacy` caller separately**

Use the object-oriented `File`, `Directory`, and `Paths` APIs. Preserve cache/document placement, collision behavior, URI lifetime, uploads, and cleanup. Do not combine this with UI changes.

- [ ] **Step 4: Remove deprecated packages/imports after zero-use checks**

```bash
rg -n "expo-background-fetch|expo-file-system/legacy" src packages modules
npm uninstall expo-background-fetch
npx expo install expo-background-task
```

- [ ] **Step 5: Verify background behavior on a signed device**

Confirm task registration, app suspension/resumption, notification scheduling, health refresh, persisted hero/attachment files after relaunch, and voice attachment upload. Simulator-only proof is insufficient.

- [ ] **Step 6: Commit this cohort alone**

```bash
git add src package.json package-lock.json
git commit -m "refactor: modernize background and file services"
```

## Task 5: Contain the Markdown parser risk

**Files:**

- Create: `src/features/ai/safeMarkdown.ts`
- Create: `src/features/ai/safeMarkdown.test.ts`
- Modify: `src/features/ai/AiChatScreen.tsx`
- Modify: `src/types/react-native-markdown-display.d.ts`
- Modify after upstream verification: `package.json`
- Modify after upstream verification: `package-lock.json`

- [ ] **Step 1: Add hostile-input regression tests**

Cover oversized runs of emphasis markers, brackets, links, `mailto:` prefixes, smart-quote candidates, and an assistant message above the chosen render limit. Assert bounded preprocessing time and deterministic truncation with a visible continuation marker.

- [ ] **Step 2: Add a pure bounded-input adapter**

`safeMarkdown.ts` owns one exported maximum input length, removes NUL/control characters except newline/tab, and returns a deterministic bounded string. It does not silently reinterpret content or allow raw HTML.

- [ ] **Step 3: Configure the parser conservatively**

Disable raw HTML, automatic linkification, and typographer/smartquotes. Render only the syntax Kwilt uses in assistant responses. Keep URL opening behind the existing React Native Linking safety policy.

- [ ] **Step 4: Choose the package action from current upstream evidence**

At execution time, query the currently maintained package/fork and `markdown-it` advisories. Replace `react-native-markdown-display` only if the candidate is maintained, React 19/New Architecture compatible, and clears the hostile-input tests. If no parser release fixes the advisories, retain the bounded adapter and record the residual risk rather than claiming the audit is clean.

- [ ] **Step 5: Verify real chat rendering**

Check streaming prose, headings, lists, emphasis, code, long links, malformed Markdown, goal proposal notes, selection/copy, and accessibility sizing.

- [ ] **Step 6: Commit the renderer hardening alone**

```bash
git add src/features/ai src/types package.json package-lock.json
git commit -m "fix: bound assistant Markdown rendering"
```

## Task 6: Update non-SDK dependencies in bounded cohorts

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: focused source/tests only when a documented upstream change requires it
- Modify if native packages change: `ios/Podfile.lock`
- Rebase and retain deliberately: both files under `patches/`

For every cohort: capture upstream changelogs, install only named packages, inspect the lockfile, run focused tests, run `npm run verify:changed -- --run`, perform required native proof, and commit before starting the next cohort.

- [ ] **Step 1: UI primitives cohort**

Update within current majors: Bottom Sheet 5, React Native Primitives 1, Lucide only within the currently compatible line, Picker within Expo's supported range, and safe-area context within Expo's supported range. Test drawers, sheets, menus, portals, focus trapping, keyboard avoidance, reduced motion, and accessibility.

- [ ] **Step 2: Navigation cohort**

Update all React Navigation 7 packages together. Rebase `patches/react-native-drawer-layout+4.2.0.patch` if its transitive version changes and preserve `ReduceMotion.System`. Test root restore, tabs, drawer, modals, deep links, Games joins, auth redirects, and Android back behavior.

- [ ] **Step 3: Data/analytics cohort**

Update Supabase JS 2 in both root and `packages/kwilt-sdk`, PostHog React Native 4, and Zustand 5. Test session refresh, realtime subscriptions, offline/local patches, analytics initialization/opt-out, and persisted-store hydration.

- [ ] **Step 4: Commercial/native integrations cohort**

Update RevenueCat within 9.x, HealthKit within 14.x, Plaid within its Expo-compatible 13.x line, and Nitro Modules within the line required by those packages. Verify entitlement restoration/paywall, Plaid sandbox Link, Apple Health authorization/read, and a clean native build.

- [ ] **Step 5: Tooling cohort**

Update Storybook 10 packages together, Vite within 8.x, `tsup` within 8.x in every workspace, and other patch/minor development tools. Keep Jest 29 and TypeScript 5.9 until the target Expo SDK explicitly supports newer majors.

- [ ] **Step 6: Defer independent major upgrades**

Do not independently upgrade React, React Native, Expo modules, Jest 30, Testing Library 14, TypeScript 7, Gesture Handler 3, Async Storage 3, WebView 14, URL Polyfill 4, RevenueCat 10, or Maps. Reassess each after SDK 57 is stable.

## Task 7: Upgrade Expo SDK 54 to 55

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.config.ts`
- Modify: `ios/Podfile`
- Modify: `ios/Podfile.lock`
- Modify: `ios/Kwilt.xcodeproj/project.pbxproj`
- Modify: Expo/native files identified by the 54-to-55 Native Project Upgrade Helper
- Test: all verification and native flows in the matrix

- [ ] **Step 1: Read the SDK 55 release notes and native diff before installation**

Record every applicable removal, config change, minimum tool version, and native project change in the baseline document. Confirm New Architecture remains enabled and all third-party native modules support React Native 0.83.

- [ ] **Step 2: Upgrade only to SDK 55**

```bash
npm install expo@^55.0.0
npx expo install --fix
npx expo-doctor@latest
npx pod-install ios
```

- [ ] **Step 3: Inspect the dependency and native diffs**

Verify React 19.2, React Native 0.83, Expo package alignment, extension targets, entitlements, App Group, Family Controls capability, associated domains, location/background modes, privacy manifest, and deployment targets.

- [ ] **Step 4: Run the full SDK gate**

Run full source/test verification, clean native build, Maestro smoke, all minimum user flows, signed device, and TestFlight. Hold the build for at least 48 hours of normal dogfood use before proceeding.

- [ ] **Step 5: Commit and tag the rollback point**

```bash
git add package.json package-lock.json app.config.ts ios docs/engineering/dependency-modernization-baseline.md
git commit -m "chore: upgrade Kwilt to Expo SDK 55"
git tag dependency-modernization-sdk55-verified
```

## Task 8: Upgrade Expo SDK 55 to 56

**Files:** same native and manifest surfaces as Task 7, plus calendar/file-system callers identified by SDK 56 release notes.

- [ ] **Step 1: Confirm platform implications before upgrading**

SDK 56 currently requires Xcode 26.4 and raises the minimum iOS deployment target to 16.4. Check active-device OS distribution and explicitly accept the user-impact of dropping iOS 15 before changing the target.

- [ ] **Step 2: Upgrade only to SDK 56**

```bash
npm install expo@^56.0.0
npx expo install --fix
npx expo-doctor@latest
npx pod-install ios
```

- [ ] **Step 3: Apply SDK 56 API changes**

Verify `expo/fetch` behavior, file-system copy/move async behavior, calendar API deprecations, explicit icon dependencies, Hermes V1, status/navigation bars, and every checked-in native project change.

- [ ] **Step 4: Measure rather than assume the advertised value**

Capture clean iOS build duration, app cold start, first render, memory at idle, memory during Explore, memory during Games/audio, and a representative native-module-heavy flow. Compare with the SDK 55 baseline on the same device and build configuration.

- [ ] **Step 5: Run the full SDK gate and dogfood window**

Run all source/test/native/device/TestFlight gates and hold for at least 72 hours because this transition changes React Native, Hermes, deployment target, and native module internals.

- [ ] **Step 6: Commit and tag the rollback point**

```bash
git add package.json package-lock.json app.config.ts ios src docs/engineering/dependency-modernization-baseline.md
git commit -m "chore: upgrade Kwilt to Expo SDK 56"
git tag dependency-modernization-sdk56-verified
```

## Task 9: Upgrade Expo SDK 56 to 57 conditionally

**Files:** same native and manifest surfaces as Tasks 7-8, plus Reanimated/Worklets configuration.

- [ ] **Step 1: Recheck the known Reanimated/Hermes memory regression**

Read the current SDK 57 and Reanimated issue status. If the reported 25-30% memory increase remains, enable and test Worklets bundle mode or defer SDK 57. Do not waive this gate merely because Expo describes 56-to-57 as non-breaking.

- [ ] **Step 2: Upgrade only to SDK 57 when the memory gate has a viable outcome**

```bash
npm install expo@^57.0.0
npx expo install --fix
npx expo-doctor@latest
npx pod-install ios
```

- [ ] **Step 3: Rebase native patches explicitly**

Keep `react-native-maps` pinned unless the Silver Mist patch is deliberately ported. Confirm the patch still applies, builds, fails closed, preserves legal labels, and conceals unexplored map content. Rebase the drawer reduced-motion patch if required.

- [ ] **Step 4: Compare performance with SDK 56**

Repeat the same build, startup, render, and memory measurements. The SDK 57 cohort passes only if memory is acceptable or the documented mitigation restores it without behavior loss.

- [ ] **Step 5: Run the full SDK gate and TestFlight observation window**

Run all gates and dogfood for at least 72 hours. Preserve the verified SDK 56 TestFlight build throughout this window.

- [ ] **Step 6: Commit and tag the final rollback point**

```bash
git add package.json package-lock.json app.config.ts ios src patches docs/engineering/dependency-modernization-baseline.md
git commit -m "chore: upgrade Kwilt to Expo SDK 57"
git tag dependency-modernization-sdk57-verified
```

## Task 10: Close the modernization program

**Files:**

- Modify: `docs/engineering/dependency-modernization-baseline.md`
- Modify: `docs/agent-code-map.md` if dependency/native ownership changes affect it
- Modify: this plan's checkbox state during execution

- [ ] **Step 1: Run final comprehensive verification**

```bash
npm ci
npx expo install --check
npx expo-doctor@latest
npm audit --json > /tmp/kwilt-npm-audit-after.json || true
npm audit --omit=dev --json > /tmp/kwilt-npm-audit-production-after.json || true
npm run verify:changed -- --run
npm test -- --runInBand
npm run agent:map
git diff --exit-code docs/agent-code-map.md
```

- [ ] **Step 2: Explain every retained finding**

For each remaining audit or Doctor item, record whether it is build-only or shipped, reachable or unreachable, mitigated or accepted, its upstream owner, and its next review date. Never claim `0 vulnerabilities` unless the command actually reports it.

- [ ] **Step 3: Confirm rollback and release evidence**

Record the final commit, PR, merge commit, EAS build ID, TestFlight build, installed signed-device build, observed flows, unproven flows, and the prior recoverable build.

- [ ] **Step 4: Merge only after independent review**

Request code review of the complete commit series. Address findings cohort-by-cohort. Merge through the normal repository process; do not squash away useful rollback boundaries unless the verified tags remain available.

## Recurring dependency review contract

Run a read-only review monthly, on the first Monday at 9:00 AM local time. Monthly is frequent enough to catch supported patch releases and advisories without turning native dependency churn into weekly noise. Also run the review manually when Expo announces a stable SDK, Apple changes an Xcode/App Store requirement, or a relevant high/critical advisory becomes known.

The recurring review must:

1. Make no package, lockfile, native, branch, commit, PR, or runtime changes.
2. Start with checkout/branch/dirty-state provenance.
3. Run `npx expo install --check`, `npx expo-doctor@latest`, `npm outdated --json`, `npm audit --json`, and `npm audit --omit=dev --json` without applying fixes.
4. Check current official Expo compatibility/release notes and the changelogs for direct dependencies that materially changed.
5. Distinguish shipped/runtime risk from development/build-tool findings.
6. Account for pinned/patched native packages, Expo coupling, deprecations, iOS/Xcode minimums, custom extensions, New Architecture support, and signed-device proof requirements.
7. Compare with the prior review and report only meaningful changes.
8. Recommend at most one next bounded cohort with value, likely impact, rollback point, and required proof—or recommend no action.
9. Never implement the recommendation without Andrew's separate approval.

Output format:

```text
Dependency posture: green | amber | red
Meaningful change since last review: ...
Urgent security/compatibility issue: ...
Recommended next cohort: ... | No action this month
User value: ...
Expected impact and risk: ...
Required proof: ...
Deferred items and why: ...
```

## Execution log

Append one dated entry per cohort with:

- Starting and ending commit
- Exact dependency/native diff
- Commands and results
- Simulator/runtime owner and provenance
- Signed device/TestFlight evidence
- Performance measurements when applicable
- Retained risks
- Rollback commit/tag
- Advance, repair, defer, or revert decision

### 2026-08-03 — Baseline and SDK 54 alignment

- Starting commit: `72dabd2`; baseline-only commit: `aa69917`; SDK 54 alignment commit: `f17a19e`.
- Dependency/config diff: Expo `54.0.24` -> `54.0.36` and the 13 declared SDK companion patches; direct `expo-asset` and `babel-preset-expo`; Jest 29-compatible types/preset; removed local `eas-cli` and direct `@types/react-native`; Node 22.23.2 declarations; one dynamic Expo config owner; Doctor script, ignore, and directory-metadata reconciliation.
- Protected native/runtime versions remained fixed, including React, React Native, Reanimated, Worklets, Screens, Maps/Silver Mist, Plaid, RevenueCat, and HealthKit.
- Verification: Node 22 clean install, both patch-package patches, Expo install check, Expo Doctor 18/18, autolinking, Pods, app/test typechecks, product/architecture lint, diff-aware verification, protected-version guard, full Jest comparison, clean iOS compile/install/bundle/launch, session restoration, and initial domain sync.
- Runtime provenance: `/Users/andrewwatanabe/Kwilt`, `codex/dependency-modernization`, Simulator `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`, Metro 8081 owned by this checkout during launch and stopped afterward.
- Signed device/TestFlight: not run; the available iPhone was offline. No EAS/TestFlight build was created.
- Retained risks: the 15 pre-existing Pixel Pet Jest-runner mismatches; 30 audit findings including build-tool `shell-quote` critical and shipped Markdown highs; existing native warnings; deliberate Simulator critical-flow smoke and signed-device integration flows remain open.
- Rollback point: `aa69917` for the alignment cohort (`72dabd2` for the entire program).
- Decision: hold at the SDK 54 checkpoint. Do not begin audio/API modernization or an SDK transition until the remaining Step 6 runtime proof is accepted or completed.

### 2026-08-03 — SDK 54 Simulator critical-flow continuation

- Commit under test: `2c26231`; no dependency, source, lockfile, or native-project change was made.
- Runtime provenance: `/Users/andrewwatanabe/Kwilt`, `codex/dependency-modernization`, Simulator `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`, Metro 8081 owned by this checkout and stopped after the smoke.
- Rebuilt the same commit with the existing release Chat flag and stable Kwilt-owned workbench URL supplied as process environment. The incremental native build passed with 0 errors and 1 retained Maps privacy-bundle deployment-target warning.
- Observed without a fatal runtime error: restored signed-in Chat and an existing thread; Goals; the To-dos list and duration editor; Plan/calendar; Chapters; Budget, Transactions, and Accounts; Explore with the pinned Silver Mist Metal concealment visible; Games catalog; the Hourglass timer across portrait/landscape; legacy `kwiltgames://join/:token` routing into the join surface; personal and family Screen Time surfaces; session restoration; initial domain sync; and push-token registration logging.
- Automated Maestro smoke was unavailable because the installed Maestro launcher has no Java runtime. This is retained as a tooling gap, not counted as a passing gate.
- Not proven in this continuation: create/edit/complete/reorder/reminder mutations, Chat attachment/voice streaming, Plaid sandbox Link, RevenueCat purchase/restore, Apple Health authorization/read, notification delivery, background/lock-state behavior, real GPS recording, widget/Live Activity placement, signed Screen Time enforcement, physical audio/interruption behavior, or TestFlight.
- Signed device remained unavailable: `Andy’s iPhone 16` (`00008140-001A55A41E07001C`) was still offline.
- Decision: retain the SDK 54 hold. Task 3 does not start until signed-device proof is available or Andrew explicitly revises the plan's safety gate with the remaining risk recorded.

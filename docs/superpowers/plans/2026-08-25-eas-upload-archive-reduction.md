# EAS Upload Archive Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Kwilt's EAS source upload from the gigabyte range to a measured, build-complete archive containing only remote-build inputs, while preventing future ignore-policy drift and keeping App Store binary size as a separate proof gate.

**Architecture:** Treat EAS upload composition as a repository policy, not as an app-runtime optimization. First capture the archive EAS would actually upload, then add a small Node policy test around `.easignore`, exclude confirmed non-build directories, inspect the resulting archive locally, and observe the next normally scheduled TestFlight upload without purchasing an extra build solely for measurement.

**Tech Stack:** Expo SDK 54, EAS CLI 22.0.0, `.easignore`, Node.js built-in test runner, existing `verify:changed` orchestration, macOS shell tools (`du`, `find`, `stat`, `unzip`).

---

## Scope and safety boundaries

- Work in `/Users/andrewwatanabe/Kwilt` on the existing checkout and branch. Do not create a worktree unless Andrew separately approves parallel implementation.
- Before every implementation batch, record `git branch --show-current`, `git rev-parse HEAD`, and `git status --short`. Stop if unrelated changes overlap `.easignore`, `package.json`, or `scripts/verify-changed.mjs`.
- Do not cancel or replace an EAS build already in progress.
- Do not trigger a paid EAS build solely to test archive size. Use `eas build:inspect` locally, then observe the next build Andrew already intends to ship.
- Do not delete `artifacts/`, `prototypes/`, or App Store screenshots. This plan excludes them from EAS upload only.
- Do not rewrite Git history or introduce Git LFS. The approximately 950 MB `.git/` directory is already excluded from EAS; repository-history cleanup is a separate project.
- Keep user download size separate from EAS source-upload size. Passing this plan proves smaller build input, not a smaller App Store download.
- EAS CLI 22.0.0 special-cases removal of the cloned Git directory by checking the literal `.git` path. Use `.git`, not `.git/`; the trailing-slash rule matches children but does not satisfy that special-case check.
- Credential files must remain excluded. Current `production` and `production-widgets` profiles use remote credentials, so the January comment allowing local certificate files is obsolete.

## File map

- Modify: `.easignore` — canonical EAS upload exclusions, including generated evidence, prototypes, App Store media, local credentials, and local tooling state.
- Create: `scripts/eas-upload-policy-lib.mjs` — pure parser and validator for required EAS exclusions.
- Create: `scripts/eas-upload-policy.test.mjs` — fixture tests plus a repository-level assertion against the real `.easignore`.
- Modify: `package.json` — expose the focused policy test as `test:eas-upload-policy`.
- Modify: `scripts/verify-changed.mjs` — automatically select the policy test whenever EAS upload configuration or its guard changes.
- No production app, asset import, native target, signing, or capability file changes are planned.

### Task 1: Capture the actual pre-change EAS archive

**Files:**
- Inspect: `.easignore`
- Inspect: `eas.json`
- Create outside repository: temporary archive directory under `/tmp`

- [ ] **Step 1: Confirm checkout provenance and cleanliness**

Run:

```bash
cd /Users/andrewwatanabe/Kwilt
git branch --show-current
git rev-parse HEAD
git status --short
```

Expected: branch and commit are printed. `git status --short` is empty, or any unrelated changes are explicitly preserved and do not overlap this plan's files.

- [ ] **Step 2: Create an isolated inspection destination**

Run:

```bash
KWILT_EAS_AUDIT_ROOT=$(mktemp -d /tmp/kwilt-eas-upload-before.XXXXXX)
printf '%s\n' "$KWILT_EAS_AUDIT_ROOT"
```

Expected: a unique absolute path under `/tmp`; nothing is created in the repository.

- [ ] **Step 3: Materialize the archive EAS would upload**

Run:

```bash
npx eas-cli@22.0.0 build:inspect \
  --platform ios \
  --profile testflight-widgets \
  --stage archive \
  --output "$KWILT_EAS_AUDIT_ROOT/archive"
```

Expected: the command completes without starting a cloud build and writes the inspection archive under the temporary directory. If it requests authentication, use the existing EAS session; do not enter or request Apple credentials.

- [ ] **Step 4: Measure the baseline and list its largest roots**

Run:

```bash
du -sk "$KWILT_EAS_AUDIT_ROOT/archive"
du -sk "$KWILT_EAS_AUDIT_ROOT/archive"/.[!.]* "$KWILT_EAS_AUDIT_ROOT/archive"/* 2>/dev/null | sort -nr | head -40
find "$KWILT_EAS_AUDIT_ROOT/archive" -type f -exec stat -f '%z %N' {} \; | sort -nr | head -50
```

Expected: evidence identifies the actual archive size and largest included directories/files. Preserve the terminal output for the before/after comparison.

- [ ] **Step 5: Explicitly test the current root-cause hypothesis**

Run:

```bash
for archive_entry in artifacts prototypes app-store-screenshots ios node_modules .git; do
  if [ -e "$KWILT_EAS_AUDIT_ROOT/archive/$archive_entry" ]; then
    du -sk "$KWILT_EAS_AUDIT_ROOT/archive/$archive_entry"
  else
    printf 'ABSENT %s\n' "$archive_entry"
  fi
done
```

Expected: this determines rather than assumes which large paths produced the observed upload. If `ios`, `node_modules`, or `.git` is present despite its current rule, stop before editing and investigate EAS ignore-root resolution; do not pile additional patterns onto an unexplained failure.

### Task 2: Add an executable EAS upload policy and reduce the archive

**Files:**
- Create: `scripts/eas-upload-policy-lib.mjs`
- Create: `scripts/eas-upload-policy.test.mjs`
- Modify: `.easignore`
- Modify: `package.json`

- [ ] **Step 1: Write the policy tests first**

Create `scripts/eas-upload-policy.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  REQUIRED_EAS_IGNORE_ENTRIES,
  validateEasIgnore,
} from './eas-upload-policy-lib.mjs';

test('reports each required exclusion missing from an EAS ignore file', () => {
  const errors = validateEasIgnore('.git\nnode_modules/\n');

  assert.ok(errors.some((error) => error.includes('/artifacts/')));
  assert.ok(errors.some((error) => error.includes('/prototypes/')));
  assert.ok(errors.some((error) => error.includes('app-store-screenshots/')));
  assert.ok(errors.some((error) => error.includes('*.p12')));
});

test('accepts the complete canonical exclusion set', () => {
  const source = `${REQUIRED_EAS_IGNORE_ENTRIES.join('\n')}\n`;

  assert.deepEqual(validateEasIgnore(source), []);
});

test('rejects the obsolete local-credentials rationale', () => {
  const source = `${REQUIRED_EAS_IGNORE_ENTRIES.join('\n')}\n# production-widgets uses credentialsSource: "local"\n`;

  assert.match(validateEasIgnore(source).join('\n'), /obsolete local-credentials rationale/);
});

test('the repository EAS ignore file satisfies the upload policy', async () => {
  const source = await readFile(new URL('../.easignore', import.meta.url), 'utf8');

  assert.deepEqual(validateEasIgnore(source), []);
});
```

- [ ] **Step 2: Run the test and verify the red state**

Run:

```bash
node --test scripts/eas-upload-policy.test.mjs
```

Expected: FAIL because `scripts/eas-upload-policy-lib.mjs` does not exist yet. This confirms the new test is being executed.

- [ ] **Step 3: Implement the pure policy validator**

Create `scripts/eas-upload-policy-lib.mjs`:

```js
export const REQUIRED_EAS_IGNORE_ENTRIES = Object.freeze([
  '.git',
  '.cursor/',
  '.worktrees/',
  'node_modules/',
  '.expo/',
  '/ios',
  '/android',
  '/artifacts/',
  '/prototypes/',
  'app-store-screenshots/',
  'eas_logs_local/',
  'eas_cloud_logs/',
  '.env',
  '.env*.local',
  'credentials.json',
  '*.jks',
  '*.key',
  '*.mobileprovision',
  '*.p12',
  '*.p8',
  '*.pem',
  'modules/*/android/build/',
]);

export function parseIgnoreEntries(source) {
  return new Set(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  );
}

export function validateEasIgnore(source) {
  const entries = parseIgnoreEntries(source);
  const errors = REQUIRED_EAS_IGNORE_ENTRIES
    .filter((entry) => !entries.has(entry))
    .map((entry) => `missing required EAS exclusion: ${entry}`);

  if (/credentialsSource:\s*["']local["']/u.test(source)) {
    errors.push('obsolete local-credentials rationale remains in .easignore');
  }

  return errors;
}
```

- [ ] **Step 4: Run the test and verify it now fails for the real policy gap**

Run:

```bash
node --test scripts/eas-upload-policy.test.mjs
```

Expected: fixture tests pass; repository assertion fails with missing entries such as `/artifacts/`, `/prototypes/`, `app-store-screenshots/`, and credential patterns.

- [ ] **Step 5: Update the stale `.easignore` credential rationale**

Replace the opening comment with:

```gitignore
# EAS upload ignore rules.
#
# This file takes precedence over .gitignore. Keep repository-local files,
# generated evidence, build outputs, and credential material represented here.
```

Expected: the file no longer claims `production-widgets` needs local `.p12` or `.mobileprovision` files.

- [ ] **Step 6: Add the repository-local and generated-output exclusions**

Add these entries in their corresponding sections, without removing the existing `/ios`, `/android`, dependency, Expo, documentation, or environment rules:

```gitignore
# local editor and parallel-checkout state
.git
.cursor/
.worktrees/

# generated review, prototype, and store-presentation artifacts
/artifacts/
/prototypes/
app-store-screenshots/

# local EAS logs and generated native outputs
eas_logs_local/
eas_cloud_logs/
modules/*/android/build/

# credential material; store-build profiles use EAS remote credentials
credentials.json
*.jks
*.key
*.mobileprovision
*.p12
*.p8
*.pem
```

Expected: EAS excludes the approximately 674 MB `artifacts/`, 67 MB `prototypes/`, and 77 MB App Store screenshot tree, while leaving actual `assets/`, `src/`, config plugins, workspace packages, patches, and build scripts available.

- [ ] **Step 7: Add the focused package command**

Add this key to the `scripts` object in `package.json` adjacent to the other repository-policy checks:

```json
"test:eas-upload-policy": "node --test scripts/eas-upload-policy.test.mjs"
```

- [ ] **Step 8: Run the policy test and verify the green state**

Run:

```bash
npm run test:eas-upload-policy
```

Expected: all four tests PASS.

- [ ] **Step 9: Check the focused diff and commit the policy slice**

Run:

```bash
git diff -- .easignore package.json scripts/eas-upload-policy-lib.mjs scripts/eas-upload-policy.test.mjs
git diff --check
git add .easignore package.json scripts/eas-upload-policy-lib.mjs scripts/eas-upload-policy.test.mjs
git diff --cached --check
git commit -m "chore: reduce EAS upload archive"
```

Expected: one focused commit containing only upload policy, tests, and the package command.

### Task 3: Make diff-aware verification enforce the policy

**Files:**
- Modify: `scripts/verify-changed.mjs`
- Modify: `scripts/verify-changed-lib.mjs`
- Modify: `scripts/verify-changed-lib.test.mjs`

- [ ] **Step 1: Write the verification-selection tests**

Extend the import in `scripts/verify-changed-lib.test.mjs`:

```js
import {
  buildRelatedTestCommand,
  needsEasUploadPolicy,
} from './verify-changed-lib.mjs';
```

Add these tests:

```js
test('selects the EAS upload policy for upload configuration changes', () => {
  assert.equal(needsEasUploadPolicy(['.easignore']), true);
  assert.equal(needsEasUploadPolicy(['eas.json']), true);
  assert.equal(needsEasUploadPolicy(['scripts/eas-upload-policy-lib.mjs']), true);
  assert.equal(needsEasUploadPolicy(['scripts/eas-upload-policy.test.mjs']), true);
});

test('does not select the EAS upload policy for unrelated app changes', () => {
  assert.equal(needsEasUploadPolicy(['src/App.tsx']), false);
});
```

- [ ] **Step 2: Run the test and verify selection fails**

Run:

```bash
node --test scripts/verify-changed-lib.test.mjs
```

Expected: FAIL because `needsEasUploadPolicy` is not exported yet.

- [ ] **Step 3: Implement the pure selection predicate**

Add this export to `scripts/verify-changed-lib.mjs`:

```js
export function needsEasUploadPolicy(files) {
  return files.some((file) =>
    /^(\.easignore|eas\.json|scripts\/eas-upload-policy(?:-lib)?(?:\.test)?\.mjs)$/.test(file),
  );
}
```

- [ ] **Step 4: Add the focused selector to `scripts/verify-changed.mjs`**

Extend the existing import from `scripts/verify-changed-lib.mjs`:

```js
import {
  buildRelatedTestCommand,
  needsEasUploadPolicy,
} from './verify-changed-lib.mjs';
```

Insert this rule after the existing code-health-specific selector:

```js
if (needsEasUploadPolicy(files)) {
  add(
    'npm run test:eas-upload-policy',
    'validate EAS archive exclusions and prevent credential or generated-artifact upload drift',
  );
}
```

- [ ] **Step 5: Run the focused tests and inspect the selected completion gates**

Run:

```bash
node --test scripts/verify-changed-lib.test.mjs
npm run test:eas-upload-policy
npm run verify:changed
```

Expected: policy tests PASS, and the printed verification plan includes `npm run test:eas-upload-policy`.

- [ ] **Step 6: Commit the verification integration**

Run:

```bash
git diff -- scripts/verify-changed.mjs scripts/verify-changed-lib.mjs scripts/verify-changed-lib.test.mjs
git diff --check
git add scripts/verify-changed.mjs scripts/verify-changed-lib.mjs scripts/verify-changed-lib.test.mjs
git diff --cached --check
git commit -m "test: enforce EAS upload exclusions"
```

Expected: a second focused commit containing only the regression-selection change.

### Task 4: Prove the reduced archive before another cloud build

**Files:**
- Inspect: generated archive under `/tmp`
- Verify: `.easignore`
- Verify: repository completion gates

- [ ] **Step 1: Generate a fresh post-change archive into a new directory**

Run:

```bash
KWILT_EAS_AUDIT_AFTER=$(mktemp -d /tmp/kwilt-eas-upload-after.XXXXXX)
npx eas-cli@22.0.0 build:inspect \
  --platform ios \
  --profile testflight-widgets \
  --stage archive \
  --output "$KWILT_EAS_AUDIT_AFTER/archive"
```

Expected: archive inspection completes locally without starting or submitting a cloud build.

- [ ] **Step 2: Verify every forbidden large root contains no uploaded files**

Run:

```bash
for archive_entry in artifacts prototypes app-store-screenshots ios node_modules .git .cursor; do
  uploaded_file=$(find "$KWILT_EAS_AUDIT_AFTER/archive/$archive_entry" -type f -print -quit 2>/dev/null)
  test -z "$uploaded_file" || {
    printf 'UNEXPECTED_ARCHIVE_FILE %s\n' "$uploaded_file" >&2
    exit 1
  }
done
```

Expected: command exits zero with no `UNEXPECTED_ARCHIVE_FILE` output. EAS inspection may preserve empty directory shells; those are harmless and occupy zero KiB.

- [ ] **Step 3: Compare before and after measurements**

Run:

```bash
du -sk "$KWILT_EAS_AUDIT_ROOT/archive" "$KWILT_EAS_AUDIT_AFTER/archive"
du -sk "$KWILT_EAS_AUDIT_AFTER/archive"/.[!.]* "$KWILT_EAS_AUDIT_AFTER/archive"/* 2>/dev/null | sort -nr | head -40
find "$KWILT_EAS_AUDIT_AFTER/archive" -type f -exec stat -f '%z %N' {} \; | sort -nr | head -50
```

Expected: the post-change archive is at least approximately 800 MB smaller on disk than the baseline if all diagnosed directories were present before. Treat a remaining archive above 350 MB as an investigation trigger: inspect its largest roots and explain them before proceeding, rather than adding speculative exclusions.

- [ ] **Step 4: Confirm config resolution still succeeds**

Run:

```bash
KWILT_APP_ENV=test \
KWILT_ENABLE_APP_GROUPS=1 \
KWILT_ENABLE_SCREEN_TIME=1 \
KWILT_ENABLE_WIDGETS=1 \
npx expo config --type introspect --json >/dev/null
```

Expected: exit zero. This proves app config and its local plugins remain present after archive-policy changes; it does not prove a signed native build.

- [ ] **Step 5: Run the task-completion verification once**

Run:

```bash
npm run verify:changed -- --run
```

Expected: all diff-selected checks pass, including `npm run test:eas-upload-policy`. Repeat only if this run fails, its result is lost, the diff changes afterward, or the integration base changes.

- [ ] **Step 6: Record final Git state**

Run:

```bash
git status --short
git log -2 --oneline
```

Expected: no uncommitted implementation changes remain and the two focused commits are visible. Do not push or merge unless Andrew separately requests it.

### Task 5: Observe the next intended TestFlight build and keep proof boundaries honest

**Files:**
- No source changes expected
- Inspect: EAS build output and downloadable `.ipa` when available

- [ ] **Step 1: Use the next already-approved release build as the live upload check**

Run only when Andrew independently intends to create the next TestFlight build:

```bash
npm run ios:testflight
```

Expected: the project-compression/upload phase reports a materially smaller archive and reaches an assigned EAS build ID. Do not start this build merely to validate size.

- [ ] **Step 2: Capture the live archive measurement and build identity**

Record from the EAS output:

```text
source checkout
branch
commit SHA
dirty state
EAS profile: testflight-widgets
reported upload/archive size
EAS build ID
```

Expected: all seven fields have concrete values from the same invocation. Archive upload success is not yet signed-build or TestFlight proof.

- [ ] **Step 3: Measure the final application artifact separately after EAS finishes**

Set `KWILT_EAS_BUILD_ID` to the build ID emitted by Step 2, then run:

```bash
KWILT_IPA_AUDIT_ROOT=$(mktemp -d /tmp/kwilt-ipa-size.XXXXXX)
KWILT_IPA_URL=$(npx eas-cli@22.0.0 build:view "$KWILT_EAS_BUILD_ID" --json | node -e \
  "let input=''; process.stdin.on('data', chunk => input += chunk); process.stdin.on('end', () => { const build=JSON.parse(input); const url=build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl; if (!url) process.exit(1); process.stdout.write(url); });")
curl --fail --location --silent --show-error \
  "$KWILT_IPA_URL" \
  --output "$KWILT_IPA_AUDIT_ROOT/Kwilt.ipa"
stat -f '%z %N' "$KWILT_IPA_AUDIT_ROOT/Kwilt.ipa"
unzip -q "$KWILT_IPA_AUDIT_ROOT/Kwilt.ipa" -d "$KWILT_IPA_AUDIT_ROOT/unpacked"
du -sk "$KWILT_IPA_AUDIT_ROOT/unpacked/Payload"/*.app
```

Expected: report both compressed IPA bytes and unpacked app size. Do not compare either number directly to the EAS source archive; they answer different questions.

- [ ] **Step 4: Decide whether app-size optimization is warranted**

Use this decision rule:

```text
If the EAS source archive is small but the IPA or App Store download remains unexpectedly large,
open a separate asset-size investigation focused on imported wallpapers, illustrations, audio,
recipe fallbacks, and native frameworks. Do not broaden this upload-policy change into asset removal.
```

Expected: this plan closes once EAS upload composition is proven. App thinning, installed size, Apple processing, tester availability, and physical-device behavior remain separate release gates.

## Acceptance criteria

- `.easignore` no longer contains the obsolete local-credentials rationale.
- The EAS upload policy rejects missing generated-artifact and credential exclusions.
- `artifacts/`, `prototypes/`, `app-store-screenshots/`, `ios/`, `node_modules/`, `.git/`, and `.cursor/` contain no files in the inspected EAS archive; empty zero-KiB directory shells are acceptable.
- The locally inspected archive is materially smaller; the diagnosed directories should remove approximately 800 MB when present in the baseline.
- App config introspection succeeds from the intended `testflight-widgets` configuration.
- `npm run verify:changed -- --run` passes once at task completion.
- No EAS build is purchased solely for measurement.
- The next intended EAS build records checkout, commit, profile, upload size, and build ID.
- IPA/App Store size is reported separately and does not get conflated with source-upload size.

## Explicitly deferred follow-up

Removing tracked audition videos and prototypes from current Git history could shrink clones and the local `.git/` directory, but it would require archive/retention decisions and potentially destructive history rewriting. That work is not necessary to fix EAS uploads and must be planned and approved separately.

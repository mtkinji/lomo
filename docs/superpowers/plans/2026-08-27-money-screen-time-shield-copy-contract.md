# Money Screen Time Shield Copy Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Money-owned Screen Time shield name the budget category, state the real condition, identify the blocked app, and offer one specific review action.

**Architecture:** Keep Money as the owner of the category condition and the shared Screen Time layer as the owner of native shield presentation. Reuse the category name that `reconcileMoneyAppControls()` already writes to `KwiltRestrictionLedgerEntry.label` and the app or website name supplied by Managed Settings; format both inside the generated Swift extension without exposing Apple tokens to JavaScript. Preserve existing non-Money and overlapping-rule behavior, with explicit fallbacks when either readable label is unavailable.

**Tech Stack:** React Native/TypeScript, Expo config plugins, generated Swift, Apple ManagedSettingsUI, Node test runner, Jest, Xcode/iOS Simulator, entitlement-enabled physical iPhone.

---

## Product copy contract

For one active Money rule, the native shield uses this grammar:

```text
<Category> <condition>.
Review your <Category> budget in Kwilt Money to use <App>.

Review <Category>
```

The reason matrix is:

| Semantic reason | Headline with `Shopping` | Supporting copy with `Amazon` | CTA |
|---|---|---|---|
| `money_ahead_of_pace` | `Shopping is ahead of plan.` | `Review your Shopping budget in Kwilt Money to use Amazon.` | `Review Shopping` |
| `money_over_limit` | `Shopping is over plan.` | `Review your Shopping budget in Kwilt Money to use Amazon.` | `Review Shopping` |
| `money_usage_threshold` | `Shopping is nearly at its plan.` | `Review your Shopping budget in Kwilt Money to use Amazon.` | `Review Shopping` |
| `money_review_required` | `Review Shopping first.` | `Review your Shopping budget in Kwilt Money to use Amazon.` | `Review Shopping` |
| `money_transactions_need_review` | `Some spending needs review.` | `Review recent spending in Kwilt Money to use Amazon.` | `Review spending` |

Fallback rules:

- A missing or blank category label produces `Spending is ahead of plan.`, `Review this budget in Kwilt Money to use Amazon.`, and `Review in Money`.
- A missing app name remains Managed Settings' existing `this app` or `this website` fallback.
- A category name longer than 18 characters uses `Review in Money` for the CTA while retaining a sanitized, 40-character category label in the headline and supporting copy.
- Two or more applicable rules retain the existing multi-rule explanation and use `Open Kwilt`, because a category-specific CTA would imply that clearing one rule guarantees access.

## File map

- Modify `plugins/appleEcosystem/screenTimeShieldExtensions.js`: generate the category-aware Swift copy formatter and pass the selected ledger entry into title, subtitle, and CTA formatting.
- Create `scripts/screen-time-shield-copy.test.mjs`: assert the exact rendered Swift contract for every Money reason, fallbacks, and overlapping rules.
- Modify `scripts/screen-time-shield-colors.test.mjs`: keep its styling assertions focused on color/material and update the expected button-label call signature.
- Modify `docs/copy-voice.md`: make the native Money shield grammar part of the durable product voice contract.
- Verify, but do not modify unless a regression is found: `src/capabilities/money/runtime/moneyAppControlRuntime.ts`, `src/capabilities/money/runtime/moneyAppControlRuntime.test.ts`, and `src/services/appleEcosystem/screenTimeProtection.test.ts`.
- Refresh `app-store-screenshots/raw/iphone-17-pro/18-screen-time-amazon-budget-blocked.png` only after the product implementation is rebuilt and verified.

### Task 1: Lock the generated-Swift copy contract with failing tests

**Files:**
- Create: `scripts/screen-time-shield-copy.test.mjs`
- Modify: `scripts/screen-time-shield-colors.test.mjs`

- [ ] **Step 1: Add exact contract tests against rendered Swift**

Create `scripts/screen-time-shield-copy.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildConfigurationSwift } = require('../plugins/appleEcosystem/screenTimeShieldExtensions.js');
const swift = buildConfigurationSwift('group.test.kwilt');

test('Money shields name the category and explain the required review', () => {
  assert.ok(swift.includes('return "\\(category) is ahead of plan."'));
  assert.ok(swift.includes('return "\\(category) is over plan."'));
  assert.ok(swift.includes('return "\\(category) is nearly at its plan."'));
  assert.ok(swift.includes('return "Review \\(category) first."'));
  assert.ok(swift.includes('return "Review your \\(category) budget in Kwilt Money to use \\(appName)."'));
});

test('transaction-review shields describe spending rather than a category condition', () => {
  assert.ok(swift.includes('return "Some spending needs review."'));
  assert.ok(swift.includes('return "Review recent spending in Kwilt Money to use \\(appName)."'));
  assert.ok(swift.includes('return "Review spending"'));
});

test('Money shield fallbacks remain truthful when a readable category is unavailable', () => {
  assert.ok(swift.includes('return "Spending is ahead of plan."'));
  assert.ok(swift.includes('return "Review this budget in Kwilt Money to use \\(appName)."'));
  assert.ok(swift.includes('return "Review in Money"'));
  assert.ok(swift.includes('String(value.prefix(40))'));
  assert.ok(swift.includes('category.count <= 18'));
});

test('single-rule copy uses the matching ledger entry and overlapping rules stay generic', () => {
  assert.ok(swift.includes('let primaryRestriction = restrictions.first'));
  assert.ok(swift.includes('title = KwiltShieldCopy.title(for: reason, entry: primaryRestriction)'));
  assert.ok(swift.includes('subtitle = KwiltShieldCopy.subtitle(for: reason, entry: primaryRestriction, appName: appName)'));
  assert.ok(swift.includes('restrictions.count > 1 ? "Open Kwilt"'));
});
```

- [ ] **Step 2: Run the new test and verify it fails for missing category-aware copy**

Run:

```bash
node --test scripts/screen-time-shield-copy.test.mjs
```

Expected: FAIL because the current generator still contains `This category is running hot.` and formats title, subtitle, and CTA from the reason alone.

- [ ] **Step 3: Update the existing style test for the new CTA call site**

In `scripts/screen-time-shield-colors.test.mjs`, replace the primary-button assertion with:

```js
assert.match(
  generator,
  /primaryButtonLabel: ShieldConfiguration\.Label\(text: buttonLabel, color: UIColor\.white\),/,
);
```

Add this assertion to the priority test:

```js
assert.match(generator, /let primaryRestriction = restrictions\.first/);
```

- [ ] **Step 4: Run the focused tests and confirm only the unimplemented formatter fails**

Run:

```bash
node --test scripts/screen-time-shield-copy.test.mjs scripts/screen-time-shield-colors.test.mjs
```

Expected: the copy test fails; the style test may fail only at the intentionally changed CTA call site until Task 2.

- [ ] **Step 5: Commit the red tests**

```bash
git add scripts/screen-time-shield-copy.test.mjs scripts/screen-time-shield-colors.test.mjs
git commit -m "test: define Money shield copy contract"
```

### Task 2: Implement category-aware native Money shield copy

**Files:**
- Modify: `plugins/appleEcosystem/screenTimeShieldExtensions.js`
- Test: `scripts/screen-time-shield-copy.test.mjs`
- Test: `scripts/screen-time-shield-colors.test.mjs`

- [ ] **Step 1: Add category normalization and the exact Money reason matrix**

Inside the generated `KwiltShieldCopy` enum, add:

```swift
static func moneyCategory(for entry: KwiltRestrictionLedgerEntry?) -> String? {
  guard let value = entry?.label?.trimmingCharacters(in: .whitespacesAndNewlines),
        !value.isEmpty else { return nil }
  return String(value.prefix(40))
}

static func moneyTitle(for reason: String, entry: KwiltRestrictionLedgerEntry?) -> String {
  let category = moneyCategory(for: entry)
  switch reason {
  case "money_ahead_of_pace":
    guard let category else { return "Spending is ahead of plan." }
    return "\(category) is ahead of plan."
  case "money_over_limit":
    guard let category else { return "This budget is over plan." }
    return "\(category) is over plan."
  case "money_usage_threshold":
    guard let category else { return "This budget is nearly at its plan." }
    return "\(category) is nearly at its plan."
  case "money_transactions_need_review":
    return "Some spending needs review."
  default:
    guard let category else { return "Review this budget first." }
    return "Review \(category) first."
  }
}

static func moneySubtitle(
  for reason: String,
  entry: KwiltRestrictionLedgerEntry?,
  appName: String
) -> String {
  if reason == "money_transactions_need_review" {
    return "Review recent spending in Kwilt Money to use \(appName)."
  }
  guard let category = moneyCategory(for: entry) else {
    return "Review this budget in Kwilt Money to use \(appName)."
  }
  return "Review your \(category) budget in Kwilt Money to use \(appName)."
}

static func moneyButtonLabel(
  for reason: String,
  entry: KwiltRestrictionLedgerEntry?
) -> String {
  if reason == "money_transactions_need_review" { return "Review spending" }
  guard let category = moneyCategory(for: entry), category.count <= 18 else {
    return "Review in Money"
  }
  return "Review \(category)"
}
```

Because this code lives inside a JavaScript template literal, escape each Swift interpolation as `\\(` in `screenTimeShieldExtensions.js` so the rendered file contains `\(`.

- [ ] **Step 2: Route single-rule title, subtitle, and CTA through the matching restriction entry**

Change the general formatter signatures to accept `entry`:

```swift
static func title(for reason: String, entry: KwiltRestrictionLedgerEntry?) -> String {
  if reason.hasPrefix("money_") { return moneyTitle(for: reason, entry: entry) }
  switch reason {
  case "focus_session_active", "focus": return "Stay with your focus."
  case "meaningful_first_locked": return "Do one thing first."
  case "meaningful_first_bypass": return "Your Kwilt pause is active."
  case "family_prerequisite":
    let label = UserDefaults(suiteName: appGroupIdentifier)?.string(forKey: prerequisiteLabelKey)
    return "Use \(label ?? "the required app") first."
  case "personal_usage_limit_reached": return "That’s today’s limit."
  default: return "Do one thing first."
  }
}

static func subtitle(
  for reason: String,
  entry: KwiltRestrictionLedgerEntry?,
  appName: String
) -> String {
  if reason.hasPrefix("money_") {
    return moneySubtitle(for: reason, entry: entry, appName: appName)
  }
  switch reason {
  case "focus_session_active", "focus":
    return "End Focus in Kwilt to open \(appName)."
  case "meaningful_first_locked":
    return "Complete a to-do, record progress, or finish Focus in Kwilt to open \(appName) today."
  case "meaningful_first_bypass":
    return "Wait for this short pause to end, or open Kwilt to change it."
  case "family_prerequisite":
    let defaults = UserDefaults(suiteName: appGroupIdentifier)
    let prerequisite = defaults?.string(forKey: prerequisiteLabelKey) ?? "the required app"
    let target = defaults?.string(forKey: targetLabelKey) ?? appName
    let minutes = max(1, defaults?.integer(forKey: thresholdMinutesKey) ?? 1)
    return "Use \(prerequisite) for \(minutes) minute\(minutes == 1 ? "" : "s") to open \(target)."
  case "personal_usage_limit_reached":
    return "You can use \(appName) again tomorrow, or change this rule in Kwilt."
  default:
    return "Complete a to-do, record progress, or finish Focus in Kwilt to open \(appName) today."
  }
}

static func buttonLabel(for reason: String, entry: KwiltRestrictionLedgerEntry?) -> String {
  if reason.hasPrefix("money_") { return moneyButtonLabel(for: reason, entry: entry) }
  if reason == "focus_session_active" || reason == "focus" { return "Open Focus" }
  if reason == "family_prerequisite" { return "Open Screen Time" }
  if reason == "meaningful_first_locked" { return "Open Today" }
  if reason == "personal_usage_limit_reached" { return "Open Screen Time" }
  return "Open Kwilt"
}
```

In `KwiltShieldConfigurationExtension.configuration(...)`, use:

```swift
let primaryRestriction = restrictions.first
let reason = primaryRestriction?.reason ?? KwiltShieldCopy.reason()
let title: String
let subtitle: String
let buttonLabel: String
if restrictions.count > 1, let first = primaryRestriction, restrictions.indices.contains(1) {
  title = "\(KwiltShieldCopy.countWord(restrictions.count)) rules are pausing \(appName)."
  let remaining = restrictions.count - 2
  let suffix = remaining > 0 ? " \(remaining) more rules also apply." : ""
  subtitle = "\(KwiltShieldCopy.sentenceStart(KwiltShieldCopy.nextAction(for: first))). Also \(KwiltShieldCopy.nextAction(for: restrictions[1])).\(suffix)"
  buttonLabel = "Open Kwilt"
} else {
  title = KwiltShieldCopy.title(for: reason, entry: primaryRestriction)
  subtitle = KwiltShieldCopy.subtitle(for: reason, entry: primaryRestriction, appName: appName)
  buttonLabel = KwiltShieldCopy.buttonLabel(for: reason, entry: primaryRestriction)
}
```

Pass `buttonLabel` into the existing Sumi primary-button configuration.

- [ ] **Step 3: Run the generated-Swift copy and style tests**

Run:

```bash
node --test scripts/screen-time-shield-copy.test.mjs scripts/screen-time-shield-colors.test.mjs
```

Expected: PASS for every test.

- [ ] **Step 4: Confirm Money still supplies the real category label through the existing bridge**

Run:

```bash
npx jest src/capabilities/money/runtime/moneyAppControlRuntime.test.ts src/services/appleEcosystem/screenTimeProtection.test.ts --runInBand
```

Expected: PASS, including `restrictionLabel: 'Shopping'` in both the Money runtime and native bridge payload assertions.

- [ ] **Step 5: Commit the native formatter**

```bash
git add plugins/appleEcosystem/screenTimeShieldExtensions.js scripts/screen-time-shield-copy.test.mjs scripts/screen-time-shield-colors.test.mjs
git commit -m "fix: make Money shield copy explicit"
```

### Task 3: Make the pattern durable in product documentation

**Files:**
- Modify: `docs/copy-voice.md`

- [ ] **Step 1: Add the Money Screen Time shield rule**

Append this section before `## Crossover Rule`:

```markdown
## Money Screen Time Shields

A Money-owned shield must answer four questions without requiring the person to
interpret an internal status label:

1. Which budget category caused the pause?
2. What is true about that category?
3. Which app is waiting?
4. What exact review action comes next?

Use this pattern:

`Shopping is ahead of plan.`
`Review your Shopping budget in Kwilt Money to use Amazon.`
`Review Shopping`

`Running hot` may remain a compact state label inside Money, but it is not a
sufficient explanation on a blocking screen. Never use `This category` when the
native restriction ledger contains the real category name. If the name is not
available, use a truthful generic fallback instead of guessing.
```

- [ ] **Step 2: Check the documentation diff for stale contradictory guidance**

Run:

```bash
rg -n "This category is running hot|Open Kwilt Money to review before using|Money Screen Time Shields" docs plugins/appleEcosystem/screenTimeShieldExtensions.js
git diff --check
```

Expected: no product contract retains `This category is running hot.`; `git diff --check` exits 0.

- [ ] **Step 3: Commit the copy contract documentation**

```bash
git add docs/copy-voice.md
git commit -m "docs: codify Money shield copy pattern"
```

### Task 4: Prove the native product state and refresh the campaign asset

**Files:**
- Regenerate ignored native output from `plugins/appleEcosystem/screenTimeShieldExtensions.js`
- Replace ignored capture asset: `app-store-screenshots/raw/iphone-17-pro/18-screen-time-amazon-budget-blocked.png`

- [ ] **Step 1: Record runtime provenance, regenerate the iOS extension, and build from the current checkout**

Run:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
xcrun simctl list devices available
npx expo prebuild --platform ios --no-install
npx expo run:ios --device D437E709-EF87-49B1-A6C1-7AE350C0BF8A
```

Expected: Expo regenerates `ios/KwiltShieldConfiguration/KwiltShieldConfiguration.swift`, Xcode builds the `Kwilt` app and shield extensions, and the existing iPhone 17 Pro simulator launches the new native binary. If that simulator UDID is no longer available, stop and select one available iPhone 17 Pro destination explicitly; record the replacement UDID with the build evidence. A JavaScript reload is insufficient because the shield configuration lives in a native extension.

- [ ] **Step 2: Verify the exact ahead-of-plan shield in Simulator**

Configure the synthetic Shopping category with the `when_hot` preset and target the simulator Amazon capture fixture. Verify the rendered shield reads exactly:

```text
Shopping is ahead of plan.
Review your Shopping budget in Kwilt Money to use Amazon.
Review Shopping
```

Also verify parchment background, Sumi text and CTA, normal Dynamic Island, readable wrapping, and no category/app placeholder.

- [ ] **Step 3: Verify fallbacks and overlap behavior**

Exercise one long category label and one overlapping two-rule case. Confirm the long-label CTA is `Review in Money`; confirm the overlap CTA is `Open Kwilt` and the shield does not promise that one review will open the app.

- [ ] **Step 4: Verify on an entitlement-enabled physical iPhone**

Use real Amazon or another installed target on a signed physical build. Confirm Apple-effective blocking, exact copy, the `Review Shopping` handoff into Kwilt, and that the current Kwilt page is preserved while the contextual guide appears. Keep this evidence separate from Simulator visual proof.

- [ ] **Step 5: Run the task-completion gate once**

Run:

```bash
npm run verify:changed -- --run
```

Expected: PASS. If unrelated dirty work causes a failure, record the failing files and command output separately; do not attribute that failure to this shield-copy slice or claim the completion gate passed.

- [ ] **Step 6: Recapture and replace the App Store source image**

Capture at 1206×2622 from the iPhone 17 Pro simulator only after the rebuilt native extension displays the accepted copy. Replace `18-screen-time-amazon-budget-blocked.png`, record its SHA-256, and replace the corresponding image layer in Figma Frame 9. Treat Figma placement as campaign handoff evidence, not App Store Connect upload or submission proof.

- [ ] **Step 7: Commit tracked implementation files only**

```bash
git status --short
git diff --check
```

Expected: the implementation and documentation commits are cleanly represented; ignored native build output and screenshot assets are not accidentally staged.

## Acceptance checklist

- [ ] A Money shield never says `This category is running hot.` when it has the real category name.
- [ ] The ahead-of-plan Amazon case renders the accepted three-part copy exactly.
- [ ] Every Money reason has truthful condition-specific copy.
- [ ] Missing labels, long labels, websites, and overlapping rules have explicit fallbacks.
- [ ] Non-Money shield copy and action behavior remain unchanged.
- [ ] The primary action still records the same semantic restriction handoff; this change does not clear or override policy from the shield.
- [ ] Focused Node and Jest tests pass.
- [ ] Simulator visual proof and signed-device enforcement proof are reported separately.
- [ ] The App Store/Figma asset is refreshed only from the rebuilt product state.

# Screen Time Shield Explanation and Handoff Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Do not create a worktree unless Andrew explicitly approves a parallel implementation lane.

**Goal:** Make a blocked app explain the exact active Screen Time conditions, preserve those explanations when the shield opens Kwilt, and present the complete review in a reliably full-height drawer.

**Architecture:** Build the human-readable condition explanations once in TypeScript beside the canonical composite-rule model, send paired matched/unmatched explanations across the existing native activation payload, and let the native evaluator select the explanations that actually caused the current pause. Persist those selected explanations in the target-aware native restriction ledger so the shield and the in-app handoff render the same truth. Keep Apple tokens native-only, retain rule IDs for exact routing, and make the handoff guide a fixed full-height review surface rather than a dynamically sized compact guide.

**Tech Stack:** React Native/TypeScript, Zustand, Expo config plugins, generated Swift, Apple FamilyControls/DeviceActivity/ManagedSettingsUI, Jest, Node test runner, Xcode/iOS Simulator, entitlement-enabled physical iPhone.

---

## Execution preflight

At plan creation, the shared checkout already had concurrent, uncommitted changes in the Screen Time inventory, its test, the governance brief, and shared Settings accessibility copy. Before Task 1, inspect the current branch, HEAD, status, and those diffs again. Preserve the current sentence-as-inventory-title direction and layer this repair onto it; do not restore the older target-as-title arrangement shown in main. Stage exact task paths and never overwrite concurrent edits.

## Product contract

The repair covers one continuous path:

1. Apple asks the Kwilt shield extension to render a blocked app or website.
2. The extension finds every matching restriction ledger entry.
3. Each composite entry contains the currently blocking condition explanations selected by the native evaluator.
4. The shield names the blocked app and shows the first one or two concrete explanations without implying an order between overlapping rules.
5. Open Screen Time records those same entries and opens Kwilt.
6. Kwilt restores the handoff, resolves rule IDs when possible, and opens a full-height review drawer containing every available explanation.
7. Do this first routes to the exact rule or Money category. Open for 20 min remains available only when every applicable rule can be overridden.

Single-rule example:

~~~text
Zillow is paused.
It’s after 8:00 PM. Try again before 8:00 PM or change this rule.

Open Screen Time
~~~

Budget-backed example:

~~~text
Amazon is paused.
Shopping is over its monthly plan. Review it in Kwilt Money.

Open Screen Time
~~~

Overlapping-rule example:

~~~text
Two rules are pausing Instagram.
Focus is active. End Focus to continue. Also, daily use reached 15 minutes.

Open Screen Time
~~~

Fallbacks remain truthful:

- An older ledger entry without condition explanations uses the existing reason-specific copy.
- An unresolved rule still appears as Another Screen Time rule and never enables an unsafe temporary bypass.
- More than two explanations are summarized with N more conditions also apply; the complete list remains visible in Kwilt.
- Copy describes state and next action without shame or an unsupported promise that one action clears every restriction.

## File map

- Create src/features/screen-time/domain/personalCompositeRuleExplanation.ts for canonical matched/unmatched condition copy and blocker selection.
- Create src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts for the condition and truth-table contract.
- Modify src/features/screen-time/domain/screenTimeRuleInventory.ts to reuse canonical condition formatting.
- Modify src/services/appleEcosystem/screenTimeProtection.ts and its test for outbound explanation metadata and inbound selected details.
- Modify plugins/appleEcosystem/screenTimePrerequisiteBridge.js for backward-compatible native payload/configuration fields and host-evaluator ledger writes.
- Modify plugins/appleEcosystem/screenTimeShieldExtensions.js for monitor selection, ledger persistence, native shield copy, and shield-action handoff.
- Create scripts/screen-time-shield-explanation.test.mjs and update the composite generator and color contract tests.
- Modify src/features/screen-time/domain/screenTimeRule.ts and screenTimeHandoffProjection.ts so the in-app guide receives native-selected details.
- Modify src/features/screen-time/components/ScreenTimeUnlockGuide.tsx so it renders all details in a fixed full-height drawer.
- Update the two Screen Time feature briefs with the durable explanation contract and proof boundaries.

### Task 1: Define canonical composite-condition explanations

**Files:**
- Create: src/features/screen-time/domain/personalCompositeRuleExplanation.ts
- Create: src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts
- Modify: src/features/screen-time/domain/screenTimeRuleInventory.ts
- Test: src/features/screen-time/domain/screenTimeRuleInventory.test.ts

- [ ] **Step 1: Write the failing copy and truth-table tests**

Create personalCompositeRuleExplanation.test.ts with this representative rule:

~~~ts
const rule = {
  id: 'zillow-evening',
  selectionId: 'zillow-evening',
  selectedApps: [{ token: 'zillow', label: 'Zillow' }],
  selectedCategories: [],
  enabled: true,
  setupCompleted: true,
  connector: 'all' as const,
  outcome: 'available' as const,
  conditions: [
    { id: 'after-eight', type: 'time_of_day' as const, operator: 'after' as const, minuteOfDay: 1200 },
    { id: 'under-fifteen', type: 'daily_usage' as const, operator: 'below' as const, minutes: 15 },
  ],
  lastUpdated: null,
};

expect(buildPersonalCompositeConditionExplanations(rule)).toEqual([
  {
    conditionId: 'after-eight',
    whenMatched: 'It’s after 8:00 PM.',
    whenUnmatched: 'It’s before 8:00 PM. Try again after 8:00 PM.',
  },
  {
    conditionId: 'under-fifteen',
    whenMatched: 'Daily use is under 15 minutes.',
    whenUnmatched: 'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
  },
]);

expect(selectPersonalCompositeBlockingDetails({
  rule,
  truth: { 'after-eight': true, 'under-fifteen': false },
})).toEqual([
  'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
]);

expect(selectPersonalCompositeBlockingDetails({
  rule: { ...rule, connector: 'any', outcome: 'pause' },
  truth: { 'after-eight': true, 'under-fifteen': false },
})).toEqual(['It’s after 8:00 PM.']);
~~~

Add cases for both Focus operators, both real-step operators, both usage operators, both time operators, and all five budget presets. Assert that unknown truth never invents an explanation and that available/disabled rules return an empty list.

- [ ] **Step 2: Run the test and verify the module is missing**

~~~bash
npm test -- --runInBand src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts
~~~

Expected: FAIL because personalCompositeRuleExplanation.ts does not exist.

- [ ] **Step 3: Implement the explanation API**

Create the module with this public contract:

~~~ts
export type PersonalCompositeConditionExplanation = {
  conditionId: string;
  whenMatched: string;
  whenUnmatched: string;
};

export function buildPersonalCompositeConditionExplanations(
  rule: PersonalCompositeScreenTimeRule,
): PersonalCompositeConditionExplanation[];

export function selectPersonalCompositeBlockingDetails(params: {
  rule: PersonalCompositeScreenTimeRule;
  truth: PersonalRuleConditionTruth;
}): string[] {
  if (evaluatePersonalCompositeRule(params.rule, params.truth).status !== 'paused') return [];
  const copy = new Map(
    buildPersonalCompositeConditionExplanations(params.rule)
      .map((entry) => [entry.conditionId, entry]),
  );
  return params.rule.conditions.flatMap((condition) => {
    const value = params.truth[condition.id] ?? 'unknown';
    if (value === 'unknown') return [];
    const entry = copy.get(condition.id);
    if (!entry) return [];
    const causesPause = params.rule.outcome === 'pause' ? value : !value;
    return causesPause ? [value ? entry.whenMatched : entry.whenUnmatched] : [];
  });
}
~~~

Use the existing 12-hour clock convention. Use these matched budget strings:

~~~ts
const budgetMatchedCopy = {
  always_review: 'Review ' + categoryName + ' in Kwilt Money to continue.',
  when_hot: categoryName + ' is running ahead of the month. Review it in Kwilt Money.',
  at_95_percent: categoryName + ' reached 95% of its plan. Review it in Kwilt Money.',
  when_over: categoryName + ' is over its monthly plan. Review it in Kwilt Money.',
  needs_review: categoryName + ' has transactions to review. Review them in Kwilt Money.',
};
~~~

Use concise truthful unmatched strings such as Shopping is not over its monthly plan. Never infer unavailable Money amounts.

- [ ] **Step 4: Reuse canonical condition formatting in the inventory**

Move the shared time and budget wording into the new module. Preserve the existing inventory API with a compatibility wrapper:

~~~ts
export function personalCompositeConditionLabel(condition: PersonalRuleCondition): string {
  return personalCompositeConditionRulePhrase(condition);
}
~~~

- [ ] **Step 5: Run the domain tests**

~~~bash
npm test -- --runInBand \
  src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts \
  src/features/screen-time/domain/personalCompositeRuleEvaluation.test.ts \
  src/features/screen-time/domain/screenTimeRuleInventory.test.ts
~~~

Expected: PASS. Inventory tests preserve the current sentence-as-title and target-as-supporting-detail contract while blocker wording is separately proven.

- [ ] **Step 6: Commit the canonical explanation slice**

~~~bash
git add \
  src/features/screen-time/domain/personalCompositeRuleExplanation.ts \
  src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts \
  src/features/screen-time/domain/screenTimeRuleInventory.ts \
  src/features/screen-time/domain/screenTimeRuleInventory.test.ts
git commit -m "feat: explain composite Screen Time conditions"
~~~

### Task 2: Carry explanation metadata across the JavaScript/native boundary

**Files:**
- Modify: src/services/appleEcosystem/screenTimeProtection.ts
- Modify: src/services/appleEcosystem/screenTimeProtection.test.ts
- Modify: plugins/appleEcosystem/screenTimePrerequisiteBridge.js
- Modify: scripts/screen-time-composite-rule-generator.test.mjs

- [ ] **Step 1: Add failing outbound and inbound bridge tests**

Update the composite activation test to expect conditionExplanations:

~~~ts
conditionExplanations: [
  {
    conditionId: 'after-five',
    whenMatched: 'It’s after 5:00 PM.',
    whenUnmatched: 'It’s before 5:00 PM. Try again after 5:00 PM.',
  },
  {
    conditionId: 'under-limit',
    whenMatched: 'Daily use is under 15 minutes.',
    whenUnmatched: 'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
  },
],
~~~

Update the handoff decoding test to retain:

~~~ts
details: [
  'It’s after 8:00 PM.',
  'Shopping is over its monthly plan. Review it in Kwilt Money.',
],
~~~

Add compatibility assertions that absent or malformed details normalize to an empty array without dropping the restriction.

- [ ] **Step 2: Run the bridge test and verify it fails**

~~~bash
npm test -- --runInBand src/services/appleEcosystem/screenTimeProtection.test.ts
~~~

Expected: FAIL because outbound activation has no conditionExplanations and inbound restrictions have no details.

- [ ] **Step 3: Extend the TypeScript bridge contract**

Add details: string[] to ScreenTimeShieldRestriction. Send bounded explanation metadata from applyPersonalCompositeScreenTimeRule:

~~~ts
conditionExplanations: buildPersonalCompositeConditionExplanations(rule).map((entry) => ({
  conditionId: entry.conditionId,
  whenMatched: entry.whenMatched.slice(0, 160),
  whenUnmatched: entry.whenUnmatched.slice(0, 160),
})),
~~~

Normalize native handoff details to at most eight non-empty strings of at most 160 characters.

- [ ] **Step 4: Extend generated host Swift compatibly**

Add these generated types and fields:

~~~swift
private struct KwiltPersonalCompositeConditionExplanation: Codable {
  let conditionId: String
  let whenMatched: String
  let whenUnmatched: String
}
~~~

Add optional conditionExplanations to the payload and stored configuration. Add optional details to KwiltRestrictionLedgerEntry and a defaulted details argument to upsert. Optional fields are required so upgraded code can decode existing V2 configurations and ledger entries.

Validate that explanation IDs exactly match condition IDs and that matched/unmatched copy is non-empty after trimming. Apply the same eight-item and 160-character bounds.

- [ ] **Step 5: Add generated-source assertions**

~~~js
assert.match(rendered, /KwiltPersonalCompositeConditionExplanation/);
assert.match(rendered, /conditionExplanations/);
assert.match(rendered, /let details: \[String\]\?/);
~~~

- [ ] **Step 6: Run bridge and generator tests**

~~~bash
npm test -- --runInBand src/services/appleEcosystem/screenTimeProtection.test.ts
node --test scripts/screen-time-composite-rule-generator.test.mjs
~~~

Expected: PASS. Task 2 proves the compatible transport shape; Task 3 adds the still-missing native selection and rendering behavior under its own failing test.

- [ ] **Step 7: Commit the transport slice**

~~~bash
git add \
  src/services/appleEcosystem/screenTimeProtection.ts \
  src/services/appleEcosystem/screenTimeProtection.test.ts \
  plugins/appleEcosystem/screenTimePrerequisiteBridge.js \
  scripts/screen-time-composite-rule-generator.test.mjs
git commit -m "feat: carry Screen Time blocker explanations"
~~~

### Task 3: Select actual blockers and render them in the native shield

**Files:**
- Modify: plugins/appleEcosystem/screenTimePrerequisiteBridge.js
- Modify: plugins/appleEcosystem/screenTimeShieldExtensions.js
- Create: scripts/screen-time-shield-explanation.test.mjs
- Modify: scripts/screen-time-composite-rule-generator.test.mjs
- Modify: scripts/screen-time-shield-colors.test.mjs

- [ ] **Step 1: Write the failing generated-Swift shield contract**

Create screen-time-shield-explanation.test.mjs using buildConfigurationSwift and buildDeviceActivityMonitorSwift:

~~~js
assert.match(configurationSwift, /entry\.details\?\.first/);
assert.match(configurationSwift, /return "\\\(appName\) is paused\."/);
assert.match(configurationSwift, /more conditions also apply/);
assert.match(configurationSwift, /restrictions\.flatMap/);
assert.match(monitorSwift, /let blockingDetails = evaluations\.compactMap/);
assert.match(monitorSwift, /configuration\.outcome == "pause" \? value : !value/);
assert.match(monitorSwift, /details: blockingDetails/);
~~~

Also assert that daily-limit, Money, family prerequisite, Focus, and legacy fallbacks remain present.

- [ ] **Step 2: Run the native contract tests and verify they fail**

~~~bash
node --test \
  scripts/screen-time-shield-explanation.test.mjs \
  scripts/screen-time-composite-rule-generator.test.mjs \
  scripts/screen-time-shield-colors.test.mjs
~~~

Expected: FAIL because the ledger does not store selected details and the shield still renders generic composite copy.

- [ ] **Step 3: Implement native blocker selection in both evaluators**

Keep each condition beside its evaluated expression truth:

~~~swift
let evaluations = configuration.conditions.map { condition -> (KwiltPersonalCompositeCondition, Bool) in
  let stored = shared.bool(forKey: personalCompositeTruthKey(
    ruleId: configuration.ruleId,
    conditionId: condition.id
  ))
  let value: Bool
  if condition.type == "daily_usage" {
    value = condition.operator == "below" ? !stored : stored
  } else {
    value = condition.operator == "is_not" ? !stored : stored
  }
  return (condition, value)
}
let values = evaluations.map { $0.1 }
~~~

After the existing connector/outcome logic decides shouldPause, select the supporting explanations:

~~~swift
let explanationById = Dictionary(uniqueKeysWithValues:
  (configuration.conditionExplanations ?? []).map { ($0.conditionId, $0) }
)
let blockingDetails = evaluations.compactMap { condition, value -> String? in
  let causesPause = configuration.outcome == "pause" ? value : !value
  guard causesPause, let explanation = explanationById[condition.id] else { return nil }
  return value ? explanation.whenMatched : explanation.whenUnmatched
}
~~~

Pass details: blockingDetails to the ledger. The connector decides whether the aggregate pauses; the detail filter explains the conditions supporting that pause.

- [ ] **Step 4: Render selected details while preserving old reasons**

In the generated shield copy:

~~~swift
static func nextAction(for entry: KwiltRestrictionLedgerEntry) -> String {
  if let detail = entry.details?.first, !detail.isEmpty { return detail }
  // Retain the existing reason-specific fallback switch below this guard.
}
~~~

For one composite restriction with details, use appName + is paused as the title and a detailSummary helper as the subtitle. detailSummary must flatten entries in restriction priority order, display at most two sentences, and append N more conditions also apply for the remainder. For multiple restrictions, retain the current rule-count title and use the same unordered detail summary. When details are absent, retain the current generic fallback.

- [ ] **Step 5: Keep visual contract tests scoped**

Update only color-test assertions affected by copy call signatures. Continue asserting parchment, Sumi, white CTA text, no blur, current artwork, and current destination-aware button labels.

- [ ] **Step 6: Run all generated-native tests**

~~~bash
node --test \
  scripts/screen-time-shield-explanation.test.mjs \
  scripts/screen-time-composite-rule-generator.test.mjs \
  scripts/screen-time-shield-colors.test.mjs
~~~

Expected: PASS.

- [ ] **Step 7: Commit the native explanation slice**

~~~bash
git add \
  plugins/appleEcosystem/screenTimePrerequisiteBridge.js \
  plugins/appleEcosystem/screenTimeShieldExtensions.js \
  scripts/screen-time-shield-explanation.test.mjs \
  scripts/screen-time-composite-rule-generator.test.mjs \
  scripts/screen-time-shield-colors.test.mjs
git commit -m "fix: explain active Screen Time blockers"
~~~

### Task 4: Preserve explanations in Kwilt and fully open the review drawer

**Files:**
- Modify: src/features/screen-time/domain/screenTimeRule.ts
- Modify: src/features/screen-time/domain/screenTimeHandoffProjection.ts
- Modify: src/features/screen-time/domain/screenTimeHandoffProjection.test.ts
- Modify: src/features/screen-time/components/ScreenTimeUnlockGuide.tsx
- Modify: src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx

- [ ] **Step 1: Write failing projection and drawer tests**

Add a projection assertion:

~~~ts
expect(result.rules[0]).toMatchObject({
  id: 'zillow-evening',
  blockingDetails: [
    'It’s after 8:00 PM.',
    'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
  ],
});
~~~

Update the component test:

~~~ts
expect(mockBottomDrawerProps.at(-1)).toMatchObject({
  visible: true,
  snapPoints: ['100%'],
  enableContentPanningGesture: true,
});
expect(mockBottomDrawerProps.at(-1)).not.toHaveProperty('dynamicSizing');
expect(screen.getByText('It’s after 8:00 PM.')).toBeTruthy();
expect(screen.getByText(
  'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
)).toBeTruthy();
~~~

Keep the unresolved-rule case and assert it never offers Open for 20 min.

- [ ] **Step 2: Run the tests and verify both regressions**

~~~bash
npm test -- --runInBand \
  src/features/screen-time/domain/screenTimeHandoffProjection.test.ts \
  src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx
~~~

Expected: FAIL because projection drops native details and the guide still uses 55% plus dynamicSizing.

- [ ] **Step 3: Add backward-compatible details to the projected rule**

Extend ScreenTimeRule:

~~~ts
blockingDetails?: string[];
~~~

Normalize bounded non-empty strings in normalizeScreenTimeRule. Attach the matching native restriction details in projectRulesForScreenTimeHandoff:

~~~ts
resolved.push({
  ...rule,
  active: true,
  blockingDetails: restriction.details,
});
~~~

Do not reconstruct enforcement truth from JavaScript during handoff. The native ledger is authoritative for why Apple is shielding at that moment.

- [ ] **Step 4: Render every handed-off detail**

Replace triggerDetail with:

~~~ts
const triggerDetails = (rule: ScreenTimeRule): string[] => {
  if (rule.blockingDetails?.length) return rule.blockingDetails;
  if (rule.trigger.type === 'focus_active') return ['Finish or end the current Focus.'];
  if (rule.trigger.type === 'real_step_pending') {
    return ['Complete a to-do, record progress, or finish Focus.'];
  }
  if (rule.trigger.type === 'daily_usage_limit') {
    return ['Wait until tomorrow or change the daily limit.'];
  }
  if (rule.trigger.type === 'composite') return ['Review this rule in Screen Time.'];
  return ['Complete the family agreement.'];
};
~~~

Render every returned string under its owning rule title.

- [ ] **Step 5: Replace compact dynamic sizing with a full-height review drawer**

~~~tsx
<BottomDrawer
  visible={props.visible}
  onClose={props.onDismiss}
  snapPoints={['100%']}
  enableContentPanningGesture
  scrimToken="pineSubtle"
>
~~~

Keep BottomDrawerScrollView, the standard close header, safe-area behavior, and drag dismissal. Do not add a nested drawer or navigate away before an explicit action.

- [ ] **Step 6: Run guide and foreground-handoff tests**

~~~bash
npm test -- --runInBand \
  src/features/screen-time/domain/screenTimeHandoffProjection.test.ts \
  src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx \
  src/features/screen-time/runtime/screenTimeHandoffStore.test.ts \
  src/features/screen-time/runtime/screenTimeHandoffForegroundSync.test.ts
~~~

Expected: PASS. These tests prove handoff capture, explanation projection, safe fallback, and full-height configuration; they do not claim native animation or enforcement proof.

- [ ] **Step 7: Commit the in-app repair**

~~~bash
git add \
  src/features/screen-time/domain/screenTimeRule.ts \
  src/features/screen-time/domain/screenTimeHandoffProjection.ts \
  src/features/screen-time/domain/screenTimeHandoffProjection.test.ts \
  src/features/screen-time/components/ScreenTimeUnlockGuide.tsx \
  src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx
git commit -m "fix: fully present Screen Time handoffs"
~~~

### Task 5: Update the durable product contract

**Files:**
- Modify: docs/feature-briefs/screen-time-rule-system-consolidation.md
- Modify: docs/feature-briefs/screen-time-rule-governance.md

- [ ] **Step 1: Close the native-metadata open question**

Add:

~~~markdown
The host app sends bounded matched/unmatched copy for every normalized condition.
The native evaluator selects only the conditions that caused the current pause
and stores those explanations with the restriction ledger entry. The native
shield and Kwilt handoff consume that same entry; neither reconstructs current
Apple enforcement truth from stale JavaScript state.
~~~

- [ ] **Step 2: Add acceptance criteria**

~~~markdown
- A blocked app names at least one concrete active condition whenever the native
  configuration contains explanation metadata.
- Overlapping rules remain unordered and never imply that satisfying one rule
  clears another.
- The shield handoff preserves rule IDs, selected explanations, and exact routing.
- The in-app review opens as a full-height scroll-safe drawer and lists every
  available blocker before offering a temporary opening.
- Older native entries retain truthful reason-specific fallback copy.
~~~

- [ ] **Step 3: Run product lint**

~~~bash
npm run product:lint
~~~

Expected: PASS.

- [ ] **Step 4: Commit the contract update**

~~~bash
git add \
  docs/feature-briefs/screen-time-rule-system-consolidation.md \
  docs/feature-briefs/screen-time-rule-governance.md
git commit -m "docs: define Screen Time blocker explanations"
~~~

### Task 6: Verify source, native generation, drawer presentation, and physical enforcement

- [ ] **Step 1: Run the complete focused regression set**

~~~bash
npm test -- --runInBand \
  src/features/screen-time/domain/personalCompositeRuleExplanation.test.ts \
  src/features/screen-time/domain/personalCompositeRuleEvaluation.test.ts \
  src/features/screen-time/domain/screenTimeRuleInventory.test.ts \
  src/features/screen-time/domain/screenTimeHandoffProjection.test.ts \
  src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx \
  src/features/screen-time/runtime/screenTimeHandoffStore.test.ts \
  src/features/screen-time/runtime/screenTimeHandoffForegroundSync.test.ts \
  src/services/appleEcosystem/screenTimeProtection.test.ts \
  src/services/appleEcosystem/screenTimePrerequisiteNative.test.ts
node --test \
  scripts/screen-time-shield-explanation.test.mjs \
  scripts/screen-time-composite-rule-generator.test.mjs \
  scripts/screen-time-shield-colors.test.mjs
~~~

Expected: PASS.

- [ ] **Step 2: Run the task-completion gate once**

~~~bash
npm run verify:changed -- --run
~~~

Expected: every gate selected from this diff passes. Repeat only if the first run fails, is incomplete, the diff changes afterward, or the integration base changes; record the repeat reason.

- [ ] **Step 3: Regenerate and compile all affected Swift targets**

~~~bash
npx expo prebuild --platform ios --no-install && \
npx pod-install && \
xcodebuild -workspace ios/Kwilt.xcworkspace \
  -scheme Kwilt \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
~~~

Expected: the host bridge, Device Activity monitor, shield configuration, and shield action targets compile. Inspect generated Swift for conditionExplanations, blockingDetails, and ledger details. Do not hand-edit ignored ios output.

- [ ] **Step 4: Verify the full-height drawer in the owned Simulator runtime**

Record checkout, branch, commit, dirty state, Metro port, installed bundle ID, and Simulator UDID. Exercise fresh handoffs for one rule, multiple conditions, overlapping rules, and one unresolved legacy restriction.

Expected observations:

- The drawer enters completely instead of remaining a compact strip.
- The 100% surface keeps content reachable and respects the safe area.
- Every resolved rule lists all handed-off explanations.
- An unresolved restriction remains visible and disables temporary opening.
- Close, drag/backdrop dismissal, Do this first, and Open for 20 min respond once.
- Do this first routes a budget condition to its Money category and ordinary composite rules to Screen Time without opening a conflicting second drawer.

- [ ] **Step 5: Verify the real shield-to-Kwilt loop on an entitlement-enabled physical iPhone**

Use a signed build with recorded branch, commit, and build provenance. Exercise:

1. Zillow paused after 8:00 PM.
2. Instagram paused after reaching a 15-minute daily limit.
3. Amazon paused because Shopping is over its monthly plan.
4. An ALL availability rule where one unmet condition causes the pause.
5. Two overlapping rules targeting one app.

For every case, record the shield copy, whether it matches the actual enforcing state, the return into Kwilt, the full drawer opening, the complete explanation list, exact destination routing, remaining overlap after one condition clears, relaunch behavior, and offline behavior.

Expected: all five cases explain the current block truthfully, the drawer opens fully, and restrictions remain until every applicable rule clears. Source, Jest, Simulator, and native compilation are not substitutes for this signed-device proof.

- [ ] **Step 6: Inspect final scope and evidence**

~~~bash
git status --short --branch
git diff --check
git log -6 --oneline --decorate
~~~

Expected: only intended Screen Time source, tests, and documentation are present. Report source/Jest, generated-native compilation, Simulator presentation, physical enforcement, TestFlight, and production as separate evidence levels.

## Non-goals

- Do not redesign the rule composer or add rule names.
- Do not expose Apple application/category tokens to JavaScript.
- Do not let the shield extension query Supabase or Money.
- Do not infer exact spending amounts or remaining budget.
- Do not imply a sequential order between overlapping rules.
- Do not submit a TestFlight or App Store build without separate authorization.

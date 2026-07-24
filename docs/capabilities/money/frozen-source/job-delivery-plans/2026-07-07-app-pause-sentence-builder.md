# App Pause Sentence Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the App pauses management screen with a reductive inline builder: `Pause [Choose apps] when:` followed by toggleable conditions.

**Architecture:** Keep the route at `app/app-control/[budgetId].tsx`, but change its object model from summary-plus-rule-list to one editable rule surface. Reuse existing Screen Time settings persistence and native FamilyControls picker instead of adding a new target-selection model.

**Tech Stack:** Expo Router, React Native, existing `useBudgetScreenTimeSettings`, `presentScreenTimeActivityPicker`, `reconcileBudgetScreenTimeRestrictions`, and app-control policy overrides.

---

## Source Context

- Product brief: `docs/feature-briefs/app-pause-sentence-builder.md`
- Design convergence: `docs/design-explorations/app-pause-sentence-builder/03-converge.md`
- Main route: `app/app-control/[budgetId].tsx`
- Entry point: `app/budgets/[budgetId].tsx`
- Native picker source: `src/services/appleEcosystem/screenTimeProtection.ts`
- Settings store: `src/services/budgetScreenTimeStorage.ts`
- Policy override helpers: `src/services/budgetScreenTime.ts`

## Non-Goals

- Do not build multi-rule management.
- Do not change app-control delivery scores.
- Do not redesign the global `Screen Time Controls` settings page.
- Do not change native Screen Time shielding behavior.
- Do not add spend-progress stats to the App pause setup surface.

## Task 1: Align Entry Label And Header

**Files:**
- Modify: `app/budgets/[budgetId].tsx`
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Change the Budget Detail menu row label from `App pauses` to `App pause`.

Expected edit in `app/budgets/[budgetId].tsx`:

```tsx
<MenuRow iconName="settings" label="App pause" onPress={openAppControls} />
```

- [ ] Change the app-control route title and shell title to `App pause`.

Expected edit in `app/app-control/[budgetId].tsx`:

```tsx
<Stack.Screen options={{ title: 'App pause' }} />
<KwiltPage
  shellTitle="App pause"
  showBack
  showAvatar={false}
  showIntro={false}
  contentStyle={styles.pageContent}
>
```

- [ ] Remove route-level eyebrow/title props that create duplicate headers such as `APP PAUSES`, `Shopping app pauses`, or a standalone `Shopping` heading.

- [ ] Run lint after this small rename.

Run:

```bash
npm run lint
```

Expected: command exits 0.

## Task 2: Replace Summary/Rules Layout With Inline Builder

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Remove the primary rendered summary panel, condition chip row, `Edit` button, `Rules` section header, policy cards, and bottom `Choose apps to pause` / `Change apps to pause` CTA from the first viewport.

Remove or stop rendering these structures:

```tsx
styles.pauseSummaryPanel
styles.pauseSummaryHeader
styles.pauseSummaryTitle
styles.pauseSummaryMeta
styles.pauseConditionRow
styles.pauseSummaryActions
styles.sectionHeader
PolicyDetailRow
<Button label={setupActionLabel} ... />
<RuleBuilderDrawer ... />
```

- [ ] Add an inline builder block as the route's primary content.

Expected shape:

```tsx
<View style={styles.ruleBuilder}>
  <View style={styles.ruleSentence}>
    <Text selectable style={styles.ruleSentenceText}>Pause </Text>
    <Pressable accessibilityRole="button" onPress={handleChooseApps} style={styles.ruleToken}>
      <Text selectable={false} style={styles.ruleTokenText}>{appTokenLabel}</Text>
    </Pressable>
    <Text selectable style={styles.ruleSentenceText}> when:</Text>
  </View>
  <ConditionToggleList
    budgetName={detail.budget.name}
    conditions={primaryConditions}
    thresholdPercent={primaryThresholdPercent}
    expandedCondition={expandedCondition}
    onToggleCondition={handleToggleCondition}
    onToggleExpanded={setExpandedCondition}
    onChangeThresholdPercent={handleChangeThresholdPercent}
  />
</View>
```

- [ ] Make `appTokenLabel` read `Choose apps` when no Screen Time targets are selected, otherwise use the existing human list of selected labels.

Expected helper:

```ts
const appTokenLabel = hasSelectedTargets ? joinHumanList(screenTimeTargets) : 'Choose apps';
```

- [ ] Keep the category name out of the header. It should appear inside each condition row, such as `Shopping is over budget`.

## Task 3: Launch Native App Selection From The Token

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Import the existing native picker and authorization helpers.

Expected imports:

```ts
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '@/services/appleEcosystem/screenTimeProtection';
```

- [ ] Add busy state for the app token.

Expected state:

```ts
const [choosingApps, setChoosingApps] = useState(false);
```

- [ ] Implement `handleChooseApps` in the route, using the same persistence path as `app/screen-time-controls.tsx`.

Expected implementation:

```ts
async function handleChooseApps() {
  setChoosingApps(true);
  try {
    let authorizationStatus = settings.authorizationStatus;
    if (authorizationStatus !== 'approved') {
      authorizationStatus = await requestScreenTimeAuthorization();
      await save((current) => ({ ...current, authorizationStatus }));
    }
    if (authorizationStatus !== 'approved') {
      Alert.alert('Screen Time access needed', 'Screen Time access is needed to choose apps.');
      return;
    }
    const selection = await presentScreenTimeActivityPicker(settings);
    if (selection) {
      await save((current) => ({
        ...current,
        selectedApps: selection.selectedApps ?? [],
        selectedCategories: selection.selectedCategories ?? [],
      }));
      await reconcileBudgetScreenTimeRestrictions();
    }
  } finally {
    setChoosingApps(false);
  }
}
```

- [ ] Disable the app token while `choosingApps` is true and label it `Choosing...` only during the native picker call.

## Task 4: Convert Conditions To Inline Toggles

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Replace chip labels with user-facing condition rows.

Use this mapping:

```ts
function conditionToggleTitle(condition: AppControlCondition, budgetName: string): string {
  if (condition === 'transactions_need_review') return `${budgetName} has transactions to review`;
  if (condition === 'usage_threshold') return `${budgetName} is near its limit`;
  if (condition === 'over_budget') return `${budgetName} is over budget`;
  if (condition === 'review_before_access') return `${budgetName} has not been reviewed today`;
  return `${budgetName} is running ahead of pace`;
}
```

- [ ] Keep the first visible condition set to:

```ts
const primaryVisibleConditions: AppControlCondition[] = [
  'transactions_need_review',
  'usage_threshold',
  'over_budget',
  'review_before_access',
];
```

- [ ] Keep `ahead_of_pace` out of the default list for this reductive pass. It can stay in the data model and advanced settings later.

- [ ] Implement `handleToggleCondition` so toggles save immediately to policy overrides. Preserve the existing invariant that at least one condition stays enabled.

Expected implementation:

```ts
async function handleToggleCondition(condition: AppControlCondition) {
  if (!primaryPolicy) return;
  const currentConditions = primaryPolicy.conditions.length ? primaryPolicy.conditions : ['usage_threshold'];
  const selected = currentConditions.includes(condition);
  const nextConditions = selected
    ? currentConditions.filter((item) => item !== condition)
    : [...currentConditions, condition];
  if (nextConditions.length === 0) return;

  await save((current) => {
    const policyOverrides = { ...current.policyOverrides };
    policies.forEach((policy) => {
      policyOverrides[policy.id] = {
        ...policyOverrides[policy.id],
        enabled: true,
        conditions: nextConditions,
        conditionOperator: 'any',
        hardStopConditions: (policyOverrides[policy.id]?.hardStopConditions ?? []).filter((item) => nextConditions.includes(item)),
        unlockWindowMinutes: policy.unlockWindowMinutes,
        triggerThresholdPercent: policyOverrides[policy.id]?.triggerThresholdPercent ?? policy.triggerThresholdPercent ?? 95,
      };
    });
    return { ...current, policyOverrides };
  });
  await reconcileBudgetScreenTimeRestrictions();
}
```

- [ ] Render toggle rows with `accessibilityRole="switch"` and `accessibilityState={{ checked: selected }}`.

Expected row shape:

```tsx
<Pressable
  accessibilityRole="switch"
  accessibilityState={{ checked: selected }}
  onPress={() => void onToggleCondition(condition)}
  style={({ pressed }) => [styles.conditionToggleRow, selected ? styles.conditionToggleRowOn : null, pressed ? styles.pressed : null]}
>
  <View style={[styles.switchTrack, selected ? styles.switchTrackOn : null]}>
    <View style={[styles.switchKnob, selected ? styles.switchKnobOn : null]} />
  </View>
  <View style={styles.conditionToggleText}>
    <Text selectable={false} style={styles.conditionToggleTitle}>{title}</Text>
    {subtitle ? <Text selectable={false} style={styles.conditionToggleSubtitle}>{subtitle}</Text> : null}
  </View>
</Pressable>
```

## Task 5: Add Inline Configuration For Near-Limit Threshold

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Add state for the expanded condition row.

Expected state:

```ts
const [expandedCondition, setExpandedCondition] = useState<AppControlCondition | null>(null);
```

- [ ] Show `95% of budget` or the stored threshold as secondary text for `usage_threshold`.

Expected helper:

```ts
function conditionToggleSubtitle(condition: AppControlCondition, thresholdPercent?: number): string | null {
  if (condition === 'usage_threshold') return `${thresholdPercent ?? 95}% of budget`;
  return null;
}
```

- [ ] When the near-limit row is expanded, show three compact options: `90%`, `95%`, and `100%`.

Expected options:

```ts
const thresholdOptions = [90, 95, 100];
```

- [ ] Implement `handleChangeThresholdPercent` so it updates all policy overrides without changing selected conditions.

Expected implementation:

```ts
async function handleChangeThresholdPercent(nextPercent: number) {
  await save((current) => {
    const policyOverrides = { ...current.policyOverrides };
    policies.forEach((policy) => {
      policyOverrides[policy.id] = {
        ...policyOverrides[policy.id],
        enabled: policyOverrides[policy.id]?.enabled ?? policy.enabled,
        conditions: policyOverrides[policy.id]?.conditions ?? policy.conditions,
        conditionOperator: policyOverrides[policy.id]?.conditionOperator ?? policy.conditionOperator,
        hardStopConditions: policyOverrides[policy.id]?.hardStopConditions ?? policy.hardStopConditions,
        unlockWindowMinutes: policyOverrides[policy.id]?.unlockWindowMinutes ?? policy.unlockWindowMinutes,
        triggerThresholdPercent: nextPercent,
      };
    });
    return { ...current, policyOverrides };
  });
  await reconcileBudgetScreenTimeRestrictions();
}
```

- [ ] Do not add a separate `Save` button. The threshold option saves immediately, matching the toggle behavior.

## Task 6: Remove Drawer-Only Edit Mode

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Delete `RuleBuilderDrawer`, `BuilderSection`, and unused drawer state if no longer referenced.

Remove these imports if unused:

```ts
import { BottomDrawer } from '@/components/bottom-drawer';
import { Button } from '@/components/button';
import { formatCurrency, getBudgetUsagePercent } from '@/domain/budget-meter';
```

- [ ] Remove helpers that only served the old dashboard copy if they are unused after the inline builder lands:

```ts
statusCopy
budgetProgressLabel
setupStateLabel
buildRuleSentence
summarizeConditions
buildConditionChipLabels
conditionPlainLabel
conditionSentenceLabel
isNeedsAttentionBundle
```

- [ ] Keep `joinHumanList`, `targetCountLabel`, and `screenTimeTargetLabels` if the sentence token still uses them.

- [ ] Run TypeScript/lint cleanup.

Run:

```bash
npm run lint
```

Expected: no unused import, unused style, or type errors.

## Task 7: Visual Polish And Empty States

**Files:**
- Modify: `app/app-control/[budgetId].tsx`

- [ ] Style the first viewport so the builder feels like the page, not a card stack.

Required visual constraints:

- No page-header icon.
- No duplicate category header.
- No `$0 of $200`, percent-used, or spend-progress line.
- No `Needs apps` status pill.
- No `Edit` button.
- No `Rules` section.
- No bottom `Choose apps to pause` CTA.
- `[Choose apps]` token is visibly tappable when incomplete.
- Toggle rows are compact enough that the sentence and four default rows fit comfortably in the first viewport on iPhone 17 Pro.

- [ ] Add a quiet Screen Time access fallback only if authorization is missing and app selection fails. This can be an inline secondary button or text link to `/screen-time-controls`, but it must not become the primary CTA.

Expected copy:

```text
Screen Time access is needed to choose apps.
```

## Task 8: Verification

**Files:**
- Modify only if runtime proof reveals issues.

- [ ] Run the structural check.

Run:

```bash
npm run job-delivery:check
```

Expected: `job-delivery:check ok`.

- [ ] Run lint.

Run:

```bash
npm run lint
```

Expected: command exits 0.

- [ ] Run the existing forecast test gate to catch shared-domain regressions.

Run:

```bash
npm run test:forecast
```

Expected: command exits 0.

- [ ] Capture simulator screenshots for both states:

No apps selected:

```text
App pause
Pause [Choose apps] when:
```

Selected app:

```text
App pause
Pause [Amazon] when:
```

- [ ] Verify manually in simulator:

1. Budget Detail menu row reads `App pause`.
2. Tapping it opens a screen titled `App pause`.
3. The first viewport has no duplicate `Shopping` heading and no spend stats.
4. Tapping `Choose apps` launches native Screen Time selection when available.
5. Returning from selection updates the app token.
6. Tapping each condition toggles it without opening edit mode.
7. Tapping `Shopping is near its limit` expands inline threshold choices.
8. Choosing `90%`, `95%`, or `100%` persists and updates the subtitle.

## Map Update Trigger

Do not update `docs/job-delivery-map.yaml` or delivery score for this implementation alone.

Update the map only after runtime proof shows the flow is clearer:

- rendered screenshot confirms the reductive surface;
- Budget Detail -> App pause -> choose apps -> saved readable rule works;
- app-pause review traversal still works after policy edits.

The expected score remains `3 -> 3` until signed-device or TestFlight proof shows native Screen Time behavior still matches the visible rule.

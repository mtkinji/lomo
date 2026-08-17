# Structured Screen Time Rule Builder Implementation Plan

> Implementation correction accepted 2026-08-16: preserve the structured
> model, but present it as a context-aware guided continuation. Settings entry
> asks for apps before supported behavior; contextual Focus and real-step entry
> reuse the known behavior and ask only for apps. Prior answers collapse into
> editable rows, and the UI uses the standard Kwilt type hierarchy. The first
> slice persists only the existing Focus and real-step personal rule types; the
> broader condition matrix and current-state evaluator remain future slices.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline Screen Time sentence prototype with a full-page structured builder that makes conditional availability versus triggered pause explicit, previews the agreement and current result, and saves the existing personal Focus and real-step rule types without changing their persistence.

**Architecture:** Introduce a pure transient builder model under `src/features/screen-time/rule-builder`, with fixed semantics (`available_when` requires all conditions; `pause_when` blocks on any trigger). Keep domain persistence separate: a personal adapter converts the two supported drafts into existing typed personal records, while the shared `ScreenTimeRule` projection gains a derived mode for consistent inventory and future Household adapters. The route owns orchestration; small components own mode choice, criteria, and receipts; the account overview owns navigation only.

**Tech Stack:** React Native 0.83, Expo SDK 55, TypeScript, React Navigation native stack, Jest, React Native Testing Library, existing Kwilt Settings/Button/Picker components, Apple Family Controls bridge.

---

## File structure

Create:

- `src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.ts` — transient draft types, fixed connector semantics, validation, dirty-state comparison, and duplicate signature.
- `src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.test.ts` — pure model coverage for both modes and invalid/duplicate cases.
- `src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.ts` — deterministic personal agreement strings and status copy.
- `src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.test.ts` — grammar and accessibility-copy coverage.
- `src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.ts` — pure personal evaluation plus composition with other restriction claims.
- `src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.test.ts` — current-state truth table.
- `src/features/screen-time/rule-builder/personalRuleBuilderAdapter.ts` — conversion between transient drafts and existing `PersonalScreenTimeRule` records.
- `src/features/screen-time/rule-builder/personalRuleBuilderAdapter.test.ts` — conversion, save, and duplicate tests.
- `src/features/screen-time/rule-builder/ScreenTimeRuleModeField.tsx` — two accessible consequential radio rows.
- `src/features/screen-time/rule-builder/ScreenTimeConditionList.tsx` — supported condition choice rows.
- `src/features/screen-time/rule-builder/ScreenTimeRuleReceipt.tsx` — Agreement and Right now presentation.
- `src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.tsx` — full-page route orchestration.
- `src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx` — interaction, validation, accessibility, and navigation tests.

Modify:

- `src/features/screen-time/domain/screenTimeRule.ts` and its test — add derived presentation mode to the shared projection contract.
- `src/services/screenTimeProtection.ts` and its test — support adapter save without weakening existing normalization or one-per-kind behavior.
- `src/navigation/RootNavigator.tsx` — add the serialized personal builder route.
- `src/features/account/ScreenTimeProtectionSettingsScreen.tsx` and its test — remove inline editor state/drawers and route scoped Add rule into the builder.
- `src/features/screen-time/FEATURE.md` — point the capability contract to the structured builder and proof boundary.

Do not modify in this slice:

- Family agreement JSON or Supabase RPCs;
- Money policy persistence/editors;
- native enforcement semantics;
- temporary family override behavior.

Those owners adopt the contract in later independently testable slices described
in `docs/design-explorations/screen-time-rule-governance/07-structured-rule-builder-contract.md`.

### Task 1: Add Rule Mode To The Shared Projection

**Files:**

- Modify: `src/features/screen-time/domain/screenTimeRule.ts`
- Test: `src/features/screen-time/domain/screenTimeRule.test.ts`
- Modify: `src/services/screenTimeProtection.ts`
- Test: `src/services/screenTimeProtection.test.ts`
- Modify: `src/capabilities/money/domain/moneyAppControl.ts`
- Test: `src/capabilities/money/domain/moneyAppControl.test.ts`
- Modify: `src/features/household/screenTime/data/familyScreenTime.ts`
- Test: `src/features/household/screenTime/data/familyScreenTime.test.ts`

- [ ] **Step 1: Write failing projection and normalization tests**

Add expectations proving personal real-step and family agreements project as
`available_when`, while Focus and Money project as `pause_when`. Add a
normalization expectation that mode is inferred from the trigger when an older
projection-shaped value omits it.

```ts
expect(projectPersonalScreenTimeRule(realStepRule).mode).toBe('available_when');
expect(projectPersonalScreenTimeRule(focusRule).mode).toBe('pause_when');
expect(projectMoneyScreenTimeRule(input)?.mode).toBe('pause_when');
expect(projectFamilyScreenTimeRule(input)?.mode).toBe('available_when');
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npm test -- --runInBand \
  src/features/screen-time/domain/screenTimeRule.test.ts \
  src/services/screenTimeProtection.test.ts \
  src/capabilities/money/domain/moneyAppControl.test.ts \
  src/features/household/screenTime/data/familyScreenTime.test.ts
```

Expected: FAIL because `ScreenTimeRule` has no `mode` property.

- [ ] **Step 3: Add the mode contract and deterministic legacy inference**

Implement the public type and keep inference centralized:

```ts
export type ScreenTimeRuleMode = 'available_when' | 'pause_when';

export function screenTimeRuleModeForTrigger(
  trigger: ScreenTimeRuleTrigger,
): ScreenTimeRuleMode {
  return trigger.type === 'real_step_pending' || trigger.type === 'family_agreement'
    ? 'available_when'
    : 'pause_when';
}

export type ScreenTimeRule = {
  // existing fields
  mode: ScreenTimeRuleMode;
};
```

In `normalizeScreenTimeRule`, accept a matching explicit mode, but infer it when
missing. Reject an explicit mode that conflicts with the current typed trigger;
this prevents UI copy from contradicting evaluation.

- [ ] **Step 4: Update all three projection owners**

Set `mode` explicitly in personal, Money, and family projection functions using
their typed meaning. Do not add a persisted mode to personal or Money records.

- [ ] **Step 5: Run the focused tests and commit**

Expected: all listed suites PASS.

```bash
git add src/features/screen-time/domain/screenTimeRule.ts \
  src/features/screen-time/domain/screenTimeRule.test.ts \
  src/services/screenTimeProtection.ts src/services/screenTimeProtection.test.ts \
  src/capabilities/money/domain/moneyAppControl.ts \
  src/capabilities/money/domain/moneyAppControl.test.ts \
  src/features/household/screenTime/data/familyScreenTime.ts \
  src/features/household/screenTime/data/familyScreenTime.test.ts
git commit -m "feat: classify screen time rule modes"
```

### Task 2: Build The Pure Draft Model

**Files:**

- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.ts`
- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.test.ts`

- [ ] **Step 1: Write failing tests for fixed semantics and validation**

Cover empty draft, mode selection, compatible condition filtering, required
target, at least one condition, mode mismatch, stable condition order, dirty
state, and duplicate signatures.

```ts
expect(connectorForMode('available_when')).toBe('all');
expect(connectorForMode('pause_when')).toBe('any');
expect(validateScreenTimeRuleDraft(emptyPersonalDraft()).valid).toBe(false);
expect(validateScreenTimeRuleDraft(completeFocusDraft()).valid).toBe(true);
expect(semanticSignature(completeFocusDraft())).toBe(
  'personal:self|pause_when|personal_focus|focus_active',
);
```

- [ ] **Step 2: Run the model test and verify missing-module failure**

Run:

```bash
npm test -- --runInBand src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal transient types**

Use a narrow first-slice union that can be extended without pretending every
owner persists the same object:

```ts
export type PersonalScreenTimeConditionDraft =
  | { type: 'real_step_complete'; minFocusMinutes: number }
  | { type: 'focus_active' };

export type PersonalScreenTimeRuleDraft = {
  schemaVersion: 1;
  authority: { kind: 'personal'; personId: 'self' };
  mode: ScreenTimeRuleMode | null;
  selection: {
    selectionId: string;
    selectedApps: ScreenTimeToken[];
    selectedCategories: ScreenTimeToken[];
  } | null;
  conditions: PersonalScreenTimeConditionDraft[];
};
```

Export `connectorForMode`, `conditionsForMode`, `validateScreenTimeRuleDraft`,
`semanticSignature`, and `screenTimeDraftChanged`. Validation returns field IDs
and stable plain-language messages; do not throw for an incomplete UI draft.

- [ ] **Step 4: Encode connector invariants instead of storing operators**

Do not add `connector` to the draft. Any attempt to attach `focus_active` to
`available_when` or `real_step_complete` to `pause_when` must fail validation.

- [ ] **Step 5: Run the focused test and commit**

Expected: PASS.

```bash
git add src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.test.ts
git commit -m "feat: model structured screen time drafts"
```

### Task 3: Format Agreement And Evaluate Right Now

**Files:**

- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.ts`
- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.test.ts`
- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.ts`
- Create: `src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.test.ts`

- [ ] **Step 1: Write failing agreement grammar tests**

Cover no sentence for incomplete drafts, singular/plural target receipts, and
the two supported personal templates.

```ts
expect(formatPersonalAgreement(completeFocusDraft(), 'Instagram and Reddit'))
  .toBe('Instagram and Reddit pause while Focus is running.');
expect(formatPersonalAgreement(completeRealStepDraft(), 'Games'))
  .toBe('Games are available after I complete a real step today.');
```

- [ ] **Step 2: Write the current-state truth table before implementation**

Use an injected context; never read the clock or global store inside the pure
evaluator.

```ts
type PersonalRulePreviewContext = {
  focusRunning: boolean | null;
  realStepCompleteToday: boolean | null;
  otherBlockingRules: Array<{ id: string; explanation: string }>;
};
```

Assert:

- incomplete draft -> `incomplete`;
- Focus inactive -> `available`;
- Focus active -> `paused`;
- real step missing -> `paused`;
- real step done -> `available`;
- owner truth `null` -> `unknown`;
- draft permits but another claim blocks -> `paused_by_other_rule`.

- [ ] **Step 3: Run both tests and verify failure**

```bash
npm test -- --runInBand \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.test.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.test.ts
```

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement deterministic copy and preview unions**

Return the contract from the design, including explicit `unknown` and
`paused_by_other_rule`. Evaluate the draft before composing other claims. For
the first slice there is one condition per personal rule, but implement the
mode reducers correctly:

```ts
const ownRuleAllows = mode === 'available_when'
  ? results.every((result) => result === true)
  : !results.some((result) => result === true);
```

If any needed result is unknown and no known result already determines a pause,
return `unknown`. Never turn absent owner data into `false`.

- [ ] **Step 5: Run both tests and commit**

Expected: PASS.

```bash
git add src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.test.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.test.ts
git commit -m "feat: preview screen time agreements"
```

### Task 4: Add The Personal Persistence Adapter

**Files:**

- Create: `src/features/screen-time/rule-builder/personalRuleBuilderAdapter.ts`
- Create: `src/features/screen-time/rule-builder/personalRuleBuilderAdapter.test.ts`
- Modify: `src/services/screenTimeProtection.ts`
- Test: `src/services/screenTimeProtection.test.ts`

- [ ] **Step 1: Write failing round-trip and save tests**

Cover Focus and real-step records, exact selection preservation, enabled-by-save,
existing default `minFocusMinutes`, duplicate-kind refusal, and edit replacement
without changing rule/selection identity.

```ts
expect(personalRuleKindForDraft(completeFocusDraft())).toBe('focus');
expect(personalRuleKindForDraft(completeRealStepDraft())).toBe('real_step');
expect(savePersonalRuleDraft(settings, completeFocusDraft()).status).toBe('created');
expect(savePersonalRuleDraft(withFocus, completeFocusDraft()).status).toBe('duplicate_kind');
```

- [ ] **Step 2: Run the focused tests and verify failure**

```bash
npm test -- --runInBand \
  src/features/screen-time/rule-builder/personalRuleBuilderAdapter.test.ts \
  src/services/screenTimeProtection.test.ts
```

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement explicit conversion functions**

Export:

```ts
export function draftFromPersonalRule(rule: PersonalScreenTimeRule): PersonalScreenTimeRuleDraft;
export function personalRuleKindForDraft(draft: PersonalScreenTimeRuleDraft): PersonalScreenTimeRuleKind | null;
export function savePersonalRuleDraft(
  settings: ScreenTimeProtectionSettings,
  draft: PersonalScreenTimeRuleDraft,
  options?: { editingRuleId?: string; nowIso?: string },
): PersonalRuleDraftSaveResult;
```

Create uses `addPersonalScreenTimeRule`. Edit uses
`replacePersonalScreenTimeRule`. Return validation/duplicate receipts rather
than throwing for user-correctable states. Do not generalize personal storage
to arrays of generic condition JSON.

- [ ] **Step 4: Run focused tests and commit**

Expected: PASS.

```bash
git add src/features/screen-time/rule-builder/personalRuleBuilderAdapter.ts \
  src/features/screen-time/rule-builder/personalRuleBuilderAdapter.test.ts \
  src/services/screenTimeProtection.ts src/services/screenTimeProtection.test.ts
git commit -m "feat: adapt personal screen time rule drafts"
```

### Task 5: Build Accessible Builder Components

**Files:**

- Create: `src/features/screen-time/rule-builder/ScreenTimeRuleModeField.tsx`
- Create: `src/features/screen-time/rule-builder/ScreenTimeConditionList.tsx`
- Create: `src/features/screen-time/rule-builder/ScreenTimeRuleReceipt.tsx`
- Create: `src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.tsx`
- Create: `src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx`

- [ ] **Step 1: Write failing screen tests for the three-second read**

Render a neutral personal create route and assert visible labels:

```ts
expect(getByText('Set when apps are available')).toBeTruthy();
expect(getByText('Pause apps at certain times')).toBeTruthy();
expect(getByText('Applies to')).toBeTruthy();
expect(getByText('Agreement')).toBeTruthy();
expect(getByText('Right now')).toBeTruthy();
expect(getByRole('button', { name: 'Add rule' })).toBeDisabled();
```

Add interaction tests for choosing each mode, only showing compatible
conditions, clearing incompatible conditions after confirmed type change,
opening/cancelling Apple selection, complete receipts, disabled/valid save,
duplicate routing, and dirty back navigation.

- [ ] **Step 2: Write accessibility behavior expectations**

Assert two `radio` elements with selected state, independently labeled app and
condition controls, full-sentence receipt text, 44-point row hit targets by
style/precedent, and no sentence fragments acting as buttons.

- [ ] **Step 3: Run the screen test and verify failure**

```bash
npm test -- --runInBand src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement the two mode rows**

Use local tokenized composition following the accepted Money radio-row
precedent:

```tsx
<Pressable
  accessibilityRole="radio"
  accessibilityState={{ selected }}
  accessibilityLabel={title}
  accessibilityHint={description}
  onPress={onPress}
>
  <Text>{title}</Text>
  <Text>{description}</Text>
  {selected ? <Icon name="check" ... /> : null}
</Pressable>
```

Do not use a switch or segmented control. The consequence text stays visible.

- [ ] **Step 5: Implement the condition list and receipts**

The heading is derived from mode (`AVAILABLE WHEN ALL ARE TRUE` or
`PAUSE WHEN ANY ARE TRUE`). Rows expose checked/selected state. The receipt
component renders static Agreement text and an explicit Right now status plus
explanation; color is supplementary only.

- [ ] **Step 6: Compose one scrolling SettingsPage**

Use `SettingsPage`, `SettingsGroup`, `PickerFieldTrigger`, the existing Apple
picker callback, and one `Button` in normal scroll flow. Do not add a fixed
footer, nested Card stack, explanatory hero, wizard step count, or separate
preview route.

- [ ] **Step 7: Run the screen test and commit**

Expected: PASS.

```bash
git add src/features/screen-time/rule-builder/ScreenTimeRuleModeField.tsx \
  src/features/screen-time/rule-builder/ScreenTimeConditionList.tsx \
  src/features/screen-time/rule-builder/ScreenTimeRuleReceipt.tsx \
  src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.tsx \
  src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx
git commit -m "feat: add structured screen time rule builder"
```

### Task 6: Route The Inventory Into The Builder And Remove Inline Authoring

**Files:**

- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Test: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [ ] **Step 1: Update account screen tests first**

Replace inline-editor assertions with navigation assertions. Verify My rules
Add passes personal scope and an optional contextual suggestion, while Household
Add retains its current child route in this slice.

```ts
expect(navigate).toHaveBeenCalledWith('SettingsScreenTimeRuleBuilder', {
  authority: 'personal',
  suggestedCondition: undefined,
});
expect(queryByText('Pause')).toBeNull(); // no inline draft grammar
```

- [ ] **Step 2: Run account tests and verify they fail against the prototype**

```bash
npm test -- --runInBand src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx
```

Expected: FAIL because Add rule still opens inline state.

- [ ] **Step 3: Add a serializable route contract**

Add:

```ts
SettingsScreenTimeRuleBuilder: {
  authority: 'personal';
  ruleId?: string;
  suggestedCondition?: 'focus_active' | 'real_step_complete';
};
```

Register `ScreenTimeRuleBuilderScreen` with `headerShown: false`. Do not pass the
draft, Apple tokens, functions, or stores through navigation params.

- [ ] **Step 4: Remove inline builder ownership from the overview**

Delete `personalRuleDraftKind`, inline selection state, the condition drawer,
`InlinePersonalRuleEditor`, and its local styling. Preserve all saved inventory
rows, direct enable controls, Apple edit-selection paths, Money routing, and
Household setup behavior.

- [ ] **Step 5: Run account and builder tests together**

```bash
npm test -- --runInBand \
  src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx \
  src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/RootNavigator.tsx \
  src/features/account/ScreenTimeProtectionSettingsScreen.tsx \
  src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx
git commit -m "refactor: route screen time rule creation"
```

### Task 7: Reconcile Documentation And Product Contracts

**Files:**

- Modify: `src/features/screen-time/FEATURE.md`
- Verify: `docs/feature-briefs/screen-time-rule-governance.md`
- Verify: `docs/design-explorations/screen-time-rule-governance/07-structured-rule-builder-contract.md`

- [ ] **Step 1: Update the capability manifest**

State that the first slice supports structured personal creation for Focus and
real step; both modes are semantic, not toggles; Household compound agreements,
pause triggers, and temporary overrides remain later slices; Simulator is not
enforcement proof.

- [ ] **Step 2: Run product and architecture lint**

```bash
npm run product:lint
npm run architecture:lint
```

Expected: both commands exit 0. Repair any actual ownership/link violation;
do not weaken lint rules.

- [ ] **Step 3: Commit**

```bash
git add src/features/screen-time/FEATURE.md \
  docs/feature-briefs/screen-time-rule-governance.md \
  docs/design-explorations/screen-time-rule-governance
git commit -m "docs: define structured screen time rules"
```

### Task 8: Verify The Complete Personal Slice

**Files:**

- Verify: all changed paths

- [ ] **Step 1: Run focused behavioral suites**

```bash
npm test -- --runInBand \
  src/features/screen-time/domain/screenTimeRule.test.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderModel.test.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderCopy.test.ts \
  src/features/screen-time/rule-builder/screenTimeRuleBuilderPreview.test.ts \
  src/features/screen-time/rule-builder/personalRuleBuilderAdapter.test.ts \
  src/features/screen-time/rule-builder/ScreenTimeRuleBuilderScreen.test.tsx \
  src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx
```

Expected: all suites PASS.

- [ ] **Step 2: Run the repository's diff-aware completion gate**

```bash
npm run verify:changed -- --run
```

Expected: exit 0. Record any manual gates printed by the command instead of
claiming they ran automatically.

- [ ] **Step 3: Check patch integrity**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; status contains only intentional initiative
paths and any previously declared worktree changes.

- [ ] **Step 4: Capture Simulator evidence from this worktree**

On iPhone 17 Pro, capture:

1. neutral builder showing both rule types;
2. complete conditional-availability rule with Agreement and paused Right now;
3. complete triggered-pause rule with Agreement and available Right now;
4. largest Dynamic Type with no clipped labels/actions;
5. VoiceOver traversal order and selected-state announcements;
6. confirmation when changing type after configuring a condition;
7. created rule returned to the grouped inventory.

Record the source checkout, branch, commit, dirty state, Metro path/port, and
installed build provenance with the screenshots.

- [ ] **Step 5: Keep signed-device proof separate**

On a signed iPhone, verify Apple selection cancellation and save, Focus
restriction/application, real-step release, overlap where another rule remains
blocking, relaunch persistence, and permission revocation. Do not claim family
delivery or compound conditions from this slice.

- [ ] **Step 6: Commit any verification-only documentation changes**

Stage exact paths only. Do not use `git add -A`.

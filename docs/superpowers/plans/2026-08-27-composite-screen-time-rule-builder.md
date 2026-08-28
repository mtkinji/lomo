# Composite Screen Time Rule Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-trigger personal Screen Time editor with a truthful composite rule system and the approved flat `When → AND/OR → Then` composer.

**Architecture:** Introduce a normalized V2 personal-rule aggregate containing one target selection, an outcome, an editable connector, and typed conditions. Keep legacy one-trigger records readable by migrating them into one-condition aggregates. Evaluate condition truth through one pure engine; use that same result for UI receipts and runtime enforcement. Extend the generated Apple bridge so device-local time and usage conditions can participate in the same aggregate without presenting Simulator evidence as signed-device proof.

**Tech Stack:** TypeScript, React Native/Expo 54, Zustand persistence, Jest, Expo config-plugin generated Swift, FamilyControls, DeviceActivity, ManagedSettings.

---

## Product and UI contract

Job: When a person creates or edits a Screen Time rule, they need to define the apps, conditions, connector, and outcome in one legible structure so they can predict and trust the resulting restriction.

Authority chain: Andrew's approved flat prototype and explicit Option 2 decision -> Screen Time rule-governance brief and JTBD -> Kwilt Secondary Settings Page and Bottom Dock patterns -> Apple Family Controls privacy and enforcement constraints.

Three-second read: `Rule for <targets>` followed by `When`, editable condition statements with an explicit `AND` or `OR`, and one editable `Then` outcome.

Primary action: Add rule or Save changes only when every condition is complete and the composite is enforceable.

Primary information: selected targets, ordered conditions, the shared connector, and the outcome.

Secondary information: enabled state on edit and destructive deletion at the bottom.

Reveal later: Apple app/category selection, condition type/value selection, condition removal, and destructive confirmation.

Scan order: target identity -> When conditions and connector -> Add condition -> Then outcome -> one completion action.

Must not add: decorative rails, green emphasis, an enclosing condition card, Add condition inside a condition surface, a redundant result card, stage helper paragraphs, separate behavior page, permanent remove icons, or unverified native success claims.

Reuse map: `SettingsPage` for the pushed gray shell; `BottomDrawer` and `SettingsChoiceRow` for condition/outcome/connector choices; `DurationPicker` for usage values; `Button` plus canonical bottom action geometry; Apple FamilyActivityPicker for opaque target tokens.

Nearest precedent: canonical Secondary Settings Page for shell/navigation; accepted HTML flat-rule prototype for the capability-owned form body.

External exemplar ledger: Apple Shortcuts and Home automation builders informed ordered editable clauses; preserve clause clarity, translate through Kwilt tokens/components, reject copied chrome and free-form scripting.

Behavior sources: target selection and save boundaries remain native; connector and outcome are explicit user choices; legacy rules normalize to their equivalent one-condition aggregate; native monitoring and receipt copy consume the same normalized aggregate.

Required states: no targets, no conditions, one condition, several conditions, AND, OR, available outcome, pause outcome, incomplete value, edit, disabled, deletion, duplicate, native activation failure, Simulator limitation, persisted reconstruction, and legacy migration.

Proof path: Settings > Screen Time > Add rule on iPhone 17 Pro Simulator for the full UI and persistence path; generated-source tests and native build for bridge integrity; entitlement-enabled physical iPhone for actual composite enforcement.

## File structure

- Create `src/features/screen-time/domain/personalCompositeScreenTimeRule.ts` for V2 types, normalization, legacy migration, validation, and deterministic copy.
- Create `src/features/screen-time/domain/personalCompositeScreenTimeRule.test.ts` for red/green model coverage.
- Create `src/features/screen-time/domain/personalCompositeRuleEvaluation.ts` for pure AND/OR and behavior evaluation.
- Create `src/features/screen-time/domain/personalCompositeRuleEvaluation.test.ts` for truth-table coverage.
- Create `src/features/screen-time/domain/personalCompositeRuleActions.ts` for atomic activate/deactivate/persist rollback.
- Create `src/features/screen-time/domain/personalCompositeRuleActions.test.ts` for mutation and rollback coverage.
- Modify `src/services/screenTimeProtection.ts` to retain legacy exports while storing normalized composite aggregates.
- Modify `src/features/screen-time/domain/screenTimeRule.ts` to project aggregate identity and typed condition metadata without breaking Money or family records.
- Modify `src/features/screen-time/domain/screenTimeRuleInventory.ts` and its tests to render one row per aggregate.
- Modify `src/services/screenTimeProtectionRuntime.ts` and tests so the evaluator, native state, and bridge calls share one truth contract.
- Modify `src/services/appleEcosystem/screenTimeProtection.ts` for composite bridge calls and validated payloads.
- Modify `plugins/withAppleEcosystemIntegrations.js` and `plugins/appleEcosystem/screenTimeShieldExtensions.js` for generated native configuration, monitoring, evaluation, stores, and ledger receipts.
- Create or modify focused generator contract tests under `scripts/` for the composite bridge and extension source.
- Modify `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx` to render the flat composer.
- Modify `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.test.tsx` for creation, editing, AND/OR, removal, values, rollback, and accessibility.
- Modify `docs/feature-briefs/screen-time-rule-governance.md` to replace the derived-connector decision with the explicitly editable connector and approved reductive composition.

### Task 1: Define and normalize the composite aggregate

**Files:**
- Create: `src/features/screen-time/domain/personalCompositeScreenTimeRule.ts`
- Create: `src/features/screen-time/domain/personalCompositeScreenTimeRule.test.ts`
- Modify: `src/services/screenTimeProtection.ts`

- [ ] **Step 1: Write failing normalization and migration tests**

Cover a two-condition aggregate, duplicate condition IDs, invalid/incomplete values, bounded minutes, explicit `all`/`any`, explicit `available`/`pause`, and each legacy `real_step`/`focus`/`daily_limit` record migrating to one condition without changing its outcome.

- [ ] **Step 2: Run the focused model test and confirm red**

Run: `npm test -- --runInBand src/features/screen-time/domain/personalCompositeScreenTimeRule.test.ts`

Expected: FAIL because the V2 model does not exist.

- [ ] **Step 3: Implement the aggregate types and normalizer**

Use this public shape:

```ts
export type PersonalRuleConnector = 'all' | 'any';
export type PersonalRuleOutcome = 'available' | 'pause';
export type PersonalRuleCondition =
  | { id: string; type: 'real_step_complete' }
  | { id: string; type: 'focus_active'; operator: 'is' | 'is_not'; value: true }
  | { id: string; type: 'daily_usage'; operator: 'below' | 'reaches'; minutes: number }
  | { id: string; type: 'time_of_day'; operator: 'after' | 'before'; minuteOfDay: number };

export type PersonalCompositeScreenTimeRule = {
  id: string;
  selectionId: string;
  selectedApps: ScreenTimeToken[];
  selectedCategories: ScreenTimeToken[];
  enabled: boolean;
  setupCompleted: boolean;
  connector: PersonalRuleConnector;
  outcome: PersonalRuleOutcome;
  conditions: PersonalRuleCondition[];
  lastUpdated: string | null;
};
```

Normalization must reject zero-condition saved rules, duplicate IDs, incompatible operator/value pairs, invalid times, and more than one condition of the same device-monitoring type. Draft validation remains separate so the UI can represent incomplete work.

- [ ] **Step 4: Preserve legacy reads and projections**

Normalize old records into aggregates while retaining compatibility helpers until all callers move. Do not rewrite stored state merely by reading it.

- [ ] **Step 5: Run focused model tests green**

Run the Task 1 test command and expect PASS.

### Task 2: Add the deterministic evaluator

**Files:**
- Create: `src/features/screen-time/domain/personalCompositeRuleEvaluation.ts`
- Create: `src/features/screen-time/domain/personalCompositeRuleEvaluation.test.ts`

- [ ] **Step 1: Write the truth-table tests first**

Test `all` and `any` for one and several conditions, both outcomes, missing/unknown device truth, day reset, Focus transitions, real-step completion, time boundaries, and daily-usage thresholds.

- [ ] **Step 2: Run the evaluator test and confirm red**

Run: `npm test -- --runInBand src/features/screen-time/domain/personalCompositeRuleEvaluation.test.ts`

- [ ] **Step 3: Implement one evaluator contract**

```ts
export type PersonalRuleConditionTruth = Record<string, boolean | 'unknown'>;

export function evaluatePersonalCompositeRule(
  rule: PersonalCompositeScreenTimeRule,
  truth: PersonalRuleConditionTruth,
): { status: 'available' | 'paused' | 'unknown'; matched: boolean | null };
```

`all` requires every condition true; `any` requires at least one true. Unknown values remain unknown unless the known values already determine the result. `available` means matched -> available; `pause` means matched -> paused.

- [ ] **Step 4: Add deterministic agreement and inventory copy**

Generate copy from the same normalized conditions and connector. Do not maintain a second copy-only semantics table.

- [ ] **Step 5: Run focused evaluator tests green**

Run the Task 2 test command and expect PASS.

### Task 3: Make aggregate mutations atomic

**Files:**
- Create: `src/features/screen-time/domain/personalCompositeRuleActions.ts`
- Create: `src/features/screen-time/domain/personalCompositeRuleActions.test.ts`
- Modify: `src/features/screen-time/runtime/personalScreenTimeRuleActionBoundary.ts`

- [ ] **Step 1: Write failing save/update/delete rollback tests**

Prove activation happens before persistence, prior enforcement is restored after replacement failure, new enforcement is cleared after persistence failure, stale edits fail, duplicates fail, and delete does not persist until native deactivation confirms.

- [ ] **Step 2: Run the focused action test and confirm red**

Run: `npm test -- --runInBand src/features/screen-time/domain/personalCompositeRuleActions.test.ts`

- [ ] **Step 3: Implement aggregate action boundaries**

Use one aggregate activation/deactivation call, not one UI loop per condition. Return summaries without Apple tokens.

- [ ] **Step 4: Run focused action tests green**

Run the Task 3 test command and expect PASS.

### Task 4: Extend native monitoring and restriction evaluation

**Files:**
- Modify: `src/services/appleEcosystem/screenTimeProtection.ts`
- Modify: `src/services/screenTimeProtectionRuntime.ts`
- Modify: `plugins/withAppleEcosystemIntegrations.js`
- Modify: `plugins/appleEcosystem/screenTimeShieldExtensions.js`
- Test: focused existing/new runtime and generator contract tests

- [ ] **Step 1: Write failing bridge payload tests**

Require the bridge to reject incomplete aggregates and serialize only normalized condition fields, stable IDs, connector, outcome, selection ID, and rule ID.

- [ ] **Step 2: Write failing generated-Swift contract tests**

Assert a versioned composite configuration, per-condition truth storage, time/usage monitoring names, shared evaluator, aggregate-specific `ManagedSettingsStore`, ledger entry, day reset, and cleanup.

- [ ] **Step 3: Implement `applyPersonalCompositeRule` and `clearPersonalCompositeRule`**

The host app writes current Focus/real-step truth and registers device-local schedules/events. The monitor extension writes time/usage truth. Both call the same generated Swift evaluator before applying or clearing the aggregate store.

- [ ] **Step 4: Preserve legacy native methods during migration**

Existing personal usage and immediate restrictions continue to work for old installed state until normalized aggregates have been applied successfully.

- [ ] **Step 5: Run runtime and generator tests green**

Run only the focused Jest and `node --test` files named by `verify:changed` for these paths.

### Task 5: Group inventory and edit reconstruction

**Files:**
- Modify: `src/features/screen-time/domain/screenTimeRuleInventory.ts`
- Modify: `src/features/screen-time/domain/screenTimeRuleInventory.test.ts`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [ ] **Step 1: Write failing inventory tests**

Assert one row per aggregate, target title, natural-language condition detail, On/Off state, and navigation by aggregate ID.

- [ ] **Step 2: Run the focused inventory tests and confirm red**

- [ ] **Step 3: Implement grouped projection and navigation**

Do not display internal condition records as separate rules. Existing Money rows remain capability-owned and unchanged.

- [ ] **Step 4: Run focused inventory tests green**

### Task 6: Build the flat React Native composer

**Files:**
- Create: `src/features/screen-time/rule-builder/PersonalRuleConditionRow.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.test.tsx`

- [ ] **Step 1: Write the key-state component tests**

Assert `Rule for Social`, `When`, condition field/operator/value controls, a tappable connector only for multiple conditions, Add condition outside condition rows, `Then`, editable outcome, no result card, no green role token, and one completion action.

- [ ] **Step 2: Implement the condition row**

Use three independent, minimum-44pt neutral controls. Field opens change/remove actions; operator and value open only applicable drawers. No enclosing card or decorative rail.

- [ ] **Step 3: Implement condition, connector, outcome, value, and removal drawers**

Use `BottomDrawer`, `SettingsChoiceRow`, and `DurationPicker`. Immediate single-select changes close the drawer; destructive removal remains explicit.

- [ ] **Step 4: Wire draft validation and aggregate save**

Keep Add/Save disabled until target, outcome, connector, and every condition are valid. Existing Chat and Money handoffs populate the same aggregate draft.

- [ ] **Step 5: Run the focused builder test green**

Run: `npm test -- --runInBand src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.test.tsx`

### Task 7: Update the product contract and run the reduction pass

**Files:**
- Modify: `docs/feature-briefs/screen-time-rule-governance.md`

- [ ] **Step 1: Record the approved connector and composition decisions**

Replace derived connectors and the old guided-card anatomy with explicit connectors and the flat When/Then composer. Keep Money ownership and signed-device proof boundaries.

- [ ] **Step 2: Remove redundant UI**

Remove the separate behavior page, result card, helper copy, nested cards, decorative color, and duplicate actions. Keep enabled state only on edit and deletion at the bottom.

- [ ] **Step 3: Run focused accessibility assertions**

Check roles, selected state, accessible names/values, 44pt targets, reading order, long labels, and Dynamic Type wrapping.

### Task 8: Verify source, Simulator, and native proof separately

**Files:**
- Evidence only; do not add generated artifacts to source unless already tracked by project convention.

- [ ] **Step 1: Run focused tests during the implementation loop**

Run each task's smallest red/green command.

- [ ] **Step 2: Run the task-completion gate once**

Run: `npm run verify:changed -- --run`

- [ ] **Step 3: Open the real route in the current Simulator runtime**

Record checkout, branch, HEAD, dirty state, Metro checkout/port, installed build, and route: Settings > Screen Time > Add rule.

- [ ] **Step 4: Exercise realistic states**

Create Social with time-of-day and daily-usage conditions, toggle AND/OR, edit/remove/add, navigate backward with state retained, save, reopen, disable, and delete. Capture the final normal and drawer states.

- [ ] **Step 5: Run a fresh critic pass and fix failures**

Require PASS for job clarity, reduction, hierarchy, system fit, composition, interaction, states, resilience, and Simulator runtime proof before handoff.

- [ ] **Step 6: Report signed-device enforcement as a separate gate**

Generated source, Jest, Xcode build, and Simulator interaction do not prove DeviceActivity callbacks or ManagedSettings behavior. Record the exact entitlement-enabled physical-device scenario still required.

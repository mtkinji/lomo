# Family Screen Time Native Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wordy family Screen Time learning screen with one compact agreement card and a progressive, one-question-at-a-time setup flow.

**Architecture:** Add a pure capability-owned presentation model between Screen Time state and UI, then reuse it in the child card and setup screen. Keep the existing local learning record only as development scaffolding; move simulated-device controls to Developer Tools and preserve the physical-device proof boundary.

**Tech Stack:** React Native, React Navigation, Zustand, AsyncStorage, Jest, React Native Testing Library, Kwilt SettingsSurface and analytics.

---

### Task 1: Lock the compact presentation contract test-first

**Files:**
- Create: `src/features/household/screenTime/familyScreenTimePresentation.ts`
- Create: `src/features/household/screenTime/familyScreenTimePresentation.test.ts`
- Modify: `src/features/household/FEATURE.md`

- [ ] **Step 1: Write failing presentation tests**

Cover `needs_setup`, `ready`, `applying`, `applied`, `needs_attention`, and `releasing`. Assert one primary action, compact labels, the current child explanation, and absence of internal terms such as “desired version,” “receipt,” and “Apple authorization.”

```ts
expect(buildFamilyScreenTimeSummary({
  childMembershipId: 'child-1', childDisplayName: 'Charlie',
  rule: starterRule, deliveryState: 'applied',
  childExplanation: 'Games open at 4:00 PM.', issue: null,
})).toEqual(expect.objectContaining({
  childDisplayName: 'Charlie', targetLabel: 'Games',
  scheduleLabel: 'Weekdays, 4–7 PM', limitLabel: '30 min/day',
  lifecycle: 'applied', nextAction: 'edit',
  childExplanation: 'Games open at 4:00 PM.',
}));
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimePresentation.test.ts`

Expected: FAIL because `buildFamilyScreenTimeSummary` does not exist.

- [ ] **Step 3: Implement the presentation types and builder**

```ts
export type FamilyScreenTimeLifecycle =
  | 'needs_setup' | 'ready' | 'applying' | 'applied' | 'needs_attention' | 'releasing';

export type FamilyScreenTimeAgreementSummary = {
  childMembershipId: string;
  childDisplayName: string;
  targetLabel: string;
  scheduleLabel: string;
  limitLabel: string | null;
  responsibilityLabel: string | null;
  childExplanation: string;
  lifecycle: FamilyScreenTimeLifecycle;
  nextAction: 'continue_setup' | 'activate' | 'edit' | 'recover' | 'none';
};
```

Use existing rule formatting helpers for full prose, but add compact schedule and limit formatters here. Do not store presentation strings in persisted policy state.

- [ ] **Step 4: Run the focused test and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimePresentation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the presentation contract**

```bash
git add src/features/household/screenTime/familyScreenTimePresentation.ts src/features/household/screenTime/familyScreenTimePresentation.test.ts src/features/household/FEATURE.md
git commit -m "feat(screen-time): add compact family agreement presentation"
```

### Task 2: Build the reusable quiet agreement card

**Files:**
- Create: `src/features/household/screenTime/FamilyScreenTimeAgreementCard.tsx`
- Create: `src/features/household/screenTime/FamilyScreenTimeAgreementCard.test.tsx`

- [ ] **Step 1: Write component behavior tests**

Render the card in the normal and needs-attention states. Prove that it shows the agreement once, shows exactly one action, uses the supplied child explanation, and does not render explanatory footers.

```tsx
const { getByText, queryByText } = renderWithProviders(
  <FamilyScreenTimeAgreementCard summary={appliedSummary} onAction={onAction} />,
);
expect(getByText('Games')).toBeTruthy();
expect(getByText('Weekdays, 4–7 PM · 30 min/day')).toBeTruthy();
expect(getByText('Games open at 4:00 PM.')).toBeTruthy();
expect(getByText('Edit')).toBeTruthy();
expect(queryByText(/authorization|simulated|delivery/i)).toBeNull();
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeAgreementCard.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the smallest card**

Compose Kwilt primitives rather than nesting multiple `SettingsGroup` cards. Reading order is target, compact criteria, child explanation, action. Use neutral surfaces; only `needs_attention` receives semantic warning treatment.

```tsx
export function FamilyScreenTimeAgreementCard({ summary, onAction }: Props) {
  const actionLabel = actionLabelFor(summary.nextAction);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{summary.targetLabel}</Text>
      <Text style={styles.criteria}>{compactCriteria(summary)}</Text>
      <Text style={styles.explanation}>{summary.childExplanation}</Text>
      {actionLabel ? <Button onPress={onAction}>{actionLabel}</Button> : null}
    </View>
  );
}
```

- [ ] **Step 4: Run the test and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeAgreementCard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the card**

```bash
git add src/features/household/screenTime/FamilyScreenTimeAgreementCard.tsx src/features/household/screenTime/FamilyScreenTimeAgreementCard.test.tsx
git commit -m "feat(screen-time): add quiet family agreement card"
```

### Task 3: Define the progressive setup state machine test-first

**Files:**
- Create: `src/features/household/screenTime/familyScreenTimeSetupFlow.ts`
- Create: `src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts`

- [ ] **Step 1: Write failing transition tests**

Cover the ordered states `connect_device`, `choose_apps`, `review_agreement`, `preview_child`, `activate`, and `complete`. Prove that native prerequisites cannot be skipped and that returning from a completed handoff resumes the exact step.

```ts
expect(resolveFamilyScreenTimeSetupStep({
  capabilityActive: true, deviceReady: false, selectionReady: false,
  agreementValid: true, desiredVersion: 0, appliedVersion: null,
})).toBe('connect_device');
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the deterministic resolver**

```ts
export type FamilyScreenTimeSetupStep =
  | 'connect_device' | 'choose_apps' | 'review_agreement'
  | 'preview_child' | 'activate' | 'complete';

export function resolveFamilyScreenTimeSetupStep(input: SetupFacts): FamilyScreenTimeSetupStep {
  if (!input.deviceReady) return 'connect_device';
  if (!input.selectionReady) return 'choose_apps';
  if (!input.agreementReviewed) return 'review_agreement';
  if (!input.childPreviewReviewed) return 'preview_child';
  if (input.desiredVersion === 0 || input.appliedVersion !== input.desiredVersion) return 'activate';
  return 'complete';
}
```

Keep review progress ephemeral until a real policy command exists; do not persist a second rule object.

- [ ] **Step 4: Run the focused test and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the setup resolver**

```bash
git add src/features/household/screenTime/familyScreenTimeSetupFlow.ts src/features/household/screenTime/familyScreenTimeSetupFlow.test.ts
git commit -m "feat(screen-time): define progressive family setup flow"
```

### Task 4: Replace the wordy learning screen

**Files:**
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`

- [ ] **Step 1: Rewrite the screen test around user jobs**

Prove three paths:

1. A device-needed state shows one sentence and **Continue setup**.
2. A ready state shows the default agreement once and **Turn on**.
3. An applied state shows the agreement card, current child explanation, and **Edit**.

Also assert that the screen no longer contains “One clear agreement,” “Delivery,” the repeated full sentence, or persistent simulated/authorization copy.

- [ ] **Step 2: Run the screen and navigation tests and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx src/navigation/navigationPersistence.test.ts`

Expected: FAIL against the old long screen.

- [ ] **Step 3: Implement progressive composition**

Replace the introduction plus three groups with a step header, one focused control, and one primary action. Use `FamilyScreenTimeAgreementCard` for review, preview, applied, and failure states.

Extend route params only with resumable intent, never policy data:

```ts
SettingsFamilyScreenTime: {
  childMembershipId: string;
  childDisplayName: string;
  setupStep?: FamilyScreenTimeSetupStep;
};
```

- [ ] **Step 4: Run the tests and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx src/navigation/navigationPersistence.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the simplified screen**

```bash
git add src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx src/navigation/RootNavigator.tsx src/navigation/navigationPersistence.ts src/navigation/navigationPersistence.test.ts
git commit -m "feat(screen-time): simplify family setup and management"
```

### Task 5: Move simulated-device administration to Developer Tools

**Files:**
- Modify: `src/features/dev/DevToolsScreen.tsx`
- Create: `src/features/household/screenTime/FamilyScreenTimeDevControls.tsx`
- Create: `src/features/household/screenTime/FamilyScreenTimeDevControls.test.tsx`
- Modify: `src/features/household/screenTime/useFamilyScreenTimeLearningStore.ts`

- [ ] **Step 1: Write the dev-controls test**

Prove the controls are development-only, identify the selected child, can prepare/reset the simulated device, and never appear in the ordinary Screen Time screen.

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeDevControls.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement and mount the dev controls**

```tsx
if (!__DEV__) return null;
return <SettingsGroup title="Family Screen Time simulation">…</SettingsGroup>;
```

Do not add a production route or persist simulation flags in server Household data.

- [ ] **Step 4: Run the focused tests and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeDevControls.test.tsx src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the development boundary**

```bash
git add src/features/dev/DevToolsScreen.tsx src/features/household/screenTime/FamilyScreenTimeDevControls.tsx src/features/household/screenTime/FamilyScreenTimeDevControls.test.tsx src/features/household/screenTime/useFamilyScreenTimeLearningStore.ts
git commit -m "chore(screen-time): move simulation controls to developer tools"
```

### Task 6: Align Household and Settings summaries

**Files:**
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/features/account/screenTimeOverview.ts`
- Modify: `src/features/account/screenTimeOverview.test.ts`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [ ] **Step 1: Add failing summary parity tests**

Assert the same vocabulary across surfaces: **Set up**, **Applying**, **On**, or **Needs attention**. A child row always routes to the child-owned screen; Settings never copies the family editor.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --runInBand src/features/household/HouseholdSettingsScreen.test.tsx src/features/account/screenTimeOverview.test.ts src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [ ] **Step 3: Reuse the presentation vocabulary**

Map capability activation plus child delivery state to the compact labels. Do not import the local learning store into generic Settings; pass or derive an explicit summary projection.

- [ ] **Step 4: Run the focused tests and confirm pass**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit summary alignment**

```bash
git add src/features/household/HouseholdSettingsScreen.tsx src/features/household/HouseholdSettingsScreen.test.tsx src/features/account/screenTimeOverview.ts src/features/account/screenTimeOverview.test.ts src/features/account/ScreenTimeProtectionSettingsScreen.tsx src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx
git commit -m "feat(screen-time): align family status across settings"
```

### Task 7: Add learning analytics without surveillance

**Files:**
- Modify: `src/services/analytics/events.ts`
- Create: `src/features/household/screenTime/familyScreenTimeAnalytics.ts`
- Create: `src/features/household/screenTime/familyScreenTimeAnalytics.test.ts`
- Modify: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`

- [ ] **Step 1: Write the event-shape test**

Allow child membership id, entry surface, step, lifecycle, and outcome. Reject app token, readable app identity from Apple selection, content, location, and usage-history payloads.

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeAnalytics.test.ts`

- [ ] **Step 3: Add the typed event helper and emit transitions**

```ts
trackFamilyScreenTime('setup_step_completed', {
  childMembershipId, step, entrySurface: 'household', outcome: 'completed',
});
```

- [ ] **Step 4: Run analytics and screen tests**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeAnalytics.test.ts src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit analytics**

```bash
git add src/services/analytics/events.ts src/features/household/screenTime/familyScreenTimeAnalytics.ts src/features/household/screenTime/familyScreenTimeAnalytics.test.ts src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx
git commit -m "feat(screen-time): measure simplified family setup"
```

### Task 8: Verify the native learning release

**Files:**
- Regenerate: `docs/agent-code-map.md`
- Update: `docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md`

- [ ] **Step 1: Run all focused tests**

Run: `npm test -- --runInBand src/features/household/screenTime src/features/household/HouseholdSettingsScreen.test.tsx src/features/account/screenTimeOverview.test.ts src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx src/navigation/navigationPersistence.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the repository completion gate**

Run: `npm run verify:changed -- --run`

Expected: PASS, or record an unrelated dirty-checkout failure separately with exact file ownership.

- [ ] **Step 3: Operate the real Simulator path**

From Settings > People > Household > Charlie:

1. Confirm the initial screen has one sentence and one action.
2. Prepare the simulated device in Developer Tools.
3. Return and confirm the starter agreement appears once.
4. Activate and observe Applying, then On.
5. Relaunch and confirm the same compact applied state persists.
6. Check smallest supported viewport and larger text.

- [ ] **Step 4: Record the proof boundary**

Update the evaluation artifact with comprehension notes. State explicitly that Simulator proof does not cover Apple authorization, picker, cross-device delivery, background enforcement, shields, offline expiry, or release cleanup.

- [ ] **Step 5: Commit verification artifacts**

```bash
git add docs/agent-code-map.md docs/design-explorations/family-screen-time-simplification/05-evaluate-learning.md
git commit -m "docs(screen-time): record native simplification proof"
```

# Screen Time Rule-Aware Recovery Implementation Plan

> **For Codex:** Execute this plan in the existing shared checkout. Do not create a worktree or commit the unrelated dirty tree. Preserve the existing BottomGuide height work and scope verification to the files listed here.

**Goal:** Replace the Screen Time guide's hot-path temporary override with truthful rule-derived recovery, quiet authority-aware management, and fresh local authentication before changes to active rules.

**Architecture:** Extend the pure guide projection to return a resolution kind, optional prerequisite action, and management authority. Keep navigation and household route resolution in the guide host. Put platform authentication behind a small Screen Time runtime adapter, then call it immediately before each protected mutation. Retain temporary-open storage and backend primitives as compatibility infrastructure, but remove them from the guide.

**Tech Stack:** React Native, Expo, TypeScript, Jest, React Navigation, `expo-local-authentication`, Kwilt `BottomGuide`/`BottomDrawer` primitives.

---

## Task 1: Lock the product contract and documentation

**Files:**
- Create: `docs/feature-briefs/screen-time-rule-aware-recovery.md`
- Create: `docs/design-explorations/screen-time-exception-authorization/*`
- Modify: `src/features/screen-time/FEATURE.md`
- Modify: `docs/architecture/screen-time-control-plane.md`
- Modify: `docs/feature-briefs/rule-based-screen-time-contextual-unlock.md`

- [x] Record the accepted no-override, rule-aware, authenticated-management contract.
- [x] Link the accepted brief from the feature manifest.
- [ ] Remove stale documentation claims that the contextual guide offers a 20-minute opening.
- [ ] Run `npm run product:lint`.

## Task 2: Project truthful guide actions regression-first

**Files:**
- Modify: `src/features/screen-time/domain/screenTimeGuideActions.ts`
- Modify: `src/features/screen-time/domain/screenTimeGuideActions.test.ts`
- Modify: `src/features/screen-time/domain/screenTimeHandoffProjection.ts`
- Modify: `src/features/screen-time/domain/screenTimeHandoffProjection.test.ts`

- [ ] Add failing tests for the `actionable`, `boundary`, `mixed`, and `unresolved` resolution kinds.
- [ ] Add failing tests proving an action appears only for one exact supported prerequisite and no unresolved claims.
- [ ] Add failing tests for adult management authority and child/unscoped denial.
- [ ] Implement a projection shaped like:

```ts
type ScreenTimeGuideRequirementAction = {
  kind: 'focus' | 'real_step' | 'money';
  label: 'Return to Focus' | 'Do this first' | 'Review Money';
  destination: string;
};

type ScreenTimeGuideActions = {
  resolutionKind: 'actionable' | 'boundary' | 'mixed' | 'unresolved';
  requirementAction: ScreenTimeGuideRequirementAction | null;
  canManageRules: boolean;
  requiresCaregiver: boolean;
};
```

- [ ] Ensure new guide projections set temporary opening unavailable while preserving compatibility fields.

## Task 3: Support a management-only semantic footer and content-owned guide height

**Files:**
- Modify: `src/ui/layout/BottomDrawerSemanticFooter.tsx`
- Modify: `src/ui/BottomDrawer.accessibility.test.tsx`
- Modify: `src/ui/BottomGuide.tsx`
- Modify: `src/ui/BottomGuide.test.tsx`
- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuide.tsx`
- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuide.test.tsx`

- [ ] Add failing footer tests for an optional primary action and a Pine/link-style secondary action.
- [ ] Add failing guide tests proving no actor sees `Open for 20`, boundary/mixed states have no generic prerequisite, authorized adults can manage, and children cannot.
- [ ] Enable content-owned height below the large-text threshold, with a near-full-height scroll state for large text.
- [ ] Render the optional prerequisite as primary and `Manage rules ›` as the quiet link action.

## Task 4: Route management to the canonical owner

**Files:**
- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuideHost.tsx`
- Modify: `src/features/screen-time/components/ScreenTimeUnlockGuideHost.test.ts`
- Modify: `src/navigation/linkingConfig.ts`
- Modify: `src/navigation/linkingConfig.test.ts`
- Modify: `src/features/screen-time/runtime/screenTimeAnalytics.ts`

- [ ] Remove temporary-opening imports, state, actions, analytics, and feedback from the guide host.
- [ ] Route requirement actions directly from the pure projection.
- [ ] Add a family Screen Time deep link and use it only for one fully resolved family subject; otherwise use the Screen Time overview.
- [ ] Emit privacy-safe requirement-opened and management-opened events.

## Task 5: Gate active-rule mutations with fresh platform authentication

**Files:**
- Create: `src/features/screen-time/runtime/screenTimeRuleAuthentication.ts`
- Create: `src/features/screen-time/runtime/screenTimeRuleAuthentication.test.ts`
- Modify: `src/features/screen-time/screens/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/screen-time/screens/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/screen-time/screens/FamilyScreenTimeLearningScreen.tsx`
- Modify focused screen tests as required by actual mutation seams.

- [ ] Write failing tests for authenticated, cancelled, unavailable, and failed normalization.
- [ ] Implement `authenticateScreenTimeRuleChange(mutationClass)` with device-credential fallback and no custom PIN.
- [ ] Authenticate after destructive confirmation and immediately before disabling or deleting an active personal rule.
- [ ] Authenticate before every save to an existing active personal rule.
- [ ] Authenticate before saving changes to or deactivating an active family agreement, preserving caregiver authority checks.
- [ ] Keep cancellation quiet; on unavailable/failure show `Kwilt couldn't confirm this change. The rule is still on.` and perform no mutation.

## Task 6: Verify the local slice and record proof boundaries

**Files:** all task files above.

- [ ] Run focused Jest tests for projections, guide/footer behavior, linking, authentication, and protected mutation paths.
- [ ] Run `npm run product:lint`.
- [ ] Run scoped `npm run verify:local -- --run --files <task files...>` and inspect the omitted-file report.
- [ ] Inspect the final diff for unrelated edits and stale `Open for 20` guide references.
- [ ] Report Simulator and physical-device verification as outstanding unless actually completed on the relevant build.

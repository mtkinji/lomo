# Contextual Screen Time Rule Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an eligible workflow offer open the existing personal Screen Time rule drawer over the originating surface without binding the rule to the originating object.

**Architecture:** Extract the drawer body from its Settings route wrapper and mount a store-driven host beside Kwilt's other root drawer hosts. A pure launch resolver decides whether an offer can open the drawer immediately or must enter the existing authorization flow first; after approval, contextual setup returns to the originating route before opening the root drawer.

**Tech Stack:** React Native 0.83, Expo 55, React Navigation, Zustand, BottomDrawer, Jest and Testing Library.

---

## UI contract

Job: When Screen Time becomes relevant inside a workflow, the person needs to consider a useful general guardrail without losing their place, so they can set it up and continue what they were doing.

Authority chain: explicit user decision -> Screen Time governance brief -> Kwilt root-host and BottomDrawer patterns -> iOS accessibility conventions.

Three-second read: the workflow remains visible; the suggested Screen Time rule asks only its first unresolved question.

Primary action: choose the apps and categories the suggested rule should manage.

Primary information: the suggested general rule behavior and selected apps.

Secondary information: prior answers in the existing quiet summary.

Reveal later: Apple picker, review sentence, and central rule inventory.

Scan order: originating workflow -> current drawer question -> one or two large choices.

Must not add: a To-do-specific qualifier, silent persistence, a second builder implementation, Money conditions in the personal builder, or duplicate rules.

Reuse map: existing `PersonalScreenTimeRuleBuilderScreen` drawer composition; root host placement used by `AuthPromptDrawerHost`; existing Screen Time authorization interstitial; existing Activity Focus offer.

Nearest precedent: root drawer hosts in `RootNavigator.tsx`; this host is explicitly user-invoked rather than ambient.

External exemplar ledger: N/A.

Behavior sources: contextual suggestion and no object binding are explicit user decisions; first-time authorization and capability ownership come from the existing Screen Time brief.

Unresolved decisions: broader non-Focus To-do offer placement and a Money-owned contextual drawer remain separate follow-ups.

Required states: authorized direct open, authorization required, cancelled drawer, saved rule, duplicate kind, and return to originating Activity.

Proof path: Activity detail -> Focus offer -> Set Up on iPhone 17 Pro Simulator; signed-device proof remains required for Apple picker and enforcement.

### Task 1: Add a tested contextual-launch contract

**Files:**
- Create: `src/features/screen-time/rule-builder/personalRuleBuilderLaunch.ts`
- Create: `src/features/screen-time/rule-builder/personalRuleBuilderLaunch.test.ts`

- [x] Write tests proving approved authorization returns a direct drawer request and all other authorization states return the existing Settings setup route with the exact Activity return target.
- [x] Run `npm test -- --runInBand src/features/screen-time/rule-builder/personalRuleBuilderLaunch.test.ts` and confirm the tests fail before implementation.
- [x] Implement the typed route params and pure resolver without navigation or store imports.
- [x] Rerun the focused test and confirm it passes.

### Task 2: Add the root drawer host without duplicating UI

**Files:**
- Create: `src/features/screen-time/rule-builder/usePersonalRuleBuilderDrawerStore.ts`
- Create: `src/features/screen-time/rule-builder/usePersonalRuleBuilderDrawerStore.test.ts`
- Create: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderHost.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`
- Modify: `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`

- [x] Test that opening replaces the current request with a fresh request identity and closing clears it.
- [x] Extract `PersonalScreenTimeRuleBuilderDrawer` with explicit `params` and `onClose` props while keeping the Settings screen as a compatibility wrapper.
- [x] Mount `PersonalScreenTimeRuleBuilderHost` beside the existing root drawer hosts.
- [x] Verify dismissal, save, progress, copy, icons, and accessibility remain covered by the existing component tests.

### Task 3: Route the existing contextual offer through the host

**Files:**
- Modify: `src/features/activities/ActivityDetailScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.tsx`
- Modify: `src/features/account/ScreenTimeProtectionSettingsScreen.test.tsx`

- [x] When authorization is approved, close the Focus sheet and open the root drawer with `suggestedKind: 'focus'` without navigating to Settings.
- [x] When authorization is not approved, preserve the existing Settings interstitial and exact Activity return target.
- [x] After approval, return to the originating root route and open the same root drawer request.
- [x] Test the first-time handoff and existing Settings-local builder behavior.

### Task 4: Document and verify

**Files:**
- Modify: `docs/feature-briefs/screen-time-rule-governance.md`

- [x] Record that contextual workflow offers use the root drawer host as activation surfaces and do not become rule criteria.
- [x] Run focused tests for launch, host/store, builder, Settings handoff, and Activity Screen Time targeting.
- [x] Run `npm run verify:changed -- --run`.
- [ ] Capture the real Activity-originated drawer in the Simulator when this checkout owns the runtime; keep signed-device proof separate.

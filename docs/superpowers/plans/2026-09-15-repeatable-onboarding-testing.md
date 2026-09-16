# Repeatable Onboarding Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rapid onboarding replay scoped and truthful, then verify it separately from a clean Simulator install.

**Architecture:** Extend the existing Zustand onboarding reset action so it removes only the recorded onboarding-created Arc graph, or the recorded Goal fallback, while preserving unrelated account data. Keep orchestration and confirmation in the development-only DevTools screen and document clean-install/new-identity as a separate proof lane.

**Tech Stack:** React Native, Expo, Zustand, Jest, Maestro, iOS Simulator.

---

### Task 1: Define scoped replay cleanup

**Files:**
- Modify: `src/store/useAppStore.ts`
- Test: `src/store/useAppStore.lifecycle.test.ts`

- [ ] Add failing tests proving recorded onboarding Arc cleanup, Goal fallback cleanup, and unrelated-data preservation.
- [ ] Run the focused Jest test and confirm the new assertions fail.
- [ ] Extend `resetOnboardingAnswers` with the minimum scoped cleanup and onboarding-only state reset.
- [ ] Rerun the focused Jest test and confirm it passes.

### Task 2: Make the DevTools boundary explicit

**Files:**
- Modify: `src/features/dev/DevToolsScreen.tsx`
- Modify: `docs/maestro-e2e.md`

- [ ] Add concise copy stating that auth identity and unrelated account data remain.
- [ ] Rename the primary action to **Reset & replay onboarding** without changing its stable test ID.
- [ ] Show a native destructive confirmation only when a recorded onboarding Arc or Goal exists.
- [ ] Update the Maestro test-ID documentation with the revised semantic name.

### Task 3: Verify implementation and runtime

**Files:**
- Verify only the files above and the new product artifacts.

- [ ] Run the focused store test.
- [ ] Run `npm run product:lint`.
- [ ] Run scoped `npm run verify:local -- --run --files ...` and inspect omitted files.
- [ ] Build/install from the current checkout on the booted iPhone 17 Pro / iOS 26.5 Simulator.
- [ ] Open `kwilt://__dev/tools`, exercise empty and destructive replay paths, and capture evidence.
- [ ] Separately uninstall and reinstall the exact candidate for clean-install proof; stop at sign-in if a genuinely new identity is not available.

## Self-review

- Spec coverage: all acceptance criteria map to Tasks 1–3.
- Placeholder scan: no deferred implementation placeholders.
- Type consistency: the existing `resetOnboardingAnswers` and `startFlow` APIs remain authoritative; no new cross-module type is needed.

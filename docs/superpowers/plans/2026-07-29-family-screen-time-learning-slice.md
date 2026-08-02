# Family Screen Time Learning Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Andrew activate Screen Time for a dependent child, review one school-day Games agreement, and exercise truthful desired-versus-applied device state in the Simulator without claiming Apple enforcement.

**Architecture:** Keep the production Household activation on Supabase and add a child-specific settings route for the pre-TestFlight learning experience. Store only development learning state locally, keyed by authenticated user and child membership, while pure domain helpers own normalization, versioning, status, and child-facing explanation. A development-only simulated adapter acknowledges a desired policy version; production builds continue to show that a physical child device is required.

**Tech Stack:** React Native, React Navigation, Zustand persistence, AsyncStorage, Jest, React Native Testing Library.

---

### Task 1: Lock the local learning-release boundary

**Files:**
- Modify: `docs/feature-briefs/family-screen-time-controls.md`
- Modify: `docs/design-explorations/family-screen-time/04-learning-release.md`

- [x] **Step 1: Add the accepted pre-TestFlight slice**

Document that the Simulator slice uses a dependent profile, one fixed schedule-only starter agreement, and a development-only acknowledgement adapter. State that Household activation remains `pending_setup` and that no Apple authorization or enforcement is claimed.

- [x] **Step 2: Keep the permanent proof boundary explicit**

Retain signed-device/TestFlight proof for Family Controls authorization, Device Activity callbacks, shields, offline behavior, and cleanup.

### Task 2: Add the pure learning-state contract test-first

**Files:**
- Create: `src/features/household/screenTime/familyScreenTimeLearning.ts`
- Create: `src/features/household/screenTime/familyScreenTimeLearning.test.ts`
- Create: `src/features/household/screenTime/useFamilyScreenTimeLearningStore.ts`

- [x] **Step 1: Write failing tests for the starter agreement**

Cover default school weekdays, 4:00–7:00 PM, 30 minutes, desired/applied version separation, malformed persisted data normalization, and child-facing explanations before, during, and after the window.

- [x] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeLearning.test.ts`

- [x] **Step 3: Implement the pure contract and persisted record map**

Create a v1 local record keyed by `userId:childMembershipId`. Expose actions to prepare a simulated device, activate the starter agreement, acknowledge its current desired version, and reset a child record.

- [x] **Step 4: Run the focused test and confirm pass**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeLearning.test.ts`

### Task 3: Build the child-specific Screen Time learning screen

**Files:**
- Create: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.tsx`
- Create: `src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`

- [x] **Step 1: Write the screen behavior test**

Prove the screen initially says a physical device is required, exposes the simulated-device action only in development, previews the fixed agreement, shows `Applying` before acknowledgement, and shows `Applied to simulated device` only after the adapter acknowledges the exact desired version.

- [x] **Step 2: Implement the reductive settings surface**

Use `SettingsPage`, `SettingsGroup`, and `SettingsRow`. Show one readable agreement and one child preview, not a dashboard or generic rule builder. Use neutral presentation except for existing semantic state styling.

- [x] **Step 3: Run the component test**

Run: `npm test -- --runInBand src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx`

### Task 4: Connect Household activation to the learning screen

**Files:**
- Modify: `src/features/household/HouseholdSettingsScreen.tsx`
- Modify: `src/features/household/HouseholdSettingsScreen.test.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/navigationPersistence.ts`
- Modify: `src/navigation/navigationPersistence.test.ts`

- [x] **Step 1: Extend tests for the route**

Prove a `pending_setup` Screen Time activation reveals `Set up Riley's Screen Time`, navigates with the exact child membership and display name, and survives navigation-state sanitization.

- [x] **Step 2: Register and render the route**

Add `SettingsFamilyScreenTime` to the settings stack and persistence allowlist. Show the setup row only after Screen Time is activated for that child.

- [x] **Step 3: Run Household and navigation tests**

Run: `npm test -- --runInBand src/features/household/HouseholdSettingsScreen.test.tsx src/navigation/navigationPersistence.test.ts`

### Task 5: Verify the learning slice

**Files:**
- Regenerate: `docs/agent-code-map.md`

- [x] **Step 1: Run all focused tests**

Run: `npm test -- --runInBand src/features/household/screenTime/familyScreenTimeLearning.test.ts src/features/household/screenTime/FamilyScreenTimeLearningScreen.test.tsx src/features/household/HouseholdSettingsScreen.test.tsx src/navigation/navigationPersistence.test.ts`

- [x] **Step 2: Run the repository completion gate**

Run: `npm run verify:changed -- --run`

- [ ] **Step 3: Manually verify in the current Simulator runtime**

Create a dependent child, activate Screen Time, open the child setup row, prepare the simulated device, activate the starter agreement, and confirm that all copy says simulated or physical-device-required rather than claiming Apple enforcement.

# Explore First Place Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Explore’s post-recording-choice state into a clear first action by inviting the user to name the current Place, while establishing stable map controls and an optional Places layer for future Missions and Stories.

**Architecture:** Extend the existing local Explore preferences and versioned Zustand persistence rather than adding a second onboarding store. Keep Place creation in the existing canonical Explore `Place`/`UserPlaceRelationship` model. Recompose only `ExploreMapScreen`: the bottom search stays fixed, collect/recenter become one vertical Here control, and a non-modal `BottomGuide` introduces the first Place once.

**Tech Stack:** React Native, Expo, Zustand persistence, React Native Maps, Jest and React Native Testing Library.

---

## UI contract

Job: When Explore has accepted the user’s recording choice and revealed the first clearing, the user needs one concrete next step and a brief explanation of the map controls, so Explore feels ready rather than empty.

Primary action: Name this Place.

Must show: the first clearing, a one-time inset guide, fixed Places search, a vertical Here control with name/recenter actions, and a Places layer toggle.

Reveal later: Mission launcher, nearby recommendations, Stories, automatic Place search, Place detail, and rich Place types.

Must not add: a dead Missions affordance, a setup checklist, automatic Home inference, automatic POI collection, a scrim, or movement of anchored controls when the guide appears.

Reuse map: `BottomGuide`, `BottomDrawer`, `Button`, `Icon`, `BlurView`, existing floating-control tokens, `addPlaceVisit`, and the existing map-layer menu.

Behavior sources: post-approval expectation setting, persistent collect control, Apple Maps-inspired vertical Here pill, fixed bottom controls, user-controlled Places layer, and non-pushing guide are explicit user decisions; private Place storage and fog non-leakage come from the Explore and Places briefs.

Unresolved decisions: automatic POI matching and the future Mission launcher remain deferred because their domain behavior is not implemented.

Required states: first guide, dismissed guide, naming drawer, invalid empty name, saved Place, hidden Places layer, no current point, and persisted/reloaded preference state.

Proof path: Global menu → Explore → Begin Exploring → choose a recording mode → inspect guide → Name this Place → save → toggle Places off/on → recenter → relaunch and confirm the guide stays dismissed.

## Task 1: Version the first-Place and Places-layer preferences

**Files:**
- Modify: `src/capabilities/explore/domain/types.ts`
- Modify: `src/capabilities/explore/domain/explorePrivacy.ts`
- Modify: `src/capabilities/explore/domain/explorePrivacy.test.ts`
- Modify: `src/capabilities/explore/domain/exploreState.ts`
- Modify: `src/capabilities/explore/runtime/useExploreStore.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundTask.ts`

- [x] **Step 1: Write the failing preference test**

Add `showPlaces: true` and `firstPlaceGuideDismissed: false` to the exact default-preferences assertion, and assert new empty Explore state uses version 7.

- [x] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- --runInBand src/capabilities/explore/domain/explorePrivacy.test.ts src/capabilities/explore/domain/exploreState.test.ts`

Expected: FAIL because the fields and version are not implemented.

- [x] **Step 3: Implement the versioned preference contract**

```ts
export type ExplorePreferences = {
  // existing fields
  showPlaces: boolean;
  firstPlaceGuideDismissed: boolean;
};

export type ExploreData = {
  version: 7;
  // existing fields
};
```

Default Places to visible and the guide to not dismissed. Update Zustand and background-task envelopes to version 7 so existing version-6 data receives defaults without losing history.

- [x] **Step 4: Run the focused tests**

Expected: PASS.

## Task 2: Lock the post-onboarding behavior in screen tests

**Files:**
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

- [x] **Step 1: Add a failing first-Place guide test**

Prove that completing the recording-mode choice reveals **Start with this Place**, **Name this Place**, and the map-layer explanation; pressing **Not now** persists dismissal.

- [x] **Step 2: Add a failing Here-control test**

Prove that the rendered control contains both **Name current Place** and **Center on current location**, opens a dedicated naming drawer, rejects an empty name, saves `Home`, and leaves search responsible only for revisiting saved Places.

- [x] **Step 3: Add a failing Places-layer test**

Create an explored saved Place, toggle **Places** off in the menu, and prove the Marker disappears while the Place remains searchable.

- [x] **Step 4: Run the screen test and confirm the new cases fail**

Run: `npm test -- --runInBand src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

Expected: FAIL on missing guide, control, drawer, and layer behavior.

## Task 3: Implement the reductive Explore continuation

**Files:**
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.tsx`

- [x] **Step 1: Add the one-time inset guide**

Render `BottomGuide` without a scrim only after onboarding, a first clearing, no saved Places, and no competing drawer/recap. Use:

```text
Start with this Place
Give this clearing a name—Home, a park, anywhere worth finding again. Use ••• to show or hide map layers.
Not now | Name this Place
```

Both actions persist `firstPlaceGuideDismissed: true`; the primary action opens Place naming.

- [x] **Step 2: Extract Place naming from search**

Use a dedicated compact `BottomDrawer` titled **Name this Place**, retain the existing canonical `addPlaceVisit` write, and use **Save Place** as the primary action. Closing the drawer clears draft text.

- [x] **Step 3: Recompose the bottom controls**

Keep search fixed as the bottom row. Above its right edge, render one floating vertical Here pill with a Place-pin action, divider, and current-location action. Do not render the future Mission button.

- [x] **Step 4: Add the Places map layer**

Add a **Places** switch to the contextual menu and gate map markers with `preferences.showPlaces`. Search remains available when the layer is hidden.

- [x] **Step 5: Run the screen and domain tests**

Expected: PASS.

## Task 4: Reduce, verify, and visually inspect

**Files:**
- Modify if needed: `src/capabilities/explore/screens/ExploreMapScreen.tsx`
- Modify if needed: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

- [x] **Step 1: Run the reduction pass**

Remove duplicated collect actions, helper headings, or search-owned creation UI. Confirm every visible action either orients, names, searches, recenters, records, or configures the map.

- [x] **Step 2: Run focused verification**

Run:

```bash
npm test -- --runInBand src/capabilities/explore/domain/explorePrivacy.test.ts src/capabilities/explore/domain/exploreState.test.ts src/capabilities/explore/runtime/exploreBackgroundTask.test.ts src/capabilities/explore/screens/ExploreMapScreen.test.tsx
npm run verify:changed -- --run
```

Expected: PASS.

- [ ] **Step 3: Operate the real simulator path**

Confirm the installed binary and Metro source belong to `/Users/andrewwatanabe/Kwilt`, then exercise the proof path on the currently owned iOS simulator. Capture the guide, naming drawer, saved marker, Places-off state, and returned map.

Partial proof on 2026-07-28: build 97 on the iPhone 17 Pro / iOS 26.5 Simulator loaded from Metro in `/Users/andrewwatanabe/Kwilt`. The returned map, fixed Here control, first-Place naming drawer, and Places menu layer were visually inspected. The retained dogfood profile already has Explore history, so the one-time guide and a non-destructive save/toggle sequence remain covered by tests rather than a fresh-profile capture.

- [x] **Step 4: Score the surface**

Record PASS/FAIL for job clarity, reduction, hierarchy, system fit, interaction, states, resilience, and runtime proof. Any critical failure returns to Step 1.

Score: PASS for job clarity, reduction, hierarchy, system fit, interaction, states, and resilience. Runtime proof is PARTIAL for the reason recorded in Step 3; no critical visual or behavioral failure was observed.

# Explore Nearby Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a MapKit-backed Nearby/My Places drawer with synchronized pins and list selection while keeping recommendations outside visited history and Missions.

**Architecture:** A local Expo module owns iOS POI search. A typed adapter and pure ranking policy normalize native candidates. A branching hook owns request lifecycle and in-memory results. ExploreMapScreen reuses its existing Places drawer and marker surface.

**Tech Stack:** React Native, TypeScript, Jest, Expo Modules Core, Swift, MapKit, react-native-maps.

---

### Task 1: Nearby domain policy

**Files:**
- Create: `src/capabilities/explore/domain/exploreNearby.ts`
- Create: `src/capabilities/explore/domain/exploreNearby.test.ts`

- [x] Write failing tests for radius conversion, invalid candidate removal, visited-place exclusion, stable dedupe, distance ordering, affinity, and a five-result bound.
- [x] Run `npm test -- --runInBand src/capabilities/explore/domain/exploreNearby.test.ts` and confirm the missing module failure.
- [x] Implement typed normalization and ranking as pure functions.
- [x] Rerun the focused test and confirm it passes.

### Task 2: Native MapKit provider

**Files:**
- Create: `modules/kwilt-place-search/index.ts`
- Create: `modules/kwilt-place-search/expo-module.config.json`
- Create: `modules/kwilt-place-search/package.json`
- Create: `modules/kwilt-place-search/ios/KwiltPlaceSearch.podspec`
- Create: `modules/kwilt-place-search/ios/KwiltPlaceSearchModule.swift`
- Create: `src/capabilities/explore/runtime/exploreNearbyPlaces.ts`
- Create: `src/capabilities/explore/runtime/exploreNearbyNativeContract.test.ts`

- [x] Write a native contract test requiring an optional Expo module, `MKLocalPointsOfInterestRequest`, explicit culture/outdoor categories, radius clamping, and no write API.
- [x] Run the contract test and confirm it fails because the module is absent.
- [x] Implement `searchNearby(latitude, longitude, radiusMeters)` in Swift and normalize its response in TypeScript.
- [x] Rerun the contract and type tests.

### Task 3: Request lifecycle hook

**Files:**
- Create: `src/capabilities/explore/runtime/useExploreNearbyPlaces.ts`
- Create: `src/capabilities/explore/runtime/useExploreNearbyPlaces.test.tsx`

- [x] Write failing hook tests for idle, loading, success, unavailable, failure, stale-response suppression, and explicit refresh.
- [x] Run the focused hook test and confirm failure.
- [x] Implement an in-memory request lifecycle that calls the adapter only after explicit search.
- [x] Rerun the hook test and confirm it passes.

### Task 4: Synchronized Places drawer

**Files:**
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.tsx`
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

- [x] Add component tests for the Places entry point, Nearby/My Places segments, default half-mile request, radius change, recommendation-only markers, row/pin selection, search-this-area refresh, empty/error states, and no Place/Mission persistence.
- [x] Run the screen suite and confirm the new assertions fail.
- [x] Replace the visited-only drawer with the segmented drawer and synchronized markers.
- [x] Preserve onboarding, recaps, manual naming, collected marker visibility, and fog props.
- [x] Rerun the screen suite and confirm it passes.

### Task 5: Product records and verification

**Files:**
- Modify: `docs/feature-briefs/explore-capability.md`
- Modify: `docs/feature-briefs/explore-missions-stories-system.md`
- Modify: `src/capabilities/explore/FEATURE.md`
- Modify: `docs/agent-code-map.md` through its generator.

- [x] Link the accepted brief and clarify that nearby recommendations become Missions only after an explicit action creates an objective/completion contract.
- [x] Run focused Jest suites and Expo module autolinking resolution. `verify:changed` reached an unrelated Unified Chat code-health budget failure; explicit lint, test typecheck, product lint, architecture lint, and the full Jest suite passed.
- [x] Run CocoaPods/native compilation for `KwiltPlaceSearch` and build the iOS Simulator app.
- [ ] Use a simulated Tokyo location to verify Nearby/My Places switching, pins/list synchronization, and truthful fog behavior.
- [x] Review and commit only Explore-owned files, leaving unrelated work intact.

The app build, install, launch, and bundle load completed on the iPhone 17 Pro Simulator. Tokyo interaction remains a manual proof gate because the Mac was locked during visual verification.

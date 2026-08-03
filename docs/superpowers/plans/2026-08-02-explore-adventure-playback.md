# Explore Adventure Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add truthful elevation profiling and synchronized route/fog playback to a single completed manual Explore Adventure recap.

**Architecture:** Keep persisted Explore state unchanged. Add a pure playback/profile projection module, render a focused recap component using React Native SVG and direct manipulation, and let `ExploreMapScreen` derive its displayed session prefix and fog cutoff from one normalized playback progress value.

**Tech Stack:** React Native, Expo, TypeScript, react-native-maps, react-native-svg, Jest, React Native Testing Library.

---

### Task 1: Playback and elevation projection

**Files:**
- Create: `src/capabilities/explore/domain/explorePlayback.ts`
- Create: `src/capabilities/explore/domain/explorePlayback.test.ts`

- [ ] Write failing tests proving timestamp-based frame selection, bounded duration, cumulative-distance profile construction, and honest profile gaps.
- [ ] Run `npm test -- --runInBand src/capabilities/explore/domain/explorePlayback.test.ts` and confirm the missing module fails.
- [ ] Implement `buildExplorePlaybackFrame`, `explorePlaybackDurationMs`, and `buildExploreElevationProfile` as pure functions over `ExplorePoint[]`.
- [ ] Rerun the focused domain test and confirm it passes.

### Task 2: Reductive Adventure recap component

**Files:**
- Create: `src/capabilities/explore/components/ExploreAdventureRecap.tsx`
- Create: `src/capabilities/explore/components/ExploreAdventureRecap.test.tsx`

- [ ] Add component tests for Replay/Pause, missing-elevation behavior, progress selection, and accessibility adjustment.
- [ ] Implement one compact SVG elevation profile with an adjustable touch layer and one Replay/Pause action using existing tokens and controls.
- [ ] Run `npm test -- --runInBand src/capabilities/explore/components/ExploreAdventureRecap.test.tsx` and confirm it passes.

### Task 3: Synchronize the map and recap

**Files:**
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.tsx`
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

- [ ] Add regression coverage proving only a single manual recap exposes playback and that the displayed map receives a point prefix while replaying.
- [ ] Derive the eligible Adventure, playback frame, displayed point groups, fog cutoff, and cursor from one progress value.
- [ ] Fit the route on Replay, advance playback with a bounded timer, pause at completion, and suppress timed animation under Reduce Motion.
- [ ] Render the focused recap component and playback marker while preserving combined and ambient recap behavior.
- [ ] Run the focused Explore screen tests and confirm they pass.

### Task 4: Documentation and verification

**Files:**
- Modify: `src/capabilities/explore/FEATURE.md`
- Create: `docs/feature-briefs/explore-adventure-playback.md`
- Create: `docs/design-explorations/explore-accurate-trace-acquisition/03-converge.md`
- Create: `docs/design-explorations/explore-accurate-trace-acquisition/04-learning-release.md`
- Create: `docs/design-explorations/explore-accurate-trace-acquisition/05-evaluate-learning.md`

- [ ] Run focused playback, elevation, geometry, recap, and screen tests.
- [ ] Run `npm run verify:changed -- --run` and separate failures caused by unrelated dirty Goal/Money work.
- [ ] Run `git diff --check` on the Explore-owned files and review the final diff for unintended state-model, privacy, or navigation changes.
- [ ] Record signed-iPhone Replay, screen-lock route fidelity, fog timing, chart touch, Reduce Motion, battery, and thermal checks as required manual proof rather than claiming them from tests.

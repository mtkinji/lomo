# Explore Earned Terrain And Trustworthy Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render long Explore routes dependably and give user-created Places a wider, visibly softer familiarity bloom without claiming an unobserved path or park boundary.

**Architecture:** Derive fog and route presentation from one bounded topology-preserving geometry, then pass a separate bounded set of user-created Place coordinates to the native Silver Mist shader. The exact corridor reaches zero fog alpha; a three-times-radius Place bloom only suppresses fog alpha, preserving the semantic distinction.

**Decision revision:** Field discussion rejected activity classification as a reliable proxy for landscape meaning. The shipped learning direction uses the existing **Name current Place** action instead. Session policy retention remains useful recording provenance but no longer controls the broad reveal.

**Tech Stack:** TypeScript, Zustand persistence, React Native Maps/MapKit, Objective-C, Metal, Jest, patch-package.

---

## File map

- `src/capabilities/explore/domain/types.ts` — schema version and retained session policy.
- `src/capabilities/explore/domain/exploreState.ts` — create sessions with their policy.
- `src/capabilities/explore/domain/exploreGeometry.ts` — bounded reusable traces/segments.
- `src/capabilities/explore/domain/exploreElevation.ts` — altitude strokes built from bounded traces.
- `src/capabilities/explore/runtime/useExploreStore.ts` — foreground migration to schema 9.
- `src/capabilities/explore/runtime/exploreBackgroundTask.ts` — background migration and schema 9 persistence.
- `src/capabilities/explore/screens/ExploreMapScreen.tsx` — exact path casing, bounded altitude strokes, user-created Place selection, Android fallback, native props.
- `patches/react-native-maps+1.20.1.patch` — Place-coordinate inputs and partial-reveal Metal contract.
- Corresponding `*.test.*` files — red-green coverage for each contract.

### Task 1: Retain Adventure versus ambient intent

**Files:**

- Modify: `src/capabilities/explore/domain/types.ts`
- Modify: `src/capabilities/explore/domain/exploreState.ts`
- Modify: `src/capabilities/explore/domain/exploreState.test.ts`
- Modify: `src/capabilities/explore/runtime/useExploreStore.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundTask.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundTask.test.ts`

- [ ] Add failing assertions that a new Adventure session stores `trackingPolicy: 'adventure'`, a new ambient session stores `ambient`, and legacy completed sessions migrate conservatively to ambient.
- [ ] Run `npx jest src/capabilities/explore/domain/exploreState.test.ts src/capabilities/explore/runtime/exploreBackgroundTask.test.ts --runInBand`; expect the new assertions to fail because sessions do not retain policy and the schema is version 8.
- [ ] Add `trackingPolicy: ExploreTrackingPolicy` to `ExploreSession`, change `ExploreData.version` to `9`, set the field in `beginExploreSession`, and update foreground/background persistence envelopes to version 9.
- [ ] In both migration paths, preserve a valid stored session policy; use the normalized active tracking policy for a legacy active session and `ambient` for legacy completed sessions.
- [ ] Rerun the focused command; expect all assertions to pass.

### Task 2: Bound route presentation with the trusted fog topology

**Files:**

- Modify: `src/capabilities/explore/domain/exploreGeometry.ts`
- Modify: `src/capabilities/explore/domain/exploreGeometry.test.ts`
- Modify: `src/capabilities/explore/domain/exploreElevation.ts`
- Modify: `src/capabilities/explore/domain/exploreElevation.test.ts`

- [ ] Add a failing geometry test requiring `buildFogRenderGeometry` to expose renderable `traces` whose total segment count is bounded, preserves a switchback, and never bridges sessions or an untrusted gap; 60-to-120-meter freeway gaps require short timing plus plausible recorded speed and accuracy.
- [ ] Run `npx jest src/capabilities/explore/domain/exploreGeometry.test.ts src/capabilities/explore/domain/exploreElevation.test.ts --runInBand`; expect failure because renderable bounded traces are absent.
- [ ] Extend `ExploreFogRenderGeometry` with `traces`, and budget simplified traces and explicit segment pairs together so no renderer can recreate an unbounded point-pair list.
- [ ] Build altitude segments only from those bounded traces; keep null-altitude fallback color and the existing continuity contract.
- [ ] Rerun the focused command; expect all assertions to pass.

### Task 3: Render exact evidence and Place familiarity as separate layers

**Files:**

- Modify: `src/capabilities/explore/screens/ExploreMapScreen.tsx`
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`
- Modify: `src/capabilities/explore/screens/ExploreMetalFogContract.test.ts`
- Modify: `patches/react-native-maps+1.20.1.patch`

- [x] Add failing screen tests requiring a bounded route casing/altitude layer, user-created Place-only `fogPlaceCoordinates`, a three-times normal radius, no bloom from Adventure or automatic Places, and clearing the native array when fog is hidden.
- [x] Add a failing native contract test requiring Place coordinate properties, bounded native buffers, a Place-distance shader input, and partial alpha suppression rather than zero alpha for Place-only pixels.
- [ ] Run `npx jest src/capabilities/explore/screens/ExploreMapScreen.test.tsx src/capabilities/explore/screens/ExploreMetalFogContract.test.ts --runInBand`; expect the new contracts to fail.
- [x] Derive `fogGeometry` from all sessions and `createdPlaces` from only the current user's `source: 'user'` Places. Render one high-contrast casing polyline per bounded trace and bounded altitude inner strokes.
- [x] Add `EXPLORE_PLACE_REVEAL_RADIUS_M = EXPLORE_REVEAL_RADIUS_M * 3`, pass Place coordinates to iOS, and add user-created Place holes only to the lightest Android layer so the wider area remains visibly softer than the exact core.
- [x] Extend the native map patch with bounded Place props/buffers and a shader function that multiplies fog alpha down inside each Place bloom while exact explored distance still determines full clearing.
- [ ] Run `npx patch-package --error-on-fail`, then rerun the focused screen/native contract tests; expect all to pass.

### Task 4: Documentation, verification, and branch handoff

**Files:**

- Modify: `docs/feature-briefs/explore-capability.md`
- Modify: `src/capabilities/explore/FEATURE.md`

- [x] Link the accepted brief and state the durable contracts: precise route evidence, user-created Place familiarity, no park-boundary claim, and signed-device proof boundary.
- [ ] Run `npm run jtbd:lint` and correct any taxonomy or front-matter failures.
- [ ] Run focused Explore suites, `npm run verify:changed -- --run`, `npx patch-package --error-on-fail`, and `git diff --check`.
- [ ] If native tooling is available and the checkout owns the runtime lane, build the `react-native-maps` Simulator scheme and inspect the preview Adventure. Otherwise, report the exact runtime owner/blocker and leave signed-device hiking proof explicit.
- [ ] Review the full diff against the feature brief, fix Critical/Important findings, rerun affected verification, then commit on `codex/explore-earned-terrain`.

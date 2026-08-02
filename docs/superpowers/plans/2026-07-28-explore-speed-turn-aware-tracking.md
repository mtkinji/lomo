# Explore Speed- And Turn-Aware Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record trustworthy Explore paths densely enough to preserve residential turns and roundabouts while scaling straight-line storage by travel speed and retaining the existing battery sleep policies.

> **2026-08-01 follow-up:** Always Exploring now uses a 22-meter active vehicle observation interval with 200-meter/30-second background delivery deferral, while deliberate Adventure recording retains the 6-meter profile. Silver Mist receives explicit, topology-preserving route segments so freeway continuity no longer depends on uniformly subsampled explored-cell centers.

**Architecture:** Expo Location remains the observation source. A pure sampling policy receives trustworthy observations, uses speed-adjusted distance plus circular course change to decide which observations become canonical `ExplorePoint`s, and is shared by foreground Zustand ingestion and background task batches. Raw coordinates, timestamp, accuracy, speed, and course are persisted; fog and path continuity continue to use only recorded observations and the 60-meter gap rule. External road matching remains a later, optional presentation cache and never becomes evidence for fog or visits.

**Tech Stack:** Expo SDK 54, `expo-location`, TypeScript, Zustand persistence, Jest, React Native Maps, native iOS background location.

---

## Scope and release boundary

This tranche implements speed- and turn-aware capture. It does not send coordinates to a third party, introduce a map-matching provider, add a user-facing tracking mode, or let inferred road geometry clear fog. Persisting course and speed creates the raw-data seam required for a later shadow map-matching experiment.

### Task 1: Lock the accepted capture contract

**Files:**
- Modify: `docs/feature-briefs/explore-capability.md`
- Modify: `docs/design-explorations/explore-recap/06-use-cases-and-adaptive-gps.md`

- [x] **Step 1: Replace the fixed vehicle-spacing contract**

Document an approximately 0.8-second speed horizon clamped to 6-22 meters, course-change retention around 10 degrees above vehicle-like speed, dense observation during active vehicle movement, and deferred delivery for battery containment.

- [x] **Step 2: Record the truth boundary**

Document that raw points drive fog, visits, and history; later road-matched geometry is presentation-only, confidence-gated, separately cached, and provider/privacy gated.

### Task 2: Specify adaptive retention with failing tests

**Files:**
- Modify: `src/capabilities/explore/domain/explorePointPolicy.test.ts`
- Modify: `src/capabilities/explore/domain/explorePointPolicy.ts`

- [x] **Step 1: Add the failing speed-spacing tests**

Add tests proving that `adaptiveExploreSampleDistanceM(11.176)` is approximately 8.9 meters at 25 mph, slow movement floors at 6 meters, and highway movement caps at 22 meters.

- [x] **Step 2: Add the failing turn tests**

Add tests proving that circular course differences handle 355 to 5 degrees as 10 degrees, a trustworthy 10-degree course change is retained before the adaptive distance threshold, and low-speed heading jitter is not retained.

- [x] **Step 3: Run the red tests**

Run:

```bash
npx jest src/capabilities/explore/domain/explorePointPolicy.test.ts --runInBand
```

Expected: FAIL because adaptive spacing and course-aware decisions do not exist yet.

- [x] **Step 4: Implement the pure retention policy**

Implement:

```ts
export const EXPLORE_SAMPLE_HORIZON_SECONDS = 0.8;
export const MIN_EXPLORE_SAMPLE_DISTANCE_M = 6;
export const MAX_EXPLORE_SAMPLE_DISTANCE_M = 22;
export const COURSE_CHANGE_RETENTION_DEG = 10;
export const COURSE_RETENTION_MIN_SPEED_MPS = 3;

export function adaptiveExploreSampleDistanceM(speedMps: number | null): number;
export function circularCourseDifferenceDeg(from: number, to: number): number;
```

Update `acceptExplorePoint` so it still rejects invalid, stale, inaccurate, and sub-3-meter observations, then accepts a point when either adaptive distance is reached or trustworthy course change reaches the turn threshold.

- [x] **Step 5: Run the focused tests green**

Run:

```bash
npx jest src/capabilities/explore/domain/explorePointPolicy.test.ts --runInBand
```

Expected: PASS.

### Task 3: Preserve canonical speed and course

**Files:**
- Modify: `src/capabilities/explore/domain/types.ts`
- Modify: `src/capabilities/explore/domain/explorePointPolicy.ts`
- Modify: `src/capabilities/explore/domain/exploreState.test.ts`
- Modify: `src/capabilities/explore/domain/exploreAdaptiveTracking.test.ts`
- Modify: `src/capabilities/explore/domain/exploreDiscovery.test.ts`
- Modify: `src/capabilities/explore/domain/exploreRecordingMode.test.ts`
- Modify: `src/capabilities/explore/runtime/useExploreStore.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundTask.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundPolicy.ts`

- [x] **Step 1: Add failing raw-metadata persistence coverage**

Add tests that an accepted foreground sample and accepted background sample retain normalized `speedMps` and `courseDeg`, while legacy points migrate with `null` values.

- [x] **Step 2: Extend the canonical point type**

Add required fields:

```ts
speedMps: number | null;
courseDeg: number | null;
```

to `ExplorePoint`, while allowing incoming `ExploreLocationSample` fields to be absent or null until sanitized.

- [x] **Step 3: Add one sample-to-point adapter**

Implement `explorePointFromSample(id, sample)` in the point policy and use it from foreground and background ingestion so neither path silently drops motion metadata.

- [x] **Step 4: Upgrade persisted sessions**

Bump Explore persistence to version 8. Upgrade every active and completed point so missing legacy `speedMps` and `courseDeg` become `null`; preserve the existing version-7 territory rebuild behavior for stores older than version 7.

- [x] **Step 5: Run the domain and persistence tests**

Run:

```bash
npx jest src/capabilities/explore/domain/explorePointPolicy.test.ts src/capabilities/explore/domain/exploreState.test.ts src/capabilities/explore/runtime/exploreBackgroundPolicy.test.ts --runInBand
```

Expected: PASS.

### Task 4: Request dense vehicle observations without dense permanent storage

**Files:**
- Modify: `src/capabilities/explore/domain/exploreAdaptiveTracking.ts`
- Modify: `src/capabilities/explore/domain/exploreAdaptiveTracking.test.ts`
- Modify: `src/capabilities/explore/domain/exploreRecordingMode.ts`
- Modify: `src/capabilities/explore/domain/exploreRecordingMode.test.ts`
- Modify: `src/capabilities/explore/runtime/exploreLocationUpdates.test.ts`

- [x] **Step 1: Add failing profile tests**

Require the active vehicle profile to observe at 6 meters, use a 1-second Android time interval, and defer background delivery to approximately 60 meters or 15 seconds. Require a manual foreground adventure watcher to use the same 6-meter observation floor.

- [x] **Step 2: Run the red profile tests**

Run:

```bash
npx jest src/capabilities/explore/domain/exploreAdaptiveTracking.test.ts src/capabilities/explore/domain/exploreRecordingMode.test.ts src/capabilities/explore/runtime/exploreLocationUpdates.test.ts --runInBand
```

Expected: FAIL against the current 25-meter vehicle and 12-meter foreground profiles.

- [x] **Step 3: Implement observation profiles**

Set active vehicle observation to high accuracy, 6 meters, 1 second, deferred 60 meters/15 seconds. Set foreground Adventure observation to high accuracy, 6 meters, 1 second, without deferred delivery. Leave soft sleep, deep sleep, and the 200-meter exit wake region unchanged.

- [x] **Step 4: Run the profile tests green**

Run the same Jest command and expect PASS.

### Task 5: Feed GPS course through every runtime path

**Files:**
- Modify: `src/capabilities/explore/runtime/useExploreRecorder.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundTask.ts`
- Modify: `src/capabilities/explore/runtime/exploreBackgroundPolicy.test.ts`
- Modify: `src/capabilities/explore/screens/ExploreMapScreen.test.tsx`

- [x] **Step 1: Add course to both adapters**

Map Expo's `location.coords.heading` to `courseDeg` in the foreground recorder and background task. Do not start `watchHeadingAsync`; GPS course must arrive with the existing location observation.

- [x] **Step 2: Prove a residential turn and roundabout batch**

Add deterministic background-policy coverage in which 25-mph observations on a straight road are thinned near the adaptive spacing, while 6-meter points through successive 10-20-degree course changes are retained around a 90-degree corner and a roundabout.

- [x] **Step 3: Run Explore runtime tests**

Run:

```bash
npx jest src/capabilities/explore/runtime/exploreBackgroundPolicy.test.ts src/capabilities/explore/screens/ExploreMapScreen.test.tsx --runInBand
```

Expected: PASS with fog still based on canonical raw points.

### Task 6: Verify the complete tranche

**Files:**
- Regenerate: `docs/agent-code-map.md`

- [x] **Step 1: Run focused Explore tests**

```bash
npx jest src/capabilities/explore --runInBand
```

Expected: all Explore suites pass.

- [x] **Step 2: Regenerate the code map**

```bash
npm run agent:map
```

- [x] **Step 3: Run diff-aware verification**

```bash
npm run verify:changed -- --run
```

Expected: applicable typecheck, test typecheck, Jest, product lint, and architecture lint gates pass. Any unrelated dirty-lane failure must be reported separately rather than attributed to this tranche.

- [x] **Step 4: Review the final diff**

Confirm there is no map-matching network call, no analytics containing raw location/course/speed, no interpolation across a gap over 60 meters, and no user-facing tracking setting.

- [x] **Step 5: Record signed-device follow-up**

The implementation is not battery-proven until a signed iPhone drive covers a residential 90-degree turn, a roundabout, stop-and-go traffic, a stationary dwell, and a highway segment while collecting battery, thermal, sample-spacing, and discontinuity evidence.

## Later additive map-matching phase

After signed-device capture quality is trustworthy, a separate plan may add a post-outing matcher in shadow mode. That plan must select a provider or self-hosted implementation, obtain explicit approval before sending precise coordinates externally, store matched geometry separately from raw points with provider/version/confidence metadata, and render it only on high-confidence vehicle segments. It must never clear fog, establish Place visits, overwrite raw history, or block Explore while matching.

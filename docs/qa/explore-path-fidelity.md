# Explore path fidelity — Simulator acceptance

## Target

Recorded travel follows supplied movement: driving retains road turns, walking may take off-road passages, missing observations never become invented shortcuts. This is a testable Simulator build, not a claim of Strava parity or signed-device GPS performance.

## Source and runtime

- Checkout: `/Users/andrewwatanabe/Kwilt`, initial branch `main`, current shared branch `codex/plaid-production-completion` (switched by concurrent work), base `88cb2b77a700c9da59f482a0e2a30f2df781ccd2`, dirty working tree. Existing Explore work and unrelated Focus work retained.
- Simulator: iPhone 17 Pro, iOS 26.5, device `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`.
- Installed native shell: `com.andrewwatanabe.kwilt`, build 118. Updated TypeScript served by this checkout's existing Metro on port 8081. No native binary change is required for these fixes; this is not a signed production build.
- Local evidence directory: `/tmp/kwilt-path-fidelity/`. Precise historical locations are retained there, not committed as fixtures.

## Implementation contract

- Recorded paths no longer use fog's 256-primitive budget or its escalating simplification tolerance (up to 192 meters).
- Raw evidence is split before simplification. The displayed line has a fixed one-meter simplification tolerance. Long polylines are chunked with shared endpoints. The screen keeps full traces mounted and lets MapKit clip the viewport; panning does not rebuild or remove recorded-path overlays.
- Casing and altitude color consume identical validated geometry. Presentation corner-rounding is not applied to the recorded line.
- Gaps over ten seconds, distances over 100 meters, weak accuracy over 25 meters, and implausible speeds break observed traces. These are evidence guardrails, not road snapping.
- Apple directions estimates remain stored if already present but are excluded from observed display and territory rebuilding; opening a recap no longer requests them.
- Deliberate recording requests BestForNavigation, no provider distance filter, a 500 ms interval on Android, and no background deferral. It retains displacement of at least one meter at 3 mph or faster, keeping the three-meter noise guard at lower speeds. iOS ignores the interval option and controls actual delivery cadence. The existing airborne exception is unchanged.
- Deliberate tracking remains active through stillness; stationary observations still do not paint travel. Ambient power-saving behavior is preserved.
- Background callbacks are serialized. A hydrated runtime uses its current snapshot instead of rereading the entire sharded history; cold headless callbacks read after the previous batch finishes. This prevents overlapping batches from overwriting observations.
- Foreground/background manager transitions are serialized; a foreground watcher resolving after lock is removed. Hydration while inactive retains background acquisition.

## Verified evidence

### Existing scene

Explore-only storage was backed up before edits. The original live Simulator scene reproduced the supplied white diagonals. On reopening the same retained history after the renderer fix, the long crisscrossing white lines disappeared and road bends became visible. No historical raw coordinates were rewritten.

Local screenshot: `history-after.png`.

### Driving replay

Started Record a Path in the app. Replayed 36 dense historical road waypoints via `xcrun simctl location booted start --speed=10 --interval=1 -`, then stopped recording through the UI. This exercised native location callbacks, foreground recording, saved storage, and production rendering functions.

- 36 retained observations; one continuous trace; five displayed vertices.
- Maximum observation-to-reference deviation: 1.30 m.
- Maximum reference-vertex-to-displayed-line deviation: 2.52 m.
- Endpoint error: 0 m.

Files: `road-reference.json`, `road-waypoints.txt`, `drive-recording.json`.

### Walking replay

Started a separate recording. Supplied a synthetic 55-meter off-road walking passage with two right-angle turns at 1.5 m/s and one-second updates. This tests fidelity to supplied walking evidence, not the existence of a surveyed public passage.

- 18 retained observations; both turns retained; no road snapping.
- Observation-to-reference deviation below 0.01 m.
- Maximum reference-vertex-to-displayed-line deviation: 3.02 m.
- Endpoint shortfall: 1.43 m (below three-meter retention spacing).
- An initial 10.12-second wait between the stationary starting fix and movement correctly splits the initial singleton from the moving trace; it does not create a shortcut.

Files: `walk-reference.json`, `walk-waypoints.txt`, `walk-recording.json`, `walk-after.png`.

### Screen-lock replay

Replayed the same road reference at 7 m/s with the Simulator visibly locked. Native background observations were read from persisted storage before unlocking, so this proves background capture rather than queued foreground callbacks delivered after wake.

- 58 retained observations; 54 came through the background task.
- One continuous displayed trace, six displayed vertices.
- Maximum observation-to-reference deviation: 0.91 m.
- Maximum reference-vertex-to-displayed-line deviation: 1.96 m.
- Endpoint shortfall: 1.95 m (below retention spacing).
- Screen-lock, resume, and hydration races have separate deferred-promise regression tests. Independent code review identified and then verified closure of the hydration race.

File: `locked-drive-recording.json`. After the final hydration-race fix and a fresh app relaunch, a repeat at 10 m/s saved 36 observations (33 background), one continuous trace, 2.52 m maximum reference deviation and zero endpoint error. File: `final-locked-drive.json`.

### Regression and completion checks

- Six route geometry regressions failed against the former fog-based renderer and pass with the new renderer: long-history block corners, walking passage, nearby coordinates separated by an outage, quarter-mile miss, motorway sampling versus implausible jump, and viewport reentry.
- Directions-as-observed-travel regression failed before removal and passes afterward.
- Dense walking retention, invalid coordinates/timestamps, and deliberate sleep-policy regressions failed before fixes and pass afterward.
- Twelve concurrent background observations previously collapsed to one; all twelve survive with serialized batch processing. Hydrated capture is tested to avoid full-history reads.
- A controlled lock/resume race reproduced a late foreground watcher remaining live after backgrounding; it passes after serialized transitions.
- The initial completion run passed 80 selected Jest suites / 751 tests plus app/test typechecks, product/architecture gates and 123 Deno tests selected by the full dirty diff. The final current-source Explore run passes 34 suites / 204 tests (`explore-handoff-tests.log`). The full dirty-checkout handoff gate (`verify-handoff.log`) passes app/test typechecks and 1,189 Jest suites / 7,419 tests, but three unrelated migration suites fail because SQL files referenced by meal-planning and safety tests are missing. Additional Money/Plan work arrived in the shared checkout during this task and expanded the selected gate to the full suite. These failures are not claimed fixed; no unrelated migrations were edited.

## Remaining release proof

Physical-device drive/walk comparisons, tunnels and poor GPS, long locked recordings, permission interruptions, battery measurements, and side-by-side Strava field recordings remain required before asserting production route accuracy. Older sparse recordings cannot recover paths that were never observed. Recap redesign remains a separate task.

## Follow-up: inspection crash

The user reported a crash at 11:43:48 on September 8. The Simulator log and `Kwilt-2026-09-08-114412.ips` identify `NSInvalidArgumentException: object cannot be nil`, at `AIRMap.m:270` in `insertReactSubview:atIndex:`, called by Fabric legacy interop deferred mounting. Panning/zooming reproduced the identical exception at 11:47:07 (PID 22265).

Viewport-dependent path filtering removed and reinserted native overlay children while inspecting the map. The screen now keeps precision-bounded full traces mounted, delegating clipping to MapKit. This removes that mount churn without weakening path accuracy or joining gaps. The retained original adventure history has 200 traces / 3,515 simplified vertices, so this does not send the full 72,885-point ambient history to path overlays. A component regression fails before the fix and passes after: leaving and returning to a route keeps the same overlay instances and coordinate references. All 36 map-screen tests pass.

This fixes the inspection trigger; it is not a general repair of the legacy map/Fabric bridge. The native dependency and its Silver Mist patch remain unchanged.

Runtime verification after this fix used the same build-118 native shell and Metro checkout, fresh process PID 22726: repeated vertical/lateral pans, double-tap zoom, and recentering stayed open for more than three minutes with no new termination exception. Source regression log: `crash-regression-green.log`; runtime log: `crash-fix-runtime.log`. The completion gate reran because source changed: `verify-crash-fix.log` passes app/test typechecks and 1,189 Jest suites / 7,420 tests; the same three unrelated missing-migration suites fail.

## Follow-up: white outlines covering elevation colors

The user reported reduced green after the inspection crash fix. Native inspection confirmed matching outline and color overlays with valid paths and color arrays. Reordering the existing color overlays above outlines in the live Simulator immediately restored green without changing geometry. `AIRMapPolyline.update` removes and re-adds overlays after prop changes, so React child order alone is not a persistent native drawing order.

Explore now assigns outline `zIndex=1` and color `zIndex=2`. The existing Maps 1.20.1 patch exports polyline zIndex and inserts refreshed polylines below higher layers. The Silver Mist implementation is preserved. The native Foundation regression executes the production insertion method and fails on the old append-only behavior; repeated outline/color refreshes and late outlines pass with ordered insertion. Command: `node --test scripts/maps/overlay-order.test.mjs`. All 36 map-screen tests pass, including explicit color-above-outline and stable viewport overlay checks. Native Simulator rebuild and visual verification are required for this patch; Metro alone cannot deliver it.

The saved patch was applied with `patch-package --error-on-fail` to a fresh official 1.20.1 tarball in an isolated temporary directory; patched AIRMap and AIRMapPolyline files exactly match the compiled sources. Independent read-only review found no important issues and reran the native ordering regression successfully.

Native verification completed: Xcode Debug Simulator build succeeded (`color-native-build.log`) and the rebuilt build-118 shell was installed, preserving app data. This rebuild includes the current dirty checkout's native sources, including existing unrelated Focus edits. New app process PID 84248 and Metro PID 84569 use the same checkout/branch/base; Metro was restarted on port 8081 because the previous server had stopped. The map kept its green/elevation strokes through vertical and lateral pans, repeated zoom and recenter operations, and fresh native location observations from the local road replay. No termination exception appeared in `color-fix-runtime.log`. Final screenshot: `color-restored.png`.

Completion check `verify-color-fix.log`: app and test typechecks pass; 1,189 Jest suites / 7,420 tests pass, with the same three unrelated missing-migration suites failing. The native ordering regression and all 36 map-screen tests pass separately. No path coordinates or elevation color values changed for this fix. Physical-device/release verification remains separate.

## Manual sampling follow-up

Manual recording now requests zero provider distance filtering and a 500 ms Android interval, retaining one-meter displacement at 3 mph and above rather than increasing distance thresholds with speed. Below that speed, the three-meter noise guard remains. Ambient/presence profiles, fog rendering, and existing path gap guards are unchanged. The previous unused 6–22 m speed-horizon helper now supplies the actual retention rule.

Regression-first verification: the point-retention and provider-profile tests failed with the old code, then all four focused suites passed (41 tests), including foreground watcher options and cycling/driving background profiles. A fresh manual Simulator recording at 4 mph retained 22 consecutive moving observations with a median interval of 1.004 s (maximum 1.005 s), median spacing 1.797 m. Local evidence: `/tmp/kwilt-path-fidelity/sampling-live.json`. This proves native-to-saved retention at this supplied speed, not physical-device GPS quality, driving corner fidelity, or battery impact.

Runtime provenance: shared `/Users/andrewwatanabe/Kwilt`, branch `codex/plaid-production-completion`, HEAD `88cb2b77a700c9da59f482a0e2a30f2df781ccd2`, dirty checkout including unrelated work. Existing Simulator native shell; this follow-up changes TypeScript only, delivered by Metro PID 46468 on port 8081 from that checkout. Recording was stopped after verification.

Completion check: `sampling-verify.log` passes app/test typechecks and 1,192 Jest suites / 7,441 tests. The same three unrelated missing-migration suites fail (`contextualUgcSafetyMigration`, `individualFirstMealPlanMigration`, `legacyMealPlanScaleRepairMigration`). `git diff --check` passes.

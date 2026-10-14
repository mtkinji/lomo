# App responsiveness pass — 14 October 2026

Objective: identify and fix ten distinct performance problems on `perf/app-responsiveness`.
Baseline: `58258dcda347608febea777506da7fdc0c7b1e27`, ordinary Kwilt checkout.
Preserve behavior and data. Count a fix only after a failing regression reproduces its
unnecessary work and a passing check verifies both the reduction and behavior.
This is a local implementation pass, not a TestFlight or production release.

## Verified fixes (focused verification)

1. **Menu animation waits for React rendering.** Start UI-thread motion in the tap
   action before publishing menu visibility. Regression checks animation ordering,
   close/reopen, Reduce Motion; existing action-only consumers stay isolated.
   Instrumented iPhone 17 Pro Simulator: before, 32–38 ms to schedule animation;
   one first-movement sample 49 ms. After, 0.2–0.4 ms to schedule and 4–16 ms
   first movement in two samples. These are handler-to-worklet timings, not
   physical-touch-to-display or iPhone benchmarks. Probes removed afterward.
2. **Notification subscription scans inventory on unrelated UI writes.** Guard by
   actual notification inputs. Regression reproduces 1,000 title reads on a
   UI-only update; now zero. Inventory changes still scan. Notification suite:
   28 tests passed, including scheduling, hydration and permission contracts.
3. **Closed global Search computes results and recipe inventory.** Mount the
   search body only while its modal is open (the modal already closes immediately).
   Regression checks zero recommendation/catalog work before and after a visit,
   plus current results after reopening. Focused component test passed.
4. **Preferences serialize on updates to excluded domain/sync fields.** Deduplicate
   immutable partialized snapshots before JSON serialization. Regression: 20
   status updates previously wrote `kwilt-store` 20 times; now zero writes and
   zero JSON serialization, while a real preference change persists. Domain
   isolation tests passed. Adapter failure/retry, overlapping writes, removal and
   rehydration invalidation checks passed.

5. **Explore persistence scans unchanged territory.** Reuse the durable bucket
   index when the immutable cell record is unchanged. Regression: preference-only
   updates perform zero cell reads. Changed/deleted cells, failed index commits,
   retry, removal/rewrite, migration and history round trips are covered.
6. **Background GPS batches repeatedly copy growing territory and point history.**
   Append accepted points together while retaining sequential acceptance, movement
   and geometry rules. Three accepted points now copy territory once instead of
   three times. Batched territory/tracking matches sequential processing; existing
   background policy, geometry and task checks pass.
7. **Unchanged sync pulls replace inventory arrays.** Preserve Arcs, Goals and
   Activities array identity when every record and its position is unchanged.
   Repeated-pull regression checks identity; existing account isolation, realtime,
   remote-update, retry and overlapping-local-edit checks pass.
8. **To-do sorting repeatedly parses dates inside comparisons.** Prepare date keys
   once per item and reuse a string collator when available. A shuffled 1,000-item
   fixture goes from 15,790 date reads to 1,000, with identical order and original
   item identities. String ordering, missing dates and manual fallback are covered.
9. **Home delivery polling continues offscreen.** Gate delivery/goal-note refreshes
   on navigation focus. A simulated 90 seconds away plus realtime and foreground
   events previously issued five refreshes; now zero. Refocusing fetches current
   content, and late responses from before blur/background are ignored. This
   applies to delivery cards; the separate main feed poll is outside this fix.
10. **Sync serializes every record again after a successful push.** Retain the
    signatures computed for that push and adopt them only after success for the
    same account/generation. A 1,000-record push now serializes signatures 1,000
    times instead of 2,000. The next push recomputes signatures, preserving detection
    of later edits even when an object is reused; there is no persistent object cache.

## Verification provenance

- Focused tests reproduce unnecessary work before each fix and pass afterward.
- Complete-patch local gate: `npm run verify:local -- --run`. The current execution
  result and omitted-file report are in `.git/kwilt-verification/latest.json` and
  available via `npm run verify:local -- --report`; the final handoff reports its
  actual outcome. This is not the integration/release gate.
- Menu-only Simulator verification used this checkout and branch at the baseline
  HEAD plus the dirty menu patch, a locally built Debug iOS app (native build 127),
  and Metro from this checkout on port 8081. Simulator UDID:
  `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`. Open, swipe-close and reopen were checked.
  Temporary timing probes were removed, and that Metro process was stopped.
- The later nine fixes have automated regression evidence; the complete patch has
  not been installed on a physical iPhone or released through TestFlight. Do not
  interpret work-count reductions as end-to-end device latency measurements.

## Completion gates

- Ten distinct fixes with regression evidence and relevant behavior checks.
- Local verification on the complete final patch; review omitted-file report.
- Record native/runtime evidence separately. Physical iPhone/TestFlight confirmation
  remains a release acceptance gate and is not implied by automated tests.

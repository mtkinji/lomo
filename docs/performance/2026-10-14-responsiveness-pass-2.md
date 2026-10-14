# App responsiveness — second ten fixes, 14 October 2026

Scope: ten additional bottlenecks beyond `2026-10-14-responsiveness.md`.
Same ordinary checkout and `perf/app-responsiveness` branch; baseline HEAD
`58258dcda347608febea777506da7fdc0c7b1e27` plus the first pass's uncommitted patch.
No dependencies, server schema, visual design, or release configuration changed.

## Ten additional fixes

1. **Hidden Plan recommendation clock.** The 30-second clock previously rerendered
   retained Plan screens after navigation and in the background. Its subscription
   now follows screen focus, ignores background ticks and catches up on return.
   Regression reproduces a hidden-screen time change over 90 seconds; now none.
2. **Timestamp-only widget writes/reloads.** Fresh timestamps nested in unchanged
   activity-view payloads defeated content deduplication. Comparison now ignores
   only those publication timestamps as well as the existing root timestamp.
   Regression: one unnecessary App Group write/reload becomes zero; content
   changes, removal and serialized Focus start/stop still publish.
3. **Eager recipe compilation during shell import.** Importing recipe metadata
   previously built all 600 detailed ingredient/instruction graphs. Compilation
   is lazy and cached, and Recipe Home's equipment-usage computation is also lazy.
   Regression: 600 compiler calls at import become zero, including metadata lookup;
   first inventory use still produces 600 valid recipes and reuses the result.
   This removes unrelated startup work; first recipe inventory use still compiles
   the catalog synchronously and is not claimed to be faster.
4. **Repeated to-do filter preparation.** Compile wildcard patterns and normalize
   date filter operands once per filtering invocation. The 1,000-item wildcard
   fixture previously constructed 1,000 RegExp objects; now one, with identical
   results. Relative-date, group, array and missing-value behavior is covered.
5. **Home main-feed polling while hidden.** This is the separate main feed, not
   the delivery-card polling fixed in pass one. Focus now gates initial requests,
   periodic refresh and foreground restoration, and invalidates in-flight results
   on blur. Refocus reauthorizes remembered pages; a 60-post fixture retains its
   59 still-authorized posts after backgrounding while away. No hidden requests.
6. **Streak uploads triggered by unrelated UI updates.** The selector allocated
   a fresh object with no equality function, so every store update scheduled a
   network write. Shallow input comparison now restricts it to actual streak
   changes. Regression: 20 UI updates caused 20 uploads; now zero, while a real
   streak change still uploads. Account and remote-merge tests remain in place.
7. **Repeated native Spotlight indexing of identical titles.** Note-only edits
   rebuilt the same native search index. Cache only successfully indexed payloads,
   serialize native operations, invalidate on clear/failure, and retry failures.
   Regression: initial index plus 20 note edits made 21 native calls; now one.
   Title changes and clearing still update; in-flight clear ordering is covered.
8. **Plan scores ineligible tasks.** Daily Plan ranked the entire inventory before
   discarding already scheduled/dismissed/closed tasks. Eligibility filtering now
   precedes independent scoring. Regression: 1,000 scheduled tasks' rich notes
   are no longer read/scored, with identical proposals for eligible tasks.
9. **Time picker rescans calendar for every candidate.** Each 15-minute candidate
   previously scanned all busy/proposed intervals. A sorted start-time index and
   prefix maximum end-time allow logarithmic overlap queries. The 500-interval
   fixture drops from 14,500 start reads to 500. Direct-reference tests retain
   strict touching boundaries, nested/unsorted intervals and invalid-date behavior.
10. **Explore rescans the world after a recorded point.** Pass one avoided scans
    when territory was unchanged; recording a point still rebuilt the full map
    index. Trusted immutable point mutations now provide bounded change hints,
    and persistence clones/serializes only affected buckets. The 1,000-cell
    fixture drops from 1,014 old-cell reads to fewer than 100. Hints retain IDs,
    not old map objects; unknown changes, divergent branches and evicted hints
    use the full diff. Coalesced updates, failed index commits/retry, deletion,
    clearing, hydration, and unchanged storage format are covered.

## Evidence and remaining boundaries

Each optimization has a regression observed failing before its implementation,
then passing with behavior checks. Complete-patch verification uses
`npm run verify:local -- --run`; the actual latest result is available through
`npm run verify:local -- --report`. It includes the previous ten fixes because
both passes share this branch. An independent read-only review checks correctness.

This pass has local automated evidence, not physical-device timing or TestFlight
acceptance. No runtime was started, no build was uploaded, and no changes were
committed/pushed. The menu-only Simulator timing in pass one does not benchmark
these additional changes. Native Spotlight/widget delivery and real iPhone
responsiveness remain separate build/device acceptance checks.

# Budget transaction native evidence — partial acceptance

Source: `/Users/andrewwatanabe/Kwilt`, branch `codex/simple-dinner-expansion`, HEAD `94f6c1ac31d245a600d21c5b71e144308894f334`, dirty with this and earlier Budget changes plus unrelated SQL work. No new commit, build, upload or deployment.

Runtime: iPhone 17 Pro Simulator `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`, iOS 26.5. Existing development host `com.andrewwatanabe.kwilt`, version 1.0.127/build 127; no new native host built. The running native Platform constants report React Native **0.83.10**, matching installed React Native. Current Expo 55.0.28 / React 19.2.0 JavaScript came from `/Users/andrewwatanabe/Kwilt/scripts/money/native-harness` on `localhost:8081`; root production-backed startup was not used.

The fixture imports real transaction inventory/detail screens, Money frame, navigation and owned UI. Money data is synthetic, Supabase/analytics are blocked, AsyncStorage is in-memory, fetch/XHR is loopback-only and writes reject. This proves named UI behavior with substituted data, not backend integration. See [reproduction and isolation](../../../../scripts/money/native-harness/README.md).

## Observed

- 4,000 rows open with 3,608 in the current-month view; All history updates to 4,000/4,000. The fixture deliberately has 90% current-month rows and a dated remainder, including some future-dated synthetic entries.
- Oldest-first sorting exposes January 1, 2025. Opening that row shows the matching merchant/date/$49.43 and returns to the inventory.
- Needs review updates the full-history view to 12/4,000. Date/filter/sort menus render and selections update the real list. Menu overlays were visible to screenshot/coordinate interaction, but the automation accessibility tree omitted their items; this is not a VoiceOver acceptance result.
- Stale-warning text remains above usable rows. Explicit refresh clears it; returning to the fixture shows one completed refresh. Initial-error Try again also returns to rows. These are synthetic provider completions, not network or bank-sync results.
- Zero transactions shows the existing connection empty state.
- 10,000 rows also open at ordinary text size, with 9,022 current-month rows and the full 10,000 total displayed. This is an opening/render observation, not a latency measurement or tail-scroll result.
- At `accessibility-large`, the initial screenshot showed clipped count/control badges and nearly unreadable merchant names. After the responsive repair, a fresh launch shows full title, count, wrapped merchant/category and amount. Overage category/amount stack; opening its first purchase opens the real coverage drawer. No write attempted.

Images: [before](large-text-before.png), [after](large-text-after.png), [overage](overage-large-text.png). Before/after use different filter state and therefore are layout evidence, not equal-data pixel comparisons.

## Open proof and findings

- Automated wheel gestures did not scroll; drag attempts selected rows or left the view unchanged. Scrolling beyond the initial native window, reaching the last row, position restoration and pull-to-refresh remain **unverified**. Sorting to oldest is not tail-scroll proof.
- Changing Dynamic Type while the app was already open produced stale text measurements, including clipped labels/amounts. A fresh host launch at that size rendered correctly. In-session resizing remains **failed/incomplete**, with cause not yet isolated; no general accessibility pass is claimed.
- Filtered-empty, remaining sort options, large-text active badges and other shared inventory callers need native follow-up. Shared behavior is covered only by the named automated checks/source review.
- No recorded native latency distribution, release-mode profiling, physical-device, signed-in household or current-backend save/reopen/retry acceptance.
- Metro logs show existing store/entitlement require-cycle warnings; no runtime exception occurred in the named completed cases. No claim that these warnings are resolved.

Automated evidence: initial 4k regression mounted all 4,000 controls and failed (42.265s Jest runtime, not native latency). After virtualization and responsive repairs, 19 focused tests passed in 1.414s; all transaction IDs remain available to the virtual list. The timing difference is not an end-user speedup measurement. Read-only source review completed with no remaining concrete issue after the overage layout correction.

Cleanup: restored the original Simulator content size (`large`), terminated the fixture host, stopped this task's Metro process, and shut down the Simulator booted for this check. The first completion gate caught two recipe-screen assertions for the old fixed control height; these now assert the same 34-point minimum as the shared component. No recipe behavior changed. The fixture XHR wrapper received a typing-only cleanup after runtime checks; production UI source stayed unchanged.

Final scoped completion receipt: `npm run verify:local -- --run --files ...` selected 26 files and reported 86 other changed files outside scope. Passed in 146.56s: app/test types, whitespace, code health (no new ratchet findings), architecture (zero warnings), backend/release contract tests, and the verifier-selected full Jest run (1,315 suites; 8,255 passed, two skipped; two snapshots). The whole test run was repeated because of the shared-control assertion failures; the final receipt is `/tmp/kwilt-transaction-verify-local-final.log`. This does not approve omitted changes, integration or deployment. [Source hashes](source-hashes.json) identify the checked source and fixture independently of the dirty checkout's unchanged HEAD.

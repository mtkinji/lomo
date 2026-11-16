# Budget transaction rendering

Scope: preserve the transaction inventory's existing product contract while bounding mounted row work. Source checkout is `/Users/andrewwatanabe/Kwilt`, branch `codex/simple-dinner-expansion`, HEAD `94f6c1ac31d245a600d21c5b71e144308894f334`, dirty with earlier Budget and unrelated SQL work. No worktree or parallel runtime.

## UI contract

- Job: review household transactions and open the relevant transaction without a long pause or losing date/filter context.
- Current-task success: read merchant, assignment and amount, filter/sort/date-scope the complete inventory, open a transaction, return and refresh.
- Next-task orientation: transaction detail owns corrections and coverage review.
- Authority: existing Money transaction/date-scope briefs and native navigation contract; Kwilt UI constitution/tokens; Candidate inventory pattern (`PageHeader`, `InventoryControlGroup`, domain row, `CanvasFlatList`). No new upstream component is being localized. External exemplar: N/A.
- Three-second read and scan order: inventory identity -> controls/count -> dated transactions. Primary action: open a transaction. Secondary: date/filter/sort and refresh. Detail remains on the existing detail route.
- Reuse: `MoneyScreenFrame` for header/recovery/refresh, `MoneyInventoryListFrame` controls/count, existing transaction row, owned `CanvasFlatList` for virtual scrolling. Candidate maturity is unchanged.
- Must not add: new visible controls, data truncation, changed accounting, cards per row, confirmation steps, or a nested virtual list inside a vertical ScrollView.
- States: ready, loading, empty, filtered empty, stale data/error, refreshing, long merchant/category names, large text; normal inventory and overage-review route.
- Reduction/craft pass: preserve current hierarchy and row styling; remove eager offscreen rendering. This is a performance repair, not a visual redesign.
- Proof path: 4k-row mounting regression; existing navigation/filter/transfer/overage tests; shared frame refresh/error tests; isolated native fixture using real inventory screen and owned components. Record native host/build and current JS provenance separately; no production-backed app startup or household writes.

## Implementation and evidence

1. Reproduce initial mounting: 4,000 current-month transactions mounted all 4,000 transaction controls (expected fewer than 100). The Jest regression failed in 42.265 seconds; this is test-renderer cost, not phone latency.
2. Add a scroll-content composition slot to the Money frame; default screens retain their current scroll behavior. The inventory supplies one virtual list with warning and controls in its header.
3. Flatten date/group headings and transactions into stable virtual rows, including overage review. Keep complete inventory counts and filters. Avoid repeated date formatting and copying a growing date-group array.
4. Run focused regressions and inspect native behavior, scrolling, overlays, large text and error/refresh recovery. Native proof remains required; tests alone do not complete this UI slice.
5. Review, generate code map before verification, then run scoped local verification. Keep integration, backend deployment and physical-device acceptance separate.

## Native follow-up

The real screen ran in an isolated synthetic Expo fixture on iPhone 17 Pro / iOS 26.5. The existing native host reports React Native 0.83.10, matching the installed JavaScript dependency. Detailed partial acceptance and images are in [the evidence record](../../engineering/evidence/budget-native-2026-11-01/README.md).

Native large-text repro exposed clipped counts/badges and truncated merchant names. Following that visual regression, the inventory now stacks controls/counts and transaction metadata when available width divided by font scale is below 280, permits merchant/category/review text to wrap, and moves freshness below the title. Overage headers use the same expanded layout. The shared control surface retains its compact minimum height while allowing scaled badges to grow. The Money list frame uses one accessible count text; Accounts remains a caller. This is a responsive repair within the existing component family, not a new pattern or maturity promotion.

Focused tests retain all 4,000 transaction IDs while mounting fewer than 100 initial controls, preserve exact navigation including coverage-review flags, and cover expanded text. Nineteen tests passed. Read-only review found no remaining concrete source issues after the overage-header follow-up. Native gesture scrolling/pull-refresh, a real tail scroll, in-session text resizing and full physical-device/backend acceptance remain open.

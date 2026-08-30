# Screen Time rule-system consolidation implementation plan

> Status: accepted for implementation on `codex/chat-parity-next` in the existing checkout.
> Source brief: `docs/feature-briefs/screen-time-rule-system-consolidation.md`

## Outcome

Kwilt has one Screen Time rule grammar, one sentence-based composer, one personal-rule inventory, and one personal enforcement lifecycle. Money contributes budget-condition data and truth, but no longer owns a parallel app-control editor, policy store, foreground reconciler, or Screen Time inventory row.

Existing development rules are intentionally discarded. The reset must clear every known native rule or monitor before deleting the persisted legacy records so an invisible block cannot survive the cutover.

## Product and UI contract

- User job: create and govern a readable rule for selected apps or categories.
- Three-second read: `Allow access to [targets]` or `Pause access to [targets]`, followed by one or more `When …` condition sentences.
- The target field, outcome field, condition subject, operator, value, and All/Any connector are the only interactive grammar tokens.
- Rule lifecycle is managed from the rule-list switch and the edit-page overflow menu; destructive deletion is confirmed.
- Money category context may prefill a budget condition, but it opens the same Settings-owned composer and still requires Apple app/category selection.
- Loading, empty, disabled, error, destructive-confirmation, and Simulator/no-native-confirmation states remain explicit.

## Task 1 — Add the versioned, fail-safe clean reset

- [x] Add a `ruleSystemVersion` field to normalized Screen Time settings. Existing persisted settings without it normalize to version 0; new/default settings use version 1.
- [x] Add tests proving old persisted composite and V1 personal rules remain visible to the cleanup runner until it succeeds, while a new store is already current.
- [x] Export a Money-storage retirement operation that loads the old policy set, removes its AsyncStorage key, resets the in-memory cache, and notifies listeners.
- [x] Add a pure cleanup planner that enumerates unique composite rule IDs, V1 usage-monitor IDs, V1 selection IDs, and Money selection IDs.
- [x] Add an async cleanup runner with injected native/storage boundaries. On physical iOS, any failed native clear aborts persistence deletion. Simulator/non-iOS clears records without pretending native enforcement was proven.
- [x] Run the reset after app and Focus stores hydrate, before ordinary Screen Time reconciliation.

## Task 2 — Make composite rules the only personal inventory and runtime

- [x] Remove legacy V1 and Money rows from `buildMyScreenTimeRuleInventory` and its tests.
- [x] Remove Money settings loading and Money destinations from the Screen Time settings page.
- [x] Remove V1 edit/toggle/delete branches from Screen Time settings and the sentence composer.
- [x] Stop the separate Money foreground reconciler.
- [x] Evaluate budget conditions from the Money snapshot/provider contract without reading the retired Money app-control policy store.
- [x] Keep the older code only where required to read and safely clear pre-cutover state; do not expose it as current product behavior.

## Task 3 — Route Money context into the canonical composer

- [x] Add a typed suggested-budget-condition launch parameter.
- [x] Initialize a new sentence-composer draft from that suggestion.
- [x] Change Money category `App controls` to navigate to `SettingsScreenTimeRuleBuilder` with the category suggestion.
- [x] Change conversational `review_money_app_control` navigation to the same canonical composer route.
- [x] Remove Money app-control and budget-picker routes from the Money stack.
- [x] Remove any composer logic that transfers or deletes a Money-owned rule during save.

## Task 4 — Consolidate explanation and temporary-open behavior

- [x] Project only canonical composite personal rules into the root Screen Time handoff/guide.
- [x] Apply temporary-open state to canonical rule lifecycle rather than Money policy review state.
- [x] Remove obsolete Money review mutations from Money data context when no caller remains.
- [x] Preserve a direct evidence destination for budget conditions (the relevant Money category), without restoring a Money-owned rule editor.

## Task 5 — Verify the real flow

- [x] Run focused domain, cleanup, navigation, Settings inventory, composer, handoff, and runtime Jest suites.
- [x] Run `npm run product:lint` and `npm run architecture:lint` for ownership and component contracts.
- [ ] Run `npm run verify:changed -- --run` once after the intended slice is complete.
- [ ] Rebuild/reload the current iOS Simulator from this checkout and verify: Settings > Screen Time > Add rule; Money category > App controls; add/edit/toggle/delete; budget condition selection; All/Any; no old Money editor.
- [ ] Keep physical-device enforcement as a separate proof gate: test native cleanup and a newly saved budget-backed rule on an entitlement-enabled iPhone.

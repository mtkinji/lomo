# Category rollover start implementation plan

> Execute inline with executing-plans; preserve the ordinary checkout and unrelated edits.

**Goal:** Make rollover explicit, progressively disclose its start and opening balance, and show the same result in preview and Money balances.
**Architecture:** Store a validated rollover policy on the existing RLS-protected budget plan. A shared pure projection consumes normalized transactions and an effective-month budget schedule; a database trigger preserves subsequent monthly amount changes. Existing reserve accounts retain their expected-need behavior. No annual reset in this slice.
**Tech stack:** React Native/Expo, owned SettingsSurface and PickerFields, TypeScript/Jest, PostgreSQL migration.

## UI contract
Job: Join midyear and decide how much remains without reconstructing category arithmetic.
Authority: accepted conversation, Money JTBD, UI constitution and input guidance; existing settings drawer composition is the local precedent.
Three-second read: Rollover is on/off; details appear only when on.
Primary action: Save changes. Close discards draft controls.
Scan order: toggle, start/balance, current-month preview.
Reveal later: historical monthly amount and history confirmation only for backdating.
Reuse: SettingsGroup/ToggleRow/TextInputRow/Row, EnumPickerField, existing drawer host.
References: Monarch and Lunch Money preserve explicit start/balance; translate to owned controls; reject dashboard complexity. YNAB informs continuity, not overspending policy.
States: off/on, existing reserve, negative balance, invalid amount, historical activity unavailable, saving/failure, persisted reopening.
Proof: focused domain/repository tests, scoped verify:local, real Simulator drawer where the installed app and account permit access. No deployment or real financial mutations without explicit scope.

## Tasks
- [x] Add failing January-to-October, negative carry, split/refund/excluded activity, missing-history and before-start tests in domain/categoryRollover.test.ts.
- [x] Implement validated policy and shared projection in domain/categoryRollover.ts. Keep opening balance signed; historical pending transactions do not affect carry.
- [x] Persist policy atomically with rollover_enabled; read compatibly before migration. Add migration constraint and effective-month budget update trigger. Test repository validation and receipt behavior.
- [x] Apply projection to snapshot, historical view and governed-plan projection before totals. Test agreement and policy preservation.
- [x] Replace Funding rhythm with rollover editor; seed draft on each opening; save policy only from Save changes; preserve legacy reserve expected needs.
- [ ] Run reduction pass, focused tests, scoped task verification and native proof. Record exact remaining release gates.

## Implementation and verification record

Implemented locally on `codex/rollover-start` in `/Users/andrewwatanabe/Kwilt`; uncommitted and unpushed. The checkout advanced externally from `7f34343e` to `94cf0e69` (widget contrast change) during this task; the final scoped verification ran against `94cf0e69` plus this rollover diff. No worktree was created.

- Final scoped `verify:local`: PASS, 242 suites, 1,796 tests passed, 2 skipped; app/test types, backend types/tests, code health, product lint and architecture lint passed. All 30 changed paths were selected. This record was appended afterward; no runtime source changed after the pass.
- SQL migration and durable SQL regression ran successfully in disposable local PGlite PostgreSQL. Local Supabase/Docker was unavailable. No remote migration was applied.
- Focused review findings were addressed: transfers/repayments excluded, disabling rollover clears carry, confirmed monthly funding clears stale reserve display even if refresh fails, and settings use the current category while browsing historical months. Final focused reviewer recheck found no remaining blocker.
- Simulator: iPhone 17 Pro / iOS 26.5, existing installed development binary `com.andrewwatanabe.kwilt`, current checkout JavaScript served through Metro on port 8081. No native binary rebuild. Confirmed Rollover wording, toggle disclosure and close/reopen discarding unsaved changes. Evidence: `/tmp/kwilt-rollover-evidence/rollover-on.png` and `rollover-off.png`.
- Native proof remains partial: computer automation could not scroll the lower settings body, so the native month picker, lower preview and keyboard traversal are unverified. Automated component/domain tests cover those controls and calculations. Do not describe the entire native flow as verified.

Remaining release gates: resolve/verify lower-body scrolling and picker/keyboard access on Simulator or physical device; apply migration before deploying dependent Money tools/app changes; verify authorized save/reload in a migrated environment; run integration checks for the actual release candidate. No production category data was edited. Annual reset remains deferred.

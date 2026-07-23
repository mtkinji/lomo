# Kwilt Money frozen source and parity manifest

**Frozen:** 2026-07-22 (America/Denver)

**Host repository:** `/Users/andrewwatanabe/Kwilt`

**Host branch:** `codex/kwilt-money-integration`

**Host branch point:** `c436be6690352ecaa8ff15c1e599e332229d3697`

**Standalone source repository:** `/Users/andrewwatanabe/Documents/Kwilt Budget`

**Selected source:** `df383c3ac1538dff0a83b43a21ff3e45c024298b`

**Source provenance:** merge commit for `mtkinji/kwilt-budget` PR #7, merging
`983cd7fa24af172babc15297a2153aae51b5d772` into standalone `main`.

The feature commit and merge commit have identical trees. The source checkout was clean when
the contract was frozen. All source inspection below is pinned to the selected merge commit;
later standalone changes are outside import scope until deliberately added to this manifest.

## Integration rules

- Port behavior and vertical slices, not the standalone application root.
- React Navigation, the host Supabase client/session, global settings, RevenueCat, analytics,
  notifications, deep links, deletion/export, and release stay host-owned.
- Money owns finance interpretation, finance-specific presentation, local places, object
  workflows, protected financial presentation, and capability-scoped runtime resources.
- No live financial rows, credentials, account names, merchant names, or amounts are recorded
  here. Backend inventory contains names, versions, and RLS state only.
- The first integrated learning release is read-only. Writes, Plaid, widgets, and Screen Time
  remain separately gated.

## Route parity

| Frozen Expo Router source | Unified destination | Phase | Decision |
| --- | --- | --- | --- |
| `app/_layout.tsx` | `App.tsx` + `RootNavigator` | none | Retire standalone root, providers, screenshot route, and router ownership. |
| `app/(tabs)/_layout.tsx` | `MoneyNavigator` | 1 | Translate only the Summary/Transactions/Accounts local-place contract. |
| `app/(tabs)/index.tsx` | `MoneySummary` | 2 | Port read-only Summary composition, month scope, freshness, and meters. |
| `app/(tabs)/transactions.tsx` | `MoneyTransactions` | 2 | Port filters, inventory grammar, empty/error states, and account/category params. |
| `app/(tabs)/accounts.tsx` | `MoneyAccounts` | 2 | Port account inventory and account-to-transaction filtering; defer connect/relink. |
| `app/budgets/[budgetId].tsx` | `MoneyCategoryDetail` | 2/3 | Read-only detail first; review/unlock and mutations later. |
| `app/transactions/[transactionId].tsx` | `MoneyTransactionDetail` | 2/3 | Read-only classification first; correction and rules in the first write slice. |
| `app/budgets/new.tsx` | future `MoneyCategoryCreate` | 3 | Add only with authoritative category and plan persistence. |
| `app/app-control/[budgetId].tsx` | `MoneyCategorySettings` | 3/4 | Split category/plan settings from Screen Time app-control configuration. |
| `app/review.tsx` | `MoneyReview` | 4 | Preserve explicit budget-review handoff when shared shield targets are integrated. |
| `app/living-plan/[receiptId].tsx` | `MoneyLivingPlanReceipt` | 3 | Port with living-plan promotion/reversal writes and receipts. |
| `app/screen-time-controls.tsx` | contextual Money Screen Time settings | 4 | Fold into host settings and shared native targets; do not add a second global settings root. |
| `app/settings.tsx` | host `SettingsHome` plus Money contextual settings | 2-5 | Split ownership; host keeps global privacy/legal/subscription/deletion. |
| `app/(tabs)/ask.tsx` | unified Chat | 2 | Retire standalone Ask tab; add bounded Money context and exact return. |
| `app/ask-drawer.tsx` | unified Chat presentation | 2 | Retire standalone drawer. |
| `app/(tabs)/goals.tsx` | existing host Goals | none | Do not port the duplicate Goals destination. Preserve only accepted Money-to-Goal bridges. |
| `app/(tabs)/plan.tsx` | Money Summary/settings workflows | 2/3 | Retire the duplicate global Plan tab; place finance planning where Money owns it. |
| `app/(tabs)/more.tsx` | host capability menu and Settings | none | Retire duplicate More shell. |

## Source module ownership

| Frozen source | Post-integration owner | Phase | Treatment |
| --- | --- | --- | --- |
| `src/domain/budget-matching.ts`, `budget-meter.ts`, `income-patterns.ts`, `planning-income.ts`, `living-plan-evidence.ts`, `living-plan-pagination.ts` | Money domain | 2 | Port pure read behavior with translated Jest tests. |
| `src/domain/living-target.ts`, `living-plan*.ts`, `transaction-review.ts`, `budget-review-cadence.ts` | Money domain | 3/4 | Defer mutation/review behavior until its authoritative slice. |
| `src/domain/privacy-lock-state.ts` | Money native/runtime | 2 | Port state machine; use host application lifecycle and native configuration. |
| `src/domain/onboarding-gate.ts` and `src/features/onboarding/*` | Money capability | 4 or explicit deferral | Do not show standalone onboarding during the read-only release. |
| `src/platform/budget-product-data.ts`, read projections in `budget-repository.ts` | Money data | 2 | Adapt to one `MoneyRepository` receiving the host client. |
| write paths in `budget-repository.ts`, `living-plan-repository.ts`, `transaction-rule-persistence.ts` | Money data | 3 | Port slice-by-slice with reload and full-snapshot proof. |
| `src/platform/plaid*.ts`, `use-plaid-link.ts` | Money native/data | 4 | Port after read/write boundaries; tokens remain server-side. |
| `src/platform/auth.ts`, `supabase.ts`, `supabase-auth-storage.ts` | Kwilt shell | none | Retire; never construct a second client or auth store. |
| `src/shell/*` except privacy behavior | Kwilt shell | none | Retire standalone launch, auth, tabs, avatar, header, page, and entitlement providers. |
| `src/components/*` | host UI or Money UI | 2-4 | Translate only components used by an accepted slice; do not bulk-copy shell primitives. |
| `src/theme/*` | host theme plus Money finance theme | 2 | Reuse shared tokens; keep finance-only semantics locally. |
| `src/services/budgetPrivacyLock.ts` | Money native/runtime | 2 | Port capability-scoped behavior only. |
| `src/services/livingPlanReconciliation.ts`, `familySharing.ts` | Money data | 3 | Defer until write/schema reconciliation. |
| `src/services/entitlements.ts` | Kwilt shell | 5 | Retire duplicate RevenueCat ownership; map products to one host identity. |
| `src/services/accountDeletion.ts` | Kwilt shell | 5 | Host source and deployed function remain canonical; extend coverage, do not fork. |
| `src/services/budgetWidgetSnapshots.ts`, `connectedSpendWidgets.ts`, `widgetBackgroundSync.ts`, `appleEcosystem/budgetWidgets.ts` | Kwilt native platform | 4 | Contribute Money widget kinds to the existing Kwilt widget target. |
| `src/services/budgetScreenTime*.ts`, `appleEcosystem/screenTimeProtection.ts` | Kwilt native platform + Money adapter | 4 | Namespace Money policy state inside the existing shared Screen Time system. |
| `src/agent-workspace/*` | unified Chat | none | Do not port the standalone/fixture agent workspace. |

## Global concern ownership

| Concern | Owner after integration | Source disposition |
| --- | --- | --- |
| Auth and session | Kwilt shell | Retire Money auth provider, client construction, and auth storage. |
| Router and restoration | Kwilt shell | React Navigation is the only root; Money owns only its nested navigator. |
| RevenueCat | Kwilt shell | Retire Money provider/client; reconcile products in Phase 5. |
| Analytics | Kwilt platform | Add bounded Money event types; never emit financial content or amounts. |
| Notifications | Kwilt platform | Add explicit Money routes only when a delivered workflow needs them. |
| Settings | Kwilt shell + contextual Money settings | One global home; Money owns category, connection, privacy, widget, and app-control destinations. |
| Deep links | Kwilt shell | Use `kwilt://money/...`; retire `kwiltbudget` and standalone universal-link routing. |
| Deletion/export | Kwilt shell | Extend one account-delete/export contract across all `budget_*` data and server tokens. |
| Privacy | Money presentation + Kwilt lifecycle | Face ID/passcode and app-switcher cover wrap protected Money content, not the whole app. |
| Plaid | Money adapter + server Edge Functions | Link starts only on user action; server owns access tokens. |
| Widgets | Kwilt native platform | Add Money kinds to `KwiltWidgets`; do not import `KwiltBudgetWidget` as another target. |
| Screen Time | Kwilt native platform + Money adapter | Use shared shield targets and namespace Money rules/review markers. |
| App group | Kwilt native platform | Use only `group.com.andrewwatanabe.kwilt`; standalone app-group state is not portable. |
| Background work | Kwilt platform | Register only accepted shared work; no pre-entry Money task or widget refresh. |
| Realtime | Money runtime | Subscribe only while activated; tear down on deactivation and retain known-good state safely. |
| Chat | Kwilt unified Chat + Money adapters | Bounded read context in Phase 2; confirmed mutations only after their owning write slice. |
| Household identity | Kwilt shell | Reuse the authenticated user; reconcile Money household records before enabling family writes. |
| Release and native targets | Kwilt host | One binary, bundle family, archive, TestFlight record, and release train. |

## Dependency import phases

`Host` means the dependency is already present and the host version wins. `Retire` means the
standalone dependency must not enter the unified graph solely for Money.

| Dependency | Frozen version | Decision / phase |
| --- | --- | --- |
| `react`, `react-dom`, `react-native`, `expo` | `19.1.0`, `19.1.0`, `0.81.5`, `~54.0.24` | Host; already aligned. |
| `@supabase/supabase-js` | `^2.78.0` | Host; pass the existing client in Phase 2. |
| `@react-native-async-storage/async-storage` | `2.2.0` | Host; no Money auth/session key. |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-worklets` | source-pinned Expo 54 set | Host; resolve to one installed version. |
| `@expo-google-fonts/inter`, `@expo-google-fonts/urbanist`, `expo-font` | source-pinned Expo 54 set | Host; reuse only weights already bundled unless parity proves another weight is required. |
| `expo-blur`, `expo-haptics`, `expo-linear-gradient`, `expo-status-bar`, `expo-task-manager`, `expo-web-browser` | source-pinned Expo 54 set | Host; use only from mounted Money surfaces. |
| `react-native-purchases` | `^9.15.2` | Host/global; no Money provider. Reconcile version/products only in Phase 5. |
| `lucide-react-native` | `^1.23.0` | Host version wins; translate icons and never install two majors. |
| `@rn-primitives/dropdown-menu` | `^1.4.0` | Defer; prefer host UI. If required, resolve one version during the owning UI slice. |
| `@shopify/react-native-skia` | `2.2.12` | Phase 2 archive gate after structural Summary works. |
| `victory-native` | `^41.26.0` | Phase 2 archive gate with Skia; no pre-entry chart construction. |
| `expo-local-authentication` | `~17.0.8` | Phase 2 privacy gate with Kwilt-wide configuration. |
| `react-native-plaid-link-sdk` | `^13.0.0` | Phase 4, separately measured and signed-device verified. |
| `expo-auth-session`, `expo-crypto`, `expo-linking` | source-pinned Expo 54 set | Phase 4 only if the unified Plaid/OAuth adapter actually requires them. |
| `expo-background-task` | `~1.0.10` | Phase 4 only after shared background ownership is designed. |
| `expo-secure-store` | `~15.0.8` | Retire standalone auth/token use; add no client-side Plaid token storage. |
| `expo-router`, `@expo/metro-runtime` | `~6.0.14`, `~6.1.2` | Retire for Money; host React Navigation/build tooling owns routing and Metro. |
| `@expo/vector-icons` | `15.1.1` | Retire for Money; use the host icon contract. |
| `@kwilt/tokens` | workspace package | Retire as an imported package; map shared values to the host theme. |
| `expo-constants` | `~18.0.10` | Retire Money environment ownership; use host configuration. |
| `expo-dev-client`, `babel-preset-expo`, `typescript`, `@types/react`, `react-native-web` | source development set | Host tooling; do not import source build configuration. |

## Live backend reconciliation

Read-only metadata was captured from Supabase project `sqxwjtorodqjdfnuvprf` while it was
`ACTIVE_HEALTHY`. No SQL, migration, function deployment, or row mutation was applied.

### RLS inventory

All observed public Money tables reported RLS enabled:

| Area | Live `budget_*` tables |
| --- | --- |
| Connections and transactions | `budget_financial_connections`, `budget_financial_accounts`, `budget_transactions`, `budget_transaction_match_rules`, `budget_forecast_settings` |
| Household | `budget_households`, `budget_household_members`, `budget_household_invites` |
| Categories and plans | `budget_categories`, `budget_category_groups`, `budget_category_group_members`, `budget_plans` |
| Living plan | `budget_living_plan_preferences`, `budget_recommendation_runs`, `budget_living_target_intents`, `budget_planning_income_sources`, `budget_living_plan_versions`, `budget_living_plan_components`, `budget_living_plan_overrides`, `budget_living_plan_receipts`, `budget_active_living_plans`, `budget_living_plan_config` |

### Migration mapping

Live history, not the source filename, is authoritative for deployment state.

| Frozen source file | Live version / name |
| --- | --- |
| `20260626143428_budget_plaid_transactions.sql` | `20260709130754 budget_plaid_transactions` |
| `20260626210500_budget_plaid_token_rpc.sql` | `20260709130805 budget_plaid_token_rpc` |
| `20260630033518_budget_forecast_settings.sql` | `20260709130826 budget_forecast_settings` |
| `20260706160000_budget_transaction_reviews.sql` | `20260706160000 budget_transaction_reviews` |
| `20260706193000_budget_summary_realtime.sql` | `20260709130840 budget_summary_realtime` |
| `20260707170000_budget_family_sharing.sql` | `20260709130916 budget_family_sharing` |
| `20260709131005_budget_categories_and_plans.sql` | `20260709131005 budget_categories_and_plans` |
| `20260709153000_budget_transaction_money_meaning.sql` | `20260710034128 budget_transaction_money_meaning` |
| `20260710163547_financial_security_hardening.sql` | `20260710164551 financial_security_hardening` |
| `20260710232240_automatic_living_plans.sql` | `20260710232320 automatic_living_plans` |
| `20260710232351_harden_automatic_living_plans.sql` | `20260710232416 harden_automatic_living_plans` |
| `20260710232942_finish_automatic_living_plan_hardening.sql` | `20260710233003 finish_automatic_living_plan_hardening` |
| `20260710233309_persist_living_plan_source_receipts.sql` | `20260710233332 persist_living_plan_source_receipts` |
| `20260710234001_version_planning_source_evidence.sql` | `20260710234042 version_planning_source_evidence` |
| `20260710234625_project_active_living_plan_into_budgets.sql` | `20260710234659 project_active_living_plan_into_budgets` |
| `20260710235503_clarify_living_plan_reversals.sql` | `20260710235538 clarify_living_plan_reversals` |
| `20260716023558_create_budget_category_with_plan.sql` | `20260716023704 create_budget_category_with_plan` |
| `20260719155556_enforce_single_budget_transaction_merchant_rule.sql` | `20260719155556 enforce_single_budget_transaction_merchant_rule` |

Live-only Money migrations not represented by a same-named frozen source file are
`20260709130923 budget_access_function_hardening`,
`20260709131031 budget_living_plan_preferences`, and
`20260709131116 budget_plaid_token_rpc_hardening`. Future write work must reconcile against
those live changes rather than replay the frozen SQL.

### Database functions

The following frozen Money RPC names were found live: `accept_budget_household_invite`,
`can_access_budget_household`, `can_access_budget_user`,
`create_budget_category_with_plan`, `get_budget_plaid_access_token`,
`mark_budget_living_plan_receipt_seen`, `project_active_living_plan_into_budget_plans`,
`promote_budget_living_plan`, `reverse_budget_living_plan`,
`set_budget_transaction_review_audit`, and `store_budget_plaid_access_token`.

This proves name presence only. Each write slice must verify the live signature and security
contract immediately before use.

### Edge Functions

| Function | Live state | Canonical owner/source decision |
| --- | --- | --- |
| `create-plaid-link-token` | active, version 14 | Frozen `supabase/functions/create-plaid-link-token/index.ts`; reconcile in Phase 4. |
| `exchange-plaid-public-token` | active, version 15 | Frozen `supabase/functions/exchange-plaid-public-token/index.ts`; reconcile in Phase 4. |
| `sync-plaid-transactions` | active, version 17 | Frozen `supabase/functions/sync-plaid-transactions/index.ts`; reconcile in Phase 4. |
| `budget-family-accept-invite` | active, version 1 | Frozen `supabase/functions/budget-family-accept-invite/index.ts`; defer to family-write scope. |
| `budget-family-create-invite` | not listed live | Source-only; do not call or deploy without a separate family-write decision. |
| `account-delete` | active, version 14 | Kwilt host `supabase/functions/account-delete/index.ts` is canonical; verify Money coverage in Phase 5. |

## Native target mapping

| Standalone target or native owner | Unified target/owner | Phase | Decision |
| --- | --- | --- | --- |
| `KwiltBudget` (`app.kwilt.budget`) | Kwilt app (`com.andrewwatanabe.kwilt`) | all | Retire standalone bundle/scheme; use the host binary. |
| `KwiltBudgetWidget` (`app.kwilt.budget.widget`) | existing `KwiltWidgets` target | 4 | Fold in Money widget kinds; never add a second widget extension. |
| `KwiltShieldAction` | existing Kwilt shield action target | 4 | Merge Money action/review state under namespaced keys. |
| `KwiltShieldConfiguration` | existing Kwilt shield configuration target | 4 | Preserve accepted Money blue/copy in the shared target. |
| `KwiltBudgetWidgets.swift/.m` bridge | `plugins/withAppleEcosystemIntegrations.js` and host services | 4 | Translate through generated-native contracts, not checked-in native copying. |
| `KwiltScreenTimeProtection.swift/.m` bridge | host Apple ecosystem plugin/services | 4 | Extend shared module only after focused generation tests. |
| `group.app.kwilt.budget` | `group.com.andrewwatanabe.kwilt` | 4 | No opaque app-group migration; testers re-add widgets/reselect apps. |
| `kwiltbudget` URL scheme | `kwilt` | 2/4 | Host deep-link namespace; update Plaid OAuth in Phase 4. |
| `applinks:app.kwilt.app` | host associated domains | 2/4 | Route Money paths through the host configuration. |

## Asset disposition

| Frozen assets | Decision | Reason / phase |
| --- | --- | --- |
| Space-named auth wallpapers (`Shinkansen`, Angkor Wat, bike path, canoeing, desert camels, hiking, island, Japanese lake, jungle river, night train, Pacific coast, rice paddies, riverside train, sailing, study window, sunset highway) | Reuse host | Files are byte-identical at matching paths; Money does not own auth UI. |
| Hyphenated duplicate auth wallpapers | Drop | Duplicate standalone aliases; no host import. |
| `assets/logo-parchment.png`, `assets/logo-white.png` | Reuse host | Byte-identical; host branding owns them. |
| `assets/icon.png`, `assets/adaptive-icon.png` | Drop | Standalone app identity does not enter the unified binary. |
| `assets/onboarding/connect-accounts.png`, `income-plan.png`, `welcome.png` | Defer/import selectively | Import only if an accepted unified Money onboarding flow uses them. |
| `src/assets/auth-sign-in-wallpapers.ts` | Drop | Host auth wallpaper registry is canonical. |
| standalone widget fonts | Reuse host font ownership | Bundle only weights required by the existing shared widget target. |
| `ios/KwiltShieldConfiguration/KwiltShieldAppIcon.png` | Adapt only if required | Shared shield target owns its bundled icon; no second target copy. |

## Standalone-to-unified acceptance flows

| Standalone acceptance flow | Unified verification |
| --- | --- |
| Launch, sign-in, session restore | Existing host auth/launch tests plus signed-in cold/warm launch; no Money provider or second session. |
| Open Summary and change month | `MoneySummaryScreen` loading/live/empty/error tests; same-account parity and exact month restoration. |
| Pull to refresh and recover freshness | Repository known-good retention tests plus runtime stale/error copy; never fixture dollars. |
| Browse/filter Transactions | Screen contract tests for category/account/date params and same-account inventory parity. |
| Browse Accounts and open account transactions | Accounts tests plus exact Transactions filter navigation. |
| Open category detail | Read-only category tests for month, actual/planned truth, activity, and back return. |
| Open transaction detail | Read-only classification parity first; correction/reload/full-snapshot proof in Phase 3. |
| Create/rename/adjust/roll over a category | Regression-first domain and repository tests plus authenticated write/reload parity in Phase 3. |
| Preview and apply a living-plan adjustment | Impact, promotion, receipt, seen, reversal, failure, and full-snapshot tests plus authenticated proof. |
| Correct/exclude a transaction and apply a merchant rule | Rule persistence tests plus source/destination/totals/detail/activity/reload proof across one snapshot. |
| Privacy relock/cancel/fallback/app-switcher cover | State tests, Money-only presentation tests, simulator navigation, and signed-device Face ID/passcode evidence. |
| Connect/reconnect/sync Plaid | Adapter tests, signed-device Sandbox OAuth, sync/relaunch proof, and archive/App Thinning comparison. |
| Add/read Money widget | Shared-target generation tests and signed-device app-group/timeline proof; tester re-add required. |
| Select apps, shield, review, open/leave blocked | Shared-target generation tests and signed-device FamilyControls/ManagedSettings review cadence. |
| Ask about current Money context and return | Bounded-evidence adapter tests and exact category/transaction/account return tests. |
| Delete/export account data | Host deletion/export coverage for all `budget_*` records and Plaid server tokens; live function verification. |
| Failure/offline/partial write | No fixture fallback, prior authoritative state retained, explicit failure, no optimistic success. |

The frozen repository has script-level forecast, living-plan, adjustment, security, and
Screen Time color checks, but no screen-level Jest suite. Unified screen and navigation
contracts therefore must be authored explicitly rather than assumed to transfer.

## Frozen-source validation checklist

- [x] Auth has one post-integration owner.
- [x] Router/restoration have one post-integration owner.
- [x] RevenueCat has one post-integration owner.
- [x] Analytics has one post-integration owner.
- [x] Notifications have one post-integration owner.
- [x] Settings have explicit global/contextual owners.
- [x] Deep links have one namespace owner.
- [x] Deletion/export have one owner and a later parity gate.
- [x] Privacy is capability-scoped without blocking other capabilities.
- [x] Plaid has a client/server boundary and separate phase.
- [x] Widgets map to the existing host target.
- [x] Screen Time maps to the existing host targets.
- [x] App-group state maps to the host group with no false migration claim.
- [x] Background work has one host owner and no pre-entry behavior.
- [x] Realtime has an activation/deactivation owner.
- [x] Chat has a host surface and Money adapter boundary.

Task 2 may begin from this source contract. This document does not authorize a migration,
Edge Function deployment, push, PR, TestFlight submission, standalone retirement, or merge.

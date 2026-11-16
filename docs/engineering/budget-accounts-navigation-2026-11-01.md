# Accounts navigation repair

Source: `/Users/andrewwatanabe/Kwilt`, `codex/budget-reliability-checkpoint`, following `bf4a7bbf`.
Status: local regression verification; native acceptance pending.

Andrew reported that Accounts had no way back, and selecting Budgets in the main menu reopened Accounts. Every Money route intentionally highlights Budgets, but the reselection callback previously only closed the menu. The Accounts wrapper also omitted the shared header Back action.

Accounts now uses the existing Back control to pop to MoneySummary. The stack router also replaces an Accounts-only route with MoneySummary, covering direct/restored entry without prior overview history. Settings' Accounts wrapper retains its existing Settings back behavior.

Choosing the highlighted Budgets item from a nested Money screen now dispatches the existing MoneyEntry route with MoneySummary requested, preserving setup gating. Choosing it while already on the overview still only closes the menu. Other capabilities retain their previous reselection behavior.

Regression-first verification: four real-menu interaction cases failed before the fix (Accounts, Transactions, Transaction Detail and Category Detail). Two real Accounts/header cases failed for missing Back, then passed using the actual StackRouter with and without prior summary history. All three focused suites passed: 85 tests. Providers and native Plaid are test substitutes; these tests do not prove native animation, gestures or a physical-device workflow.

Native acceptance must check Accounts Back, menu to Budgets from Accounts and another nested Money screen, overview reselection, and Settings Accounts Back. The Mac was locked at the last native attempt; no new runtime was started for these tests. This is an additional PR #200 repair, not a merged or released app.

Read-only review found no actionable regression after tracing the leaf route, setup gate and stack behavior. The first completion attempt exposed a test-only partial-state typing error; the test now rehydrates router results as navigation does. Final local automation passed freshly in 41.51 seconds across all 14 changed paths, with zero omitted files: app/test typechecks, related Jest tests, architecture, code health, release-contract tests, script tests and whitespace. `agent:map` produced no diff. Native interaction was retried and remains blocked by the locked Mac.

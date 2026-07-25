# Evaluate Learning: Kwilt Money Capability Integration

## Learning questions

1. Does Money feel like a native Kwilt capability without losing its financial identity?
2. Do existing users see exactly the same live data under the shared session?
3. Does the local three-place model coexist cleanly with Option G and unified Chat?
4. Does Money remain dormant before entry and release work after exit?
5. Does capability-local privacy feel conventional on device without blocking unrelated Kwilt surfaces?
6. Is the archive/launch/memory cost acceptable before Plaid Link, widgets, and Screen Time are added?

## Evidence plan

- Side-by-side signed-account parity: month totals, planned amount, actual category spend, freshness, category count, transaction count/state, and account count/state.
- Navigation matrix: cold deep link, warm deep link, persisted restoration, capability switching at each local place, detail back, Chat entry, exact return.
- Lifecycle instrumentation: pre-entry network/subscription count, activation duration, deactivation cleanup, memory before/after first entry.
- Privacy matrix on a physical iPhone: cold open, warm foreground inside Money, foreground to non-Money, timeout relock, cancel, biometric failure, device passcode fallback, app-switcher snapshot.
- Release evidence: production-widgets archive, embedded frameworks/extensions, App Thinning report, ten cold and ten warm launches on the same device.
- Qualitative dogfood notes from at least three real money-review sessions.

## Supporting signals

- No unexplained parity difference.
- No Money query, realtime channel, Plaid, Skia chart work, or privacy prompt before Money entry.
- Exact return succeeds from category and transaction detail.
- Andrew naturally uses unified Money instead of reopening the standalone app for read/review.
- No duplicated settings/auth/subscription concepts appear.

## Disconfirming signals

- Any signed-in fixture fallback or unexplained dollar mismatch.
- A shell test that removed or flattened Summary/Transactions/Accounts.
- Startup regression above the accepted threshold or persistent memory/subscription work after exit.
- Face ID loops, app-wide blocking caused by Money, or exposed Money snapshots in the app switcher.
- Need for a second router, session store, or entitlement provider.

## Instrumentation

Track capability activation/deactivation duration, first Money usable time, query/subscription
starts and stops, deep-link source, restore fallback, and parity-test results. Do not send
merchant names, transaction descriptions, account names/numbers, dollar amounts, or category
contents to product analytics.

## Decision rule

Proceed to the first write slice only when all correctness/privacy/navigation gates pass,
no pre-entry work occurs, device launch stays within the accepted regression budget, and
archive evidence is recorded. Revise the shell adapter if Money feels displaced. Revise the
data adapter if parity fails. Do not solve either problem by weakening the gate or importing
the standalone shell.

## Expected next action

After acceptance, enable one authoritative transaction-correction vertical slice, then
category/living-plan writes, then Plaid Link, and only then the consolidated widget and
Screen Time targets.

# Evaluate Learning: Native Money And Shared Settings

## Learning questions

- Does Money still feel trustworthy when translated into the Kwilt shell?
- Can a user find global and Money-specific settings without thinking about ownership levels?
- Does unopened Money truly impose no query, native-service, launch, or memory work?
- Do shared-session totals and object navigation match the frozen standalone build?
- Does capability-local privacy protect Money without obstructing the rest of Kwilt?

## Supporting evidence

- Same-account parity checklist for totals, lists, detail, freshness, filters, empty/error states, and back behavior.
- Simulator recordings for Settings and full Money navigation.
- Physical-device Face ID/passcode, app-switcher cover, lifecycle, launch, and memory observations.
- Production-widgets archive and App Thinning reports at native dependency boundaries.
- Internal use without confusion about whether a choice belongs to Kwilt or Money.

## Disconfirming signals

- A second auth/settings/subscription owner appears.
- Money work occurs before entry or survives deactivation unexpectedly.
- Financial state differs between standalone and unified builds.
- The grouped Settings layout hides existing destinations or adds explanatory clutter.
- The user has to reason about host versus capability architecture.

## Instrumentation

Record capability entry/exit, route transition outcome, privacy-gate outcome, load state, and parity checklist results. Never record merchant text, account names/numbers, category content, transaction descriptions, or amounts.

## Decision rule

Proceed from read-only to authoritative writes only after parity, privacy, lifecycle, archive, and device gates pass. Simplify or correct the translation boundary if Settings comprehension or Money workflow parity regresses. Do not retire standalone Money until all accepted workflows and native integrations pass on the same account.

## Expected next action

After the read-only learning release, port write slices in the order defined by the accepted feature brief, then Plaid/widgets/Screen Time, then global ownership reconciliation and separately authorized retirement.

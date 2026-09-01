# Monetization release readiness — evaluation rules

## Go conditions

- No retired-gate paywall event or access denial appears in the Free regression corpus.
- Every paid entry point produces the same contextual reason and purchase destination.
- Every paid provider or mutation boundary rejects a Free direct request using trusted server state.
- Live StoreKit/RevenueCat data supplies price, cadence, and eligibility; unavailable data produces an honest retry state rather than fabricated pricing.
- RevenueCat lifecycle events are authenticated, idempotent, order-tolerant, and period-correct.
- Cancellation and billing issues do not cause premature loss of access.
- Expiration/refund cleanup leaves customer data readable and emits an inspectable receipt.
- Money setup offers the live one-month full-Pro introductory trial before
  Plaid initialization or an active budget/transaction mutation; expired Money
  remains readable while provider work and active editing are paused.
- Confirmed expiration/refund deactivates advanced personal and family Screen
  Time rules as whole rules; offline devices remain honestly labeled pending
  until an acknowledged release.
- Free Screen Time offers contextual upgrade paths that preserve work, return to
  the requested advanced outcome, and do not interrupt successful basic use.
- Restore or resubscribe never silently reactivates a dormant Screen Time rule.
- Each marketed paid pillar passes its capability-specific signed-runtime evidence gate.
- Cook Mode and Live Conversation give Free and Pro the same no-paywall MVP
  while enabled; provider use is authenticated and bounded; disabling either
  flag stops entry and new provider cost without an upsell; neither is marketed
  as a subscription benefit.
- Website, Terms, support, App Store listing, in-app paywall, and subscription management tell the same story.

## Hold conditions

Hold the public monetization release if any of these is true:

- a Free workflow is still gated by the retired business model;
- a provider boundary classified Pro can be reached without trusted Pro
  authorization;
- a Free account can begin active Money/Budgets work, or the Money entry path
  assumes a nonexistent manual transaction mode;
- trial copy can be shown to an ineligible person;
- cancellation immediately revokes access;
- webhook authenticity is optional;
- duplicate or out-of-order events can regress entitlement state;
- provider cleanup can delete or hide customer data;
- an expired advanced/family Screen Time rule remains desired-active, is silently
  reduced to a Free condition, is reported released without a device receipt,
  or automatically restarts after resubscription;
- the Free Screen Time journey hides Pro entirely or relies on generic repeated
  nags instead of contextual outcome previews;
- the known production subscriber cannot be reconciled;
- a marketed feature lacks its required signed-device, TestFlight, or production proof.
- Cook Mode or Live Conversation can create unbounded or unauthenticated
  provider cost, remains reachable while its exposure flag is off, opens a
  paywall, or appears as a headline subscription/store/creator claim.

## Decision after the learning release

- **Proceed:** all invariants pass and the paid-pillar promise set matches proven capabilities.
- **Narrow:** ship monetization with only the proven paid pillars exposed and advertised.
- **Hold:** entitlement, purchase, downgrade, provider-cost, or data-preservation truth is not reliable.

Conversion rate alone never overrides a trust or enforcement failure.

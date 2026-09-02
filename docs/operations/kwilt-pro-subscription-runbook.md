# Kwilt Pro subscription operations

## Subscription truth

1. Apple owns purchase, price, renewal, cancellation, refund, and introductory eligibility.
2. RevenueCat maps active purchases to the single `pro` entitlement.
3. The webhook ledger stores each provider event immutably before reducing the current projection.
4. Internal grants are a separate, auditable fallback. Historical partial-trial fields never grant access.
5. Creator claims and commissions are separate records and never modify entitlement.

## Lifecycle outcomes

| Event state | Access |
|---|---|
| active or introductory period | Full Pro |
| cancellation before expiration | Pro continues through paid-through date |
| billing grace | Pro continues while RevenueCat reports access |
| confirmed expiration | Pro revoked; advanced personal and family Screen Time rules deactivate whole and remain readable |
| refund | Pro revoked immediately from the authoritative event; creator commission reverses when applicable |
| webhook retry or duplicate | Same projection and at most one ledger/commission effect |
| stale event | Recorded but cannot overwrite a newer projection |

## Customer-safe downgrade

- Keep Money history readable; pause connection, sync, review, and budget mutations. Keep disconnect and subscription management available.
- Preserve advanced personal Screen Time definitions, clear their enabled state, and show `Inactive — Pro ended` or `Deactivation pending`.
- Deactivate active family agreements and overrides through versioned desired-state receipts; do not claim the device changed until it acknowledges the change.
- Reject new external connector tokens and tool calls; allow revocation and cleanup.
- Never silently reactivate dormant rules after repurchase. The customer chooses to turn them back on.

## Incident actions

- If subscription truth is uncertain, preserve last-known access briefly and mark it stale; do not revoke from a network error.
- If downgrade delivery is pending, surface the pending state and retry the safe deactivation. Never hide a still-applied Screen Time restriction.
- If webhook processing fails after the immutable insert, return a retryable error. Reducers and receipts must remain idempotent.
- Keep Plaid cleanup disabled until active, cancelled, expired, refunded, reactivated, and account-deletion cohorts reconcile exactly. Deletion requires separate approval.
- Keep creator payouts manual. Reconcile provider transactions, holds, refunds, and payout items before approval.

## Release reconciliation gate

Before enabling a monetization rollout, use a disposable RevenueCat Sandbox
customer and record the build, Kwilt user ID, RevenueCat app user ID, product,
event IDs, and timestamps. Do not record Apple credentials.

For initial purchase, renewal, cancellation, billing issue/grace, expiration,
refund, and reactivation:

1. Confirm RevenueCat delivered the event successfully and retries did not
   create a second ledger row.
2. Confirm `kwilt_revenuecat_events` contains the immutable event with the
   expected customer, product, environment, and occurrence time.
3. Confirm `kwilt_revenuecat_subscriptions` reflects the latest non-stale event,
   including `is_pro`, paid-through time, renewal state, and access state.
4. Confirm the app agrees after foreground refresh, force-quit/relaunch, and
   sign-out/sign-in.
5. For expiration and refund, confirm downgrade behavior is customer-safe and
   advanced Screen Time restrictions do not remain silently enforced.
6. Record any delivery-to-projection delay and investigate missing, stale, or
   contradictory states before rollout.

Source tests and a local reducer pass are necessary but do not satisfy this
gate. The gate requires evidence from the linked Sandbox webhook and database.

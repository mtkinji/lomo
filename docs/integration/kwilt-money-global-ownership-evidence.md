# Kwilt Money global ownership evidence

**Reviewed:** 2026-07-23 (America/Denver)

This records the Phase 5 ownership reconciliation for the native Money import. It
contains contract and schema evidence only; no financial rows, tokens, account
names, merchant names, or amounts are recorded here.

## RevenueCat

- Kwilt's existing RevenueCat client, authenticated Kwilt user ID, `pro`
  entitlement, restore flow, and subscription screen remain the only owners.
- Canonical products remain `pro_monthly`, `pro_annual`,
  `pro_family_monthly`, and `pro_family_annual`.
- The standalone Money product IDs are accepted as legacy aliases by the same
  host purchase and pricing lookup. This preserves catalog compatibility without
  introducing another provider, cache, or customer identity.

## Notifications and routing

- The frozen standalone source has no Money notification service or notification
  preference model to port.
- Money does not register background notification work before capability entry.
- Screen Time review uses the shared foreground handoff and the host
  `kwilt://money` deep-link namespace. A new Money notification route should be
  added only when a delivered workflow owns its scheduling and cancellation.

## Account deletion

- The deployed `account-delete` function is the canonical deletion path.
- The function enumerates the user's `budget_financial_connections`, attempts
  Plaid `/item/remove` for each connection, and then deletes the auth user.
- Live foreign-key inspection found the user-owned `budget_*` records cascading
  from `auth.users`. Reviewer/acceptor references use `SET NULL` where another
  household member may own the record.
- The host deletion warning now explicitly names Money plans, transactions, and
  connected financial accounts. Apple subscription cancellation remains a
  separate App Store action.

## Export

Neither the frozen standalone Money source nor the host currently contains an
account-data export workflow. Therefore there is no standalone capability to
port and no honest in-app export claim in this branch. A complete Kwilt export
needs a separately accepted server contract so it can include all user-owned
capabilities and storage objects without exposing private provider tokens. A
Money-only client export would violate the single global ownership decision.

## Support diagnostics

- Accounts presents connection state, sync freshness, and safe connection/sync
  failures without displaying server tokens.
- Money read failures retain known-good state and never substitute fixture
  financial values.
- No finance-sensitive values are added to global analytics or logs.

## Retirement boundary

This reconciliation does not retire the standalone TestFlight build, deploy an
export endpoint, create the missing household-invite endpoint, or publish a new
Kwilt build. Those remain separate authorization and acceptance boundaries.

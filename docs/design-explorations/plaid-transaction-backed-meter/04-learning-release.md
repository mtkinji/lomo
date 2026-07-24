# Learning Release: plaid-transaction-backed-meter

## Concept to build

Kwilt Money lets the user create one budget lane, connects one Plaid account, and suggests matching transactions to keep that lane's meter current for the existing spend-review gate.

## User story

Today, the user can review a fixture-backed meter before opening Amazon, but cannot create a real lane or know whether the meter reflects real spend.

After this learning release, the user can create `Amazon and household extras`, connect one account, sync transactions, accept suggested matches, and see the review meter update from that data.

## Where the user encounters it

- Dev setup entry point in Settings or Plan.
- Existing home meter screen.
- Existing `/review` screen before Amazon access.

## Happy path

1. User signs in or uses the dev account.
2. User creates a lane with name, budget amount, and period.
3. User adds optional hints, such as merchant/app/account/category.
4. User taps `Connect account`.
5. App requests a server-created Plaid Link token for `transactions`.
6. User completes Plaid Link.
7. Server exchanges `public_token` for access token and stores the Item connection.
8. User triggers `Sync transactions`.
9. Server calls `/transactions/sync` with a null cursor for first sync.
10. Server stores normalized transactions and next cursor.
11. Inference service creates suggested assignments for the lane.
12. User accepts the suggestion set or corrects obvious misses.
13. Confirmed assignments create meter ledger entries.
14. Home/review meter shows updated spend, remaining runway, pace, and sync freshness.

## What must be real

- Server-side Plaid credentials and token exchange.
- Mobile Link launch using React Native Plaid Link SDK or an Expo-compatible approach.
- Persistent financial connection metadata.
- Server-side storage of access token, not mobile storage.
- Cursor-based transaction sync.
- Normalized transaction records.
- User-created lane and period.
- One inference hint set.
- Suggested and confirmed assignment states.
- Meter recomputation from ledger entries.
- UI indication of sync source/freshness.

## What can be thin or temporary

- Dev-only setup route.
- Single-account support.
- Very small lane creation form.
- Manual sync button instead of scheduled polling.
- Simple merchant/account/category matching rule.
- Sparse error copy.
- Sandbox-only flow before repeating with Development real bank.
- Accept-all suggestion action instead of full transaction-by-transaction review.

## Exclusions

- Production user rollout.
- Multi-account rule management.
- Full transaction ledger.
- Full transaction correction queue.
- AI assignment beyond deterministic hints.
- Notifications.
- Screen Time entitlement changes.

## Release channel

Start with `Local build`, then move to `TestFlight build` after the Plaid Link and sync flow works reliably.

Reason: Plaid Link and native SDK behavior need to be felt in the mobile app, but early provider/storage mistakes should stay Andrew-only.

## Brand-goodwill guardrails

- Say exactly what data is used: transactions for the selected account.
- Say exactly why: to suggest transactions for the chosen meter.
- Make the connected account visible and removable.
- Make suggested versus confirmed spend distinguishable internally.
- Show when the meter last synced.
- Avoid provider jargon in the main meter.
- Avoid shame copy for over-budget or stale states.

## Polling/update strategy

For the first dev test:

- Use manual sync from the dev setup surface.
- Store `ProviderSyncState.nextCursor`.
- Re-run `/transactions/sync` with the stored cursor.
- Treat webhooks/scheduled polling as a later reliability layer.

For the next release:

- Add a scheduled server sync.
- Add Plaid webhooks for update/error awareness.
- Surface only user-actionable states in the app.

## Reversibility

Disable by hiding the dev connection entry point and ignoring provider-backed meter sources. Linked Items should be removable from the backend and, if needed, from Plaid via the appropriate Item removal flow.

## Permanent product threshold

Promote from dev learning release when:

- Plaid Link succeeds reliably in the app.
- Transactions sync without losing cursor state.
- Meter totals can be explained from ledger entries.
- Suggested assignments can be explained from lane hints.
- The review screen feels more trustworthy, not more complicated.

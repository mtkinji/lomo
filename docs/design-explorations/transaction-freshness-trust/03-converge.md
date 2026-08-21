# Converge: transaction-freshness-trust

## Qualitative scoring

| Alternative | Persona fit | System fit | Trust lift | Blast radius | Read |
| --- | --- | --- | --- | --- | --- |
| Freshness Labels Everywhere | High | High | Medium | Low | Good first layer, insufficient alone |
| Pull To Check Bank | High | Medium | High | Medium | Best direct recovery action |
| Freshness-Aware Budget Claims | Very high | Medium | Very high | Medium | Best long-term product contract |
| Accounts As Sync Control Center | Medium-high | High | Medium | Low-medium | Useful supporting surface |
| Background Reliability Layer | High | Medium | High | High | Needed later, risky as first slice |
| Transaction Arrival Receipt | Medium | Medium | Medium | Low-medium | Useful after refresh/link |

## Chosen direction

Build a transaction freshness trust contract that starts with visible freshness and manual recovery:

1. Create one shared connected-spend freshness state.
2. Show minimal surface-level freshness copy where budget reality is checked; on Budget, place the last successful bank-check time as quiet metadata in the upper-right PageHeader space.
3. Treat pull-to-refresh on Budget and Transactions as a user-triggered `Check for new activity`: acknowledge the committed pull with one light haptic, check connected institutions, reconcile returned activity, then refresh the Kwilt snapshot. Transactions and Accounts retain their explicit action.
4. Route deeper connection-health detail to Accounts.
5. Defer scheduled/webhook sync until the visible contract and manual recovery path are understood.

## Capability delta

Today, the user cannot:

- Tell whether a missing recent transaction is filtered out, not synced yet, or a connection issue.
- Ask Kwilt to check the bank from the surface where the missing row is noticed.
- Know whether a strong budget claim is based on recent bank sync or stale data.
- See a consistent freshness state across Summary, Transactions, Accounts, and budget detail.

After this ships, the user can:

- See when Kwilt last refreshed its local budget snapshot and when the bank was last checked.
- Pull or tap to check for new bank activity when a recent transaction seems missing.
- Understand `No new activity found` as a real checked state, not a silent failure.
- See softer budget language when bank sync is stale.
- Use Accounts as the calm place to inspect connection health.

Still intentionally not possible:

- Guaranteed instant visibility after every swipe.
- Full Plaid diagnostics.
- Repairing every bank credential or provider issue.
- Charging for on-demand refresh.
- Raw provider logs or technical error details in user-facing surfaces.

## Accepted trade-offs

- We accept adding one shared freshness concept because multiple surfaces currently duplicate or hide freshness in incompatible ways.
- We accept manual refresh before scheduled/webhook sync because it directly addresses the user trust moment with less backend complexity.
- We accept a terse timestamp on budget surfaces because silence is more damaging than a small freshness boundary.

## Rejected trade-offs

- Do not solve this only inside Transactions. The same stale evidence can affect Summary, budget detail, app-control review, and widgets.
- Do not start with scheduled/webhook sync alone. If invisible sync fails or lags, the user still has no explanation.
- Do not turn Accounts into a provider diagnostics panel.
- Do not make every budget card show verbose disclaimers.

## System implications

- `ConnectedSpendBudgetSnapshot` should expose enough metadata to derive freshness state, not just transaction rows.
- `sync-plaid-transactions` needs a safe user-facing wrapper behavior: throttling, loading state, result copy, and failure copy.
- Pull-to-refresh on Summary is an explicit bank-activity check, not only a reread of the latest Kwilt database snapshot.
- The gesture completes after the existing connected-activity pipeline attempts provider sync, classification, Living Plan reconciliation, and authoritative snapshot reload.
- Transactions should know both inventory scope and bank-check state.
- Accounts should remain the deeper connection-health surface.

## Reductive design decisions

- Keep one action label: `Check for new activity`.
- Keep one deeper place: Accounts.
- Keep one freshness model reused across surfaces.
- Keep the Budget and Transactions freshness timestamp as compact, non-interactive header metadata: a small refresh icon plus numeric elapsed copy (`23m ago`, `1d ago`, `Just now`). The pull gesture remains the action and the accessibility label carries the full meaning.
- Do not add a sync settings screen.
- Do not add user-maintained refresh schedules.
- Do not add provider jargon unless a repair flow later requires it.
- Do not show merchant names or amounts in analytics.

## Activation path

The feature activates when the user is already checking budget reality:

- Opening Transactions and seeing fewer or older rows than expected.
- Pulling Summary to refresh.
- Viewing Accounts after linking or when sync is stale.
- Opening budget detail before a spending decision.

Education should be contextual and minimal. The useful teaching moment is a status line or refresh result, not onboarding.

## Bet

We're betting that users will keep trusting Kwilt Money if the app shows a terse list/surface-level freshness timestamp and gives them one calm recovery action. If it turns out users still expect instant bank truth after tapping refresh, we'd revisit by adding stronger expectation-setting, better scheduled/webhook sync, or provider-specific delay language.

## Success signal

In a local or TestFlight build, Andrew/Blaire can make or simulate a recent transaction, open Budget, and answer three questions without developer help:

- When did Kwilt last check the bank?
- Did Kwilt find new activity just now?
- Should I trust this budget claim, or could recent activity still be arriving?

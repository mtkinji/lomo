# Frame: transaction-freshness-trust

## What the user said

> Consider what job will be improved by making sure this always reflects the right and latest transactions - As a user I would struggle to trust this app if I new I made a transaction, then went to check my budget right after and it wasn't updated. I get there may be some delay, and if there is I think we'd have to communicate it.

## Restated in user voice

When Maya knows she just spent money and opens Kwilt Money to check the impact, she wants the app to either show the latest known transaction truth or clearly say why it may lag, so she can trust the budget reality before deciding what to do next.

## Target audience

`audience-aspirational-family-organizers` - households trying to stay organized without adopting a finance or productivity methodology.

## Representative persona

Maya is a household organizer who wants calm support for ordinary family spending decisions. Blaire is a concrete early-user instance of Maya in this app.

- Current situation: she has connected spend data, notices a recent real-world purchase, and expects Budget to reflect it when she checks.
- What they're trying to become/do: keep family spending intentional without manually reconciling a ledger.
- Emotional state or tension: one missing expected transaction makes the whole budget surface feel suspect, even if the app is technically showing the latest Kwilt database snapshot.
- What would make this feel wrong to them: silent staleness, vague "updated" language, or a budget meter that looks authoritative while recent known spending is absent.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - money surfaces need visible truth boundaries because the user is deciding whether to trust the app again next time.

## Job flow step

Primary step: `connect-spend-source` / "Ground the category in real spending evidence."

Current product offering: Accounts can connect Plaid, the backend can sync transactions, and connected spend snapshots feed Summary, Transactions, and budget detail.

Delivery score from the job-delivery map: `3.5` with medium confidence. The path is real enough to support the job, but link success, sync timing, and transaction availability can still separate in ways that weaken trust.

Gap: the app does not yet make bank-sync freshness a user-visible contract across the surfaces where Maya checks reality. Summary has some database freshness behavior, Accounts has last-sync labels, and Transactions loads inventory rows, but the user cannot reliably tell whether a missing recent purchase is normal bank delay, an unsynced Kwilt state, a filter/scope issue, or a broken connection.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - if known spending is missing without explanation, trust erodes quickly.
- `jtbd-review-budget-reality-before-spending` - budget reality cannot guide the next action unless it is current enough or honestly labeled.
- `jtbd-carry-intentions-into-action` - the app should handle freshness and recovery without making Maya manage sync mechanics.

## Friction we're addressing

Kwilt currently has two different truths: latest rows in Kwilt's database and latest transaction truth from the bank/Plaid. The user only experiences one question: "Did my spending count yet?" If the answer is no, the app needs to distinguish expected delay from stale sync from selected filter/scope from provider failure.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Summary, Transactions, Accounts, budget detail, app-control review, and future widgets all depend on connected spend credibility.
- Existing user flow: a signed-in user connects Plaid, the Edge Function stores an access token, `sync-plaid-transactions` imports rows, and app surfaces read `getConnectedSpendBudgetSnapshot()`.
- Existing domain/data model: `budget_financial_connections.last_synced_at`, Plaid sync cursors, `budget_transactions`, `ConnectedSpendBudgetSnapshot.lastSyncedAt`, `transactions`, and `allTransactions`.
- Existing technical affordances: callable Plaid transaction sync, Supabase Realtime for database row changes on Summary, Accounts last-sync labels, Transactions date-scope/filter controls, and existing freshness copy direction from Summary.
- Existing UX/copy conventions: concrete money state, one useful next step, no provider jargon by default, no shame, no dashboard clutter, and no overconfident claims when sync is stale.

Constraints to preserve:

- Do not promise instant bank truth.
- Do not call every missing recent transaction a failure.
- Keep Transactions as an inventory and Summary as budget reality, rather than turning either into a Plaid diagnostics dashboard.
- Preserve the distinction between "latest Kwilt DB snapshot" and "latest bank-posted transaction."
- Keep raw transaction details private and avoid unnecessary analytics around merchant names or exact amounts.

Constraints we may challenge:

- Transactions currently reads DB rows on mount without pull-to-refresh or realtime updates.
- Freshness is fragmented: Accounts knows sync recency, Summary knows snapshot refresh, and Transactions shows counts but not sync confidence.
- On-demand bank sync is not surfaced as a product action, even though the backend function exists.
- The app does not yet have a cross-surface freshness state model that gates strong budget claims.

Design implication:

This should not be framed as "make the list refresh more often" alone. The product needs a freshness trust contract: show latest loaded rows, make selected scope obvious, expose when Kwilt last checked the bank, offer a clear refresh/retry path where appropriate, and downgrade budget claims when bank-sync freshness is outside an honest window.

## Aspirational design challenge

How might we help Maya trust that recent spending has either been counted or clearly not arrived yet, while preserving Kwilt Money's calm, non-dashboard budget-reality experience?

## Out of scope

- Guaranteeing instant visibility for every card swipe or pending authorization.
- Building a full Plaid repair center.
- Adding raw provider diagnostics to the main budget surfaces.
- Changing transaction categorization semantics.
- Making on-demand bank refresh a monetization decision in this frame.

## Open question

What freshness promise is honest enough for the first release: "checked just now for latest Kwilt data," "checked the bank just now," or a two-layer label that names both?

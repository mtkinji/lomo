# Diverge: transaction-freshness-trust

## Axis of variation

The main variation is passive visibility versus active recovery:

- Passive visibility: explain what the app already knows.
- User-triggered recovery: give Maya a clear way to refresh/check.
- System-triggered recovery: have Kwilt check when freshness is old.
- Claim governance: use freshness to decide what budget claims are allowed.

## Alternative 1: Freshness Labels Everywhere

Add compact, consistent freshness language to Summary, Transactions, Accounts, and budget detail. The label distinguishes loaded transaction scope from bank-sync recency: `Updated from Kwilt just now` and `Bank checked 2 hr ago`. Transactions adds empty-state copy that distinguishes no rows in the current filter from no synced transactions. No new sync behavior is required.

- Audience/persona fit: high. Maya gets clarity without learning provider mechanics.
- Design-challenge answer: helps her understand whether recent spending has arrived.
- System-fit note: mostly fits current surfaces and `lastSyncedAt` data.
- Best when: the biggest trust leak is silent ambiguity.
- Fails when: the real need is faster bank pulls, not clearer language.
- Anti-pattern check: passes if labels stay quiet; fails if every surface becomes disclaimer-heavy.

## Alternative 2: Pull To Check Bank

Add an explicit refresh affordance to Transactions, Summary, and Accounts that can call the existing `sync-plaid-transactions` function when a signed-in connection exists. The UI uses two-step feedback: first checking the bank, then refreshing the Kwilt snapshot. Copy says `Checking for new bank activity...`, then `No new activity found` or `3 new transactions added`.

- Audience/persona fit: high. It matches the user instinct: "I know I just spent, let me check."
- Design-challenge answer: gives Maya one useful action when the expected row is missing.
- System-fit note: extends current callable sync path into a user-facing recovery action.
- Best when: users actively check after spending and want agency.
- Fails when: provider/API delay means on-demand sync often returns nothing, making the button feel broken.
- Anti-pattern check: passes if throttled and honest; fails if the button implies instant card-swipe truth.

## Alternative 3: Freshness-Aware Budget Claims

Create a shared freshness model that classifies connected spend state as `fresh`, `recent`, `stale`, `syncing`, `delayed`, or `error`. Summary, budget detail, app-control review, and widgets use that state to decide claim strength. For example, a meter can show known spend but soften forecast or gate decisions when bank sync is stale: `Last bank check was yesterday. Recent purchases may still be arriving.`

- Audience/persona fit: very high for trust-critical money surfaces.
- Design-challenge answer: avoids authoritative budget claims when recent spending may be missing.
- System-fit note: extends the domain boundary around `ConnectedSpendBudgetSnapshot`.
- Best when: the app is beginning to drive consequential decisions like app pausing.
- Fails when: implementation gets too abstract before any visible user payoff ships.
- Anti-pattern check: passes if claim changes are simple; fails if users see a complex trust taxonomy.

## Alternative 4: Accounts As Sync Control Center

Make Accounts the primary place for sync recency, connection status, retry, and repair. Summary and Transactions show compact labels that link or route to Accounts only when something needs attention. Accounts owns the detailed state: last bank check, latest transaction date, connection health, and sync action.

- Audience/persona fit: medium-high. It respects Accounts as the connection inventory but requires users to know where to look.
- Design-challenge answer: makes the source of truth inspectable without cluttering every budget surface.
- System-fit note: fits the Accounts brief well and avoids diagnostics elsewhere.
- Best when: connection health is the main problem.
- Fails when: Maya is checking Summary or Transactions and does not want to detour.
- Anti-pattern check: passes if Accounts stays object-inventory-like; fails if it becomes a Plaid dashboard.

## Alternative 5: Background Reliability Layer

Add scheduled sync and/or Plaid webhooks so Kwilt imports new bank activity without relying on app opens. The app still shows freshness labels, but the primary improvement is behind the scenes: more recent data lands before Maya checks.

- Audience/persona fit: high long-term, invisible short-term.
- Design-challenge answer: improves the odds that recent spending is already counted.
- System-fit note: requires backend scheduling/webhook infrastructure and deployed verification.
- Best when: the app is moving toward TestFlight/production trust.
- Fails when: webhook/schedule complexity delays the near-term learning release.
- Anti-pattern check: passes if paired with visible freshness; fails if invisible sync is treated as proof users will trust it.

## Alternative 6: Transaction Arrival Receipt

After sync adds rows, show a small receipt in Transactions or Accounts: `3 new transactions arrived from Chase` with a path to review. This avoids turning refresh into a silent state change and helps Maya connect bank sync to budget truth.

- Audience/persona fit: medium. Useful when she initiated refresh or just linked an account.
- Design-challenge answer: confirms that Kwilt actually updated its evidence.
- System-fit note: builds on existing transaction review and account inventory patterns.
- Best when: new rows need review or categorization.
- Fails when: frequent receipts feel noisy or promotional.
- Anti-pattern check: passes if receipt is concise and dismissible; fails if it becomes notification-like churn.

## Divergence readout

The strongest path is probably not one alternative alone. The smallest trust-building release combines:

- A shared freshness model.
- Visible two-layer freshness labels.
- Pull-to-check-bank on the surfaces where the user notices missing data.
- Accounts as the deeper source of connection health.

Scheduled/webhook sync is important, but it should follow after the app has an honest freshness contract; invisible reliability without visible truth still leaves trust gaps.

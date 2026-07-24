# Frame: plaid-transaction-backed-meter

## What the user said

> I just submitted the Plaid questionnaire and now I'm ready to setup my first dev mode integration test into the Kwilt Money app, walk me through it. My objective is to link to my bank account so that I can pull transactions (the only box I checked) and check them against a specific budget.

## Restated in user voice

When I create a budget lane and connect one bank account, I want Kwilt Money to find the transactions that likely belong in that lane, so the meter reflects reality without making me manually classify every purchase.

## Target audience

`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance or productivity methodology.

## Representative persona

Maya: a parent or household lead who wants calm support for ordinary family spending decisions.

- Current situation: family spending leaks through ordinary convenience apps and card transactions.
- What she is trying to become/do: keep a few chosen spending lanes inside reality without becoming a finance hobbyist.
- Emotional state or tension: she wants trustable current information, but bank linking and budget policing can easily feel invasive or shamey.
- What would make this feel wrong to her: a generic transaction ledger, hidden categorization, scary bank-copy, punitive budget warnings, or a system that asks for more data than the job needs.

## Hero anchor

`jtbd-put-intention-before-impulse` - help me put a meaningful action before the apps I drift into.

## Job flow step

Local job flow: `job-flow-maya-review-budget-reality-before-spending`.

Underserved step: create a lane, connect real transactions to it, and keep the lane meter current enough that the review gate feels trustworthy.

Current product offering: hard-coded `BudgetLane`, fixture-backed meter, review screen, and in-memory review events.

Delivery score: 2. The review behavior exists, but the meter is not yet grounded in bank/card reality.

Gap: no user-created lanes, no linked financial account, no transaction sync, no inferred transaction-to-lane assignment, and no persisted meter ledger.

## Active anchors

- `jtbd-put-intention-before-impulse` - transaction-backed meters make the pre-app pause more useful.
- `jtbd-carry-intentions-into-action` - the household budget intention can be carried into the moment where spending happens.
- `jtbd-trust-this-app-with-my-life` - bank data and spending restrictions require a transparent, narrow, reversible model.
- `jtbd-review-budget-reality-before-spending` - the local sub-job is directly served by making the meter real.

## Friction we're addressing

The existing app can show a meter, but the meter is not yet believable. If the user has to maintain it manually, the gate becomes another chore. If Plaid import becomes a transaction dashboard, the product loses its wedge. The design question is how to let the user create a meaningful lane, then have Kwilt infer which transactions belong there while keeping the user in control.

## Anchor assessment

### Restated in user voice

When Maya creates a budget lane for a spending context, she wants Kwilt to connect likely matching transactions automatically, so the meter becomes useful without becoming a manual bookkeeping ritual.

### Matches

- `jtbd-put-intention-before-impulse` - the linked account makes the impulse pause actionable instead of symbolic.
- `jtbd-carry-intentions-into-action` - inferred transaction assignment helps the budget intention stay present without manual upkeep.
- `jtbd-trust-this-app-with-my-life` - the narrow provider boundary, explicit linking, and visible sync state are trust requirements.
- `jtbd-review-budget-reality-before-spending` - this is the direct local job for Kwilt Money.

### serves snippet

```yaml
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
```

## System alignment

Constraint posture: `Extend the system`.

Current system facts:

- Existing surface: Expo app with home meter, review screen, settings tab, and Supabase auth seam.
- Existing user flow: open home, inspect fixture lane, review before opening Amazon, record review.
- Existing domain/data model: `BudgetLane`, `BudgetMeter`, `AppGateTarget`, and `BudgetReviewEvent`.
- Existing technical affordances: fixture repository, Supabase client boundary, future Screen Time seam, Expo Router.
- Existing UX/copy conventions: calm headline, concrete meter, "open for now" language, no shame copy.
- Plaid implementation facts checked: Plaid Link requires server-created `link_token`; React Native SDK supports Link; Transactions Sync is cursor-based; Sandbox supports Link and API testing.

Constraints to preserve:

- Provider secrets and access tokens stay server-side.
- The app requests only Transactions for this slice.
- The user explicitly creates the budget lane and chooses which linked accounts can feed it.
- Provider categories, merchants, accounts, amounts, dates, and recurrence patterns are inference signals, not Kwilt's product truth.
- Inferred assignment should create suggestions or confidence-marked assignments; user confirmations should become durable rules.
- The visible app should remain a meter/review product, not a financial dashboard.

Constraints we may challenge:

- The fixture-only `BudgetLane` needs to become a persisted lane plus period plus ledger.
- The repository layer needs to split fixture/demo data from account-backed data.
- The settings or plan surface needs a dev-only connection/setup entry point.

Design implication:

Plaid should enter the product as a financial-data provider behind a normalized transaction and meter-ledger model. The first proof should be one user-created lane, one account, one explainable inference rule or suggestion set, one recomputed meter, and one review gate using that meter.

## Aspirational design challenge

How might we help Maya create a budget lane and have Kwilt infer the right transactions for it, while preserving control, trust, and Kwilt's calm non-dashboard product shape?

## Out of scope

- Full transaction browsing.
- AI categorization.
- Multiple institutions or household sharing.
- Cash-flow forecasting.
- Production rollout to users beyond Andrew/dev testing.
- Auth, Identity, Payments, Balance, or any Plaid product beyond Transactions.

## Open question

Should the first end-to-end test use Plaid Sandbox only, or run Sandbox first and then immediately repeat with Andrew's real Development-mode bank account?

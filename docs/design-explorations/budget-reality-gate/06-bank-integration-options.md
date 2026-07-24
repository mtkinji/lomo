# Bank Integration Options: budget-reality-gate

## Why This Is Required

The budget gate can be prototyped with manual or fixture values, but the durable
product needs bank and card transaction data. Without real transactions, meters
become another thing the user has to maintain, and the review gate loses trust.

The integration should not be designed as "Plaid code" or "MX code" scattered
through the app. It should be a provider boundary:

- linked financial institutions,
- linked accounts,
- raw provider transactions,
- normalized transactions,
- merchant/category enrichment,
- meter assignment rules,
- sync status and repair states.

## Provider Options

### Plaid

Useful current facts:

- Plaid Link is the required user-facing account connection flow in Production.
- Plaid has a React Native SDK path for mobile.
- `/transactions/sync` retrieves incremental transaction updates using a cursor.
- Plaid Sandbox is free and fully featured for development/testing.
- Plaid has Pay as You Go pricing for individuals/developers, plus a Trial plan that supports limited Production Items before paid Production.

Product fit:

- Strong default for a solo/early mobile build because the developer path is public and sandbox-friendly.
- Good match for proving transaction ingestion, merchant matching, and meter assignment before negotiating larger commercial terms.
- The main product risk is ongoing per-Item subscription cost for Transactions once real users connect accounts.

### MX

Useful current facts:

- MX Account Aggregation retrieves account and transaction data.
- MX documents 90 days of account and transaction history for Account Aggregation.
- MX automatically cleanses transactions into predefined categories and enhances merchant/subscription/direct-deposit information.
- MX Connect Widget supports embedding in mobile apps, including a React Native SDK.
- MX production readiness includes dashboard setup, production access, OAuth registration when needed, webhooks, and support/product enablement checks.

Product fit:

- Strong candidate if MX's enrichment, categorization, institution coverage, or commercial terms prove better for Kwilt Money.
- Potentially attractive if the app leans heavily on transaction cleansing and merchant/category quality.
- The main early risk is sales/production enablement friction compared with Plaid's self-serve developer path.

## Recommendation

Use a provider abstraction immediately and make Plaid the first integration path
unless MX offers clearly better terms or materially better transaction access
for the target institutions.

That means:

1. Build `FinancialDataProvider` around the product needs, not around Plaid or MX terminology.
2. Implement sandbox transaction ingestion with Plaid first.
3. Keep MX as a second provider candidate behind the same normalized transaction model.
4. Evaluate MX before production if pricing, access reliability, or institution coverage becomes the limiting factor.
5. Treat enrichment quality as a Kwilt product layer, not only a provider feature.

## Enrichment Strategy

Kwilt should not assume provider enrichment is enough to make meters trustworthy.
Plaid or MX can supply useful merchant/category hints, but the product-specific
job is assigning transactions into user-meaningful meters.

Provider enrichment can help with:

- cleaned merchant names,
- broad categories,
- transaction ids and pending/posted status,
- account metadata,
- location or payment-channel hints when available.

Kwilt-owned enrichment should handle:

- meter assignment rules, such as DoorDash to `Takeout`;
- purpose-specific merchant splits, such as Amazon household versus Amazon work;
- user corrections that become durable rules;
- account-aware routing, such as one card used for work expenses;
- amount or recurrence patterns, such as subscriptions;
- confidence levels and review states for ambiguous transactions;
- future AI-assisted suggestions that always ask before changing rules.

The product advantage is not "we categorize every transaction perfectly." It is
"we learn the few mappings that matter for the meters the user actually gates."
That keeps enrichment scoped to the budget reality gate instead of turning Kwilt
Budget into a generic personal finance manager.

## Product Model Implication

Bank integration changes the meter model:

- A `BudgetMeter` is not just a manually edited number.
- A meter has assignment rules that pull normalized transactions into a spending context.
- A single app target may map to different meters depending on purpose, such as `Amazon household` versus `Amazon work`.
- A transaction can be assigned by merchant, account, category, amount pattern, user override, or later by AI-assisted suggestion.
- Provider categories are inputs to assignment, not source-of-truth product categories.

## Learning Release Adjustment

Manual or fixture values are acceptable only for the earliest interaction test.
The first serious learning release should include at least sandbox-backed
transaction sync, because the trust question is not only "do I like the gate?"
but also "do I believe this meter reflects reality?"

## Sources Checked

- Plaid Link overview: https://plaid.com/docs/link/
- Plaid Transactions API: https://plaid.com/docs/api/products/transactions/
- Plaid Sandbox overview: https://plaid.com/docs/sandbox/
- Plaid pricing: https://plaid.com/pricing/
- Plaid pricing models help: https://support.plaid.com/hc/en-us/articles/16194632655895-How-much-does-Plaid-cost-and-what-are-the-pricing-models
- MX Connect Widget overview: https://docs.mx.com/connect/
- MX Account Aggregation: https://docs.mx.com/products/connectivity/account-aggregation/
- MX API integration checklist: https://docs.mx.com/resources/integration-checklist/

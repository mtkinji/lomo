---
id: brief-money-capability-first-entry
title: Money Capability First Entry
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-money-progressive-activation, brief-kwilt-money-capability-integration]
exploration: docs/design-explorations/money-capability-first-entry
owner: andrew
last_updated: 2026-08-20
---

# Money Capability First Entry

## Context

Kwilt exposes Budgets, Transactions, and Accounts as three places inside one Money capability, but
first use is not coordinated across them. The existing Money setup has the right functional spine,
while the current capability-onboarding handoff defines Money as app controls and sends a no-budget
user to category creation.

## Target audience

Aspirational family organizers want household financial truth without adopting a budgeting hobby.
Money should establish only the foundation needed to provide a useful answer.

## Representative persona

Maya taps a concrete Money destination because she wants to understand or establish household
money reality. She should not have to infer why another screen appeared or repeat setup because she
entered through a different sibling destination.

## Aspirational design challenge

How might we help Maya establish one trustworthy Money foundation from any Money entry point,
while preserving the destination she chose and avoiding finance-system administration?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Money matters when it helps Maya make a real household
decision, not when it teaches product taxonomy.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, steps 1 and 2: recognize and enter the Money
job (score 2) and start or resume minimum setup (score 2). Native destinations and setup exist, but
they do not yet form one capability adoption and return contract.

## JTBD framing

When Maya opens any Money destination for the first time, she wants Kwilt to establish the one
foundation those destinations share and return her to what she chose, so she can trust the result
without becoming a finance administrator. This serves
`jtbd-review-budget-reality-before-spending` and `jtbd-trust-this-app-with-my-life`.

## Design

### Entry coordination

Add one Money-owned entry route with:

```ts
type MoneyEntrySource = 'capability-onboarding' | 'capability-menu' | 'empty-state' | 'direct';
type MoneyPlaceRouteName = 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts';

type MoneyEntryParams = {
  requestedPlace: MoneyPlaceRouteName;
  source: MoneyEntrySource;
  mode?: 'automatic' | 'setup';
};
```

Universal onboarding defaults to Budgets. Budgets and Accounts remain visible before setup.
Transactions is hidden from the main navigation until Money projects durable account or transaction
evidence; unknown/error state never hides it, and direct routes remain resolvable.

### Adoption state

Persist one normalized, user-scoped Money record that distinguishes:

- introduction seen;
- dismissal;
- active checkpoint;
- latest requested place;
- completed financial foundation;
- prior account/transaction evidence sufficient for stable Transactions visibility.

Old Money onboarding records migrate without replaying the introduction. Current capability
evidence outranks a local completion receipt when deciding whether native recovery is needed.

### Shared FTUX

The capability introduction is the Money welcome; do not repeat another welcome after `Set up
Money`. Setup begins with the first financial-institution connection, confirms the exact accounts
Kwilt found, then moves through analysis to an evidence-backed planning-intent decision. Keep the decision sequence in
Kwilt's illustration-led full-screen interstitial design; do not introduce the Money application
shell, destination header, or page-card treatment until dismissal or acceptance.

Use a quiet text counter on sequential decision steps without a progress track. After the first
institution, name the institution and list every included account, then ask
`Is anything important missing?` The person can confirm `No—use these accounts`, say
`Continue with these for now`, or choose `Yes—connect another institution`. The first answer marks
the evidence as a complete-enough household view; the second intentionally continues with partial
coverage and scopes every later claim to the connected accounts. The third opens an in-context
upgrade offer only after it is tapped for a Free member; Pro members go directly to Plaid. One institution
login is free and includes all eligible accounts returned under that Plaid Item. Relink, repair, or
replacement of the first institution is never paywalled.

Analysis is the deliberate exception to the canonical illustrated step: it is nearly empty, with
only the full Kwilt mark and one large truthful processing statement. No image, title, counter,
button, or persistent close competes with this first proof moment. Each statement is driven by the
actual pipeline phase, and the mark repeatedly resolves, spins, and resolves. When work finishes,
the next surface first proves the observed income, regular commitments, flexible-spending pattern,
coverage, and household basis. It then asks one required intent question:

`Should this plan reflect how you spend now—or help you spend less?`

- `Start from how we spend now` — `Use our recent regular costs and flexible spending.`
- `Spend less each month` — `Protect regular costs and build a leaner flexible-spending plan.`
- `Recommend a starting point` — `Use Kwilt’s suggestion. We can change it later.`

This question is accepted product behavior. It asks whether the person wants continuity, reduction,
or delegation; it does not ask them to choose a model, budgeting philosophy, percentage, or purpose
for unplanned income. Regular commitments remain a constraint in every branch. Household size and
connected history are evidence inputs rather than user-visible models. A resulting percentage may
be shown as an adjustable consequence, but it does not organize the decision. The next required
question is:

`What share of dependable income should the monthly plan use?`

The control always presents one synchronized choice as both percentage and dollars. It also shows
the same choice against recent monthly spending visible in the connected accounts and names the
amount left outside the plan. The user never has to choose between percentage mode and dollar mode.
For complete-enough coverage, `Recommend a starting point` uses 70 percent as the baseline when the
evidence supports it. `Spend less each month` must suggest a target below observed spending, while
still protecting detected regular commitments; 70 percent is not automatic when it would increase
the plan. For intentionally partial coverage, 70 percent is a neutral adjustable starting point,
not a household recommendation, and all comparisons say `in these accounts`. Category assignments
remain provisional and do not carry the proof burden in this decision. If income evidence is
inadequate, Kwilt does not fabricate a recommendation.

Step 3 prewarms the Plaid link token and native session. Plaid is a temporary excursion inside that
step, including app-to-app OAuth. On return, `Finishing your connection` replaces the action while
Kwilt exchanges the public token. Only durable connection evidence advances to analysis. Cancel or
error stays recoverable in Step 3; an already durable account auto-advances; and a later plan error
retries plan construction without asking for Plaid again.

Illustrations carry friendliness on the entry and connection frames. Transient connection substates
reuse the connection scene. Coverage removes the illustration so the verified accounts and missing-
account decision fit without hiding below the action dock. Analysis and evidence assessment also
remove illustration so the financial result—not decoration—has the visual weight.

### `Not now`

Record introduction without claiming setup completion, then replace the coordinator with the
requested destination. Do not replay the full introduction automatically.

- Budgets: explain that connected accounts let Kwilt build a budget from real income and spending;
  primary action `Connect accounts`.
- Accounts: show an empty inventory with primary action `Connect an account`.
- Transactions direct entry: explain that transactions appear after connection and sync; primary
  action `Connect an account`.

Partial real data remains visible with a quiet `Finish Money setup` action.

### Completion and resume

Persist checkpoints through interruption. A newer explicit tap updates the post-setup destination
without erasing valid progress. Completion replaces the coordinator with the requested place and
uses destination-specific copy: `See my budgets`, `Review transactions`, or `View accounts`.

### Navigation visibility

The shell consumes only a Money-owned availability projection. It does not inspect Plaid,
accounts, transactions, targets, or plan state. Transactions visibility must not flicker during
menu use, loading, refresh errors, or temporary disconnection.

## UI contract

See
[`docs/design-explorations/money-capability-first-entry/06-ui-contract.md`](../design-explorations/money-capability-first-entry/06-ui-contract.md).

## Analytics and privacy

Track entry source, requested place, checkpoint, action, and reduced availability state. Never send
balances, target percentage, merchants, institutions, account names, or transaction content.

## Acceptance criteria

- Universal onboarding, Budgets, Accounts, and direct Transactions entry share one first screen and
  setup spine.
- Budgets and Accounts remain visible in a pristine menu; Transactions is hidden until durable
  evidence exists.
- `Not now`, resume, completion, and error paths preserve destination truth.
- Existing oriented Money users pass through without beginner onboarding.
- Budgets, Accounts, and Transactions have deliberate empty states with one direct next action.
- Internal established Money navigation remains direct.
- Navigation history does not replay the coordinator on Back.
- State normalization, decision logic, routing, visibility, and destination preservation have
  focused tests.
- Plaid is prepared before presentation; cancel and exchange-return states stay in Step 3, and
  durable account evidence is the only connection-to-analysis gate.
- Coverage names the included institution and accounts before calculation; an additional institution
  is an explicit Pro-gated choice, never an automatic paywall.
- Analysis messages map to actual operations; the loading mark resolves between spin cycles.
- The assessment uses actual connected evidence (or isolated deterministic development evidence),
  shows the exact included coverage and amounts, asks the accepted continuity/reduction/delegation
  question, then presents one linked percentage-and-dollar target without relying on provisional
  categories or inventing a recommendation without income.
- iPhone 17 Pro Simulator review covers the accepted matrix and enlarged text hierarchy.

## Success signal

Maya can enter Money from the place that makes sense, understand the one foundation Kwilt needs,
leave or resume without losing orientation, and arrive at the exact Money place she chose.

## Spec refinement

- `Not now` counts as introduction, not foundation completion.
- Pristine Transactions is hidden only in the main menu; it remains a safe addressable route.
- Unknown or failed availability checks preserve Transactions rather than hiding existing value.
- A successful account connection may reveal Transactions before the plan is complete.
- Signed-device Plaid OAuth, TestFlight, and production first-run are later gates.
- The development rehearsal uses a deterministic fictional household and never writes its sample
  accounts, evidence, or accepted target to the signed-in person's Money data.

## Open questions

- After rendered evaluation, is the evidence assessment reductive enough to feel intelligent rather
  than like a dashboard?

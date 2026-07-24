# Diverge: plaid-transaction-backed-meter

## Axis of variation

The key variation is where Plaid and inference first create user-visible value:

- transaction visibility,
- meter truth,
- lane creation,
- transaction inference,
- or backend confidence.

Because Kwilt Money's wedge is the app-opening review, the alternatives are judged by whether they make that review more trustworthy without pulling the app into generic finance-app shape.

## Alternative 1: Ledger First

Plaid Link connects the account, then the app shows imported transactions and lets the user manually assign them to a budget lane. The meter updates after assignments.

Audience/persona fit: mixed. Maya may appreciate transparency, but a ledger-first experience asks her to become a budget operator.

Design-challenge answer: makes transaction data inspectable, but delays the calm review value.

System-fit note: requires a new transaction list surface and assignment UI.

Best when: imported data quality is unknown and debugging needs to be highly visible.

Fails when: the user experiences the app as another budgeting chore.

Anti-pattern check: high dashboard and admin risk.

## Alternative 2: Lane First With Suggested Matches

The user creates a lane with a name, amount, period, and optional hints such as merchants, linked apps, accounts, or categories. After sync, Kwilt suggests transactions that appear to belong in that lane. The user can accept the suggestion set or correct the obvious misses. Confirmed choices become future rules.

Audience/persona fit: strong. Maya gets a lane in her own language and does not have to classify every transaction.

Design-challenge answer: makes the lane feel user-owned while letting Kwilt do the matching work.

System-fit note: requires lane creation plus `suggested`, `confirmed`, and `ignored` assignment states.

Best when: the first lane has clear merchant/account signals, like Amazon household or DoorDash/takeout.

Fails when: the setup asks for too many hints or the user has to review too many transactions.

Anti-pattern check: passes if suggestions are sparse and explainable; fails if it becomes bookkeeping.

## Alternative 3: Meter First With Explicit Rule

Plaid Link connects one account, the backend syncs transactions, and one explicit assignment rule routes matching transactions into a selected budget lane. The home and review screens show the recomputed meter plus sync freshness.

Audience/persona fit: strong. Maya gets a more believable meter without managing a ledger.

Design-challenge answer: one linked account supports one trustworthy review moment.

System-fit note: extends existing `BudgetLane`, `BudgetMeter`, and review screens with a ledger-backed `spentCents`.

Best when: the test budget has obvious merchant/account/category signals and the team needs a fast first sync proof.

Fails when: ambiguous transactions dominate and the user cannot tell why the meter changed.

Anti-pattern check: passes if the assignment rule is visible and reversible.

## Alternative 4: Backend Harness First

Build only the provider boundary, token exchange, sync job, storage, and logs. The app UI remains fixture-backed until ingestion is stable.

Audience/persona fit: low in the short term because there is no product experience to feel.

Design-challenge answer: builds trust in the technical path, not the review flow.

System-fit note: lowest UI blast radius; useful for secrets, sync, and schema validation.

Best when: security and provider correctness are the riskiest unknowns.

Fails when: the team learns only "Plaid works" and not whether the meter is useful.

Anti-pattern check: passes technically, but risks postponing product learning.

## Alternative 5: Sync Status Gate

Before opening the spending app, Kwilt Money checks whether the lane has synced recently. If fresh, show the meter; if stale, show a calm "last updated" state and let the user decide whether to continue.

Audience/persona fit: strong later, but too dependent on a working meter for the first slice.

Design-challenge answer: treats data freshness as part of trust.

System-fit note: adds sync health to the review screen and future Screen Time behavior.

Best when: the first meter-backed path exists and stale data becomes a real user problem.

Fails when: built too early and turns the first test into status plumbing.

Anti-pattern check: pass if freshness copy is humble; fail if stale data becomes fear copy.

## Alternative 6: Tiny Correction Loop

After sync, Kwilt Money shows only ambiguous transactions for the selected lane and asks the user to confirm whether they count. Confirmed choices become assignment rules.

Audience/persona fit: useful for trust, but risky before the core meter loop is proven.

Design-challenge answer: improves meter accuracy while keeping review scoped to one lane.

System-fit note: requires new review states, rule creation, and correction UI.

Best when: provider categories are too noisy for the lane.

Fails when: it becomes daily transaction triage.

Anti-pattern check: defer; it is a strong second slice, not the first Plaid test.

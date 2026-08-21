# Converge: Monthly Household Plan

## Status and Scope

This document records the comprehensive solution design accepted through the
2026-08-20 conversation. It is a product model, not yet a final object model,
schema, UI specification, learning-release plan, or implementation plan.

Savings visibility, the decremented resource pool, runway presentation, and
the relationship among current cash, the monthly plan, and long-term wealth
remain explicitly unresolved.

## Chosen Direction

Center Kwilt Money on one **monthly household plan amount**.

The household should know:

- that it has a plan;
- what monthly amount governs the plan;
- that the amount is intelligently supported;
- how much is committed or protected;
- how much remains flexible; and
- how current-month additions and prior category balances affect the answer.

Kwilt may derive or recommend the monthly amount using normalized income,
recent spending, a user-set stable amount, runway preservation, or another
supported model. The derivation is inspectable provenance, not the primary
interface.

## Why This Replaces the Current Center

`Live on 70% of income` remains a valid household strategy. It is not a valid
universal product ontology.

A percentage-of-income center becomes incoherent when:

- income is absent during a job transition;
- a final paycheck arrives while the household already thinks of itself as
  living from savings;
- business or commission income is lumpy;
- the household is living from loans while attending school;
- deposits are rare and enormous but ordinary spending should remain stable;
  or
- the household simply prefers a fixed monthly amount.

The invariant is the monthly amount the household intends to plan around. The
method used to derive it may change without replacing the category plan.

## Evidence-Backed Setup

The preferred first-use sequence is evidence first, plan decision second when
the person is willing and able to connect accounts.

Kwilt should:

1. connect and normalize supported account evidence;
2. identify income cadence, committed costs, recent category spending, account
   coverage, and eventually supported available balances;
3. produce one recommended monthly household amount;
4. show the immediate consequence for committed/protected and flexible money;
5. let the user accept in roughly three seconds; and
6. keep comparison, derivation, and manual entry behind secondary disclosure.

The primary interaction should not be `Choose your budgeting model`. A likely
shape is:

> **Plan around $X each month**
>
> Based on the evidence Kwilt can currently support. This leaves about $Y for
> flexible spending.

Actions:

- `Use this plan`
- `Compare other amounts`

Exact copy and rendered hierarchy remain open.

When evidence is insufficient, Kwilt asks for one stable monthly amount rather
than presenting a financial questionnaire. It never invents income, spending,
balances, or runway.

## Durable Household Arithmetic

At the household level:

```text
monthly household plan amount
- committed and protected contributions
= flexible spending capacity
```

More explicitly:

```text
monthly household plan amount
= committed/protected category contributions
 + flexible category contributions
 + any deliberately unassigned capacity
```

The plan amount is ordinary monthly capacity. A one-time addition does not
increase general flexible capacity.

## Category Contributions and Current Availability

Each category has a durable base monthly amount. If carry-forward is enabled,
the amount available this month is adjusted by the prior signed carry:

```text
effective amount this month
= base monthly amount + prior carry

carry into next month
= effective amount this month
 + settled category-bound additions this month
 - counted category spending this month
```

Example deficit:

```text
Health base monthly amount       $400
Prior-month carry              - $100
Available this month             $300
```

Example surplus:

```text
Health base monthly amount       $400
Prior-month carry              + $100
Available this month             $500
```

The durable Health amount remains `$400`; only the amount available this month
changes.

If a deficit exceeds the base monthly amount, the UI should not present a
negative amount as spendable. It should show `$0 available` and the remaining
amount to recover. Exact recovery language and whether a protected floor
changes the carry treatment require rendered design review.

## Carry-Forward Policy

The user-facing category setting is:

> **Carry balance forward**
>
> Unused room or overspending continues into future months until it is used,
> recovered, or started fresh.

Carry is:

- optional per category;
- signed, preserving both surplus and deficit;
- cumulative across all months after its start boundary;
- planning math, not a transaction;
- visible in Summary and category detail through the same authoritative
  projection; and
- non-punitive in language and presentation.

This supersedes the earlier first-release assumption that rollover is simply a
previous-month adjustment separate from accumulated reserve behavior.

### Protected-category guardrail

A negative carry must never silently erase a protected household necessity.
When a carried deficit conflicts with a protected floor, Kwilt must preserve the
floor and expose a whole-plan conflict or recovery choice. It must not imply
that the family should stop buying food or meeting another protected need.

## Rollover Start Boundaries

A household may begin using Kwilt in August but want to know what the current
category balance would be if rollover had started in January.

The household-level default is:

> **Start rollovers from January 2026**

Each category may override that start month.

For a new user without historical Kwilt plan versions, the result is explicitly
counterfactual:

> If Health had been `$400/month` since January, you would enter August with
> `$X` carried forward.

The calculation applies the selected base amount and counted historical
spending sequentially from the chosen starting month. It must not describe the
result as a historical fact.

Evidence requirements:

- connected transaction coverage for the selected period;
- supported category assignments;
- a known or explicitly assumed category amount for each period; and
- visible disclosure of missing or partial history.

When evidence begins in March, Kwilt should recommend March rather than treating
January and February as zero-spend months.

By definition, `Start tracking from January` means January begins with zero
carry, and January's result first adjusts February. The wording must avoid the
common off-by-one ambiguity of `first month with rollover`.

## Reset Boundaries

Start and reset use one conceptual primitive: a boundary after which carry is
calculated from a fresh zero adjustment.

Supported user intentions:

### Start one category fresh

From category detail:

> **Start next month fresh**

History remains unchanged. The next month begins with the durable base amount
and no prior carry.

### Start all categories fresh

From the household Money Plan:

> **Start all categories fresh next month**

The preview names positive room that will stop carrying and deficits that will
stop reducing future months.

### Start each plan year fresh

An optional household-level recurring rule may start all carry-enabled
categories fresh in January or another chosen plan-year month.

The first design should not introduce independent recurring reset schedules for
every category. Per-category one-time reset plus an optional household annual
boundary covers the articulated need with less configuration.

A reset changes planning treatment only. It never deletes transactions,
rewrites historical actuals, changes account balances, or pretends prior
overspending did not happen.

## One-Time Monthly Additions

Carry-forward handles lumpy but ordinary spending. It cannot cover every fast,
surprising, or newly chosen expense.

A **one-time monthly addition** lets the household accept a named,
category-bound amount for one selected month without changing the durable
monthly household plan or future category contributions.

Example:

```text
Normal August household plan               $8,000
One-time addition: Olive's orthodontics   +$2,000
August planned outflow                     $10,000
```

The addition:

- may be created before spending from a known or estimated amount;
- may be accepted after the expense posts;
- belongs to a named category and purpose;
- does not become general flexible money;
- does not change September or later months;
- remains distinct from actual spending; and
- does not require the user to specify which account, HSA, savings balance, or
  asset sale funded it.

`Planned` means accepted as part of the household's plan for that month. It does
not require weeks of advance prediction.

### Material mismatch activation

Kwilt should not ask the family to inspect every transaction. When connected
evidence shows one consequential outflow is the likely reason a category is
materially over its available plan, Kwilt may offer one focused action:

> Olive's orthodontics put Health `$1,740` above its available plan.

Actions:

- `Add $1,740 to August`
- `Leave August over plan`

After acceptance:

> Added `$1,740` for Olive's orthodontics. Your usual monthly plan is unchanged.

The exact matching, confidence, grouping, and correction rules remain to be
specified. The model must support multiple related transactions and estimates
that settle to a different actual amount without requiring routine transaction
review.

## Three Ways to Reconcile a Material Overage

For a material mismatch, the household may choose among three meanings:

1. **Carry the deficit forward.** Future category availability is reduced until
   the overage is recovered.
2. **Add it to this month.** Accept a one-time addition without burdening future
   months.
3. **Change the durable plan.** Appropriate when repeated evidence shows the
   ordinary household or category amount is unrealistic.

Kwilt should not automatically excuse an overage or choose among these meanings
without user authority.

Repeated similar additions are evidence that the durable monthly amount or
category contribution may be wrong. Kwilt should then suggest a durable change
rather than normalizing endless exceptions.

## Summary and Category Implications

The existing primary Summary answer may remain:

> `$X flexible money left`

Supporting facts can realign it to the new model:

- `$Y` monthly household plan;
- `$A` committed or protected;
- `$B` flexible capacity;
- `$C` added this month; and
- material signed carry when it changes current availability.

The Summary should not become a plan-math dashboard. Detailed derivation,
history boundaries, reset receipts, and category arithmetic belong behind
progressive disclosure.

Category detail may show:

```text
Base monthly amount       $400
From last month          -$100
Added this month        +$1,740
Available                $2,040
Spent                    $2,000
Left                        $40
```

Exact labels and hierarchy require a reductive UI exploration.

## Transaction Treatment

Transactions remain authoritative evidence of actual money movement and
category spending. Ordinary use must not require the user to attach funding
provenance to individual transactions.

The current `Outside the plan` treatment should eventually be narrowed. A
large expense paid from savings is still real household spending and should not
be excluded merely because it was unusual. Legitimate exclusion cases may
include duplicates, reimbursable or non-household activity, and other explicit
non-plan meanings, but those boundaries require separate review.

Connected evidence should calculate current financial state wherever possible.
The user should not have to balance a digital checkbook to keep Kwilt accurate.

## Conceptual Domain Shape

This is not a final object model, but the solution requires these distinct
concepts:

- **Monthly household plan amount:** durable ordinary monthly capacity.
- **Plan derivation:** evidence and method used to recommend or set that amount.
- **Category base monthly amount:** durable monthly contribution.
- **Signed category carry:** cumulative adjustment from prior periods.
- **Carry boundary:** the month where calculation starts fresh, used for both
  retroactive starts and resets.
- **One-time monthly addition:** named category-bound capacity for one period.
- **Actual spending:** transaction-backed outflow evidence.
- **Financial resources:** balances or assets that ultimately support spending;
  presentation and decrement behavior remain unresolved.

Do not collapse plan, actual, carry, addition, and resources into one amount or
status.

## Invariants

1. A one-time expense never silently changes future months.
2. A one-time addition never becomes general flexible capacity.
3. Carry can be positive or negative and persists until used, recovered, or
   explicitly restarted.
4. Retroactive carry is labeled as a counterfactual when no historical plan
   existed.
5. Missing transaction history never becomes assumed zero spending.
6. Reset preserves actual history and creates a visible plan boundary.
7. Protected household necessities are not silently eliminated by carried
   deficits.
8. Asset sales, savings withdrawals, or loans do not become ordinary income
   merely because they support spending.
9. The household does not need to inspect or annotate every transaction.
10. Material plan changes are explainable, reviewable, and reversible when
    safe.
11. Summary, category detail, widgets, Chat, and app controls consume the same
    authoritative plan projection.
12. The system states which evidence supports a recommendation and refuses
    unsupported precision.

## Reductive Decisions

- Replace `percentage of income` as the center with `monthly household plan
  amount`.
- Keep percentage of income as one derivation, not a removed strategy.
- Prefer one recommendation and a secondary comparison path over a method
  selector.
- Preserve one category system when the derivation changes.
- Collapse user-facing reserve accumulation into signed carry-forward behavior
  where possible.
- Add one bounded current-month construct rather than a general planning
  calendar.
- Use one boundary model for starts and resets.
- Keep per-category one-time reset and optional household annual reset; defer
  per-category recurring reset schedules.
- Keep transaction review exceptional and consequential, not routine.
- Keep the primary flexible-money answer unless rendered design shows it no
  longer communicates the household plan clearly.

## Rejected Directions

- Job-loss or financial-season mode as the primary frame.
- Asking what resources currently support the household during setup.
- Requiring the user to know a burn rate before Kwilt analyzes evidence.
- Universal percentage-of-income setup.
- Equal-weight budgeting-method choices as the first screen.
- Permanent plan changes for genuine one-time expenses.
- Special Health or medical reserve semantics.
- Positive-only rollover.
- Automatic carry resets without user intent.
- Transaction-by-transaction saved-money or HSA provenance as routine work.
- Excluding an expense simply because savings funded it.
- Month-close bookkeeping or envelope-transfer administration.
- Fabricated opening balances or retroactive contributions.

## Relationship to Prior Product Work

This convergence preserves useful parts of existing Money reasoning:

- normalized income must be stable and explainable;
- exceptional inflows do not automatically expand ordinary budgets;
- committed and user-set amounts survive recomputation;
- protected necessities precede flexible allocation;
- plan changes create consequences and receipts;
- reserve balances must not be fabricated; and
- stale evidence holds the last trustworthy result.

It supersedes or reopens these prior assumptions:

- the living percentage is the universal setup decision;
- the monthly target is always `planning income × percentage`;
- rollover and reserve are separate user-facing funding rhythms;
- month-only adjustments are out of scope;
- the rollover toggle alone is sufficient without start and reset boundaries;
  and
- `Outside the plan` is an adequate treatment for unusual saved-money spending.

## External Reference: Copilot Money

Copilot's public rollover documentation confirms cumulative positive and
negative rollover, a selected first rollover month, a global toggle, and
per-category disabling. Its month-editing model also permits distinct monthly
budgets. These are useful pressure tests, not the Kwilt design authority:

- <https://help.copilot.money/en/articles/3790828-budget-rollovers>
- <https://help.copilot.money/en/articles/6206293-editing-budgets-by-month>
- <https://help.copilot.money/en/articles/11062072-settings-overview>

Andrew's direct experience is that Copilot's reset and rollover configuration
can become confusing. Kwilt should preserve the needed lifecycle control while
using fewer concepts and progressive disclosure.

## Capability Delta

Today, the user cannot reliably:

- establish a household plan when percentage of income is the wrong basis;
- receive one evidence-backed monthly amount as a three-second decision;
- carry category surplus or deficit persistently through current Money math;
- choose a historical month from which to reconstruct carry;
- start one category or all categories fresh without rewriting history;
- add a consequential expense to one month without changing future months; or
- keep an unusual saved-money expense visible without transaction bookkeeping.

After this concept ships, the user can:

- adopt one intelligent monthly household amount;
- preserve familiar categories and commitments across different derivations;
- see category availability adjusted by cumulative positive or negative carry;
- select and understand the evidence boundary for retroactive carry;
- reset category or household carry intentionally;
- accept an unusual expense before or after it occurs; and
- keep flexible money, category room, actual spending, and plan changes
  mutually coherent.

Still intentionally unsupported at this convergence point:

- final savings and runway visualization;
- final resource-pool and balance semantics;
- investment liquidation recommendations;
- automatic exception acceptance;
- per-category recurring reset calendars;
- a general month-by-month planner; and
- implementation or release claims.

## Bet

We are betting that one evidence-backed monthly household amount, persistent
signed category carry, and bounded current-month additions can make Kwilt
truthful across stable income, lumpy income, job transitions, school, and
unusual family expenses without turning Money into a budgeting hobby.

If users still cannot understand whether they are managing money well, revisit
the missing resource-pool and runway layer before adding more category controls
or transaction workflows.

## Success Signal

Andrew and Blair can look at a month containing Olive's orthodontics and
accurately explain, without transaction-by-transaction maintenance:

- the household's normal monthly plan;
- committed/protected and flexible capacity;
- Health's base amount and prior signed carry;
- the one-time amount accepted for the braces;
- actual Health spending;
- what will adjust next month; and
- which questions remain unanswered because savings/resource visibility has
  not yet been designed.

## Open Questions for the Next Design Pass

1. Where should savings and other available resources appear?
2. What is the truthful pool being decremented during a savings-backed or mixed
   month?
3. How should verified, partial, stale, and user-entered balances affect runway?
4. Should Summary show plan amount and resource runway together, or should one
   progressively reveal the other?
5. How should one-time additions change current runway without requiring the
   user to name a funding account?
6. How should flexible-money-left remain distinct from cash-safe-to-spend and
   total available wealth?
7. What is the smallest rendered first-use and return experience that makes the
   entire model legible in roughly three seconds?

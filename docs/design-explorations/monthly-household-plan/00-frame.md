# Frame: Monthly Household Plan

## What the user said

> I want to know, what's my plan for how much I'm going to spend? I want to know
> that I have a plan. I want to know that it's an intelligent plan. I want to
> feel and know that I'm managing my money well.

Andrew's ordinary rule has long been to live on 70% of income, give 10%, and
save 20%. That made a percentage-of-income target feel like the natural center
of Kwilt Money. A job transition exposed the limitation: the household may be
living from savings, receiving one final paycheck, operating from lumpy
business income, attending school on loans, or deliberately spending a stable
amount despite irregular or enormous deposits.

The user should not need to identify a financial season, name the resource
supporting the household, estimate a burn rate, or choose a budgeting
methodology before Kwilt can help.

## Restated in user voice

When I establish or revisit my household budget, help me recognize one
intelligent monthly amount to plan around and keep the plan truthful as ordinary
and unusual spending happens, so that I can manage money well without becoming
a finance analyst or transaction bookkeeper.

## Target audience

`audience-aspirational-family-organizers`: households that want financial truth
and useful boundaries without adopting budgeting as a hobby.

## Representative persona

Maya remains the representative persona. This is Maya whether income is stable,
lumpy, temporarily absent, borrowed, asset-backed, or otherwise a poor direct
basis for monthly spending.

- Current situation: she is setting up or using Money and wants a credible
  household spending plan.
- What she is trying to do: know the household's monthly plan, what is committed,
  and what remains flexible.
- Emotional state or tension: the analysis needed to choose a responsible
  amount is difficult even for a financially sophisticated person.
- What would make this feel wrong: asking her to choose a methodology, declare
  a life event, tag the funding source of individual transactions, or rebuild
  future months because one month contained an unusual expense.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — household money matters when Kwilt
helps the family carry an intelligent intention into ordinary decisions.

## Job flow step

This work primarily changes steps 2 through 6 of
`job-flow-maya-review-budget-reality-before-spending`:

- start or resume the minimum setup;
- establish a durable household plan;
- bring in connected evidence;
- see exact flexible money left; and
- understand what the plan and evidence mean.

The ordinary-income flow has meaningful support. The job becomes substantially
unsupported when normalized income is a poor basis, a month contains a large
intentional exception, or rollover history should affect present category room.

## Active anchors

- `jtbd-review-budget-reality-before-spending` — the household needs one
  truthful current answer before spending or changing the plan.
- `jtbd-trust-this-app-with-my-life` — plan, actual spending, rollover,
  exceptions, cash availability, and evidence limits must remain distinct.
- `jtbd-carry-intentions-into-action` — the selected household amount should
  automatically govern category contributions without ongoing administration.

```yaml
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action]
```

## Friction We Are Addressing

Kwilt currently presents the living percentage as though it were the budget's
durable center. In reality, a percentage of income is only one way to derive the
monthly household amount. The percentage model fails when income is absent,
irregular, intentionally irrelevant, or not the resource the family wants to
use as its spending boundary.

The current plan also lacks an elegant distinction between:

- the durable monthly amount;
- the adjusted amount available in a category after prior over- or underspend;
- a one-time addition accepted for a particular month; and
- actual spending and the financial resources that ultimately cover it.

## System Alignment

Constraint posture: `Question the system`, then preserve the strongest existing
parts beneath a new center of gravity.

Current system facts:

- Money already maintains committed/protected and flexible plan roles.
- The living-plan allocator already supports a user-set monthly planning basis,
  but the surrounding language remains income-centered.
- The current first-entry design asks for a percentage before account
  connection, while its open questions already consider moving that decision
  after connection.
- Category plans store a rollover toggle, but current monthly projections do
  not apply a persistent prior balance.
- Persistent balance arithmetic exists under the separate `reserve` funding
  rhythm.
- Existing category-adjustment work intentionally excludes month-only
  exceptions.
- `Outside the plan` currently removes counted spending instead of expressing
  an intentional but exceptional month.

Constraints to preserve:

- one calm whole-plan flexible-money answer;
- fixed and protected commitments before flexible allocation;
- connected evidence as authority for actual activity;
- explicit, reversible material plan changes;
- no fabricated balances, income, history, or runway;
- no requirement to review every transaction; and
- no shame, surveillance, or accounting-administration posture.

Constraints to challenge:

- percentage of income as the universal plan concept;
- target selection before connected evidence by default;
- separate user-facing `Monthly` and `Reserve` category models;
- rollover as only a previous-month surplus affordance;
- permanent category edits as the only way to accommodate an unusual month;
  and
- transaction-level funding provenance as the primary way to explain saved-money
  spending.

## Aspirational Design Challenge

How might Kwilt help Maya adopt one intelligent monthly household plan, keep it
truthful through lumpy and exceptional spending, and provide a three-second
decision without requiring financial-method expertise or transaction
bookkeeping?

## Out of Scope for the Current Convergence

- Personalized investment advice.
- Automatic asset sales or transfers.
- A net-worth dashboard.
- Final savings, cash-pool, or runway presentation.
- Final object model, schema, or implementation plan.
- Final first-use or Summary visual design.

## Open Question

Where should Kwilt make the financial pool being decremented visible, and how
should that remain distinct from the household's monthly plan amount?

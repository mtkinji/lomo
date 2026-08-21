# Frame: Green Chef Optional Meal Fulfillment

## Exploration status

**Future concept to explore.** This is not an accepted feature, active Green Chef
partnership, licensed content agreement, or executable ordering integration.

Resume this exploration when Kwilt is ready to test partner-supplied meals or
when Green Chef or HelloFresh can discuss content rights, exact-meal handoff,
attribution, and customer eligibility.

## What the user said

> Green Chef publishes recipes that could inspire meals in Kwilt. This may also
> become a partnership opportunity where Kwilt exposes sponsored meals and lets
> a household purchase the full Green Chef meal instead of cooking it from
> scratch.

## Restated in user voice

When I find a meal that fits my household but do not have the time or energy to
shop for every ingredient, help me choose between making it ourselves and
having the meal kit delivered, so dinner can still happen without rebuilding
the plan somewhere else.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers.

## Representative persona

**Maya** wants to feed her household with less repeated planning and shopping
work. Some weeks she wants the flexibility and savings of cooking from
groceries; other weeks she would value paying for a prepared meal kit if the
handoff is genuinely easier.

- Current situation: Maya has found an appealing meal and is deciding whether
  it is realistic for the next household food cycle.
- What she is trying to do: get a plausible dinner onto the table with the
  least appropriate effort for this week.
- Emotional state or tension: interested in the meal, but protective of time,
  money, family fit, and freedom from another planning workflow.
- What would make this feel wrong: an advertisement masquerading as a family
  recommendation, an unavailable meal presented as purchasable, a subscription
  surprise, or household data shared with a partner without explicit consent.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Help me make real progress in the few
areas I most want to grow. Here, progress is a completed household food cycle,
not an ad impression, recipe save, affiliate click, or claimed order.

## Job-flow steps

From `job-flow-maya-feed-household-with-less-work`:

- **Recognize whether it fits tonight** — currently 1/5. A partner recipe could
  make appetite, time, servings, source, and fulfillment options legible in one
  Recipe Home.
- **Prepare a plausible short list** — currently 2/5. Sponsored status must not
  silently influence household-fit ranking or its explanation.
- **Reach a buying surface** — currently 2/5. An exact partner handoff could
  extend the existing honest retailer boundary from groceries to a complete
  meal kit.

## Active anchors

- `jtbd-move-the-few-things-that-matter` — the option should help dinner happen.
- `jtbd-carry-intentions-into-action` — a selected meal can continue through
  either groceries or partner fulfillment without being reconstructed.
- `jtbd-trust-this-app-with-my-life` — sponsorship, availability, price,
  attribution, data sharing, and remaining user work must stay explicit.

Candidate `serves:` snippet for a future brief:

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
```

## Opportunity thesis

The promising concept is **optional meal fulfillment**, not paid influence over
Kwilt's household recommendations.

A Green Chef meal can remain a complete, useful recipe with visible source and
sponsorship. At the moment Maya chooses how to carry it forward, Kwilt can offer
two honest paths:

1. **Make it ourselves** — keep the ordinary Meal Plan to Groceries path.
2. **Get the meal kit** — hand off to the exact Green Chef meal only when its
   availability, servings, offer, and destination are supported by current
   partner evidence.

This gives Green Chef qualified meal intent rather than low-context ad
impressions, while Kwilt retains the household's planning relationship and a
complete non-partner fallback.

## System alignment

Constraint posture: `Extend the system`.

### Current system facts

- Recipes owns reusable food knowledge, immutable versions, provenance,
  credits, capture review, and publication boundaries.
- Meal Planning owns candidates, household input, and the editable decision.
- Groceries owns deterministic compilation, retailer evidence, explicit
  handoff, and fulfillment truth.
- Recipe provenance already distinguishes private imports, licensed or
  authorized sources, catalog recipes, source URLs, and credits.
- Grocery provider behavior already distinguishes outbound links, hosted
  lists, product matching, authenticated cart writes, and confirmed outcomes.

### Smallest system extension

A future partner capability would need provider-neutral records for:

- disclosed sponsorship and content-license basis;
- partner meal identity mapped to an immutable Recipe version;
- current purchasability, region, servings, price, delivery window, and
  evidence freshness;
- outbound attribution and customer eligibility;
- handoff result and, only when supported, authoritative purchase status.

It should reuse Recipe Home, the living Meal Plan, and the existing provider
handoff grammar. It should not create a separate sponsored-meals planner,
partner dashboard, or parallel grocery state machine.

## Trust and product boundaries

- Sponsored meals live in a clearly labeled partner collection or placement.
- Compensation never silently changes organic household-fit ranking.
- `Sponsored`, `Paid link`, `Offer available`, `Opened Green Chef`, and
  `Purchased` are distinct facts.
- The full recipe remains useful without a purchase unless the content license
  explicitly requires a different bounded presentation.
- A generic subscription offer never masquerades as purchase availability for
  the exact displayed meal.
- Kwilt does not remove ingredients from Groceries merely because a partner
  link was opened. Reconciliation requires authoritative purchase evidence or
  explicit user confirmation with appropriately modest wording.
- Household preferences, food needs, plan history, budget evidence, and private
  recipes are not shared with Green Chef by default.
- Green Chef remains authoritative for inventory, substitutions, fulfillment,
  payment, subscription terms, delivery, cancellation, and checkout.
- Every provider failure leaves the ordinary make-it-ourselves path intact.

## Commercial and capability ladder

1. **Attributed introduction** — a disclosed Green Chef offer or trial link;
   no exact-meal or order claim.
2. **Licensed partner collection** — current approved recipes, imagery, source
   rights, and campaign placement supplied under agreement.
3. **Exact-meal handoff** — current availability, servings, region, delivery
   timing, pricing, and deep-link support for the selected meal.
4. **Account-aware fulfillment** — existing-customer eligibility and a
   partner-authoritative receipt that can reconcile the Kwilt plan and grocery
   workload.

Do not collapse these stages. Affiliate approval is not content licensing;
content licensing is not an availability feed; a deep link is not an order.

## Current external signal

Checked August 20, 2026:

- Green Chef publishes rotating weekly menus, recipe details, and publicly
  accessible recipe-card PDFs, but the U.S. experience is not a dependable
  public historical-recipe API.
- Green Chef's parent, HelloFresh, publishes a partnership inquiry program with
  new-customer commission and attribution terms. This is evidence of an
  outreach path, not evidence of Green Chef content rights, exact-meal links,
  existing-customer economics, or an ordering API.

Sources:

- [Green Chef weekly menus](https://www.greenchef.com/about/menus-and-plans)
- [Green Chef app and cookbook](https://www.greenchef.com/about/app)
- [HelloFresh partnership inquiries](https://www.hellofresh.com/about/affiliates)
- [HelloFresh acquisition of Green Chef](https://ir.hellofreshgroup.com/news/hellofresh-se-hellofresh-acquires-green-chef-corporation/b6a7df29-19d0-403d-a44b-7a7868624d21)

External facts and commercial terms must be refreshed before outreach or
implementation.

## Aspirational design challenge

How might we help Maya choose the least burdensome honest path from an appealing
meal to dinner—cook it from groceries or receive the exact kit—while preserving
family-fit recommendation integrity, household privacy, and provider truth?

## Out of scope

- Implementing a Green Chef integration.
- Publishing or bulk-importing Green Chef recipes without content rights.
- Treating a referral link as a recipe-level partnership.
- Negotiating commercial terms or representing Kwilt to Green Chef.
- Generalizing this into a meal-kit marketplace before one partner path proves
  useful.
- Letting sponsorship determine ordinary recommendation rank.

## Questions to answer when resumed

1. Can Green Chef license recipe text, imagery, nutrition, and brand treatment
   for a complete in-Kwilt recipe experience?
2. Can a specific recipe resolve to a currently purchasable meal for a region,
   household size, delivery date, and existing or new customer?
3. What events qualify for compensation, and are existing customers included?
4. Can Green Chef return authoritative handoff or purchase evidence without
   exposing unnecessary household data?
5. At which moment does the option feel helpful rather than promotional: a
   disclosed collection, Recipe Home, Meal Plan commitment, or grocery compile?

## Open question

Can the exact meal-kit option be useful and commercially viable without allowing
sponsorship to contaminate Kwilt's explanation of what is right for this
household?

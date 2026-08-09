# Frame: Shopping and Affiliate Commerce

## What the user said

> What if groceries were a generic shopping list? And what if Kwilt made money
> from groceries and other affiliate sales?

## Restated in user voice

When someone in my household notices something we need to buy, help us put it
in one shared place and carry it into the most useful buying experience, so we
do not lose requests, reconstruct baskets, or wonder whether Kwilt's
recommendation serves us or an advertiser.

## Target audience

`audience-aspirational-family-organizers`: households trying to coordinate
ordinary life without adopting a household-management methodology.

## Representative persona

Maya is coordinating food and ordinary household needs across interruptions,
people, and stores. She wants one dependable place to capture what the family
needs and a shorter path to acquiring it.

- **Current situation:** Grocery ingredients, toiletries, cleaning supplies,
  pet items, and family requests are noticed in different contexts.
- **What she is trying to do:** Remember the need, make a sensible purchase,
  and move on.
- **Emotional tension:** Convenience is welcome, but a financially motivated
  recommendation can make the whole list feel untrustworthy.
- **What would feel wrong:** Ads mixed into household requests, biased “best
  price” claims, or list data becoming a targeting profile.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — ordinary household intentions should
become completed acquisition with less coordination.

## Active anchors

- `jtbd-carry-intentions-into-action` — a noticed household need should survive
  through selection, purchase, and completion.
- `jtbd-capture-and-find-meaning` — capture must remain immediate and must not
  require categorization or retailer selection first.
- `jtbd-put-intention-before-impulse` — commercial suggestions should help the
  household buy what it intended, not manufacture new demand.
- `jtbd-review-budget-reality-before-spending` — price, savings, and affordability
  claims must preserve Money's evidence boundaries.
- `jtbd-trust-this-app-with-my-life` — monetization must be legible and must not
  silently influence ranking, privacy, or household state.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-put-intention-before-impulse, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
```

## Job-flow steps

- **Account for the household:** the current Grocery List already accepts
  household additions, but its product identity is food-specific.
- **Reach a buying surface:** retailer handoff is currently the weakest part of
  the Food flow and is the natural location for affiliate attribution.
- **Make an opportunistic buy useful:** Kwilt must continue evaluating likely
  use, waste, budget, and storage rather than promoting a product merely because
  it pays commission.

## Object correction

The durable object may be a **Shopping List**, with groceries as one important
source and shopping context.

```text
Recipe ingredients ─┐
Household requests ─┼→ Shopping List → Store / retailer / purchase
Manual additions ───┤
Other capabilities ─┘
```

The object boundary should be “things the household intends to acquire,” not
“anything to do while out.”

- Milk, detergent, dog food, a birthday gift, and printer ink are Shopping
  Items.
- Pick up dry cleaning, return a package, and visit the pharmacy are Activities
  or errands, though they may link to Shopping context.
- Recipes contribute ingredient requirements but do not own Shopping state.
- A retailer handoff is a consequential operation and receipt, not the list
  itself.

This suggests the primary navigation label should eventually be **Shopping**,
not Groceries, if the non-food behavior is genuinely supported. “Groceries” can
remain a section, filter, source label, or contextual entry from Recipes.

## System alignment

Constraint posture: `Question the system`

### Current system facts

- The capability registry already models `groceries` as an active Food-owned
  capability with `GroceryList` as its root route.
- The existing Grocery domain owns Recipe compilation, manual household
  additions, provenance, item completion, price evidence, savings, retailer
  handoff, and receipt truth.
- Its contracts and UI are strongly food-named, and the active list is still
  coupled to a Meal Plan in important creation and refresh paths.
- Activities already own generic errands and place-aware action. A generalized
  Shopping object must not absorb that responsibility.
- Money owns budget reality. Shopping may request a spending envelope or show
  purchase evidence, but must not invent affordability truth.

### External feasibility

- Instacart's current developer documentation explicitly presents shopping
  lists for cleaning, laundry, pets, health, personal care, parties, and gifts,
  not only food. It can return a shopping-list URL where the user chooses a
  store and products.
- Active Instacart Developer Platform partners can apply for affiliate tracking
  and commission payments through Impact.
- Amazon Associates currently permits qualifying product referrals, but its
  published U.S. standard commission rate for Grocery and Amazon Fresh is 1%;
  adjacent physical-goods categories vary. Revenue assumptions must therefore
  be modeled from observed conversion and category mix rather than headline
  affiliate claims.
- Apple's current App Review Guidelines allow apps to facilitate purchases of
  physical goods through payment methods other than in-app purchase.
- FTC guidance requires material affiliate relationships to be disclosed
  clearly and conspicuously near the recommendation or link; “affiliate link”
  alone may not adequately explain that Kwilt earns money.

### Constraints to preserve

- Capture works without choosing a category, store, product, or affiliate.
- A plain list remains fully useful without a commercial partner.
- The household's expressed intent ranks ahead of commission economics.
- Paid eligibility never creates, promotes, reorders, or hides a list item.
- Price and “best” claims name coverage, timestamp, assumptions, and missing
  retailers.
- Kwilt does not sell or expose household-list data for advertising profiles.
- Provider data is shared only after an intentional handoff and only to perform
  that handoff.
- Commercial relationships are stated in ordinary language near the action:
  for example, “Kwilt may earn a commission if you buy through this link.”
- The same useful fallback exists when no partner pays Kwilt.

### Constraint we may challenge

The current assumption that Grocery List belongs entirely inside Food. The
underlying shared capture, completion, product matching, retailer handoff, and
purchase-receipt jobs extend beyond food.

## Business-model hypothesis

Affiliate commerce can be a good revenue layer if Kwilt is paid for reducing
work the household already intended to do. It becomes corrosive if Kwilt must
stimulate more purchasing, privilege a paying retailer, or obscure cheaper
options to improve revenue.

The promising revenue moments are:

1. **Intent-preserving handoff:** move selected list items to a retailer and
   receive attribution when a purchase occurs.
2. **User-requested comparison:** compare available product or retailer options,
   with affiliate status excluded from ranking.
3. **Convenient substitution:** after the user asks, offer an equivalent size,
   brand, price, or availability alternative with evidence.
4. **Cross-category completion:** support household goods whose affiliate
   economics may be stronger than grocery while preserving the same trust rule.

Avoid feed ads, sponsored list insertions, default product upgrades, pay-to-rank
results, and notifications whose purpose is to create a shopping occasion.

## Design implication

Treat **Shopping** as the candidate primary object and affiliate commerce as a
secondary execution layer. The product must first prove that a generic shared
list makes the household's life easier. Revenue should be earned only at the
moment Kwilt truthfully helps fulfill an item already on that list.

## Aspirational design challenge

How might Kwilt help Maya's household capture and acquire anything they
actually need through one calm Shopping List, while earning from useful
retailer handoffs without compromising neutrality, privacy, or financial truth?

## Out of scope

- An advertising feed or retailer-funded discovery marketplace.
- Selling household shopping data.
- Claiming comprehensive price comparison before coverage is proven.
- Making Shopping a generic errands or task manager.
- Assuming affiliate revenue can replace subscription revenue before real
  conversion, commission, return, and support economics are observed.

## Open question

Should Shopping initially cover all ordinary physical household goods, or use a
narrower “consumables and supplies” boundary before expanding to gifts,
clothing, and durable purchases?

## Accepted direction — 2026-08-08

- **Shopping is the long-term object architecture.** The data model and
  capability boundaries should not assume every item is food.
- **Groceries is the launch wedge and user-facing promise.** Navigation, copy,
  onboarding, and the first complete retailer experience remain grocery-led.
- **Generic Shopping is not yet exposed as a broad marketplace.** Expansion is
  earned through observed non-food additions and useful retailer fulfillment,
  not announced before the experience exists.
- **Affiliate commerce remains secondary to household intent.** Kwilt may earn
  from an intentional handoff, but commercial eligibility does not create or
  rank the need.

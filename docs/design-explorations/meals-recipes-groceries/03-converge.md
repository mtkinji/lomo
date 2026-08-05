# Converge: Household Feeding Loop

## Qualitative scoring

| Alternative | Maya fit | Job coverage | System fit | Learning value | Risk |
| --- | --- | --- | --- | --- | --- |
| A. Beautiful Recipe Box | High | Medium | High | Medium | Low-medium |
| B. Calm Planning Cycle | Very high | High | Medium-high | High | Medium |
| C. Grocery Finisher | High | Medium-high | Very high | High | API-dependent |
| D. Household Feeding Loop | Very high | Very high | Medium | Very high | Scope |

## Chosen direction

Choose **D, the Household Feeding Loop**, constrained by a deliberate sequence:

1. private ad-free recipe capture;
2. a flexible **Next meals** planning cycle;
3. one optional bounded family choice round with organizer finalization;
4. reviewable ingredient consolidation and “already have” removal;
5. one calm, evidence-labeled savings review when price data exists;
6. one honest Instacart handoff;
7. retailer-owned product choice, fulfillment, payment, and checkout.

Kroger direct cart-add is the second integration only after the neutral
Instacart loop proves demand. Kroger regular/promo pricing plus receipt
reconciliation becomes the first **Basket Truth** learning surface. Authorized
coupon activation is the north star, not a dependency for the core launch.

## Capability delta

Today, the user cannot:

- keep a first-class Recipe in Kwilt;
- create a meal plan aligned to the next shop, meal count, or chosen date range;
- gather private meal preferences from selected household members and finalize
  a coherent plan;
- combine their ingredients into a provenance-preserving grocery list; or
- hand a complete Kwilt list to a grocery marketplace.

After the learning release, the user can:

- save or manually create a clean private recipe;
- choose several recipes for the current planning horizon without rigid day
  assignment;
- invite selected activated household members to pick from candidates, pass, or
  suggest one idea, then finalize the result;
- review a combined grocery list and exclude items already at home; and
- open an Instacart shopping-list page where matched products can be reviewed
  and checked out.

After the later savings release, the user can:

- see a few worthwhile price/promotion recommendations with location,
  freshness, confidence, and fees made explicit;
- take an exact retailer action when activation is required; and
- reconcile the estimate with an itemized receipt before Kwilt calls savings
  realized.

Still intentionally unsupported:

- automatic checkout;
- automated price-optimal store splitting;
- auto-activation where no authorized coupon API exists;
- a large copied web-recipe catalog;
- nutrition scoring;
- continuous pantry inventory;
- automatic meal plans imposed by AI;
- broad live recipe collaboration.

## Reductive decisions

- **Three capability owners, not one overloaded Meals object:** Recipes owns
  reusable knowledge; Meal Planning owns choice and participation; Groceries
  owns execution and commerce. This need not create three permanent nav rows.
- **No rigid calendar or weekly assumption:** day placement is optional. The
  first commitment is a small set of meals for the selected horizon.
- **No generic polling platform:** the first response rule is **Pick up to
  three**, with pass and suggest-one-idea. No polls outside a specific MealPlan.
- **No majority-rule theater:** aggregates inform the organizer; they do not
  silently finalize the plan or expose family winners and losers.
- **No pantry database first:** one “Already have” pass provides most of the
  value without recurring inventory upkeep.
- **No recipe marketplace first:** import and personal/family recipes test the
  loop before content licensing.
- **No retailer chooser grid first:** begin with Instacart plus a plain-list
  fallback; add Kroger only after demand.
- **No coupon dashboard:** present worthwhile net-outcome changes, not an inbox
  of deals.
- **No false savings:** public promotion price is an estimate; **applied** needs
  provider acknowledgement and **saved** needs itemized checkout evidence.
- **No AI taste score:** use explicit favorites, repeats, dislikes, time, and
  household notes. Suggestions cite the signals they used.

## System implications

- Add separate Recipes, Meal Planning, and Groceries capability contracts rather
  than overloading Activities or one broad Meals owner.
- Add versioned MealChoiceRound/Response records and organizer finalization.
- Project only reminders, scheduled cooking, and shopping work into Activities;
  completion/deletion of those projections never owns the MealPlan lifecycle.
- Retain `shopping_list` as the executable projection and preserve ingredient
  provenance back to recipes.
- Extend execution-target receipts to distinguish `link_created`,
  `products_proposed`, `cart_add_requested`, and `retailer_checkout_required`.
- Add PriceQuote, Offer, SavingsPlan, and SavingsOutcome as Groceries-owned
  evidence records; Money may consume the realized outcome downstream.
- Keep recipe ownership separate from household access. A plan may be
  household-owned while drawing from explicitly included personal or shared
  recipes.

## Activation

The right activation moment is not onboarding. It is one of:

- importing the first recipe;
- creating a grocery list with several meal-like items;
- asking Chat “what should we eat before the next shop?”; or
- repeatedly creating a grocery to-do.

After three saved recipes, offer **Plan the next meals**. After several
candidates exist, offer **Ask the family** only when at least one eligible
Household member has Meal Planning activated. After the organizer finalizes at
least two meals, offer **Make grocery list**. After list review, offer **Shop
ingredients**. Each invitation follows earned intent.

When product mappings and prices exist, **Find savings** appears after list
review, not during recipe selection.

## Bet

We're betting that the value comes from continuity across the whole loop, not
from having the largest recipe catalog: if Maya can reuse ten real family meals,
avoid rebuilding ingredient lists, and reach a retailer review page in one calm
flow—and her family can contribute without a negotiation thread—she will
experience Kwilt as materially reducing household work. If that
is false, revisit whether recipe preservation or grocery execution should stand
alone instead of expanding discovery.

The savings bet is that a household will pay for removed work and a better
verified outcome, not for access to free coupons. Subscription value comes
first; disclosed affiliate revenue may subsidize the product but never influence
ranking.

## Success signal

A household completes the loop for three separate grocery cycles across its
natural cadence, invited members respond without organizer chasing, the
organizer reports that the input improved acceptance or reduced guessing, and
the next planning cycle begins from prior recipes without setup help.

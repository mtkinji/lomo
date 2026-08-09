# Convergence: The Grocery Flywheel

## Decision question

Which Groceries model is best for the household and gives Kwilt the strongest
credible monetization path?

## Evaluation

| Model | Immediate consumer value | Differentiation | Repeat use | Monetization proximity | Trust posture | Delivery risk |
| --- | --- | --- | --- | --- | --- | --- |
| Household List | Excellent | Low-medium | Excellent | Medium | Excellent | Medium |
| Recipe Basket | Excellent for Recipe users | Excellent | High | High | Excellent | Medium-high |
| Store Run | Good with supported retailer | Medium | High | Excellent | Weak-medium | High |
| Basket Workback | High when price pressure is active | High | Medium | High | Medium | Very high |

No single alternative should become the whole product. The strongest model is
a deliberate sequence:

```text
Household List foundation
          +
Recipe Basket differentiation
          ↓
explicit Store Run handoff
          ↓
affiliate revenue when a qualifying order occurs
```

## Chosen concept: The Grocery Flywheel

**Groceries is one durable shared household list. Recipes and the optional Plan
can add reviewed ingredients to it. When the list is useful, the user may shop
it in-store or intentionally hand it to a supported retailer; Kwilt earns only
when the retailer attributes a qualifying order.**

Each part has one job:

- **Household List** creates frequency, retention, and a complete non-commercial
  fallback.
- **Recipe Basket** creates distinctive consumer value and an efficient way to
  build a meaningful basket.
- **Store Run** creates monetization after intent is established.
- **Basket Workback** is deferred until price coverage is good enough to make
  comparison truthful.

If forced to select only one of the four original models, choose **Recipe
Basket**, but build it on an independent Household List and terminate it in an
optional Store Run. Recipe Basket has the best balance of differentiated value,
basket creation, household collaboration, and proximity to a purchase.

## Why this is best for the consumer

1. **The list works without a Recipe or retailer.** A person can add milk,
   detergent, or dog food immediately and use the list in a physical store.
2. **Recipes remove real work.** Selected ingredients consolidate into the
   household list without retyping, while already-have review and provenance
   preserve control.
3. **Plan remains optional.** Families can collect reactions before building a
   basket; decisive users can send a Recipe directly to Groceries.
4. **Commerce is timely.** Retailer help appears after the household has formed
   intent, not as product discovery or advertising.
5. **Failure is dignified.** Unsupported locations, provider outages, and users
   who prefer in-store shopping still receive the complete list value.

This directly improves the currently weak **Compile one correct list**,
**Account for the household**, and **Reach a buying surface** job-flow steps.

## Why this is best for the business

### It creates a coherent funnel

```text
Recipes found or imported
        ↓
Recipes added directly or through Plan
        ↓
ingredients added to the active Grocery List
        ↓
household adds remaining needs
        ↓
Shop this list
        ↓
attributed retailer order
```

- Recipes can attract and differentiate.
- Plan can invite household participation.
- The active list can retain through recurring capture.
- Retailer handoff is a high-intent conversion event.
- Shopping architecture later expands the same engine beyond food.

### Current affiliate economics are plausibly meaningful

Instacart's public affiliate page currently describes its Developer Program as
paying **5% of the total qualifying cart** for orders completed within a
seven-day window, including items the user adds after leaving the originating
Recipe or list. It also says terms may vary and production integrations require
approval.

Instacart reported 2025 GTV of $37.224 billion across 338.8 million orders. That
implies approximately **$110 GTV per order**. At the publicly described 5% rate,
the illustrative gross commission is approximately **$5.50 per attributed
order**.

These are illustrations, not forecasts:

| Attributed ordering behavior | Illustrative annual gross commission per household |
| --- | ---: |
| 1 qualifying order each month | about $66 |
| 1 order each month, 50% of handoffs convert and attribute | about $33 |
| 2 orders each month, 50% convert and attribute | about $66 |

The actual result depends on approval, negotiated terms, qualifying categories,
geography, user ordering behavior, returns, attribution, and program changes.
Amazon's currently published U.S. Grocery and Amazon Fresh standard rate is 1%,
so it is a weaker grocery anchor and better treated as later provider
diversification or a non-food Shopping path.

### The revenue event aligns with completed progress

Kwilt does not need to insert ads or stimulate new purchases. Revenue occurs
when the user chooses a fulfillment shortcut for a list they already intended
to shop. That alignment is the business model's main defensibility.

## Capability delta

### Today, the user cannot reliably

- open Groceries and create an independent shared list without finalizing a
  Meal Plan;
- send any selected Recipe or Plan subset into one durable list;
- preserve manual list work while adding Recipe-derived items;
- reach a production retailer list or cart with proven attribution;
- see truthful matched, unmatched, opened, ordered, and purchased states.

### After the chosen concept

- Groceries is directly navigable and independently useful;
- manual needs and Recipe-derived ingredients coexist with provenance;
- Plan collaboration remains available but is never mandatory;
- **Shop this list** creates a reviewable retailer handoff;
- Kwilt can receive affiliate attribution on qualifying completed orders;
- the household retains an in-store list when commerce is unavailable.

### Still intentionally unsupported

- sponsored items or pay-to-rank results;
- a generic Shopping marketplace in initial navigation;
- comprehensive “best price” claims;
- automatic checkout or claims that an order completed without provider
  evidence;
- multiple retailer optimization and Basket Workback in the first release;
- treating affiliate conversion as receipt or Money transaction truth.

## Reductive design decisions

- Keep only two visible Food destinations: **Recipes** and **Groceries**.
- Keep **Plan** as the existing top-right contextual affordance inside Recipes.
- Remove universal Meal Plan confirmation.
- Use one active household Grocery List initially.
- Do not introduce a separate Basket object. Basket preview is a temporary
  Recipe-to-Groceries operation.
- Do not ask for a retailer until the list contains useful intent.
- Use one calm action, **Shop this list**, to reveal supported retailer choices.
- Do not build price comparison before a simple attributed handoff is proven.

## Activation path

Groceries becomes understandable in two natural moments:

1. **Notice-time:** someone opens Groceries and adds a needed item.
2. **Recipe-time:** someone adds one Recipe or a Plan subset's ingredients.

Commerce activates only when the list has content and the user expresses
shopping intent. The first education can be contextual beneath the completed
list action: **Shop this list with a retailer**. It should not appear as an ad,
onboarding promise, or interruptive prompt.

## Business validation gates

Before investing in Basket Workback, broad retailer comparison, or generic
Shopping UI, prove these gates in order:

1. **Partner gate:** obtain Instacart Developer Platform approval and actual
   affiliate terms for Kwilt; confirm mobile-app attribution, qualifying
   categories, geography, payout mechanics, and required disclosure.
2. **Technical gate:** create a real retailer shopping-list page from a real
   Kwilt list and prove matched/unmatched recovery on a signed device.
3. **Consumer gate:** households repeatedly build or maintain the list without
   needing retailer commerce to make it worthwhile.
4. **Conversion gate:** observe real handoff initiation, retailer review, and
   attributed orders; do not infer orders from clicks.
5. **Economic gate:** demonstrate at least **$25 annualized gross affiliate
   revenue per monthly active Grocery household** before treating affiliate
   commerce as a core engine. This is a provisional investment threshold, not
   a profitability claim.
6. **Trust gate:** users understand that Kwilt may earn a commission and do not
   believe it changed list items, product ranking, or price claims.

At the provisional $25 threshold, 1,000 monthly active Grocery households imply
about $25,000 annual gross affiliate revenue; 10,000 imply about $250,000. Those
figures exclude hosting, AI, support, refunds, taxes, partner changes, and the
cost of acquiring and retaining the households.

## Accepted trade-offs

- Retailer conversion is one step later than a retailer-first experience.
- A complete neutral list may serve people who never produce affiliate revenue.
- The initial product does not promise the lowest total basket.
- Instacart may be the first monetization provider even though the architecture
  must remain provider-neutral.

## Rejected trade-offs

- Do not sacrifice manual or in-store usefulness to increase affiliate clicks.
- Do not prioritize a higher-commission provider over a better user outcome.
- Do not build an expensive savings optimizer before basic conversion is
  proven.
- Do not hide the commercial relationship.

## The bet

We're betting that households will repeatedly use one shared Grocery List
because Recipes and ordinary needs flow into it with less work, and that a
meaningful subset will intentionally hand that high-intent list to a retailer,
creating enough attributed order value to fund continued investment without
turning Kwilt into an advertising product.

If list retention is strong but retailer conversion is weak, preserve
Groceries and revisit subscription or paid convenience rather than making
commerce more aggressive. If retailer conversion is strong but list use is
weak, improve Recipe-to-list value rather than becoming a thin affiliate
front-end. If neither is strong, stop expanding Shopping.

## Success signal

The concept earns continued investment when Kwilt proves all three together:

1. **Consumer progress:** households repeatedly reach one correct, usable list
   with less re-entry;
2. **Commercial progress:** real attributed orders produce meaningful revenue
   per active Grocery household;
3. **Trust:** users can explain why each item and retailer action appeared and
   do not perceive the list as commercially manipulated.

## Current evidence sources

- [Instacart affiliate programs](https://company.instacart.com/affiliate)
- [Instacart conversion tracking and affiliate payments](https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments/)
- [Instacart 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/1579091/000157909126000018/cart-20251231.htm)
- [Amazon Associates standard commission schedule](https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ)

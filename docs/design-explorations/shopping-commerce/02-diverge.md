# Divergence: Groceries-Led Shopping Experiences

## Fixed frame

- **Visible promise now:** Groceries.
- **Internal object architecture:** Shopping.
- **Primary object:** one durable shared list of intended physical
  acquisitions.
- **Secondary sources:** Recipe ingredients, Plan selections, household
  requests, staples, and manual additions.
- **Commercial rule:** affiliate eligibility may monetize fulfillment but may
  not create or rank household intent.
- **Authority rule:** Money owns budget reality and actual spending; Groceries
  may own a trip target, basket estimate, retailer handoff, and purchase receipt.

## Axis of variation

The alternatives vary on two substantive questions:

1. **Where does the grocery job begin?** With a noticed item, a chosen Recipe,
   a selected retailer, or a desire to reduce total cost.
2. **When does commerce enter?** Only after the list is ready, while the list is
   being assembled, or as the organizing structure of the experience.

## Alternative A — The Household List

### Sketch

Groceries opens directly to one shared, active list. The first visible affordance
is fast capture: type or speak an item, then continue. Recipe ingredients,
staples, and requests arrive as sources within the same list. Items are grouped
into calm store sections, but retailer selection is postponed until the user
chooses **Shop this list** or begins checking items off in-store.

```text
Notice need ────────┐
Recipe or Plan ─────┼→ one Grocery List → shop in-store
Household request ──┘                  └→ retailer handoff
```

### Audience and persona fit

Strong for Maya because it turns Groceries into a dependable household habit,
not a planning workflow she must initiate. It accommodates weeks that begin
with Recipes and weeks that begin with “we are out of milk.”

### Design-challenge answer

Earn trust through a complete, neutral list first. Affiliate commerce appears
only when Maya explicitly asks Kwilt to help fulfill the existing list.

### Product-object stance

- Shopping List is primary and capability-owned.
- Recipe and Plan contribute provenance without owning list lifecycle.
- A store run may be linked to an Activity, but the list does not become a task
  collection.
- Money supplies authorized evidence only when the user asks about spending.

### Capture-first stance

Fully passes. No plan, Recipe, store, category, budget, or retailer decision is
required before capture.

### System fit

Reuses the current Grocery List, manual-item, provenance, offline completion,
and retailer-handoff foundations. It requires removing the finalized-Meal-Plan
creation dependency and generalizing food-only contracts internally.

### Best when

- household needs accumulate continuously;
- shopping happens in-store as often as online;
- several people add to one trip;
- Kwilt needs a useful experience independent of partner coverage.

### Fails when

- users primarily arrive from Recipes and expect grocery math to be the hero;
- a long unstructured list requires more organization than automatic sections
  can provide;
- retailer matching performed at the end produces too much correction work.

### Anti-pattern check

Passes. No dashboard, forced commitment, public feed, or commercial pressure.
Provenance must remain compact so the list does not become a surveillance log.

## Alternative B — The Recipe Basket

### Sketch

Groceries is the payoff of Recipe choice. The Plan drawer—or a direct Recipe
action—shows a basket preview: selected Recipes, servings, ingredients already
at home, and the resulting additions. The user chooses **Add to Groceries**,
then lands on the combined list and can add household needs manually. The list
remains independent after creation, but Recipe compilation is the product's
most prominent activation path.

```text
Recipes → optional Plan → basket preview → Grocery List
                                             ↑
                                   manual household needs
```

### Audience and persona fit

Strong when Maya's hardest job is turning appealing Recipes into one correct
shopping list. It preserves the collaborative Plan stage without requiring it.

### Design-challenge answer

Affiliate commerce attaches after the most distinctive Kwilt value: accurate,
reviewable transformation from chosen Recipes to a real list.

### Product-object stance

- Recipe remains primary in Recipes.
- Shopping List remains primary in Groceries.
- Plan is an optional relationship object for shared consideration.
- The basket preview is a temporary operation, not a durable plan-finalization
  object.

### Capture-first stance

Passes only if Groceries itself still accepts immediate manual items without a
Recipe. The Recipe path may invite review, but cannot become a prerequisite.

### System fit

Closely reuses current Recipe projection, Plan selection, Already-have review,
and Grocery compilation work. It requires replacing finalization with an
intentional ingredient-add receipt and preserving list state across later
Recipe changes.

### Best when

- Recipe discovery is Kwilt's acquisition or retention engine;
- generated ingredient consolidation is visibly better than a generic list;
- users commonly choose several Recipes before shopping;
- household reactions meaningfully improve acceptance.

### Fails when

- users mainly need milk, staples, and household supplies;
- the Recipe basket visually dominates a list already in progress;
- users infer that adding ingredients commits them to cooking every Recipe;
- reconciliation after Recipe changes is unreliable.

### Anti-pattern check

Passes if the preview is reversible and no “finalize your week” ceremony is
required. Fails if Kwilt forces planning configuration before list value.

## Alternative C — The Store Run

### Sketch

Groceries begins by asking where the user expects to shop—or offers a recent
store only after a list exists. As items are added, Kwilt matches products,
availability, package sizes, and aisle placement for that retailer. The list
and retailer basket grow together. Manual in-store completion remains present,
but **Review at retailer** is the primary finishing action.

```text
Choose likely store → add or import needs → matched store run → retailer review
```

### Audience and persona fit

Strong for households already committed to pickup or delivery with one
supported retailer. Weak for flexible, multi-store, cash, farmer's-market, or
low-coverage shopping.

### Design-challenge answer

Kwilt removes the most retailer-specific reconstruction work and places the
affiliate conversion path directly inside an already-intended store run.

### Product-object stance

- Shopping List remains primary.
- Retailer binding is a secondary, replaceable context on the list or trip.
- Provider product matches are evidence, not canonical household items.
- Provider acknowledgement is not purchase or Money truth.

### Capture-first stance

Conditional. Capture must still work before choosing a store; otherwise the
model fails Kwilt's capture-first principle. Store selection can accelerate
matching but cannot gate list creation.

### System fit

Uses existing provider contracts and handoff concepts but shifts product
matching much earlier. It requires strong provider coverage, current product
evidence, substitution controls, authentication recovery, and a local list that
survives provider failure.

### Best when

- one retailer serves most of the household's basket;
- pickup or delivery is the habitual completion path;
- early matching materially improves final handoff quality;
- partner conversion is economically meaningful.

### Fails when

- the chosen store lacks items or competitive prices;
- the retailer relationship visually compromises neutrality;
- product matching interrupts simple capture;
- a provider outage makes the list feel broken.

### Anti-pattern check

Passes only with a neutral, equally useful in-store path and a clear commission
disclosure. Fails if the app becomes a branded retailer funnel or promotes
commissionable products.

## Alternative D — The Basket Workback

### Sketch

The user builds or imports one list, then explicitly asks **Help me spend less**.
Kwilt produces a small number of evidence-backed fulfillment scenarios: keep
the current store, split a few items, use an available substitute, or decline
to recommend a change. Each scenario states coverage, observed prices, likely
extra effort, trip target, and affiliate relationship before the user chooses a
handoff.

```text
Grocery List → ask for help → 1–3 basket scenarios → chosen retailer handoff
```

### Audience and persona fit

Strong when Maya feels real food-budget pressure but does not want to become a
coupon strategist. It is less relevant when speed or one-store simplicity
matters more than potential savings.

### Design-challenge answer

Affiliate revenue becomes a consequence of a user-requested comparison whose
ranking is based on net household usefulness rather than payout.

### Product-object stance

- Shopping List owns intended items.
- Money owns budget reality.
- Groceries owns a distinct trip target and basket estimate.
- Scenario, provider match, and affiliate status are reviewable evidence.

### Capture-first stance

Fully passes because optimization begins only after capture and only on
request.

### System fit

Builds on existing savings, store-opportunity, and scenario contracts, but it
has the largest evidence and integration burden. Correct comparison requires
fresh prices, package normalization, retailer coverage, travel or split-trip
cost, and dignified handling of unknowns.

### Best when

- price coverage is broad and fresh enough to support a useful comparison;
- meaningful savings exceed the added effort;
- the user actively requests financial help;
- Kwilt can explain why “do nothing” is sometimes best.

### Fails when

- price evidence is sparse or stale;
- nominal savings ignore membership, travel, minimums, substitutions, or waste;
- monetization creates doubt about scenario ranking;
- the feature presents optimization complexity before the user asks.

### Anti-pattern check

Passes if it shows a few calm choices, includes “keep this list,” and preserves
financial truth. Fails if it becomes a savings dashboard, coupon feed, or
affiliate-ranked comparison engine.

## Comparative tensions to carry forward

| Alternative | Fast capture | Recipe value | In-store strength | Affiliate proximity | Trust risk | Build burden |
| --- | --- | --- | --- | --- | --- | --- |
| Household List | Highest | Medium | Highest | Low | Lowest | Medium |
| Recipe Basket | Medium-high | Highest | High | Low-medium | Low | Medium-high |
| Store Run | Medium | Medium | Medium | Highest | High | High |
| Basket Workback | High | Medium | High | Medium-high | Medium-high | Highest |

## Questions for convergence

1. What should make a person first understand that Groceries is worth opening:
   immediate shared capture, Recipe compilation, retailer convenience, or
   trustworthy savings?
2. Which value must work even if Kwilt has no production retailer partnership?
3. How close can affiliate commerce sit to list creation before it makes the
   household question Kwilt's motives?
4. Which model creates the shortest credible learning release without baking a
   food-only assumption into the data model?

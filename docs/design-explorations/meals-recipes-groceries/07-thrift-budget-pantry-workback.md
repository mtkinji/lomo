# Thrift, Budget, and Pantry Workback

**Status:** Chosen refinement to the Household Food experience
**Audience:** Aspirational family organizers, including budget-first and sale-first households
**Representative persona:** Maya
**Constraint posture:** Extend the system
**Last updated:** August 5, 2026

## Why the existing frame is too narrow

The first Household Food story mostly follows this sequence:

```text
choose meals → compile groceries → remove what we own → find savings → buy
```

That sequence works for a plan-first household. It underserves people whose
actual food strategy begins somewhere else:

- **Budget-first:** “I have about $85 for this shop. What can we make?”
- **Pantry-first:** “We have food in the house. What can we cook before buying
  more?”
- **Sale-first:** “I buy what is unusually cheap, then decide what it becomes.”
- **Adaptive:** “I had a plan, but chicken thighs are half price and salmon is
  not. Should the week change?”

Thrift is therefore not a coupon step after planning. It is a way of deciding
what to plan, what to buy, what to substitute, what to preserve, and when to
change course. Kwilt becomes materially more valuable when the same household
system can connect food preferences, food already owned, budget reality, current
store evidence, the plan, and the receipt.

## Restated in user voice

When I need to feed my household without wasting food or overspending, help me
start with the truth I have—the money left, the food at home, the meals we like,
or a genuinely good sale—and turn it into a realistic plan. If reality changes
at the store, help the rest of the plan catch up without making me redo it.

## Active JTBDs

- `jtbd-review-budget-reality-before-spending` — bring trustworthy category
  evidence into the food decision without presenting monthly plan room as cash
  safe until payday.
- `jtbd-put-intention-before-impulse` — turn an opportunistic purchase into a
  considered household choice, not forbid it or celebrate any discount.
- `jtbd-carry-intentions-into-action` — keep budget, meals, groceries, and cooking
  coherent after a change.
- `jtbd-capture-and-find-meaning` — capture what is on hand or on sale with less
  work than maintaining a perfect inventory.
- `jtbd-trust-this-app-with-my-life` — distinguish known, likely, estimated,
  quoted, paid, and saved evidence.

`serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]`

## The marketing story

### Lead promise

# Spend less without making thrift a hobby.

Kwilt plans meals around what your family will eat, what you already have, and
what is left in your grocery budget. It builds the smallest useful shopping
list, points out the few sales that actually help, and lets a good in-store find
change the plan without starting over.

### Supporting story

**Use what you have.**
Tell Kwilt what is in the fridge, pantry, or freezer—or quickly confirm what it
remembers. See meals you can make now and the few ingredients that would unlock
the most dinners.

**Plan to a real number.**
If you use Kwilt Money, bring the current grocery-category reality into the next
shop. Choose a trip target, see which costs are covered by live prices, and know
when the estimate is incomplete or stale.

**Shop the sale. Let the plan catch up.**
Found chicken at a genuinely good price? Scan it or tell Kwilt. See whether it
fits the budget, which planned meal it could replace, what else it would require,
and whether buying extra is likely to become useful food or expensive waste.

**Know what actually helped.**
A price badge is not savings. Kwilt keeps estimates separate from what the
receipt proves, then learns which substitutions, stores, package sizes, and
promotions were worth your household’s time.

### Hero marketing demonstration

```text
$92 left for groceries this month
Likely on hand: rice, black beans, tortillas, frozen broccoli

Kwilt prepares 4 dinners
• 2 use mostly what you have
• 9 things to buy
• about $54–$66 at Smith's · 81% price coverage

At the store: chicken thighs, $1.49/lb
“Good current price. Swap Thursday's salmon for sheet-pan chicken?
 The basket estimate drops about $7 and stays inside your $65 trip target.”

[ Keep the plan ]   [ Review the swap ]
```

The demonstration pays off the integrated product thesis without claiming that
Kwilt knows exact inventory, exact future prices, or cash-safe spending when it
does not.

### Sale-first campaign variant

**You shop what is on sale. Kwilt turns it into dinner.**

Bring in a store circular, current retailer prices, or a deal you found in the
aisle. Kwilt matches worthwhile buys to meals your household likes, the food you
already have, and the money left in the plan—then updates the list when you say
yes.

### The “under one roof” story

The value does not come from placing four tabs beside each other. It comes from
closed-loop decisions that isolated products cannot make safely:

```text
Money reality ───────┐
Food on hand ────────┼→ feasible meals → smallest useful list
Family preferences ─┤                         ↓
Recipes ─────────────┘                   store evidence
                                               ↓
                                     reviewed substitutions
                                               ↓
receipt → actual spend + stock observations + realized savings
                                               ↓
                              better next plan and budget decision
```

The product promise is not “all your food tools in one app.” It is “change one
truth, and Kwilt helps the rest of dinner catch up.”

## Marketing claim ladder

| Claim | Evidence required before publishing it |
| --- | --- |
| “Plan with what you have” | User-confirmed or transparently confidence-labeled stock observations influence real candidates and list gaps |
| “Plan around your grocery budget” | Authorized Money projection, explicit period/trip target, visible freshness, and basket coverage/range |
| “Find worthwhile sales” | Location-specific current price evidence plus unit comparison and household relevance |
| “Stay within your target” | Complete-enough basket estimate and accepted changes; otherwise say “aim for” or show a range |
| “Save money” | Itemized receipt/order reconciliation against a preserved baseline, not a discount badge or model estimate |
| “Use what you buy” | Purchase/stock evidence connects to a planned or later accepted use; do not infer consumption from purchase alone |

## Yes-and expansion

### What if every grocery dollar could have a likely use?

Accepted purchases could show the meals they support and which portion remains
unassigned. This elevates thrift from price minimization to useful household
capacity. Cost: medium. Anti-pattern check: pass if “unassigned” is neutral and
never treated as failure.

### What if leftovers and food at risk became planning inputs?

“Use soon” food could create a few high-value candidate meals before new
shopping. This reduces waste and decision load. Cost: medium; evidence requires
explicit or reliably inferred dates, never unsafe freshness claims.

### What if the best saving were skipping the shop?

Kwilt could show **You can make three dinners before another trip** when stock
confidence supports it. This is a stronger economic outcome than coupon volume.
Cost: medium; requires a usable stock observation model.

### What if a sale unlocked several meals instead of one?

A deal on a versatile ingredient could be ranked by household usefulness, not
nominal percent off. Cost: medium; requires recipe compatibility, storage, likely
use, package quantity, and waste constraints.

### What if the receipt closed both Food and Money loops?

One reviewed receipt could confirm paid grocery spend for Money, update stock
observations for Groceries, preserve actual prices, and reconcile savings.
Cost: high; the user must approve line interpretation and capability writes.

### What if the plan protected a future need?

Kwilt could avoid spending the whole monthly Food remainder on the current trip
by showing days left and the user’s expected remaining shops. Cost: medium;
monthly category room remains distinct from cash safe until payday.

### What if thrift knowledge became family knowledge?

Private notes such as “this package feeds us twice” or “we never use the second
bag” could improve later recommendations. Cost: low; avoid family rankings or
public frugality performance.

**Frame recommendation:** expand the Household Food frame from a plan-first
savings loop to an adaptive food-economy loop. Do not create a separate Thrift
capability or permanent user mode.

## Alternatives considered

### A. Choose a shopping mode

Ask the user to select **Meal-first**, **Pantry-first**, **Budget-first**, or
**Sale-first** before planning.

- Strength: simple implementation and easy explanation.
- Failure: turns a behavior into setup, forces one identity, and makes mixed
  real-life situations awkward.
- Decision: reject as the product model. These are entry conditions, not durable
  preferences.

### B. One adaptive plan with multiple truths

Let the user begin with any available fact. The plan holds explicit constraints
and evidence snapshots, then recomputes proposals when an accepted fact changes.

- Strength: pays off the integrated Kwilt thesis and supports mixed strategies.
- Risk: recomputation can feel magical or disruptive unless every change is
  previewed and reversible.
- Decision: choose. Use one plan and one reviewed change proposal, not modes.

### C. Live deal hunter

Lead with every available store promotion, then recommend food to buy.

- Strength: vivid acquisition story for extreme bargain shoppers.
- Failure: provider coverage is weak, deal volume creates attention work, and
  nominal discounts can produce waste or overspending.
- Decision: retain as a bounded input to alternative B, never the center of the
  product.

## Chosen product model

Kwilt uses a **constraint-and-opportunity model**:

- A **constraint** limits or shapes the plan: trip target, category remainder,
  dietary need, time, storage, food to use soon, or servings.
- An **opportunity** is new evidence that may improve it: confirmed stock,
  current promotion, useful package size, receipt learning, or family suggestion.
- A **scenario** is a deterministic, reviewable comparison between the current
  accepted plan/basket and a proposed change.
- An **accepted change** updates the owning capabilities through typed operations
  and receipts. AI never silently rewrites the week because something is on sale.

There is no user-maintained “thrift mode,” pantry spreadsheet, deal dashboard,
or obligation to optimize every item.

## The adaptive job stories

### Budget-first

When I know what I can spend before I know what to cook, help me turn an honest
Money view into a realistic trip target and meals, so the basket serves the
month instead of consuming whatever room appears to remain.

### Pantry-first

When there is already food in the house, help me confirm the small amount of
inventory that matters and see what it can become, so we buy fewer duplicates
without maintaining a perfect pantry database.

### Sale-first

When I encounter a genuinely good price, help me judge it in the context of our
budget, storage, preferences, and likely meals, so a bargain becomes useful food
instead of an unplanned expense.

### Adaptive replanning

When price, availability, or household reality changes, show the smallest plan
and list changes that restore coherence, so I can say yes or keep the original
without rebuilding either.

## Experience workback

### 1. Start with reality

**Next meals** begins with a compact, optional reality strip rather than a mode
selector:

```text
Planning 4 dinners

$65 trip target · $92 left in Food this month
8 likely ingredients on hand · confirm 4 that matter
Smith's prices checked 18 min ago
```

Each fact is tappable, sourced, fresh-or-stale, and removable from the proposal.
If Money is not activated, **Set a trip target** works without requiring setup.
If stock is unknown, planning remains complete.

### 2. Make “what can I cook?” useful at several confidence levels

Recipe and planning queries support:

- **Make now:** every required ingredient is confirmed on hand, excluding
  optional ingredients.
- **Almost there:** one to three grocery gaps.
- **Use soon:** consumes explicitly dated or user-marked food at risk.
- **Best use of what we have:** maximizes useful confirmed/likely stock while
  staying within other constraints.

Results must show why they qualify. “Likely have” never becomes “have” without a
quick confirmation when the decision depends on it.

### 3. Build a trip target, not another budget

Money owns category plan, spending, remaining capacity, forecast, and freshness.
Food receives an authorized, purpose-limited projection. Maya can choose a trip
target within Food without changing the monthly budget. A proposal may account
for days and expected shops remaining, but it must expose those assumptions.

Food copy distinguishes:

- **$92 left in Food this month** — Money category evidence.
- **Aim for $65 this shop** — a user-owned Food constraint.
- **About $54–$66** — basket estimate with coverage and freshness.
- **$58.42 paid** — receipt/order evidence.
- **$7.10 less than the saved baseline** — realized comparison.

None of these means “cash safe until payday” unless Money has the separate
balance, bill-timing, and expected-income evidence required for that claim.

### 4. Keep pantry capture smaller than the work it removes

The first release does not ask users to catalog the kitchen. Stock knowledge is
built progressively from:

1. the ephemeral **Already have** review;
2. a quick fridge/pantry/freezer photo or dictated list;
3. user-confirmed “usually have” staples;
4. reviewed receipt/order lines;
5. explicit depleted/used-up actions;
6. cautious decay over time.

The UI presents **Confirmed today**, **Likely on hand**, and **Check first**. It
does not present a false exact count. Quantities may be bounded ranges. Perishable
food loses confidence faster than shelf-stable staples, but Kwilt never declares
food safe or spoiled from age alone.

### 5. Compare meal scenarios before finalization

The plan can show two or three meaningful scenarios, not a matrix:

- **Use more of what we have**
- **Stay near $65**
- **Keep everyone’s top choices**

Each scenario shows changed meals, grocery gaps, basket estimate range, price
coverage, and accepted household constraints. Maya chooses or edits one. These
are proposals against one plan, not competing canonical plans.

### 6. Let an in-store opportunity enter in one sentence

Maya can scan a barcode/price tag, photograph a sale sign, share a retailer page,
or say “Chicken thighs are $1.49 a pound.” Kwilt creates temporary
`StoreOpportunity` evidence and answers three questions:

1. Is the current price actually supported and useful per comparable unit?
2. Does it fit the trip target and household constraints?
3. What is the smallest plan/list change that gives it a likely use?

The answer may be **Buy for the plan**, **Buy and review a swap**, **Worth
freezing for a later meal**, or **Good discount, but it adds cost without a
likely use**. Kwilt is allowed to recommend not buying the sale.

### 7. Recompute, never silently rewrite

An accepted store opportunity produces a scenario diff:

```text
Use the chicken deal

Plan
− Salmon bowls Thursday
+ Sheet-pan chicken Thursday

Groceries
− 1½ lb salmon
+ 4 lb chicken thighs (2 lb for Thursday, 2 lb likely extra)

Estimate
$61–$73 → $54–$63
82% of the new basket has current prices

[ Keep original ]   [ Accept changes ]
```

If Maya has already put the item in the cart, **I bought it** records a purchase
observation but still asks whether to change the meal plan. Purchase authority
does not imply planning authority.

### 8. Close the loop from the receipt

A reviewed receipt may create four separate, inspectable results:

- Money imports or reconciles the actual grocery transaction through its own
  authority.
- Groceries records purchased products and price evidence.
- Stock observations become **Likely on hand**, adjusted for planned use rather
  than asserted as exact inventory.
- Savings compares paid lines with the preserved accepted baseline.

The user approves ambiguous line mappings. Deleting a receipt-derived Food
observation does not delete the Money transaction, and correcting Money meaning
does not rewrite Grocery history.

## Capability ownership

### Money owns

- durable monthly category plan and plan role;
- categorized actual spending and transaction evidence;
- category remaining amount, forecast, confidence, and freshness;
- plan adjustments and their authoritative receipts;
- the boundary between monthly plan room and cash safe until payday.

### Groceries owns

- stock observations and confidence, not guaranteed physical truth;
- GroceryList, product mapping, location-specific quotes, offers, and handoffs;
- trip target as a Food-cycle constraint;
- store opportunities, basket scenarios, purchase/receipt evidence, and realized
  savings.

### Meal Planning owns

- which budget/stock/opportunity projections informed a candidate or scenario;
- candidate meals, constraints, family response, scenario selection, and the
  finalized plan version;
- the accepted plan diff after an opportunistic purchase.

### Recipes owns

- ingredient requirements, substitutions that are part of reviewed recipe
  knowledge, and the exact immutable version consumed by a scenario.

AI prepares and explains cross-capability work. It owns none of these records.

## Required object extensions

```ts
type FoodBudgetEnvelope = {
  moneyPlanVersionId: string;
  categoryIds: string[];
  periodStartsOn: string;
  periodEndsOn: string;
  plannedCents: number;
  spentCents: number;
  remainingCents: number;
  forecastRangeCents: { low: number; high: number } | null;
  observedAt: string;
  freshness: 'current' | 'stale' | 'unavailable';
  authority: 'money_projection';
};

type FoodCycleSpendingConstraint = {
  mealPlanId: string;
  targetCents: number;
  basis: 'user_entered' | 'money_assisted';
  budgetEnvelopeRef: string | null;
  assumptions: string[];
  acceptedByPersonId: string;
  acceptedAt: string;
};

type FoodStockObservation = {
  id: string;
  ownerPersonId: string;
  ingredientConcept: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  location: 'pantry' | 'fridge' | 'freezer' | 'other' | null;
  state: 'confirmed' | 'likely' | 'check_first' | 'depleted';
  source: 'already_have' | 'manual' | 'photo' | 'voice' | 'receipt' | 'order';
  observedAt: string;
  confidence: number;
  supersedesObservationId: string | null;
};

type StoreOpportunity = {
  id: string;
  ownerPersonId: string;
  retailerId: string | null;
  locationId: string | null;
  productOrConcept: string;
  quantity: number | null;
  unit: string | null;
  observedPriceCents: number | null;
  comparableUnitPriceCents: number | null;
  source: 'provider' | 'barcode' | 'price_tag_photo' | 'shared_url' | 'voice';
  evidenceArtifactRef: string | null;
  observedAt: string;
  expiresAt: string | null;
  confidence: number;
};

type FoodScenario = {
  id: string;
  mealPlanId: string;
  expectedMealPlanVersion: number;
  baselineGroceryListVersion: number | null;
  constraintRefs: string[];
  opportunityRefs: string[];
  proposedMealChanges: unknown[];
  proposedGroceryChanges: unknown[];
  estimatedBasketCents: { low: number; high: number } | null;
  priceCoverage: number;
  evidenceObservedAt: string | null;
  status: 'prepared' | 'accepted' | 'rejected' | 'expired';
};
```

These are architecture sketches, not permission to collapse source authority.
`FoodBudgetEnvelope` is a read projection, not a Food-owned budget copy.
`FoodScenario` contains proposed typed diffs in implementation, not unvalidated
`unknown` payloads.

## AI operation additions

- `groceries.capture_stock_observation`
- `groceries.confirm_stock_observations`
- `groceries.mark_stock_depleted`
- `groceries.capture_store_opportunity`
- `groceries.prepare_basket_estimate`
- `groceries.prepare_thrift_scenario`
- `groceries.accept_thrift_scenario`
- `groceries.reconcile_receipt_to_stock`
- `meal_planning.find_meals_from_stock`
- `meal_planning.prepare_budget_aware_candidates`
- `meal_planning.prepare_opportunity_swap`
- `money.read_food_budget_envelope`

Reading the budget requires explicit Money authorization. Accepting a scenario
may batch capability-owned operations under one reviewed proposal, but each
capability produces its own versioned receipt. AI cannot change a Money budget,
assert physical stock, apply an unsupported offer, or accept a meal substitution
without the required authority.

## Reductive learning release

The smallest coherent proof does not require universal retailer data or a
perfect pantry:

1. Maya chooses a trip target manually or imports an authorized current Food
   category envelope from Money.
2. She confirms 8–15 relevant stock observations through Already-have or a
   dictated/photo review.
3. Kwilt prepares four meal candidates and a grocery gap list using those facts.
4. A small current-price fixture or one supported store produces a basket range
   with visible coverage.
5. During playthrough, Maya captures one real in-store opportunity and reviews a
   plan/list scenario diff.
6. A photographed receipt reconciles paid total and a few reviewed lines into
   Money/Groceries receipts.

This learning release intentionally excludes continuous exact inventory,
automatic plan changes, universal circular ingestion, spoilage prediction,
cash-safe-until-payday claims, autonomous stockpiling, and automatic coupons.

## Learning questions

1. Which starting truth—budget, stock, sale, or meals—most often activates the
   experience in real households?
2. Can users understand the difference between monthly category room, trip
   target, basket estimate, paid total, and realized savings without training?
3. Does progressive stock confidence remove more work than it creates?
4. Do sale-first users trust a recommendation that says not to buy a discount?
5. How often does an accepted opportunity actually change a meal or prevent a
   later purchase?
6. Does receipt review feel worth doing when it improves Money, stock, and future
   planning at once?
7. Does the integrated loop measurably reduce food spend or waste without
   reducing meal satisfaction or increasing planning time?

## Success signal

Across three natural shopping cycles, Maya uses at least two different starting
truths, accepts or rejects scenario changes with clear understanding, reduces
duplicate purchases, and can point to one receipt-proven economic improvement.
The household reports that Kwilt helped them be resourceful without turning
shopping into administration.

## The bet

We are betting that Kwilt’s strongest Food advantage is not recipe volume,
coupon volume, or retailer reach in isolation. It is the ability to keep family
preference, household stock, budget reality, store opportunity, and the meal
plan coherent as any one of them changes. If users will not provide even a small
amount of stock or receipt confirmation, we should retreat to ephemeral
Already-have review and budget-aware basket guidance rather than build a pantry
system that creates more work than it removes.

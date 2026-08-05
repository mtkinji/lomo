# Diverge: Meals, Recipes, and Groceries

Axis of variation: where Kwilt creates value—content breadth, planning
intelligence, or end-to-end household execution.

## Alternative A — The Beautiful Recipe Box

Build the best private, ad-free recipe capture and cooking experience first.
Users import a URL, scan a family card, paste text, or create a recipe. Recipes
can be copied with provenance and optionally collected with family contributors.
Meal planning and groceries are initially lightweight actions from a recipe.

- Persona fit: strong for Ruth and recipe preservation; moderate for Maya's
  recurring planning burden.
- Design-challenge answer: removes recipe-site friction but leaves plan-to-cart
  work partially intact.
- System fit: adds one capability-owned Recipe model and reuses sharing
  foundations.
- Best when: the strongest demand is preservation and clean cooking.
- Fails when: users already have a recipe manager and expect Kwilt to remove the
  recurring planning/shopping burden.
- Four-object stance: Recipe is reference knowledge, not an Activity; cooking or
  shopping can create Activities when actionable.
- Capture-first: strong.
- Anti-pattern check: pass.

## Alternative B — The Calm Planning Cycle

Start with a flexible **Next meals** cycle. Users choose a next-shop, meal-count,
date-range, or open horizon; pick several saved/imported meals; mark leftovers
or eating out; and optionally place meals on days. Kwilt produces a combined,
reviewable grocery list. Retailer handoff is initially a formatted list or
Instacart page.

- Persona fit: very strong for Maya.
- Design-challenge answer: removes repeated choosing and list arithmetic.
- System fit: adds Recipe and Meal Plan records and projects one shopping-list
  Activity.
- Best when: the primary value theory is reducing recurring household effort
  across varied shopping cadences.
- Fails when: importing recipes is unreliable or grocery handoff remains too
  manual to feel different.
- Four-object stance: plan state remains capability-owned; the executable
  grocery list is an Activity projection.
- Capture-first: strong; recipes can be added before metadata is complete.
- Anti-pattern check: pass if the calendar is optional.

## Alternative C — The Grocery Finisher

Start with universal shopping execution. Any list can be normalized, assigned to
a retailer, product-matched, and handed to Instacart or Kroger. Recipes and meal
planning are acquisition paths into the list rather than the center.

- Persona fit: strong for direct time savings; weaker for family knowledge and
  meal inspiration.
- Design-challenge answer: attacks the final, most tedious re-entry step.
- System fit: extends the existing `shopping_list` type and execution-target
  architecture; lowest new content-model risk.
- Best when: retailer handoff quality is high enough to save meaningful time.
- Fails when: public APIs cover too few stores or product matching creates more
  review than manual shopping.
- Four-object stance: Groceries remains an executable Activity/list.
- Capture-first: strong.
- Anti-pattern check: pass with explicit match confidence and retailer-owned
  checkout.

## Alternative D — The Household Feeding Loop

Build the smallest coherent vertical slice across private recipe capture,
flexible-horizon Meal Planning, a bounded family choice round, combined
groceries, and one real retailer handoff. Recipes, Meal Planning, and Groceries
are separate capability owners connected by explicit projections and receipts.
Breadth comes later; the first loop can work with ten recipes.

- Persona fit: strongest overall for Maya and still creates a path for Ruth.
- Design-challenge answer: tests the actual value theory—whether Kwilt makes the
  whole recurring chore easier.
- System fit: moderate extension; it adds capability-owned models but reuses
  household sharing, Activities, execution targets, and Chat operations.
- Best when: learning about end-to-end relief matters more than maximizing any
  single feature's breadth.
- Fails when: the slice becomes a thin version of four products with no one step
  excellent enough to create trust.
- Four-object stance: Recipe and MealPlan are capability records; participation
  reminders/cooking occurrences may project into Activities; grocery
  execution projects into Activity; retrospective cooking evidence can later
  inform Chapters without changing their meaning.
- Capture-first: strong.
- Anti-pattern check: pass if discovery, nutrition, pantry inventory, price
  comparison, autonomous planning, and family winner/loser mechanics stay out
  of the first release.

## Family-choice divergence inside Meal Planning

### Choice A — Shared planning To-do

Create a checklist Activity where each family member adds or checks a meal.

- Strength: reuses existing To-do infrastructure.
- Failure mode: cannot represent a stable candidate set, one response per
  participant, private picks, close/finalize authority, or the difference
  between preference and commitment. Completion semantics are false.
- Verdict: use Activities only for reminders or later execution projections.

### Choice B — Open suggestion thread

Invite the family to post meal ideas and reactions in a shared thread.

- Strength: conversational and flexible.
- Failure mode: favors the loudest/fastest participant, requires the organizer
  to reconstruct a decision, and risks turning Chat into the authority owner.
- Verdict: useful as an entry or discussion layer, not the canonical plan.

### Choice C — Bounded choice round

The organizer offers a candidate set; selected family members privately pick up
to a small number, pass, or suggest one idea; a calm aggregate appears when the
round closes; the organizer finalizes.

- Strength: gives children real voice, produces structured state, works
  asynchronously across devices, and preserves organizer responsibility.
- Failure mode: can feel like voting bureaucracy if launched for every meal or
  if results imply winners and losers.
- Verdict: chosen, offered only when the organizer wants input.

### Choice D — Automatic consensus planner

Kwilt infers everyone's preferences and generates the plan without asking.

- Strength: lowest interaction burden.
- Failure mode: invents family preference, hides trade-offs, weakens agency,
  and cannot safely infer dietary constraints.
- Verdict: reject; suggestions may be explainable inputs, never silent consensus.

## Savings divergence inside Groceries

Couponing creates a second design choice independent of the overall Household
Feeding Loop.

### Savings A — Coupon Finder

Show available coupons and send the user to activate them.

- Strength: understandable and potentially immediate.
- Failure mode: recreates couponing work, favors visible discounts over total
  value, and depends on offer feeds Kwilt cannot access openly at most chains.
- Verdict: insufficient as the product frame.

### Savings B — Basket Truth

Compare regular/promo and unit prices, expected offers, fees, and freshness;
show a few worthwhile changes and reconcile them against a receipt.

- Strength: buildable incrementally with Kroger public pricing and user receipt
  evidence; aligns with financial truth.
- Failure mode: narrower retailer coverage and incomplete account-specific
  coupon visibility.
- Verdict: best first savings product.

### Savings C — Coupon Autopilot

Connect loyalty accounts, evaluate full offer rules, activate eligible coupons,
and verify redemption.

- Strength: the magical outcome Andrew described; removes the work rather than
  teaching couponing.
- Failure mode: requires retailer or offer-network read/write authority that
  public shopper APIs generally do not expose today.
- Verdict: correct north star, not an honest no-partnership first release.

### Savings D — Sponsored Deal Marketplace

Let retailers or brands fund placement and offers inside the list.

- Strength: direct monetization.
- Failure mode: corrupts ranking trust and can induce unwanted purchases.
- Verdict: reject for the initial product.

## Divergence conclusion

Alternative D is the only option that directly tests Andrew's value theory. The
main reductive risk is breadth, so it should borrow Alternative B's flexible
cycle and prove one bounded Choice C round plus one retailer handoff before
adding discovery or more chains.
For savings, sequence **Basket Truth now → Coupon Autopilot when authorized**.

---
id: brief-household-food-loop
title: Household Food Loop
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-food-ai-operating-layer, brief-activity-context-action-platform, brief-kwilt-money-capability-integration, brief-governed-household-money-plan]
owner: andrew
last_updated: 2026-08-06
---

# Household Food Loop

## Context

Feeding a household is one recurring job composed of several disconnected
burdens: preserving recipes, deciding what sounds good, gathering family input,
understanding what the household can spend, using food already at home,
combining ingredients, responding to worthwhile store opportunities, matching
products, finding meaningful savings, and rebuilding a retailer cart. Kwilt can
remove meaningful household work only if the transitions become easier while
Money, Recipes, Meal Planning, and Groceries retain truthful ownership.

## Target audience

`audience-aspirational-family-organizers` wants family life to feel more
organized without adopting a productivity methodology. This audience values
continuity, shared participation, and fewer repeated decisions more than a
large content catalog or a sophisticated coupon dashboard.

## Representative persona

Maya wants the next shopping cycle to include meals her household will actually
eat, reuse family knowledge, and reach pickup or delivery without reconstructing
the same decisions and list arithmetic. She shops on a variable cadence and
wants children with their own devices to have a bounded, meaningful voice.

## Aspirational design challenge

How might Kwilt help Maya and her family begin with the truth they have—meals
they want, money left, food on hand, or a worthwhile sale—then keep the plan,
grocery list, and budget coherent through cooking, while preserving private
ownership, child voice, organizer authority, financial and retailer truth, and
a calm household experience?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the spine because the value is not
recipe storage or deal discovery in isolation; it is reliable household
follow-through from “what should we eat?” to a reviewed checkout destination.

## Job flow step

`job-flow-maya-feed-household-with-less-work` maps the complete cycle from
capturing food knowledge through planning, family participation, groceries,
retailer handoff, guided cooking, and next-cycle learning. The current worktree
has useful contracts and early screens, but no step yet exceeds delivery score
2 because the Food backend, two-account participation, provider handoffs, and
stateful Cook Mode have not been proven end to end. The loop must improve the
whole transition while preserving complete organizer-only, plain-list, and
touch-cooking fallbacks.

## JTBD framing

When feeding my household becomes another coordination and spending burden,
help us begin with what is true: food we love, food already here, what we can
reasonably spend, and prices worth acting on. Help us decide together, make the
smallest useful list, adapt when the store changes the facts, and reach checkout
without becoming pantry clerks, budget administrators, or coupon experts.

## Design

### Capability ownership

- **Recipes** owns reusable food knowledge, provenance, versions, clean cooking,
  private ownership, and recipe-specific sharing.
- **Meal Planning** owns horizons, candidates, family choice rounds, responses,
  constraints, servings, day placement, and finalization.
- **Groceries** owns compiled lists, Already have state, household additions,
  confidence-aware stock observations, trip targets, store opportunities,
  product mappings, price and offer evidence, basket scenarios, savings plans,
  retailer handoffs, and receipt reconciliation.
- **Money** owns the durable category plan, actual spending, remaining category
  amount, forecast/freshness, plan adjustments, and the boundary between monthly
  plan room and cash safe until payday. Food receives only an authorized,
  purpose-limited projection and never copies or silently changes budget truth.
- **Activities** optionally carry recurring prompts, scheduled cooking, and
  shopping execution. They never become canonical Recipes or Meal Plans.

### Learning-release loop

1. Begin with the bundled Kwilt catalog or photograph, scan, share a URL,
   dictate, paste, or manually enter a private Recipe; review uncertain imported
   fields against their evidence. A household does not need to import content
   before planning can be evaluated.
2. Browse or search Recipes, then use **Plan with Kwilt** to hand off into a
   Meal Planning-owned review surface without creating a plan in the background.
3. Choose a next-shop, meal-count, date-range, or open horizon and a planning
   emphasis; let Kwilt prepare a short, explained starting set, edit it, then
   explicitly save the draft.
4. Cook from a clean saved or Kwilt-authored Recipe without returning to a
   source page.
5. Optionally bring in current Food-category reality from Money, choose a
   distinct trip target, and confirm only the pantry/fridge/freezer observations
   that materially affect this cycle.
6. Let AI refine an explained candidate set from authorized Recipes, household
   preferences, time, budget target, stock, and price evidence, then add or
   remove Recipes, leftovers, eat out, undecided, or plain meal notes.
7. Optionally invite selected activated household members to pick up to three,
   pass, or suggest one idea.
8. Close the round and show a calm aggregate; the organizer finalizes.
9. Compile ingredients deterministically with provenance and uncertainty.
10. Review **Already have**, corrections, staples, and quantities; preserve
   confirmed/likely/check-first evidence without requiring exact inventory.
11. Compare at most a few plan-and-basket scenarios such as **Use more of what
    we have**, **Stay near $65**, and **Keep everyone’s top choices**.
12. Capture a real store opportunity by provider evidence, barcode, photo, URL,
    or voice and review the smallest meal/list diff before accepting it.
13. Create an Instacart shopping-list page and state truthfully that retailer
   product review and checkout remain.
14. Move from a visually rich Recipe Home through a short readiness check into
    a resumable Cook Session that presents one cue at a time.
15. Let foreground voice advance, repeat, go back, answer recipe-grounded
    questions, and operate timers while always retaining visible touch controls.
16. Offer one optional post-cook learning, then let a reviewed receipt separately
    inform Money actuals, purchased-stock observations, price history, and
    receipt-proven savings for the next cycle.

### Adaptive thrift layer

Meal-first, budget-first, pantry-first, and sale-first are entry conditions, not
permanent modes. One plan carries explicit constraint and evidence snapshots.
When an accepted fact changes, Kwilt prepares a deterministic scenario comparing
the current plan/basket with the smallest useful alternative. The organizer
reviews the meal and grocery diffs before capability-owned operations apply them.

Stock remains observation-based: **Confirmed today**, **Likely on hand**, **Check
first**, or **Depleted**, with source, time, quantity range, and confidence.
Kwilt never claims a perfect pantry or food safety from age alone. A Grocery
trip target is distinct from the Money category remainder. Basket estimates
always show range, price coverage, store, and freshness.

The complete marketing-to-object workback lives in
[`07-thrift-budget-pantry-workback.md`](../design-explorations/meals-recipes-groceries/07-thrift-budget-pantry-workback.md).

### AI operating layer

AI is not a fourth food capability. It operates Recipes, Meal Planning, and
Groceries through the same canonical capability operations used by native
surfaces. It may extract, search, prepare, explain, and execute work at the
declared authority level; capability code validates every mutation and owns the
receipt.

Photo and URL import are base release criteria. Extraction creates a temporary
evidence-backed draft with field confidence and warnings. The user approves the
canonical Recipe. AI can propose meals from a budget/stock constraint, point out
ingredient ambiguity, prepare product matches and scenario diffs, capture a
store opportunity, explain savings evidence, reconcile receipt lines, and
prepare public metadata. It cannot silently change a Money budget, assert
physical stock, invite, finalize, rewrite a meal plan, select a consequential
product, apply an unsupported coupon, checkout, publish, or attest rights.

The complete authority matrix lives in
[`food-ai-operating-layer`](../design-explorations/food-ai-operating-layer/03-converge.md).

### Recipe identity and public sharing

Private Recipe identity, immutable content versions, provenance, credits,
lineage, grants, collections, media rights, and import drafts are separate
records. Public distribution uses an opted-in creator profile and a publication
snapshot of one reviewed version; it does not expose or mutate the private
Recipe. Discoverable public sharing requires moderation, takedown, rights, and
child-safety policy before launch.

### Savings Autopilot

Savings is a Groceries behavior, not a fourth top-level capability. It begins
before final shopping when budget and stock shape candidate meals, and remains
available during shopping when a store opportunity may justify a reviewed plan
change. **Find savings** presents at most three worthwhile scenarios ranked by
net household outcome: likely use, food already owned, total basket impact,
storage/waste, extra stops or activation work, and family constraints—not coupon
count. Public promotion prices, member prices, coupons requiring activation,
rebates, fees, estimates, paid totals, and receipt-proven savings remain distinct
evidence states.

Kroger regular and promotional price evidence is the first planned Basket
Truth provider. Automatic coupon activation is excluded until a provider grants
documented offer enumeration, eligibility, activation, and acknowledgement
authority.

### Retailer truth

Instacart is the first broad handoff and Kroger the second direct cart-add
adapter. Walmart, Target, Harmons-direct, and universal checkout are not on the
no-negotiation implementation path. Plain list/export remains the permanent
fallback. No state says **ordered** without retailer order evidence.

### Content boundary

Kwilt supports private user-initiated recipe capture, user-authored and family
recipes, Kwilt-authored recipes, and properly licensed/open content. It does
not bulk crawl or create a public ad-free copy of third-party recipe sites.
Every import keeps source and rights provenance and remains reviewable.

## Success signal

One household completes at least three real cycles across its natural cadence,
including at least one budget-first or pantry-first start and one reviewed store
opportunity. It reuses saved recipes, willingly participates from separate
devices, avoids at least one duplicate purchase or unlocks one meal from food on
hand, reaches retailer checkout, and reports that Kwilt removed meaningful work.
Savings expands only when itemized evidence shows a better outcome without extra
inventory or deal-management burden.

The intended screen-by-screen experience and visual acceptance contract live in
[`06-hero-experience.md`](../design-explorations/meals-recipes-groceries/06-hero-experience.md).

### Recipe Library learning catalog

The learning release includes a bundled, image-led catalog of exactly 100
Kwilt-authored household recipes so browsing, filtering, Recipe Home, planning,
and Cook Mode can be evaluated before the household has imported content. User
and family recipes remain distinct and appear first. The catalog uses original
bundled imagery, carries Kwilt provenance, and cannot masquerade as editable
private content. The inventory follows the direct-object grammar of Arcs,
Goals, and To-dos while adding one featured recipe and lightweight category or
cuisine filters. Ratings, social feeds, popularity, and a second cookbook
hierarchy remain excluded. See
[`08-recipe-library-inventory.md`](../design-explorations/meals-recipes-groceries/08-recipe-library-inventory.md).

### Plan with Kwilt handoff

The Recipe Library includes one quiet, full-width **Plan with Kwilt** offer among
its browsing shelves. It opens **Meal Planning** with exact Recipe Library context;
it does not open generic Chat and does not claim a plan already exists. The user
chooses the horizon and planning emphasis before Kwilt prepares a bounded
starting set from authorized Recipe and current Food evidence. Every suggestion
is explained, remains editable, and stays unsaved until the user explicitly
taps **Save**.

Acceptance requires the offer to appear only in the broad browsing state, hand
off to the Meal Planning-owned editor, prepare no more than seven candidates,
preserve plain meal notes, allow every Recipe candidate to be added or removed,
and make the unsaved boundary explicit. Opening or preparing the offer must not
create, finalize, invite, compile groceries, or mutate Money.

## Open questions

- Exact Instacart production approval and Harmons/Utah retailer coverage require
  a development-key feasibility run.
- Exact Kroger public scopes and Smith's cart-add behavior require a developer
  application and disposable-account proof.
- URL import quality and terms must be validated on the representative 50-site
  corpus before external launch.
- Broader discovery and live recipe collaboration remain post-learning-release
  decisions, not launch dependencies.
- Model/provider choice, private import-media retention, and the exact set of
  reversible Chat actions that can complete without a second tap require
  preflight evaluation.
- Foreground command-first cooking voice, conversational question fallback,
  interruption behavior, and timer reliability require a signed-device spike
  before the transport or provider is locked. A custom background wake word is
  not an initial-release promise.
- The learning release must determine whether progressive stock observations
  remove enough duplicate buying and planning work to justify any persistence
  beyond ephemeral Already-have review.
- Grocery-category mapping may span Food, Groceries, dining, or user-specific
  categories. Money must authorize the exact projection; Food cannot infer a
  universal category id or treat category room as cash safe until payday.
- Circular/photo ingestion and barcode/unit-price evidence need a representative
  store corpus and rights/privacy review before they support marketing claims.

## References

- [`docs/design-explorations/meals-recipes-groceries/strategy.md`](../design-explorations/meals-recipes-groceries/strategy.md)
- [`docs/design-explorations/meals-recipes-groceries/capability-boundaries.md`](../design-explorations/meals-recipes-groceries/capability-boundaries.md)
- [`docs/design-explorations/meals-recipes-groceries/object-models.md`](../design-explorations/meals-recipes-groceries/object-models.md)
- [`docs/design-explorations/food-ai-operating-layer/`](../design-explorations/food-ai-operating-layer/)
- [`docs/design-explorations/meals-recipes-groceries/04-learning-release.md`](../design-explorations/meals-recipes-groceries/04-learning-release.md)
- [`docs/design-explorations/meals-recipes-groceries/06-hero-experience.md`](../design-explorations/meals-recipes-groceries/06-hero-experience.md)
- [`docs/design-explorations/meals-recipes-groceries/07-thrift-budget-pantry-workback.md`](../design-explorations/meals-recipes-groceries/07-thrift-budget-pantry-workback.md)
- [`docs/design-explorations/meals-recipes-groceries/08-recipe-library-inventory.md`](../design-explorations/meals-recipes-groceries/08-recipe-library-inventory.md)
- [`docs/job-flows/maya-feed-household-with-less-work.md`](../job-flows/maya-feed-household-with-less-work.md)

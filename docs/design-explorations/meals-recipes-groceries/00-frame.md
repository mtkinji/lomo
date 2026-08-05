# Frame: Meals, Recipes, and Groceries

## What the user said

Andrew's dream is an ad-free family recipe collection that makes meal planning
easy, turns the chosen meals into groceries, and hands those groceries
to a store for pickup or delivery. The near-term constraint is explicit: Kwilt
cannot depend on six to twelve months of retailer partnership negotiations.
He also wants Kwilt to find and apply worthwhile coupons so the user gets the
best economic outcome without first learning how to become a couponer.
He has now chosen three capability owners—Recipes, Meal Planning, and
Groceries—and wants children with their own devices to participate in choosing
the next meals. The planning cadence must follow the household's next shop or
meal horizon rather than assuming every family shops weekly.

## Restated in user voice

When feeding my household becomes another recurring coordination burden, help
me move from meals we actually like to groceries arriving at home with as little
re-searching, list arithmetic, and store re-entry as possible, so ordinary
family life feels lighter rather than more administered.

When prices, promotions, loyalty offers, coupons, and fulfillment fees make the
real cost hard to see, help me get the best trustworthy outcome without making
me hunt for deals, so I can spend less without turning shopping into a hobby.

## Target audience

`audience-aspirational-family-organizers`: people who want family life to feel
more organized without adopting a productivity methodology.

## Representative persona

**Maya** wants the next planning cycle to contain meals her family will actually
eat, preserve
family recipes that otherwise live in cards and messages, and avoid reconstructing
the same grocery order every cycle.

- Current situation: recipes are scattered; planning and buying happen in
  separate systems; the household repeats preferences from memory.
- What she is trying to do: feed the family with less decision and coordination
  burden.
- Emotional tension: she wants relief and continuity, not a meal-optimization
  project.
- What would make this feel wrong: diet scoring, rigid calendars, silent AI
  choices, a public family feed, or a grocery flow that claims to have ordered
  when it only opened a retailer.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — ordinary household work matters when it
becomes reliable follow-through.

## Job-flow step

This extends `job-flow-maya-move-family-life-forward`, especially:

- **Know the next doable action — 2/5:** Kwilt does not yet turn “what should we
  eat before the next shop?” into the next useful family choice.
- **Schedule or hand off — 2/5:** no coherent recipe-to-list-to-retailer handoff
  exists.
- **Family participation — 3/5:** the household foundation exists, but Meals and
  Recipes have not defined capability-owned sharing.
- **Keep using the system — 3/5:** success depends on reducing repeated admin.

## Active anchors

- `jtbd-carry-intentions-into-action` — a meal intention becomes ingredients
  and an executable shopping handoff.
- `jtbd-capture-and-find-meaning` — family recipes remain useful and attributable
  without becoming filing work.
- `jtbd-invite-the-right-people-in` — household members need a bounded way to
  weigh in on one plan, while broader-family recipe sharing remains separate.
- `jtbd-trust-this-app-with-my-life` — imports, ingredient math, retailer
  matching, and order claims must be transparent.
- `jtbd-review-budget-reality-before-spending` — compare the expected total
  before checkout and reconcile it with what was actually paid.

## serves snippet

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

The current burden is not just finding recipes. It is remembering what the
family likes, gathering what each person wants, deciding what is realistic for
the current planning horizon, combining ingredient
quantities, excluding pantry items, selecting actual products, and rebuilding a
cart in a retailer system. The economic burden is also fragmented: shelf price,
unit price, public promotions, loyalty prices, digital coupons, rebates, and
fulfillment fees rarely appear as one comparable, trustworthy total.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- `ActivityType` already includes `shopping_list`; recipe-like content currently
  falls through `instructions` or `custom:*` rather than owning a durable model.
- Kwilt already presents Instacart as an out-of-the-box execution destination,
  but the implementation only constructs a single search URL.
- Household participation is capability-owned; membership is eligibility, not
  blanket content access.
- Prior participation design already distinguishes independent recipe copies
  with provenance from live shared collections.
- Activities remain the canonical atomic unit of doing. A participation
  reminder, cooking occurrence, grocery trip, or shopping list may project into
  Activities, but Recipes and Meal Plans should not be disguised as to-dos.
- The current Activity model has types and steps but no truthful representation
  for candidate meals, multiple private responses, round closure, organizer
  finalization, or variable planning horizons.

Constraints to preserve:

- Private by default.
- Capture never blocked by taxonomy, nutrition, retailer, or household setup.
- User approval before importing, sharing, finalizing a plan, substituting, or
  adding products to an external cart.
- Retailer checkout remains retailer-owned unless a documented API genuinely
  proves otherwise.
- No global household access implied by a recipe or meal-plan share.

Constraints we may challenge:

- The four-object model does not contain durable reference objects or
  collaborative decision rounds. Recipes, Meal Planning, and Groceries should
  own their domain records while projecting only executable moments into
  Activities.

Design implication:

Build three truthful capability owners: **Recipes** for reusable food knowledge,
**Meal Planning** for flexible-horizon selection and family participation, and
**Groceries** for executable lists, savings, and retailer handoffs. Activities
may remind, schedule, and project work without becoming canonical. Money may
later reconcile the resulting transaction, but it does not own product
selection or coupon activation. Capability ownership does not automatically
require three permanent navigation rows.

## Aspirational design challenge

How might we help Maya and her family choose the meals they want for whatever
horizon fits their next shop, then move the finalized plan to reviewed groceries
ready for pickup or delivery, while preserving private ownership, child voice,
organizer authority, retailer truth, and a calm household experience?

## Out of scope

- Kwilt acting as merchant of record.
- Autonomous checkout or payment.
- Retailer credential storage or brittle browser automation.
- A copied public catalog of copyrighted recipe expression.
- Nutrition or weight-loss scoring as the product's center.

## Open question

Can one bounded family choice round improve plan acceptance enough to justify a
distinct Meal Planning capability before Kwilt offers broad recipe discovery?

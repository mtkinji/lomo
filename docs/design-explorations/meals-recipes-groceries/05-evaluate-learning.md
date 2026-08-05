# Evaluate Learning: Household Feeding Loop

## Learning questions

1. Does the full loop reduce felt household work, or merely relocate it?
2. Which horizon—next shop, meal count, date range, or open—best matches the
   household's real cadence, and is it more usable than a fixed week/calendar?
3. Can structured URL import plus manual correction create trustworthy recipes?
4. Does ingredient consolidation save more time than it creates in review?
5. Does the Instacart handoff remove meaningful re-entry through checkout?
6. Are ten to twenty family/imported recipes enough to create repeat value
   before broad discovery exists?
7. Do users understand personal recipe, household plan, and shared-copy
   boundaries?
8. Does a short savings review improve the actual total without adding deal
   management or inducing unwanted purchases?
9. Can Kwilt distinguish estimated, activated, and receipt-verified savings in
   language users correctly understand?
10. Do invited children and other family members willingly respond without the
    organizer chasing them?
11. Does **Pick up to three** provide useful voice without implying majority
    rule, exposing rejection, or creating winner/loser feelings?
12. Do users understand that Activity reminders/cooking/shopping projections do
    not own or replace the MealPlan?

## Evidence plan

Supporting evidence:

- Three completed feeding cycles by the same household, including at least two
  different horizon kinds when that reflects real behavior.
- Most selected meals come from previously saved recipes by the third cycle.
- The generated list is used rather than abandoned or rebuilt elsewhere.
- Ingredient corrections decline as household aliases and prior choices accrue.
- The user reaches retailer checkout from the generated page.
- The user spontaneously begins the next cycle in Kwilt.
- At least two independently authenticated family members respond to two choice
  rounds without in-person account sharing or organizer data leakage.
- The organizer says family input reduced guessing, repeated asking, or meal
  resistance enough to justify opening another round.
- Qualitative feedback names time, cognitive relief, or reduced coordination—not
  only visual appeal.
- In the later Basket Truth release, itemized receipts show that accepted
  recommendations usually survive checkout and that estimate error is visible.

Disconfirming evidence:

- Recipe import correction takes longer than reading the source site.
- Users still recreate the list in retailer search item by item.
- Every horizon still feels like a weekly calendar renamed, or people ignore
  the plan while deciding ad hoc each night.
- Pantry exclusions or merged quantities produce frequent duplicate purchases.
- Retailer matching is too uncertain for staples, produce, or preferred brands.
- Users primarily ask for a large discovery catalog and do not reuse their own
  recipes.
- Savings recommendations create extra trips, excess quantity, unwanted brand
  changes, or coupon activation work worth more than the discount.
- Users interpret a public promotion estimate as a guaranteed checkout total.
- Participants ignore invitations, require repeated reminders, or feel that the
  aggregate exposes or judges their preferences.
- Organizers routinely override picks without explanation, making participation
  feel performative.
- Completing or deleting an Activity projection changes the plan unexpectedly.

## Instrumentation

Collect bounded operational events:

- recipe created/imported and import method;
- import fields accepted/corrected, as counts rather than recipe text;
- planning cycle created and horizon kind, without meal contents;
- candidate added/moved/removed and source category;
- choice round opened, participant count, response count, pass, suggestion,
  withdrawal, close reason, and time to close;
- aggregate viewed and organizer finalization delta from the most-picked set;
- optional Activity projection created/completed/unlinked;
- grocery list generated;
- merge accepted/split/corrected;
- item marked Already have;
- retailer handoff requested, link created, opened, returned;
- user-declared checkout completed or abandoned;
- cycle started and completed.
- savings review shown/opened/accepted, using counts and confidence classes;
- receipt reconciliation completed and estimate error, without item names in
  analytics;
- recommendation rejected reason category, such as preference, waste, trip, or
  eligibility uncertainty.

Do not collect:

- recipe instructions, family notes, grocery item names, retailer credentials,
  full URLs with private query parameters, household member identity, or
  inferred health conditions in analytics;
- which named participant selected or rejected which named meal.

## Decision rule

- **Proceed:** after at least three real cycles, the loop is reused, generated
  lists are mostly accepted, at least two real multi-device choice rounds are
  completed without prompting burden, and the household says it materially
  reduced work or meal negotiation.
- **Revise:** if recipe reuse is strong but retailer handoff is weak, improve
  Groceries/product matching without expanding discovery.
- **Reframe:** if preservation is loved but collaborative planning is not,
  separate the Recipe Box value proposition and keep groceries as a direct
  action.
- **Retire the integrated bet:** if users repeatedly return to existing meal and
  grocery tools despite reliable implementation.

## Expected next action

If the bet holds, add Kroger product matching and authenticated cart-add as the
second adapter. Then test Basket Truth with Kroger regular/promo prices and
itemized receipt reconciliation. Evaluate authorized coupon activation only
after users repeatedly value the savings review; validate household plan
participation across natural cadences and independent recipe-copy sharing before
licensed discovery.

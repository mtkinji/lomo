# Diverge: Meal Plan Occasions

## Fixed design challenge

How might we help Maya turn a selected batch into an understandable food rhythm
for the coming horizon, while preserving the fast shared cart and avoiding a
weekly-calendar maintenance job?

## Axis of variation

How much timing structure must the user create before a selected meal becomes a
real commitment?

## Alternative A: Calendar Is the Plan

Settlement opens a seven-day view with Breakfast, Lunch, Dinner, and Snack
slots. Maya places every selected recipe into a slot; templates and duplication
handle recurring meals and leftovers.

- Persona fit: moderate for highly structured weeks, weak for Maya's variable
  next-shop or meal-count horizons.
- Design-challenge answer: strongest answer to **when**, weakest protection
  against calendar upkeep.
- System fit: requires date and meal-period fields but conflicts with open and
  meal-count horizons.
- Best when: the household already schedules nearly every eating occasion.
- Fails when: plans change, only dinners matter, or breakfast/lunch are routine.
- Four-object/capture-first check: Meal Planning remains capability-owned, but
  required placement blocks the equivalent of capture-first.
- Anti-pattern check: fails through forced commitment and dashboard-like empty
  slots. It would need optional placement, which turns it into Alternative C.

## Alternative B: Flexible Batch With Optional Labels

Settlement creates **Next meals** as an undated list. Maya may attach freeform
labels such as **Sunday dinner** or **weekday lunches**, but the system does not
understand dates, meal periods, recurrence, or coverage.

- Persona fit: strong for low effort, moderate for household coordination.
- Design-challenge answer: avoids upkeep but provides weak, inconsistent timing
  semantics.
- System fit: almost entirely fits the current title and nullable date model.
- Best when: the household only needs a loose shortlist.
- Fails when: Kwilt must sort chronologically, distinguish Saturday breakfast
  from dinner, scale repeated groceries, or explain a later revision.
- Four-object/capture-first check: preserves fast capture and capability
  ownership.
- Anti-pattern check: passes, but pushes interpretation and maintenance back to
  Maya through freeform text.

## Alternative C: Progressive Commitment

The shared cart remains completely unscheduled. At settlement, selected meals
become committed **Next meals** and default to **Flexible**. Maya places only the
meals whose timing matters. Specific occasions use a date plus meal period;
repeated needs use a compact coverage commitment such as **Weekday lunches —
leftovers and sandwiches**. The resulting view shows only populated occasions,
coverage, and flexible meals—never an empty 7-by-4 grid.

- Persona fit: strongest; it makes precision available without making it the
  definition of a valid plan.
- Design-challenge answer: answers important timing questions while preserving
  natural horizons and incomplete certainty.
- System fit: extends the existing occasion model and immutable versioning while
  retaining the shared cart and Grocery boundary.
- Best when: some meals are anchored, some are routine, and some remain
  intentionally flexible.
- Fails when: a household wants nutritional scheduling for every meal or a full
  external calendar replacement.
- Four-object/capture-first check: Food capability objects remain separate from
  Activities; adding to the cart never requires timing.
- Anti-pattern check: passes if coverage is compact, placement is optional, and
  blank slots never appear as deficits.

## Alternative D: Rhythm Template First

Maya begins by defining a reusable household rhythm—weekday breakfasts,
school lunches, cook nights, leftovers nights—and fills it with recipes each
cycle. The rhythm becomes the primary planning object.

- Persona fit: potentially strong after repeated use, weak at initial activation.
- Design-challenge answer: excellent for recurring coverage, but requires Maya
  to model the household before receiving value.
- System fit: introduces a new persistent template model and setup surface.
- Best when: routines are stable and repeated for many cycles.
- Fails when: family cadence changes, planning begins with the next shop, or the
  user only needs three dinners.
- Four-object/capture-first check: risks blocking ordinary food capture behind
  configuration.
- Anti-pattern check: fails as a methodology/setup requirement. A learned or
  optional template may be a later enhancement, not the core model.

## Comparative read

| Criterion | Calendar | Flexible batch | Progressive commitment | Rhythm template |
| --- | --- | --- | --- | --- |
| Reduces Maya's mental load | Weak | Strong | Strongest | Weak initially |
| Answers exact timing | Strongest | Weak | Strong | Strong |
| Handles weekday coverage | Through duplication | Through text only | First-class and compact | Strongest |
| Preserves natural horizons | Weak | Strongest | Strongest | Moderate |
| Fits current Kwilt system | Moderate | Strongest | Strong | Weak |
| Keeps Grocery truth clear | Strong | Moderate | Strongest | Strong |
| Avoids blank-slot pressure | Weak | Strongest | Strongest | Moderate |

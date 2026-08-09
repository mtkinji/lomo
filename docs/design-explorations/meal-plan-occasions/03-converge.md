# Final Recommendation: Progressive Meal Commitment

## Decision

Choose **Progressive Commitment**: one continuous shared cart feeds one active
settled **Next meals** batch. Every committed meal may remain explicitly
**Flexible**, be placed into one specific occasion, or contribute to a compact
coverage commitment. The interface shows only decisions the household has made;
it never presents a full grid of empty meal slots.

This is the best synthesis of the research because it combines:

- Mealime's low-administration meal bundle;
- AnyList and Samsung Food's queue-versus-calendar separation;
- Plan to Eat and Paprika's useful exact placement;
- family-calendar research distinguishing coordination from awareness; and
- Kwilt's existing separation of Recipes, Meal Planning, and Groceries.

The full evidence review is in [research.md](research.md).

## The system in one view

```text
Recipes / ideas
      ↓ add
Shared cart                         household coordination
  candidates + Sounds good
      ↓ Maya chooses
Next meals                          committed household decision
  specific occasions
  coverage commitments
  flexible meals
      ↓ compile this plan version
Groceries                           execution
      ↓ cook / skip / replace
Plan history + next cycle
```

## Canonical concepts

### Shared cart

A continuous household-private pool of meal candidates. Everyone eligible may
add; everyone eligible may attach one positive **Sounds good** signal; Maya
chooses. The cart has no week, date, meal period, grocery effect, or automatic
expiry.

### Next meals

One active organizer-settled batch representing what the household currently
intends to eat. It has a natural horizon—next shop, meal count, date range, open,
or week—but a week is not privileged in the domain.

### Timing intent

Each committed meal has exactly one timing state:

1. **Flexible** — committed and shop-ready; exact timing is intentionally open.
2. **Specific occasion** — one date and one meal period, such as **Sunday ·
   Dinner**.
3. **Coverage allocation** — a meal or strategy covering a repeated need across
   a bounded set of days, such as **Weekday lunches · leftovers and sandwiches**.

Null is not a timing state. Existing undated meals should migrate or project as
explicitly **Flexible**.

### Coverage commitment

Coverage is not five copied calendar events. It is one bounded household answer
containing:

- meal period;
- included dates or weekdays within the current horizon;
- a short strategy label;
- optional linked recipes or plain foods; and
- total planned servings or occurrence quantities when it contributes Grocery
  ingredients.

Examples:

- **Weekday lunches · leftovers + sandwiches**
- **Breakfasts · oatmeal, yogurt, and fruit**
- **Two school lunches · turkey wraps**

Coverage without recipe ingredients may still add explicit grocery items, but it
must not invent quantities.

## User experience

### 1. Browse and contribute

Adding a meal remains one tap. No horizon, day, meal type, or serving question
interrupts contribution.

### 2. Choose next meals

Maya opens the Plan drawer, taps **Choose next meals**, and selects a useful
subset with contributor and **Sounds good** context visible. Popularity never
preselects a meal.

### 3. Place only what matters

After selection, the same drawer shows a quiet optional step:

> Place any meals whose timing matters.

Every selected meal begins as **Flexible**. Tapping its timing line offers:

- Flexible
- Choose day, then Breakfast / Lunch / Dinner / Snack
- Add to a coverage commitment

Maya can settle immediately without placing anything. Diner or serving
exceptions remain contextual to the affected meal.

### 4. See the settled plan

The plan is a sparse, chronological answer—not a calendar form:

```text
NEXT MEALS

MONDAY
Dinner  Chicken tacos

SATURDAY
Breakfast  Pancakes

SUNDAY
Dinner  Lasagna

THIS WEEK
Weekday lunches  Leftovers + sandwiches

FLEXIBLE
Thai curry
Pasta primavera
```

Days and meal periods with no decision do not appear. There is no completion
percentage and no empty-state pressure.

### 5. Compile Groceries

Groceries compiles from one immutable settled plan version:

- all flexible committed meals count;
- specific placement does not change ingredient quantities;
- coverage contributes only explicit, bounded quantities; and
- cart candidates never contribute.

If Maya revises the plan after Grocery compilation, Kwilt shows the ingredient
diff and asks her to apply it. It never silently rewrites a reviewed list.

## Lifecycle

1. **Cart is open continuously.** Household ideas accumulate independently of
   any committed plan.
2. **Maya settles a batch.** Selected candidates become an immutable version of
   **Next meals** and leave the cart. Unselected candidates remain.
3. **The batch is active.** Placement and coverage may be revised through a new
   plan version; history remains inspectable.
4. **Groceries references a version.** A later plan change produces a proposed
   Grocery diff.
5. **Meals resolve naturally.** Cooking completion may mark a meal made; Maya
   may also mark it skipped or replaced. This must remain lightweight.
6. **The batch closes.** It closes when all committed meals are resolved or when
   Maya explicitly starts the next batch. Unresolved meals can be carried
   forward deliberately; they do not silently disappear.
7. **The next cycle begins from less work.** The cart still contains unselected
   ideas, while Recipe notes and cook records preserve useful learning.

The first release need not implement automatic cook completion or history
learning, but the model must not make those later steps impossible.

## Authority and collaboration

| Action | Household member | Maya |
| --- | --- | --- |
| Add to shared cart | Yes | Yes |
| Add/remove own Sounds good | Yes | Yes |
| Withdraw own candidate | Yes | Yes |
| Choose committed meals | No | Yes |
| Place or revise timing | No | Yes |
| Define coverage | No | Yes |
| Compile/apply Grocery changes | No | Yes |

Family members see the settled plan because it is an awareness surface. They do
not need access to unrelated calendars, spending, retailer actions, or private
food evidence.

## Domain recommendation

Retain `MealPlanHorizon`, immutable plan versions, candidates, entries, and
occasions. Extend timing semantics rather than creating a parallel weekly-plan
model.

Conceptually:

```ts
type MealTiming =
  | { kind: 'flexible' }
  | { kind: 'occasion'; date: LocalDate; mealPeriod: MealPeriod }
  | {
      kind: 'coverage';
      mealPeriod: MealPeriod;
      dates: LocalDate[];
      label: string;
      totalServings: number | null;
    };
```

`dates` must be materialized inside the settled plan version rather than stored
as a timeless recurrence rule. This keeps Grocery quantities, history, and
revisions deterministic even when the household's week or cadence changes.

The UI may say **Weekday lunches**, but the settled snapshot should contain the
actual dates it covers.

## Capability delta

### Today Maya cannot

- distinguish intentionally flexible meals from forgotten placement;
- answer **what is Sunday dinner?** from the shared-cart settlement path;
- answer **what are lunches this week?** without creating five fake events; or
- revise timing after Grocery compilation with a clear downstream consequence.

### After this design Maya can

- commit meals without scheduling them;
- anchor the few meals whose timing matters;
- express recurring breakfast or lunch coverage once;
- give the household a calm, shared answer; and
- change the plan without losing Grocery truth.

### Still intentionally unsupported

- a nutrition or macro schedule for every eating occasion;
- external-calendar replacement or automatic calendar ingestion;
- AI auto-scheduling;
- cooking assignments, reminders, or attendance tracking;
- majority-rule meal selection;
- automatic interpretation of non-response; and
- an unbounded recurring-meal rules engine.

## Reductive decisions

- No 7-by-4 grid.
- No required week horizon.
- No required placement step.
- No blank-slot completion state.
- No separate Meal Planning home for this interaction.
- No new **Scheduled / Unscheduled** tabs; use populated sections in **Next
  meals**.
- No permanent household-rhythm setup.
- No cart ingredients in Groceries.
- No silent Grocery recompilation.
- No green primary action treatment; use the established neutral primary
  control styling.

## Activation

Placement appears only after Maya has selected meals, when the question **when
does this matter?** is concrete. Coverage is offered only when she chooses a meal
period or adds a simple food strategy; it is not onboarding configuration.

The first-use teaching is one sentence:

> Keep meals flexible, or place the ones whose timing matters.

Natural adoption means Maya places at least one real anchor or coverage answer
and another household member later understands the plan without asking her.

## Approved follow-on: Next meals widget

After the committed-meals lifecycle and authoritative settled stack are proven,
project **Next meals** into an optional appetite-first Recipe-card widget. The
widget is deliberately deferred so it cannot become a second plan model or hide
unresolved commitment, carry-forward, timing, Grocery-version, and close-cycle
semantics. Its frame is recorded in
[`../next-meals-widget/00-frame.md`](../next-meals-widget/00-frame.md).

## Accepted trade-offs

- Flexible meals may still require a day-of choice. That is honest uncertainty,
  not a product failure.
- Coverage adds a domain concept. It is justified because repeated coverage has
  different quantity and display semantics from one occasion.
- Organizer-only placement preserves responsibility asymmetry. It avoids
  turning positive household participation into authority over shopping and
  spending.
- A sparse view is less visually symmetrical than a calendar. The asymmetry is
  desirable because it reflects actual decisions.

## Rejected alternatives

- **Full calendar:** precise but turns absence of a decision into visible debt.
- **Freeform labels only:** reductive initially, but cannot reliably sort,
  compile quantities, or explain revisions.
- **Household rhythm setup:** potentially useful later, but asks Maya to model
  family life before receiving value.
- **AI scheduling:** premature; it would add trust and correction work before
  the deterministic placement model is proven.

## Stated bet

We're betting that households need **selective specificity**, not complete
scheduling: a few anchored occasions, one or two coverage answers, and several
flexible committed meals will provide enough shared certainty to shop and act
without making Maya maintain a food calendar.

If households repeatedly fill every meal period, ask for recurring templates,
or cannot understand the sparse plan, revisit an optional expanded week view.
Do not make the full grid the default unless real usage demonstrates that the
sparse model hides necessary information.

## Success signals

Across three natural household food cycles:

- Maya settles without being forced to place every meal;
- at least one cycle contains a specific occasion and one contains coverage;
- another household member can answer what is anchored, covered, and flexible;
- Maya does not recreate the plan in Messages, Notes, or a paper calendar;
- no one reads flexible meals as forgotten work;
- Grocery quantities match the committed version and any revision produces the
  correct reviewable diff; and
- Maya reports less decision and coordination work, not merely a more complete
  calendar.

# Research: Meal Plan System Design

## Research question

What system best helps a household move from meal ideas to an understandable,
shop-ready plan while answering real timing questions without creating a
calendar-maintenance job?

This review combines current product patterns, user sentiment, family-food
research, family-calendar research, and Kwilt's existing Meal Planning model.
It is design evidence, not proof that any one competitor pattern is universally
preferred.

## What the market has learned

### 1. A meal bundle reduces decisions, but does not create shared awareness

Mealime begins with a meal count and lets the user build a bundle without
requiring a complete weekly calendar. Its documentation explicitly supports
both week-ahead and just-in-time planning. This is effective at reducing choice
and generating groceries, but a bundle alone cannot answer **Sunday dinner** or
**Saturday breakfast**.

Source: [Mealime getting started](https://support.mealime.com/article/151-getting-started-guide)

### 2. A full calendar answers when, but makes precision the default

Plan to Eat and Paprika assign recipes to a date and meal type. They support
moving, copying, leftovers, notes, and reusable templates. This is powerful for
households that already plan through a calendar, but the model treats each
breakfast, lunch, dinner, and snack as a schedulable event.

Sources:

- [Plan to Eat meal planning](https://learn.plantoeat.com/help/adding-recipes-to-your-meal-plan)
- [Plan to Eat templates](https://learn.plantoeat.com/help/creating-template-menus)
- [Paprika iOS guide](https://paprikaapp.com/help/ios/)

### 3. Queue then schedule is the strongest current hybrid

AnyList and Samsung Food both separate unscheduled recipes from the dated plan.
AnyList's Queue can hold meals and even contribute ingredients without assigning
a day. Samsung Food's Queue holds recipes until the user chooses a day, while
its Plan shows the week. Both products preserve the distinction between **we may
make this** and **this is on the calendar**.

Sources:

- [AnyList Meal Plan Queue](https://help.anylist.com/articles/meal-plan-queue/)
- [Samsung Food Meal Planner](https://support.samsungfood.com/hc/en-us/articles/35369657798548-Getting-Started-with-Meal-Planner)

Kwilt should borrow the separation, but not AnyList's ability to generate a
shopping list from uncommitted Queue items. In Kwilt, only organizer-settled
meals should create Grocery work.

## What people appear to value

App reviews and discussions are qualitative and self-selected, but the recurring
sentiment is consistent:

- People praise the reduction in daily deciding and automatic grocery-list work.
- Flexible users often plan only a few meals and deliberately leave room for
  leftovers, family recipes, takeout, or schedule changes.
- Calendar-oriented users value seeing the week and sharing it with the
  household.
- People abandon systems that require too much setup, recipe transcription,
  rigid scheduling, or upkeep.
- Some Paprika users rely heavily on recipe storage while barely using its meal
  calendar, showing that feature availability does not guarantee adoption.

Sources:

- [Mealime App Store reviews](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103?see-all=reviews)
- [AnyList App Store reviews](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
- [Mealime user discussion](https://www.reddit.com/r/povertyfinance/comments/18vkm9k/does_anyone_here_use_mealime_meal_planning_app/)
- [Paprika planning discussion](https://www.reddit.com/r/Cooking/comments/1ln6c1p/is_the_paprika_app_what_im_looking_for/)

The design implication is not “never use a calendar.” It is: make specificity
available where it produces relief, and avoid turning unspecified time into an
error or unfinished state.

## What family-food research adds

Family meal work includes planning, acquiring, storing, preparing, serving, and
cleaning. Qualitative research repeatedly finds time scarcity, fatigue,
conflicting schedules, food preferences, and failure to follow a plan among the
barriers. Meal-kit research found that reduced food-related decision making and
greater family participation reduced perceived maternal mental load.

Sources:

- [Meal kits in the family setting](https://pubmed.ncbi.nlm.nih.gov/34801628/)
- [Barriers to healthy family dinners](https://pmc.ncbi.nlm.nih.gov/articles/PMC10297414/)
- [The family meal as food work](https://pmc.ncbi.nlm.nih.gov/articles/PMC10548410/)

This argues for reducing organizer decisions and distributing useful input. It
does not argue for distributing final responsibility ambiguously. Shared adding
and support can lower discovery and polling work; organizer settlement retains a
clear decision boundary.

## What planning and calendar research adds

Specific when-and-where plans can help turn intentions into action. The useful
unit is a meaningful cue, not maximal calendar detail.

Source: [Implementation intentions and eating behavior](https://pubmed.ncbi.nlm.nih.gov/20883734/)

Family-calendar research makes an equally important distinction: coordination
usually happens through the family's social routines; the calendar primarily
creates shared awareness that enables coordination. Field work also found that
calendar systems must fit existing routines or they will not be used.

Sources:

- [LINC participatory family-calendar research](https://www.microsoft.com/en-us/research/publication/linc-ing-the-family-the-participatory-design-of-an-inkable-family-calendar/)
- [LINC in-home field trials](https://graphicsinterface.org/proceedings/gi2007/gi2007-27/)

For Kwilt, the shared cart should carry coordination. The settled plan should
create awareness. Asking the calendar to do both would recreate polling,
negotiation, and maintenance inside a grid.

## System principles derived from the evidence

1. **Progressive commitment.** An idea, a supported candidate, a committed meal,
   and a dated meal are distinct levels of certainty.
2. **Specificity earns its place.** Add a date or meal period only when it changes
   preparation, participation, or household awareness.
3. **Sparse is complete.** An intentionally partial plan is a valid plan, not a
   failed week.
4. **Coverage differs from occurrence.** “Sunday dinner” is one occurrence;
   “weekday lunches” is a repeated coverage strategy and should not require five
   duplicated recipe events.
5. **Coordination and awareness are different jobs.** The cart gathers input;
   the settled plan communicates the decision.
6. **Organizer authority remains explicit.** Participation informs the plan;
   it does not silently create Grocery or Money work.
7. **Execution follows commitment.** Recipes inform Meal Planning; only a
   settled plan version informs Groceries.
8. **Change is expected.** Moving a meal or revising coverage creates a new plan
   version and an inspectable Grocery diff, not a silent rewrite.

## Current Kwilt fit

Kwilt already has most of the correct boundaries:

- the shared cart holds candidates and positive household signals;
- organizer settlement creates an immutable plan version;
- `MealPlanHorizon` supports a week, date range, meal count, next shop, or open
  horizon;
- `MealPlanOccasion` already carries a title, optional date, dishes, and diner
  exceptions; and
- Groceries consumes a settled plan rather than Recipes directly.

The missing model is timing intent. A null `placementDate` currently means too
many things: flexible, forgotten, not yet placed, or recurring coverage. The
system should distinguish those meanings without requiring all of them to be
visible configuration.

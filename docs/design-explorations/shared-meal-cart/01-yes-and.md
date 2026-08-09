# Yes-And: Shared Meal Cart

## Original idea

Turn the existing Meal Plan count and drawer into a household-private shared
cart where eligible members can add meals, then let each person attach one
visible positive reaction to meals that sound good.

## Adjacencies

### Yes, and what if it could preserve contribution provenance?

Each meal remembers who added it, and adding the meal implicitly records that
person's own positive reaction.

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: Maya can understand the household context without reconstructing
  who requested what.
- New value: visible authorship makes the shared cart trustworthy and removes a
  redundant second tap from the contributor.
- Cost delta vs. original: low
- Anti-pattern check: pass; authorship is contextual, not a social activity feed.

### Yes, and what if it could show support without producing winners?

Meal cards show small named avatars or `You + 2` for positive reactions, while
preserving their current order and leaving the organizer's decision untouched.

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: Maya can see overlap in household willingness without turning
  dinner into a contest.
- New value: broader support becomes legible at a glance.
- Cost delta vs. original: low
- Anti-pattern check: pass only with no downvote, leaderboard, winner badge, or
  vote-based automatic sorting.

### Yes, and what if every participant could contribute from where appetite begins?

Adding to the shared cart works from Meals browse and Recipe Home for every
eligible household member, rather than requiring them to open a planning screen.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: a meal someone wants becomes durable at the moment it looks
  appealing.
- New value: participation does not depend on learning Meal Planning or waiting
  for an invitation.
- Cost delta vs. original: medium
- Anti-pattern check: pass; capture is immediate and does not require setup.

### Yes, and what if private food knowledge could be shared intentionally into the cart?

When someone adds a private or personal Recipe, Kwilt makes the plan-visible
snapshot and attribution boundary explicit before household members can inspect
it.

- Serves: `jtbd-invite-the-right-people-in`, `jtbd-trust-this-app-with-my-life`
- Job elevation: family recipes can participate without silently exposing the
  contributor's broader private Recipe library.
- New value: the cart can mix catalog, shared, and intentionally contributed
  personal meals safely.
- Cost delta vs. original: medium
- Anti-pattern check: pass with item-scoped sharing; failure if household
  membership grants blanket Recipe-library access.

### Yes, and what if the cart could settle without becoming a formal round?

The organizer can mark a useful subset as the next meals directly in the drawer;
unsettled possibilities remain available or can be cleared without opening and
closing a separate choice round.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: household contribution turns into a real decision without a
  second administrative workflow.
- New value: the current invite, response, aggregate, and generic finalize
  sequence can collapse into the shared cart.
- Cost delta vs. original: medium
- Anti-pattern check: pass; organizer authority stays explicit without forced
  commitment or workflow chrome.

### Yes, and what if the cart could hold real-life non-recipes?

Eligible members can add simple possibilities such as leftovers, eat out,
breakfast for dinner, or a short meal note with the same authorship and reaction
model.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the cart represents how the household will actually eat, not
  only what exists in a recipe catalog.
- New value: the settled plan can be realistic without manufacturing Recipes.
- Cost delta vs. original: low
- Anti-pattern check: pass; this avoids catalog lock-in and planning ceremony.

### Yes, and what if settling the cart could improve the next cart quietly?

Kwilt may later use contributed, supported, settled, removed, and cooked signals
to prepare a better starting set, while keeping the evidence inspectable and
never treating an unchosen meal as dislike.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the next cycle begins with less repeated coordination.
- New value: household-specific assistance can emerge from ordinary use rather
  than a preference questionnaire.
- Cost delta vs. original: high
- Anti-pattern check: pass only as a later, explained proposal; failure if Kwilt
  silently profiles a person or equates non-selection with rejection.

## Job elevation

The shared cart is bigger than collaborative list editing but smaller than a
family voting system. It elevates the job from **Maya asks everyone what they
want and assembles the answer** to **the household leaves useful, bounded signals
in one place and Maya settles the next meals**.

## Frame recommendation

**Run the design-thinking loop with the original frame.**

The durable expansion is already inside the frame: multi-person contribution,
clear authorship, and named positive reactions in the existing Plan drawer. Keep
direct settling and non-Recipe meal notes in the solution space. Defer learned
recommendations, reminders, comments, negative reactions, ranking, and any
broader social layer until real household use proves a need.

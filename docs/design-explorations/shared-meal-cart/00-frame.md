# Frame: Shared Meal Cart

## What the user said

> This feels very much like a shopping cart kind of scenario. Only in this case
> I'm imagining everyone can add to the cart. That alone might be enough. But I
> do wonder if we can do more, like giving each meal a vote affordance.

## Restated in user voice

When the next few meals are still undecided, help everyone in the household put
food they would genuinely eat into one shared place and express lightweight
preference, so the organizer can make a realistic decision without chasing
people, running a formal vote, or rebuilding the family's ideas herself.

## Target audience

`audience-aspirational-family-organizers` - people who want ordinary family life
to move with less coordination overhead, represented by Maya.

## Representative persona

Maya is carrying the mental load of deciding what the household will eat. She
wants useful participation from the people affected without turning dinner into
a committee, a family project-management system, or another chore she has to
administer.

- Current situation: Maya finds meals while browsing, but the active plan is
  organizer-owned and family input requires opening a separate frozen choice
  round.
- What she is trying to do: let the household build a plausible pool of meals,
  see what has genuine support, and settle the next few meals with less chasing.
- Emotional tension: she wants help, but still needs a clear final decision and
  confidence that everyone has been considered.
- What would feel wrong: public ranking, winners and losers, visible rejection,
  children competing for votes, or every household member being able to commit
  spending and grocery work.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the outcome is not engagement with a
meal-planning feature; it is moving the household from uncertainty to food it
can actually cook and eat.

## Job flow step

`job-flow-maya-feed-household-with-less-work`, primarily:

- **Prepare a plausible short list** - currently `2/5`; candidates exist, but
  the decision surface is weak and organizer-heavy.
- **Gather household input** - currently `2/5`; bounded private choice rounds
  exist, but require an explicit invitation workflow and do not let household
  members add directly to the active plan.
- **Make the final call** - currently `2/5`; organizer authority exists, but the
  finalization experience exposes configuration more strongly than the
  household's emerging decision.

## Active anchors

- `jtbd-carry-intentions-into-action` - a meal someone wants can enter a durable
  shared cart immediately rather than disappearing into conversation.
- `jtbd-invite-the-right-people-in` - participation is scoped to one household
  plan and does not expose broader recipe or personal-preference data.
- `jtbd-trust-this-app-with-my-life` - authorship, visibility, authority, and the
  meaning of preference signals must remain obvious and calm.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

The current product models participation as an organizer-created choice round
over a frozen candidate set. That makes family input an exceptional workflow.
The stronger mental model is a shared cart: adding meals is ordinary and
continuous, preference is lightweight, and settling the cart remains a distinct
organizer action.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: the top-right Meal Plan count opens a persistent Plan
  drawer from Meals.
- Existing user flow: the organizer adds candidates, optionally opens a family
  choice round, reviews responses, and finalizes the plan.
- Existing domain model: Meal Plan candidates record a suggester, but only the
  organizer can read and replace the candidate set. Choice responses are private
  participant records against a frozen round.
- Existing technical affordances: household identity, child capability
  activation, candidate provenance, participant-scoped responses, Realtime-ready
  repositories, organizer finalization, and immutable finalized plan versions.
- Existing UX convention: meal addition is already a one-tap, durable action;
  the top-right count and drawer make the active plan recoverable.

Constraints to preserve:

- Recipes owns reusable food knowledge; Meal Planning owns the shared cart and
  the settled decision; Groceries consumes only a settled plan.
- Any eligible person may contribute, but adding a meal never finalizes it,
  compiles groceries, changes Money, or commits a retailer action.
- The organizer retains authority to remove, settle, revise, and turn the plan
  into groceries.
- Child participation remains explicitly activated and scoped to Meal Planning.
- Capture stays easy; household participation is useful without becoming
  required.
- Preference signals inform the organizer and never silently determine the
  outcome.

Constraints we may challenge:

- Only the organizer can read and mutate the active candidate set.
- Family participation must begin with a separately opened, frozen choice
  round.
- Preference must be submitted as one private multi-selection response rather
  than attached naturally to each meal.

Design implication:

The top-right count remains the persistent handle and the Plan drawer becomes
the shared cart. The first release should make multi-person adding trustworthy
before adding elaborate voting. A meal-level preference affordance can extend
the cart when its meaning, privacy, and authority are legible without creating a
leaderboard.

## Aspirational design challenge

How might we help Maya's household build and react to one shared cart of meals,
so the family contributes naturally and Maya can settle a realistic plan with
less coordination, while preserving private participation, clear authorship,
organizer authority, and calm family dynamics?

## Out of scope

- Majority-rule finalization or automatic winner selection.
- Public or cross-household meal popularity.
- Comments, chat threads, or social-feed activity attached to every meal.
- Automatic grocery compilation from uncommitted candidates.
- Requiring every household member to respond before the organizer proceeds.
- Budget, pantry, retailer, or scheduling optimization in the first shared-cart
  learning release.

## Resolved decision

Meal preference is a positive-only, household-visible, named reaction. The
surface uses small avatars or a compact `You + 2` treatment rather than a ranked
vote total. There is no negative reaction, automatic sorting, or majority-rule
finalization.

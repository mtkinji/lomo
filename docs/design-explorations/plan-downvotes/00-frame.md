# Frame: Plan downvotes

## What the user said

> Now let's add a downvote.

## Restated in user voice

When my household is considering a recipe I do not want, let me say so in one
tap, so the person making the final call can distinguish silence from genuine
disinterest without chasing me for an answer.

## Target audience

`audience-aspirational-family-organizers` — households that want ordinary food
decisions to move with less coordination.

## Representative persona

Maya is gathering lightweight input before choosing what to shop for.

- Current situation: several family members can nominate and support recipes.
- What she is trying to do: make a plausible choice without administering a poll.
- Emotional tension: silence could mean indifference, dislike, or simply not seen.
- What would feel wrong: anonymous rejection, majority rule, or family conflict
  amplified by the app.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — move the household toward a meal it can
actually shop for and make.

## Job flow step

Step 8, **Gather household input**, currently 3/5. Kwilt supports compact
positive reactions, but cannot distinguish “not for me” from no response.

## Active anchors

- `jtbd-invite-the-right-people-in` — household input should be bounded and attributable.
- `jtbd-trust-this-app-with-my-life` — negative feedback must be transparent and non-manipulative.
- `jtbd-carry-intentions-into-action` — the organizer needs useful signal before shopping.

## System alignment

Constraint posture: `Bend the system`.

Current system facts:

- The existing Plan drawer owns participation; no new screen is needed.
- Each person has at most one reaction per recipe.
- Five positive reactions contribute one unit of support each.
- Lifecycle grouping outranks reaction ordering; the organizer still sends recipes.
- The accepted brief explicitly excludes negative votes and the database check
  permits only positive reactions.

Constraints to preserve:

- One shared Plan, one response per person, named participants, organizer authority.
- A downvote never removes, blocks, or prevents sending a recipe to Groceries.
- No anonymous vote, comment requirement, reason taxonomy, or winner declaration.

Constraint we are challenging:

- Participation is no longer positive-only.

## Aspirational design challenge

How might we help Maya distinguish “not for me” from silence, while keeping
family input calm, attributable, reversible, and advisory?

## Out of scope

Anonymous voting, vetoes, dislike reasons, recommendation-model training, and
automatic removal.

## Open question

Should the negative response be visible to everyone or only to the responder
and household organizers?

## Anchor assessment

`serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]`

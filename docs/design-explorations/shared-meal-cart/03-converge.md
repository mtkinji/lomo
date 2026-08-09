# Converge: One Shared Meal Cart

## Decision

Choose **One Shared Cart**.

The existing top-right Plan count remains the durable handle. Its drawer becomes
a household-private cart where eligible members can add meal possibilities and
attach one named, positive-only **Sounds good** reaction. Maya settles a useful
subset only when she is ready. Reactions inform that decision but never rank,
select, or finalize meals automatically.

## Qualitative scoring

| Criterion | One Shared Cart | Considering / Next up | Household Pulse |
| --- | --- | --- | --- |
| Maya fit | Strongest: least administration | Strong, but adds a state Maya must manage | Moderate: reduces synthesis but adds explanation |
| Shared participation | Strong: contribution is ordinary | Strong: contribution plus visible commitment | Strong: contribution plus aggregate review |
| Calm family dynamics | Strongest: no contest or workflow | Moderate: chosen status may feel like rejection | Moderate: summary can imply winners |
| Existing surface fit | Strongest: enhances the current drawer | Good: requires two drawer regions | Good: requires a separate review mode and summary |
| Model and authority change | Medium | Medium-high | High |
| Learning clarity | Strongest: tests the core metaphor | Weaker: tests cart plus progressive status | Weakest: tests cart plus proposal assistance |
| Main risk | Cart accumulation | Household project-board feeling | Algorithmic ceremony and false consensus |

## Capability delta

### Today

The household cannot build one active Meal Plan together. Maya adds and edits
the candidate set alone. To gather input she must open a frozen choice round,
choose participants, wait for separate responses, review an aggregate, and then
move through a generic finalization surface.

### After this concept

- Every eligible household member can see the active shared cart.
- Every eligible member can add a catalog meal, intentionally shared Recipe, or
  plain meal idea from the moment it looks useful.
- Adding preserves authorship and implicitly records that contributor's own
  **Sounds good** reaction.
- Each person can add or remove their own positive reaction on any available
  candidate.
- Maya can enter a temporary selection mode, choose the meals the household will
  use next, and settle them into one immutable plan version.
- Unselected ideas can remain available for the next decision or be cleared by
  Maya.

### What goes away

- Family participation no longer requires opening a separate choice round.
- The primary path no longer freezes candidates while input is collected.
- Maya no longer reconstructs suggestions submitted outside the candidate set.
- The generic **Review Meal Plan** handoff is replaced by an action that names
  the actual decision: **Choose next meals**.
- The general-purpose finalization screen is not required for ordinary meals;
  only genuine serving or diner exceptions open contextual review.

### Still intentionally unsupported

- Majority rule, automatic winners, or vote-driven sorting.
- Negative reactions or visible rejection.
- Comments, conversation threads, and reminder campaigns.
- Automatic household profiling or recommendations from reaction history.
- Household members other than the organizer settling the plan, compiling
  groceries, changing Money, or opening retailer actions.

## Before and after user stories

### Household member

Before: When Sam sees a meal he wants, he must tell Maya elsewhere or wait for a
formal choice invitation.

After: When Sam sees a meal he wants, he taps `+`; it appears in the shared cart
as **Added by Sam**, and his support is already visible.

### Another participant

Before: When Riley wants to support a meal Maya or Sam added, she submits a
separate response over a frozen candidate set.

After: Riley opens the same cart and taps **Sounds good** on that meal. She can
change her own reaction while the cart remains open.

### Organizer

Before: Maya opens a round, waits, reviews an aggregate, configures finalization,
and moves the result to Groceries.

After: Maya opens the cart she has already been watching, taps **Choose next
meals**, selects a useful subset with the household's named positive signals in
view, and taps **Use these meals**.

## System implications

Constraint posture: `Bend the system`.

### Preserve

- The top-right Plan count and full drawer opened from it; no partial peek.
- Meal Planning ownership of candidates, participation, organizer authority,
  settled plan versions, servings, diner exceptions, and finalization.
- Recipes ownership of reusable food knowledge and item-scoped sharing.
- Groceries consuming only a settled plan version.
- Permanent-user requirements, active household membership, child capability
  activation, optimistic concurrency, and explicit mutation receipts.

### Change

- Active-plan visibility expands from organizer-only to eligible household
  members.
- Candidate mutation becomes append-oriented and actor-aware rather than whole
  candidate-set replacement by the organizer.
- Candidate removal authority distinguishes contributor withdrawal from
  organizer moderation.
- A per-person, per-candidate positive-reaction record replaces private frozen
  multi-selection responses in the primary path.
- The drawer receives Realtime invalidation so additions and reactions appear
  without manual refresh.
- Settling snapshots the selected candidates and their Recipe provenance without
  copying reactions into Groceries.

### Migration posture

Existing draft candidates become cart candidates attributed to the plan
organizer when no trustworthy historical contributor can be resolved. Existing
open choice rounds remain readable and closable during migration but new rounds
are not created from the primary drawer. Historical responses remain historical
evidence and are not transformed into public reactions without explicit consent.

## Reductive design decisions

### Smallest elegant version

- One current shared cart per household food cycle.
- Existing Plan count and two drawer snap points.
- One scrollable list in insertion order.
- Image, title, contributor, and compact positive reactions per meal.
- One-tap add and one-tap reversible reaction.
- One organizer-only **Choose next meals** action.
- Temporary selection state with **Use these meals**.

### Enhance instead of add

Enhance the existing Plan drawer. Do not add a Meal Planning home, shared-food
feed, voting screen, household dashboard, or permanent planning stepper.

### Collapse or retire

- Retire **Ask the family** and frozen choice rounds from the ordinary path.
- Replace **Review Meal Plan** with the state-derived drawer action.
- Collapse ordinary final selection into the drawer.
- Preserve contextual sheets only for exceptional diner, serving, or placement
  decisions.

### Refuse to add

- No vote totals as the dominant visual.
- No sorting by popularity.
- No `dislike`, `veto`, or rejection reason.
- No response-completion meter.
- No “everyone has voted” requirement.
- No comments, mentions, or per-meal notifications in the learning release.
- No horizon questionnaire before the first addition.

## Interaction contract

### Peek state

- Shows **Plan**, the current candidate count, and up to four thumbnails.
- The top-right affordance and drawer count reflect the same authoritative cart.
- A new household addition may update the count quietly; it does not demand
  attention with an urgent badge or interruption.

### Expanded state

- Uses one list in insertion order.
- Each meal shows `Added by <name>` and compact reaction avatars.
- The current person's reaction control reads **Sounds good** and is reversible.
- The contributor is treated as already supporting the meal.
- Eligible members can add another meal from browse or search without leaving
  the shared-cart context.
- Only the contributor may withdraw their own candidate; Maya may remove any
  candidate before settlement.

### Settle state

- Maya taps **Choose next meals**.
- Meal rows gain explicit selection controls; reactions and authorship remain
  visible.
- Nothing is preselected by popularity.
- Maya taps **Use these meals** to create the settled plan version.
- If a selected meal has a real diner or serving exception, only that meal asks
  for resolution before settlement completes.
- Unselected candidates remain in the shared cart by default.

## Activation

### Readiness moment

The feature activates naturally when any eligible household member taps `+` on
a meal. No tutorial, invitation, or setup step precedes the action.

### Contextual teaching

The first contribution by a non-organizer can show one quiet line in the drawer:

> Everyone in this Meal Plan can add ideas. Maya makes the final choice.

It disappears after acknowledgment and is not shown as a promotional modal.

### Natural adoption

The household has adopted the model when at least two members contribute or
react in the same cart and Maya settles meals without opening a separate family
coordination channel.

### Retention and evangelism

The cart strengthens retention if the next food cycle starts with less repeated
asking. It may support family adoption because a household member receives
immediate value—adding or supporting dinner—without learning the rest of Kwilt.

## Accepted trade-offs

- A cart may accumulate old possibilities. The learning release accepts this
  and gives Maya removal and post-settlement clearing rather than introducing
  statuses or automatic expiry.
- Positive-only reactions cannot express a hard constraint. Food needs remain
  separate, person-scoped evidence; absence of support is not interpreted.
- The organizer retains asymmetric authority. That is intentional because
  settling meals creates downstream grocery and spending work.
- Household-visible named reactions trade some response privacy for a simpler,
  more legible shared object. Only positive signals are exposed.

## Rejected trade-offs

- We reject visible negative feedback even though it could expose objections
  faster; its family-dynamic cost is too high for the initial job.
- We reject progressive `Considering` and `Next up` states even though they make
  the emerging decision clearer; they add workflow management before the cart
  metaphor is proven.
- We reject a prepared household-overlap proposal even though it may reduce
  Maya's synthesis work; it would confound the learning with algorithmic trust.

## Bet

We're betting that ordinary shared contribution plus one visible positive
reaction is enough to remove most meal-coordination work, and that Maya needs a
single bounded selection moment rather than a persistent planning workflow. If
the cart becomes noisy or Maya repeatedly asks which meals are actually likely,
we will revisit a reversible **Next up** boundary before adding algorithmic
ranking or recommendations.

## Success signal

In three real household meal cycles:

- at least two household members add or react in the same cart;
- Maya can name who contributed and what has broad support without leaving the
  drawer;
- Maya settles a realistic set without opening messages or verbally polling the
  household again;
- no participant interprets reactions as a binding vote or wonders who can make
  the final decision;
- the settled plan compiles Groceries without leaking reaction or participant
  data across the capability boundary; and
- the household reports that contribution felt easier than the prior invitation
  round, without the drawer feeling like a feed or task board.

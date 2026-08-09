# Frame: Next Meals Widget

## Status

Approved direction, intentionally deferred. Resume only after the committed
**Next meals** step has been modeled, implemented, and verified well enough to
provide one authoritative settled stack. The widget is a downstream projection
of that state and must not influence or become a workaround for unresolved plan
lifecycle semantics.

## What the user said

> We used to get a lot of meal kits. It was always nice to have the recipe sheet
> for the meals on our counter where we could see it and think, “Ooh, which of
> these delicious meals should we eat today?” The presence of the recipe sheet
> made that feel easy. We didn't need to commit to a date. As long as the
> ingredients were in the fridge and the recipe was on hand, we could easily
> make the game-time decision. I’m imagining a recipes widget that includes the
> “stack” of chosen recipes.

## Restated in user voice

When it is time to decide what to eat, Maya wants the household's already-chosen
meals to be visible, appetizing, and close at hand, so choosing tonight's meal
feels like picking from a small ready stack rather than remembering the plan,
opening an app, or rebuilding the decision.

## Target audience

`audience-aspirational-family-organizers`: households that want ordinary family
life to move with less coordination and recall work, without adopting a planning
methodology.

## Representative persona

Maya carries the household's food decisions but wants the settled plan to help
everyone notice and act on what was already chosen.

- Current situation: selected meals live behind the app's navigation and may
  remain intentionally flexible rather than attached to dates.
- What she's trying to do: make the ready choices present enough that anyone can
  answer **what sounds good tonight?** and begin.
- Emotional state or tension: she wants the appetite and ease of recipe cards on
  the counter, not a reminder that she has more planning to finish.
- What would make this feel wrong: an empty calendar, utility-list styling,
  stale or missing Recipe art, a readiness claim Kwilt cannot prove, or widget
  controls that silently change the shared plan.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the household's prior food decision
should become an easy next action at the moment it matters.

## Job flow step

`job-flow-maya-feed-household-with-less-work`:

- **Recognize whether it fits tonight** is `1/5`: Recipe information exists, but
  Kwilt has not yet made appetite, time, yield, and readiness easy to recognize.
- **Make the final call** is `2/5`: the household can settle a plan, but the
  result is not yet an ambient shared awareness surface.
- **Prepare before cooking** and **Cook one cue at a time** are each `1/5`: the
  chosen meal still needs a clear path into Recipe Home and Cook Mode.

## Active anchors

- `jtbd-carry-intentions-into-action` - the widget carries a settled food
  intention into the dinner-time decision without another planning session.
- `jtbd-invite-the-right-people-in` - the chosen stack becomes visible to the
  person using that device without exposing unrelated household information.

## Friction we're addressing

The shared cart can reduce polling and the settled plan can preserve flexible
commitment, but an invisible plan still relies on Maya to remember and announce
the choices. Meal-kit recipe cards worked because the physical cards were both
an appetite cue and a small external memory. Their stack communicated **these
are the options we already have**, while leaving the exact night open.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Kwilt already ships a native iOS WidgetKit extension with
  small, medium, large, and Lock Screen families across Activities, Focus, Chat,
  Streaks, and Money.
- Existing user flow: household members contribute to a shared cart; Maya
  settles **Next meals**; the selected meals may remain flexible, receive a
  specific occasion, or cover a repeated need.
- Existing domain/data model: Meal Planning owns the settled immutable plan
  version and Recipe snapshots; Recipes owns the durable Recipe; Groceries owns
  ingredient execution.
- Existing technical affordances: the app publishes a serialized display-safe
  snapshot through App Group `kwilt_glanceable_state_v1`, and the widget
  extension deep-links back into capability-owned app screens.
- Existing technical gap: glanceable state has no Food payload, WidgetKit has no
  Recipe widget, and the current shared JSON does not provide Recipe images.
- Existing UX convention: widgets project capability truth; they do not become
  a second source of authority or calculate competing state.

Constraints to preserve:

- The widget projects **settled Next meals**, never open cart candidates or vote
  counts.
- Flexible meals are valid; the widget must not imply that an undated meal is
  unfinished.
- The stack is food-forward: Recipe photography, title, and one useful cue beat
  planning chrome.
- Tapping a meal opens its Recipe Home or the exact **Next meals** context; it
  does not immediately start Cook Mode.
- Plan selection, timing, coverage, serving changes, Grocery compilation, and
  household signals remain in the app.
- The widget may say **In your plan** or **Next meals**. It may say **Ready** only
  when current Grocery or stock evidence genuinely supports that claim.
- App Group data must be display-safe and bounded. Any thumbnail cache needs
  explicit App Group storage, deletion, fallback, and freshness behavior.
- Adding the widget is opt-in visibility of meal names and images on that
  device; it grants no wider household or Recipe access.
- WidgetKit refresh is opportunistic. The surface needs a truthful stale or
  open-Kwilt fallback rather than implying live Realtime behavior.
- No standard action uses Kwilt green; food imagery provides the visual energy.

Constraints we may challenge:

- The present widget suite is predominantly utility and status oriented. This
  concept requires an appetite-first, editorial composition rather than rows or
  a miniature dashboard.
- A single JSON payload is sufficient for text but not necessarily for durable,
  high-quality Recipe thumbnails. A bounded shared-image cache may be justified.

Design implication:

The smallest coherent concept is an optional medium or large **Next meals**
widget that resembles a small fan or stack of physical Recipe cards. It shows a
few committed meals, preserves flexible choice, and opens the selected Recipe.
It should not be named **Recipes**, because the entire Recipe library is not the
job and Meal Planning owns which meals belong in the stack.

## Aspirational design challenge

How might we help Maya make the household's chosen meals feel ambient,
appetizing, and immediately actionable at dinner time, while preserving flexible
choice, truthful readiness, and Meal Planning's authority?

## Out of scope

Recipe-library browsing, cart voting, plan editing, date assignment, Grocery
mutation, pantry inference, automatic “cook this tonight” ranking, nutrition
display, Lock Screen meal details, Android widgets, and starting Cook Mode
without first opening the Recipe.

## Open question

Should the first widget present several tappable cards at once, or one dominant
Recipe card with the remaining stack indicated behind it?

Resolve this visual question when the exploration resumes. It is not required
for the committed-meals decision.

## Anchor assessment

`serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in]`

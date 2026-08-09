# Diverge: Shared Meal Cart

## Fixed frame

The top-right Plan count remains the persistent handle. Tapping it opens the
existing Plan drawer. Eligible household members can add meals from Meals browse
or Recipe Home. Adding records authorship and the contributor's own positive
reaction. Other members can add or remove one household-visible **Sounds good**
reaction. There are no negative reactions, rankings, winner states, or automatic
finalization.

## Axis of variation

How does the household move from an accumulating shared cart to a settled set of
next meals?

- Settle only at the end versus settle progressively.
- Preserve one undifferentiated list versus introduce a small decision boundary.
- Organizer makes every selection versus Kwilt prepares a reviewable summary.

## Direction A: One Shared Cart

The expanded drawer remains one chronological list. Each meal card shows its
image, title, `Added by Sam`, and compact named positive reactions. Everyone can
add and react. Maya can remove a candidate, but there is no second section or
commitment state while the cart is open. When she is ready, **Choose next meals**
temporarily turns the visible cards into a multi-select review. She selects the
meals the household will actually use and taps **Use these meals**. Unselected
ideas remain in the cart for later unless she clears them.

### Audience and persona fit

This asks the least of Maya and makes the shopping-cart metaphor literal. The
household can contribute without understanding a planning model, while Maya has
one bounded decision at the moment she is ready.

### Design-challenge answer

Contribution is continuous and shared; organizer authority appears only when it
is needed to settle the plan.

### System fit

- Constraint posture: bends candidate read/write authority but otherwise fits
  the existing count, drawer, candidate, authorship, and finalization concepts.
- Model change: household-readable candidates, participant-authored candidate
  insertion/removal rules, and per-person positive reactions.
- Existing choice rounds can be retired from the primary path; immutable settled
  plan versions remain.
- Blast radius: medium. The drawer and authority layer change; the grocery
  boundary remains intact.

### Kwilt model and capture-first check

This is a Meal Planning capability object, not an Arc, Goal, Activity, or
Chapter. It does not manufacture Activities or future-facing Chapters. Adding a
meal is never blocked by horizon, preference setup, or a response requirement.

### Best when / fails when

- Best when the household wants a low-ceremony place to collect a handful of
  possibilities and decide once.
- Fails when the cart becomes long-lived and crowded, or Maya wants to signal
  that some meals are already decided while contributions continue.

### Anti-pattern check

Passes. It adds no dashboard, workflow stepper, vote leaderboard, forced family
response, or productivity language. The temporary selection mode must feel like
settling dinner, not bulk-managing records.

## Direction B: Considering / Next Up

The expanded drawer has two quiet regions: **Considering** and **Next up**.
Everyone adds into Considering and can react there. Maya can move a meal to Next
up with a direct **Choose** action; this is the commitment boundary. Chosen meals
remain visible to the household, keep their authorship and reactions, and can be
moved back while the plan is still open. Once Next up contains a useful set,
Maya taps **Make groceries**. There is no separate generic finalization screen;
servings or diner exceptions are requested only on the affected meal when they
matter.

### Audience and persona fit

This gives Maya an emerging answer rather than making her wait for a final
selection moment. Household members can keep contributing while seeing which
ideas have become likely.

### Design-challenge answer

The cart supports both open participation and progressive organizer commitment
without opening a formal choice round.

### System fit

- Constraint posture: bends both household mutation authority and the current
  draft/finalized lifecycle presentation.
- Model change: candidates need a lightweight `considering` or `chosen` state,
  or the drawer must project current occasions as the chosen region while
  unsettled candidates remain separate.
- The generic Next Meals and Finalize screens can collapse into the expanded
  drawer plus contextual exception sheets.
- Blast radius: medium-high. It changes lifecycle semantics and several route
  responsibilities, but preserves Meal Planning and Grocery ownership.

### Kwilt model and capture-first check

This remains a Meal Planning capability object. It does not turn chosen meals
into Activities unless the household later schedules cooking. Capture remains
unblocked because every addition lands safely in Considering.

### Best when / fails when

- Best when meal decisions happen gradually and household members need to see
  what is becoming real.
- Fails when the two regions feel like a Kanban board, or when moving a meal to
  Next up is interpreted as an irreversible promise.

### Anti-pattern check

Passes only if the regions stay visually domestic and plain. Avoid columns,
drag-and-drop instructions, progress counts, status colors, or project-management
voice. **Next up** must remain reversible until groceries are intentionally
created.

## Direction C: Household Pulse

The expanded drawer remains a single shared list during contribution. When Maya
taps **Settle the cart**, Kwilt opens a review state within the same drawer. It
preserves the cart's order but adds a concise household summary above it, such as
**Works for everyone**, **Works for some**, and **Added recently**. Each meal
still shows named reactions and authorship. Kwilt prepares a checked starting set
from the broadest positive support and the desired meal count, but Maya can
change every selection before tapping **Use these meals**. No selection is made
or finalized in the background.

### Audience and persona fit

This helps Maya when several people have contributed enough ideas that manually
reconstructing overlap would itself become coordination work.

### Design-challenge answer

The household contributes naturally, then Kwilt reduces the organizer's final
synthesis work without taking authority.

### System fit

- Constraint posture: extends the shared cart with a deterministic summary and
  proposed selection.
- Model change: the same household candidates and reactions as Direction A,
  plus a pure summary/proposal function with explicit evidence.
- It can reuse the current aggregate concepts but should not preserve frozen
  rounds or private response submission.
- Blast radius: high for a truthful first release because proposal semantics,
  exception handling, and explanation need tests and careful copy.

### Kwilt model and capture-first check

The proposal operates on the Meal Planning object only. It creates no Goal,
Activity, or Chapter. Adding remains immediate; the prepared selection appears
only after Maya explicitly asks to settle the cart.

### Best when / fails when

- Best when households contribute many candidates and reactions and Maya wants
  help finding overlap.
- Fails when there are only three or four meals, few reactions, split household
  needs, or the prepared set appears to be an algorithmic verdict.

### Anti-pattern check

Passes only as an inspectable, editable proposal. It fails if meals are ranked,
people are scored, non-reaction is treated as dislike, the proposal is described
as a winner, or Kwilt anthropomorphically claims to know what the family wants.

## Comparison

| Direction | Household effort | Organizer clarity | System change | Main risk |
| --- | --- | --- | --- | --- |
| One Shared Cart | Lowest | Clear at final selection | Medium | Cart accumulates without an emerging decision |
| Considering / Next up | Low | Strong throughout | Medium-high | Feels like a workflow board |
| Household Pulse | Low | Strong at final review | High | Algorithmic ceremony exceeds the problem |

## Decision to make next

Choose whether the first learning release should optimize for:

1. the most literal and reductive shared-cart model;
2. an emerging decision that stays visible while the cart remains open; or
3. reducing Maya's synthesis work once household participation becomes dense.

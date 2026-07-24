# Converge: budget-reality-gate

## Qualitative Scoring

| Alternative | Persona Fit | JTBD Fit | System Fit | Blast Radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Hard Gate, Soft Voice | High | High | Medium | Medium | Best value unit: app access changes only after review. |
| Soft Check-In Before Open | Medium | Medium | High | Low | Easier, but may not change the impulse moment. |
| Runway Home Meter | Medium | Medium | High | Low | Useful support surface, not the core wedge. |
| Spend Reflection Receipt | Low | Low | Low | Medium | Too retrospective and admin-heavy for V1. |

## Capability Delta

Today, Maya cannot:

- Pair spending lanes/meters with spend-triggering apps in a way that changes access.
- Choose between intentional access and leaving the app blocked.
- Trust that a review event is the visible basis for a future unlock.

After this concept ships, Maya can:

- See the relevant live lane meter when a selected spending app is gated.
- Decide `Open for now` or `Leave blocked`.
- See recent review history explain what happened.

Still intentionally not supported:

- Bank sync.
- Auto-categorization.
- Household member permissions.
- Advanced multi-rule management.
- AI spending advice.
- Full budget planning.

## Reductive Design Pass

Smallest elegant version:

- Multiple possible meters in the model.
- One configured app-to-meter rule in the learning slice.
- One review screen.
- Two outcomes: open for now, leave blocked.
- One persisted review history.

Enhance existing feature instead of adding new surface:

- Keep the home meter and review screen.
- Make the review screen the core value unit.
- Settings can hold setup later, but should not become a budget configuration center in this slice.

Refuse to add:

- Category dashboards.
- Full multi-lane budgeting or optimization.
- Automatic transaction import.
- Advice copy like "you should not buy this."
- Streaks, penalties, compliance language, or household monitoring.

What would feel like clutter:

- Explaining every budget term.
- Asking Maya to classify transactions.
- Making her tune thresholds before she experiences the loop.

## Chosen Alternative

Choose `Hard Gate, Soft Voice`.

This is the clearest bet: Kwilt Money only becomes meaningfully different from
a budget dashboard when the spending app waits behind a calm review of the
current lane reality.

## Accepted Trade-Offs

- Accept Screen Time complexity because it is the core differentiator.
- Accept a narrow one-rule learning slice because the value unit needs to be felt before broader budgeting.
- Accept manual/fixture budget data for early learning if it keeps the review loop testable.

## Rejected Trade-Offs

- Do not ship a broad budget dashboard first.
- Do not require bank connection before validating the gate behavior.
- Do not turn the pause into a moral judgment.

## Activation Path

The right activation moment is setup for one known spending temptation:

1. Maya names a meter, such as `Takeout`, `Amazon household`, or `Amazon work`.
2. Maya maps a target app/site to that meter, such as DoorDash to `Takeout`.
3. Kwilt Money shows the rule plainly: "Show this meter before DoorDash opens."
4. The next app-open moment activates the review screen.

Education should be contextual and short. The app should teach by showing the
rule and letting the first review happen, not by explaining a budget method.

## Stated Bet

We're betting that a calm, user-owned budget review immediately before opening a
spend-triggering app will feel more useful than checking a budget dashboard
later. If that is not true, revisit by shifting the product toward a runway home
meter without Screen Time gating.

## Success Signal

Maya can describe the value in one sentence: "It makes me look at the right
meter before I open the spending app." She uses both outcomes naturally: sometimes opening
for now, sometimes leaving it blocked.

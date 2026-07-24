# Diverge: category-rollovers

Axis of variation: invisible math vs explicit setting vs prompted month-close workflow.

## Alternative A: Simple Rollover Toggle

Add a `Rollover unused amount` toggle to category budget settings. When enabled, last month's over/under amount adjusts this month's available room. Summary and detail show a compact adjustment line only when the value is non-zero.

Audience/persona fit: High. Maya gets truthful room without learning a budgeting method.

Design-challenge answer: Strong. It keeps the meter primary and makes carryover a simple category property.

System-fit note: Strong. Extends category budget settings and selected-month meter computation without adding a new surface.

Best when: the goal is a durable first slice that can be shipped and tested quickly.

Fails when: users need per-month manual adjustments or envelope transfers immediately.

Anti-pattern check: pass. Avoids dashboard and ledger behavior.

## Alternative B: Month Receipt With Carry-In/Carry-Out

Make category detail show a compact receipt row for selected months: `Rolled in`, `Budget`, `Spent`, `Rolls out`. Users can switch months to understand how one month affects the next.

Audience/persona fit: Medium-high. It is clear for users already inspecting detail, but heavier than Summary.

Design-challenge answer: Strong for trust, weaker for quick spending decisions.

System-fit note: Medium. Builds directly on selected-month detail, but requires more visible accounting language.

Best when: month-to-month explanation is the main user confusion.

Fails when: the Summary meter is wrong or unexplained; the user should not have to enter detail to trust it.

Anti-pattern check: conditional pass. Keep it as a fact row, not a financial statement.

## Alternative C: Month-Close Suggestion

At the end of a month, detect categories with meaningful under/overspend and offer a prompt: `Carry $42 into August?` The user can apply once or turn on automatic rollover.

Audience/persona fit: Medium. It teaches at the right moment but asks for a decision when the user may not be thinking about budgets.

Design-challenge answer: Partial. It helps discoverability, but it is not the core math.

System-fit note: Medium-low. Requires month-close detection, prompt timing, and durable user response state.

Best when: users do not know which categories should roll over.

Fails when: prompts feel like finance chores or the app interrupts too much.

Anti-pattern check: risk. Defer until the base setting proves useful.

## Alternative D: Manual Adjustment Entry

Let users add a rollover adjustment amount for any month, with an optional note. The app treats it as budget math and shows it alongside the monthly limit.

Audience/persona fit: Low-medium. Useful for power users, but too bookkeeping-shaped for Maya.

Design-challenge answer: Weak. It gives control but increases maintenance.

System-fit note: Medium. It can fit the model, but adds a user-maintained concept.

Best when: actual rollover values need correction because historical data is incomplete.

Fails when: users expect the app to do the math from connected transactions.

Anti-pattern check: failure for first release. Keep manual overrides out of the initial product shape.

## Alternative E: Rollover Modes Per Category

Offer mode choices: `Reset every month`, `Carry unused room`, `Carry over/under`, and maybe `Save up`.

Audience/persona fit: Medium. It is expressive, but asks the user to understand budgeting semantics.

Design-challenge answer: Medium. It can match different category types but may overfit too early.

System-fit note: Medium. Adds a policy enum that could be durable, but risks UI complexity.

Best when: different rollover semantics are proven necessary.

Fails when: the first user only needs a simple on/off behavior.

Anti-pattern check: conditional failure. Use internally as future model vocabulary, not as first-release UI.

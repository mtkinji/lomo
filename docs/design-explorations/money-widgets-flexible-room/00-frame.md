# Frame: Money Widgets for Flexible Room

## What the user said

> We need an optional widget that shows the flexible spending amount left. The existing category widgets should also be able to show the dollar amount left instead of only percent used.

## Restated in user voice

When I am about to spend or simply glance at my phone, I want Kwilt to show the one amount I can still choose to spend—or the amount left in one category—so I can stay aligned with my plan without opening the app or translating a percentage.

## Target audience

`audience-aspirational-family-organizers` — people who want household money to support ordinary life without becoming a budgeting hobby.

## Representative persona

Maya wants a calm answer near the spending moment. She may value either the whole-month flexible answer or one category boundary, but she should not have to maintain a second widget-specific financial model.

- Current situation: Her durable monthly plan and category amounts already exist in Money.
- What she is trying to do: Glance at the most useful spending boundary before acting.
- Emotional state or tension: She wants confidence without opening and interpreting a dashboard.
- What would feel wrong: Stale, contradictory, rounded, or differently calculated widget numbers; visible widget-management clutter inside Budget; or too many configuration decisions.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — keep household intentions present in ordinary moments.

## Job flow step

Step 5, `See exact whole-plan flexible money left first, with dollars left by category available as a second-order guide.` Current delivery is 3/5: the in-app answer is now implemented locally, but the unified app does not yet render a Money widget and signed-device widget delivery remains unproven.

## Active anchors

- `jtbd-review-budget-reality-before-spending` — brings the relevant boundary closer to the spending moment.
- `jtbd-put-intention-before-impulse` — makes the chosen plan glanceable before a purchase.
- `jtbd-carry-intentions-into-action` — carries the same monthly-plan truth outside the app.
- `jtbd-trust-this-app-with-my-life` — requires widget and app values to share one calculation and freshness contract.

`serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]`

## Friction we're addressing

Percent used is compact but asks the user to translate it into the practical question, “What can I still spend?” The new whole-plan answer is useful enough to deserve an optional ambient surface, while category widgets need a dollars-left presentation for people who reason in money rather than percentages.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Kwilt already has a WidgetKit extension and native widget configuration patterns for other capabilities.
- Existing user flow: Earlier standalone Money widgets selected categories through native iOS widget configuration, not through visible pin controls inside Budget.
- Existing domain/data model: `MoneyPlanLimitAnswer` now owns exact whole-plan flexible room. Category snapshots own planned, spent, and remaining amounts.
- Existing technical affordances: Money already writes display-safe App Group glanceable state and registers the `KwiltWidgets.money` reload kind.
- Current parity gap: the unified WidgetKit extension does not currently include a Money widget view, and the shared Money snapshot exposes category percent but not category dollars left or the whole-plan answer.
- Existing UX convention: widgets are glanceable, display-safe, deep-link to the existing Budget surface, and disclose freshness without transaction details.

Constraints to preserve:

- One authoritative calculation shared by Budget, plan review, and widgets.
- Widget selection and presentation live in native iOS widget configuration.
- Each widget instance is optional and independently configured.
- No transaction or merchant detail in App Group widget data.
- No new widget-management furniture inside Budget.
- Existing category widgets keep their current percent presentation unless the user changes that widget.

Constraints we may challenge:

- Percent-first should no longer be the only category presentation.
- Money widgets should not be limited to category objects; the whole managed month is now a first-class glanceable object.

Design implication:

Treat the widget as another delivery surface for existing Money answers. Add one flexible-money widget configuration and extend category widget configuration with a per-widget display choice: `Percent used` or `Dollars left`. Do not add a global preference unless repeated use proves that configuring each widget is burdensome.

## Aspirational design challenge

How might we help Maya see the exact whole-month or category spending room she cares about from her Home or Lock Screen, while preserving one trustworthy Money calculation and requiring almost no setup?

## Out of scope

- Transaction details or merchant names on widgets.
- A new in-app widget settings dashboard.
- Forecast advice, purchase approval, or notification behavior.
- Redesigning the app shell or Budget category tiles.

## Open question

For newly added category widgets, should `Dollars left` become the default presentation, while existing widget instances preserve `Percent used`?

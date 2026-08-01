# Converge: Money Widgets for Flexible Room

## Qualitative scoring

| Alternative | Maya and JTBD fit | Reduction | System fit | Data and migration risk | Decision |
| --- | --- | --- | --- | --- | --- |
| A. Two Clear Widgets | Excellent | Excellent | Strong | Low | Choose |
| B. One Adaptive Money Widget | Good | Mixed during setup | Strong | Low | Reject for first release |
| C. One Whole-Month Glance | Mixed | Weak | Moderate | Medium | Defer |
| D. Dollars-First Replacement | Mixed | Strong | Weak continuity | Medium | Reject |

## Chosen concept

Ship two native, optional WidgetKit configurations:

### Flexible Money

- Shows the exact whole-month flexible amount left.
- If the amount is negative, says the exact amount beyond flexible room.
- Shows the month and quiet freshness.
- Taps through to Budget.
- Requires no Money-specific configuration after the widget is added.

### Budget Category

- Selects one category through native iOS widget configuration.
- Selects one presentation: `Dollars left` or `Percent used`.
- Newly added widgets default to `Dollars left`.
- Existing category-widget instances preserve `Percent used`.
- Taps through to the selected category.

## Capability delta

Today, the user cannot:

- see Managed Month flexible money from an iOS widget in unified Kwilt;
- render category dollars left through the unified Kwilt widget extension;
- choose dollars or percent independently for each category widget.

After this release, the user can:

- add a zero-configuration flexible-money widget;
- add multiple category widgets with different categories and presentations;
- keep one category as percent used and another as dollars left;
- tap any Money widget into the corresponding authoritative Budget surface.

Still intentionally unsupported:

- transaction or merchant detail on widgets;
- changing the financial plan from a widget;
- global widget-presentation settings inside Kwilt;
- combined dashboards, alerts, purchase advice, and Screen Time actions;
- treating widget room as account balance or cash safe until payday.

## Before and after user stories

Before:

> I have to open Budget to see flexible money, and a percentage widget still
> makes me calculate what I can spend.

After:

> My Home Screen tells me the exact flexible amount left. For the categories I
> care about, each widget speaks in dollars or percent—whichever makes sense to
> me.

## Reductive design decisions

- Two concrete widget names replace one branching generic configuration.
- Flexible Money has no scope or display choices.
- Category selection and presentation stay in iOS widget editing.
- No pin, widget toggle, or widget-management section appears in Budget.
- No chart, category list, trend, forecast, transaction count, health score, or
  explanatory card appears in the widget.
- The central value and category tick-meter grammar remain available for the
  Category widget. In `Dollars left` mode, the center value changes while the
  perimeter continues to communicate plan consumption.
- The Flexible Money widget uses the same calm visual family but does not
  pretend the whole-month answer is a category percentage.

## Activation path

- Discovery remains native and optional through the iOS widget gallery.
- Kwilt's existing general Widgets settings/help can mention the two Money
  widgets, but Budget gains no permanent setup prompt.
- A future contextual invitation may be tested after a user completes Managed
  Month setup, but it is not part of this release.
- Natural adoption means the user adds a Money widget, leaves it in place, and
  opens Budget from it when the number prompts a closer look.

## System implications

- Extend the App Group Money snapshot with exact flexible-room state, category
  planned/spent/remaining cents, calculation state, deep links, and freshness.
- Never copy transaction rows or merchant details into widget storage.
- Add two WidgetKit configurations under the current Kwilt widget extension.
- Add native AppIntent category entities and a category presentation enum.
- Use the existing `KwiltWidgets.money` reload contract or split it only if
  WidgetKit requires distinct timeline kinds; keep reload registration exact.
- Preserve the app's Money privacy-lock behavior: when widget Money data is
  disabled, both widgets render a neutral open-Kwilt state rather than cached
  financial values.

## Accepted trade-offs

- The widget gallery gains two Money entries instead of one.
- Users who want both dollars and percent for one category add two instances.
- A category widget still requires two deliberate configuration choices.

## Rejected trade-offs

- We will not reduce gallery entries by making setup more abstract.
- We will not expose every Money fact in one medium widget.
- We will not replace percentages for existing users.
- We will not add an in-app global setting merely to avoid native per-widget
  configuration.

## Stated bet

We're betting that users understand and retain two concrete widget jobs better
than one configurable Money container, and that dollars left will be the more
useful default for newly added category widgets. If this is not true, we will
revisit the category default or consolidate the gallery entries without
changing the underlying Money snapshot contract.

## Success signal

In realistic use, Maya can add either widget without instruction, correctly
explain the number in her own words, see the same number after opening Budget,
and change a category widget between dollars and percent through native widget
editing without hunting through Kwilt settings.

# Yes-And: Money Widgets for Flexible Room

## Decision

Skip broad expansion and run the loop with the approved frame.

## Why this stays bounded

This work introduces a new delivery surface, but the underlying jobs and Money
answers are already defined:

- whole-month flexible money left is the primary answer;
- category dollars left is a second-order guide;
- percent used remains an optional presentation for people who prefer it;
- native iOS widget configuration owns selection and presentation;
- Budget remains the authoritative place to understand or change the plan.

Expanding this release into alerts, purchase advice, Chat, Screen Time actions,
transaction review, or an in-app widget manager would make it harder to learn
whether the two glanceable answers are useful on their own.

## Job elevation

The feature is larger than “add another number to a widget.” It carries the
Managed Month answer from an app-open experience into an ambient spending
moment. The elevated job is:

> Keep the most relevant spending boundary visible without requiring me to
> remember to open Budget or translate a percentage.

## Frame recommendation

Run the loop with the original approved frame. Divergence should explore how
the two answers are organized and configured in WidgetKit, not broaden which
Money jobs the widget attempts to solve.

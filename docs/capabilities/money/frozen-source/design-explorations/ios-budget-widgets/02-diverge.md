# Diverge: ios-budget-widgets

## Axis Of Variation

Ambient glance versus action surface: how much should the widget do beyond showing the budget reality?

## Alternative 1: Single Lane Percent Widget

A small or medium widget shows one selected budget lane with percent used, dollars remaining, pace state, and freshness. Tapping opens the budget detail or review surface.

Audience/persona fit: High. Maya gets the aispendtracker-style benefit: one number visible without a dashboard habit.

Design-challenge answer: Keeps one important budget visible before spending moments while preserving a calm, minimal surface.

System-fit note: Strong. Reuses `BudgetLane` and `BudgetMeter`; requires a widget extension and a tiny shared snapshot payload.

Best when: The user has one lane that consistently drives spending drift, such as takeout or household extras.

Fails when: The user expects the widget to replace budget setup, correction, or transaction review.

Anti-pattern check: Pass. It avoids productivity-app voice and avoids a dashboard for its own sake.

## Alternative 2: Pinned Lanes Stack Widget

A medium or large widget shows two or three pinned lanes in compact rows: name, percent used, pace dot, and remaining amount. Tapping a row opens that lane.

Audience/persona fit: Medium-high. Useful for household organizers, but risks becoming a tiny finance dashboard.

Design-challenge answer: Helps Maya scan several resources at once, but reduces the purity of the one-number behavioral cue.

System-fit note: Medium. Reuses budget rows conceptually, but needs widget configuration, row deep links, and stricter layout rules.

Best when: Several lanes matter every week and the user already trusts the app's matching.

Fails when: The widget becomes cramped, visually noisy, or starts asking the user to manage categories from the home screen.

Anti-pattern check: Conditional pass. Keep it to pinned lanes only, with no scrolling, no transaction list, and no setup copy.

## Alternative 3: Lock Screen Pace Signal

A lock-screen widget shows only one compact cue: `Takeout 42%`, `On pace`, or `Hot`. It favors repeated ambient exposure over detail.

Audience/persona fit: Medium. Strong for visibility, but the lock screen has less room to explain state or freshness.

Design-challenge answer: Puts the budget closer to phone-opening moments, which may precede app impulses.

System-fit note: Medium. Same snapshot model, but copy and layout must be more constrained.

Best when: The user wants a frictionless nudge before unlocking into spending apps.

Fails when: Percent alone is ambiguous or stale data undermines trust.

Anti-pattern check: Pass if it remains a signal; failure if it tries to carry detail it cannot fit.

## Alternative 4: Widget As Gate Preview

The widget previews the budget gate state: `Amazon waits behind Household extras · 34% used`. Tapping opens the review surface.

Audience/persona fit: Medium. It ties directly to the Screen Time gate wedge, but may be premature before native gating is reliable.

Design-challenge answer: Makes the selected rule visible and understandable outside the app.

System-fit note: Medium-low for now. It depends on app-control mapping being real enough to avoid confusing promise copy.

Best when: A user has configured one app-to-budget rule and wants confidence that the rule is active.

Fails when: The widget advertises a gate that is not actually enforced.

Anti-pattern check: Conditional pass. It must not become compliance language or imply monitoring.

## Alternative 5: Daily Safe-To-Spend Tile

The widget translates the lane into a daily amount: `Takeout: $18/day left this week`. Percent used sits below the headline.

Audience/persona fit: Medium. It may be more actionable for some users, but it moves away from the proven percent-counter insight.

Design-challenge answer: Converts pace into a concrete spending cue.

System-fit note: Medium. Requires clearer period math and copy risk around precision.

Best when: The budget period and spend cadence are simple.

Fails when: The daily amount feels fake, brittle, or like advice.

Anti-pattern check: Risky. It can become a budgeting-method feature instead of a calm meter.

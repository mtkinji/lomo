# Converge: ios-budget-widgets

## Qualitative Scoring

| Alternative | Persona Fit | JTBD Fit | System Fit | Blast Radius | Notes |
| --- | --- | --- | --- | --- | --- |
| Single Lane Percent Widget | High | High | High | Medium | Core visual grammar for one lane. |
| Pinned Lanes Stack Widget | High | High | Medium | Medium | Necessary because the app already has multiple custom budget categories. |
| Lock Screen Pace Signal | High | High | Medium | Medium | Necessary because the spending impulse often starts before app launch. |
| Widget As Gate Preview | High | High | Medium | Medium-high | Necessary because app controls and Screen Time are part of the trust loop. |
| Daily Safe-To-Spend Tile | Medium | Medium | Medium | Medium | Actionable, but less faithful to the percent-counter insight. |

## Capability Delta

Today, Maya cannot:

- See a budget lane's percent used without opening Kwilt Money.
- Keep a budget meter visible in the same passive way aispendtracker keeps AI spend visible.
- Use the phone home screen as a low-friction budget-reality cue.

After this concept ships, Maya can:

- Pin multiple important budget lanes as iOS widgets.
- See `% used`, remaining amount, pace state, and freshness at a glance.
- Use a Lock Screen glance before opening spend-triggering apps.
- Use widget actions for the lightest useful budget-control actions.
- Trust the widget because it is fed by reliable Plaid sync and app-control state.
- Tap the widget into the relevant budget lane, review surface, or app-control rule.

Still intentionally not supported:

- Widget transaction review.
- Household member widgets.
- AI advice in the widget.
- Desktop menu-bar support.

## Reductive Design Pass

Smallest elegant version:

- One clock-inspired visual grammar reused across Home Screen and Lock Screen widgets.
- Multiple selected lanes, with one widget instance per lane and a pinned-lanes stack option.
- One dominant percent number per lane.
- One perimeter tick ring per lane.
- One pace/freshness cue per lane.
- One interactive action that supports the budget loop without turning the widget into the app.
- One tap/deep-link path into lane detail, review, or app-control state.

Enhance existing feature instead of adding a new concept:

- The widget is another presentation of the existing `BudgetMeter`, not a new budget object.
- The app remains where the user configures lanes, connections, and corrections.
- Widget selection should be a thin `Show on widget` or `Pin lane` choice, not a separate widget management center.
- App-control and Screen Time state should flow into widget snapshots only after the rule is real enough to trust.

Refuse to add:

- Transaction rows.
- Advice copy.
- A color-coded panic meter.
- Copy that says or implies the number is live when it is timeline-refreshed.
- Desktop menu-bar work in the first test.

What would feel like clutter:

- Showing every budget.
- Explaining what a budget is inside the widget.
- Asking the user to interpret sync mechanics.
- Putting raw transactions or account numbers into widgets.
- Turning the home screen into a financial dashboard.

## Chosen Alternative

Choose an `Integrated Budget Widget System`, with the `Single Lane Percent Widget` as the core tile.

The original one-lane widget is the right visual unit, but the first test should not stop there. Kwilt Money is already close to the larger loop: custom budget categories, linked transactions, accounts, app controls, and a Screen Time review surface. The first useful test should validate whether the ambient meter works when it is trustworthy, actionable, and present in the places where spending decisions happen.

The visual form should borrow from the modern iOS clock widget: a rounded square, one large center value, tiny lane identity, and perimeter ticks that encode current percent consumed. This keeps the widget fun and glanceable without adding dashboard chrome.

## Accepted Trade-Offs

- Accept native iOS widget work because the ambient surface is the point.
- Accept multiple lane widgets because the product promise is custom budget categories, not one hard-coded meter.
- Accept Lock Screen widgets because the point is to appear before the spending impulse.
- Accept interactive widgets because app controls and review intent are part of the loop.
- Accept live background sync and full Plaid reliability because stale or unreliable meter data invalidates the test.
- Accept Screen Time/app-control integration because a widget that shows gate state must match reality.
- Accept a more expressive widget form because the clock-like tick border can carry state without more text.
- Accept WidgetKit refresh limits and design around freshness instead of pretending continuous updates.
- Accept that the widget is a companion to the app, not the place where setup happens.

## Rejected Trade-Offs

- Do not make a mini dashboard.
- Do not wait for the unified desktop app to test the ambient-meter hypothesis.
- Do not ship widget state that is disconnected from Plaid sync health or app-control truth.
- Do not make the widget a transaction ledger.
- Do not defer Lock Screen, multi-lane, interactive widget, background sync, Plaid reliability, or app-control work out of the first real test.

## System Implications

- Add a native iOS WidgetKit extension when implementing.
- Create a small shared widget snapshot model derived from `BudgetMeter`.
- Represent percent consumed as active perimeter ticks around the tile.
- Support Home Screen medium/small widgets and Lock Screen accessory widgets.
- Support multiple budget lanes through widget configuration or pinned-lane snapshots.
- Add AppIntents for approved lightweight interactions such as `Review budget`, `Open for now`, or `Leave blocked`.
- Persist lane snapshots in an App Group container the widget extension can read.
- Back snapshots with reliable Plaid sync: transaction webhooks, cursor-based `/transactions/sync`, server-side recomputation, and widget reload triggers.
- Connect app-control/Screen Time state so widget state reflects whether a spending app is waiting behind a budget review.
- Add deep links such as `kwilt-budget://budgets/<budgetId>` or `kwilt-budget://review?budgetId=<budgetId>`.
- Keep all sensitive transaction detail out of widget storage; store only display-safe summary state.

## Activation Path

The right activation moment is after the user has one budget lane with a meaningful meter:

1. The lane detail or home row offers `Add to Home Screen`.
2. The app previews the exact widget state: percent, remaining, pace, freshness.
3. The user can add Home Screen and Lock Screen widgets for one or more lanes.
4. The widget becomes the ambient glance surface.
5. If a connected app is gated, the widget can show that state and offer the lightest valid review action.
6. Tapping it returns to the relevant lane, review, or app-control surface when the number needs context.

Education should be almost unnecessary. The app can say: `Keep this meter where you'll see it.`

## Stated Bet

We're betting that trustworthy ambient budget meters, visible on the Home Screen and Lock Screen and connected to real transaction sync plus app controls, will reduce accidental spending drift because budget reality appears before the spending impulse. If that is not true, revisit by reducing the widget system back to in-app review gates and richer lane detail rather than expanding desktop surfaces.

## Success Signal

The user can describe the value as: "I saw the percent before I spent, and the controls matched what actually happened." In self-use or testing, widgets are glanced at without deliberate budget-checking, the data stays trusted, and at least some spending decisions are paused, delayed, changed, or intentionally unlocked because the number and control state were already visible.

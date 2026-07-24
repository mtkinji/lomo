# Learning Release: ios-budget-widgets

## Concept To Build

Kwilt Money lets the user pin budget lanes as iOS Home Screen and Lock Screen widgets that show percent used as a large value, use perimeter ticks to show consumed share, and connect to live transaction sync plus app-control state.

## Capability Delta

Today, the user cannot:

- Keep a Kwilt Money meter visible outside the app.
- Use the home screen as an ambient spending cue.
- See budget state on the Lock Screen before opening spend-triggering apps.
- Trust that widget state reflects current Plaid-backed budget meters.
- Use widget interactions for lightweight budget-review/app-control actions.
- Tap from a budget glance directly into the relevant lane.

After this release, the user can:

- Select multiple budget lanes as widget lanes.
- Add Home Screen widgets for those lanes.
- Add Lock Screen widgets for the most important lane states.
- See a calm percent-first budget meter outside the app, with border ticks that make the consumed share visible.
- See freshness and app-control state without opening the app.
- Take a lightweight widget action when a lane/app-control rule needs review.
- Tap the widget into the lane detail or review surface.

Still intentionally not supported:

- Widget-based transaction review.
- Desktop menu-bar support.

## User Experience

The user encounters this after viewing or creating meaningful budget lanes and connecting at least one financial account.

Happy path:

1. User connects a financial account and creates or confirms several budget lanes, such as `Shopping`, `Groceries`, and `Restaurants`.
2. Kwilt syncs Plaid transactions reliably, recomputes lane meters, and records sync freshness.
3. User pins one or more lanes for widgets.
4. Kwilt writes display-safe widget snapshots for those lanes.
5. User adds Home Screen widgets and a Lock Screen widget.
6. Widgets show lane icon/name, large percent used, perimeter progress ticks, pace/freshness, and app-control state when relevant.
7. If a spending app is tied to a lane, the widget can route to review or perform a lightweight AppIntent action that matches the Screen Time/app-control rule.
8. Tapping the widget opens the selected lane, review, or app-control surface in Kwilt Money.

Example widget copy:

```text
      42%
   Takeout
On pace · Updated 8:34 AM
```

## Existing Product Relationship

This enhances the existing budget meter and runway direction. It does not replace home, budget detail, transaction matching, or app-gate review. The widget is an ambient presentation of the same meter truth, and the first test only counts if that truth is backed by real sync, reliable lane assignment, and real app-control/Screen Time state.

## Buildable Slice

Must be real:

- A widget snapshot type derived from `BudgetMeter`.
- Multiple selected widget lanes.
- Native iOS WidgetKit extension.
- Shared storage readable by the widget extension.
- Medium/small Home Screen widget layouts using central percent plus perimeter ticks.
- Lock Screen accessory layouts for the highest-priority lane.
- AppIntent-powered widget interactions for review/app-control actions.
- Reliable Plaid transaction sync: Link, token exchange, cursor sync, webhooks, update/error handling, and server-side meter recomputation.
- Live background freshness path: server-driven updates plus iOS background refresh where useful.
- App-control and Screen Time state reflected in widget snapshots.
- Deep link from widget to the selected lane.
- Freshness copy that reflects when the snapshot was generated.

Can be thin or temporary:

- The first interactive action can be one narrow review/open/leave-blocked action.
- Lock Screen can start with one selected lane before supporting all lane configurations.
- Styling can be limited to the clock-inspired tile grammar.

Intentionally excluded:

- Transaction details in widget storage.
- Financial advice.
- Desktop menu-bar app.

## Release Channel

Start with `Local build`, then move to `TestFlight build`.

Rationale: WidgetKit, Lock Screen widgets, AppIntents, Plaid sync, and Screen Time behavior all need to be tested as an installed app experience. The first learning is Andrew/self-use: does the visible percent, when backed by trusted data and real controls, actually shape spending decisions the way aispendtracker did?

## Brand-Goodwill Guardrails

- Never imply real-time updates.
- Show freshness in plain language.
- Do not store transaction rows or merchant details in widget shared storage.
- Use calm labels: `on pace`, `watch`, `running hot`, `maxed out`.
- Avoid red/green trading psychology.
- Make removing or changing the widget lane obvious in the app.
- Keep Lock Screen content display-safe.
- Make app-control actions reversible and visible in the app.

## Reversibility

The release can be hidden by removing widget-pinning affordances and disabling AppIntent actions. Widget snapshots are summaries and can be cleared without changing budget or transaction data. Deep links should fall back to app home if the selected lane no longer exists. App-control rules must remain removable from the app, and Screen Time access must not depend solely on widget state.

## Permanent Product Threshold

Promote this into accepted product capability when:

- Home Screen and Lock Screen widgets are installed and kept during self-use.
- The percent/freshness display is trusted because Plaid sync and app-control state match the app.
- The user can recall moments where widgets changed, delayed, or intentionally unlocked a spending action.
- Interactive widget actions behave predictably and do not bypass the user's chosen rules.
- The widget system does not create a feeling of surveillance, shame, or finance-dashboard chore.

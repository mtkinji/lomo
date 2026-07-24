# iOS Budget Widget System First Test

## Goal

Build the first real Kwilt Money widget test as an integrated iOS surface: Home Screen widgets, Lock Screen widgets, multiple budget lanes, interactive review/app-control actions, reliable Plaid-backed freshness, and Screen Time/app-control state.

The desktop menu-bar surface is deferred. The rest is part of the first meaningful test because the widget only proves the insight if it is visible, trusted, and actionable.

## Product Bet

The aispendtracker insight was not just "show a number." It was "show the right number close enough to the behavior that it changes what I do."

For Kwilt Money, the first test is:

> If custom budget lanes are visible on the Home Screen and Lock Screen, stay current from linked transactions, and connect to the app-control loop, then the user will notice budget reality before spending and make more intentional choices.

## Non-Negotiables For First Test

- Home Screen widget with clock-inspired central percent and perimeter ticks.
- Lock Screen widget for a selected budget lane.
- Multiple budget lanes can be pinned to widgets.
- Interactive widget action for the app-control/review loop.
- Plaid-backed meter reliability: Link, token exchange, cursor sync, webhooks, error/update states.
- Background freshness path: server-triggered sync plus iOS background refresh where useful.
- Widget state reflects app-control and Screen Time rule state.
- Widget storage contains display-safe summary snapshots only.

## Deferred

- Desktop menu-bar app.
- Household/member widgets.
- Transaction review inside widgets.
- AI advice inside widgets.
- Broad dashboard widgets that show every category by default.

## Build Sequence

### 1. Widget Snapshot Contract

Create a display-safe snapshot model:

- `budgetId`
- `name`
- `icon`
- `accentColor`
- `percentUsed`
- `spentLabel`
- `remainingLabel`
- `paceLabel`
- `status`
- `updatedAt`
- `syncState`
- `appControlState`
- `screenTimeState`
- `deepLink`
- `availableWidgetActions`

Acceptance:

- Snapshot is derived from `BudgetMeter` and app-control state.
- Snapshot excludes transactions, merchant names, account masks, and raw Plaid payloads.
- Missing or stale data has explicit fallback state.

### 2. Multi-Lane Pinning

Add lane-level widget pinning:

- Budget detail: `Pin widget`
- Budget list: a quiet pin affordance or detail-only first
- Settings/account screen: optional summary of pinned lanes

Acceptance:

- Multiple lanes can be selected.
- One lane can be marked as Lock Screen primary.
- Removing a lane clears its widget snapshot safely.

### 3. Shared Native Storage

Add App Group storage for widget snapshots.

Acceptance:

- App writes snapshots.
- Widget extension reads snapshots.
- Snapshots survive app relaunch.
- Deleted/invalid lane ids fall back safely.

### 4. Home Screen WidgetKit Extension

Implement supported Home Screen widgets:

- Medium: clock-inspired percent tile with perimeter ticks.
- Small: compact percent tile if layout holds.
- Optional pinned-lanes stack if medium layout can remain calm.

Acceptance:

- Active tick count reflects percent consumed.
- State color reflects under pace / watch / running hot / maxed.
- Freshness is visible or reachable.
- Tap opens the relevant lane or review surface.

### 5. Lock Screen Widget

Implement Lock Screen accessory widget:

- Primary lane percent.
- Display-safe state only.
- No account or transaction detail.

Acceptance:

- Renders on Lock Screen.
- Avoids sensitive details while locked.
- Deep-links to lane/review after unlock.

### 6. Interactive Widget Action

Add one AppIntent-powered action.

Recommended first action:

- `Review budget` if the lane is tied to an app-control rule.

Possible follow-up actions:

- `Open for now`
- `Leave blocked`

Acceptance:

- Action updates the same review/app-control model used by the app.
- Action cannot bypass disabled or missing Screen Time authorization.
- Action result is visible in the app.
- Widget reloads after action.

### 7. Plaid Reliability

Make the meter source trustworthy:

- Plaid Link/token exchange.
- Cursor-based transaction sync.
- Transaction webhooks.
- Item/error webhooks.
- Server-side recomputation of budget meters.
- Suggested/confirmed assignment handling.
- Sync health and last-updated state.

Acceptance:

- New Plaid transaction data updates budget meter snapshots.
- Webhook-driven sync advances cursor safely.
- Error states show `Needs sync` or `Reconnect` instead of stale confidence.
- No Plaid secrets or raw transaction details enter widget storage.

### 8. Background Freshness

Use server-side sync as primary freshness and iOS background refresh as a supporting path.

Acceptance:

- App can refresh snapshots when opened.
- Server/webhook changes can trigger snapshot refresh path.
- iOS background refresh can opportunistically update widget snapshots.
- Copy never claims real-time updates.

### 9. App-Control / Screen Time Tie-In

Connect widgets to the app-control state:

- Lane has app-control rule.
- Rule knows target app/site.
- Review/open/leave-blocked outcome is recorded.
- Widget reflects whether the app is normal, waiting for review, hot, maxed, or unavailable.

Acceptance:

- Widget state matches app detail/review state.
- Screen Time authorization missing state is represented honestly.
- User can remove or change the rule from the app.

## Verification

- `npm run lint`
- iOS build installs on simulator/device.
- Home Screen widgets render real lane snapshots.
- Lock Screen widget renders display-safe lane snapshot.
- Widget tap deep-links to correct route.
- AppIntent action records/updates review state.
- Plaid webhook/sync path updates meter and widget snapshot.
- Background refresh path does not overpromise freshness.
- Manual screenshot pass for small, medium, and Lock Screen layouts.

## First Test Readout

Run for at least two weeks of Andrew/self-use.

Capture:

- Did Home Screen or Lock Screen visibility change a spending decision?
- Which lanes stayed pinned?
- Did the widget feel trusted?
- Did interactive review controls help or feel risky?
- Did Plaid freshness ever feel misleading?
- Did app-control state match the widget every time?

Proceed if the widgets stay installed, data is trusted, and visible meter/app-control state changes at least three spending decisions.

# Diverge: Activity Place Context

## Axis Of Variation

The meaningful axis is how strongly the UI separates a Place relationship from an Alert behavior: one control with an off state, progressive layers in one sheet, or separate Activity rows.

All alternatives touch only the Activity object, preserve capture-first behavior, and reject background tracking or notifications by default.

## Alternative A: Add “No notification”

Keep the current sentence builder but add `No notification` to the enter/leave menu. When selected, hide or disable Boundary radius and save the location without `trigger` or `radiusM`.

Audience/persona fit: medium. Maya can accomplish the job, but the sheet still frames Place as a kind of notification rule.

Design-challenge answer: functionally solves the forced-alert problem with the smallest code change.

System-fit note: excellent; it mostly widens the draft trigger type to include `none`.

Best when: speed is the only consideration.

Fails when: users continue to believe adding a location is fundamentally about alerts.

Primer anti-pattern check: pass, but the hierarchy remains conceptually backward.

## Alternative B: Place First, Optional Alert

Keep one Location sheet, but make the place picker/map the primary action. Below it, show an optional `Alert` row with `Off` as the default. Choosing `When I arrive` or `When I leave` reveals Boundary radius. Save always saves the Place; it saves trigger/radius only when Alert is enabled.

Audience/persona fit: strong. Maya can say “this belongs here” without making another decision, while the more proactive behavior remains nearby and understandable.

Design-challenge answer: cleanly separates relevance from interruption without adding navigation or a new object.

System-fit note: strong. The current domain type already makes `trigger` optional, and the existing sheet contains all required affordances.

Best when: the product wants the mental model to be correct as well as the capability.

Fails when: alert controls remain visually dominant or saving a place still requests background permission.

Primer anti-pattern check: pass. It is reductive, calm, Activity-first, and explicit.

## Alternative C: Separate Place And Alert Rows

Activity Detail gains two rows: `Place` and `Location alert`. The Place row opens a map/search/current-location picker; Location alert stays disabled until a Place exists and opens a smaller enter/leave/radius sheet.

Audience/persona fit: strong for comprehension, but heavier for a simple Activity detail surface.

Design-challenge answer: creates the clearest conceptual separation.

System-fit note: medium. It adds another persistent row, another sheet state, and more navigation between closely related values.

Best when: alerts become important enough to deserve a first-class Activity control.

Fails when: most users only want a Place and the extra row becomes permanent clutter.

Primer anti-pattern check: pass, but it risks adding UI for a secondary behavior.

## Alternative D: Context-Only Quick Action

Add a fast `Use where I am` action directly in Activity Detail or Quick Add. It saves the current point as Place context with no alert. The existing Location sheet remains notification-oriented for advanced behavior.

Audience/persona fit: strong at the exact capture moment.

Design-challenge answer: makes the frequent behavior extremely fast.

System-fit note: medium. It introduces two entry points with different semantics and leaves the underlying Location sheet misleading.

Best when: self-use proves current-location attachment is much more common than place search or alert setup.

Fails when: users cannot inspect or understand what the shortcut saved.

Primer anti-pattern check: pass if it remains optional, but the split mental model is a trust risk.

## Divergence Takeaway

Alternative A is the smallest patch, C is the clearest but heaviest, and D is the fastest frequent action but leaves conceptual debt. Alternative B is the best reductive fit: one existing sheet, one primary Place contract, and alert controls disclosed only when requested.

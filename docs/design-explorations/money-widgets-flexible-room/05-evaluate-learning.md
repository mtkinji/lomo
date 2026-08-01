# Evaluate Learning: Money Widgets for Flexible Room

## Learning questions

1. Does Flexible Money communicate the Managed Month answer correctly without
   requiring the user to open Kwilt or remember the 70% model?
2. Do people understand `Dollars left` and `Percent used` as two presentations
   of the same category plan rather than different calculations?
3. Is two concrete widget types simpler to find and configure than one generic
   Money widget would be?
4. Is `Dollars left` the right default for newly added category widgets?
5. Do exact values, over states, and quiet freshness remain readable in the
   small widget family with realistic category names and Dynamic Type behavior?
6. Do WidgetKit refresh limits create enough lag to undermine trust?
7. Do privacy-off, stale, missing-plan, removed-category, and App Group failure
   states protect trust without creating a new user decision?
8. Do users keep the widgets and use their deep links, or remove them after the
   novelty fades?

## Evidence that supports the bet

- Andrew and test users can add the intended widget from its gallery name
  without instructions.
- A user can explain the dominant number in plain language after one glance.
- Flexible Money and Budget show the same exact amount and state for the same
  snapshot.
- A category widget and category detail show the same planned, spent,
  remaining, and percent facts.
- Users can edit a category widget, select a category, and switch dollars versus
  percent through native widget configuration without hunting inside Kwilt.
- Existing percentage configurations remain percentage configurations after
  update.
- Users leave at least one Money widget installed through repeated ordinary use.
- Widget taps open the expected current Budget or category surface.
- Privacy-off and missing-plan states expose no prior financial value.

## Disconfirming signals

- Users mistake flexible money for account balance or cash safe until payday.
- Users cannot distinguish Flexible Money from Budget Category in the gallery.
- Users repeatedly search inside Budget for widget settings.
- Dollars-left category widgets are interpreted as whole-month flexible money.
- Widget and app values visibly diverge after an ordinary sync or relaunch.
- Stale values look current or freshness copy crowds out the answer.
- Category names or exact over amounts do not fit reliably in `systemSmall`.
- Users prefer percent often enough that dollars-left default creates extra
  configuration work.
- Privacy-disabled widgets retain or briefly flash cached financial values.
- The implementation requires a parallel financial calculation in Swift.

## Instrumentation and observation

Use the minimum evidence needed:

- existing widget-open attribution with widget kind and destination;
- privacy-safe local diagnostic events for snapshot-written, timeline-reloaded,
  decode-failed, and deep-link-fallback states;
- no dollar amounts, category names, merchant data, account data, or plan values
  in analytics;
- manual simulator checklist with screenshots for every required state;
- direct user observation: ask the user what the number means and where they
  would go to change it;
- a short self-use log recording widget/app parity, visible freshness, and
  whether opening Budget was still necessary to recover the same answer.

Do not track Home Screen layout, widget location, transaction detail, merchant
behavior, or inferred purchase intent.

## Decision rule

Proceed toward permanent and TestFlight-capable implementation when:

- every required state passes native simulator verification;
- the two normal widgets match the app exactly across refresh and relaunch;
- configuration and deep links work without an in-app settings workaround;
- at least three observed users correctly explain their selected widget on the
  first attempt; and
- no privacy-value retention or misleading-cash interpretation is observed.

Revise when:

- gallery distinction or configuration is unclear: test one adaptive widget;
- dollars default is consistently changed back: restore percent as default;
- small exact values do not fit: adjust value formatting before adding a larger
  family;
- refresh lag undermines trust: improve refresh/freshness behavior before
  expanding families.

Retire or defer when:

- widget/app parity cannot be maintained within honest freshness bounds;
- privacy behavior cannot reliably remove cached values; or
- users do not retain or use the widgets after the initial test.

## Expected next action

If the local learning release passes, build and verify the same widget extension
through the established `production-widgets` TestFlight lane. Medium and Lock
Screen Money widgets remain separate decisions informed by first-release use.

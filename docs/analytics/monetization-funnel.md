# Kwilt Pro upgrade funnel

This funnel measures whether people discover a relevant reason to upgrade,
reach plan choice, complete a purchase, and return to the work that motivated
the upgrade. It serves Nina's need to trust Kwilt with important parts of her
life without turning private household context into analytics.

## Core funnels

### Permanent invitation

Use this for Settings and More, where a person is exploring Kwilt Pro without
an interrupted feature action.

1. `upgrade_entry_viewed`
2. `upgrade_entry_tapped`
3. `purchase_started`
4. `purchase_succeeded`

Break down the first two events by `source`. Break down purchase events by
`upgrade_entry_source`. The values should identify only the bounded app surface,
such as `settings_home` or `more`.

### Contextual upgrade and return

Use this for a Pro action interrupted by a paywall.

1. `paywall_viewed`
2. `paywall_upgrade_cta_tapped`
3. `purchase_started`
4. `purchase_succeeded`
5. `upgrade_intent_resumed`

Break down paywall events by `reason` and `source`; purchase events by
`paywall_reason` and `paywall_source`; and the return event by `kind` and
`source`. A successful restore can also produce `upgrade_intent_resumed` even
though it does not belong in a purchase-conversion funnel.

`upgrade_intent_resumed` means Kwilt returned the person to the preserved next
step. It does not mean the person connected an account, changed Screen Time, or
completed any other provider/native action. Those actions still require a new
explicit tap.

## Dashboard

Create these PostHog insights for production builds:

- Permanent invitation conversion: the four-step permanent funnel, 7-day
  conversion window, broken down by entry source and app version.
- Contextual conversion: the five-step contextual funnel, 7-day conversion
  window, broken down by paywall reason and app version.
- Plan-choice abandonment: `purchase_started` without `purchase_succeeded` or
  `purchase_failed` within one hour, separated from Apple purchase cancellation
  when that outcome is available.
- Return reliability: `purchase_succeeded` or `restore_succeeded` followed by
  `upgrade_intent_resumed` within 30 minutes for contextual entries only.
- Failure health: `purchase_failed` and `restore_failed`, broken down only by
  bounded error code, store, app version, and environment.

Exclude development builds from product conversion reporting. Keep Simulator,
signed-device Sandbox, TestFlight, and Production evidence separate.

## Privacy and QA contract

Allowed dimensions are bounded enums and technical context: source, reason,
intent kind, selected product identifier, store, environment, app version, and
safe error code. Never capture account or institution names, balances,
transactions, child/member identifiers, selected apps, rule details, draft
content, household content, Apple account details, or free-form provider errors.

Before trusting a dashboard release:

1. Confirm all attribution fields survive `sanitizeAnalyticsProps`.
2. Exercise Settings, More, Money, and personal Screen Time entry paths.
3. Confirm dismissal emits no purchase success or resume event.
4. Confirm a contextual successful purchase or restore emits one resume event
   and no provider/native action starts automatically.
5. Confirm direct Settings or More purchase emits no resume event.
6. Compare client purchase success with RevenueCat events and the Supabase
   subscription projection; investigate mismatches rather than treating client
   analytics as entitlement truth.

The repository defines this event contract, but the PostHog dashboard must be
created and checked in the live project by an operator with PostHog access.

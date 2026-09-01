# Monetization release readiness — learning release

## Release shape

Use an internal/Sandbox lifecycle pass, then a bounded TestFlight cohort, before the public App Store release. Do not enable destructive provider cleanup or advertise a paid pillar merely because its source tests pass.

## What must be learned

1. Do people understand why the contextual boundary appeared?
2. Does the live offer show the correct localized price, cadence, and introductory eligibility?
3. Does the normal `pro` entitlement unlock every promised capability during trial and paid periods?
4. Does the Money setup moment present the live one-month full-Pro trial to an
   eligible account before Plaid or active budgeting begins, without implying
   that Kwilt collects a card?
5. Do cancellation, billing issue, grace, expiration, refund, restore, and resubscribe produce the intended access state?
6. Do Free users retain every promised core workflow after the old gates are removed?
7. Can any deep link, Chat action, MCP call, background job, or direct server request bypass Pro?
8. Does confirmed expiration stop Money sync and active editing without deleting or hiding imported history?
9. Are paywall conversion and provider costs attributable to the originating paid intent?
10. Can a Free person discover Pro Screen Time naturally while completing basic
   rules, preview the specific advanced outcome, purchase, and return without
   losing work?
11. At confirmed expiration/refund, do all advanced and family rules enter a
    readable inactive state while every affected device progresses from
    **Deactivation pending** to an acknowledged release?
12. Does Restore or resubscribe require deliberate rule review rather than
    silently restoring restrictions?
13. Do Cook Mode and Live Conversation work for Free and Pro without a paywall
    while enabled, stay within authenticated cost safeguards, remain outside
    subscription/creator claims, and disappear safely when their flags turn
    off?

## Exposure controls

- Keep backend schema changes additive until reconciliation is proven.
- Keep automatic Plaid disconnection disabled until RevenueCat, the mirror, client state, and cleanup receipts agree.
- Maintain a server-controlled capability exposure switch for any paid pillar that cannot meet its launch evidence gate.
- Keep independent Cook/Conversation preview flags enforced at both customer
  entry and provider-session creation; their default-on state does not weaken
  the server kill switch.
- Keep restore purchases, subscription management, data reading/export, and safety-reducing actions available regardless of exposure state.

## Test cohort

- fresh Apple account eligible for an introductory offer;
- account ineligible because the subscription group offer was previously used;
- active monthly and annual subscriber;
- Family product purchaser and an Apple Family Sharing recipient;
- cancellation before renewal with remaining paid time;
- billing retry/grace and recovery;
- confirmed expiration, refund, restore, and resubscribe;
- Free account exercising the retired-gate corpus;
- Free account viewing Money setup, then accepting or dismissing the eligible
  one-month full-Pro trial before Plaid begins;
- active trial account completing connection, import, category/budget planning,
  and transaction review, plus an expired account proving readable history with
  sync and active editing paused;
- Free account completing the overview → basic builder → post-save → advanced
  preview → contextual paywall → purchase/Restore → returned intent journey;
- expired advanced/family rules with online and offline affected devices;
- direct-request attempts against every paid provider/mutation boundary.
- Free and Pro accounts proving the same Cook/Conversation MVP access while
  enabled; stale links and direct requests proving a disabled preview cannot
  create provider cost and never shows a purchase offer.

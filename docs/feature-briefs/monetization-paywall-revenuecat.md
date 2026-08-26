---
id: brief-monetization-paywall-revenuecat
title: Kwilt Free and Pro monetization contract
status: accepted
audiences:
  - audience-ai-native-life-operators
personas:
  - Nina
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-trust-this-app-with-my-life
related_briefs:
  - brief-kwilt-money-capability-integration
  - brief-plaid-transaction-backed-meter
  - brief-screen-time-controls
  - brief-unified-chat
owner: andrew
last_updated: 2026-08-26
---

# Kwilt Free and Pro monetization contract

## Context

Kwilt has grown from a goal and to-do system into a broader household life system spanning Plan, Money, Food, Chores, Games, Screen Time, Explore, and AI. The original paywall was designed around structural scarcity: one Arc, three active Goals per Arc, and a collection of non-AI feature locks. Those boundaries now make the free product feel artificially constrained without creating a strong reason to subscribe.

The commercial model should instead protect a complete free product and charge for value that is both meaningfully differentiated and costly to keep delivering. That means core organization, participation, and on-device intelligence stay free forever. Pro is the full-app service tier for ongoing financial connectivity, guided Cook Mode, family Screen Time administration, and advanced or cloud-intensive AI.

This brief replaces the old structural-limit and `pro_tools_trial` proposal. It keeps the existing RevenueCat `pro` entitlement and the existing `isPro` boolean as the canonical full-Pro access signal.

## Target audience

The primary audience is AI-native life operators who will only let Kwilt hold and operate near meaningful life context when its commercial boundaries are inspectable, proportionate, and reversible. The same boundary deliberately benefits family organizers and productivity power users: core organization remains useful before they are ready to pay, while advanced intelligence, automation, and connected services provide a credible reason to subscribe after Kwilt has earned trust.

## Representative persona

Nina uses Kwilt as a trusted life system and expects both AI and billing to behave predictably. She should be able to organize as much of her life as she needs, participate in household life, and use on-device intelligence without arbitrary upgrade walls or opaque consumption. Pro becomes relevant when she explicitly asks Kwilt to maintain expensive external connections or provide a distinctly assisted experience.

## Aspirational design challenge

How might we make free Kwilt complete enough to become a trusted household habit while making Pro feel like an obvious upgrade for ongoing connected services and high-value assistance rather than a tax on ordinary organization?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — Help me trust this place enough to keep coming back.

People must understand why a boundary exists, keep access to their own data after a trial or subscription ends, and never be charged cloud credits for a provider-routing decision they did not make. That trust protects their ability to use Kwilt to move the few things that matter.

## Job flow step

This brief primarily protects step 10 of `job-flow-nina-trust-ai-with-my-life-system`: resume, correct, retry, audit, or undo later. Subscription and quota state must remain inspectable, downgrade must be reversible where provider contracts allow it, and customer data must remain usable. The free boundary also prevents premature monetization friction from interrupting the earlier capture, organization, and action steps.

## JTBD framing

- Free Kwilt must complete the core job. A person can capture, organize, review, and participate without running into an object cap or a configuration paywall.
- Pro should appear at a high-intent moment when the person asks Kwilt to maintain an external connection, administer another person's device experience, or perform materially more expensive intelligence work.
- A trial should let the person experience the actual paid product. It should not be a separate partial tier with different object rules.
- Downgrade behavior must preserve agency, history, readability, export, and safety controls.

## Design

### Product principle

Free is the complete personal and household system. Pro is the connected and assisted service layer.

There is no longer a paid “unlimited structure” story. Individual and Family products grant the same Pro feature bundle. The Family products add Apple subscription Family Sharing; they do not create a second feature tier or control Kwilt household membership.

### Free forever

The following capabilities do not check `isPro` and do not open a feature-specific paywall:

- Unlimited Arcs.
- Unlimited Goals.
- Unlimited To-dos and reminders.
- Unlimited view configurations, saved views, filtering, and sorting.
- Calendar export.
- All Focus session lengths.
- To-do attachments, subject to universal file-size, storage-abuse, security, and retention safeguards rather than a subscription gate.
- Banner selection and image search.
- Streak protections and recovery behavior that existed in the original Kwilt system.
- Household creation, membership, invitations, and capability activation.
- Goal sharing and accountability.
- Personal Screen Time rules and device-local enforcement.
- Food: Recipe discovery, personal Recipes, imports, editing, scaling, Meal Plans, Groceries, sharing, retailer handoff, and related non-Cook workflows.
- Chores.
- Games.
- Explore.
- Manual Money: manually created accounts, transactions, categories, plans, corrections, review, reading, and export.
- Unlimited on-device AI on supported devices for locally eligible jobs. Local attempts never consume cloud credits.
- A free monthly allowance of 50 successful user-initiated cloud AI actions for standard cloud assistance.

“Free” does not mean unbounded abuse. Universal technical safeguards may limit request size, burst rate, attachment size, or malicious usage as long as they apply honestly and do not masquerade as a Pro feature gate.

### Kwilt Pro

The existing `pro` entitlement unlocks all of the following:

- Connected Money, including unlimited connected financial institutions and accounts. There is no published numeric connection cap; provider safety and abuse controls remain internal.
- Cook Mode, including guided cue progression, timers, session resume, hands-free controls, and Cook learning.
- Family Screen Time administration and prerequisite-based family automation. Personal Screen Time remains free.
- Advanced cloud AI modes, including deep planning, cross-capability reasoning, AI attachment analysis, and other cloud-only intelligence jobs designated by the canonical generation-job policy.
- AI scheduling and auto-scheduling assistance. Manual scheduling and calendar export remain free.
- Live AI conversation.
- Background and proactive AI work.
- External AI connectors and agent surfaces, including desktop or MCP access when offered to customers.
- A monthly allowance of 1,000 successful user-initiated cloud AI actions.

This is not an “unlimited everything” promise. Cloud work remains metered to protect service quality and unit economics. On-device work remains unlimited for Free and Pro.

### Capability and AI boundaries

Food, Chores, Games, Explore, Goals, and To-dos are not themselves Pro capabilities. If a free workflow invokes a paid cloud model, that request follows the universal cloud-AI policy; the surrounding capability remains available and its manual or deterministic path remains usable.

The AI billing boundary is based on the work requested, not whichever provider happened to answer:

- Authored and deterministic responses cost zero credits.
- Locally eligible on-device jobs cost zero credits.
- If a locally eligible job falls back to cloud because the model is unavailable, unsupported for the locale, fails a quality gate, or encounters a native error, the fallback costs the person zero credits. Provider selection is Kwilt's responsibility.
- User cancellation does not trigger fallback and costs zero credits.
- Internal routing, recovery, title generation, evaluation, and orchestration calls cost zero user credits.
- A chargeable cloud action consumes one credit only after a successful usable result. Network failures, provider failures, schema failures, and rejected outputs do not consume a credit.
- Retry or regenerate is a new user action and may consume one new credit when it succeeds.
- Server-side metering is authoritative. The client ledger is display and optimistic UX only.

### Full-app introductory trial

Kwilt offers one Apple introductory free trial for Kwilt Pro:

- Duration: one month, using Apple's one-month period rather than a custom 30-day timer.
- Purchase path: an Apple auto-renewable subscription through RevenueCat. Apple presents the purchase confirmation and payment method; Kwilt does not collect card details directly.
- Renewal: the subscription automatically renews at the displayed standard price unless the customer cancels through Apple.
- Eligibility: one introductory offer per Apple subscription group. All Individual and Family, monthly and annual products live in the same group and expose the same one-month offer to eligible customers.
- Access: the introductory period activates the normal RevenueCat `pro` entitlement, so `isPro === true` and the customer experiences the full paid product.
- Entry: the first high-intent Pro action can introduce the same full-app trial. Money, Cook Mode, Family Screen Time, advanced AI, and Live Conversation do not have separate trials.
- Ineligible customers see a normal Subscribe CTA with the live price and cadence; trial copy is never shown from hardcoded assumptions.

The old `pro_tools_trial` concept is retired. It must not appear in customer copy, RevenueCat offerings, client access decisions, server entitlement decisions, or analytics segmentation.

### Pricing and products

Keep current prices until conversion and retention data justify a change:

| Product | Monthly | Annual | Access |
| --- | ---: | ---: | --- |
| Individual | $9.99 | $59.99 | Full Kwilt Pro for the purchaser |
| Family | $14.99 | $79.99 | The same Kwilt Pro bundle with Apple Family Sharing enabled |

Canonical product identifiers remain:

- `pro_monthly`
- `pro_annual`
- `pro_family_monthly`
- `pro_family_annual`

All four products map to the RevenueCat `pro` entitlement. Legacy Money product identifiers may remain purchase aliases while existing customers are supported, but they do not define a separate Money entitlement.

### Contextual paywall entry points

A paywall appears only after a person intentionally asks for paid value:

| Intent | Free behavior before intent | Paid boundary | Paywall promise |
| --- | --- | --- | --- |
| Connect a financial account | Manual Money remains fully usable | Before Plaid Link token creation or native Plaid initialization | Start the full Kwilt Pro trial to keep financial accounts connected and fresh |
| Start or resume Cook Mode | Recipe detail, ingredients, and method remain readable | Before creating, restoring, or opening a Cook Session | Start the full Kwilt Pro trial for guided, resumable cooking |
| Administer a child's Screen Time | Household membership and personal Screen Time remain usable | Before family setup, selection, policy delivery, or mutation | Start the full Kwilt Pro trial for family Screen Time administration |
| Run advanced cloud AI | On-device AI and the free standard cloud allowance remain usable | Before a hard-Pro cloud job, or when the free cloud allowance is exhausted | Start the full Kwilt Pro trial for advanced intelligence and a larger cloud budget |
| Start Live Conversation or background AI | Typed local/basic assistance remains usable | Before session/provider initialization or background scheduling | Start the full Kwilt Pro trial for live or proactive assistance |

Deep links, restored navigation state, Chat actions, and background entry points must pass the same central access policy. Hiding a button is not enforcement.

### Connected Money lifecycle

Manual and connected Money share the same reading surfaces, but only the connection lifecycle is paid:

1. A free person can create and use Manual Money indefinitely.
2. Tapping `Connect financial accounts` opens the contextual Kwilt Pro paywall before Kwilt requests a Plaid Link token.
3. Starting the introductory offer activates `pro`; the person can then connect unlimited institutions and accounts.
4. During an active trial, paid subscription, or Apple billing grace period, connection, refresh, relink, and sync remain available.
5. Turning off auto-renew does not revoke access immediately. Access continues through the entitlement expiration date.
6. After confirmed entitlement expiration, new Link, relink, and transaction refresh stop. Kwilt disconnects Plaid Items server-side to stop ongoing provider cost.
7. Imported accounts and transactions remain readable, editable, categorizable, and exportable. Manual entries continue to work. Connected surfaces show the last successful refresh time and an honest `Connection paused` state.
8. Restore or resubscribe reactivates Pro. Reconnection may require the person to complete Plaid Link again; Kwilt never implies that a disconnected provider session is still live.

RevenueCat webhooks and a durable subscription mirror must be reliable before Plaid cleanup is automated. The current absence of a subscription mirror row for the known production purchase is a reporting/integration gap, not evidence that the purchase failed.

### Downgrade and safety behavior

When Pro ends:

- All free data and features remain fully usable; no Arc, Goal, To-do, view, attachment, Food, Chore, Game, Explore, household, or manual Money content is locked.
- Existing connected Money history remains. Refresh and new connections stop only after confirmed entitlement expiry, not at cancellation time.
- An active Cook Session may be completed, exited, and saved; a new or completed session cannot be started or resumed without Pro.
- Existing family Screen Time state remains visible. Release, disable, and other safety-reducing actions always remain available. Creating, tightening, or extending family controls requires Pro.
- In-flight AI work may finish. New work follows the Free AI policy.
- Restore purchases and subscription management remain available at all times.

### Entitlement and reporting truth

- `isPro` remains the single client access boolean.
- RevenueCat purchase state and the internal support/comp entitlement layer remain a union. StoreKit/RevenueCat is the only customer-facing paid path.
- RevenueCat is the purchase and subscription-lifecycle source of truth. The server mirror is a durable operational projection used for enforcement, cleanup, reporting, and support.
- The webhook must fail closed when its secret is absent, verify authorization, store provider event identity, handle duplicate and out-of-order deliveries, preserve entitlement through cancellation and grace, and revoke only on confirmed expiration/refund.
- A client-supplied `x-kwilt-is-pro` header is never sufficient for server authorization or a higher paid quota.

### Analytics

Preserve the existing paywall-to-purchase funnel and add lifecycle and provider-cost context:

- `paywall_viewed`
- `paywall_upgrade_cta_tapped`
- `purchase_started`
- `free_trial_started`
- `purchase_succeeded`
- `purchase_failed`
- `trial_converted`
- `trial_expired`
- `subscription_renewed`
- `subscription_cancelled`
- `subscription_expired`
- `billing_issue_started`
- `billing_grace_recovered`
- `money_connection_paused`
- `money_connection_disconnected`
- `ai_job_completed`, with job, route, provider, billing class, fallback reason, entitlement state, and user-credit cost

Every purchase event carries the originating paywall reason and source so conversion can be compared across connected Money, Cook Mode, Family Screen Time, advanced AI, and Live Conversation.

### Retired gates

Remove these paywall reasons and all their call sites:

- Arc and Goal count limits.
- Unsplash/banner search.
- Calendar export.
- long Focus sessions.
- attachments.
- view configurations, saved views, filters, and sorting.
- streak shields.
- “additional financial institution”; connected Money is now the boundary from the first connection.

Do not replace these with generic screen-level `isPro` checks. Their capabilities are explicitly Free.

### Store and provider configuration

- Put all four products in one Apple subscription group.
- Configure a one-month introductory free trial for each purchasable product and eligible storefront, with live price/eligibility read from StoreKit through RevenueCat.
- Enable Apple Family Sharing only on the Family products.
- Map every current and legacy supported product to the RevenueCat `pro` entitlement.
- Configure the authenticated RevenueCat webhook and verify it with a Sandbox event before using it for paid-service teardown.
- Enable and test Apple billing grace behavior before treating billing issues as expiration.

## Success signal

The model succeeds when Free users can reach recurring value without a structural paywall and high-intent Pro actions convert at sustainable unit economics.

Primary measures:

- Free activation and four-week retained use do not decline after removing structural gates.
- No retired-gate paywall events appear in production.
- Paywall view → trial start, trial start → paid renewal, and paid month-one retention can be segmented by entry reason.
- Connected Money, Cook Mode, Family Screen Time, advanced AI, and Live Conversation each have observable trial-start and conversion rates.
- Cloud AI and Plaid provider cost per active Free, trial, and paid user stays within the gross-margin target.
- On-device eligible jobs show high local completion with zero user-credit cost; fallback is observable but remains free to the person.
- Expired or cancelled customers retain readable data and all Free capabilities.
- RevenueCat dashboard state, the server subscription mirror, and client `isPro` agree for the known production subscriber and all Sandbox lifecycle cases.

## Acceptance criteria

- A signed-out or Free user can create more than one Arc, more than three Goals in an Arc, unlimited To-dos, and multiple custom views without seeing a paywall.
- Free users can use attachments, all Focus durations, calendar export, banners, Food, Chores, Games, Explore, goal sharing, household membership, and personal Screen Time without a Pro check.
- On-device AI never consumes a cloud credit, including Kwilt-selected cloud fallback for a locally eligible job.
- Standard cloud AI enforces 50 successful user actions per month for Free; Pro enforces 1,000. Failed or internal calls do not consume user credits.
- Manual Money works without Pro. Every path that creates, relinks, or refreshes a Plaid connection requires server-confirmed Pro.
- Pro permits unlimited connected institutions and accounts.
- Cook Mode and Family Screen Time administration require Pro at both navigation and mutation/provider boundaries.
- An Apple introductory offer activates `pro` and therefore all Pro features; no customer-facing partial trial exists.
- Cancellation preserves access until expiration; configured billing grace preserves access; confirmed expiration invokes paid-service cleanup without deleting customer data.
- The known production purchase can be reconciled across RevenueCat, webhook delivery, subscription mirror, and the client's `isPro` state before release.
- Product, architecture, TypeScript, Jest, Deno, and diff-aware completion checks pass, followed by Sandbox purchase/renewal/cancel/expiry/restore verification on the signed iOS runtime.

## Open questions

- After enough real usage, should the 50/1,000 cloud-action allowances change, or should selected jobs use weighted costs? This is a pricing experiment, not an implementation blocker.
- Which future connector and background-agent jobs merit hard Pro access versus inclusion in the metered standard cloud allowance? New jobs must declare this explicitly in the canonical generation-job contract.

## References

- [Apple: Set up introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [RevenueCat: Common webhook flows](https://www.revenuecat.com/docs/integrations/webhooks/event-flows)
- `docs/design-explorations/participation-spaces/sponsorship-and-entitlements.md`
- `docs/capabilities/money/README.md`

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
  - brief-screen-time-rule-governance
  - brief-unified-chat
  - brief-creator-acquisition-pilot
owner: andrew
last_updated: 2026-08-31
---

# Kwilt Free and Pro monetization contract

## Context

Kwilt has grown from a goal and to-do system into a broader household life system spanning Plan, Money, Food, Chores, Games, Screen Time, Explore, and AI. The original paywall was designed around structural scarcity: one Arc, three active Goals per Arc, and a collection of non-AI feature locks. Those boundaries now make the free product feel artificially constrained without creating a strong reason to subscribe.

The commercial model should instead protect a complete free product and charge
for value that is meaningfully differentiated, materially costly to keep
delivering, or both. That means core organization, participation, a useful
personal Screen Time baseline, and on-device intelligence stay free forever.
The launch Pro offer is led by ongoing financial connectivity and Kwilt's
advanced cross-domain personal and family Screen Time system. Cook Mode and
Live Conversation create variable cost, but launch as available MVP previews
without a feature-level Pro gate. Their cost, exposure, and future commercial
classification are managed separately from the current subscription promise.

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
- Downgrade behavior must preserve agency, history, readability, export, and
  access to safety-reducing controls. Paid Screen Time enforcement ends when
  the entitlement ends, but the rule definition remains inspectable.

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
- Screen Time authorization, privacy-preserving app selection, rule inventory,
  shield explanations, recovery, and device-local enforcement.
- Unlimited basic personal Screen Time rules with one standard condition:
  **Focus is running**, **time of day**, or **daily usage allowance**.
- Reading, disabling, deleting, loosening, releasing, and cleaning up every Screen
  Time rule regardless of subscription state.
- Food: Recipe discovery, personal Recipes, imports, editing, scaling, Meal Plans,
  Groceries, sharing, retailer handoff, and other launch-ready workflows.
- Chores.
- Games.
- Explore.
- A clear explanation of how Money works before purchase, plus readable retained
  Money history and data-management access after Pro ends. Kwilt does not offer
  manual account or transaction entry.
- Unlimited on-device AI on supported devices for locally eligible jobs. Local attempts never consume cloud credits.
- A free monthly allowance of 50 successful user-initiated cloud AI actions for standard cloud assistance.

“Free” does not mean unbounded abuse. Universal technical safeguards may limit request size, burst rate, attachment size, or malicious usage as long as they apply honestly and do not masquerade as a Pro feature gate.

### Free MVP previews

Cook Mode and Live Conversation are available to Free and Pro accounts in their
current MVP states while their server-controlled exposure flags are enabled.
They do not check `isPro`, do not open a paywall, and are not promised as
permanent Free features. Authenticated provider requests still use bounded
rate, usage, and global-cost safeguards. Either capability can be hidden with
its exposure flag if quality, reliability, or cost becomes unacceptable; an
off flag produces an honest unavailable state, not an upgrade prompt.

### Kwilt Pro

The existing `pro` entitlement unlocks all of the following:

- Money and Budgets, including the first financial-account connection, imported
  accounts and transactions, categories, budget plans, transaction review and
  correction, relink, refresh, and ongoing sync. There is no published numeric
  connection cap; provider safety and abuse controls remain internal.
- Advanced personal Screen Time rules: two or more conditions with an explicit
  AND/OR connector, plus Kwilt-linked conditions such as **a real step is
  complete** and **a Money review is required**.
- Family Screen Time coordination and automation, including child-scoped
  schedules, usage allowances, responsibility prerequisites, prerequisite-app
  conditions, caregiver changes through Chat, cross-device policy delivery,
  desired/applied receipts, and temporary caregiver overrides. A useful basic
  personal Screen Time system remains Free.
- Advanced cloud AI modes, including deep planning, cross-capability reasoning, AI attachment analysis, and other cloud-only intelligence jobs designated by the canonical generation-job policy.
- AI scheduling and auto-scheduling assistance. Manual scheduling and calendar export remain free.
- Background and proactive AI work.
- External AI connectors and agent surfaces, including desktop or MCP access when offered to customers.
- A monthly allowance of 1,000 successful user-initiated cloud AI actions.

This is not an “unlimited everything” promise. Cloud work remains metered to protect service quality and unit economics. On-device work remains unlimited for Free and Pro.

### Launch offer hierarchy

The launch offer has two customer-facing hero pillars:

1. **Money and Budgets** — connected transaction truth and an actively
   maintained household budget.
2. **Advanced Screen Time** — Kwilt's compound and unique control conditions,
   including real-step and Money-linked rules, plus family coordination.

Advanced cloud AI, scheduling, background work, and external agents are
supporting Pro inclusions rather than headline reasons to subscribe.

Cook Mode and Live Conversation sit outside the launch Free/Pro value
hierarchy as Free MVP previews. Keep them out of headline paywall, pricing, App
Store subscription-benefit, and creator claims because neither is a strong
purchase reason yet. Track repeated use and provider cost, and retain a remote
exposure flag for each. Moving either capability to Pro later requires a new,
explicit contract decision; it must not happen accidentally through a quota or
feature flag. Voice alone is not differentiated paid value, so Conversation's
future value case should still be grounded in Kwilt-specific context,
controlled actions, and trustworthy return to the life system.

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
- Purchase path: an Apple auto-renewable subscription through RevenueCat. At
  signup, Apple presents the subscription confirmation and uses the payment
  method on the person's Apple Account. Kwilt never sees or stores card details.
- Renewal: the subscription automatically renews at the displayed standard price unless the customer cancels through Apple.
- Eligibility: one introductory offer per Apple subscription group. All Individual and Family, monthly and annual products live in the same group and expose the same one-month offer to eligible customers.
- Access: the introductory period activates the normal RevenueCat `pro` entitlement, so `isPro === true` and the customer experiences the full paid product.
- Entry: the first high-intent Pro action can introduce the same full-app trial.
  Money, advanced personal Screen Time, Family Screen Time, and eligible
  advanced service work do not have separate trials. Free MVP previews do not
  become trial benefits merely because they create provider cost.
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
| Start Money or build a budget | The person can understand the outcome and connection/privacy requirements; retained history stays readable after downgrade | Before Plaid Link token creation, native Plaid initialization, or an active Money mutation | Check your plan before you spend: real transactions keep it current, selected apps can wait for a review, and the person decides whether to continue |
| Build an advanced personal Screen Time rule | Basic one-condition personal rules remain usable | Before adding a second condition, choosing a Kwilt-linked condition, or saving an advanced draft | Combine the exact conditions the person needs and let them choose whether all or any conditions count |
| Coordinate a child's Screen Time | Household membership, basic personal Screen Time, existing family-rule reading, and safety-reducing actions remain usable | Before child enrollment, family selection, first policy delivery, creation, tightening, extension, or a caregiver override | Set a clear family agreement and retain proof of which rule each device received |
| Run advanced cloud AI | On-device AI and the free standard cloud allowance remain usable | Before a hard-Pro cloud job, or when the free cloud allowance is exhausted | Name the requested outcome, the context Kwilt will use, and the review point before anything changes |
| Start background or proactive AI | Typed local/basic assistance remains usable | Before background scheduling or provider initialization | Let Kwilt finish supported work while the person moves on, then return the result for review |

Each contextual offer must state the requested outcome, the mechanism that
produces it, and the control the person retains. Its CTA is **View Pro plans**.
Localized price, cadence, Family Sharing, and introductory eligibility appear
only in the Apple-backed plan chooser. A contextual offer must not imply trial
eligibility or immediate purchase.

Deep links, restored navigation state, Chat actions, and background entry points must pass the same central access policy. Hiding a button is not enforcement.

### Free-to-Pro Screen Time journey

Free Screen Time must be useful without hiding the more capable Pro system.
Upgrade paths appear in the normal course of building and reviewing rules, not
as generic launch interruptions:

1. **Rules overview:** show useful advanced examples and family coordination as
   secondary, clearly Pro-labeled possibilities beside the person's working
   basic rules.
2. **Basic rule builder:** keep premium condition rows visible and labeled
   **Pro**. A tap previews the concrete rule the person could make, then opens
   the contextual interstitial before the draft becomes invalid or enforcement
   changes.
3. **After first value:** after a basic rule is saved successfully, offer a
   secondary **Make this rule smarter** path to add another condition, connect
   it to a real step or Money review, or coordinate it for a child. Do not
   interrupt the save confirmation.
4. **Rule detail:** show the same secondary advanced actions for an existing
   basic rule, with the person's current rule and intended addition carried
   into the paywall explanation.
5. **Family learning/setup:** let a caregiver understand the outcome and device
   requirements before asking for payment. Open the contextual interstitial
   before enrollment, selection, or policy delivery begins.
6. **Chat:** allow Kwilt to propose and preview a typed advanced rule, then
   require Pro before executing or projecting it.

Every path preserves the draft and return destination across purchase or
Restore. StoreKit supplies live price, cadence, and introductory eligibility.
The app does not use arbitrary rule quotas, blank paywalls, repeated launch
nags, or paywalls that appear only after work is lost.

### Money and Budgets lifecycle

Money is a Pro capability because its useful product is built on connected,
imported transaction truth. Kwilt does not create a separate manual-transaction
product as the Free fallback:

1. A Free person can understand what Money will do, what it connects, and how
   financial data is handled before purchasing.
2. Tapping the first Money setup action opens the contextual Kwilt Pro paywall
   before Kwilt requests a Plaid Link token or initializes native Plaid.
3. An eligible person can confirm the Apple auto-renewable subscription and
   start the one-month full-Pro introductory trial. Apple manages the payment
   method; Kwilt does not collect card details.
4. During an active trial, paid subscription, or Apple billing grace period,
   the full Money product is available: connection, imported accounts and
   transactions, categories, budget plans, review/correction, refresh, relink,
   and sync.
5. Turning off auto-renew does not revoke access immediately. Access continues
   through the entitlement expiration date.
6. After confirmed entitlement expiration, active Money operations stop. New
   Link, relink, and transaction refresh are rejected, and Kwilt disconnects
   Plaid Items server-side to stop ongoing provider cost.
7. Previously imported accounts, transactions, and budget history remain
   readable with honest last-refresh and `Connection paused` states. Deletion
   and required data-management routes remain available, but editing categories,
   plans, or transaction classifications requires active Pro.
8. Restore or resubscribe reactivates Pro. Reconnection may require the person
   to complete Plaid Link again; Kwilt never implies that a disconnected
   provider session is still live.

RevenueCat webhooks and a durable subscription mirror must be reliable before Plaid cleanup is automated. The current absence of a subscription mirror row for the known production purchase is a reporting/integration gap, not evidence that the purchase failed.

### Downgrade and safety behavior

When Pro ends:

- All Free data and features remain fully usable; no Arc, Goal, To-do, view,
  attachment, Food, Chore, Game, Explore, or household content is locked.
- Existing Money history remains readable. Refresh, new connections, and active
  Money editing stop only after confirmed entitlement expiry, not at
  cancellation time.
- Cook Mode and Live Conversation do not change at subscription expiry while
  they remain Free MVP previews. Their independent exposure and cost-safety
  policies still apply.
- Basic personal rules continue normally.
- Confirmed expiration or refund deactivates every advanced personal and family
  rule as a whole. Kwilt does not silently convert a compound rule to one Free
  condition or let paid enforcement continue indefinitely.
- The rule definition remains visible in a dormant
  **Inactive because Pro ended** state for explanation, deletion, audit, and a
  future reviewed restart. Desired enforcement is cleared and native
  release/cleanup is queued for every affected device.
- Until the device acknowledges that release, the app shows
  **Deactivation pending** and the last acknowledged device state. It never
  claims that an offline device has stopped enforcing a rule merely because the
  server requested cleanup.
- Restore or resubscribe does not silently reactivate dormant rules. The person
  or caregiver reviews each rule and deliberately turns it back on after Pro is
  active.
- Reading, deleting, release, and cleanup remain available without Pro. New
  advanced authoring, child enrollment, delivery, tightening, extension, or a
  caregiver override requires Pro.
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
- `mvp_preview_started`, `mvp_preview_completed`,
  `mvp_preview_cost_guarded`, and `mvp_preview_unavailable`, with only the
  bounded capability ID, flag state, success class, duration/usage bucket, and
  server cost category.

Every purchase event carries the originating paywall reason and source so
conversion can be compared across Money and Budgets, advanced personal Screen
Time, Family Screen Time, and eligible advanced service work.

Screen Time analytics additionally carry only bounded enums such as rule access
class, condition types, condition count, scope, mutation class, entry surface,
and desired/applied outcome. They never carry selected app identities, child
names, responsibility titles, generated rule sentences, Money category names,
or Apple tokens.

### Screen Time packaging and App Review posture

Apple App Review Guideline 4.10 says apps may not monetize built-in operating
system capabilities, including Screen Time APIs. Current App Store precedent
also includes paid products such as Jomo and Opal that provide a meaningful
free blocking baseline and charge for developer-created rule systems,
automation, history, strictness, and family plans. Kwilt therefore treats this
as a review-sensitive packaging boundary rather than a categorical ban.

Kwilt does not sell Apple authorization, the native picker, raw device
enforcement, rule visibility, shield explanations, or release. It sells the
developer-created layer that composes several pieces of Kwilt truth into an
advanced rule, coordinates an authorized Household across devices, accepts
reviewed caregiver changes through Chat, and proves desired-versus-applied
delivery. Customer and App Review copy must describe that value as **advanced
rules**, **conditions connected to Kwilt**, and **family coordination**—never
as “unlock Screen Time,” “pay to block apps,” or access to an Apple API.

The release evidence ledger must include the Family Controls distribution
entitlement, the exact Free/Pro demonstration account states, App Review notes,
and a remotely controlled fallback that removes Screen Time from the marketed
benefit list and makes advanced Screen Time authoring Free without blocking the
rest of the Pro release.

### Retired gates

Remove these paywall reasons and all their call sites:

- Arc and Goal count limits.
- Unsplash/banner search.
- Calendar export.
- long Focus sessions.
- attachments.
- view configurations, saved views, filters, and sorting.
- streak shields.
- “additional financial institution”; Money and Budgets are now Pro from first setup.

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
- Money and Budgets, advanced personal Screen Time, Family Screen Time, and any
  marketed advanced service work each have observable trial-start and
  conversion rates.
- Cloud AI, Plaid, Cook Mode, and Live Conversation provider cost per active
  Free, trial, and paid user stays within the gross-margin target. Cook and Live
  usage/cost reporting remains separate from the hero-pillar conversion
  denominator until either becomes marketable.
- On-device eligible jobs show high local completion with zero user-credit cost; fallback is observable but remains free to the person.
- Expired or cancelled customers retain readable data and all Free capabilities;
  expired/refunded customers have no active Pro Screen Time enforcement.
- RevenueCat dashboard state, the server subscription mirror, and client `isPro` agree for the known production subscriber and all Sandbox lifecycle cases.

## Acceptance criteria

- A signed-out or Free user can create more than one Arc, more than three Goals in an Arc, unlimited To-dos, and multiple custom views without seeing a paywall.
- Free users can use attachments, all Focus durations, calendar export,
  banners, Food, Chores, Games, Explore, goal sharing, household membership,
  and the defined basic personal Screen Time rules without a Pro check.
- On-device AI never consumes a cloud credit, including Kwilt-selected cloud fallback for a locally eligible job.
- Standard cloud AI enforces 50 successful user actions per month for Free; Pro enforces 1,000. Failed or internal calls do not consume user credits.
- There is no manual-account or manual-transaction product. The first Money
  setup action offers the full-Pro one-month introductory trial when Apple
  reports eligibility, and every connection, active budget/category mutation,
  transaction review/correction, relink, refresh, and sync path requires
  server-confirmed Pro.
- After confirmed expiration, previously imported Money and budget history
  remains readable while active Money operations are blocked and the provider
  connection is paused safely.
- Pro permits unlimited connected institutions and accounts.
- Advanced personal Screen Time authoring and restrictive Family Screen Time
  administration require Pro at both navigation and trusted mutation/provider
  boundaries.
- Cook Mode and Live Conversation are available without Pro while their MVP
  exposure flags are enabled. They never open a paywall in this launch, remain
  absent from headline subscription/store/creator claims, and can be hidden
  remotely without changing entitlement.
- Free and Pro receive the same enabled Cook/Conversation preview. Provider
  work requires authentication and bounded usage/cost safeguards; disabling a
  flag stops new UI, stale-link, Chat-tool, and direct provider entry with an
  honest unavailable state and no upsell.
- A Free person can create unlimited one-condition personal rules using Focus,
  time of day, or a daily usage allowance; adding a second condition, an AND/OR
  connector, a real-step condition, or a Money condition opens the contextual
  Pro interstitial before the draft becomes unsavable or enforcement changes.
- Free Screen Time exposes contextual, secondary upgrade paths from the rules
  overview, builder, successful basic-rule save, rule detail, family learning,
  and Chat. Each path previews the specific paid outcome, preserves work across
  purchase/Restore, and returns to the intended action.
- Reading and every safety-reducing Screen Time action remain available without
  Pro. At confirmed expiration/refund, advanced personal and family rules are
  deactivated as whole rules, remain readable as dormant definitions, and show
  **Deactivation pending** until native release receipts arrive.
- Resubscription never silently reactivates a dormant Screen Time rule.
- An Apple introductory offer activates `pro` and therefore all Pro features; no customer-facing partial trial exists.
- Cancellation preserves access until expiration; configured billing grace preserves access; confirmed expiration invokes paid-service cleanup without deleting customer data.
- The known production purchase can be reconciled across RevenueCat, webhook delivery, subscription mirror, and the client's `isPro` state before release.
- Product, architecture, TypeScript, Jest, Deno, and diff-aware completion checks pass, followed by Sandbox purchase/renewal/cancel/expiry/restore verification on the signed iOS runtime.

## Open questions

- After enough real usage, should the 50/1,000 cloud-action allowances change, or should selected jobs use weighted costs? This is a pricing experiment, not an implementation blocker.
- Which future connector and background-agent jobs merit hard Pro access versus inclusion in the metered standard cloud allowance? New jobs must declare this explicitly in the canonical generation-job contract.
- What repeated-use, differentiated-value, and provider-margin evidence would
  justify keeping Cook/Conversation Free, moving either to Pro, or retiring it?
  No threshold is required before the no-paywall MVP launch.

## References

- [Apple: Set up introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [RevenueCat: Common webhook flows](https://www.revenuecat.com/docs/integrations/webhooks/event-flows)
- `docs/design-explorations/participation-spaces/sponsorship-and-entitlements.md`
- `docs/capabilities/money/README.md`

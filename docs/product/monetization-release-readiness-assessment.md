# Kwilt monetization release readiness assessment

Date: 2026-08-31

Branch: `codex/align-free-pro-paywall`

Baseline commit: `9c467790b05e3a91f67c830ee2a67975ac8b9aa4`

Decision status: implementation planning complete; product implementation not started

Canonical contract: `docs/feature-briefs/monetization-paywall-revenuecat.md`

## 2026-09-02 Screen Time boundary update

The Screen Time packaging recommendations below preserve the 2026-08-31
assessment snapshot and are superseded by the accepted
[`family-screen-time-commercial-boundary`](../design-explorations/family-screen-time-commercial-boundary/03-converge.md)
decision and the canonical contract. The initial 2026-09-02 convergence was
revised on 2026-09-03: immediate manual control and unscheduled,
single-condition Focus or daily-usage rules remain Free; scheduling,
composition, Kwilt-native policy conditions, and managed-Household coordination
require Pro. A useful in-person simple family starter remains Free.

## Executive assessment

Kwilt has the right monetization strategy but is **not ready to launch that strategy yet**.

The accepted product contract is strong: Free should be a complete personal and household system, while Pro should pay for advanced rule composition, ongoing connections, coordination, automation, and materially assisted services. The contextual interstitial is the right sales moment because it follows an explicit request for paid value instead of interrupting basic organization.

The current app and backend still contain significant parts of the old model. Core Free capabilities remain gated, the retired partial-trial state is still active, multiple new paid capabilities have no consistent gate, and several provider/server paths trust incomplete or client-supplied entitlement evidence. Subscription lifecycle, public pricing, support truth, and paid-feature launch evidence also need work.

This is therefore a cross-functional release program, not a paywall-screen task. It has nine required workstreams:

1. centralize the Free/Pro capability contract;
2. remove every retired gate;
3. make trial, purchase, entitlement, cancellation, grace, expiration, restore, and refund state trustworthy;
4. enforce paid advanced AI, background work, and external agents on the
   server, while making the free Cook Mode and Live Conversation MVPs
   authenticated, cost-bounded, measurable, and remotely hideable;
5. gate Money and Budgets before the first Plaid cost or active Money mutation, and stop cost safely after expiration;
6. package and gate basic versus advanced personal Screen Time and family coordination across UI, Chat, native, deep-link, and mutation paths;
7. align analytics, support, website, legal, App Store, and in-app messaging;
8. prove each marketed capability and the subscription lifecycle in the runtime where it actually matters;
9. build creator acquisition as a separate claim, attribution, commission, disclosure, and learning lane that observes Apple billing truth.

## Recommendation

Proceed with the accepted Free/Pro model. Do not revisit prices or invent more tiers before launch. Implement a layered monetization control plane and keep the current contextual paywall interaction.

For Screen Time, make the subscription consequence explicit: switching off
auto-renew keeps Pro through the paid-through date, but confirmed expiration or
refund deactivates every advanced personal and family rule. Keep the definition
readable as an inactive record, clear desired enforcement, obtain native device
release receipts, and require deliberate review before any resubscription
reactivates it. Do not silently reduce a compound rule to one Free condition.

Make the Free tier sell Pro through use. Surface secondary, contextual upgrade
paths from the rules overview, premium condition rows in the basic builder, the
successful first-rule moment, rule detail, family learning, and Chat. Each path
should preview a specific better outcome and preserve the person's work; none
should interrupt basic-rule completion or behave like a generic launch ad.

Treat Money and Budgets as one Pro capability from first setup. The application
has no manual account or transaction-entry product, and this plan does not add
one. An eligible person can start the existing one-month full-Pro Apple
introductory trial at the Money setup moment, experience the complete
Plaid-backed budgeting workflow, and then renew at the displayed price unless
they cancel through Apple. After confirmed expiration, active Money operations
and provider sync stop while previously imported history remains readable.

Narrow the customer-facing launch offer to two differentiated pillars: Money
and Budgets, and advanced Screen Time. Screen Time is an accepted launch pillar;
its remaining device/App Review checks are release verification, not a reason to
replace the product strategy. Ship Cook Mode and Live Conversation in their MVP
states without a Pro gate. Keep them out of headline paywall, store,
subscription-pricing, and creator claims because they are not strong standalone
purchase reasons. Control their real variable cost with authentication,
bounded usage, provider-cost telemetry, and a server-controlled exposure flag
that can hide either capability if quality or economics deteriorate.

The public launch remains a no-go until the P0 enforcement and lifecycle findings are closed. If individual paid capabilities are still not launch-proven, ship a narrower truthful Pro promise rather than advertising unproven features. The creator pilot is a second gate: it may remain on hold while a safe general Pro launch proceeds.

## What belongs behind the paywall

### Free forever

- unlimited Arcs, Goals, To-dos, reminders, views, filters, and sorting;
- calendar export, all Focus lengths, attachments, banner/image search, and streak recovery;
- household membership, invitations, participation, and Goal sharing;
- Screen Time authorization, private app selection, inventory, explanations,
  recovery, device-local enforcement, and unlimited basic personal rules with
  one Focus, time-of-day, or daily-usage condition;
- reading, disabling, deleting, loosening, releasing, and cleaning up any Screen Time rule;
- launch-ready Food workflows, plus Chores, Games, and Explore;
- a pre-purchase explanation of Money, plus readable retained Money history and
  data-management access after Pro ends;
- unlimited locally completed AI on supported devices;
- Kwilt-selected cloud fallback for a locally eligible job at zero user credits;
- 50 successful standard cloud actions per month.

### Free launch previews

- Cook Mode and Live Conversation are available without Pro while their MVP
  exposure flags are enabled;
- neither opens a paywall or becomes a promised permanent-Free capability;
- authenticated provider use is bounded and observable, and either preview can
  be hidden remotely without changing the subscription contract.

### Kwilt Pro

- Money and Budgets from first setup, including financial-account connection,
  imported transactions, categories, plans, review/correction, relink, refresh,
  and sync;
- advanced personal Screen Time rules with two or more conditions, AND/OR
  connectors, or Kwilt-linked real-step and Money conditions;
- Family Screen Time coordination and automation, including schedules,
  allowances, responsibilities, prerequisite apps, Chat changes, cross-device
  delivery, desired/applied receipts, and temporary caregiver overrides;
- advanced cloud AI and AI attachment analysis;
- AI scheduling and auto-scheduling assistance;
- background and proactive AI work;
- external agents and connectors, including MCP;
- 1,000 successful cloud actions per month.

### Trial and product structure

- the Apple introductory offer activates the normal RevenueCat `pro` entitlement;
- the launch default is Apple's one-month free-trial period, confirmed as an
  auto-renewable subscription using the payment method on the person's Apple
  Account; Kwilt does not collect card details;
- introductory copy appears only when the store reports the person is eligible;
- Individual and Family products unlock the same Pro bundle;
- Family products add Apple Family Sharing, not Kwilt household membership or a second feature tier;
- a person who is ineligible for the introductory offer sees the live price and a Subscribe action, never a fictional trial.

## Why this boundary is right

Basic organization is where Kwilt still needs to help families reach recurring value. Maya's family-organization flow scores “see what matters,” “know the next doable action,” and “schedule or hand off” at 2/5. Monetizing object counts, views, filters, Focus, attachments, or ordinary household participation would tax the weakest parts of the core job before the product has earned trust.

The recommended Pro features have a clearer value-and-cost relationship. They
compose multiple pieces of Kwilt truth into a distinct guardrail, maintain
external financial connections, coordinate another person's device experience,
run background work, or expose Kwilt through external agents. Cook Mode and
Live Conversation are the launch exception: they create cost, but remain Free
MVP previews while Kwilt learns whether they deliver enough repeated value to
justify future paid classification.

For Screen Time, the dividing line is not “Apple API access.” Kwilt should never
charge for authorization, the native picker, raw device blocking, rule reading,
or release. The paid product is Kwilt's developer-created composition and
coordination layer: compound logic, unique conditions connected to Activities
and Money, household authority, automation, and delivery receipts. A useful
Free baseline makes that distinction real rather than rhetorical.

The boundary also fits Nina's trust job. A paid decision must be inspectable, permissioned, consistent, and reversible. That requires the same answer from every entry point and preservation of data after downgrade.

## Questions asked and answered

### 1. Should Kwilt charge for more structure?

No. More Arcs, Goals, To-dos, views, filters, attachments, and household participation increase the chance that Kwilt becomes the person's real system. They should not be artificial scarcity.

### 2. Should each major feature have its own trial or entitlement?

No. One full-Pro introductory offer is easier to understand, operate, support, and measure. A separate `pro_tools_trial` creates inconsistent access and a trial that is not the product being sold.

### 2a. What exactly is monetized in Money and Budgets?

The active Money product is Pro: first account connection, imported transaction
truth, categories, budget plans, transaction review and correction, relink,
refresh, and ongoing sync. There is no manual-account or manual-transaction Free
mode. Free can see the setup explanation; after Pro ends, previously imported
history remains readable and required data-management actions remain available,
but active Money editing and provider operations stop.

### 3. When should a paywall appear?

After explicit paid intent and before provider initialization or privileged
mutation. Browsing a recipe, reading retained Money history, inspecting Screen
Time state, or saving a basic one-condition personal rule is not paid intent.
Starting Money, connecting an account, changing an active budget, reviewing a
transaction, adding a second/unique Screen Time condition, coordinating a
child's controls, or starting eligible advanced service work is.

### 4. Is hiding a button sufficient?

No. Restored navigation, deep links, Chat, MCP, background execution, and direct requests can bypass a visible button. The server or native/provider boundary must independently authorize the operation.

### 5. What should happen when someone cancels?

Nothing immediate to access. Cancellation means auto-renew is off; access continues through the paid-through date and configured grace. Revocation and provider cleanup happen only after confirmed expiration or refund.

### 6. What should happen to customer data after downgrade?

Customer data remains readable through the Free product. Money stops refreshing
and active budget/transaction editing stops, but imported history remains
visible. Basic Screen Time rules continue. At confirmed expiration or refund,
every advanced personal and family rule is
deactivated as a whole. Its definition stays visible as **Inactive because Pro
ended**, desired enforcement is cleared, and native release is retried until
each affected device acknowledges it. An offline device shows **Deactivation
pending** rather than a false success. Restore or resubscribe requires the
person to review and turn the rule back on; it never silently reactivates. New
paid work is blocked contextually.

### 7. Should the current 50/1,000 cloud allowances change before launch?

No. They are acceptable launch hypotheses. The required work is to make successful-result accounting, trusted server quota, routing class, and unit-economics telemetry correct. Weighting and limit changes should follow real usage data.

### 8. Should Family price imply a Kwilt household plan?

No. The feature bundle is identical. “Family” means Apple Family Sharing for the subscription. Kwilt household membership remains a Free collaboration concept and must not be presented as the billing boundary.

### 9. Can the app advertise every planned Pro pillar at launch?

Only if each pillar passes its own proof gate. Code presence is not launch evidence. A narrower truthful offer is better than a broad promise that fails on a signed device, TestFlight, live provider, or multi-account flow.

### 10. Is the existing paywall interaction reusable?

Yes. Keep the drawer/interstitial model. Replace its retired reasons, benefits, and purchase truth; add the missing entry points; and make all entry paths converge on the same policy.

### 11. Is the work primarily product marketing or engineering?

Both, plus release operations. The offer is not real until copy, store configuration, entitlement enforcement, lifecycle, provider cleanup, analytics, support, App Review, and signed-runtime proof agree.

### 12. What is the highest-risk launch failure?

A mismatch between the promise and trusted behavior: charging for a stated-Free capability, letting a Free request reach a paid provider, revoking access at cancellation, displaying a trial to an ineligible person, or advertising an unproven feature.

### 13. Is Screen Time itself incompatible with monetization?

No categorical conclusion is justified. Apple's Guideline 4.10 creates a real
review risk around monetizing built-in capabilities, including Screen Time APIs,
while currently distributed apps demonstrate that Apple has approved paid
advanced blocking, automation, and family products. Kwilt should treat this as
a yellow evidence-and-positioning gate: preserve meaningful Free Screen Time,
sell Kwilt-created composition/coordination value, prove the Family Controls
entitlement and signed-device behavior, prepare exact App Review notes, and keep
a remote fallback that removes Screen Time from the paid promise if rejected.

### 14. Should a creator code be the subscription or entitlement mechanism?

No. Apple/StoreKit and RevenueCat remain the subscription and entitlement
truth. A Kwilt creator code identifies a campaign and optional activation
experience. A server-owned attribution links a qualified pre-purchase claim to
later lifecycle events; a separate commission ledger decides creator payout.

### 15. Should Apple offer codes power the first creator pilot?

No. They are a useful later promotion type, but each code is tied to configured
subscription offers/products and eligibility. The first pilot should use the
ordinary Apple introductory offer when eligible, plus a creator-specific
seven-day challenge/template. This avoids discount confusion while Kwilt learns
whether the channel creates retained paid value.

## Current-state findings

Priorities mean:

- **P0:** blocks a safe monetization launch;
- **P1:** blocks a coherent offer or supportable launch;
- **P2:** can follow the first safe launch but should be tracked.

### P0 — Old Free-feature gates are still active

Evidence:

- `src/services/paywall.ts` still declares Arc/Goal limits and Pro-only banners, calendar export, Focus, attachments, views/filters, streak protections, and an additional-institution gate.
- `src/domain/limits.ts` still enforces one Free Arc and three active Goals per Arc.
- `src/features/paywall/PaywallDrawer.tsx` and `src/features/account/ManageSubscriptionScreen.tsx` still sell “unlimited” structure and other capabilities now defined as Free.
- old checks remain in Arcs, Goals, Activities, Plan, Focus, celebrations, onboarding, and attachment flows.
- attachment Edge Functions still perform Pro checks even though attachments are part of Free.

Impact: the current app contradicts the accepted product contract and can create bait-and-switch perception.

Required outcome: remove the rules rather than bypassing them in selected screens, then add a ratchet test that fails if a retired reason or limit returns.

### P0 — Paid capability enforcement is fragmented

Evidence:

- there is no single typed list that declares every Pro capability and its contextual reason;
- the current paywall reason list is historical rather than policy-driven;
- direct server/provider paths use different entitlement sources;
- several flows can be entered through screens, restored navigation, Chat, or external tools without a shared decision.

Impact: customers can receive different answers for the same intent, and UI-only locks can be bypassed.

Required outcome: one fail-closed `ProCapability` policy for product meaning, plus trusted enforcement at navigation/orchestration and server/provider boundaries.

### P0 — The retired partial trial still grants access

Evidence:

- `isProToolsTrial` remains in `src/services/entitlements.ts`, `src/store/useEntitlementsStore.ts`, `src/store/proToolsAccess.ts`, generative-credit logic, attachment logic, admin logic, and server agent entitlement.
- the old `pro_tools_trial` entitlement still affects customer access decisions.
- the public Terms still names “Pro Tools Trial.”

Impact: the customer can receive a partial state that differs from the Pro product and from the accepted introductory-offer promise.

Required outcome: retain historical data compatibility but remove `pro_tools_trial` from current access, customer copy, offerings, and analytics segmentation. Apple introductory periods must set normal `isPro` through RevenueCat.

### P0 — AI quota can trust a client claim

Evidence:

- `supabase/functions/ai-chat/index.ts` reads `x-kwilt-is-pro` to choose the higher quota.
- the app writes the same header from client entitlement state.
- `supabase/functions/_shared/serverAgentEntitlement.ts` checks only the internal entitlement table and treats the old trial as Pro; it does not resolve the full purchase-mirror-plus-internal-grant union.

Impact: a client-controlled header is not a valid authorization boundary, and paid state can disagree across Chat, phone/background agents, and support tooling.

Required outcome: resolve Pro from authenticated server data, classify the requested job on the server, count only successful usable user-initiated results, and treat client fields as telemetry only.

### P0 — Money and Budgets are not gated from first setup and active use

Evidence:

- `MoneySetupScreen.tsx` prepares Plaid before its current “additional institution” decision.
- `MoneySummaryScreen.tsx` and `MoneyAccountsScreen.tsx` can start Plaid directly.
- `supabase/functions/create-plaid-link-token/index.ts` verifies identity but not Pro.
- the active deployed source for `exchange-plaid-public-token` and `sync-plaid-transactions` is referenced but not checked into this repository, preventing a complete source audit.

Impact: Free clients can initiate provider cost and active Money mutations, and
the team cannot safely modify or prove the full live lifecycle from the
repository.

Required outcome: recover deployed source first; gate first Money setup, Link
token, exchange, relink, sync, and active budget/transaction mutations using
trusted Pro; do not build a manual transaction substitute; preserve readable
history after downgrade; and defer automatic disconnection until lifecycle
reconciliation is proven.

### P0 — Free Live Conversation needs production cost and exposure controls

Evidence:

- `src/features/unifiedChat/UnifiedChatScreen.tsx` starts Live Conversation
  without a shared exposure/cost-safety decision.
- `src/features/liveConversation/liveConversationSessionClient.ts` requests an ephemeral session and opens the realtime provider.
- `supabase/functions/live-conversation-session/index.ts` verifies the signed-in
  person but has no server exposure switch or bounded session-cost decision
  before creating an OpenAI client secret.

Impact: an authenticated Free MVP can create uncapped provider cost or remain
reachable after the team decides to hide it.

Required outcome: keep Live Conversation available without a paywall while the
MVP exposure flag is on, but require authentication, bounded per-user/global
cost controls, and server-side flag enforcement before secret/session
creation. When the flag is off, stale and direct entry returns an honest
unavailable state rather than an upgrade prompt.

### P0 — External MCP is exposed without a declared Pro boundary

Evidence:

- `supabase/functions/mcp/index.ts` performs OAuth, token, scope, and tool authorization but does not declare the commercial Pro requirement.
- `src/features/account/ConnectedToolsScreen.tsx` publishes the MCP endpoint without a Pro decision.

Impact: an explicitly promised-Pro surface can remain available outside the app even if its visible setup UI is later gated.

Required outcome: require trusted Pro at OAuth approval/token use and tool execution, while keeping revocation and subscription-management recovery available.

### P0 — RevenueCat webhook handling is not safe enough for teardown

Evidence in `supabase/functions/pro-codes/index.ts`:

- webhook secret verification is optional when configuration is absent;
- cancellation is projected as immediate loss of Pro rather than a renewal-state change with a paid-through date;
- billing issue, test, expiration, and product-change semantics are not modeled as a durable lifecycle reducer;
- the subscription mirror is a latest-row projection without a provider-event ledger protecting duplicate and out-of-order delivery.

Impact: entitlement can be revoked early or regressed, and destructive provider cleanup cannot safely depend on the mirror.

Required outcome: fail closed without a secret; store event identity; apply an idempotent, order-tolerant reducer; preserve paid/grace access; revoke on confirmed expiration/refund; and record cleanup receipts.

### P1 — Cook Mode and Live Conversation need preview controls, not Pro gates

Evidence:

- Recipe Home, Readiness, Cook Mode, cook-session runtime, restored navigation,
  Chat handoff, and Live Conversation session creation exist without one shared
  MVP exposure and provider-cost safety policy.

Impact: provider cost can be unbounded, a stale client can bypass a UI-only
flag, or marketing can overstate two weak capabilities.

Required outcome: classify `cook_mode` and `live_conversation` as
`free_preview`, with no `isPro` check or paywall. Keep their exposure flags on
for the intended MVP launch, enforce those flags at customer and provider entry,
and add bounded cost controls and telemetry. Exclude both from headline
purchase reasons and creator claims. Reclassification to Pro is a later,
explicit product decision.

### P1 — Advanced and Family Screen Time lack a complete paid boundary

Evidence:

- the personal composite builder already supports `all`/`any` connectors and
  conditions for real-step completion, Focus, daily usage, time of day, and
  Money review, but no shared policy classifies basic versus paid advanced rules;
- Household settings and member/detail paths navigate into device and family-control setup without Pro policy.
- family Screen Time commands and server/RPC mutations do not distinguish paid administration from safety-reducing release/disable operations.
- Chat can invoke the same family-control actions.
- the Free rule journey does not yet have one deliberate upgrade sequence across
  overview, builder, post-save, detail, family learning, and Chat entry points.

Impact: Kwilt can either give away its most differentiated rule composition,
charge too broadly for Apple's base capability, answer inconsistently by entry
path, or trap a person/family in restrictive state after expiration.

Required outcome: keep unlimited basic one-condition personal rules Free;
require Pro for compound AND/OR, real-step, and Money-linked personal rules and
for family enroll/deliver/create/tighten/extend/override work. At confirmed
expiration/refund, deactivate each advanced/family rule as a whole, preserve its
readable dormant definition, clear desired enforcement, and track native release
receipts without claiming offline success. Never auto-convert or auto-reactivate
it. Always permit read, release, delete, revoke, and cleanup. Add progressive,
contextual upgrade paths that preview and preserve the intended rule, plus
signed-device, distribution-entitlement, App Review, and remote fallback
evidence before marketing the paid Screen Time pillar.

### P1 — Trial and price presentation can be untruthful

Evidence:

- `ManageSubscriptionScreen.tsx` infers trial presentation from product intro metadata rather than the person's current introductory eligibility.
- it contains hardcoded fallback prices and stale value copy.
- the installed RevenueCat SDK exposes introductory eligibility checks, but the current screen does not use them as the source of display truth.

Impact: an ineligible person can see trial language, and a storefront can see a price that did not come from the live store.

Required outcome: use the live package, localized price, cadence, and eligibility; show a recoverable unavailable state if packages cannot be loaded; keep Restore and Manage available.

### P1 — Marketing, legal, support, and App Store truth are incomplete

Evidence:

- `/Users/andrewwatanabe/kwilt-site/app/(site)/pricing/page.tsx` redirects to `/#pricing`, but the current home surface has no verified pricing section.
- `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx` still references “Pro Tools Trial.”
- the public site does not currently present the accepted Free/Pro feature and price story.
- launch artifacts do not yet include a single current matrix for in-app copy, site copy, support FAQ, App Store metadata/screenshots, review notes, downgrade expectations, and Family Sharing clarification.

Impact: people, support, and App Review can receive different descriptions of the same subscription.

Required outcome: create one approved message matrix and apply it everywhere using live storefront pricing where required.

### P1 — Launch proof must follow the narrowed paid promise

Evidence:

- Money and Budgets still need one-month-trial activation, signed-device Plaid
  OAuth/relink/sync, active budgeting, downgrade, and TestFlight/provider proof.
- Screen Time is the accepted launch pillar. The current job-flow ledger still
  names signed personal/family device, enrollment, enforcement, release, and App
  Review evidence that must be refreshed against the release candidate.
- Cook Mode's key cooking steps remain 1/5 in the current job flow. It is an
  available Free MVP, not a launch-marketed pillar.
- Live Conversation retains unresolved device/provider proof. It is an
  available Free MVP, not a launch-marketed pillar.

Impact: the paywall can sell an unproven Pro pillar, or an exposed Free preview
can be broken, unbounded, or impossible to hide safely.

Required outcome: maintain separate decisions for subscription access,
provider-cost safety, customer exposure, and marketing. The headline paywall
benefit list contains only value-led Pro pillars. Free previews have no paywall,
but their provider routes remain authenticated, bounded, observable, and
remotely disableable.

### P1 — Creator acquisition has traffic paths but no commercial control plane

Evidence:

- the public site has referral/campaign routing and the app has install identity,
  but App Store installation does not reliably preserve a payout-grade creator identity;
- the existing referral system rewards installs with AI credits and should not
  be repurposed as commercial partner accounting;
- the RevenueCat webhook currently discards creator-relevant lifecycle fields
  and is not yet authentic, idempotent, or period-correct enough for payouts;
- there is no campaign claim policy, immutable commission/reversal ledger,
  disclosure/claim approval register, or privacy-safe payout operation.

Impact: Kwilt could overpay for trials, underpay a creator after a real renewal,
create attribution disputes, imply a non-existent discount, or mix partner
economics with customer entitlement.

Required outcome: build the companion five-creator pilot with a first-qualified
pre-purchase claim, ordinary Apple purchase, first-paid-period fixed bounty,
30-day hold, refund reversal, RLS/service-role isolation, approved disclosures,
and manual reviewed payouts. This finding blocks paid creator traffic, not the
general App Store launch.

### P2 — Unit-economics decisions need observed data

The 50/1,000 limits and current price points are reasonable launch hypotheses, not proven optima. The first release should instrument cost and conversion by job and paid intent. Weighted credits, new limits, win-back offers, or add-ons should wait for observed provider cost, conversion, retention, and support burden.

## Paid entry-point and enforcement matrix

| Capability | Contextual client intent | Alternate paths to cover | Trusted boundary | Downgrade behavior | Current readiness |
| --- | --- | --- | --- | --- | --- |
| Money and Budgets | Start Money, connect, plan, review, relink, refresh | Entry, Summary, Accounts, Setup, categories, transactions, deep link, Chat | first setup, Link token, exchange, sync, active Money mutations, webhook cleanup | history remains readable; editing and connection pause after expiry | P0 gaps; live source incomplete |
| Advanced personal Screen Time | Add a second condition, AND/OR, real step, or Money condition | overview, builder, post-save, detail, restored draft, deep link, Chat, native projection | shared rule classifier plus trusted server guard for linked truth | deactivate whole rule at expiry; readable dormant definition; release receipt; reviewed reactivation | classifier and progressive upgrade path absent; signed-device/review proof pending |
| Family Screen Time | Enroll, deliver, tighten, extend, or override family controls | family learning, Household settings, member detail, Chat, RPC | enrollment and every restrictive/cross-device mutation | deactivate whole rule at expiry; deactivation pending until child-device receipt; no automatic restart | gating absent; two-device proof pending |
| Advanced cloud AI | request hard-Pro job or exceed Free allowance | every capability AI entry, Chat, retry | server job class and quota | in-flight may finish; new work follows Free | trusted entitlement incomplete |
| AI scheduling | ask Kwilt to schedule automatically | Plan, Chat, background | server tool/job execution | manual scheduling remains Free | legacy reason exists; enforcement audit needed |
| Background/proactive AI | schedule or run agent | mobile, phone, scheduled tick | create and execute job | future paid runs stop | entitlement union incomplete |
| External agent/MCP | connect or execute external client | Connected Tools, OAuth, token, tools | approval/token/tool execution | revoke/manage remain available | commercial gate absent |
| Cook Mode MVP preview | start assisted cooking while preview is enabled | Recipe Home, Readiness, restored route, deep link, Chat, speech endpoint | authenticated exposure flag plus bounded provider usage/cost controls; no Pro check | no subscription effect; stored Cook state and Recipe content remain available | MVP may ship on; minimal runtime proof and remote-hide path required |
| Live Conversation MVP preview | start realtime voice while preview is enabled | Chat composer, restored state, deep link, direct session request | authenticated exposure flag plus bounded provider usage/cost controls; no Pro check | no subscription effect; typed Chat remains available | MVP may ship on; signed-device smoke proof and remote-hide path required |

## Product-marketing launch contract

The offer should be expressed consistently as:

- **Free:** “A complete place to organize your life and household.”
- **Pro:** “Build a living budget and create smarter Screen Time rules connected to real life.”
- **MVP previews:** Cook Mode and Live Conversation are available without Pro
  while enabled; they are not subscription benefits or headline claims.
- **Trial:** “Try all of Kwilt Pro for one month” only for an eligible storefront account.
- **Family:** “The same Kwilt Pro, shareable through Apple Family Sharing.”

Benefit copy must describe an outcome and a recurring service, not an internal object limit. Avoid “unlimited everything,” “30-day trial,” or language that implies Family controls Kwilt household membership.

Every launch surface must also make these expectations easy to find:

- live price and billing cadence;
- auto-renewal and how to cancel;
- restore purchases;
- what happens at cancellation versus expiration;
- what data remains after downgrade;
- whether a feature needs a supported device, household role, financial provider, or signed-device permission;
- privacy and safety boundaries for Money, AI, and family controls.

For Screen Time, launch copy names Kwilt's differentiated value—compound rules,
conditions connected to real life, family coordination, and delivery
receipts—not “unlock Screen Time” or “pay to block apps.” Creator content must
use the same approved promise and disclose the paid relationship in the content
itself.

## Analytics and unit-economics assessment

The launch needs one funnel with the paid intent carried end to end:

`paid_intent_selected → paywall_viewed → upgrade_cta_tapped → purchase_started → trial_started/purchase_succeeded → paid_capability_started → paid_value_completed`

Lifecycle events must include renewal, cancellation, billing issue, grace recovery, expiration, refund, restore, and resubscribe. Provider activity must include job/capability, route, provider, billing class, entitlement state, success class, user-credit cost, and server cost category without customer content.

Screen Time telemetry is limited to access class, bounded condition types/count,
scope, mutation class, and desired/applied outcome. Creator telemetry adds
opaque campaign/claim lineage, challenge start/completion, first paid period,
commission state, reversal, and payout batch. Neither may contain app identities,
rule sentences, child names, Activities, Goals, Chat, Money content, or creator
bank/tax data.

Required questions after launch:

- Which intent produces trial starts and paid retention?
- Which paid capability reaches completed value during the trial?
- What is provider cost per active Free, trial, and paid user, including Cook
  Mode and Live Conversation as separate Free previews?
- What percentage of locally eligible jobs completes locally?
- Are Free activation and four-week retention stable after retired gates disappear?
- Where do people encounter subscription-unavailable, purchase-failed, restore, billing, or entitlement mismatch states?
- Which creator promise and partner produce completed paid value, renewal, and sustainable payback rather than installs or trials alone?

Do not optimize the price or quota from paywall conversion alone. Include retained paid value, provider margin, refund/cancellation, and support burden.

## Operations and support assessment

Support needs a privacy-safe view that can answer:

- What product did Apple/RevenueCat report?
- Is the subscription in trial, paid, cancelled-but-active, grace, expired, or refunded state?
- What expiration timestamp is authoritative?
- Is an internal comp/support grant active?
- What state did the client last observe?
- Was a provider cleanup scheduled, attempted, completed, retried, or reversed?
- Can the person restore or resubscribe safely?

Operational controls must never require support to inspect Money transactions, Chat text, family rules, or other private customer content.

## Launch sequencing recommendation

### Gate 1 — Contract and provenance

- freeze the branch/commit and store/backend configuration inventory;
- recover live Plaid function source;
- reconcile the known production subscriber;
- approve the message matrix and marketed capability set.

### Gate 2 — Free and Pro policy

- add the canonical capability policy;
- remove all retired gates and partial-trial access;
- update the contextual interstitial and subscription screen;
- add progressive Screen Time upgrade paths inside Free overview, builder,
  post-save, detail, family-learning, and Chat flows;
- add policy ratchets and Free regression tests.

### Gate 3 — Trusted enforcement and lifecycle

- harden webhook/mirror/event handling;
- establish the trusted server entitlement union;
- enforce AI, background, MCP, Money, and personal/family Screen Time boundaries;
- add authenticated cost controls and server-controlled exposure flags to Cook
  Mode and Live Conversation without adding a Pro gate;
- implement downgrade and cleanup receipts;
- classify basic/advanced personal Screen Time and family paid/safety mutations
  consistently, including whole-rule deactivation and reviewed reactivation;
- prepare Guideline 4.10 review evidence and the remotely controlled Screen Time fallback.

### Gate 4 — Public promise and operations

- align website, Terms, support, App Store, review notes, analytics, dashboards, and runbooks;
- configure products, introductory offers, Family Sharing, webhook secret, and billing grace;
- choose only launch-proven paid pillars for customer-facing copy;
- keep creator promotion approval separate from ordinary marketability.

### Gate 5 — Runtime proof and release

- pass source and diff-aware checks;
- run Free and paid-path Simulator checks where meaningful;
- run signed-device capability proof;
- run Sandbox/TestFlight lifecycle matrix;
- verify deployed backend and store configuration;
- hold, narrow, or release based on the evidence rules.

### Gate 6 — Creator pilot, independently after core readiness

- approve five Marcus-aligned digital-wellness/productivity creators and one evidence-backed Screen Time promise;
- prove landing, pre-purchase claim, Apple purchase, first paid period, 30-day hold, refund reversal, and payout reconciliation;
- require FTC disclosures and privacy-safe campaign operations;
- run six weeks, then `Proceed`, `Revise`, or `Retire` from retained paid value and modeled payback;
- do not hold a safe general Pro release merely because creator acquisition remains unready.

## Go/no-go scorecard

| Area | Current status | Release condition |
| --- | --- | --- |
| Product boundary | Strategy accepted; code drifted | no retired gates; all Pro capabilities declared |
| Paywall experience | reusable but stale; Screen Time upgrade journey incomplete | contextual reasons, outcome previews, work-preserving return, live price/eligibility, Restore |
| Entitlement | multiple active truths | trusted union; one customer-facing `pro`; no partial trial |
| Purchase lifecycle | incomplete/unsafe | authenticated, idempotent, order-tolerant, period-correct |
| AI and agents | server trust gap | trusted policy and successful-result metering |
| Money and Budgets | first setup, provider calls, and active mutations not gated | one-month full-Pro trial at first setup; all active operations gated; readable-history expiry cleanup |
| Advanced personal Screen Time | composite builder exists; no paid classifier | useful Free baseline; progressive upgrade path; paid compound/unique conditions; whole-rule expiry deactivation; signed-device and App Review evidence |
| Family Screen Time | ungated | paid coordination; free safety-reducing actions; whole-rule expiry deactivation and two-device release receipts |
| Cook Mode and Live Conversation | variable-cost Free MVP previews; low-value today | no paywall; authenticated bounded provider use; exposure flags default on but can hide safely; no headline subscription/creator claim |
| PMM/legal/support | inconsistent/incomplete | one message matrix applied across all surfaces |
| Feature readiness | mixed and proof-bounded | every marketed pillar passes its own runtime gate |
| Creator acquisition | link/referral pieces only | first-party claim, Apple-linked lifecycle, commission/reversal ledger, approved claims/disclosures, reconciled pilot |
| Release evidence | not run for this contract | full Sandbox/TestFlight lifecycle and production reconciliation |

Current overall decision: **No-go for public monetization release; proceed with implementation.**

## Decisions intentionally deferred

- changing the $9.99/$59.99 Individual or $14.99/$79.99 Family price points;
- weighted cloud credits or capability-specific quotas;
- add-ons, à-la-carte purchases, or multiple Pro tiers;
- promotional or win-back offers beyond the introductory offer;
- creator-specific Apple offer codes, lifetime revenue share, automated payouts,
  self-serve creator portal, multi-touch attribution, or an external attribution SDK;
- advertising a paid pillar that has not met its runtime proof gate.

These are learning decisions after the launch system is trustworthy, not prerequisites for implementation.

## Current policy references

- [Apple App Review Guidelines, including auto-renewable subscriptions](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: Request the Family Controls distribution entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
- [Apple: Set up introductory offers for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- [Apple: Set up subscription offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/)
- [RevenueCat: Event types and fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [RevenueCat: Common webhook flows](https://www.revenuecat.com/docs/integrations/webhooks/event-flows)
- [RevenueCat: Attribution](https://www.revenuecat.com/docs/integrations/attribution)
- [FTC: Disclosures 101 for social media influencers](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)

## Implementation plan

The core file-by-file execution plan is `docs/superpowers/plans/2026-08-31-kwilt-monetization-release-readiness.md`. The separate creator acquisition subsystem is planned in `docs/superpowers/plans/2026-08-31-kwilt-creator-acquisition-pilot.md`. The core plan supersedes `docs/superpowers/plans/2026-08-26-kwilt-free-pro-gating.md`, which remains as historical planning context.

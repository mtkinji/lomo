---
id: brief-creator-acquisition-pilot
title: Creator acquisition pilot
status: draft
audiences: [audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Marcus, Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs:
  - brief-monetization-paywall-revenuecat
  - brief-screen-time-rule-governance
owner: andrew
last_updated: 2026-08-31
---

# Creator acquisition pilot

## Context

Kwilt's next launch needs a repeatable way for creators to demonstrate a real
customer job, carry campaign identity through App Store installation, and earn
compensation only when that introduction produces retained paid value. The
current friend-referral loop rewards installs with AI credits; it is not an
affiliate ledger. Apple offer codes can support later promotions, but they do
not replace a first-party campaign claim, activation experience, attribution
policy, commission reducer, or payout audit trail.

The pilot remains entirely compatible with App Store billing: the customer
buys the ordinary auto-renewable subscription through StoreKit, RevenueCat
projects the subscription lifecycle, and Kwilt separately decides whether an
authenticated lifecycle event creates or reverses a creator commission.

## Target audience

The primary audience is `audience-burned-out-productivity-power-users`.
Creator content should meet them at a concrete moment—wanting a meaningful
action to happen before a drift app opens—rather than sell another generalized
productivity system. `audience-aspirational-family-organizers` is a later wave,
after family Screen Time works across caregiver and child devices.

## Representative persona

Marcus has already tried enough tools. A trusted creator can earn attention by
showing one calm, inspectable guardrail: for example, selected apps remain
paused until a real Kwilt step is complete during a chosen time or usage
condition. He needs the campaign page, app claim, activation challenge, and
subscription offer to describe the same thing without hype or hidden terms.

Maya becomes the secondary persona only after Kwilt can prove child enrollment,
caregiver authority, policy delivery, desired/applied receipts, and safe release
on signed devices.

## Aspirational design challenge

How might we help Marcus move from a trusted creator's concrete demonstration
to a truthful Kwilt experience and retained paid value, while preserving Apple
billing truth, customer privacy, and calm choice?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — creator acquisition succeeds only when
it helps someone make real progress on what matters. Installs, claims, and trial
starts are intermediate signals rather than the result.

## Job flow step

In `job-flow-marcus-move-the-few-things-that-matter`, **Decide what to do next**
is currently 3/5. Plan and recommendations help, but the “what now?” moment is
not yet the product spine. The first creator campaign makes an advanced Screen
Time rule the demonstrated bridge: a chosen real action comes before the drift
app, and the rule gets out of the way when the conditions are met.

This brief does not raise the job-flow delivery score by itself. The score can
change only after the advanced rule is shipped, signed-device behavior is
proven, and actual use improves the step.

## JTBD framing

When Marcus encounters a credible demonstration at the moment he is looking
for relief from phone drift, he wants to understand and try the exact Kwilt
guardrail being shown, so that intention can become action without pressure or
another system to maintain. This directly serves
`jtbd-put-intention-before-impulse` and
`jtbd-carry-intentions-into-action`; deterministic terms, private attribution,
and auditable compensation preserve `jtbd-trust-this-app-with-my-life`.

## Design

### Chosen model

Use a **first-party creator claim plus ordinary Apple purchase**:

1. A creator publishes an approved demonstration and clear sponsorship or
   affiliate disclosure.
2. `/c/<creator-slug>` presents the matching job, challenge, prerequisites, and
   App Store handoff. Campaign parameters provide aggregate top-funnel evidence.
3. After install, Kwilt offers one skippable pre-purchase creator-code claim.
4. The server validates the campaign and records the first qualified claim for
   the install. On sign-in it associates that immutable attribution with the
   authenticated user and RevenueCat app user ID.
5. Claiming provides the creator's optional seven-day challenge or template. It
   does not unlock Pro, alter entitlements, or guarantee a discount.
6. The challenge enters the same useful Free Screen Time journey as an organic
   user. Pro remains visible through the standard overview, builder, post-save,
   rule-detail, family-learning, and Chat upgrade paths. The contextual paywall
   appears only when the customer requests paid value, preserves the intended
   rule, and carries campaign context for attribution only. There is no
   creator-specific entitlement, price, or pressure pattern. Apple manages
   product, price, introductory eligibility, purchase, renewal, cancellation,
   and refund; RevenueCat carries the lifecycle into Kwilt.
7. A server-side commission reducer turns qualifying RevenueCat lifecycle events
   into immutable accruals, holds, approvals, reversals, and payout items.

### Pilot audience and promise

- Pilot with five US-based creators for six weeks.
- Start with digital-wellness and thoughtful productivity creators whose
  audience resembles Marcus.
- Use one approved promise: **put a real step between intention and impulse with
  conditions that connect Screen Time to the rest of your life**.
- Market advanced personal rules only after compound conditions and unique
  Kwilt-linked conditions pass signed-device proof and App Review positioning.
- Do not market family Screen Time through creators until a caregiver/child
  two-device corpus passes enrollment, delivery, receipt, replacement, and
  release evidence.

### Customer benefit

The pilot customer receives:

- the standard Apple introductory offer only when StoreKit reports eligibility;
- a creator-specific, optional seven-day challenge or template;
- the same Kwilt Pro feature bundle, price truth, Restore behavior, downgrade
  behavior, and privacy contract as any other subscriber.

There is no creator-specific Apple discount in the first pilot. Later Apple
offer-code experiments are separate campaign types tied to specific products
and eligibility. They must never be described as stacking with an introductory
offer unless the live store proves that exact behavior.

### Attribution policy

- A link click alone is aggregate analytics and never creates an individual bounty.
- The first valid creator-code claim wins.
- A claim must happen before purchase and within 30 days of the campaign entry.
- The customer cannot switch the attribution after it qualifies.
- A later login associates, but does not replace, the install-owned claim.
- RevenueCat campaign attributes may mirror the resolved campaign for reporting;
  they are not payout authority and are never set from unverified client input.
- Preexisting subscribers, self-referrals, Sandbox events, duplicate Apple
  Family Sharing recipients, and other configured fraud/eligibility exclusions
  do not qualify unless an approved win-back campaign says otherwise.

### Compensation policy

Use a contracted fixed production fee plus a campaign/product-specific fixed
cost-per-acquisition bounty. Do not offer lifetime revenue share in the pilot.

A bounty becomes pending only after the first event that starts a real paid
period: normally the first `RENEWAL` after an introductory trial, or a paid
`INITIAL_PURCHASE` when no trial applies. A trial-period `INITIAL_PURCHASE` does
not qualify. Hold the bounty for 30 days. A refund or qualifying reversal
creates an immutable negative commission event and offsets the pending or next
payable balance. Reviewed payout batches remain manual during the pilot.

### Data model

Add server-owned records for:

- `kwilt_creator_partners` — partner identity and operational status;
- `kwilt_creator_campaigns` — code, slug, promise, storefront, dates,
  compensation terms, and approved-claim version;
- `kwilt_creator_attributions` — install, optional authenticated user,
  campaign, first-qualified timestamps, and status;
- `kwilt_creator_commission_events` — immutable qualifying, hold, approval,
  reversal, and void events keyed to provider transaction identity;
- `kwilt_creator_payouts` and payout items — reviewed batch identity and the
  exact commission events included.

The public schema is explicitly unexposed: enable RLS, grant neither `anon` nor
`authenticated` direct table access, and use authenticated/service-role Edge
Functions for bounded operations. Public campaign resolution returns only safe
campaign copy and status. Claim creation derives the user from verified auth
when present, never a user ID supplied by the body.

Kwilt stores no creator bank or tax details. Those remain with a contracted
payout/tax provider or the manual operator process until program volume justifies
an integration.

### Privacy and claim governance

Campaign and commission records may contain opaque partner, campaign, install,
user, RevenueCat, and transaction identifiers plus bounded lifecycle enums,
prices, currency, tax/commission estimates, and timestamps. They never contain
selected app identities, Apple Screen Time tokens, rule sentences, child names,
Activities, Goals, Chat content, Money categories, or financial transactions.

Every creator script and landing page maps claims to a paid-pillar evidence
register. The FTC disclosure must be hard to miss and travel with the content.
Campaigns can be paused remotely without changing any customer's subscription.

### Creator waves

1. **Wave 1 — Marcus / digital wellness:** advanced personal Screen Time,
   compound rules, and Kwilt-linked conditions after signed-device and review proof.
2. **Wave 2 — Maya / family organization:** family Screen Time coordination only
   after two-device caregiver/child proof and an approved App Store claim.
3. **Wave 3 — capability specialists:** Money, Food, and AI creators only as each
   pillar passes its own provider/runtime and marketability gate.

## Learning release

Ship a production-small pilot to five contracted creators. The creator channel
is gated separately from the core Pro release: a creator pilot failure cannot
revoke or delay a safe general subscription launch, but no paid creator traffic
runs until the campaign pipeline, advanced Screen Time evidence, App Review
positioning, disclosures, attribution, lifecycle reducer, and commission
reconciliation pass.

## Success signal

At least three of five creators produce one or more qualified first paid
renewals, claimed cohorts complete the promised advanced Screen Time activation
more often than a comparable organic Pro-intent cohort, attribution and refund
reconciliation has no unexplained material variance, and modeled 12-month net
revenue is at least three times fully loaded creator acquisition cost.

Installs, clicks, claims, and trial starts are diagnostic metrics. A retained
paying customer who completed the promised job is the unit of success.

## Spec refinement

The pilot is buildable without choosing a long-term creator platform or payout
provider. Implementation must preserve these non-deferred decisions: Apple owns
purchase truth; first qualified pre-purchase claim wins; link-only traffic earns
no bounty; the first real paid period starts a fixed bounty; refund creates a reversal;
private product content never enters attribution; and no creator-specific
discount ships in the first pilot.

The compensation amounts, five creator identities, exact challenge content,
and organic comparison window remain operator-owned configuration. They do not
change the technical contract.

## Open questions

- Which five creators meet the audience, disclosure, content-quality, and approved-claim bar?
- What fixed production fee and SKU-specific bounty preserve the target payback after Apple commission, refunds, and support cost?
- Which external contract, tax, and payout workflow will hold creator PII during the manual pilot?

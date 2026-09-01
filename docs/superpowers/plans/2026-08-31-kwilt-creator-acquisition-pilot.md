# Kwilt Creator Acquisition Pilot Implementation Plan

> **For agentic workers:** Execute task by task with `executing-plans`. Apply
> `pragmatic-tdd-posture`: tests first for attribution, commission, webhook,
> persistence, authorization, and lifecycle logic. Do not create a worktree
> unless Andrew explicitly approves parallel implementation.

**Goal:** Run a five-creator, six-week US pilot that connects an approved
advanced Screen Time promise to a deterministic pre-purchase campaign claim,
ordinary Apple subscription, retained paid conversion, and auditable creator
compensation without exposing private customer data.

**Architecture:** Extend Kwilt's install identity and authenticated user mapping
with a server-owned first-qualified creator attribution. Apple/StoreKit remains
the checkout and RevenueCat remains the subscription-lifecycle source. A pure,
idempotent server reducer converts verified RevenueCat events into immutable
commission events and reviewed payout batches. The site supplies the campaign
landing; the app supplies the optional pre-purchase claim and activation handoff.

**Tech Stack:** React Native/Expo, TypeScript, RevenueCat/StoreKit, Supabase
Postgres with RLS, Supabase Edge Functions/Deno, Next.js, PostHog/site analytics,
Jest, Deno tests, and the existing Kwilt super-admin surface.

**Repositories:**

- app/backend/docs: `/Users/andrewwatanabe/Kwilt`
- creator landing pages: `/Users/andrewwatanabe/kwilt-site`

**Depends on:**

- `docs/superpowers/plans/2026-08-31-kwilt-monetization-release-readiness.md`
- `docs/feature-briefs/creator-acquisition-pilot.md`
- advanced Screen Time signed-device and App Review marketability gates

---

## Pilot invariants

1. A creator code never grants Pro. Apple purchase truth grants `pro` through RevenueCat.
2. Link-only traffic is aggregate analytics and earns no individual bounty.
3. First qualified claim wins; it occurs before purchase and within 30 days of campaign entry.
4. The claim belongs first to the install and is associated, not replaced, when a user signs in.
5. The first real paid period creates the fixed bounty—usually renewal after a trial, or a paid initial purchase when no trial applies. Trial start does not.
6. Bounties hold for 30 days. Refunds/reversals create immutable negative events.
7. Sandbox, self-referrals, existing subscribers, and duplicate Family Sharing recipients do not qualify unless a campaign explicitly says otherwise.
8. Creator, campaign, attribution, commission, and payout tables are not directly exposed to `anon` or `authenticated` roles.
9. No selected apps, rule text, child identity, Activities, Goals, Chat, Money content, bank data, or tax data enters creator records or analytics.
10. No paid creator traffic begins until disclosure, approved claims, lifecycle reconciliation, and the advertised capability's release evidence pass.
11. Creator-channel readiness is separate from core Pro readiness. Pausing the pilot never changes customer entitlements.

## Phase 0 — Freeze the pilot contract and claims

### Task 0.1 — Add the creator campaign register and operating ledger

**Files:**

- Add: `docs/marketing/creator-campaign-register.md`
- Add: `docs/operations/creator-acquisition-pilot-runbook.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Record five provisional creator slots, audience fit, campaign owner, storefront, live dates, compensation version, approved promise, disclosure copy, landing status, and capability evidence dependency.
- [ ] Keep partner legal identity, payment details, tax records, secrets, and negotiated amounts out of the repository.
- [ ] Add independent switches for campaign resolution, new claims, commission accrual, and payout approval.
- [ ] Mark every creator campaign `not approved` until the script, landing page, disclosure, and runtime proof are reviewed.
- [ ] Define stop rules for inaccurate claims, abnormal refunds, disputed attribution, privacy incident, App Review concern, or reconciliation variance.

**Commit:** `docs(creators): define pilot operations and claim approval`

### Task 0.2 — Extend the RevenueCat lifecycle ledger with creator-safe fields

**Files:**

- Modify: `supabase/functions/_shared/revenueCatSubscriptionLifecycle.ts`
- Modify: `supabase/functions/_shared/__tests__/revenueCatSubscriptionLifecycle.test.ts`
- Modify via new CLI migration if needed: `supabase/migrations/*_monetization_subscription_lifecycle.sql`

- [ ] Preserve `event.id`, `app_user_id`, aliases, `transaction_id`, `original_transaction_id`, product, entitlement, environment, event type, period type, price/currency, commission/tax fields, `offer_code`, `presented_offering_id`, `is_family_share`, occurred time, and expiration.
- [ ] Redact the raw payload or retain only a reviewed bounded shape.
- [ ] Prove duplicate and out-of-order delivery does not duplicate subscription or creator effects.
- [ ] Keep creator attribution absent from the RevenueCat event until the server resolves it from Kwilt's own claim.

**Commit:** `feat(subscriptions): preserve creator-safe lifecycle evidence`

---

## Phase 1 — Build the private attribution and commission ledger

### Task 1.1 — Add private creator program schema and RLS

**Files:**

- Add via CLI: `supabase/migrations/*_creator_acquisition_pilot.sql`
- Add: `supabase/functions/_shared/__tests__/creatorAcquisitionSchema.test.ts`

- [ ] Use `npx supabase migration new creator_acquisition_pilot` and keep the generated filename.
- [ ] Add `kwilt_creator_partners`, `kwilt_creator_campaigns`, `kwilt_creator_attributions`, `kwilt_creator_commission_events`, `kwilt_creator_payouts`, and `kwilt_creator_payout_items`.
- [ ] Add immutable identifiers, campaign/compensation versioning, eligibility status, hold/reversal linkage, currency, bounded amount fields, created/occurred timestamps, and operator audit fields.
- [ ] Add unique constraints for normalized campaign code/slug, first qualified attribution, provider event/transaction commission identity, reversal identity, and payout-item membership.
- [ ] Enable RLS on every table and grant no direct access to `anon` or `authenticated`.
- [ ] Explicitly verify API exposure and grants because new public tables are not guaranteed to share historical exposure defaults.
- [ ] Keep all mutation behind service-role functions with a minimal public resolve view/function returning safe copy only.

**Commit:** `feat(creators): add private attribution and commission schema`

### Task 1.2 — Implement the pure attribution policy

**Files:**

- Add: `supabase/functions/_shared/creatorAttribution.ts`
- Add: `supabase/functions/_shared/__tests__/creatorAttribution.test.ts`

- [ ] Write table-driven tests for active/inactive campaign, storefront, campaign dates, first claim, repeated idempotent claim, conflicting claim, 30-day window, claim before/after purchase, existing subscriber, self-referral, install-to-user association, and campaign pause.
- [ ] Return a bounded decision with reason enum; never accept a client-supplied user ID as authority.
- [ ] Keep association idempotent and preserve the original campaign and qualified timestamp.

**Commit:** `feat(creators): define deterministic attribution policy`

### Task 1.3 — Implement the pure commission reducer

**Files:**

- Add: `supabase/functions/_shared/creatorCommission.ts`
- Add: `supabase/functions/_shared/__tests__/creatorCommission.test.ts`

- [ ] Write reducer tests for trial `INITIAL_PURCHASE`, non-trial purchase, first `RENEWAL`, later renewal, Sandbox, Family Sharing, preexisting subscriber, hold expiry, refund, cancellation, expiration, duplicate event, out-of-order event, campaign pause, and manual void.
- [ ] Resolve the configured campaign/product/currency fixed bounty from the campaign version, never from the webhook body.
- [ ] Emit immutable pending, approved, reversed, or voided events rather than mutating accounting history.
- [ ] Prove a refund creates exactly one linked negative event and payout totals derive from ledger rows.

**Commit:** `feat(creators): add idempotent commission accounting`

---

## Phase 2 — Resolve and claim campaigns safely

### Task 2.1 — Add bounded campaign resolution and claim endpoints

**Files:**

- Add: `supabase/functions/creator-campaigns/index.ts`
- Add: `supabase/functions/creator-campaigns/config.toml`
- Add: `supabase/functions/creator-campaigns/__tests__/creatorCampaigns_deno_test.ts`

- [ ] Implement `GET /resolve/<slug-or-code>` with only public title, creator display name, approved promise, challenge summary, storefront, active state, disclosure reminder, and safe destination metadata.
- [ ] Implement `POST /claim` using an install token and optional verified auth session; ignore body user IDs.
- [ ] Implement authenticated `POST /associate` for login continuation and idempotent install-to-user linkage.
- [ ] Apply rate limits, normalized codes, constant-shape invalid responses, RLS/service-role boundaries, and audit-safe errors.
- [ ] Return typed conflicts for expired, inactive, already-qualified, after-purchase, and ineligible claims.

**Commit:** `feat(creators): add safe campaign claim API`

### Task 2.2 — Add the app service and pending-claim persistence

**Files:**

- Add: `src/services/creatorCampaigns.ts`
- Add: `src/services/creatorCampaigns.test.ts`
- Modify: `src/services/installId.ts`
- Modify: `src/services/entitlementsAuthSync.ts`
- Modify: `src/services/entitlementsAuthSync.test.ts`

- [ ] Store only a pending campaign slug/code and first-entry timestamp locally; do not treat it as qualified until the server returns a claim ID.
- [ ] Send install identity to claim, then associate after sign-in through the authenticated path.
- [ ] Clear expired/invalid pending state and retain qualified state only as a bounded display receipt.
- [ ] Set a RevenueCat campaign attribute only after server qualification, and document it as reporting-only.
- [ ] Prove logout/login does not steal, overwrite, or duplicate attribution.

**Commit:** `feat(creators): carry qualified campaign identity into the app`

---

## Phase 3 — Add the customer continuation and activation experience

### Task 3.1 — Handle creator campaign deep links and install continuation

**Files:**

- Modify: `src/navigation/linkingConfig.ts`
- Modify navigation linking tests
- Modify: `src/features/onboarding/FirstTimeUxFlow.tsx`
- Add: `src/features/onboarding/CreatorCampaignClaimStep.tsx`
- Add: `src/features/onboarding/CreatorCampaignClaimStep.test.tsx`

- [ ] Accept `kwilt://creator/<code>` and the approved universal-link continuation shape.
- [ ] Present one skippable, calm claim step only when valid pending campaign context exists.
- [ ] Explain that the code identifies the creator experience and does not unlock Pro or guarantee a discount.
- [ ] Make rejection/retry recoverable without blocking onboarding, capture, or purchase.
- [ ] Prevent claim submission after a purchase is already known.

**Commit:** `feat(onboarding): continue creator campaigns without blocking entry`

### Task 3.2 — Deliver the optional activation challenge

**Files:**

- Modify: `src/features/creator-acquisition/FEATURE.md`
- Add: `src/features/creator-acquisition/CreatorChallengeCard.tsx`
- Add: `src/features/creator-acquisition/CreatorChallengeCard.test.tsx`
- Modify relevant Screen Time rule-builder entry files and tests
- Modify: `src/services/analytics/events.ts`

- [ ] Show the approved seven-day challenge/template after a qualified claim, with Skip and Dismiss.
- [ ] Deep-link to a Free basic rule or advanced draft as appropriate; never silently create or enable a rule.
- [ ] Join the standard Free-to-Pro Screen Time journey from the challenge:
  overview, premium builder choice, successful basic-rule secondary action,
  rule detail, and Chat proposal all use the same policy and copy as organic
  traffic.
- [ ] Open the normal contextual Pro interstitial only when the user selects a
  premium condition/connector or requests an advanced outcome. Preserve the
  draft and return destination across purchase/Restore.
- [ ] Carry the immutable campaign/attribution ID as privacy-safe funnel context
  without changing the offer, entitlement, price, trial eligibility, or prompt
  frequency.
- [ ] Keep the challenge usable even if the campaign later pauses; campaign pause stops new claims/commissions, not customer data access.
- [ ] Instrument challenge start and completion using bounded enums only.

**Commit:** `feat(creators): connect campaigns to a respectful activation challenge`

---

## Phase 4 — Connect verified subscription events to commission

### Task 4.1 — Harden webhook authentication before creator accounting

**Files:**

- Modify: `supabase/functions/pro-codes/index.ts`
- Modify relevant `pro-codes` Deno tests

- [ ] Fail closed when the RevenueCat webhook secret is absent or wrong.
- [ ] Persist provider event identity before projection or creator work.
- [ ] Return success for exact duplicate events only after confirming the stored event.
- [ ] Keep subscription projection and creator commission in one transaction or an idempotent outbox sequence so partial failure is recoverable.

**Commit:** `fix(subscriptions): authenticate creator-relevant lifecycle events`

### Task 4.2 — Resolve attribution and append commission events

**Files:**

- Modify: `supabase/functions/pro-codes/index.ts`
- Modify: `supabase/functions/_shared/creatorCommission.ts`
- Modify focused webhook and reducer tests

- [ ] Resolve the RevenueCat app user ID/aliases to the authenticated Kwilt user and qualified campaign server-side.
- [ ] Reject payout eligibility for Sandbox, Family Sharing recipient duplicates, self-referral, preexisting subscriber, after-purchase claim, inactive/void campaign, or mismatched product/storefront.
- [ ] Create pending commission on the configured first-paid-period event and set the 30-day available timestamp.
- [ ] Append a linked reversal on refund and preserve a negative carry-forward when the original item was already paid.
- [ ] Do not change the customer's RevenueCat entitlement based on commission eligibility.

**Commit:** `feat(creators): accrue commissions from verified paid lifecycle`

### Task 4.3 — Add hold release and reviewed payout batches

**Files:**

- Add: `supabase/functions/creator-payouts/index.ts`
- Add: `supabase/functions/creator-payouts/config.toml`
- Add: `supabase/functions/creator-payouts/__tests__/creatorPayouts_deno_test.ts`
- Modify: `docs/operations/creator-acquisition-pilot-runbook.md`

- [ ] Add a scheduled/idempotent operation that marks eligible held events available after 30 days without paying them automatically.
- [ ] Add super-admin-only preview, create batch, approve batch, record external payout reference, and void/reverse controls.
- [ ] Calculate currency-specific batches without silent cross-currency conversion.
- [ ] Require explicit human approval and store only an external payout reference, never bank/tax details.

**Commit:** `feat(creators): add reviewed creator payout batches`

---

## Phase 5 — Build the creator landing and truthful handoff

### Task 5.1 — Add job-specific creator landing routes

**Repository:** `/Users/andrewwatanabe/kwilt-site`

**Files:**

- Add: `app/(site)/c/[creatorSlug]/page.tsx`
- Add: `components/CreatorCampaignLanding.tsx`
- Add: `lib/creatorCampaigns.ts`
- Add: `lib/creatorCampaigns.test.ts`
- Modify: `lib/analytics.ts`
- Modify: `lib/openRoutes.ts`
- Modify relevant route/install-link tests

- [ ] Before editing, record the site's current branch, HEAD, and dirty state; preserve unrelated changes and create the matching ordinary branch if implementation begins.
- [ ] Fetch only safe campaign resolution data and return a calm inactive/expired state without exposing partner or compensation data.
- [ ] Match headline, demonstration, prerequisites, disclosure, challenge, and App Store handoff to the approved campaign register.
- [ ] Preserve UTM/App Store campaign parameters for aggregate acquisition measurement and include the code in the app continuation link where possible.
- [ ] Treat the post-install code claim—not the click—as payout attribution truth.
- [ ] Run focused tests and the site's own lint/typecheck/build gates.

**Commit in site repo:** `feat(creators): add truthful creator campaign landings`

### Task 5.2 — Add App Store campaign metadata for aggregate measurement

**Files:**

- Modify: `docs/marketing/creator-campaign-register.md`
- Modify: `docs/operations/creator-acquisition-pilot-runbook.md`

- [ ] Give each creator a distinct App Store campaign link and, only when useful, an approved custom product page.
- [ ] Keep campaign-link metrics aggregate and reconcile them separately from deterministic code claims.
- [ ] Do not create Apple offer codes for the first pilot.

**Commit:** `docs(creators): record App Store campaign measurement`

---

## Phase 6 — Make creator operations reviewable

### Task 6.1 — Add privacy-safe super-admin reporting

**Files:**

- Modify: `src/features/account/SuperAdminToolsScreen.tsx`
- Modify/add focused super-admin tests
- Modify: `src/services/creatorCampaigns.ts`
- Modify: `supabase/functions/creator-payouts/index.ts`

- [ ] Add campaign status, valid claims, trial starts, first paid periods, held/available/reversed commissions, payout batches, and reconciliation exceptions.
- [ ] Show aggregates and opaque IDs; do not show user private content or creator payment/tax data.
- [ ] Provide CSV export only for the reviewed operational fields required to complete manual payout.
- [ ] Require super-admin authorization at both UI and Edge Function boundaries.

**Commit:** `feat(admin): review creator acquisition and payout state`

### Task 6.2 — Add campaign, commission, and privacy analytics contracts

**Files:**

- Modify: `src/services/analytics/events.ts`
- Add/modify analytics contract tests
- Modify: `docs/analytics/monetization-funnel.md`
- Modify: `docs/marketing/creator-campaign-register.md`

- [ ] Define campaign landing, App Store handoff, claim attempted/qualified/rejected, challenge start/completion, paid intent, first paid period, hold, approval, reversal, payout, and dispute events.
- [ ] Keep client events for product funnel and webhook/ledger events for financial truth; deduplicate ownership explicitly.
- [ ] Add a forbidden-field test for app identities, rule sentences, child names, activity/goal text, Chat content, Money content, email, and creator bank/tax data.
- [ ] Document FTC disclosure and approved-claim review as launch gates, not analytics fields.

**Commit:** `feat(analytics): measure creator acquisition without private content`

---

## Phase 7 — Prove and operate the pilot

### Task 7.1 — Run source, migration, authorization, and lifecycle proof

**Files:**

- Modify: `docs/operations/creator-acquisition-pilot-runbook.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Run focused Jest/Deno tests, migration reset, RLS/grant checks, and Edge Function lint.
- [ ] Prove `anon`/`authenticated` direct table access fails and bounded resolve/claim routes succeed only as designed.
- [ ] Replay duplicate and out-of-order RevenueCat events and reconcile subscription projection, attribution, commission, reversal, and payout totals.
- [ ] Run `npm run verify:changed -- --run` once after the complete app/backend/docs slice.

### Task 7.2 — Run end-to-end Sandbox/TestFlight corpus

**Files:**

- Modify: `docs/operations/creator-acquisition-pilot-runbook.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`

- [ ] Prove landing → App Store → install → pending code → qualified claim →
  login association → useful Free challenge/basic rule → standard contextual
  upgrade path → advanced Screen Time paid intent → eligible/ineligible purchase
  presentation → preserved return destination.
- [ ] Prove trial `INITIAL_PURCHASE` creates no bounty, the first real paid period creates one pending bounty, 30-day release makes it available, refund creates one reversal, and duplicate/out-of-order delivery remains exact.
- [ ] Prove invalid, expired, conflicting, post-purchase, existing-subscriber, self-referral, Sandbox, Family Sharing, and campaign-pause paths.
- [ ] Prove pause/kill switches do not change active subscriptions or hide customer data.
- [ ] Record source, Simulator, signed-device, TestFlight, backend, and live-site evidence separately.

### Task 7.3 — Approve five campaigns and run the six-week pilot

**Files:**

- Modify: `docs/marketing/creator-campaign-register.md`
- Modify: `docs/operations/creator-acquisition-pilot-runbook.md`
- Modify: `docs/design-explorations/creator-acquisition-pilot/05-evaluate-learning.md`

- [ ] Approve each creator, final script, disclosure, landing, challenge, storefront, dates, and compensation configuration.
- [ ] Confirm the marketed Screen Time promise is still in the release evidence ledger and App Review-approved materials.
- [ ] Review reconciliation, refunds, support, claims, and privacy signals at least weekly without changing attribution rules mid-cohort.
- [ ] After six weeks plus the final 30-day hold, record `Proceed`, `Revise`, or `Retire` using the learning decision rule.
- [ ] Do not automate payouts or add an attribution SDK until the pilot identifies a real scaling constraint.

---

## Final acceptance checklist

- [ ] Apple/RevenueCat remains the only customer subscription truth.
- [ ] A creator code never grants Pro or implies an unproven discount.
- [ ] First-qualified pre-purchase attribution is deterministic and idempotent.
- [ ] Link-only analytics cannot create a bounty.
- [ ] Trial starts do not create a bounty; the configured first real paid-period event does.
- [ ] Hold, refund reversal, void, and payout batching reconcile exactly.
- [ ] Direct creator-table access is denied to `anon` and `authenticated`.
- [ ] No private Screen Time, family, Activity, Goal, Chat, Money, bank, or tax data appears in creator systems.
- [ ] Every creator claim and disclosure is approved against release evidence.
- [ ] The entire customer path works in TestFlight and the advertised Screen Time job works on a signed entitlement-enabled device.
- [ ] Paid creator traffic can be paused without changing customer access.
- [ ] The pilot's `Proceed`, `Revise`, or `Retire` decision is recorded from retained paid value and payback, not installs alone.

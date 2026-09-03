# App Store submission readiness ledger

This is Kwilt's canonical, version-independent ledger for App Store rejection
risk and submission proof. It records what must change, what evidence is needed
to close each item, and which checks remain outside the repository.

Do not infer submission readiness from a TestFlight upload, a source test, or a
Simulator run. An item is closed only when every proof layer named in its
acceptance criteria has been recorded.

## Ledger metadata

- Ledger created: 2026-09-02
- Last policy review: 2026-09-02
- Initial source snapshot: `main` at
  `afd63cfc61afd8dc5622c56b4a986342a049278a`, with unrelated uncommitted work
  present
- Current decision: **NO-GO for App Store submission**
- Current blocking items: `ASR-001`, `ASR-002`, `ASR-004`
- Next finding ID: `ASR-011`

This ledger supersedes App Store-readiness conclusions in older versioned
checklists and assessments. Those documents remain evidence and historical
context; they do not close an item here.

## Status and proof vocabulary

Statuses:

- `OPEN`: remediation or evidence is incomplete.
- `IN PROGRESS`: an implementation slice is actively being changed, but the
  closure criteria are not satisfied.
- `READY FOR VERIFICATION`: implementation appears complete; required runtime,
  backend, or store proof remains.
- `EXTERNAL GATE`: source work is not the current blocker; Apple, App Store
  Connect, signing, provider, or physical-device evidence is missing.
- `VERIFIED`: all required proof is linked and dated.
- `REOPENED`: a later change invalidated prior proof.
- `RISK ACCEPTED`: the owner explicitly chose to ship without fully remediating
  the cited concern. This records a product decision, not proof of compliance or
  future App Review acceptance.

Proof layers:

- `S` — source/configuration inspection
- `A` — automated test or static check
- `R` — local runtime or Simulator
- `D` — signed physical-device or exact TestFlight candidate
- `B` — deployed production backend/provider behavior
- `C` — App Store Connect configuration and preview
- `E` — actual App Review result

`E` is not required to finish engineering work, but it is the only proof that
Apple accepted the submitted behavior. Record it after every review.

## Current ledger

| ID | Severity | Status | Guideline / concern | Required proof | Short description |
| --- | --- | --- | --- | --- | --- |
| ASR-001 | P1 | READY FOR VERIFICATION | 4.10, 5.1.1(ii) | S, A, D, C | Screen Time Free/Pro boundary and messaging |
| ASR-002 | P0 | OPEN | 5.1.1(v) | S, A, B, D | Account deletion integrity and provider cleanup |
| ASR-003 | P0 | RISK ACCEPTED | 5.1.1(ii) | S, A, D, E | Default-on analytics with persisted withdrawal |
| ASR-004 | P0 | IN PROGRESS | 2.3, 5.1.1(i) | S, A, D, C | Privacy policy, manifest, and label mismatch |
| ASR-005 | P1 | READY FOR VERIFICATION | 1.2, 4.7.1 | S, A, D, B | UGC reporting, filtering, and response workflow |
| ASR-006 | P1 | OPEN | 2.2, 2.3.1 | S, A, D, C | Review-only flags and test-profile behavior |
| ASR-007 | P1 | READY FOR VERIFICATION | 2.1 | B, D, C | Reviewer account and complete feature access |
| ASR-008 | P1 | EXTERNAL GATE | Restricted entitlement | D, C | Family Controls distribution authorization |
| ASR-009 | P1 | EXTERNAL GATE | 2.1(b), 3.1.1 | D, C | IAP and RevenueCat production availability |
| ASR-010 | P1 | READY FOR VERIFICATION | 2.5.4, 5.1.1(ii) | S, D, C | Signed archive, permissions, and background modes |

Severity meanings:

- `P0`: likely rejection or submission-blocking compliance defect.
- `P1`: credible rejection risk or required external submission gate.
- `P2`: lower-probability regression watch or hardening opportunity.

## Findings

### ASR-001 — Screen Time Free/Pro boundary and messaging

- Severity: `P1`
- Status: `READY FOR VERIFICATION`
- Apple basis: App Review Guideline 4.10 prohibits monetizing built-in operating
  system capabilities, explicitly including Screen Time APIs. Guideline
  5.1.1(ii) also says paid functionality must not depend on access to collected
  user data.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-03
- Risk decision: `P1`, not `P0`. The guideline is explicit, but active paid
  products establish that Apple does not treat every subscription adjacent to
  Screen Time as categorically prohibited. Kwilt must still prove that its Free
  baseline is complete and that Pro sells Kwilt automation, rule composition,
  Kwilt-created policy, and managed coordination rather than the Apple
  capability itself.

Current evidence:

- The accepted product boundary is recorded in
  [`docs/design-explorations/family-screen-time-commercial-boundary/03-converge.md`](../design-explorations/family-screen-time-commercial-boundary/03-converge.md)
  and the canonical
  [`docs/feature-briefs/monetization-paywall-revenuecat.md`](../feature-briefs/monetization-paywall-revenuecat.md):
  immediate manual control and unscheduled single-condition Focus or
  daily-usage rules remain Free; scheduling, composition, Kwilt-native policy
  truth, and managed Household coordination require Pro.
- [`src/domain/proAccessPolicy.ts`](../../src/domain/proAccessPolicy.ts) lists
  `advanced_screen_time_rules` and `family_screen_time` as Pro capabilities,
  markets scheduled and combined rules as Pro outcomes, and removes Screen
  Time from generic paid messaging when the ordinary fallback is active.
- [`src/features/screen-time/domain/screenTimeAccessPolicy.ts`](../../src/features/screen-time/domain/screenTimeAccessPolicy.ts)
  classifies time-of-day, multi-condition, and Kwilt-native rules as Pro while
  leaving one unscheduled Focus or daily-usage condition Free.
- [`src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`](../../src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx)
  opens the contextual offer before adding a schedule or second/Kwilt-native
  condition, preserves the draft, and prevents dormant paid-rule reactivation.
- [`src/features/account/ScreenTimeProtectionSettingsScreen.tsx`](../../src/features/account/ScreenTimeProtectionSettingsScreen.tsx)
  offers a separate in-person child-device path using Apple child
  authorization without creating a named child or Household binding.
- Named-child device setup is checked at its direct navigation entries and at
  [`supabase/migrations/20260903120000_require_pro_for_managed_child_device_setup.sql`](../../supabase/migrations/20260903120000_require_pro_for_managed_child_device_setup.sql),
  while existing database triggers require Pro for active family selections,
  agreements, and overrides.
- The Chat lifecycle action boundary now invokes the same Pro rule check before
  reactivation; disable and delete remain available.
- [`src/features/account/ManageSubscriptionScreen.tsx`](../../src/features/account/ManageSubscriptionScreen.tsx)
  presents advanced Screen Time as a paid-tier benefit.
- [`src/features/screen-time/runtime/screenTimeMonetizationFlag.ts`](../../src/features/screen-time/runtime/screenTimeMonetizationFlag.ts)
  allows a remote personal-rule rollback but leaves family behavior gated.
- Existing App Store competitors with paid rule systems and family plans make a
  categorical rejection conclusion too strong, but they do not override the
  text of Guideline 4.10 or guarantee that Apple will accept Kwilt's boundary.

Required remediation:

- [x] Keep immediate manual control and unscheduled, single-condition Focus or
  daily-usage rules Free. Do not classify by selected-app count, rule count,
  minutes, or strictness.
- [x] Require Pro for time-of-day or recurring schedules, a second condition or
  explicit AND/OR composition, and conditions backed by Kwilt-created policy
  truth such as Activity completion, Money review, earned or adaptive access,
  prerequisite-app state, or family-day state.
- [x] Provide a useful Free in-person family starter on the configured child
  device: Apple guardian authorization, private selection, one simple
  unscheduled local rule, explanation, editing, recovery, release, and cleanup.
- [x] Keep managed-Household coordination Pro: named-dependent binding, scoped
  remote caregivers, cross-device creation and delivery, desired/applied
  receipts, child requests, remote exceptions, replacement, reconciliation,
  and remote recovery.
- [x] Apply the same classification through navigation, rule saving, Chat,
  deep links, trusted server mutations, downgrade cleanup, and remote flags.
- [x] Describe paid Screen Time as rules that run automatically, combined rules,
  conditions connected to Kwilt, and managed family agreements. Never sell
  authorization, blocking, minutes, strictness, or access to Screen Time APIs.
- [x] Preserve an ordinary customer-visible fallback that makes scheduled,
  composed, and Kwilt-native local authoring Free and removes Screen Time from
  paid-benefit copy. Never expose reviewer-specific behavior.
- [x] Explain the two axes and the complete Free baseline in App Review notes;
  request clarification from Apple if review challenges the boundary.

Closure criteria:

- A Free account can authorize Screen Time, use Apple's private picker, create
  an immediate manual control or unscheduled single-condition Focus or
  daily-usage rule, receive native enforcement, and edit, disable, release, or
  clean up that rule without a purchase requirement.
- A caregiver can complete the same useful standard setup in person on a child
  device without binding it to a paid Kwilt Household.
- A Pro demonstration proves that payment adds Kwilt automation or coordination:
  scheduling, combined rule logic, a Kwilt-native condition, or a
  managed-Household service—not additional Apple-selected apps, minutes,
  enforcement, or permission.
- Focused policy, navigation, Chat, server, downgrade, and fallback tests prove
  the same boundary. A signed physical-device test proves the local starter;
  a signed two-device family test separately proves managed delivery and
  cleanup.
- App Store Connect subscription metadata and in-app benefit copy describe
  rules that run automatically, conditions connected to Kwilt, and managed
  family agreements without claiming paid access to Screen Time APIs.
- App Review notes provide Free and Pro test paths, identify the Family Controls
  entitlement, and record any Apple clarification or actual review result.

Closure evidence:

- 2026-09-03 source and focused automated tests cover schedule/combination
  classification, local child authorization routing, rule-builder and Chat
  reactivation gates, whole-rule downgrade dormancy, direct managed-device
  navigation, the trusted setup-session mutation, contextual copy, and the
  ordinary customer fallback.
- Draft reviewer instructions are in
  [`docs/app-store/screen-time-review-notes.md`](screen-time-review-notes.md).
- Still required before `VERIFIED`: exact-candidate physical-device Free and
  Pro paths, two-device managed delivery/cleanup, App Store Connect copy and
  product inspection, and the actual App Review result.

### ASR-002 — Account deletion integrity and provider cleanup

- Severity: `P0`
- Status: `READY FOR VERIFICATION`
- Apple basis: apps supporting account creation must offer in-app deletion of
  the account and associated data. Apple also instructs Sign in with Apple apps
  to revoke user tokens during deletion.
- Policy source:
  [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- Last checked: 2026-09-03

Current evidence:

- [`supabase/functions/account-delete/index.ts`](../../supabase/functions/account-delete/index.ts)
  removes selected storage paths and directly calls
  `admin.auth.admin.deleteUser(userId)`.
- [`supabase/migrations/20260728190000_household_foundation.sql`](../../supabase/migrations/20260728190000_household_foundation.sql)
  contains non-null `auth.users` foreign keys for household and person creator
  fields without delete behavior.
- [`supabase/migrations/20260730152735_family_screen_time_control_plane.sql`](../../supabase/migrations/20260730152735_family_screen_time_control_plane.sql)
  contains additional non-cascading user references for requests and operations.
- No later migration was found replacing those constraints with a deletion-safe
  policy.
- Plaid Item removal exists in
  [`supabase/functions/disconnect-money-connection/index.ts`](../../supabase/functions/disconnect-money-connection/index.ts),
  but `account-delete` does not invoke equivalent cleanup.
- Separate revocation paths exist for grocery, phone-agent, calendar, and
  connected-tool records, but account deletion does not orchestrate them.
- No Sign in with Apple token-revocation path was found.
- [`src/services/accountDeletion.test.ts`](../../src/services/accountDeletion.test.ts)
  mocks a successful HTTP response; it does not exercise database constraints,
  storage, Auth, or providers.

Required remediation:

- [ ] Define explicit deletion/retention/transfer behavior for personal,
  household, dependent, shared, audit, and provider-backed records.
- [ ] Make the database graph deletion-safe through a reviewed transactional
  procedure and appropriate cascade, nulling, transfer, or retained-record
  semantics.
- [ ] Remove Plaid Items and revoke or delete other provider credentials before
  deleting records needed to perform those calls.
- [ ] Revoke Sign in with Apple tokens when applicable.
- [ ] Make the operation authenticated, idempotent, retryable, and observable
  without logging sensitive data.
- [ ] Keep the billing explanation, but ensure every other deletion promise in
  the confirmation UI is true.

Closure criteria:

- A disposable production account uses every cloud capability, creates and
  joins a household, connects every enabled provider, uploads storage, receives
  notifications, and then deletes successfully from the exact candidate build.
- Evidence confirms the Auth user, governed database records, storage objects,
  provider tokens/Items, push tokens, sessions, and local caches are removed or
  retained only under an explicitly disclosed policy.
- Repeating the deletion request is safe.
- The test records resulting state without retaining credentials or personal
  financial values.

Closure evidence: _Not yet recorded._

### ASR-003 — Analytics consent and withdrawal

- Severity: `P0`
- Status: `RISK ACCEPTED`
- Apple basis: Guideline 5.1.1(ii) requires consent before collecting user or
  usage data and an easily accessible, understandable way to withdraw consent.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Original finding evidence:

- [`src/services/analytics/posthog.ts`](../../src/services/analytics/posthog.ts)
  enables PostHog automatically in production when an API key exists.
- [`src/services/analytics/posthogClient.ts`](../../src/services/analytics/posthogClient.ts)
  constructs the client without a persisted user consent gate.
- [`App.tsx`](../../App.tsx) emits an application-open event at startup before
  the user completes sign-in or accepts the linked legal terms.
- No user-facing analytics consent preference, Settings withdrawal control, or
  PostHog opt-in/opt-out invocation was found.
- Identity reset on sign-out does not withdraw analytics consent.

Required remediation:

- [ ] Default optional analytics to off until the user makes a clear choice.
  Owner explicitly declined this remediation on 2026-09-03, preserving Kwilt's
  previously approved default-on posture and accepting the review/policy risk.
- [x] Persist a versioned analytics preference and enforce withdrawal before
  constructing or transmitting through the analytics client.
- [x] Add an understandable Settings control that can withdraw and later renew
  consent.
- [x] On withdrawal, stop transmission immediately and reset the analytics
  identity as appropriate.
- [x] Keep essential security/service telemetry separately classified and
  documented rather than silently treating it as optional product analytics.
- [x] Ensure feature availability does not depend on optional analytics consent.

Closure criteria:

- Fresh-install evidence confirms the documented default-on behavior.
- Default-on and renewed analytics use only the bounded event schema.
- Withdrawal prevents subsequent optional analytics transmission across
  relaunch, sign-out, account switching, and reinstall behavior as documented.
- Automated tests cover unknown, granted, denied, withdrawn, and version-change
  states.

Closure evidence:

- Source implementation: `src/services/analytics/analyticsConsent.ts`,
  `analyticsConsentRuntime.ts`, `posthogClient.ts`, `App.tsx`, and the Optional
  analytics control in `LegalPrivacyScreen.tsx`.
- Automated evidence: focused analytics preference/runtime/UI and existing
  collection-boundary suites cover default-on unknown, granted, denied,
  withdrawn, persisted, version-change, and rapid grant-withdraw states are
  covered.
- Documentation: `docs/analytics/consent.md` distinguishes optional PostHog
  product analytics from essential security and service-delivery processing.
- Decision: Andrew explicitly accepted the existing default-on analytics risk on
  2026-09-03 because prior Kwilt versions with that posture had been approved.
  Prior approval is not evidence that Apple will approve the next submission.
- Remaining evidence: signed-candidate fresh-install and withdrawal network
  inspection across relaunch, sign-out, and account switching, followed by the
  actual App Review result (`E`).

### ASR-004 — Privacy policy, manifest, and App Store label mismatch

- Severity: `P0`
- Status: `IN PROGRESS`
- Apple basis: Guidelines 2.3 and 5.1.1(i) require accurate metadata and a
  privacy policy that identifies collected data, collection methods, uses,
  third parties, retention/deletion, and consent withdrawal. Apple also directs
  apps to declare app-collected data in their privacy manifest and all app/SDK
  collection in App Store Connect.
- Policy sources:
  [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/),
  [TN3184](https://developer.apple.com/documentation/technotes/tn3184-adding-data-collection-details-to-your-privacy-manifest)
- Last checked: 2026-09-03

Current evidence:

- The September 2, 2026 [Privacy Policy](https://go.kwilt.app/privacy) and
  matching Terms were deployed on 2026-09-03 through Vercel production
  deployment `dpl_CZKzm5kkCvajtP42Tk2aie6p77zp`. The `kwilt.app`,
  `www.kwilt.app`, and `go.kwilt.app` legal URLs returned HTTP 200 with the
  updated date; `kwilt.app` canonically redirects to `www.kwilt.app`.
- It directs a user to support when an analytics opt-out is unavailable rather
  than describing a current in-app withdrawal control.
- [`docs/app-store/privacy-disclosures-current-candidate.md`](privacy-disclosures-current-candidate.md)
  contains the expanded current-candidate disclosure packet. It still must be
  reconciled against the exact submitted archive and App Store Connect.
- `app.config.ts` now source-controls 22 app-collected data types through
  `ios.privacyManifests`, including linkage, non-tracking status, and purposes
  aligned to the current-candidate disclosure packet. Expo prebuild writes
  those declarations to the ignored native
  [`ios/Kwilt/PrivacyInfo.xcprivacy`](../../ios/Kwilt/PrivacyInfo.xcprivacy).
- A 2026-09-03 unsigned local Release archive successfully produced an Xcode
  privacy report. It aggregated the 22 app declarations plus LinkKit User ID,
  RevenueCat Purchase History, and react-native-maps Precise Location, with no
  tracking declarations. The archive identified itself as `1.0.118 (118)` even
  though `app.config.ts` declares 119, so it is diagnostic evidence only and
  not the submission-candidate report.
- App Store Connect initially showed only 8 collected data types. On 2026-09-03
  it was updated and published with all 22 current-candidate types. Each type's
  detail says linked to the user's identity; the product-page preview contains
  no `Data Used to Track You` section. Existing purpose mismatches for Name,
  Precise Location, Emails or Text Messages, Photos or Videos, User ID, and
  Product Interaction were corrected.
- App Store Connect continues to publish
  `https://www.kwilt.app/privacy` as the Privacy Policy URL. The saved
  `https://www.kwilt.app/privacy#privacy-choices` edit is marked `Edited`, with
  App Store Connect stating that URL changes release with the next app version.
- The detailed product-page preview also lists User ID, Photos or Videos,
  Precise Location, Product Interaction, and Name under `Data Not Linked to
  You`, even though each type's own detail says linked. Preserve this observed
  aggregate-preview distinction and recheck it against the exact candidate.

Required remediation:

- [x] Publish one current policy matching the complete shipped product and name
  or clearly categorize material processors and providers.
- [ ] Align account requirements, household/dependent behavior, analytics
  consent, deletion/retention, provider cleanup, financial data, Health,
  location, audio, games, AI, SMS, and connected tools.
- [x] Populate the app privacy manifest with app-collected data types, linkage,
  tracking status, and purposes; separately preserve required-reason API entries
  and SDK manifests.
- [x] Generate and inspect a local diagnostic archive privacy report.
- [ ] Generate and inspect the privacy report from the exact signed archive
  selected for App Store submission.
- [x] Update App Store Connect privacy answers from the current-candidate packet
  and deployed services.
- [ ] Confirm the in-app, App Store Connect, support, and website URLs all resolve
  to the same current policy.

Closure criteria:

- Policy, privacy manifest, Xcode privacy report, App Store Connect preview,
  actual network behavior, deletion behavior, and in-app explanations agree.
- The review packet identifies the policy version and capture date.
- A second reviewer checks every data category in the disclosure matrix against
  current source and providers.

Progress evidence:

- 2026-09-02: Updated
  `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx` to disclose the
  current account requirement, capability data categories, material processors,
  AI and voice paths, background location, Money/Plaid, Households and
  dependents, Screen Time, Games, Meals/Groceries, Phone Agent/SMS, analytics,
  sharing, retention, and user controls.
- 2026-09-02: Updated
  `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx` where the privacy
  reconciliation changed the service, account, dependent, connected-provider,
  content, reliance, and deletion contract.
- These edits intentionally do not claim that analytics consent, account
  deletion integrity, connected-provider cleanup, the exact signed-candidate
  archive report, or App Store Connect answers have been completed. ASR-004
  remains open for those gates.
- 2026-09-03: Deployed the September 2 policy and Terms through production
  deployment `dpl_CZKzm5kkCvajtP42Tk2aie6p77zp`; verified the six canonical
  legal URLs returned the updated date.
- 2026-09-03: Source-controlled the app privacy declarations in Expo config,
  verified the generated native manifest, and generated Xcode's aggregated
  report from an unsigned local Release archive. The report matched the
  proposal, but the archive's stale native `1.0.118 (118)` identity and mutable
  working-tree provenance mean the exact signed submission archive must still
  be checked.
- 2026-09-03: Published the reconciled 22-type App Store Connect disclosure set,
  corrected six existing purpose mismatches, verified no tracking section in
  the detailed product-page preview, and saved the Privacy Choices URL for the
  next app version. No app version was submitted for review.
- 2026-09-03: Completed a Simulator-first privacy pass against Metro 8081 from
  the live `main` checkout using the installed build-117 native shell. The
  September 2 Privacy Policy and Terms rendered from their in-app links;
  analytics withdrawal persisted across a full app relaunch and the original
  On preference was restored; account deletion reached its explicit
  irreversible warning and was canceled before data destruction. Focused
  analytics/legal/deletion tests passed 26/26, and the complete account-deletion
  schema/provider/storage/orchestration contract passed. This is not
  production-network, actual deletion, signed-candidate, or hardware proof.
- 2026-09-03: A follow-up read-only production audit confirmed that the
  synthetic Simulator account is a minimal standalone fixture with no Plaid,
  calendar, grocery-provider, external OAuth, Phone Agent, or push connection.
  Production does not yet list account-deletion migration
  `20260903141350_account_deletion_integrity` or the
  `account-deletion-token-register` function, and its `account-delete` function
  remains the pre-existing version 21. The account was not destroyed because
  doing so would test the older backend rather than the new cleanup contract.
  The active Simulator runtime also resolved to `development`, where PostHog is
  intentionally disabled without an explicit override; its consent UI result
  therefore does not claim production network or ingestion proof.
- 2026-09-03: Deployed production migration
  `20260903230301_account_deletion_integrity`, `account-delete` version 23, and
  `account-deletion-token-register` version 1 to project
  `sqxwjtorodqjdfnuvprf`. Required secret names and cleanup buckets are present,
  unauthenticated requests return 401, and the deletion RPC is executable only
  by `service_role`. The protected secret-initialization/Apple-rotation run
  completed successfully. See
  [`2026-09-03-production-backend-deployment.md`](../delivery-evidence/account-deletion/2026-09-03-production-backend-deployment.md).
- A destructive standalone deletion smoke is still pending. The synthetic
  Simulator fixture has no connected providers, so it cannot close the separate
  provider-cleanup matrix.
- 2026-09-03: Built and uploaded signed production candidate `1.0.120 (120)`
  from pushed commit `1122c02d` with EAS profile `production-widgets`. Build
  `0f6e49ea-c8b3-4188-af64-d90540dda71a` and submission transport
  `ddb2f523-1dbd-47aa-bd71-aae28757727e` finished successfully. Strict IPA
  signature checks passed, all four extensions and production entitlements are
  present, and the exact IPA contains the expected 22 app declarations plus the
  same three SDK-collected categories seen in the diagnostic Xcode report.
  Apple subsequently processed build 120: it is in internal beta testing and
  ready for external beta submission. The authenticated aggregate-preview
  recheck and an exact remote-archive Xcode report remain separate gates. See
  [`2026-09-03-build-120-production-candidate.md`](../delivery-evidence/app-store/2026-09-03-build-120-production-candidate.md).

### ASR-005 — UGC reporting, filtering, and response workflow

- Severity: `P1`
- Status: `READY FOR VERIFICATION`
- Apple basis: Guideline 1.2 requires filtering objectionable material, a
  mechanism to report offensive content with timely responses, blocking, and
  published contact information. Similar obligations apply to software such as
  chatbots offered under Guideline 4.7.1.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Current evidence:

- Kwilt supports shared goal check-ins and replies, shared attachments,
  friendships, household collaboration, remote games, and AI/chat content.
- [`src/features/friends/FriendshipSettingsSection.tsx`](../../src/features/friends/FriendshipSettingsSection.tsx)
  provides a block action.
- [`src/features/account/LegalPrivacyScreen.tsx`](../../src/features/account/LegalPrivacyScreen.tsx)
  publishes a general support email.
- The 2026-09-02 baseline found no contextual report-user/report-content action,
  report persistence model, moderation queue, response service-level policy, or
  objectionable-content filter. The source implementation recorded below now
  covers Shared Home, shared Goal check-ins/replies, friendship settings,
  Household member details, and shared Meal Plan responses; the wider surface
  inventory and runtime proof remain incomplete.

Required remediation:

- [ ] Add a report action at each surface where another person's content or
  identity appears.
- [ ] Preserve the reported object, reporter, bounded reason, timestamp, and
  review state without exposing the reporter to the reported user.
- [ ] Define moderation intake, response timing, escalation, removal, appeal,
  repeat-abuse, and emergency handling.
- [ ] Add proportionate pre-publication or post-publication filtering for
  applicable free-form and generated content.
- [ ] Verify block semantics cover future invitations, shared surfaces, direct
  interactions, and already-shared access as intended.

Closure criteria:

- A reviewer can report content or a user without composing a generic support
  email, can block the user, and can find published contact information.
- A production moderation operator can receive, review, resolve, and audit the
  report within the documented response window.
- Automated authorization tests prevent report disclosure and moderation abuse.

Closure evidence: _Not yet recorded._

Implementation progress (not closure evidence):

- 2026-09-03: Added the accepted contextual UGC safety brief and design records,
  a private `kwilt_ugc_reports` moderation queue migration, authenticated
  `ugc-report` intake, best-effort operator alerts, a moderation runbook,
  server-enforced shared-text filtering, and an atomic cross-surface block RPC.
- 2026-09-03: Added contextual report actions to Shared Home, shared Goal
  check-ins/replies, and friendship settings. Added focused Deno/Jest tests and
  rollback-only database authorization assertions.
- 2026-09-03: Refined the universal post-report Block assumption into a
  role-aware response. Peer reports may offer bilateral social blocking; active
  same-Household relationships reject social blocking. Managed children receive
  a private-help receipt without caregiver notification or a false removal claim,
  while adults retain separate Family authority controls.
- 2026-09-03: Added contextual help to the existing Household member detail.
  Intake can preserve a canonical Household person even when that dependent has
  no separate user account; self and inaccessible member targets remain rejected.
- 2026-09-03: Added quiet contextual help for another household member's Meal
  Plan explanation and for guest meal suggestions. Reports capture the
  server-resolved response, personal hiding removes its text only for the
  reporting viewer, and guest-link control remains a separate caregiver action.
- 2026-09-03: Added a fail-closed production gate for anonymous remote Games.
  Production builds hide remote discovery, joining, hosting, remote-only
  Slanguage, and direct room routes while development builds retain the proving
  surface. Exact archive verification remains required before this counts as
  candidate evidence.
- This source work does not prove deployment, configured operator email,
  production intake/response timing, the SQL authorization suite against a
  migrated database, complete physical-device surface coverage, or two-account
  blocking behavior. ASR-005 remains unclosed until those gates are recorded.
- The explicit inventory in
  [`docs/app-store/ugc-surface-inventory.md`](ugc-surface-inventory.md) records
  remaining collaboration gaps, including remote Games, plus the exact candidate
  gating rule. This prevents the implemented slice from being mistaken for
  complete contextual-report coverage.

### ASR-006 — Review-only flags and test-profile behavior

- Severity: `P1`
- Status: `OPEN`
- Apple basis: Guidelines 2.2 and 2.3.1 prohibit beta/test submissions and
  hidden, dormant, or undocumented features. New functionality must be
  described specifically and accessible to review.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Current evidence:

- [`eas.json`](../../eas.json) gives `testflight` and `testflight-widgets`
  `KWILT_APP_ENV=test`, enables PostHog explicitly, and enables affiliate
  retailer testing.
- The normal `ios:testflight` script builds and auto-submits the
  `testflight-widgets` profile to App Store Connect/TestFlight.
- [`src/features/screen-time/runtime/screenTimeMonetizationFlag.ts`](../../src/features/screen-time/runtime/screenTimeMonetizationFlag.ts)
  describes an “App Review rollback,” which would be unacceptable if used to
  present reviewers a different commercial experience.
- Remote feature and provider state can make functionality visible, hidden, or
  unavailable after the binary is uploaded.

Required remediation:

- [ ] Designate exactly one production App Review profile and command.
- [ ] Ensure the selected binary uses production environment and customer
  behavior, not affiliate/provider test behavior.
- [ ] Remove review-specific behavior switching; compliance rollbacks must apply
  to all affected customers.
- [ ] Capture the final remote-flag/provider inventory before submission and
  keep it stable throughout review.
- [ ] Describe all non-obvious, remote, web-hosted, AI, IAP, background, Health,
  location, Family Controls, and provider functionality in Review Notes.

Closure criteria:

- The candidate's EAS build record, environment, commit, archive, remote flags,
  and App Store Connect build selection are recorded and mutually consistent.
- A clean customer account and the reviewer account see the same commercial and
  feature behavior except for explicitly disclosed fictional fixture data.
- No test labels, unavailable buttons, hidden production capabilities, or
  reviewer-only exceptions appear.

Closure evidence: _Not yet recorded._

### ASR-007 — Reviewer account and complete feature access

- Severity: `P1`
- Status: `READY FOR VERIFICATION`
- Apple basis: Guideline 2.1 requires an active demo account or fully featured
  demo mode, live backend services, and explanations/resources needed to review
  account-based features.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Current evidence:

- [`docs/testing/demo-account-runbook.md`](../testing/demo-account-runbook.md)
  defines paired fictional reviewer accounts and a redacted preflight.
- [`docs/delivery-evidence/demo-accounts/2026-08-31-review-household-v1.md`](../delivery-evidence/demo-accounts/2026-08-31-review-household-v1.md)
  records successful production provisioning and credential/data-isolation
  preflight on 2026-08-31.
- The evidence explicitly does not prove a cold TestFlight install,
  physical-device behavior, App Store Connect credential entry, or current App
  Review access.

Required remediation:

- [ ] Rerun the read-only preflight immediately before submission.
- [ ] Cold-install the exact candidate on the devices/OS versions used for the
  submission matrix and sign in using the stored reviewer credentials.
- [ ] Exercise every reviewable capability and record truthful unavailable
  states for capabilities requiring private hardware/data.
- [ ] Enter the current credentials and concise navigation instructions in App
  Store Connect; do not place credentials in repository artifacts.
- [ ] Keep the backend and accounts active and unchanged during review.

Closure criteria:

- The exact candidate is navigable through sign-in, core planning, household,
  sample Money, meals, chores, settings, subscription, legal, and deletion
  paths.
- App Store Connect contains working credentials and sufficient review notes.
- Review-window monitoring confirms the cohort and backend remain available.

Closure evidence:

- Partial: production provisioning/preflight recorded 2026-08-31.
- Missing: exact-candidate device and App Store Connect proof.

### ASR-008 — Family Controls distribution authorization

- Severity: `P1`
- Status: `EXTERNAL GATE`
- Apple basis: the Account Holder must request the Family Controls distribution
  entitlement for the app and each Screen Time extension.
- Policy source:
  [Requesting the Family Controls entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
- Last checked: 2026-09-02

Current evidence:

- [`app.config.ts`](../../app.config.ts) declares Family Controls for the app and
  three extension targets when Screen Time is enabled.
- Tracked entitlement files contain the capability for the main app and the
  Shield Configuration, Shield Action, and Device Activity Monitor targets.
- Repository source cannot prove Apple approved distribution for each bundle ID
  or that the submitted archive is signed with those approvals.

Required remediation and closure criteria:

- [ ] Record Apple Developer entitlement-request status for the main app and all
  three extensions.
- [ ] Inspect entitlements from the signed candidate archive rather than relying
  on tracked development files.
- [ ] Install on physical devices and prove personal and family authorization,
  app/category selection, enforcement, shield configuration/action, monitor
  delivery, release, and reinstall/upgrade behavior.
- [ ] Put non-obvious setup and testing instructions in Review Notes.

Closure evidence: _Not yet recorded._

### ASR-009 — IAP and RevenueCat production availability

- Severity: `P1`
- Status: `EXTERNAL GATE`
- Apple basis: Guidelines 2.1(b) and 3.1.1 require reviewable, functional IAPs
  and Apple IAP for digital feature unlocks.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Current evidence:

- RevenueCat/StoreKit entitlement and restore paths exist.
- Terms and Privacy links are visible in purchase surfaces; focused legal-link
  tests passed on 2026-09-02.
- Current product status, prices, localization, review screenshots, offering
  mapping, Family Sharing state, introductory offers, sandbox purchase,
  restore, renewal, grace, expiration, and refund behavior were not verified in
  App Store Connect or on the exact candidate.

Required remediation and closure criteria:

- [ ] Verify every advertised product is complete and submitted with the app.
- [ ] Confirm App Store Connect products map to the expected RevenueCat offering
  and one customer-facing entitlement.
- [ ] Prove live price/cadence/legal presentation, purchase, restore, cancellation
  messaging, renewal, grace, expiration, refund, and account switching on the
  exact signed candidate.
- [ ] Confirm no internal/manual entitlement mechanism is exposed as an
  alternate customer purchase or redemption path.
- [ ] Attach required IAP review screenshots and describe the purchase path in
  Review Notes.

Closure evidence: _Not yet recorded._

### ASR-010 — Signed archive, permissions, and background modes

- Severity: `P1`
- Status: `READY FOR VERIFICATION`
- Apple basis: background modes must serve their declared purposes, sensitive
  permissions need complete purpose strings and in-context requests, and the
  signed archive must contain only justified capabilities.
- Policy source:
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Last checked: 2026-09-02

Current evidence:

- [`app.config.ts`](../../app.config.ts) declares background audio, fetch,
  remote notifications, and background location, plus location, Calendar,
  Reminders, Health, microphone, local-network, photo, camera, and Face ID usage
  explanations.
- Focus soundscapes and explicitly enabled Explore recording are plausible
  background-audio/location purposes.
- `NSHealthUpdateUsageDescription` currently says Kwilt does not write Health
  data; confirm the candidate does not request write authorization or remove the
  unused declaration.
- Tracked native plist/entitlement files are generated development state and do
  not prove the store-signed archive.
- Kwilt previously received App Review questions/rejections involving location
  permission flow and background audio.

Required remediation and closure criteria:

- [ ] Generate the production configuration and compare it with the signed
  archive's plist, entitlements, extensions, privacy manifests, SDK signatures,
  URL schemes, associated domains, and background modes.
- [ ] On a physical device, trigger every permission only from its exact
  feature context and verify denial leaves a usable alternative where required.
- [ ] Prove background Focus audio, manual/automatic Explore controls, location
  status indicators, recording consent, Health read-only behavior, local-network
  game discovery, and extension behavior.
- [ ] Test the exact candidate on supported iPhone and iPad layouts.
- [ ] Include precise background and permission reproduction steps in Review
  Notes.

Closure evidence: _Not yet recorded._

## Historical rejection regression watchlist

Historical items remain here even after remediation because a later UI or
configuration change can reintroduce them. Source:
[`docs/app-store/app-review-reply-a6ab4d24.md`](app-review-reply-a6ab4d24.md).

| Watch ID | Historical issue | Current posture | Required release regression proof |
| --- | --- | --- | --- |
| REG-001 | In-app account deletion | UI exists; backend integrity is open under ASR-002 | Complete exact-candidate deletion with a fully used production account |
| REG-002 | Subscription Terms and Privacy links | Focused tests passed 2026-09-02 | Tap both links from exact purchase surface on candidate device |
| REG-003 | Location permission flow | Source uses contextual Explore language | Record first-use, denial, Settings recovery, and background opt-in on device |
| REG-004 | Background audio explanation | Focus soundscape path exists | Record locked/background playback and include navigation steps in Review Notes |
| REG-005 | IAP products unavailable to reviewer | Code path exists; store state unknown | Complete sandbox/TestFlight purchase and attach products to submission |

## Controls presently observed

These are not blanket approvals. Preserve them and rerun their listed proof when
the release candidate changes.

| Control | Current evidence | Proof boundary |
| --- | --- | --- |
| Sign in with Apple alongside Google | Declared in `app.config.ts` and visible in sign-in source | Needs exact-candidate device sign-in and token-revocation proof |
| Subscription legal links | 2026-09-02 focused tests passed | Needs device tap-through and live policy alignment |
| Seeded fictional reviewer cohort | 2026-08-31 production preflight passed | Needs current preflight, physical candidate, and App Store Connect entry |
| EAS upload exclusions | Four upload-policy tests passed 2026-09-02 | Does not prove archive contents, signing, or App Review readiness |
| Apple-managed subscription settings | In-app management and deletion explanations exist | Does not prove IAP product configuration or lifecycle |
| User blocking and support contact | Friendship block and support email exist | Does not satisfy ASR-005 reporting/filtering by itself |

## Submission decision rule

Do not submit while any `P0` item is `OPEN`, `IN PROGRESS`, or `REOPENED`.
Before selecting a build in App Store Connect:

1. All `P0` items must be `VERIFIED`.
2. Every `P1` must be `VERIFIED`, or its unavailable feature must be removed
   truthfully from the candidate and all metadata.
3. Record the exact source commit, clean/dirty state, EAS build ID/profile,
   version/build, archive checksum, remote-flag snapshot, backend deployment,
   provider environment, signed entitlements, physical devices, and App Store
   Connect build selection.
4. Rerun `npm run verify:changed -- --run` after the final candidate diff is
   stable. A result from a changing dirty checkout is not release proof.
5. Complete the reviewer-account preflight and exact-candidate device matrix.
6. Capture the App Store Connect privacy preview, IAP state, review notes, and
   final `Waiting for Review` state.

## How to maintain this ledger

- Never delete a finding. Change its status, add dated closure evidence, and
  retain the original evidence and decision history.
- Use the next sequential `ASR-###` ID for a new risk. Do not recycle IDs.
- Link evidence to an immutable commit, build, deployment receipt, screenshot,
  or dated evidence file whenever possible.
- If relevant source, policy, provider behavior, metadata, or signing changes,
  set the affected item to `REOPENED` until its required proof is rerun.
- Update `Last policy review` after checking Apple's live rules; policy summaries
  in this file are not a substitute for the linked current source.
- After Apple responds, record the submission ID, build, review date/device,
  outcome, exact guideline text or reviewer concern, reply, and resulting ledger
  changes.
- Keep credentials, tokens, financial values, and personal reviewer data out of
  this file.

## Supporting artifacts

- [`docs/app-store/privacy-disclosures-current-candidate.md`](privacy-disclosures-current-candidate.md)
  — detailed App Store privacy-label proposal; currently gated on policy
  publication and live verification.
- [`docs/app-store/app-review-reply-a6ab4d24.md`](app-review-reply-a6ab4d24.md)
  — historical Apple rejection and response record.
- [`docs/testing/demo-account-runbook.md`](../testing/demo-account-runbook.md)
  — reviewer-cohort operating procedure.
- [`docs/delivery-evidence/demo-accounts/2026-08-31-review-household-v1.md`](../delivery-evidence/demo-accounts/2026-08-31-review-household-v1.md)
  — redacted reviewer-cohort provisioning evidence.
- [`docs/product/monetization-release-readiness-assessment.md`](../product/monetization-release-readiness-assessment.md)
  — broader monetization strategy and engineering assessment. Its market
  precedent remains useful context; `ASR-001` is the canonical implementation,
  evidence, and App Review gate for the accepted boundary.
- [`docs/legal/mega-app-data-disclosure-matrix.md`](../legal/mega-app-data-disclosure-matrix.md)
  — cross-capability data inventory used to reconcile policy, manifest, and App
  Store Connect disclosures.

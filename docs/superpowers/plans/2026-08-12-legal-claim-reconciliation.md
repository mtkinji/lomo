# Legal Claim Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Privacy Policy, Terms, Apple App Privacy, and Google Play Data Safety claim either proven by release code/runtime evidence or explicitly described as unavailable, optional, retained, or pending.

**Architecture:** Maintain one release claim ledger keyed by capability. Public copy states current behavior; store packets translate the same behavior into platform-specific taxonomies; tests reject invalid taxonomy and unlisted network recipients. Essential Kwilt commitments—private capability boundaries, deletion, and sensitive-analytics exclusion—are implemented in code rather than weakened in copy.

**Tech Stack:** React Native/Expo, Next.js, Jest/Node test runner, Supabase Postgres/Edge Functions/Storage/Auth, Plaid, PostHog, App Store Connect, Google Play Console.

---

### Task 1: Repair unambiguous document errors

**Files:**
- Modify: `docs/app-store/privacy-disclosures-1.0.104.md`
- Modify: `docs/google-play/data-safety-1.0.104.md`
- Modify: `docs/legal/mega-app-data-disclosure-matrix.md`
- Modify: `docs/terms-and-privacy-requirements.md`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx`
- Test: `src/features/paywall/LegalUrlConsistency.test.ts`
- Test: `/Users/andrewwatanabe/kwilt-site/lib/legalPolicyCoverage.test.ts`

- [x] **Step 1: Add failing tests for Apple-only purpose names, Android-required analytics, provider coverage, private-sharing wording, and the content-license boundary.**
- [x] **Step 2: Run the focused tests and observe failures against the first draft.**
- [x] **Step 3: Replace Google-only Apple purpose labels, correct Android purchase/analytics wording, narrow the content license, and distinguish human sharing from processor handling.**
- [x] **Step 4: Add OpenStreetMap/Wikimedia, Twilio, Phone Agent, and push-delivery paths to the consumer and store documents.**
- [x] **Step 5: Run the focused tests and require green.**

### Task 2: Remove unjustified public utility traffic

**Files:**
- Modify: `src/features/home/TodayScreen.tsx`
- Modify: `src/services/ai.ts`
- Test: `src/features/paywall/LegalUrlConsistency.test.ts`

- [x] **Step 1: Add a failing test rejecting JSONPlaceholder and content-bearing Picsum requests.**
- [x] **Step 2: Remove the Today-screen connectivity probe and its user-visible debug status.**
- [x] **Step 3: Fail closed when the retired direct Arc-image generator lacks a configured provider instead of sending the Arc name to Picsum.**
- [x] **Step 4: Run focused tests, related Today tests, and TypeScript validation.**

### Task 3: Enforce the analytics promise

**Files:**
- Modify: `src/services/analytics/analytics.ts`
- Create: `src/services/analytics/analytics.test.ts`
- Review: `src/services/analytics/events.ts`

- [x] **Step 1: Write failing tests proving the sanitizer rejects content-bearing keys, financial amounts/merchant evidence, coordinates/paths, Health fields, calendar content, recipe/grocery text, message/error text, invite tokens, and arbitrary string keys.**
- [x] **Step 2: Replace the short denylist with a safe-property contract: reject sensitive keys for every scalar type, and allow strings only for enumerated status/source/action/route/capability keys or opaque identifiers/hashes.**
- [x] **Step 3: Enforce the contract centrally for capture and identify so raw error messages and other content-bearing call-site properties cannot reach PostHog.**
- [x] **Step 4: Run analytics tests and TypeScript validation.**

### Task 4: Implement complete account deletion

**Files:**
- Modify: `supabase/functions/account-delete/index.ts`
- Create: `supabase/functions/_shared/accountDeletion.ts`
- Create: `supabase/functions/_shared/__tests__/accountDeletion_deno_test.ts`
- Create with `supabase migration new`: `supabase/migrations/<timestamp>_mega_app_account_deletion.sql`
- Modify: `src/services/accountDeletion.ts`
- Modify: `src/features/account/ProfileSettingsScreen.tsx`
- Test: `src/services/accountDeletion.test.ts`
- Test: `src/features/account/ProfileSettingsScreen.test.tsx`
- Test: `supabase/tests/mega_app_account_deletion.sql`

- [ ] **Step 1: Import the missing Money schema provenance from the retired Kwilt Budget repository into the deletion design without replaying historical DDL.**
- [ ] **Step 2: Write Deno tests for cleanup ordering: load provider connections, remove Plaid Items before tokens, remove Storage objects through the Storage API, invoke one transactional database cleanup, then delete Auth. Provider failure must return a retryable error before irreversible local credentials are lost.**
- [ ] **Step 3: Write SQL tests for a sole-adult household, a household with another authenticated adult, a dependent profile, private and shared Recipes/Meals/Groceries, Games, Screen Time, Money, Calendar, Chat, and direct user-owned tables.**
- [ ] **Step 4: Add a restricted `SECURITY DEFINER` deletion-preparation function; revoke it from `PUBLIC`, `anon`, and `authenticated`, and grant only `service_role`. It deletes private person-owned data, de-identifies only records required by remaining participants, and transfers household stewardship only to another authenticated adult.**
- [ ] **Step 5: Remove all user/person Storage prefixes and explicit attachment paths before Auth deletion.**
- [ ] **Step 6: Add device cleanup for Explore, Money, Recipe, Grocery, Games, Household, queues, and cached account projections before showing the deletion receipt.**
- [ ] **Step 7: Verify on a disposable production-like account and preserve before/after evidence. Do not publish the consumer deletion promise until this passes.**

### Task 5: Resolve the child/dependent release model

**Files:**
- Modify after decision: `docs/legal/mega-app-data-disclosure-matrix.md`
- Modify after decision: `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx`
- Modify after decision: `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx`
- Modify after decision: Household/dependent creation and cloud-activation code

- [ ] **Step 1: Choose one release contract: (A) temporarily prevent under-13 cloud dependent profiles, or (B) implement verified parental notice/consent, parent access/deletion, data minimization, retention, and child-SDK restrictions before enabling them.**
- [ ] **Step 2: Add a product test proving the chosen age/consent gate cannot be bypassed by another dependent entry path.**
- [ ] **Step 3: Make the policy and Terms describe the implemented contract without shifting Kwilt's obligations to the adult.**
- [ ] **Step 4: Obtain counsel review before enabling under-13 cloud processing.**

### Task 6: Material Terms acceptance and web deletion

**Files:**
- Create: `/Users/andrewwatanabe/kwilt-site/app/(site)/delete-account/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx`
- Modify: `src/features/onboarding/SignInInterstitial.tsx`
- Create: versioned legal-acceptance persistence only after counsel selects acceptance requirements

- [x] **Step 1: Add a prominent web deletion-request page that names Kwilt, supports a request without reinstalling the app, explains identity verification and subscription cancellation, and links from the Privacy Policy.**
- [x] **Step 2: Add a stable `#account-deletion` or dedicated deletion URL to the Google Play packet.**
- [ ] **Step 3: Have counsel decide whether arbitration/material Terms require clickwrap for existing users and how the 30-day opt-out period resets.**
- [ ] **Step 4: If required, persist the accepted Terms version and block account-backed use until the material update is accepted or declined.**

### Task 7: Release proof

**Files:**
- Update: the disclosure matrix and store packets with evidence references only

- [x] **Step 1: Run `npm run verify:changed -- --run` in Kwilt.**
- [x] **Step 2: Run all kwilt-site tests and `npm run build`.**
- [ ] **Step 3: Verify signed-device permissions, background location disclosure, account deletion, analytics payloads, and provider-disable paths.**
- [ ] **Step 4: Deploy the legal pages from an exact legal-only commit/package so unrelated dirty site work is not published.**
- [ ] **Step 5: Confirm live legal dates/content, then synchronize and capture App Store Connect and Google Play console summaries.**

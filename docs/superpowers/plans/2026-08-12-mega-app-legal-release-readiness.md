# Mega-App Legal Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kwilt's public legal terms, privacy disclosures, in-app legal surfaces, account-deletion behavior, and store-facing disclosure packet match version 1.0.104's unified Tools for Life app.

**Architecture:** Treat release disclosure as one product contract with four synchronized projections: source-backed data-flow matrix, public Privacy Policy/Terms, in-app legal and permission copy, and App Store/Google Play answers. Keep capability-specific facts explicit while preserving one Kwilt-wide account and deletion contract. Verify cloud deletion against the deployed Supabase schema before making policy promises.

**Tech Stack:** React Native/Expo, Next.js 14, TypeScript, Node test runner, Deno tests, Supabase Postgres/Auth/Storage/Edge Functions, Apple App Store Connect, Google Play Console.

---

### Task 1: Record the release disclosure source of truth

**Files:**
- Create: `docs/legal/mega-app-data-disclosure-matrix.md`
- Modify: `docs/terms-and-privacy-requirements.md`

- [ ] **Step 1: Map every shipping capability**

Record Planning/Chat, Money, Explore, Recipes/Meals/Groceries, Games, Household/Screen Time, Calendar, Health, attachments, subscriptions, analytics, and connected tools. For each, state on-device data, cloud data, third parties, other-user visibility, retention/deletion behavior, and platform data-type labels.

- [ ] **Step 2: Name every active processor and transmission path**

Include Supabase, OpenAI, Plaid, PostHog, RevenueCat, Apple, Google, Microsoft, Kroger/Smith's, Resend, Unsplash, GIPHY, and app-store infrastructure. Distinguish the normal AI proxy from ephemeral direct OpenAI Realtime audio connections.

- [ ] **Step 3: Lock the child/dependent model**

Document this exact contract: people under 13 may not create or control their own Kwilt account; an adult may create a parent-managed dependent profile and enable bounded household capabilities; direct teen account use requires guardian consent until the local age of majority.

- [ ] **Step 4: Replace the pre-mega-app requirements brief**

Update the requirements document so no active section describes Calendar as export-only, Explore as occasional place prompts, or Kwilt as only Arcs/Goals/To-dos plus coaching.

### Task 2: Add public-policy coverage tests

**Files:**
- Create: `/Users/andrewwatanabe/kwilt-site/lib/legalPolicyCoverage.test.ts`
- Test: `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx`
- Test: `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx`

- [ ] **Step 1: Write the failing coverage test**

Use `readFileSync` to assert both pages use `August 12, 2026`; assert the Privacy Policy names `Plaid`, `OpenAI`, `Kroger`, `Supabase`, `PostHog`, `RevenueCat`, `Resend`, `precise location`, `background location`, `transaction`, `Gameplay Content`, `dependent profile`, and `account deletion`; assert the Terms name `Money`, `Explore`, `Recipes`, `Groceries`, `Games`, `financial advice`, `food allergy`, `location`, `calendar`, and `parent-managed dependent profile`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --test-name-pattern="mega-app legal"`

Expected: failure because the May policies omit the required mega-app terms and effective date.

### Task 3: Rewrite the public Privacy Policy

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/privacy/page.tsx`
- Test: `/Users/andrewwatanabe/kwilt-site/lib/legalPolicyCoverage.test.ts`

- [ ] **Step 1: Replace the service summary and data map**

Describe Kwilt as one Tools for Life app and separate device-only processing from synced or provider-processed data. Add capability-specific categories for financial accounts/transactions/budgets, precise/background location/routes/places, recipes/import sources/dietary needs/meal and grocery collaboration/retailer connections, gameplay/private rooms, household/dependent profiles/Screen Time, durable Chat/audio, calendar connections, and Apple Health summaries.

- [ ] **Step 2: Replace generic provider labels with active names**

State the bounded purpose of Supabase, OpenAI, Plaid, PostHog, RevenueCat, Apple, Google, Microsoft, Kroger, Resend, Unsplash, and GIPHY. State that no data is sold or used for cross-context behavioral advertising.

- [ ] **Step 3: Make controls, sharing, retention, and deletion truthful**

Explain foreground/background location controls, local Family Controls tokens, Face ID locality, private-by-default capability data, explicit household/goal/meal/game sharing, account deletion, de-identified shared records, processor retention, and support-based privacy requests.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- --test-name-pattern="mega-app legal"`

Expected: pass.

### Task 4: Rewrite the public Terms of Use

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/terms/page.tsx`
- Test: `/Users/andrewwatanabe/kwilt-site/lib/legalPolicyCoverage.test.ts`

- [ ] **Step 1: Expand the service and eligibility contract**

Describe Planning/Chat, Money, Explore, Meals, Groceries, Games, Household/Screen Time, Calendar, Health, subscriptions, and connected tools. Add the parent-managed dependent-profile rule without representing Kwilt as a child-directed service.

- [ ] **Step 2: Add capability-specific reliance boundaries**

State that Money is not financial/tax/investment advice and bank data can be delayed; Explore is not emergency, navigation, or safety monitoring; recipe/meal information is not medical, nutrition, or allergy advice; retailer availability, price, cart, fulfillment, and checkout stay controlled by the retailer; Games/private rooms require lawful respectful conduct.

- [ ] **Step 3: Correct connected-calendar and user-content terms**

Cover Google/Microsoft connections in addition to `.ics` export. Extend user-content rights/responsibility to imported recipes, photos/scans/audio, player names, game submissions, meal choices, grocery items, and shared household content.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- --test-name-pattern="mega-app legal"`

Expected: pass.

### Task 5: Align in-app legal copy and canonical URLs

**Files:**
- Modify: `src/features/paywall/SubscriptionLegalLinks.tsx`
- Modify: `src/features/onboarding/SignInInterstitial.tsx`
- Modify: `src/features/account/PhoneAgentSettingsScreen.tsx`
- Modify: `src/capabilities/games/features/auth/AuthScreen.tsx`
- Modify: `src/features/account/LegalPrivacyScreen.tsx`
- Modify: `src/features/account/LegalPrivacyScreen.test.tsx`
- Modify: `src/features/paywall/SubscriptionLegalLinks.test.tsx`

- [ ] **Step 1: Write failing URL and description assertions**

Assert every active legal surface imports the canonical `https://go.kwilt.app/terms` and `https://go.kwilt.app/privacy` constants. Assert the legal screen describes Money, Explore, meals/recipes, games, AI/voice, household sharing, calendar, Health, and subscriptions.

- [ ] **Step 2: Consolidate all legal URLs**

Export the canonical constants from `SubscriptionLegalLinks.tsx` and replace local `kwilt.app`/`www.kwilt.app` constants in onboarding, Games auth, and Phone Agent settings.

- [ ] **Step 3: Update the in-app legal summary**

Use plain copy that says the policy covers planning and Chat, Money, Explore, meals and groceries, Games, family sharing, AI and voice, calendar, Health, and subscriptions.

- [ ] **Step 4: Run focused Jest**

Run: `npm test -- --runInBand src/features/paywall/SubscriptionLegalLinks.test.tsx src/features/account/LegalPrivacyScreen.test.tsx`

Expected: pass.

### Task 6: Make account deletion compatible with Household and person-owned data

**Files:**
- Create: `supabase/functions/_shared/accountDeletion.ts`
- Create: `supabase/functions/_shared/__tests__/accountDeletion_deno_test.ts`
- Modify: `supabase/functions/account-delete/index.ts`
- Create: migration via `supabase migration new account_deletion_household_compatibility`

- [ ] **Step 1: Write failing cleanup-plan tests**

Test that deletion always removes provider credentials and private capability roots, removes or de-identifies the deleting adult's person record, transfers creator provenance only to an authenticated remaining adult when a shared household survives, and never transfers ownership to a dependent.

- [ ] **Step 2: Run the focused Deno test and confirm RED**

Run: `deno test --no-lock --config supabase/functions/tsconfig.json supabase/functions/_shared/__tests__/accountDeletion_deno_test.ts`

Expected: failure because no account-deletion planner exists.

- [ ] **Step 3: Implement the pure cleanup planner and server orchestration**

Make the Edge Function resolve the signed-in person's household role and call one privileged database function that performs ordered cleanup in a transaction. Remove Plaid Items through Plaid before database credential deletion when a Plaid connection exists. Remove `activity_attachments`, `hero_images`, `recipe-import-artifacts`, and recipe media through the Storage API before deleting metadata.

- [ ] **Step 4: Add the transactional database cleanup function**

Use a private-schema `SECURITY DEFINER` function with an explicit user-id argument, locked `search_path`, revoked `PUBLIC` execute privilege, and service-role-only execution. The function must remove private person-owned recipe/grocery/meal data; leave shared records only where another authenticated adult remains; de-identify retained shared authorship; remove the user's active household membership; and prevent `NO ACTION` creator constraints from blocking Auth deletion.

- [ ] **Step 5: Run Deno and schema verification**

Run the focused Deno test, `npm run test:supabase-functions`, `supabase migration list --local`, and Supabase security advisors after applying the migration.

Expected: all tests pass; no new exposed privileged function or RLS warning.

### Task 7: Produce paste-ready store disclosures and release gates

**Files:**
- Create: `docs/app-store/privacy-disclosures-1.0.104.md`
- Create: `docs/google-play/data-safety-1.0.104.md`
- Modify: `docs/app-store/update-submission-prep-1.0.76.md` only by adding a supersession pointer; do not rewrite historical evidence.

- [ ] **Step 1: Write App Store Connect answers**

Include Contact Info, Financial Info, Health & Fitness, Precise and Coarse Location, Purchases, User Content, Photos/Videos, Audio Data, Gameplay Content, Calendar, Identifiers, Usage Data, and Diagnostics. For each, state linked/not linked, tracking false, collection purpose, and optionality.

- [ ] **Step 2: Write Google Play Data Safety answers**

Map the same practices to Play categories and explicitly cover encrypted transport, deletion request support, optional collection, background location, financial data, health/fitness, files, audio, calendar, user-generated content, gameplay/actions, identifiers, analytics, and account management.

- [ ] **Step 3: Add reviewer notes and hands-on gates**

Include exact navigation paths for Money/Plaid, Explore foreground/background controls, Recipes/Groceries, private Games, Household dependent profiles, Screen Time, legal links, and account deletion. Keep production-provider enablement and signed-device proof distinct.

### Task 8: Verify both repositories and live pages

**Files:**
- Verify all files above.

- [ ] **Step 1: Verify kwilt-site**

Run: `npm test && npm run build`

Expected: zero test failures and successful Next.js production build.

- [ ] **Step 2: Verify Kwilt**

Run: `npm run verify:changed -- --run`

Expected: all derived gates pass, with manual signed-device follow-ups reported separately.

- [ ] **Step 3: Verify live legal routing after deployment**

Check `https://kwilt.app/privacy`, `https://www.kwilt.app/privacy`, `https://go.kwilt.app/privacy`, and the corresponding Terms URLs. Confirm all return the August 12, 2026 policy text.

- [ ] **Step 4: Update App Store Connect and Play Console**

Publish the source-backed answers only after the public pages are live. Capture the current product-page preview and Play Data Safety summary as release evidence; do not claim completion if either console is inaccessible or awaiting review.

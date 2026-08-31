# Provisioned Email Sign-In And Demo Accounts Implementation Plan

> **Execution mode:** Inline in the current Kwilt checkout. Preserve unrelated Screen Time changes. Do not create a worktree, deploy backend changes, or provision production users without explicit production credentials and target authorization.

**Goal:** Let an existing, operator-provisioned Kwilt account sign in with email/password through every current sign-in surface, and provide an idempotent, secret-safe operator command for creating, resetting, and checking a fictional demo household.

**Architecture:** Add one provider-independent password-auth service returning the same Supabase `Session` as Apple/Google. Reuse one stateful email form in both the onboarding interstitial and intent-preserving auth drawer. Add a Node operator tool whose pure orchestration logic is tested separately from Supabase; the CLI reads all credentials from environment variables, uses only the service-role admin boundary, seeds ordinary auth/domain/Household rows, and prints a redacted receipt.

**Tech stack:** React Native/Expo, TypeScript, Supabase Auth/PostgREST, Jest + React Native Testing Library, Node test runner.

## UI contract

- **User job:** At an existing sign-in moment, enter a provisioned Kwilt account without depending on an Apple or Google session.
- **Three-second read:** Apple and Google remain primary. Email is a secondary option under “More sign-in options.”
- **Primary action after reveal:** “Sign in.”
- **Reveal later:** Email/password fields appear only after the secondary option is chosen.
- **Must not add:** Signup, recovery, demo badges, privileged roles, or claims that anyone can create an email account.
- **Nearest Kwilt precedents:** `SignInInterstitial`, `AuthPromptDrawerHost`, `Input`, `Button`, and `BottomDrawer`.
- **Proof path:** First-run interstitial and Settings → Sign in drawer; verify reveal/back, keyboard fields, validation, generic error, loading, retry, cancellation, and successful session handoff.

## Task 1: Password authentication service (TDD)

**Files:**

- Modify: `src/services/backend/auth.ts`
- Modify: `src/services/backend/auth.test.ts`

1. Add failing tests proving email is trimmed/lowercased, password is passed unchanged, a valid Supabase session is returned, and every rejected/missing-session response becomes one bounded `EmailPasswordSignInError` without exposing backend details.
2. Run the focused test and confirm the new cases fail for the missing function.
3. Implement `signInWithEmailPassword` using `supabase.auth.signInWithPassword` and no credential logging.
4. Re-run the focused test to green.

## Task 2: Shared email form (meaningful UI branching tests)

**Files:**

- Create: `src/features/account/EmailPasswordSignInForm.tsx`
- Create: `src/features/account/EmailPasswordSignInForm.test.tsx`

1. Add tests for required-field validation, submit normalization boundary, loading lock, generic failure, keeping email while clearing password, retry, cancel/back, accessibility labels, and session success.
2. Implement the form with canonical `Input`, `Button`, theme tokens, fixed copy, appropriate keyboard/content types, and an accessibility-live error.
3. Run the component test to green.

## Task 3: Wire every current sign-in surface

**Files:**

- Modify: `src/features/onboarding/SignInInterstitial.tsx`
- Modify: `src/features/account/AuthPromptDrawerHost.tsx`
- Create or modify focused tests for those surfaces.

1. Add the subdued “More sign-in options” / “Sign in with email” reveal while leaving Apple/Google visually primary.
2. Route email success through the interstitial’s existing returning-user/session completion logic.
3. Route email success through the drawer’s existing deferred resolution so Settings and intent-gated actions return to the exact requesting flow.
4. Make drawer height/content and keyboard behavior usable in both provider and email states; return from the form without cancelling the original intent.
5. Run the focused surface tests.

## Task 4: Idempotent demo-account operator tooling (TDD)

**Files:**

- Create: `scripts/demo-accounts/demo-account-lib.mjs`
- Create: `scripts/demo-accounts/demo-account-lib.test.mjs`
- Create: `scripts/demo-accounts/manage.mjs`
- Create: `scripts/demo-accounts/fixtures/review-household-v1.json`
- Modify: `package.json`

1. Add failing pure tests for configuration validation, alias resolution, create/update/reset behavior, exact-cohort deletion, deterministic fixture IDs, secret redaction, and verification failures.
2. Implement dependency-injected orchestration. Use admin `listUsers/createUser/updateUserById/deleteUser`; never accept a publishable key as the admin boundary.
3. Seed an ordinary owner/member household plus coherent fictional Arcs, Goals, and Activities using deterministic IDs and fixture metadata in record data only. Keep private domain rows owner-scoped and do not seed Plaid, health, calendar, Screen Time, retailer, push, or device credentials.
4. Implement `ensure`, `reset`, and `preflight` CLI modes. Read email/password/service key only from environment variables. Print alias, user IDs, fixture version, action, and verification status; never print emails, passwords, keys, or sessions.
5. Add package scripts and run the Node tests to green.

## Task 5: Operator runbook and product links

**Files:**

- Create: `docs/testing/demo-account-runbook.md`
- Modify if needed: `docs/feature-briefs/provisioned-email-sign-in-demo-accounts.md`

Document prerequisites, environment variable names, dry preflight, ensure/reset commands, redacted receipts, release-window rules, account-deletion recovery, provider limitations, and the exact proof still required against production/TestFlight/physical devices. Do not include real credentials or secret examples.

## Task 6: Completion verification

1. Run focused Jest and Node tests during implementation.
2. Run `npm run verify:changed -- --run` once after the intended slice is complete.
3. Inspect the current checkout, branch, commit, dirty state, active Metro port, and booted Simulator before runtime work.
4. Build/install from this checkout if needed and visually operate both sign-in entry paths. Record which states were actually observed. If a native/runtime or production credential boundary blocks a proof, report it separately rather than treating source tests as equivalent.
5. Review the final diff for secrets, credential-like fixture values, unrelated changes, whitespace errors, and accidental authorization branches on demo metadata.

## Explicitly deferred release operations

- Verify hosted production Supabase email/password provider settings.
- Select the controlled review emails and passwords in the release secret store.
- Run the operator command against the approved production project.
- Cold-install the exact TestFlight/production candidate on a physical device and sign in.
- Put active credentials and route notes into App Store Connect for the review window.

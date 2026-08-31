# Learning Release: Provisioned Email Sign-In And Demo Accounts

## Concept To Build

Add a secondary **Sign in with email** path for server-provisioned ordinary accounts, backed by resettable synthetic demo households that preserve Kwilt's real authorization behavior.

## Capability Delta

Today, the user or evaluator cannot:

- sign into Kwilt with transferable credentials independent of Apple or Google;
- reliably begin a review from a known account-backed household state.

After this release, the user or evaluator can:

- sign in to an existing provisioned account with email and password;
- use the same authenticated Kwilt paths as an Apple- or Google-authenticated user;
- enter a coherent synthetic owner account, plus a paired member account when needed.

Still intentionally not supported:

- creating an email account in the app;
- changing a demo account password in the app;
- linking email credentials to an existing social identity;
- real external-provider connections or privileged demo actions.

## User Experience

At an existing sign-in moment, the person expands **More sign-in options**, chooses **Sign in with email**, enters email and password, and submits. Success returns them to the exact flow that requested authentication. Failure uses one non-enumerating message and preserves the email field for correction.

The form identifies itself as an existing-account path. It includes no signup promise. Cancel returns to Apple, Google, and the existing local-use exit where available.

## Existing Product Relationship

This enhances the existing sign-in interstitial and auth drawer. It does not replace social sign-in, local-first use, capability-owned auth prompts, auth hydration, domain sync, entitlements, analytics identity, Settings, sign-out, or deletion.

## Buildable Slice

Must be real:

- email/password session creation through Supabase Auth;
- shared email form used by every existing sign-in surface;
- intent preservation and exact return after success;
- non-enumerating error handling and loading/accessibility states;
- server-only provisioning of at least one demo owner identity;
- versioned synthetic seed and idempotent reset/recreate operation;
- stable representative entitlement and ordinary RLS behavior;
- review preflight covering credentials, backend availability, data presence, deletion recovery, and signed-in routes.

Can be thin or temporary:

- provisioning may begin as an operator-run script rather than an admin UI;
- reset may be manual before a review window rather than scheduled;
- the first cohort may contain only one owner account if paired-account review is not part of the next submission.

Intentionally excluded:

- public signup, magic links, email OTP, account merging, and password settings;
- automatic nightly resets that can interrupt an active reviewer;
- real financial or household credentials;
- outbound messages to unapproved destinations.

## Release Channel

1. Local backend and focused tests for auth and reset contracts.
2. TestFlight with a non-production or explicitly approved synthetic account.
3. Production-small: the secondary sign-in path ships, while only provisioned accounts can use it.
4. Add the active production demo credentials and route notes to App Store Connect for the relevant submission.

## Brand-Goodwill Guardrails

- Keep Apple and Google primary and email visibly secondary.
- Say **existing Kwilt account** rather than implying open signup.
- Use realistic fictional data with no real family, financial, health, or communication records.
- Keep provider readiness and unavailable states truthful.
- Never describe the account as privileged or exempt from ordinary controls.

## Reversibility

The email entry can be remotely or source-disabled without changing existing sessions or social providers. Provisioned identities can be suspended or deleted. Synthetic data is versioned and replaceable. No client data model forks on demo status.

## Permanent Product Threshold

Keep the provisioned email path when it materially improves review, evaluation, support reproduction, or invited-pilot access without causing recurring confusion or security exceptions. Public email registration requires separate user-demand evidence and a complete recovery, verification, abuse, and identity-linking design.

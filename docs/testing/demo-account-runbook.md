# Demo Account Runbook

This runbook operates Kwilt's paired App Review cohort. The accounts are ordinary Supabase users. The fixture is fictional, its records use existing authorization rules, and no demo marker grants access or authority.

## What the fixture contains

`review-household-v1` creates:

- one owner and one caregiver account in **The Rowan Household**;
- separate private Arcs, Goals, and Activities for each account;
- one scheduled family reset activity that appears in Plan;
- one ready Chapter for the owner;
- one draft meal plan with two fictional meal ideas;
- one open Household Chore profile backed by the owner's activity;
- one personal synthetic Money category and monthly plan for the owner;
- optionally, a Plaid Sandbox-derived sample checking account, credit card, and transaction history.

The optional Money hydration creates a temporary Plaid Sandbox Item, imports its normalized sample accounts and transactions, and removes the temporary Item. It does not retain a Plaid access token or claim to be a live bank connection. The app labels these rows as sample data and does not send them through production Plaid refresh.

The fixture does not create calendar accounts, Health data, Screen Time authorization, retailer accounts, device credentials, push tokens, or real personal information.

## Required secrets

Supply these values through the approved release secret store or an ephemeral process environment. Do not paste them into a command, shell history, issue, task, screenshot, or source file.

- `KWILT_DEMO_SUPABASE_URL`
- `KWILT_DEMO_SERVICE_ROLE_KEY` — a server-only service-role key; the command rejects publishable keys
- `KWILT_DEMO_OWNER_EMAIL`
- `KWILT_DEMO_OWNER_PASSWORD`
- `KWILT_DEMO_MEMBER_EMAIL`
- `KWILT_DEMO_MEMBER_PASSWORD`
- `KWILT_DEMO_PUBLISHABLE_KEY` — required only for preflight; the command rejects service-role keys
- `KWILT_DEMO_PLAID_CLIENT_ID` — required only for optional Plaid hydration
- `KWILT_DEMO_PLAID_SANDBOX_SECRET` — required only for optional Plaid hydration

Passwords must be at least 12 characters. The service role must never be placed in an Expo or `EXPO_PUBLIC_*` environment variable.

## Commands

Run the command through the release secret-store wrapper so the values exist only for that process.

```text
npm run demo-accounts:ensure
npm run demo-accounts:reset
npm run demo-accounts:plaid
npm run demo-accounts:preflight
```

- `ensure` creates a missing auth user or rotates the existing user's supplied password, then idempotently applies the fixture.
- `reset` resolves the exact two auth users, removes only the deterministic fixture rows, and recreates them. It does not delete auth users.
- `plaid` replaces the owner's sample Money snapshot from a newly generated Plaid Sandbox custom user, then removes the temporary Sandbox Item.
- `preflight` is read-only. It signs in as both accounts using the publishable key, confirms the expected user IDs and fixture rows, proves each account cannot read the other's private Arc data, checks the owner can read the Plaid-derived sample while the member cannot, and confirms both can see the shared Household roster.

Each successful command prints a redacted JSON receipt containing aliases, auth user IDs, fixture version, actions, counts, and verification status. It never prints emails, passwords, keys, or sessions. Store the receipt in the release evidence location, not in a public artifact.

## Recorded live evidence

- [`2026-08-31-review-household-v1.md`](../delivery-evidence/demo-accounts/2026-08-31-review-household-v1.md)
  records the first production provisioning, Plaid Sandbox hydration, credential
  and privacy preflight, Simulator boundary, credential custody, and remaining
  release gates. It is redacted and contains no usable credentials or provider
  secrets.

## Reset safety

- Do not reset during an active App Review window.
- Confirm the target URL and project before injecting secrets.
- A reset stops if an alias, account, deterministic ID, credential, or verification result is ambiguous.
- If a reviewer deletes an account in-app, rerun `ensure` with the same controlled email and password. The tool accepts the newly created ordinary user ID and reseeds the deterministic fixture.
- Never add a password or real email to `review-household-v1.json`.

## Release preflight

Before adding credentials to App Store Connect:

1. Verify the hosted production Supabase project has email/password sign-in enabled and that public email signup remains absent from Kwilt's product surface.
2. Run `npm run demo-accounts:preflight` against that exact production target.
3. Cold-install the exact TestFlight candidate on a physical device.
4. Choose the quiet **Sign in with email** action and authenticate with the owner credentials.
5. Verify Home, Arcs/Goals/Activities, Plan, Chapters, Meals, Chores, Money, Settings, sign-out, and re-entry. Confirm unavailable external providers are described truthfully.
6. Repeat the private/shared checks with the member credentials.
7. Put only the active reviewer credentials and concise navigation notes in App Store Connect review details.
8. Keep the backend and cohort active throughout review. Rotate or retire the credentials afterward according to the release decision.

Source tests, a local receipt, Simulator behavior, TestFlight behavior, physical-device behavior, production backend readiness, and actual App Review are separate proof layers. Record only the layers actually completed.

## Rollback

The app's email entry can be removed or disabled without changing Apple/Google sessions or downstream authorization. The cohort can be retired separately. No production rollback should branch on `kwilt_demo_alias` or `kwilt_demo_fixture_version`; those fields are operational metadata only.

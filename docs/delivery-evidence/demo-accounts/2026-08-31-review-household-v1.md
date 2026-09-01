# App Review demo household evidence — 2026-08-31

## Outcome

Kwilt's production Supabase project contains the deterministic
`review-household-v1` App Review cohort. The cohort has two ordinary confirmed
email/password users, one shared fictional household, private account-owned
records, and a Plaid Sandbox-derived Money snapshot for the owner.

This record is intentionally redacted. It contains no email addresses,
passwords, API keys, sessions, Plaid access tokens, or raw provider responses.

## Provisioning receipts

| Operation | Checked at | Result |
| --- | --- | --- |
| `ensure` | `2026-08-31T22:17:28.363Z` | Passed; `review-owner` and `review-member` were created and the deterministic fixture was verified. |
| `plaid-sandbox-hydrate` | `2026-08-31T22:21:06.862Z` | Passed; one sample connection, two accounts, and 18 transactions were imported. The temporary Sandbox Item was removed and no Plaid access token was retained. |
| `preflight` | `2026-08-31T22:21:21.819Z` | Passed; both credentials authenticated, fixture data was readable at the expected scope, private Arc access was isolated, both users could read the household roster, and only the owner could read the sample Money data. |

Provisioned aliases and redacted identifiers:

- `review-owner`: `09834fa1-a058-4fbf-a017-45a501c89ca2`
- `review-member`: `1ab858ff-9da2-4076-8b2b-435d3ca8ebb7`

## Deterministic fixture counts

| Record type | Count |
| --- | ---: |
| People | 2 |
| Auth bindings | 2 |
| Households | 1 |
| Memberships | 2 |
| Arcs | 2 |
| Goals | 2 |
| Activities | 2 |
| Chapter templates | 1 |
| Chapters | 1 |
| Meal plans | 1 |
| Meal candidates | 2 |
| Chore profiles | 1 |
| Budget categories | 1 |
| Budget plans | 1 |
| Sample Plaid connections | 1 |
| Sample Plaid accounts | 2 |
| Sample Plaid transactions | 18 |

## Credential custody

The nine values required by the provisioning tools are stored in the unlocked
macOS login Keychain under the account `kwilt-demo-accounts` and service names
beginning with `kwilt-demo/KWILT_DEMO_`. All nine Keychain items were resolved
after provisioning. No matching secret value was written to the repository or
`.env.local`.

The account emails and passwords must be retrieved from that approved local
credential store only when running the cohort tools or preparing App Store
Connect review details. They must not be copied into this evidence file.

## Source and automated proof

- Checkout: `/Users/andrewwatanabe/Kwilt`
- Live provisioning base: `d33b906e`, with the demo-account implementation in
  the then-dirty working tree.
- Captured source commit: `9c467790b05e3a91f67c830ee2a67975ac8b9aa4`
  (`feat: prepare review access and recipe collections`), now on `origin/main`.
- `npm run test:demo-accounts`: 10 tests passed.
- `npm run verify:changed -- --run`: passed after the Plaid readiness repair,
  including app/test typechecks, related Jest tests, product lint, code-health
  ratchet, agent-map generation, and architecture lint.
- The Plaid regression test proves that an initially empty
  `/transactions/sync` response is retried until the complete two-account,
  18-transaction fixture is available. The hydrator fails closed after its
  bounded deadline instead of accepting an empty snapshot.

## Simulator proof

The current source was built and installed on the `Kwilt Chat Matrix` iOS 26.5
Simulator. The sign-in interstitial visibly showed Apple and Google as the
primary actions, `Sign in with email` as a quiet text action, and
`Set up a shared device`. Selecting email opened the email/password form with a
working return path.

This is local Simulator proof. No screenshot was retained in this evidence
directory.

## Unproven release layers

This record does not prove a cold TestFlight install, physical-device behavior,
App Store Connect credential entry, App Review access, email delivery, or an
active review window. Those remain separate release gates in the runbook.

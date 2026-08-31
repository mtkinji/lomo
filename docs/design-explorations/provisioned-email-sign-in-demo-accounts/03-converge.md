# Converge: Provisioned Email Sign-In And Demo Accounts

## Qualitative comparison

| Alternative | Trust and authority | App Review reliability | System fit | Operational burden | Current evidence fit |
| --- | --- | --- | --- | --- | --- |
| Provisioned ordinary accounts | Strong | Strong | Strong | Medium | Strong |
| Fully featured demo mode | Medium | Medium | Weak | High | Medium |
| Public email registration | Strong | Strong | Moderate | High | Weak |
| Expiring access link | Strong | Weak-to-medium | Moderate | High | Medium |

## Chosen alternative

**Provisioned Ordinary Accounts.** Add secondary email/password sign-in for existing provisioned identities and build a versioned synthetic demo-account lifecycle around ordinary Supabase users.

## Capability delta

Today, Kwilt cannot provide a transferable credential that opens its account-backed production experience without access to a specific Apple or Google identity.

After this release:

- an invited evaluator can enter an ordinary provisioned Kwilt account with email and password;
- App Review can inspect signed-in capabilities using credentials supplied in App Store Connect;
- Kwilt can reset or recreate synthetic demo identities from a known template;
- paired demo identities can exercise real sharing and Household authorization boundaries.

Still intentionally unsupported:

- public email signup;
- magic links and email OTP;
- provider linking or merging;
- privileged demo capabilities;
- fake bank, calendar, health, Screen Time, retailer, or notification receipts.

## Reductive design decisions

- Add one secondary button and one email/password form; do not create a new onboarding branch.
- Reuse the same form from the first-time interstitial, auth drawer, and signed-out Settings entry.
- Use the existing Supabase session, auth-state listener, sync, entitlements, analytics identity, and account-deletion paths after sign-in.
- Do not add a public demo-mode switch, demo badge, account chooser, registration flow, or password-management settings in this release.
- Keep operational account provisioning and reset out of the mobile client.

## Demo authority contract

- A demo account is an ordinary auth user and ordinary application principal.
- `is_demo` or equivalent metadata may select reset and outbound-safety policy; it must never grant data access, roles, entitlements, or admin authority by itself.
- RLS, Household membership, capability authorization, confirmations, and receipts apply unchanged.
- Demo accounts contain synthetic data only and cannot connect real financial, health, calendar, Screen Time, retailer, or household-device credentials.
- Outbound effects are either disabled honestly or restricted to an allowlisted demo cohort and Kwilt-controlled destinations.
- Account deletion remains available; operations must be able to recreate a deleted demo identity with the published credentials and a newly seeded ordinary user ID.

## Activation path

Apple and Google stay prominent. **Sign in with email** appears beneath a subdued **More sign-in options** affordance whenever Kwilt already asks for sign-in. The form says that email sign-in is for an existing Kwilt account. It does not advertise account creation.

App Review activation is operational: credentials and a short route guide are placed in App Store Connect review details after a production preflight confirms sign-in and representative data.

## Accepted trade-offs

- Invited-account language is narrower than a conventional public email signup flow.
- The first release needs operational provisioning and reset tooling even though ordinary users will rarely see the email form.
- Provider-bound capabilities will remain bounded in the demo rather than simulated as successful.

## Rejected trade-offs

- A client-only demo engine that can drift from production.
- Shared Apple or Google credentials.
- Open registration before recovery, linking, abuse, and support policies are ready.
- Demo-only elevated roles or hidden bypasses.

## Stated bet

We're betting that provisioned ordinary accounts will make App Review and invited evaluation dependable without creating meaningful user confusion or a second authorization model. If that is false, we would revisit the entry treatment or move toward isolated expiring clones—not expand immediately into public registration.

## Success signal

A reviewer can install a production candidate, find email sign-in, enter the supplied credentials, and inspect the intended account-backed story without operator intervention; the same account cannot access anything its ordinary role would not authorize.

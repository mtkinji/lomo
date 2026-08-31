---
id: brief-provisioned-email-sign-in-demo-accounts
title: Provisioned Email Sign-In And Demo Accounts
status: accepted
audiences:
  [audience-ai-native-life-operators, audience-aspirational-family-organizers]
personas: [Nina, Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-invite-the-right-people-in]
related_briefs: []
owner: andrew
last_updated: 2026-08-31
---

# Provisioned Email Sign-In And Demo Accounts

## Context

Kwilt supports Apple and Google authentication while preserving local use before sign-in. Those providers are appropriate for ordinary users but do not produce safe, transferable credentials for App Review, invited evaluation, repeatable support reproduction, or paired-account QA. Apple requires account-based apps to provide an active demo account or a fully featured demo mode for review. Kwilt needs the former without creating a client-side demo engine, using real household data, or broadening account authority.

## Target audience

The durable product audience is `audience-ai-native-life-operators`: people who expect one bounded identity to reach the same private Kwilt system across surfaces. The operating audience for the first release is App Review and invited evaluators. `audience-aspirational-family-organizers` shapes the fictional household story shown inside the demo account.

## Representative persona

Nina expects identity and permission boundaries to remain reliable across surfaces. Maya ensures the account represents warm, ordinary family life rather than an internal test dashboard.

## Aspirational design challenge

How might we help Nina and trusted evaluators reach a representative Kwilt identity reliably, while preserving optional sign-in, ordinary authorization, and truthful product behavior?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — account access is trustworthy only when identity, private context, authority, and recovery are predictable.

## Job flow step

The primary link is `job-flow-nina-trust-ai-with-my-life-system`, step 1: arrive with visible scope and an exact return destination. Current downstream delivery is strong once authenticated, but there is no transferable credential for an external reviewer. A paired demo cohort also creates reusable evidence for the unresolved separate-account lifecycle gap in `job-flow-david-invite-the-right-people-in`.

## JTBD framing

When a person needs to return to a trusted Kwilt identity or evaluate its account-backed experience, they want dependable access that is not tied to someone else's Apple or Google session, so the same private system is available without weakening account boundaries. This serves `jtbd-trust-this-app-with-my-life`; paired ordinary identities additionally serve `jtbd-invite-the-right-people-in` by making both sides of bounded sharing reviewable.

## Design

### Product decision

Ship email/password sign-in for existing, server-provisioned accounts. Do not ship public email registration in this release.

Apple and Google remain the primary choices. Existing sign-in surfaces add a subdued **More sign-in options** affordance that reveals **Sign in with email**. The email form is shared across the first-time interstitial, intent-gated auth drawer, and signed-out Settings entry so validation, error behavior, accessibility, and return semantics do not fork.

### User flow

1. Kwilt reaches an existing sign-in moment and preserves the requesting intent and destination.
2. The person expands **More sign-in options** and chooses **Sign in with email**.
3. The form asks for email and password and says it is for an existing Kwilt account.
4. Submit calls Supabase password sign-in.
5. Success enters the existing auth-state pipeline. No downstream feature branches on authentication method.
6. Kwilt returns to the exact requesting flow.
7. A failed attempt uses one non-enumerating message, keeps the email value, clears the password, and allows retry or cancel.

Initial copy:

- Entry: **Sign in with email**
- Form title: **Use your Kwilt account**
- Supporting text: **Sign in with an existing email account.**
- Fields: **Email**, **Password**
- Submit: **Sign in**
- Failure: **That email or password wasn't recognized. Try again.**

No signup link, password-change setting, or claim of general email-account availability appears in this release.

### Authentication contract

- Add a provider-independent `signInWithEmailPassword` service that returns the same Supabase `Session` consumed by Apple and Google flows.
- Normalize and trim email client-side; never log email or password.
- Use generic credential failure messaging and bounded diagnostic codes.
- Preserve existing session persistence, refresh-token recovery, auth hydration, user-specific state transition, sync, analytics identification, entitlements, push registration, sign-out, and deletion.
- Authentication method is presentation metadata only. It does not select authorization, data scope, routing, or entitlements.
- Public signup remains disabled at the product surface. Hosted Supabase provider settings must be verified before release; local `config.toml` is not proof of production configuration.

### Provisioning contract

Provisioning is server- or operator-owned and never uses the mobile publishable key.

The first implementation provides an idempotent operator command that:

1. resolves a non-secret demo alias to an intended email identity;
2. creates or updates the ordinary Supabase auth user through an admin boundary;
3. sets a strong rotated password supplied outside source control;
4. applies ordinary profile, entitlement, and Household records;
5. seeds one exact synthetic fixture version;
6. verifies expected records and negative authorization boundaries;
7. returns a redacted receipt with alias, auth user ID, fixture version, action, and verification result.

Passwords, service-role credentials, and review credentials never enter Git, logs, analytics, screenshots, fixture files, or durable design artifacts.

### Demo cohort

Minimum cohort:

- `review-owner`: a Maya-shaped adult household owner with representative Arcs, Goals, Activities, Chapters, Plan, Food, Chores, and synthetic Money data.

Preferred paired cohort:

- `review-member`: a second ordinary adult or caregiver identity in the same Household with private personal data separate from the owner.

Additional evaluator clones are deferred until concurrent sessions create real state-collision evidence. Use separate aliases and user IDs rather than shared mutable credentials when clones are introduced.

### Synthetic data contract

- Every seeded record is fictional and carries a source-controlled fixture version operationally.
- The data demonstrates a coherent household story, not maximum object counts.
- Private Goals, chats, Money, and Activities remain owner-scoped. Household membership shares only capability-owned records allowed by their existing contracts.
- Money uses explicitly synthetic snapshots and never connects Plaid.
- Health, calendar, Screen Time, retailer, push, and device-bound capability states remain disconnected or honestly require setup.
- Demo Chat uses only authoritative synthetic records available to that account and the same action policy as any other account.

### Demo governance

If a demo registry is required, it is service-role-only and contains operational fields such as:

- demo alias;
- auth user ID;
- fixture/template version;
- cohort and role;
- state: active, suspended, resetting, or retired;
- last reset and last verification timestamps;
- optional review-window expiry;
- outbound-safety policy identifier.

The registry must not contain a password. A demo marker must not grant a role, entitlement, RLS access, confirmation exemption, or admin status.

### Reset and recreation

The reset operation is idempotent by alias and fixture version. It removes only records owned by the exact demo cohort, recreates the intended synthetic graph, and verifies the result. It must stop rather than guess when ownership or fixture version is ambiguous.

Do not reset automatically during an active review window. Preflight immediately before submission, record the result, and monitor account availability. If a reviewer uses in-app account deletion, the operator can recreate the account with the same published email/password and a new ordinary user ID, then reseed and reverify it.

### Outbound and provider safety

- Demo users have no super-admin or hidden product role.
- Invitations and messages may target only another demo-cohort identity or a Kwilt-controlled allowlist when a demo outbound policy is active.
- Any disabled action says it is unavailable in this demo account; it does not claim success.
- External provider credentials are never seeded, copied, or shared.
- Server authorization remains derived from the ordinary user, membership, capability policy, expected version, and explicit confirmation.

### App Review handoff

For each production submission that depends on the account:

1. run the production demo preflight against the exact build/backend target;
2. cold-install the candidate and sign in with the published credentials;
3. verify representative routes and truthful provider limitations;
4. place the active credentials and concise route notes in App Store Connect review details;
5. keep backend services and the account active for the entire review window;
6. rotate or retire the credential after the window when appropriate.

The handoff distinguishes source tests, local backend proof, Simulator/TestFlight proof, production backend readiness, and actual App Review completion.

### Security and privacy invariants

- No credential or service-role secret in the client bundle or repository.
- No user enumeration through UI errors.
- No demo metadata accepted from the client as authority.
- No real personal, household, financial, health, or provider data.
- RLS negative tests cover cross-owner, cross-household, private-object, Money, Chat, and admin boundaries.
- Rate limits and ordinary session security apply to demo accounts.
- Account deletion remains available and truthful.

### Rollout and rollback

Release first through TestFlight, then production-small. The email entry can be disabled without altering existing Apple/Google sessions. Demo identities can be suspended or removed independently. Because downstream code consumes an ordinary session and no client data model forks on demo status, rollback does not migrate ordinary user data.

## Acceptance criteria

### Client authentication

- Every existing Apple/Google sign-in surface offers the same secondary email form.
- Apple and Google remain visually primary; signed-out local use remains available wherever it is available today.
- A valid provisioned credential returns the person to the exact requesting flow.
- Invalid credentials produce one non-enumerating message and never log sensitive input.
- Auth hydration, refresh, sync, entitlements, analytics identity, push registration, sign-out, and deletion behave the same regardless of provider.
- Focused tests cover validation, loading, retry, cancel, accessibility, success, and intent preservation.

### Provisioning and reset

- Provisioning and reset require a server/admin credential unavailable to the client.
- The command is idempotent for the same alias and fixture version.
- Receipts are redacted and sufficient to identify the exact target and fixture version.
- Reset deletes or replaces only the resolved demo cohort's owned records.
- Delete/recreate restores the published identity and verified fixture without reusing an old user ID assumption.
- No password or service credential appears in tests, fixtures, logs, or diffs.

### Authorization

- Demo accounts have no admin entitlement unless granted through the same separately authorized mechanism as any ordinary account; the initial cohort must not have it.
- Cross-user and cross-household RLS tests fail closed.
- Paired-account tests prove Household roster visibility does not expose private Goals, chats, Money, or Activities.
- Demo metadata cannot alter RLS, capabilities, confirmations, entitlements, or receipts.

### Release proof

- Production Supabase email/password provider state is verified explicitly.
- The exact TestFlight or production candidate completes cold-install email sign-in on a physical device.
- The production demo preflight confirms backend availability, fixture version, credentials, representative routes, and deletion recovery.
- App Store Connect review details receive only active credentials and concise instructions; credentials never enter source control.

## Learning and instrumentation

Track method selection and bounded auth outcome without email addresses. Record redacted provisioning/reset receipts and a manual release preflight. Evaluate discoverability, reviewer independence, state drift, ordinary-user confusion, and whether the account honestly demonstrates Kwilt without privileged exceptions.

## Success signal

App Review or an invited evaluator can cold-install the candidate, find email sign-in, authenticate with supplied credentials, and inspect the intended account-backed story without operator intervention. The account remains an ordinary principal, and reset/recreation restores a known synthetic state without touching real users.

## Spec refinement

The concept is buildable, but implementation should not begin until these release-owned values are selected outside source control:

- the first demo alias and controlled email address;
- whether release 1 includes only the owner or the owner/member pair;
- the approved production backend target;
- the credential storage and rotation owner;
- the exact outbound allowlist policy for demo identities.

These values do not change the architecture and can be supplied during implementation setup. The default implementation assumption is an owner/member pair because it provides the stronger Household and sharing proof.

## Open questions

- Should the first production cohort include the paired member immediately, or follow after the owner account proves App Review access?
- Which synthetic fixture should become the canonical source for App Store imagery as well as demo accounts?
- Should provisioned pilot accounts receive self-service password reset before email sign-in expands beyond controlled evaluation?

## Source records

- [`00-frame.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/00-frame.md)
- [`01-yes-and.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/01-yes-and.md)
- [`02-diverge.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/02-diverge.md)
- [`03-converge.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/03-converge.md)
- [`04-learning-release.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/04-learning-release.md)
- [`05-evaluate-learning.md`](../design-explorations/provisioned-email-sign-in-demo-accounts/05-evaluate-learning.md)

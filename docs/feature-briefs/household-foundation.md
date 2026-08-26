---
id: brief-household-foundation
title: Household Foundation
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-activity-assignment, brief-chores-as-recurring-activities, brief-family-screen-time-controls, brief-shared-household-device-profiles]
owner: andrew
last_updated: 2026-08-26
---

# Household Foundation

## Context

Kwilt needs a private operational boundary for people who coordinate daily life. Existing shared-Goal membership cannot represent household-wide roles, dependent children, capability authority, or managed devices, and Apple Family Sharing cannot represent Kwilt data access.

## Target audience

`audience-aspirational-family-organizers` wants family participation without managing a workspace or exposing personal life by default.

## Representative persona

Maya wants another caregiver and her children to participate in specific household routines while everyone retains a private personal Kwilt space.

## Aspirational design challenge

How might we let Maya establish who belongs to her private household and who may coordinate specific family capabilities, without flattening the family into shared credentials or a universally shared workspace?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because family participation should help ordinary commitments move, not merely create an account roster.

## Job flow step

`job-flow-maya-move-family-life-forward` now scores **Family participation** 3/5. Household invitations and capability foundations have moved the job forward, while ordinary household responsibility and safe shared-iPad participation remain incomplete.

## JTBD framing

When family members need to coordinate inside Kwilt, Maya wants to invite the right people into a bounded private space without revealing unrelated personal data, so the family can participate and still trust Kwilt.

## Design

### Objects

- **Household** — stable private operational boundary.
- **Household member** — a participant identity inside the household.
- **Auth binding** — optional link from a member to an authenticated Kwilt user.
- **Dependent profile** — a member without required email/auth identity.
- **Child capability activation** — one named capability's lifecycle for one dependent child.
- **Capability grant** — named authority for a member over a capability and optional dependent scope.
- **Invitation** — expiring, auditable path for an authenticated person to join in a proposed role or connect an existing dependent profile to their account.
- **Shared-device designation** — one trusted device's Household Mode attachment to a Household and one individually assigned caregiver account.
- **Household member code** — optional caregiver-managed code that selects a dependent child as the acting member on a designated shared device; it is not an account password or caregiver credential.

### Initial roles

| Role | Initial authority |
| --- | --- |
| Owner | Household lifecycle, adult invitations, role/grant administration, dependent profiles |
| Caregiver | Granted family-capability administration for named children; no billing or ownership transfer by default |
| Child | Use only the child-facing capabilities activated for this child; no household administration |

Role does not automatically grant access to capability data. A caregiver must also hold the relevant capability/child grant. Billing owner, Apple family organizer, Kwilt household owner, and device authorizer remain separate facts.

### Child-by-child capability activation

An authorized caregiver chooses capabilities independently for each child from **Settings > Household > [Child] > Capabilities**. Optional capabilities start off for a new dependent profile and appear in the child's Kwilt menu only after that child's activation reaches `active`.

The activation contract is distinct from authority and payment:

- **Caregiver grant:** Andrew may manage Screen Time for Riley.
- **Child activation:** Screen Time is active for Riley.
- **Entitlement:** the Household is commercially eligible for Screen Time.
- **Readiness:** Riley's device completed the required Apple authorization and policy handshake.

The first Household slice may expose only capabilities with an accepted child-participation contract. Activating one capability never activates siblings or dependencies silently. If Screen Time later references assigned responsibilities, the caregiver must explicitly activate To-dos for that child; schedule-only Screen Time remains possible without that dependency.

Deactivation previews what disappears, what data remains, and whether cleanup is required. Content capabilities may deactivate immediately after server acknowledgement. Device-enforced capabilities such as Screen Time remain **Turning off** until the child device confirms that monitoring and restrictions were removed.

### Privacy contract

- Joining a household shares the roster and the minimum relationship metadata required for authorized capabilities.
- Personal Activities, Goals, Arcs, Chapters, chats, Money data, and other capability content remain private.
- Each capability must explicitly opt into Household and define its own shared-data policy.
- Broader-family/shared-Goal participation remains a separate relationship space.
- Household setup changes eligibility, not everyday capability chrome. To-dos does not show people fields, avatars, filters, or empty family views until an Activity is deliberately assigned.

### Caregiver-anchored Household Mode

A designated shared iPad remains authenticated to one individually assigned caregiver. **Household Mode** is a restricted family-facing layer over that account, not a shared family credential or a separate full account for every child.

The mode-aware identity control lists only eligible dependent children and the assigned caregiver:

- selecting a child establishes a bounded actor session and requests that child's household member code when configured;
- switching to another child changes attribution only after that child's required code succeeds;
- selecting the caregiver requires fresh Face ID, Touch ID, or device-passcode authentication;
- successful local authentication exits Household Mode and restores the caregiver's complete ordinary Kwilt; and
- cancellation or failure leaves the current child context unchanged.

Device biometrics authorize access to the assigned caregiver account; they do not identify which enrolled adult supplied the face, fingerprint, or passcode. Households needing person-specific adult proof require account reauthentication.

The same active-member control appears in the capability-menu avatar and in capability headers where attribution matters, beginning with Chores. A caregiver viewing a child's information on a personal device remains the caregiver; it is not an actor switch or impersonation.

The initially accepted Household Mode set is:

- Chores;
- the selected child's own activated Arcs, Goals, and To-dos;
- household-approved/shared Recipes;
- the shared Meal Plan; and
- the shared Groceries list.

Chat, Chapters, Money, and every other capability remain unavailable until each declares an accepted household-safe projection and allowed actions. A child's own projection is not a grant to the caregiver or another child, and Household membership never exposes the caregiver's corresponding private content.

See [Caregiver-anchored Household Mode](shared-household-device-profiles.md) for the complete interaction and release boundary.

### Devices and guardian-managed child access

A dependent profile is a complete Household member even when the child has no Kwilt
account and no device. Device participation is optional infrastructure for the moments
when Charlie needs to use Kwilt directly.

Charlie's member page owns a neutral **Devices** section. With no personal device it
shows **No iPhone connected**, explains inside the same card that Charlie can still
participate in the household without one, and offers a secondary **Connect Charlie's
iPhone** action. That action immediately
creates a short-lived setup session for Charlie's exact membership and presents its QR
code and six-digit manual-code fallback; there is no second invitation or generic **Continue**.
The code carries that
guardian-approved context to Charlie's device. Claiming it creates narrow,
device-bound child access without requiring a conventional child login.

The caregiver surface is a live pairing receipt rather than a menu. Native Share lives
in the header; leaving through Back cancels the active session; and account attachment
is offered on the receiving device, where identity can be reviewed. While the receipt
is visible, Kwilt checks the existing manager-authorized device-list RPC every three
seconds and automatically replaces the QR/code with **Charlie's device is connected**
when the exact personal-device claim appears. This receipt confirms Kwilt attachment
only; it does not imply Apple Screen Time authorization or applied policy.

A caregiver-signed-in shared iPad follows a separate path: designate the current iPad
once for the Household, select eligible members and capabilities, then use bounded
member sessions. It is not paired to each child and is not listed as Charlie's personal
device.

See [Household device participation](../architecture/household-device-participation.md)
for the canonical identity, setup, security, and lifecycle contract.

### Connecting a child who already uses Kwilt

**Add a child** creates or selects Charlie's exact Household membership first. If
Charlie already has a Kwilt account, Andrew may explicitly attach that authenticated
account to the membership; Kwilt does not create a second, disconnected Charlie. This
is a secondary path, not a prerequisite for setting up a guardian-managed device.

The account invitation may be delivered in several ways, but every method creates the same short-lived server invitation and requires Charlie to review and accept while signed in:

| Connection method | Intended moment | Fallback or constraint |
| --- | --- | --- |
| **Find nearby Kwilt devices** | Andrew and Charlie have both phones together | Both people explicitly turn on discovery; QR and short code remain available |
| **Scan a QR code** | The phones are together but nearby discovery is unavailable or unwanted | Short code remains available for camera or permission failure |
| **Send an invitation** | Andrew and Charlie are apart | Native share sheet supports Messages, email, and other apps; the link survives sign-in or account creation |
| **Create a child profile** | Charlie does not yet have a Kwilt account | The profile can receive guardian-managed device access now and may attach an account later; linking is never inferred by matching names or email addresses |

Nearby discovery is a user-controlled setup mode, not ambient people discovery. Both devices must be foregrounded and deliberately enter **Find nearby Kwilt devices**. Kwilt advertises only an ephemeral pairing session, shows a matching human-readable confirmation phrase on both devices, and requires confirmation on both phones before presenting the Household invitation. It does not publish a browsable child profile, precise distance, email address, household roster, or background presence. Discovery stops when the setup surface closes or times out.

Account-invitation transports and device-setup transports must not be conflated. An
account invitation is accepted by an authenticated person and creates an optional auth
binding. A device setup QR or code represents a short-lived guardian authorization for
one existing child membership and can create device-bound managed access. Neither
transport activates a capability or supplies Apple guardian authorization.

Charlie sees who invited him, the proposed child role, what Household membership shares, what remains private, and that Screen Time device authorization is a separate later step. He may decline. Kwilt does not reveal to Andrew whether an entered email already has an account, and it does not silently merge an authenticated account with a same-named dependent profile.

### Lifecycle

Kwilt does not create an empty Household during ordinary onboarding. The owner starts by adding or inviting the first other person from Settings, Screen Time setup, Activity assignment, or another family capability. Kwilt atomically creates the Household, creates the owner's membership, and creates the dependent profile or invitation. The user should not have to complete a separate **Create household** ceremony first.

Add or invite first person → household and owner membership are created → invited person accepts with an independent account or dependent profile becomes available → grant named capability authority → optionally bind devices.

A shared iPad may be designated after the caregiver signs in and chooses **Set up this
iPad for your household**, from **Settings > Household > Household devices**, or
contextually after a dependent or household-facing capability is added. Designation
assigns the current caregiver account as the protected adult account beneath Household
Mode; it does not create a new family login and does not require QR pairing for each
child.

For a dependent child, profile creation is followed by an explicit capability choice. Creating the profile alone does not activate To-dos, Screen Time, Agent, Money, Games, Stories, or future capabilities.

Accepting an invitation joins the inviter's existing Household. Apple Family Sharing never silently creates or populates a Kwilt Household; the systems have different identity, consent, authority, and data-access meanings.

For Screen Time, Apple Family Sharing is still the required platform trust anchor for
child-device authorization. After Charlie's personal device claims guardian-managed
Kwilt access, that device requests Apple's `.child` Family Controls authorization and a
parent or guardian in the same Apple family approves it. Apple authorization does not
replace the Kwilt device claim, and the Kwilt device claim does not replace Apple
authorization or the applied policy receipt.

Removal and household deletion require explicit dependent-data and managed-device cleanup. Authority-changing operations require a server round trip; offline clients may display last-known state but not claim a role change succeeded.

Backgrounding or sufficient inactivity must cover caregiver content before a child can interact again. The exact timeout remains capability-platform policy, but a dedicated family iPad launches and returns to Household Mode by default. Optional Apple Guided Access may keep the physical iPad inside Kwilt; it does not establish Kwilt identity, membership, or authority.

### Data and authorization contract

- Stable household and member IDs independent of auth provider IDs.
- Membership status and role history.
- One-time invitation records with proposed role, optional target member, expiry, revocation, acceptance, and transport-agnostic token hashes.
- Ephemeral nearby-pairing sessions that reveal no durable account or Household identifiers before mutual confirmation.
- Capability grants scoped to household, capability, and optionally child/member.
- Child capability activations scoped to household, child member, and capability, with `inactive`, `pending_setup`, `active`, `pending_cleanup`, and `blocked` lifecycle states.
- Shared-device designation with assigned caregiver, lifecycle, revocation, and last-known safe-mode state.
- Household-member-code verifier and attempt policy that never stores or exposes the plain code.
- Bounded active-member session state distinct from the underlying authenticated caregiver.
- Server-enforced mutation authorization and negative RLS coverage.
- Append-only invitation, grant, role, child-capability activation, shared-device designation/revocation, caregiver unlock, removal, and release audit events.

## Success signal

Andrew and Blaire can establish one household, invite a child who already uses Kwilt without creating a duplicate identity, create dependent profiles for children without accounts, activate different capabilities for each child, correctly explain their authority, and confirm that no personal capability data or capability access appeared merely because someone joined.

The job-flow score does not increase on infrastructure alone; it becomes eligible to move when Assignment or another household capability creates useful participation.

## Non-goals

- Shared login credentials.
- A public family graph or discovery.
- Automatic adoption by every Kwilt capability.
- A Household-wide switch that activates the same capability set for every child.
- An empty Household as a required onboarding milestone.
- Subscription sharing or App Store Family Sharing behavior.
- Managed-device enforcement.
- Automatic or silent child-profile-to-account conversion.
- A family-owned master account, shared caregiver password, or full cached multi-account switching.
- Treating Face ID or Touch ID as proof of which child or adult acted.

## Open questions

- What recovery process applies if the sole household owner loses account access?
- What exact inactivity/background interval safely returns an unlocked caregiver account to Household Mode?
- Does the neutral Household Mode state remember the last child or always ask who is using Kwilt?

## Accepted implementation decisions

- An invited adult joins as a caregiver but receives no child-capability grants automatically. The owner grants authority for a named capability and child explicitly.
- The first production slice supports `todos` and `screen-time` as catalog entries, while their child-facing content and device effects remain separate checkpoints.
- Household creation remains just in time: the first dependent profile or caregiver invitation creates the Household and owner membership in the same server-authorized operation.
- Existing child accounts join through one transport-independent invitation contract. Nearby discovery, QR, short code, email, and shared links bootstrap the same explicit server acceptance and never become durable authority.
- **Find nearby Kwilt devices** is foreground-only and explicitly enabled on both phones. It advertises an ephemeral pairing session, requires matching-phrase confirmation on both devices, times out, and retains QR/code/share-link fallbacks.
- Apple Family Sharing authorizes child-device control after Kwilt Household attachment; it never auto-populates the Household or determines Kwilt caregiver grants.
- Direct table writes remain unavailable to app clients. Authority-changing actions go through narrowly scoped authenticated RPCs and append an audit event.
- Household Mode uses one assigned caregiver account beneath a restricted child-facing layer. Child member codes select actors; fresh local authentication restores the caregiver's full account.
- The capability-menu avatar and attribution-sensitive capability headers use one shared active-member switcher.
- The accepted initial Household Mode capability set is Chores, the selected child's own Arcs/Goals/To-dos, household-approved/shared Recipes, shared Meal Plan, and shared Groceries. Other capabilities require separate acceptance.

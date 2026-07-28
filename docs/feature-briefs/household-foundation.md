---
id: brief-household-foundation
title: Household Foundation
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-activity-assignment, brief-chores-as-recurring-activities, brief-family-screen-time-controls]
owner: andrew
last_updated: 2026-07-28
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

`job-flow-maya-move-family-life-forward` scores **Family participation** 2/5. Shared Goals provide limited collaboration, but ordinary household participation lacks a safe identity and authority foundation.

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
- **Invitation** — expiring, auditable path for an authenticated adult to join.

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

### Lifecycle

Kwilt does not create an empty Household during ordinary onboarding. The owner starts by adding or inviting the first other person from Settings, Screen Time setup, Activity assignment, or another family capability. Kwilt atomically creates the Household, creates the owner's membership, and creates the dependent profile or invitation. The user should not have to complete a separate **Create household** ceremony first.

Add or invite first person → household and owner membership are created → invited adult accepts with an independent account or dependent profile becomes available → grant named capability authority → optionally bind devices.

For a dependent child, profile creation is followed by an explicit capability choice. Creating the profile alone does not activate To-dos, Screen Time, Agent, Money, Games, Stories, or future capabilities.

Accepting an invitation joins the inviter's existing Household. Apple Family Sharing never silently creates or populates a Kwilt Household; the systems have different identity, consent, authority, and data-access meanings.

Removal and household deletion require explicit dependent-data and managed-device cleanup. Authority-changing operations require a server round trip; offline clients may display last-known state but not claim a role change succeeded.

### Data and authorization contract

- Stable household and member IDs independent of auth provider IDs.
- Membership status and role history.
- Capability grants scoped to household, capability, and optionally child/member.
- Child capability activations scoped to household, child member, and capability, with `inactive`, `pending_setup`, `active`, `pending_cleanup`, and `blocked` lifecycle states.
- Server-enforced mutation authorization and negative RLS coverage.
- Append-only invitation, grant, role, child-capability activation, removal, and release audit events.

## Success signal

Andrew and Blaire can establish one household and child profiles with independent accounts, activate different capabilities for each child, correctly explain their authority, and confirm that no personal capability data or capability access appeared merely because someone joined.

The job-flow score does not increase on infrastructure alone; it becomes eligible to move when Assignment or another household capability creates useful participation.

## Non-goals

- Shared login credentials.
- A public family graph or discovery.
- Automatic adoption by every Kwilt capability.
- A Household-wide switch that activates the same capability set for every child.
- An empty Household as a required onboarding milestone.
- Subscription sharing or App Store Family Sharing behavior.
- Managed-device enforcement.
- Child account conversion.

## Open questions

- What recovery process applies if the sole household owner loses account access?
- Should a second adult be caregiver by default or require explicit capability grants during invitation?
- Which capabilities, beyond To-dos and Screen Time, are ready to declare a child-participation and deactivation contract?

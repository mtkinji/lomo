---
id: job-flow-maya-establish-family-screen-time
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-move-the-few-things-that-matter
last_updated: 2026-08-26
---

# Maya: Establish a Family Screen Time Agreement

## Audience / Persona

Audience: `audience-aspirational-family-organizers`
Persona: Maya

Maya wants the child's phone to follow a clear family agreement without turning her into
a device administrator. She needs setup to work once, ordinary access changes to happen
without repeated negotiation, and failures to name one useful next action.

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Help me make real progress in the few
areas I most want to grow.

Active supporting jobs:

- `jtbd-put-intention-before-impulse` — place the agreed family condition before an
  impulsive app opening.
- `jtbd-invite-the-right-people-in` — connect the correct child and caregivers without
  exposing unrelated personal life.
- `jtbd-trust-this-app-with-my-life` — distinguish a saved decision from what the device
  actually applied.

## Job Flow

1. Understand what family Screen Time will do and what setup requires.
2. Connect the correct Kwilt child membership and caregiver authority.
3. Enroll the intended physical child device with Apple guardian authorization.
4. Choose the apps or categories covered by the family agreement without exposing an
   installed-app inventory.
5. Create the starter agreement and know when the device applied it.
6. Let the child understand ordinary access and the next transition without asking a
   caregiver to reinterpret the rule.
7. Recover from an offline, authorization, selection, version, or device problem.
8. Release or replace the device without leaving an accidental bypass or zombie shield.

## Current Kwilt Flow

1. Household and child-specific Screen Time routes exist, but the production setup card
   does not yet explain prerequisites or lead into real enrollment.
2. Household invitations, dependent profiles, child capability activation, and
   caregiver-grant contracts exist. Guardian-managed device access for an existing
   child membership is not implemented end to end.
3. The current family Screen Time screen recognizes only a development-simulated device;
   the native bridge requests adult `.individual` authorization rather than `.child`.
4. The current native picker supports personal/local selections, but there is no real
   enrolled-child selection handoff or child-scoped native token store.
5. The server has agreement, desired-version, device, and receipt scaffolding. It lacks
   the enrollment/binding channel, child policy fetch, coherent snapshot, and readiness
   transitions required to make the receipt authoritative.
6. Child-facing explanations exist as pure learning-state projections, not as a real
   managed-device experience.
7. Product documents name recovery states, but production recovery actions are not wired.
8. Release is documented as a transaction; the child cleanup and credential-retirement
   path is not implemented or physically proven.

## Offerings

- Private Household membership and child-specific capability activation.
- Explicit owner/caregiver/child roles and child-scoped Screen Time grants.
- Accepted family access agreement and child-explanation model.
- Shared Screen Time control-plane direction with desired/applied truth.
- Development-only simulated caregiver flow.
- Authoritative server scaffolding for agreements, overrides, requests, devices, and
  receipts.
- Canonical child-device enrollment and reconciliation contract.

## Delivery Score

| Step | Score | Rationale |
| --- | --- | --- |
| Understand setup | 2 | A named setup route exists, but the current screen does not explain prerequisites, phone ownership, Apple Family Sharing, privacy, or what happens next. |
| Connect identity and authority | 2 | Household contracts exist, but the organizer-approved child membership and physical install are not joined in one proven guardian-managed flow. |
| Enroll and authorize device | 1 | No production enrollment session, device claim, `.child` native authorization, or signed-device proof exists. |
| Choose governed apps | 1 | The privacy-preserving picker exists only in local/personal infrastructure; the child-device selection choreography is not implemented. |
| Apply starter agreement | 1 | Desired/receipt scaffolding exists, but no real child reconciler can fetch, apply, snapshot, and acknowledge the exact version. |
| Understand ordinary access | 1 | Child explanations are modeled and tested against simulated state, not a real child device. |
| Recover | 1 | Failure language is documented but no production recovery actions or device diagnostics path is wired. |
| Release or replace | 1 | Cleanup semantics are documented, but no physical-device cleanup receipt or safe replacement path exists. |

The delivery score does not increase from schema, Simulator, build, or caregiver approval
alone. The relevant step moves only with the signed-device evidence named in the
enrollment contract.

## Gaps

- The production setup CTA must never be inert or imply that the phone is connected.
- The child needs an exact Household membership and guardian-approved device claim; a
  conventional child account is optional.
- Apple `.child` authorization and Kwilt caregiver authority must remain independent.
- Device identity, capability reporting, policy fetch, receipts, snapshots, and release
  need one authenticated reconciliation channel.
- **Ready** must require the exact applied bootstrap version and coherent snapshot.
- Parent and child instructions need to live inside the setup, with recovery help for the
  current failed step.
- Signed-device and TestFlight proof must remain separate from source and Simulator proof.

## Aspirational Design Challenge

How might we help Maya set up Charlie's intended iPhone once and trust the family
agreement it reports, while keeping identity, authority, Apple authorization, privacy,
and device-delivery truth separate?

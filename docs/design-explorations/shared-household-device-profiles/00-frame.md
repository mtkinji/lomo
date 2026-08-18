# Frame: Shared Household Device Profiles

## What the user said

> It doesn't make sense to create a profile for somebody who doesn't even have a device. If they have a device, we need the ability to sign in on that device. A family iPad with a family account and different profiles kids can sign into could be interesting.

The frame was later corrected and made more specific:

> The avatar switcher would only be able to switch to any children in the household and the individually assigned caregiver. If you try to sign in as the caregiver, then you can use Touch ID or Face ID or a passcode to re-enter that, and then you're in your full regular user account.

## Restated in user voice

When my family shares an iPad, I want each person to enter the part of Kwilt that belongs to them without creating unused placeholder people or exposing somebody else's private life, so the device can genuinely help the family participate together.

## Target audience

`audience-aspirational-family-organizers` — adults helping a household adopt a calm shared rhythm without becoming system administrators.

## Representative persona

Maya is a mother whose family shares an iPad in a common part of the home. She wants family participation to be real and useful, but does not want one adult login to become a surveillance account or a fragile collection of fake users.

- Current situation: Kwilt distinguishes authenticated accounts from parent-created dependent rows, but it has no coherent restricted household layer or shared-device identity switcher over a caregiver's authenticated session.
- What she's trying to do: let the person holding the iPad enter their own bounded experience quickly.
- Emotional state or tension: interested in family participation, wary of privacy leaks, setup work, and unclear responsibility.
- What would make this feel wrong: a shared password, silent access to another person's private content, child profiles created before anybody uses them, or repeated OAuth during ordinary switching.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — family members need a practical way to participate in the ordinary commitments that move family life forward.

## Job flow step

Step 7, “Let family members participate without turning life into admin,” currently scores 3/5. Kwilt has Household invitations and capability-owned participation, but lacks a shared-device session model and mature household responsibility loop.

## Active anchors

- `jtbd-invite-the-right-people-in` — shared-device entry must grant a particular person only the rooms of family life intended for them.
- `jtbd-trust-this-app-with-my-life` — a mistaken profile switch must never reveal another person's private Goals, Chat, Money, Health, or history.
- `jtbd-help-us-enjoy-being-together` — local participation should stay fast enough for family play and other in-the-room experiences.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Settings owns Household membership; Games already supports local saved players without accounts.
- Existing user flow: a permanent user can invite an authenticated caregiver or child, or create an accountless dependent row.
- Existing domain/data model: Household has one owner, caregiver and child memberships, person-to-Auth bindings, and capability-specific grants. It currently assumes one active Supabase Auth session for the whole app process. The accepted direction preserves that one session as the assigned caregiver account and places bounded child actor contexts over it.
- Existing technical affordances: local saved-player identities, authenticated Household invitations, device/install identity, `expo-local-authentication` with Face ID, Touch ID, and device-passcode fallback, capability-owned permissions, and Screen Time device binding.
- Existing UX/copy conventions: private by default, explicit grants, one household roster, and no implication that family membership exposes private capability content.

Constraints to preserve:

- No shared adult credential called a “family account.” The assigned caregiver's account remains the only full authenticated account beneath Household Mode.
- Household relationship, Auth identity, device enrollment, and active device profile remain separate concepts.
- Switching profiles never grants blanket household-data access.
- Adult-only settings, Money, provider connections, deletion, billing, and household administration require fresh adult authorization.
- Under-13 participation is not enabled by this exploration; it needs a later parental-consent and child-data contract.
- Local Games guests remain lightweight and do not become global Kwilt profiles automatically.

Constraints we may challenge:

- The current assumption that one app process always has exactly one active person and one full Supabase session.
- The rule that meaningful participation always requires either a personal device or repeated OAuth.

Design implication:

The opportunity is not to create a family-owned master account or a parallel household credential. It is to designate a trusted iPad under one caregiver's real Kwilt account, cover that account with a restricted Household Mode, and establish bounded child actor sessions inside that layer. A child profile should be created or linked only when the child will actually participate through an available device.

## Aspirational design challenge

How might we help Maya let each family member enter their own appropriate Kwilt experience on a shared iPad in seconds, while preserving private capability boundaries and adult authority?

## Out of scope

- Enabling under-13 production use before parental notice, consent, access, deletion, SDK, and retention requirements are designed and reviewed.
- Replacing personal-device Apple/Google authentication.
- Turning local Games guest seats into global Household identities.
- Allowing one family credential to expose every participant's private Kwilt data.

## Open question

The identity and authorization model is resolved in [03-converge.md](03-converge.md). The remaining question is the exact inactivity/background policy that returns a temporarily unlocked caregiver account to Household Mode.

# Frame: Household Invite Delivery And Recovery

## What the user said

> Blaire did not receive the email invite, the system did not recognize the earlier pending invite, and manual entry needed a short code with a QR code.

## Restated in user voice

When I invite someone in my family, I want Kwilt to carry that invitation across email, app re-entry, QR, and manual recovery without making either of us reconstruct what already happened, so we can join the right Household and still understand what is shared.

## Target audience

`audience-aspirational-family-organizers`: family organizers who need participation without becoming workspace administrators.

## Representative persona

Maya is inviting another caregiver into the Household from her phone. She expects an entered email address to send an email and expects Kwilt to remember an unaccepted invitation.

- Current situation: the family may be together or apart, and either person may need to recover the flow later.
- What she is trying to do: establish one private Household with the right people.
- Emotional tension: an invitation is a small trust handoff; silent failure makes Kwilt feel unreliable.
- What would feel wrong: duplicate invites, long opaque codes, implied delivery, or automatic membership without review.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — family participation should help ordinary life move.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7, **Family participation**, currently 3/5. Household invitations exist, but the observed two-account path required duplicate creation and manual recovery.

## Active anchors

- `jtbd-invite-the-right-people-in` — invite the intended person into a bounded private Household.
- `jtbd-trust-this-app-with-my-life` — report delivery truthfully and remember pending state.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Settings > Household invitation and review.
- Existing flow: create one server invitation, share a deep link/code, preview, then explicitly accept.
- Existing model: email-bound, expiring, audited invitation with a hashed bootstrap secret.
- Existing affordances: Resend email plumbing, installed-app deep links, `react-native-qrcode-svg`, native Share, and a proven QR/code receipt for device setup.
- Existing conventions: joining shares roster eligibility only; capability access remains explicit.

Constraints to preserve:

- An invitation never becomes membership without recipient review and acceptance.
- Email/account discovery cannot expose whether an arbitrary address has a Kwilt account.
- Secrets remain short-lived and server-validated.
- Account invitations remain distinct from child-device setup codes.

Design implication: make transport and recovery views over one invitation identity instead of creating a new sharing system.

## Aspirational design challenge

How might we help Maya get the right caregiver into one private Household even when the first transport fails, while preserving explicit consent, privacy, and truthful delivery state?

## Out of scope

Nearby-device discovery, a general invitation inbox, automatic capability grants, and changing Household privacy semantics.

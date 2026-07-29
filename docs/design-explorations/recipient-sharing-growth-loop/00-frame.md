# Frame: Recipient Sharing Growth Loop

## What the user said

> From a business perspective, my goals are acquisition, activation, retention, and monetization, so lets lean into those as guidelines for what we do next.

## Restated in recipient voice

When someone I trust invites me into one meaningful part of their life, I want to understand it and respond without a large commitment, so I can be supportive while staying in control of what I join.

## Target audience

`audience-private-accountability-seekers` — people who want selected support without public performance or broad exposure.

## Representative persona

David is the sender-side representative persona. He wants someone he trusts to understand one Goal and respond in the moment. The recipient may not know Kwilt, may not want another app yet, and should not have to make an account decision before understanding the invitation.

- Situation: David shares a Goal or a meaningful check-in with one person.
- Desired progress: the recipient understands the boundary, responds, and makes David feel supported.
- Tension: every additional commitment before value lowers participation, while every ambiguous shortcut weakens trust.
- Failure mode: a generic download page, a coercive install gate, or a link that exposes more than the sender explicitly chose.

## Hero anchor

`jtbd-invite-the-right-people-in` — help me invite the right people into my becoming without losing privacy.

## Job flow step

`job-flow-david-invite-the-right-people-in`:

- **Let them follow along:** 2/5. The Goal web invite can receive a cheer or reply, but the experience is not yet a reliable cross-surface loop.
- **Adjust or end sharing:** 2/5. Expired, revoked, accepted, and continuing-participation boundaries need one legible contract.
- **Choose the right person:** 3/5. Friends can eventually make a proven recipient reusable, but should not be the first value proposition.

The primary gap is not sending another link. It is completing the two-sided support loop after a recipient opens it.

## Active anchors

- `jtbd-invite-the-right-people-in` — the recipient can understand and act on one explicit invitation.
- `jtbd-trust-this-app-with-my-life` — the invitation reveals only the promised object and state, and all ongoing access requires explicit consent.

## serves snippet

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## Business outcomes as design constraints

Business outcomes guide sequencing, but do not replace the user job:

| Outcome | Product meaning in this loop |
| --- | --- |
| Acquisition | A recipient safely reaches a meaningful Kwilt experience from a real person's share. |
| Activation | The recipient takes a useful action and the sender receives it. Account creation alone is not activation. |
| Retention | The same pair completes a second support interaction or shares a second object within 14–30 days. |
| Monetization | After repeated value, Kwilt offers paid depth to the organizer or participant without charging admission to the invitation. |

The smallest complete business unit is a **completed support loop**:

```text
someone shares one meaningful thing
  -> the recipient opens it
  -> the recipient takes a useful action
  -> the sender receives that value
  -> one of them returns and repeats the loop
```

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- `go.kwilt.app/i/:inviteCode` already previews a Goal and lets a guest cheer or reply without installing the app.
- The sender can receive guest responses in the Goal feed.
- The web landing currently emits private invite, Goal-title, and inviter-name values to analytics; this conflicts with the accepted Friends privacy contract.
- Direct Friend URLs do not have a useful live web destination. A Friend relationship grants zero content access and is not itself a compelling recipient experience.
- Universal-link association files do not yet establish the expected app handoff for Kwilt invite hosts.
- Household and Screen Time participation require authenticated, authority-bearing, and sometimes native setup. They are not guest-web interactions.

Constraints to preserve:

- A link opens only the object and visibility contract explicitly chosen by the sender.
- A recipient can understand the invitation before account creation or installation whenever the action is safe on the web.
- Friendship, object membership, Household authority, and child capability grants remain independent.
- Operational tokens may authorize a request, but invite codes, names, content, relationship identifiers, and a reconstructable social graph never enter analytics.
- App installation is an escalation to durable or native value, not a tax on comprehension.

Constraints we may challenge:

- A recipient share should not default to a generic download page merely because Kwilt is mobile-first.
- A Friend invite should not be the primary acquisition pitch before two people have shared value.
- Cross-step measurement does not require copying private operational identifiers into a behavioral analytics system.

## Aspirational design challenge

How might we let a recipient experience enough of one explicitly shared part of Kwilt to respond meaningfully, while preserving privacy and turning useful participation—not coercion—into acquisition, activation, retention, and paid depth?

## Out of scope

- A full browser version of Kwilt.
- Anonymous Friend acceptance, Household membership, child authority, or Screen Time setup.
- Public profiles, discovery, feeds, referral spam, contact upload, or social-graph analytics.
- A paywall on invite opening, preview, or basic response.
- Games implementation in the first slice; Games should reuse the contract after Goal proves it.

## Open question

Which first recipient action best predicts a second two-sided interaction: a cheer, a written reply, or continuing authenticated participation?

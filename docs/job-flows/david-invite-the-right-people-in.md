---
id: job-flow-david-invite-the-right-people-in
audience: audience-private-accountability-seekers
persona: David
hero_jtbd: jtbd-invite-the-right-people-in
last_updated: 2026-08-04
---

# David: Invite The Right People In

## Audience / Persona

Audience: `audience-private-accountability-seekers`  
Persona: David

David wants accountability and encouragement from the right people, but he does not want to broadcast his life.

## Hero JTBD

`jtbd-invite-the-right-people-in` - Help me invite the right people into my becoming without losing privacy.

## Job Flow

1. Identify a goal that would benefit from support.
2. Choose the right person.
3. Decide what they should see.
4. Send a clear invitation.
5. Let the other person respond or follow along.
6. Share progress signals without exposing raw details.
7. Adjust or end sharing when needed.

## Current Kwilt Flow

1. A Goal-owned **Invite support** flow explains the signals-only boundary before sending.
2. Known Friends and Household members can be selected without either relationship granting access by itself; generic link, text, and email channels remain available.
3. Recipient-bound invitations preview only to the intended signed-in person, while generic links remain compatible.
4. A recipient can encourage the Goal before the first check-in, then follow authored check-ins, cheers, and replies inside the Goal support context.
5. Sharing settings expose review, decline, revoke, remove, and leave actions without introducing a feed or blanket Household visibility.

## Offerings

- Share Goal drawer.
- Sharing settings.
- Shared goals.
- Check-ins.
- Invitation/auth flows.
- Visibility boundaries.

## Delivery Score

| Step | Score | Rationale |
| --- | --- | --- |
| Pick supported goal | 4 | Support starts from one Goal and the drawer names the supported signals rather than implying shared ownership. |
| Choose person | 4 | Known Friends and Household members are reusable choices, while generic channels remain available; relationship membership grants no access. |
| Decide visibility | 4 | The sender sees the Goal-only check-in/cheer/reply boundary and the recipient sees the same boundary before accepting. |
| Send invitation | 4 | Targeted and generic invitations share one capability-owned handoff with explicit pending, unavailable, and retry states. |
| Follow along | 3 | Recipients can respond before the first check-in and accepted links open the Goal support context; separate-account native runtime proof remains open. |
| Share signals | 4 | Check-ins are well aligned with signals-only accountability. |
| Adjust or end sharing | 3 | Review, decline, revoke, remove, and leave controls are visible in Sharing; their full two-account runtime matrix remains unproven. |

## Gaps

- Prove targeted and generic invitation acceptance, first encouragement,
  follow-along, leave, revoke, blocked-recipient, and expiry behavior across two
  separate signed accounts.
- Keep shared ownership and private Goal to-dos out of support until edit
  authority and conflict behavior have their own explicit contract.

## Evidence

- Focused client, service, migration-contract, and Deno tests cover targeted and
  generic invitations, no-check-in support, privacy boundaries, and lifecycle actions.
- A deployed preview web handoff proved the no-check-in support copy against a
  temporary real invitation; the exact proof row was removed afterward.
- No two-account native or TestFlight result has yet proven the complete lifecycle.

## Aspirational Design Challenge

How might we help David invite one trusted person into one meaningful commitment, without making accountability feel like surveillance?

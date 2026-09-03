---
id: brief-contextual-ugc-safety
feature: contextual-ugc-safety
audiences: [audience-private-accountability-seekers, audience-aspirational-family-organizers]
personas: [David, Maya]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
status: accepted
---

# Contextual UGC Safety

## Product contract

Every reachable remotely authored person or content item offers contextual help.
Report records are private moderation artifacts, preserve a server-captured
snapshot, and never disclose the reporter to the reported user or Household.
After intake, the server returns a role-aware follow-up rather than assuming every
relationship can be socially blocked.

Peer blocking is bilateral for social visibility and contact: neither party may
create a follow, targeted invitation, Shared Home delivery, reply, or reaction
involving the other, and neither may read the other's check-ins, replies, or Shared
Home projections. Existing bilateral follow/friend request state is ended. An
active same-Household relationship cannot be socially blocked. Household removal,
caregiver revocation, capability grants, and device authority remain role-governed
Family operations.

For a managed child reporting an active Household member, the receipt says that
the report was sent privately and that the reported person was not notified. It
does not claim the caregiver was removed. Owners and caregivers reporting another
Household member are directed to manage access separately in Family settings.

## Report model

Reasons: `harassment`, `hate_or_abuse`, `sexual_content`, `violence_or_threat`, `spam_or_scam`, `privacy`, and `other`. The user may add a 500-character note. The server records reporter, the reported user account and/or canonical Household person, target kind/id, sanitized immutable snapshot, timestamps, source app version/build when supplied, status, priority, response due time, operator resolution, and audit timestamps.

Only authenticated, non-anonymous users can submit. A reporter can report content they are currently authorized to see, or an identity with which they have an existing sharing/friendship context. Clients cannot list, update, or delete reports. Service-role operations own triage and resolution.

## Moderation workflow

- `open` → `reviewing` → `actioned` or `dismissed`; `needs_information` may be used while awaiting reporter contact.
- Credible threats, child sexual safety, doxxing, or imminent physical danger are urgent and due within 4 hours. Other reports are due within 24 hours.
- Preserve the original snapshot. Record operator notes separately; never overwrite evidence.
- Actions can include content suppression, relationship block, account restriction through an explicitly reviewed future mechanism, or no action.
- Repeat-abuse review is based on confirmed actions, not raw report count.
- Appeals use the published support address and are linked by report receipt; no automatic reversal.
- Emergency handling follows applicable law and the operator runbook; the app does not promise real-time emergency response.

## Filtering contract

Apply deterministic, server-enforced filtering to free-form shared check-ins and replies before publication. Block only high-confidence abusive or dangerous patterns; do not treat ordinary descriptions of struggle, mental health, faith, health, or identity as violations. The client may provide early feedback, but the database remains authoritative. Filter failures return calm, actionable copy and do not persist or broadcast the text.

## Acceptance criteria

- Shared Home delivery, Goal check-in, Goal reply, friendship/person, and
  Household-member contexts expose contextual help.
- Another Household member's hard-pass explanation and an organizer-visible
  guest meal suggestion expose contextual help in their existing popovers or
  rows, without adding permanent safety chrome to the Meal Plan.
- After reporting a Meal Plan response, the reporter may hide that response for
  themselves. Hiding does not remove a Household member, change their role, or
  erase the preserved moderation snapshot.
- Intake authorization rejects signed-out, anonymous, self, invented, and inaccessible targets.
- Reporter identity and queue contents are unreadable to authenticated clients, including the reported user.
- Peer blocking prevents both directions of future targeted contact and hides both directions of authored social content.
- Active same-Household relationships reject social blocking and receive a
  role-appropriate report receipt instead.
- Existing friendship/follow relationships and pending targeted invitations are ended on block.
- Database tests cover allow and deny cases for reports, filtering, and blocking.
- The operator can receive, triage, resolve, and audit a production report within the stated window.
- Anonymous remote Games remain unreachable in production candidates until
  participant reporting and moderation identity meet this contract.

## Surface inventory and release boundary

This slice covers remotely authored Shared Home deliveries, shared Goal check-ins
and replies, friendship/person settings, and the Household member detail reached
from the existing roster. Before ASR-005 can close, verify all
other reachable identity or content surfaces against the same contract. The
follow-up inventory is maintained in `docs/app-store/ugc-surface-inventory.md`
and includes capability-owned household collaboration, guest Meal feedback,
remote Games participants and revealed Slanguage submissions, and AI/chat sharing
paths. Slanguage submission text is assembled from Kwilt-authored tiles rather
than typed free-form text, but anonymous remote play is development-only until
visible participants have contextual reporting and durable moderation identity.

Shared Meal Plan safety reuses the existing reaction popover and Guest
suggestions footer. Hard-pass explanations and guest display names/suggestions
use the same server-enforced high-confidence shared-text filter as Goal text.
Guest reporting is limited to an authenticated owner or caregiver who can
already read that Plan's private guest-feedback summary; revoking the guest link
remains a separate existing organizer action.

## Spec refinement

The implementation assumes Supabase is the operational moderation queue and a single configured operations mailbox receives best-effort intake alerts. It intentionally does not add automated account suspension. Production deployment, mailbox configuration, operator drill, and physical two-account proof remain separate release gates.

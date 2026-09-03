# Frame: Contextual UGC Safety

## What the user said

> ASR-005 — UGC safety: add contextual reporting, moderation intake/workflow, content filtering, authorization tests, and complete blocking semantics.

## Restated in user voice

When something another person shares through Kwilt feels unsafe, I need a private
way to get help that respects what I can actually control, so the app does not
trap me or falsely promise that I changed a caregiver relationship.

## Target audience and persona

Primary: `audience-private-accountability-seekers`, represented by David for
peer sharing. Household refinement: a provisional managed-child situation,
represented by Charlie within Maya's aspirational-family-organizer household.
The current persona taxonomy has no child representative, so this is recorded as
a product gap rather than silently treating David as a child.

## Hero and active JTBDs

- `jtbd-invite-the-right-people-in` — sharing must remain revocable and bounded.
- `jtbd-trust-this-app-with-my-life` — a safety promise must be enforceable, private, and recoverable.

## Job-flow gap

David's “adjust or end sharing” step needs contextual report and reliable peer
blocking. Household job flows already distinguish owner, caregiver, and child
authority, but do not define a child's private safety-escalation path.

## System alignment

Constraint posture: `Extend the system`.

- Reuse Shared Home cards, Goal feed cards, friendship management, Supabase RLS, Edge Functions, and the published support contact.
- Add one shared report contract, a peer-only block invariant, and a role-aware
  post-report response. Household removal and caregiver authority stay separate.
- Treat Shared Home as a projection. Content ownership and moderation snapshots remain server-side.

## Aspirational design challenge

How might we help a person get appropriate help from the exact place something
unsafe happened, while preserving peer autonomy, caregiver governance, and a
managed child's private route to Kwilt?

## Out of scope

Public discovery, automated user bans, scanning private AI conversations as UGC, and a customer-visible case-management center.

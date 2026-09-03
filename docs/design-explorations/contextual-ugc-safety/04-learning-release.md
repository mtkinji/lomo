# Learning Release: Contextual UGC Safety

## Concept To Build

From remotely authored content or a person's sharing controls, a signed-in user
can privately report the exact context and receive the next action appropriate to
their relationship: peer blocking, Household management, or managed-child help.

## Buildable slice

Must be real:

- Contextual report actions on Shared Home, Goal check-ins/replies, friendship
  controls, Household member detail, Meal Plan hard-pass explanations, and guest
  meal suggestions.
- Authenticated server intake with a server-captured snapshot and no reporter disclosure.
- Bounded objectionable-text filter on shared check-ins, replies, hard-pass
  explanations, guest display names, and guest suggestions.
- Reporter-owned hiding for Meal Plan responses, separate from existing
  organizer guest-link revocation and Household role controls.
- One authoritative peer-block predicate enforced by RLS and delivery/invite creation.
- A server-owned active-Household boundary that prevents social blocking from
  masquerading as Household removal or caregiver revocation.
- Operator states, severity, due time, resolution audit fields, and documented response policy.
- Allow/deny authorization tests.

Can be operationally thin:

- The moderation queue can be worked in Supabase by the production operator.
- Intake alert delivery can use a configured operations email; persistence remains authoritative if alert delivery fails.

Intentionally excluded:

- Automated bans, automated report adjudication, public profiles, and a customer-facing case center.
- Automatic Household removal, caregiver notification, or disclosure of a child's
  report to Household members.

## Release channel and reversibility

Ship with the next production candidate only after deployed-database authorization tests, two-account device proof, and an operator intake drill. App report affordances can be remotely hidden only if all associated UGC sharing is also unavailable; reporting must never be hidden while UGC remains reachable.

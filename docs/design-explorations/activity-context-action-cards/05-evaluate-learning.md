# Evaluate the Learning Release

## Core hypotheses

1. A source-linked Activity is easier to understand and complete than a copied
   title with no provenance.
2. One capability-owned action card reduces context switching without making
   Activity detail feel busy.
3. Users will accept AI-assisted capture when each suggestion is inspectable,
   correctable, and bounded.
4. A native Meal Planning provider and an external Gmail provider can share the
   same host contract without leaking domain behavior into Activities.

## Measures

- Candidate create, correct, and dismiss rates.
- Time from candidate presentation to a confident decision.
- Created Activities later opened, completed, rescheduled, or deleted.
- Duplicate and stale-source rate.
- Percentage of cards that resolve to a useful current action.
- Reconnect, unlink, and “why was this created?” usage.
- Qualitative trust: “I know why this is here,” “I know what Kwilt accessed,”
  and “I can stop it.”

Do not optimize emails scanned, cards rendered, automatic creations, or raw
notification volume. Those are system activity, not household value.

## Dogfood matrix

- Current source, updated source, deleted source, and disconnected provider.
- Same thread suggests the same action twice.
- One thread contains two genuinely distinct actions.
- User edits the Activity after creation, then the source changes.
- Activity is shared with a viewer who lacks source permission.
- Provider action succeeds, fails, times out, or returns after a retry.
- Recurring Meal Planning organizer reminder versus per-round participant
  invitation.
- Malicious or misleading instructions embedded in an email body.
- Account revocation, data deletion, export, reinstall, and offline viewing.

## Decision after learning

- **Expand** if users repeatedly complete meaningful work from cards and can
  accurately describe Kwilt's access and authority.
- **Refine** if provenance helps but cards are noisy or candidate quality is
  inconsistent.
- **Stop ambient Gmail work** if explicit capture does not create enough value
  to justify restricted-scope verification and security assessment.

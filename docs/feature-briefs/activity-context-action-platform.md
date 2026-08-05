---
id: brief-activity-context-action-platform
title: Activity Context and Action Platform
status: accepted
audiences: [audience-ai-native-life-operators, audience-aspirational-family-organizers]
personas: [Nina, Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life, jtbd-capture-and-find-meaning, jtbd-move-the-few-things-that-matter, jtbd-get-help-without-retelling-my-life, jtbd-understand-why-ai-suggested-this, jtbd-stay-in-control-of-ai-actions]
related_briefs: [brief-unified-chat, brief-external-ai-connector]
owner: andrew
last_updated: 2026-08-05
---

# Activity Context and Action Platform

## Context

Activities can already be created from Chat, derived from another Activity's
step, exported to calendars, associated with places, and enriched with
attachments. Activity detail also contains isolated capability-specific UI such
as a Screen Time setup opportunity. Kwilt does not yet have one safe, reusable
way for an Activity to explain where it came from, resolve current
capability-owned state, and offer an action at the authoritative destination.

Meal Planning exposes the immediate need: a recurring organizer reminder may
host a live family-choice card without owning the Meal Plan. Gmail exposes the
platform opportunity: an email-derived To-do should explain why it exists and
return to the source without making Activities own email, connector tokens, or
mailbox automation policy.

## Target audience

The primary audience is `audience-ai-native-life-operators`. These users want
Kwilt to carry context across systems and reduce administrative work, but only
when the result remains inspectable, permissioned, correctable, and reversible.
The secondary audience is `audience-aspirational-family-organizers`, for whom a
Meal Planning contribution card can turn a reminder into a concrete shared
decision without collapsing family state into a generic To-do.

## Representative persona

Nina receives actionable information through connected tools and wants Kwilt
to capture the right work without creating another inbox to triage. Maya needs
household members to participate in a Meal Plan at the cadence of the actual
shopping cycle while preserving consent and child-safe capability ownership.

## Aspirational design challenge

How might Kwilt turn actionable context from another capability or connected
service into a calm, trustworthy Activity that explains why it exists and
takes the user to the right action, without turning To-dos into a dashboard or
granting unbounded automation authority?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` is the demand spine. The platform creates
leverage only if users can tell what Kwilt accessed, why the Activity exists,
what will happen when they act, and how to revoke or correct the behavior.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system` expects bounded context,
inspectable evidence, proportionate action, authoritative receipts, exact
return, and later correction or undo. Unified Chat serves these steps during a
conversation, but an Activity created from external context cannot yet retain a
reusable source/action contract. This brief extends those trust semantics into
Activity detail without making Chat or Activities own the source capability.

## JTBD framing

When something in another part of my life creates work for me, help me capture
the real commitment with enough context to trust it, then take me directly to
the place where I can act. Ask before automating unfamiliar patterns, preserve
my To-do if the source disconnects, and let me see or revoke any standing rule.

## Design

### Product contract

- An Activity owns **what and when**.
- Passive source references explain **why this exists**.
- At most one expanded capability action card provides **where and how to
  act**.
- The source capability or connector owns data access, viewer authorization,
  live state, actions, freshness, and receipts.
- The Activity host owns a constrained visual vocabulary and never renders
  provider JSX, arbitrary remote UI, or executable action JSON.

### Activity durability

The user-authored Activity title, notes, steps, schedule, completion, and
deletion remain useful if the source disappears. Disconnecting Gmail or losing
access to a family Meal Plan changes the card to a truthful unavailable state;
it does not silently delete the Activity or expose source content to another
viewer.

### Presentation budget

- Zero or more compact passive source references.
- At most one expanded card.
- At most one primary and one secondary card action.
- Evidence, freshness, permissions, and receipts use progressive disclosure.
- The card does not replace the existing Activity next-best-action dock.

### Provider contract

A registered provider resolves an opaque binding for the current viewer,
returns a bounded projection, invokes only registered action identifiers with
optimistic versioning and idempotency, and returns a capability-owned receipt
and exact return target. Unknown, disconnected, unauthorized, stale, or failed
providers degrade to finite host-owned states.

### Rollout order

1. Add the typed host behind `activity-context-action-v1`.
2. Migrate an existing Screen Time opportunity into the provider contract to
   prove parity without a new external dependency.
3. Add Meal Planning as the first new capability provider after its round and
   participation authority exist.
4. Add explicit Gmail capture through a user-invoked Gmail add-on.
5. Consider bounded mailbox candidates only after explicit capture produces
   evidence strong enough to justify restricted-scope verification and
   security assessment.

### AI authority ladder

1. Unfamiliar patterns become correctable candidates.
2. Repeated approvals may produce a proposed narrow rule.
3. Automatic creation requires a visible, bounded, pausable, expiring standing
   permission.
4. Anything outside the rule returns to candidate review.

Opening or replying to an email never proves that its underlying Activity is
complete.

### Gmail boundary

The first Gmail release operates only on the message the user invokes through
the add-on. It proposes one Activity and preserves a source permalink. It does
not scan the mailbox, send email, infer completion, or install a standing rule.

Ambient review is a separate gated program because broad Gmail read and
metadata scopes are restricted. It does not begin until Kwilt has acceptable
candidate precision, production token security, deletion and revocation,
prompt-injection defenses, and an approved compliance budget.

### Privacy and analytics

Provider tokens, resource references, message identifiers, source excerpts,
user-authored Activity content, participant names, and external URLs never
enter analytics. Events use provider kind, projection kind, state, action kind,
latency bucket, and outcome only. Sharing an Activity never shares its source
authority.

## Success signal

Users can accurately answer “why is this To-do here?”, confidently invoke its
next action, and disconnect the provider without losing their commitment. The
learning release expands only if source-linked Activities are corrected or
completed more often than equivalent context-free captures and do not create a
new triage burden.

## Open questions

- Whether a passive source reference should be visible in the Activity list or
  only in detail must be learned from the first provider without adding list
  chrome initially.
- Meal Planning must separately define its round lifecycle, cadence, candidate
  choices, child participation policy, and authoritative response receipt.
- Gmail ambient review remains outside committed implementation until its
  compliance and security gates are satisfied.

## References

- [`docs/design-explorations/activity-context-action-cards/00-frame.md`](../design-explorations/activity-context-action-cards/00-frame.md)
- [`docs/design-explorations/activity-context-action-cards/03-converge.md`](../design-explorations/activity-context-action-cards/03-converge.md)
- [`docs/design-explorations/activity-context-action-cards/04-gmail-feasibility-and-release.md`](../design-explorations/activity-context-action-cards/04-gmail-feasibility-and-release.md)

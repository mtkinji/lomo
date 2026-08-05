# Diverge: where shared moments should land

## Revised question

> Is some version of Home, notifications, or a feed a better destination than
> putting shared-experience events in Chat?

Yes. Chat is useful when a person wants help understanding or responding to an
event, but it is a poor primary record of what happened. The alternatives below
vary along two substantive axes: **event record vs conversation** and
**bounded utility vs ambient engagement**.

The active Kwilt shell currently has Goals, To-dos, Plan, and More. It does not
have a Home destination, so any global surface is an intentional extension of
the product rather than a relabeling of something that already exists.

## Alternative A: Capability-native only

The push opens the exact Goal, Game, Exploration, Household setting, or future
Recipe that owns the event. There is no global history. The owning capability
may show its own pending invitations or recent activity where useful.

- **Persona fit:** Calm and precise, but weak when Maya misses an alert or cannot
  remember which capability produced it.
- **System fit:** Strongest. It extends the typed routing already in place.
- **Best when:** Events are rare, immediately actionable, and easy to rediscover.
- **Fails when:** Several capabilities begin producing invitations, turns,
  encouragement, and shared discoveries.
- **Anti-pattern check:** Avoids a feed, but does not solve continuity after a
  notification disappears.

## Alternative B: A small shared-activity inbox

A global bell or similarly quiet entry point opens a bounded list of meaningful
shared events: an invitation, a game turn, encouragement, a shared Exploration,
or another person's response. Each item explains what happened and offers an
exact capability-owned action. Opening or resolving the source handles the
item. It is not a destination users are expected to browse, post into, or clear
to zero.

- **Persona fit:** Best match for Maya's need to keep family participation from
  slipping through the cracks without creating another place to manage.
- **System fit:** A small but real extension: one cross-capability event envelope,
  one quiet access point, and capability-owned rendering/actions.
- **Best when:** Multiple Kwilt capabilities produce meaningful asynchronous
  moments that need rediscovery.
- **Fails when:** It accepts routine reminders, promotional messages, or every
  backend event and becomes an undifferentiated notification archive.
- **Anti-pattern check:** Passes only with no inbox-zero pressure, no engagement
  ranking, no composer, and exact privacy/recipient boundaries.

## Alternative C: Home or Today

A new primary destination summarizes what matters now across personal plans and
shared family life. Shared events appear alongside today's To-dos, Plan, Games,
and other timely material.

- **Persona fit:** Potentially powerful because it answers “what needs my
  attention?”, not merely “what notified me?”
- **System fit:** Weak for this problem alone. Kwilt already gives Goals, To-dos,
  and Plan distinct ownership; a Home surface would redefine their relationship
  and the app's default entry point.
- **Best when:** Broader research shows that people lack one coherent way to
  orient themselves each day across all of Kwilt.
- **Fails when:** Home becomes a dashboard assembled to house otherwise homeless
  features.
- **Anti-pattern check:** High dashboard, duplication, and attention-pressure
  risk. This concept needs its own product frame rather than hitching a ride on
  family sharing.

## Alternative D: A family activity feed

A chronological shared space shows what family members did, shared, completed,
or reacted to across Kwilt, with lightweight reactions or comments.

- **Persona fit:** Makes family life feel visibly alive, but changes Kwilt from
  coordinating meaningful participation toward observing family activity.
- **System fit:** Largest extension. It requires feed eligibility, audience
  rules, posting semantics, moderation/removal behavior, and likely reactions or
  comments across capabilities.
- **Best when:** The desired job is ongoing social presence and discovery.
- **Fails when:** Private actions become content, family members feel watched,
  or activity is manufactured to keep the feed populated.
- **Anti-pattern check:** High risk of default-public sharing, engagement loops,
  surveillance, and a global shared-items destination.

## Alternative E: Notification Chat

Selected events become system entries in a durable Chat thread. A person can ask
what happened and use Chat to reach the owning capability.

- **Persona fit:** Good for explanation, poor for quick scanning and direct
  participation.
- **System fit:** Reuses visible Chat, but bends its message model and blurs
  event provenance with assistant conversation.
- **Best when:** Most events genuinely need interpretation or conversational
  follow-up.
- **Fails when:** Chat becomes a disguised inbox or the assistant appears to
  speak for another family member.
- **Anti-pattern check:** Risks anthropomorphic AI and a second source of truth.

## Emerging direction

Alternative B is the strongest shape for this specific job. It gives shared
experiences a durable landing place without asserting that Kwilt needs a new
Home or a social feed. Chat remains available as an optional action on the few
events that benefit from explanation or reflection.

The reductive version is not a new bottom tab. It is a quiet global entry point
with a short list of unresolved or recent meaningful shared moments, each owned
by its originating capability.

## Decision to carry into convergence

Should Kwilt add that narrow shared-activity inbox now, or first prove the event
model through capability-native invitations and game turns before exposing a
global destination?

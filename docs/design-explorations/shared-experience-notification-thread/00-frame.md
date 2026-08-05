# Frame: Shared Experience Notification Thread

## What the user said

> Perhaps when we send notifications on any of these things we can deliver them to a notification chat thread?

## Restated in user voice

When someone I invited does something meaningful in Kwilt, I want the notice to
land somewhere calm where I can understand it and respond, so our shared
experience does not disappear behind a disposable push notification.

## Target audience

`audience-aspirational-family-organizers` — people who want family participation
to feel natural without adopting a communication or project-management system.

## Representative persona

Maya is using Kwilt with people she cares about. She wants invitations,
encouragement, game turns, and other shared moments to lead naturally to the
next bit of participation.

- Current situation: a push notification can tell Maya that something happened,
  but its context disappears after she opens or dismisses it.
- What she's trying to become/do: stay connected to family activity without
  monitoring people or managing another inbox.
- Emotional state or tension: interested and relational, but wary of noise and
  administrative surfaces.
- What would make this feel wrong to her: unread-count pressure, a family feed,
  AI speaking as another person, or Chat becoming a second source of truth.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Maya wants shared activity to help
family life move forward, not create more follow-up work.

## Job flow step

Step 7 of `job-flow-maya-move-family-life-forward`: let family members
participate without turning life into admin. Current delivery score: 3/5.
Household invitations, Goal support, and private Games tables now provide
capability-owned participation, but notifications do not yet preserve a calm,
respondable continuation after delivery.

## Active anchors

- `jtbd-invite-the-right-people-in` — the notice must preserve the exact person,
  experience, and privacy boundary of the invitation.
- `jtbd-help-us-enjoy-being-together` — a Games notice should shorten the path
  back into play rather than describe game state at a distance.
- `jtbd-trust-this-app-with-my-life` — delivery must be calm, truthful, and
  reversible, with the capability remaining authoritative.

## Friction we're addressing

Today, a notification is a transient alert that deep-links directly to a native
capability. That is effective for one obvious action, but weak when the person
needs context, wants to respond in ordinary language, or returns after the push
has disappeared. A universal notification transcript could preserve context,
but it could also recreate the family feed and global shared destination that
Kwilt 2.0 intentionally rejected.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Unified Chat already owns durable user threads, a composer,
  system-initiated runs, evidence, proposals, receipts, and native return targets.
- Existing user flow: typed push notifications currently open the exact owning
  capability, such as an Activity, Goal, Explore recap, Money view, or Settings.
- Existing domain/data model: shared experiences remain owned by Household,
  Goals, and Games; Chat threads contain user/assistant messages and durable run
  records rather than generic social events.
- Existing technical affordances: agent runs already distinguish system
  initiation and reminder triggers; notification payloads already carry typed
  object identifiers; native capability destinations already remain canonical.
- Existing UX/copy conventions: notifications respect attention, urgency is
  earned, and Chat may explain or stage work without claiming authority it does
  not own.

Constraints to preserve:

- The owning capability remains the source of truth and final action surface.
- Relationship membership never grants blanket visibility.
- A delivered notice must disclose no more than the original invitation allows.
- No family feed, universal shared-items destination, unread-pressure system, or
  AI-authored imitation of another person's voice.
- A direct notification action may still open the native capability when no
  conversation is needed.

Constraints we may challenge:

- Every push notification currently has only one meaningful landing model:
  direct native navigation.
- Chat threads are currently created as ordinary user conversations rather than
  typed, system-owned continuations of capability events.

Design implication:

The promising shape is not a catch-all notification inbox. It is a durable,
capability-linked continuation for notices that genuinely benefit from context
or response, with one-tap native action preserved. We should test whether these
continuations belong in one calm system thread, in an originating conversation,
or in short experience-specific threads before changing the thread model.

## Aspirational design challenge

How might we help Maya receive and respond to meaningful family participation
notices in a durable conversation, while preserving capability ownership,
privacy, and the calmness of direct native actions?

## Out of scope

- Routing every local reminder into Chat.
- A chronological family activity feed or social inbox.
- Replacing native Goal, Household, Games, Explore, or future Recipe surfaces.
- Letting Chat infer or widen recipients, visibility, or action authority.
- Shipping notification-thread behavior before the design alternatives and
  delivery contract are reviewed.

## Open question

Should related notices collect in one clearly system-owned thread, or return to
the specific conversation/experience that caused them?

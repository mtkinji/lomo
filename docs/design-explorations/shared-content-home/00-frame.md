# Frame: Shared Content Home

## What the user said

> When people choose to share content, it needs a place to show up. People are going to choose to share lots of things, and those need places to show up.

## Restated in user voice

When someone intentionally shares something with me in Kwilt, help me notice it, understand why it matters, and find it again in both a common receiving place and its owning capability.

## Target audience

`audience-aspirational-family-organizers`, represented by Maya. Maya wants family participation to feel natural rather than like another collaboration system she has to administer.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — intentionally shared material should help family life continue, not disappear into transient links and pushes.

## Job flow step

Step 7 of `job-flow-maya-move-family-life-forward`, family participation, is 3/5. Kwilt has capability-owned sharing foundations, but no coherent cross-capability receiving layer for rich shared content.

## Active anchors

- `jtbd-invite-the-right-people-in` — each share preserves its chosen audience.
- `jtbd-help-us-enjoy-being-together` — game invitations, turns, and outcomes should be easy to resume.
- `jtbd-trust-this-app-with-my-life` — Home must project only server-authorized content and link back to its source of truth.

## Friction we're addressing

The first Shared Home slice treats invitations and turns as a notification queue. It does not yet express the broader job: receiving intentionally shared Explorations, Goal check-ins, game experiences, recipes, and future Kwilt objects in one legible stream.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- `SharedHome` is already a feature-flagged route with recipient-only storage, caching, realtime invalidation, push deep links, and capability-owned destinations.
- `kwilt_shared_deliveries` currently accepts only Goal invitations and game turns.
- Shared Goal check-ins already have an explicit audience, authored content, reactions, replies, and a Goal-owned destination.
- Explore is private by default and has no recipient authorization model yet.

Constraints to preserve:

- Sharing originates in the owning capability.
- A recipient relationship never grants ambient content access.
- Home holds a projection and destination, not a second editable copy.
- Notifications point to Home; Chat is reserved for conversation.

Constraint to challenge:

- Home cannot remain defined by “things requiring action.” It needs to accept available shared content that may only invite reading or response.

## Aspirational design challenge

How might we help Maya receive and revisit the many things people deliberately share with her, while keeping each object authoritative in its owning capability?

## Out of scope

An Explore sharing ACL, recipe implementation, a Home composer, engagement ranking, and ambient household activity.

## Open question

None for the learning slice; a shared Goal check-in is the first rich-content adapter.

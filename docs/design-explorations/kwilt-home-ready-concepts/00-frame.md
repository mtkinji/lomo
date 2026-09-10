# Frame: eight ready concepts for Kwilt Home

Date: 2026-09-09. Status: concept definition; no implementation or deployment in this loop.

## What the user said

“Great ideas, now let’s run a design loop on them all to see how we can define and turn each into a ready concept.”

Scope is the eight improvements following the [first visual concept](../../../artifacts/home-sharing-review/instagram-concept/home-and-composer-v1.png), including the concrete invitation improvement. Run end to end through concept/spec readiness; retain the broader Home vision. This is not a request to implement the concepts yet.

## Restated in user voice

When I have a moment to check in, help me feel included in my people's lives, respond naturally, and share something of my own without administering another system.

## Target audience and representative persona

Primary: `audience-aspirational-family-organizers`, Maya. She is returning between other responsibilities, curious about her people and easily interrupted. She wants ordinary family participation to feel enjoyable. A chore scoreboard, a feed that demands constant attention, or a complicated publishing form would make this feel wrong.

Secondary: `audience-private-accountability-seekers`, David. He may participate around one shared goal; seeing a moment must not imply joining a broad social network or sharing his private Goal conversation. Child chore actors are represented within their existing household authority; this proposal does not introduce child access to the adult Home experience.

## Hero anchor and assessment

Hero: `jtbd-move-the-few-things-that-matter`, the current Maya/Home alignment. Strong supporting matches:

- `jtbd-invite-the-right-people-in`: recognizable chosen people, explicit audiences, contextual responses.
- `jtbd-trust-this-app-with-my-life`: reliable drafts, truthful state, audience and navigation continuity.
- `jtbd-help-us-enjoy-being-together`: real opportunities to participate, especially existing Games actions; it only partially covers the broader everyday-connection job.

`serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]`

The existing taxonomy underrepresents “stay part of my people's everyday lives.” Flag that gap; do not create a new anchor or force ordinary photos into a productivity rationale.

## Job flow step

[Maya's family-life flow](../../job-flows/maya-move-family-life-forward.md), steps 7 and 8: participation without admin and continued helpful use. Both are documented as 3/5. Those scores predate recent Home work; this loop does not claim current runtime delivery or raise scores without observed use.

## System alignment

Posture: **Extend the system** for people catch-up, saved collections, and response summaries; **Fit the system** for post presentation, source actions, composer, and continuity.

Inspected normal checkout `/Users/andrewwatanabe/Kwilt`, `main`, base `9db7bd690f63936641588a61e974d0d6f07db8b3`, with existing dirty Home implementation. Evidence is source and prior concept review, not a new Simulator run.

Current source provides authored posts, four-photo drafts, three audience modes, replies/reaction totals, saved places, approved follows, source deliveries, and grouped automatic chore updates. `HomePost` has no reaction-person summary, reply preview, media dimensions, or seen state; its source attachments are snapshots, not a general live Goal access grant. `HomePerson` only exposes ID/name. A household system post can have a null author ID.

Preserve: Home first in standard main navigation; Ask as AI; account/view/post-audience separation; publication-time audience and current revocation; explicit personal posting; automatic household-only chores; capability-owned actions; source success before share offers; durable unanchored capture; Chapters as retrospectives. No new planning object or AI interpretation is needed for these concepts.

Challenge: wrapping filters, generic author buttons, the large administrative banner, all-photo vertical stacking, global interaction locks, and composing as a form before seeing the moment.

## Aspirational design challenge

How might we help Maya feel present in her people's everyday lives through a rich, responsive Home, while keeping participation voluntary, audiences understandable, and household responsibilities truthful?

## Readiness boundary

Each concept will have three alternatives, a selected interaction, data/authority requirements, state rules, acceptance scenarios, activation and a learning bet. Ready means specific enough for detailed design and implementation planning. It does not mean desirability validated, native appearance accepted, backend changes deployed, or all eight selected for immediate release.

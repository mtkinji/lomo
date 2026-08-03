# Frame: Explore durable history

## What the user said
> Add server persistence so a phone upgrade cannot wipe out Explore history.

## Restated in user voice
When years of paths and meaningful Places accumulate in Explore, I want Kwilt to preserve them through a lost or replaced phone, so I can trust this private history without managing backups.

## Target audience
`audience-aspirational-family-organizers`, represented by Maya.

## Hero anchor
`jtbd-move-the-few-things-that-matter`

## Active anchors
- `jtbd-trust-this-app-with-my-life` — intimate captured history must not disappear.
- `jtbd-capture-and-find-meaning` — accumulated lived evidence should remain available without admin work.

## Job flow step
Keep using the system because it feels helpful, currently 3/5. Device-only durability makes long-term trust contingent on Apple's restore behavior.

## System alignment
Constraint posture: `Extend the system`.

- Explore remains local-first and usable offline.
- Supabase Auth already supplies a stable owner identity.
- The server stores owner-scoped durable records; it does not activate family sharing.
- Accepted location samples remain adaptive; sync must not increase GPS sampling.
- Clear-history and Place removal must propagate instead of being resurrected by another device.

## Aspirational design challenge
How might we make Maya's accumulated Explore history survive phone replacement automatically, while preserving private ownership, offline rendering, calm battery use, and truthful deletion?

## Out of scope
Family sharing, live tracking, a sync settings screen, provider-side route inference, and end-to-end encryption key recovery.

---
id: brief-explore-durable-history
title: Durable Explore history
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-trust-this-app-with-my-life, jtbd-capture-and-find-meaning]
related_briefs: [explore-capability, explore-earned-terrain-and-trace]
owner: andrew
last_updated: 2026-08-03
---

# Durable Explore history

## Context
Explore currently keeps precise paths, accumulated territory, and meaningful Places only in device AsyncStorage. That local-first design is fast and private, but a clean install or failed phone transfer can erase the record.

## Target audience
Aspirational family organizers who expect lived family history to remain trustworthy without operating a backup system.

## Representative persona
Maya has accumulated paths and Places over months or years and replaces or loses her phone. Signing back into Kwilt should be enough to recover them.

## Aspirational design challenge
How might we preserve Maya's Explore history through device replacement while keeping capture offline-first, owner-private, battery-conscious, and truthfully deletable?

## Hero JTBD
`jtbd-move-the-few-things-that-matter` — durable lived evidence helps ordinary family movement retain meaning over time.

## Job flow step
`job-flow-maya-move-family-life-forward`, keep using the system, currently 3/5. Surprise data loss is incompatible with continued trust.

## JTBD framing
When I trust Kwilt with years of precise lived history, preserve it through a new phone without asking me to manage backups, and let deletion remain deletion.

## Design
The current local Explore store remains the immediate offline and rendering authority. A signed-in runtime synchronizes constrained owner records through Supabase: sessions with canonical points, Places, visit relationships, and reset/tombstone metadata. Derived explored cells and transient tracking state stay device-local and are rebuilt from sessions.

The database exposes the table only to `authenticated`, enables RLS, and checks `auth.uid() = user_id` for select, insert, update, and delete. Sync is incremental after the first backfill and is triggered without changing GPS acquisition. Family sharing remains unavailable.

## Success signal
An authenticated write/read/restore/delete round trip reproduces the user's map history on a clean local store, and a later device cannot resurrect cleared history or removed Places.

## Spec refinement
- Server durability means owner-only recovery, not household sharing.
- The first release relies on Supabase transport encryption and RLS; end-to-end encryption with recoverable user keys is a separate product/security project.
- Completed session blobs sync after the outing ends; active GPS samples remain device-local until completion so capture does not create a stream of network writes.
- Local capture never waits for network success.

## Open questions
- What signed-device history size should trigger point normalization or client-side compression?

# Converge: Incremental owner records

## Chosen alternative
Use incremental, owner-scoped Explore records with RLS. The local store remains the rendering authority; Supabase is durable recovery and cross-device convergence.

## Capability delta
Today, a clean install can lose every path and Place. After this release, signing into a replacement phone restores sessions, Places, visits, and therefore rebuilt territory.

## Reductive decisions
- No new UI, sync status, manual backup button, or family layer.
- Do not upload derived explored cells; rebuild them from canonical sessions.
- Do not sync transient tracking phase or wake anchors.
- One table and one client sync boundary, with record types constrained by SQL.

## Deletion
A monotonic reset marker prevents cleared history from returning. Place tombstones prevent removed Places from being resurrected by another device.

## Bet
We're betting that quiet owner-only durability materially increases trust without becoming noticeable work or battery spend. If record growth makes incremental JSON session blobs too costly, normalize points behind the same client boundary.

## Success signal
A signed-in user can record locally, sync, clear the app's local Explore storage, restore from Supabase, and receive the same path and Place-derived territory; deletion survives the same round trip.

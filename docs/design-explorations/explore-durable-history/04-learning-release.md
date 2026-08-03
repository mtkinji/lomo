# Learning Release: Explore durable history

## Concept To Build
Kwilt quietly preserves signed-in Explore history and restores it after a phone replacement.

## User Experience
There is no new surface. Recording and rendering remain immediate and offline. Sync runs after hydration, at app lifecycle checkpoints, and after meaningful completed-history changes. Active GPS samples do not schedule network work.

## Buildable Slice
Must be real: production schema, explicit grants, owner RLS, incremental pull/push, first-device backfill, new-device restore, reset propagation, Place tombstones, retry-safe operations, and local verification.

Intentionally excluded: family reads, realtime broadcasting, location analytics, server-rendered fog cells, and client-side encryption key recovery.

## Release Channel
Production-hidden infrastructure used by the existing signed-in Explore runtime.

## Brand-Goodwill Guardrails
- Never block or slow local capture.
- Never expose another user's rows.
- Never claim synced until a read-back succeeds.
- Do not increase location acquisition frequency.

## Reversibility
The runtime host can be removed while local persistence continues. Server records remain owner-owned and deletable.

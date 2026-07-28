# Diverge: Explore capability

Axis of variation: ambient personal memory vs explicit adventure session vs shared family game.

## A - Always-on personal atlas

Kwilt continuously records location and quietly builds a private fog-of-war map. Strongest continuity, but highest battery, permission, privacy, and App Review cost. It fails when an ambient life-coaching app starts feeling like a tracker.

## B - Explicit adventures

The user opens Explore and starts an adventure. Foreground location points clear fog, draw an altitude-colored trail, and persist locally when stopped. This is legible, reversible, and technically honest within the current app configuration. It fails if users expect effortless all-day coverage immediately.

## C - Shared family territory

Each person chooses what to contribute; the family map unions shared explored cells and optionally shows completed paths or live sessions. This most directly serves family participation, but requires authenticated membership, explicit per-person grants, server retention/deletion rules, and RLS before it can be truthful.

## D - Place passport

Explore centers collected Place relationships rather than continuous territory. It is easier to explain and connects well to Chapters, but loses the magical fog-clearing interaction that created the demand.

## Recommendation

Build B as the first functional surface with the domain boundaries required for C and the canonical Place relationship required for D. Defer A until real-use evidence justifies background access.

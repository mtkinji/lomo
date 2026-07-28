# Converge: Exploration Recap

## Chosen alternative

One session recap. Explore continues an explicitly started session with the screen locked only after separate background permission. When the session ends, Kwilt samples the route, resolves plausible Apple placemark names, dedupes familiar Places, records high-confidence visits, and presents one recap.

## Capability delta

Today, a user must look at Kwilt during the outing and manually name Places.

After this increment, the user can keep the phone away, return to one recap, and see multiple newly collected Places without receiving multiple alerts.

Still intentionally unsupported: always-on tracking, remote family recaps, unrestricted placemark collection, or precise Place names on the lock screen by default.

## Reductive decisions

- Enhance the existing Explore map and layer drawer; add no inbox or dashboard.
- A recap is a projection over a session plus Place relationships, not a new permanent domain object.
- One bottom drawer, one Done action, and direct remove controls only when correction is needed.
- No per-place notification setting; one Explore Recaps switch controls the entire delivery behavior.

## Activation

The recap appears after Stop. Background continuation is an explicit setting and permission path. A background-completed session may send one generic notification that reveals no Place names.

## Bet

We are betting that one quiet recap makes Explore feel more magical and less administrative than either per-place alerts or manual collection. If placemark confidence is poor, keep the recap but revert automatic collection to suggested visits.

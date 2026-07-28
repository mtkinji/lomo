# Converge: Exploration Recap

## Chosen alternative

Two intentional recording modes feeding one recap system. `Only when I start` records a bounded outing; `Always Exploring` records efficiently, automatically segments outings, and batches everything unseen into one recap. Both continue with the screen locked after explicit permission.

## Capability delta

Today, a user must look at Kwilt during the outing and manually name Places.

After this increment, the user can keep the phone away, return to one recap, and see multiple newly collected Places without receiving multiple alerts.

Still intentionally unsupported: implicit family sharing, unrestricted placemark collection, or precise Place names on the lock screen by default.

## Reductive decisions

- Enhance the existing Explore map and layer drawer; add no inbox or dashboard.
- A recap is a projection over a session plus Place relationships, not a new permanent domain object.
- One bottom drawer, one Done action, and direct remove controls only when correction is needed.
- No per-place notification setting; one Explore Recaps switch controls the entire delivery behavior.
- No fidelity matrix; recording mode determines an appropriate battery profile.

## Activation

The recap appears after Stop or an automatic outing boundary. Starting manually or choosing Always Exploring is the explicit permission path. A group of unseen background outings may send one generic notification that reveals no Place names.

## Bet

We are betting that one quiet recap makes Explore feel more magical and less administrative than either per-place alerts or manual collection. If placemark confidence is poor, keep the recap but revert automatic collection to suggested visits.

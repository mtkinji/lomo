# Learning Release: Nearby Game Join

## Concept To Build

When a player taps **Join**, Kwilt visibly looks for open tables nearby and brings the right table forward as a one-tap choice, with table code always available underneath.

## Capability Delta

Today, the user cannot:

- reliably notice that nearby discovery is already running;
- join a found table in one action when Kwilt already knows their Games name.

After this release, the user can:

- open the existing Join sheet, see an honest nearby-search state, recognize an open table, and take their place with one choice;
- use the same code fallback when discovery is slow, unavailable, or denied.

Still intentionally not supported:

- public or background discovery;
- nearby player/device identity;
- automatic child-device pairing;
- games without an existing remote table contract;
- proximity as authorization.

## User Experience

The user encounters the release through the existing top-right **Join** action on the Games shelf. The sheet opens with the remembered Games name filled when available and a compact **Looking nearby…** state. A discovered table replaces that state with a large card showing the game and the host's matching table mark. Tapping the card joins and opens the room. The manual code field remains below throughout; errors explain the fallback without blaming the user.

If no remembered name exists, the name field stays first. Tapping a found-but-not-yet-actionable table focuses the name field and explains **Add your name to join**, rather than presenting a mysteriously disabled card.

## Existing Product Relationship

This enhances `GameShelfScreen` and `JoinTableDrawer`. It retains the existing `browseNearbyTables`, Bank/Slanguage advertisement, backend claim, QR, link, code, and remote-room paths. It does not replace the Games shelf or add a new navigation destination.

## Buildable Slice

Must be real:

- explicit browsing lifecycle states: starting, browsing-empty, results, unavailable/failed;
- remembered Games-name prefill with user editing preserved;
- nearby result promoted as the primary action;
- actionable missing-name behavior;
- the same host/joiner table mark;
- code fallback in every non-token join state;
- privacy-safe method/state analytics;
- tests for state transitions, name prefill, nearby selection, failure fallback, and cleanup when the sheet closes.

Can be thin or temporary:

- support only the existing Bank and Slanguage advertisement kinds;
- use the current single-result card styling for a small result list;
- record real-device observations manually rather than build an in-product survey.

Intentionally excluded:

- native transport refactor;
- shared Games/Household nearby abstraction;
- Android implementation;
- App Clip;
- new remote-game contracts;
- distance sorting, signal strength, or person/device labels.

## Release Channel

**TestFlight build.** Source and Simulator tests can verify drawer logic, but truthful discovery learning requires at least two signed physical devices on the release binary. Keep this inside the current Games-capability rollout rather than presenting it as a separate beta feature.

## Brand-Goodwill Guardrails

- Discovery begins only after an explicit **Join** tap and stops when the sheet closes.
- The system says what it is doing and always leaves the code path visible.
- Advertisements reveal only the existing short-lived table code and game kind.
- Analytics record method and coarse state only—never player names, table codes, service names, device identifiers, exact nearby counts, or location.
- No prompt claims Bluetooth or proximity precision that the current Network framework implementation does not provide.

## Reversibility

Keep the change in the existing drawer and behind the existing nearby-availability check. If it confuses or regresses joining, restore the current presentation without changing table data, membership, links, codes, or migrations. The release adds no durable nearby-specific user state.

## Permanent Product Threshold

Keep the refinement when repeated real-device gatherings show that eligible players choose the nearby result without host coaching, code fallback remains understandable, no wrong-table joins occur, and discovery lifecycle/permission behavior is stable across close, reopen, denial, disappearance, and reconnect.

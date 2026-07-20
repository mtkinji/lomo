# Learning Release: Activity Place Context

## Concept To Build

Turn the existing Activity Location sheet into a Place-first editor where the selected place is useful context on its own and arrival/departure alerts are optional.

## Capability Delta

Today, the user cannot:

- save the current place from the Location sheet without a leave/arrive alert;
- distinguish “relevant here” from “notify me here” in the UI;
- avoid boundary configuration when no geofence behavior is wanted.

After this release, the user can:

- select or use the current location and save it with `Alert · Off`;
- see the Place on the Activity without receiving an alert;
- later opt into `When I arrive` or `When I leave`, which reveals Boundary radius.

Still intentionally not supported:

- automatic nearby-place detection;
- Saved Place creation or learning;
- place-specific list/grouping UI;
- new notification behaviors;
- continuous location history.

## User Experience

From Activity Detail, Maya opens Location. The map and selected place are primary. The sheet shows `Alert · Off` beneath the place. She taps `Use current location`, sees the selected point or resolved label, and saves. No radius is shown, no geofence is registered, and no notification permission is requested.

If she changes Alert to `When I arrive` or `When I leave`, Boundary radius appears. Kwilt then follows the existing explicit permission and location-offer path. Reopening the Activity shows the saved Place and accurate alert state.

## Existing Product Relationship

This release enhances the existing Activity Location sheet and the optional-trigger shape already present on `Activity.location`. It is the smallest visible expression of the existing Places and To-Do Action Contexts direction: a Place link does not imply an alert.

## Buildable Slice

Must be real:

- `Alert · Off` is the default for a newly attached Place.
- A Place can be saved with label/coordinates and no trigger/radius.
- Boundary radius is conditionally disclosed only for arrive/leave alerts.
- Existing triggered locations round-trip without losing their alert.
- Context-only locations are excluded from geofence registration and notification delivery.
- “Use current location” uses minimum necessary permission; alert enablement owns any stronger permission request.
- Activity Detail accurately shows a context-only Place versus a Place with an alert.
- Regression tests cover new, existing, cleared, context-only, arrive, and leave states.

Can be thin or temporary:

- Reverse geocoding can be best-effort with a stable fallback such as `Pinned place`.
- Analytics can begin with place saved and alert state rather than a broad Places funnel.
- The map, search, and current-location controls can retain their current implementation.
- A travel-mismatch candidate chooser can begin as a compact dock-adjacent receipt using one nearby search result plus one existing Saved Place; richer trip understanding is unnecessary.

Intentionally excluded:

- Saved Places;
- Quick Add shortcut changes;
- Phone Agent behavior;
- new Recommended ranking;
- a dedicated Place search/view.
- passive travel detection or location-history storage.
- an automatic post-capture sheet or generated-results review queue.

## Release Channel

`TestFlight build` after local simulator verification. The behavior is small and reversible, but the learning depends on real current-location permission behavior and repeated everyday use.

## Brand-Goodwill Guardrails

- Never describe context-only Place as a reminder.
- Never request notification permission for `Alert · Off`.
- Never request background location permission until an alert requiring it is explicitly enabled.
- Never label a saved coordinate “Current location” in a way that implies it follows the user after Save.
- Preserve existing alerts exactly when editing an Activity that already has one.

## Reversibility

The release uses the existing optional trigger field and introduces no migration. Reverting the UI leaves context-only locations valid and safely ignored by Location Offers.

## Permanent Product Threshold

Accept this as permanent behavior if users can attach context-only Places without permission confusion, existing alerts keep working, and the resulting Place metadata proves useful in Activity retrieval or next-action decisions.

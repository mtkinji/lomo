# Learning Release: Explore earned terrain and trustworthy trace

## Concept To Build

Creating a Place produces a soft familiarity bloom at three times the normal reveal radius, while the dependable exact route remains narrowly and fully clear.

## Capability Delta

Today, the user cannot:

- depend on a long route line remaining visible when fog continues to clear;
- feel that an intentional backcountry outing earned more than a narrow GPS tube.

After this release, the user can:

- see bounded, contrast-backed route traces throughout a long outing;
- see a distinct soft bloom immediately after creating a Place.

Still intentionally not supported:

- park-boundary resolution, acreage scoring, manual painting, or precise family sharing.

## User Experience

The user encounters the behavior on the existing Explore map. As observations arrive, the exact path remains crisp. When the user saves **Name current Place**, the fog becomes lighter in a larger area around that point without becoming fully clear. Long gaps remain fogged and unconnected.

## Existing Product Relationship

This enhances Silver Mist, My Path, and the existing Place-creation action. It leaves recording choices, recaps, settings, privacy, and family controls unchanged.

## Buildable Slice

Must be real:

- session-level retention of `ambient` versus `adventure` intent;
- bounded topology-preserving path geometry;
- a reliable contrast casing plus bounded altitude stroke;
- bounded user-created Place selection and native iOS soft-bloom shader inputs;
- Android fallback that preserves the same semantic distinction as closely as its polygon renderer allows;
- automatic map discoveries excluded from the bloom.

Can be thin or temporary:

- a fixed radius equal to three times the normal 65-foot reveal radius;
- visual learning through direct inspection rather than analytics.

Intentionally excluded:

- new UI, explanatory copy, remote providers, server writes, analytics, and family sync.

## Release Channel

Local build. Andrew can name a Place on an existing route and inspect the immediate bloom before any TestFlight claim.

## Brand-Goodwill Guardrails

- Exact route and interpreted terrain remain visually and structurally distinct.
- No park name or boundary claim is made.
- No new sensitive location data leaves the device.
- Adventures and automatically discovered Places do not gain a wider reveal by themselves.

## Reversibility

The wide reveal is derived from existing user-created Places. Removing the additional renderer input restores the prior map without deleting or migrating location or Place data.

## Permanent Product Threshold

Keep and refine the behavior if real hikes show a dependable exact line and the broad reveal consistently reads as experienced terrain rather than fabricated travel.

# Learning Release: Explore earned terrain and trustworthy trace

## Concept To Build

Deliberate Adventures reveal a soft, broad terrain corridor around a dependable exact route line, while automatic movement keeps the narrow evidence-based reveal.

## Capability Delta

Today, the user cannot:

- depend on a long route line remaining visible when fog continues to clear;
- feel that an intentional backcountry outing earned more than a narrow GPS tube.

After this release, the user can:

- see bounded, contrast-backed route traces throughout a long outing;
- see a distinct 120-meter terrain reveal around deliberate Adventures.

Still intentionally not supported:

- park-boundary resolution, acreage scoring, manual painting, or precise family sharing.

## User Experience

The user encounters the behavior on the existing Explore map. Starting an Adventure requires no new choice. As observations arrive, the exact path remains crisp and the wider area becomes lighter without becoming fully clear. Long gaps remain fogged and unconnected.

## Existing Product Relationship

This enhances Silver Mist and My Path. It leaves recording choices, Places, recaps, settings, privacy, and family controls unchanged.

## Buildable Slice

Must be real:

- session-level retention of `ambient` versus `adventure` intent;
- bounded topology-preserving path geometry;
- a reliable contrast casing plus bounded altitude stroke;
- native iOS soft-terrain shader inputs and rendering;
- Android fallback that preserves the same semantic distinction as closely as its polygon renderer allows;
- migration that does not relabel unknown historic ambient sessions as Adventures.

Can be thin or temporary:

- fixed 120-meter terrain radius;
- visual learning through direct inspection rather than analytics.

Intentionally excluded:

- new UI, explanatory copy, remote providers, server writes, analytics, and family sync.

## Release Channel

Local build. Andrew can inspect it on the active hiking history or a preview Adventure before any TestFlight claim.

## Brand-Goodwill Guardrails

- Exact route and interpreted terrain remain visually and structurally distinct.
- No park name or boundary claim is made.
- No new sensitive location data leaves the device.
- Historic sessions with unknown policy do not gain a wider reveal.

## Reversibility

The wide reveal is derived from canonical points and session policy. Removing the additional renderer inputs restores the prior map without deleting or migrating location evidence.

## Permanent Product Threshold

Keep and refine the behavior if real hikes show a dependable exact line and the broad reveal consistently reads as experienced terrain rather than fabricated travel.

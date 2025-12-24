## Affiliate enablement (post-launch)

This doc captures the recommended approach to make Kwilt an affiliate for “Send to…” retailer actions (Amazon, Home Depot, etc.) **without changing the core app shell/canvas UX**.

### Principles

- **Centralize link decoration** behind a single boundary so call sites stay simple.
- Prefer **web flows** (open in browser) for affiliate attribution reliability; deep links into retailer apps are often inconsistent.
- Always include an **affiliate disclosure** wherever outbound retailer links are offered.

### Recommended architecture

- **Phase 1 (simple, no server)**: decorate retailer URLs directly in the client when allowed.
  - Amazon: append `tag=<associatesTag>` when configured.
- **Phase 2 (scalable, multi-retailer)**: route through Kwilt-owned “go links”.
  - Example: `https://go.kwilt.app/amazon?q=<query>&src=sendto`
  - Server responds with a 302 to the network/merchant affiliate URL (Impact/CJ/etc.).
  - Pros: change tracking logic without shipping an app update; supports merchants that require network click URLs.

### Current code hook

- Retailer Send-to URLs are built via `src/services/affiliateLinks.ts`.
- Amazon tag configuration lives in Expo `extra`:
  - `amazonAssociatesTag` (from `AMAZON_ASSOCIATES_TAG` or `EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG`)

### Compliance checklist (minimum)

- Add in-app disclosure copy near “Send to…”:
  - “Kwilt may earn a commission from qualifying purchases.”
- Follow each program’s rules for:
  - link formatting
  - redirects / cloaking
  - required UI disclosure language
  - prohibited incentivization / misleading copy



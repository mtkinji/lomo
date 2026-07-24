# Learning Release: Settings Surface Grammar

## Concept To Build

A calmer category settings page that uses grouped settings rows for routine controls while keeping the category-specific Screen Time rule compact and editable.

## Capability Delta

Today, the user cannot:

- Adjust category settings in one place without the page feeling like a large product surface.
- See clear rules for which settings are grouped rows versus cards.
- Trust that Budget settings will scale across rollover, forecast, and Screen Time controls.

After this release, the user can:

- Open `Shopping settings`.
- See Budget Plan, Forecast, and Screen Time Controls as quiet settings groups.
- Toggle rollover directly.
- Open forecast source from a settings row.
- Choose paused apps and adjust Screen Time triggers in a compact grouped surface.

Still intentionally not supported:

- Full main-Kwilt settings migration.
- Deep forecast editing inline on the category settings page.
- Multi-category native Screen Time app-set reconciliation beyond the current policy storage path.

## User Experience

The user enters from Budget Detail's overflow menu via `Category settings`.

Happy path:

1. The screen opens with a muted settings canvas and a compact title such as `Shopping settings`.
2. The user sees grouped settings sections.
3. Budget Plan contains `Rollover`.
4. Forecast contains `Forecast source`.
5. Screen Time Controls contains a compact sentence field and trigger rows when the category supports app pauses.
6. Helper text explains consequences below groups, not inside oversized cards.

## Existing Product Relationship

This enhances the existing category settings/app-control route. It does not replace Budget Detail, Screen Time setup interstitials, or forecast drawers.

## Buildable Slice

Must be real:

- Category settings page shell with compact settings title.
- Grouped settings styling.
- Rollover toggle persists.
- Forecast row routes to the existing forecast settings surface or remains a clear row if route wiring is deferred.
- Screen Time sentence and triggers use compact settings density.
- Empty category state does not inherit another category's selected apps.

Can be thin or temporary:

- Settings primitives can live locally in `app/app-control/[budgetId].tsx` for the first proof.
- Forecast row can route back to existing Budget Detail drawer later if no direct route exists yet.
- Toggle style can be local if it is named as a candidate shared primitive.

Intentionally excluded:

- Shared npm/token package work.
- Main Kwilt settings migration.
- New analytics.
- New onboarding copy.

## Release Channel

Local build.

Rationale: this is a visual/interaction grammar change that needs immediate simulator inspection before broader adoption.

## Brand-Goodwill Guardrails

- The page must feel intentional, not half-migrated.
- Do not expose incomplete settings as dead rows.
- Keep Screen Time setup and app selection honest about native availability.
- Keep copy plain and reversible.

## Reversibility

The implementation can be rolled back by restoring the previous category settings route styling. Domain changes are limited to already-existing category settings behaviors.

## Permanent Product Threshold

Promote the grammar if simulator review shows category settings feels calmer, scan-friendly, and consistent enough to reuse for Budget settings and selected main Kwilt settings screens.

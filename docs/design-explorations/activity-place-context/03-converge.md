# Converge: Activity Place Context

## Scoring

| Alternative | Maya fit | Mental-model clarity | System fit | UI reduction | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Add “No notification” | Medium | Medium-low | Excellent | Strong | Useful fallback, not the intended hierarchy. |
| B: Place first, optional alert | Strong | Strong | Strong | Strong | Choose. |
| C: Separate Place and Alert rows | Strong | Excellent | Medium | Low | Too much permanent surface. |
| D: Context-only quick action | Strong | Medium | Medium | Medium | Consider later after usage evidence. |

## Chosen Direction

Choose **Place first, optional alert**.

The existing Location sheet becomes a Place editor with an optional Alert layer:

1. The map and place/current-location picker answer “Where is this relevant?”
2. `Alert` defaults to `Off` and answers “Should Kwilt interrupt me at this boundary?”
3. `Boundary radius` appears only after `When I arrive` or `When I leave` is selected.
4. Save stores label and coordinates in all cases, and stores trigger/radius only for an enabled alert.

## Capability Delta

Today, the user cannot attach a location through Activity Detail without also accepting a default leave notification.

After this change, the user can attach the place where they are now as quiet Activity context, see that place later, and optionally add an arrival/departure alert without choosing the place again.

This release should still not:

- infer or save durable Places silently;
- monitor a place with no enabled alert;
- request background location permission for context-only attachment;
- raise an Activity merely because it has coordinates;
- add a Place tab, context dashboard, or new Activity-detail row.

## Accepted Trade-Offs

- Context-only Place may have modest immediate value until search, Activity Detail metadata, and Recommended consume it consistently.
- Best-effort reverse geocoding may fail, so Save needs a stable fallback label.
- An extra `Alert · Off` row remains in the sheet, but it explains an important trust boundary.

## Rejected Trade-Offs

- Do not preserve notification-first copy merely to minimize code changes.
- Do not add a second Activity Detail row or a separate alert sheet in this slice.
- Do not make current-location capture imply a Saved Place or background monitoring.

## System Implications

- Widen the UI draft state to `'none' | 'arrive' | 'leave'` or represent alert state separately.
- Preserve `Activity.location.trigger?` as optional; omit `radiusM` when no trigger is enabled.
- Update dirty-state comparison so a missing trigger remains missing rather than normalizing to `leave`.
- Location-offer registration/reconciliation must continue to ignore locations without a trigger.
- Current-location capture should request only the minimum permission needed to read the current point. Stronger/background permission belongs to alert enablement.
- Existing Activities with triggers retain their configured alert when opened.
- Automatic place assignment should preserve a broad brand target until a Saved Place, explicit current location, or user choice resolves it.
- When current-region and saved-home candidates materially disagree, present both as intent-bearing choices rather than automatically preferring the nearest result.

## Reductive Design Decisions

- Enhance the existing Location sheet rather than create a new Place surface.
- Default the secondary behavior to `Off`.
- Hide Boundary radius until it has a job.
- Keep one Save action for Place plus optional Alert.
- Refuse saved-place management, learning, new modes, and notification education in this slice.

## Activation Path

Discovery should be organic. The user already opens Location when the place matters. The reordered sheet teaches the model at that moment: choose a Place, then optionally add an Alert. No onboarding or promotional prompt is needed.

Natural adoption is repeated saving of context-only Places, especially through `Use current location`, with later retrieval or action on those Activities and without alert enablement.

For automatically inferred brand targets, a lightweight post-capture resolution is earned only when Kwilt can show a real choice: for example, `Nearby · Utah` versus `My Costco · Colorado`. Ordinary place mentions with no meaningful mismatch should not create a prompt.

In Quick Add, “lightweight” means a dock-adjacent receipt strip, not an automatically opened `BottomGuide`. The Activity is saved first; safe enrichment is summarized passively; an ambiguous Place question gets direct chips; and a full sheet opens only after the user chooses `Review`, `Choose another`, or `Set alert`.

## Stated Bet

We're betting that most place attachment starts as context, and that making alerts explicitly optional will increase useful Place attachment while reducing unwanted permission and notification behavior. If users attach Places but cannot later benefit from them, revisit the retrieval and Recommended surfaces rather than restoring a trigger-first default.

## Success Signal

The user can save “where I am” in one pass, reopen the Activity and correctly predict that no notification will fire, and later add an alert without reselecting the place.

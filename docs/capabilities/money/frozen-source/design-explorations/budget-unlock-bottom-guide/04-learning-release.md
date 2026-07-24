# Learning Release: budget-unlock-bottom-guide

## Concept To Build
When a spend-triggering app is paused, Budget Detail shows the relevant budget normally and presents the open-or-stay-blocked choice as a compact bottom guide.

## Capability Delta
Today, the user cannot:
- keep the chart visually primary while deciding whether to open the paused app,
- receive the app-pause choice in the same guide grammar Kwilt uses for timely offers,
- dismiss or act on the pause without a large inline card occupying the meter area.

After this release, the user can:
- land on Shopping from a paused Amazon context,
- see the budget meter and chart without the pause card between month and chart,
- use a bottom guide to choose `Open Amazon` or `Keep blocked`,
- see a quiet receipt after either choice.

Still intentionally not supported:
- multiple simultaneous pause guides,
- generic education prompts about Screen Time,
- automatic recovery plans,
- silent dismissal as a recorded `left_blocked` event.

## User Experience
Encounter:
- Active unlock task route state opens Budget Detail.
- Budget Detail renders the normal header, meter, month selector, and chart.
- A bottom guide slides in over the canvas.

Happy path:
- Title: `Amazon is paused`
- Body: `Shopping at 90%.`
- Secondary action: `Keep blocked`
- Primary action: `Open Amazon`
- On open: record `opened_for_now`, reconcile Screen Time, show `Amazon is open for 20 min.`
- On keep blocked: record `left_blocked`, reconcile Screen Time without clearing access, show `Amazon stays blocked.`

Dismissal:
- Swiping or closing the guide hides it for this page visit or minimizes it.
- It does not record an outcome.

## Existing Product Relationship
Enhances:
- Budget Detail remains the app-unlock review surface.
- Budget App Unlock Review keeps the same receipt model and Screen Time reconciliation.

Replaces:
- The inline `BudgetUnlockDock` for active unlock tasks.

Left unchanged:
- App pause setup.
- Policy/reason evaluation.
- Transaction activity and forecast chart behavior.

## Buildable Slice
Must be real:
- Money-local bottom guide primitive or `BottomDrawer` extension with non-blocking/dynamic behavior.
- Budget Detail guide rendering for active `unlockPolicy`.
- Two explicit actions wired to existing review outcomes.
- Safe-area and bottom-padding handling so the chart/activity are not hidden.
- Simulator screenshot proving first viewport hierarchy.

Can be thin or temporary:
- Guide only appears for the existing Shopping/Amazon active pause path.
- No persisted "dismissed this guide" preference beyond the page visit.
- Receipt can be in-guide state rather than a durable history surface.

Intentionally excluded:
- Broad guide framework,
- push notifications,
- additional app-pause setup changes,
- new analytics beyond existing review receipt plus manual screenshot review.

## Release Channel
`Local build` first.

Rationale: the question is visual hierarchy and interaction feel. Simulator proof is enough to decide whether to replace the inline dock. Signed-device Screen Time proof remains required before claiming the full app-pause value unit works.

## Brand-Goodwill Guardrails
- The guide must be non-blocking or feel non-blocking.
- `Keep blocked` stays visible as a real choice.
- No shame, permission, or punishment language.
- No celebratory unlock animation.
- The guide should not stack with forecast drawers, toasts, or setup drawers.

## Reversibility
The implementation can be hidden by falling back to the inline dock. No domain migration is required because the same review outcomes and policy state are used.

## Permanent Product Threshold
Accept this as the permanent unlock pattern if:
- the guide makes the chart feel more primary than the inline dock,
- both actions are understood without explanation,
- dismissal semantics feel trustworthy,
- the surface works on small and large iPhone sizes,
- signed-device app-pause verification still works after the visual move.

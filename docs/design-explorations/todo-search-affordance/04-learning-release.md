# Learning Release: todo-search-affordance

## Concept To Build

Place a separate circular Search action beside the collapsed Quick Add dock, and reveal
a smaller circular scroll-to-top action centered above the full dock row after a short
committed scroll.

## Capability Delta

Today, the user cannot:

- recognize a direct Search path from the visible To-dos page;
- invoke Search without knowing it lives in the capability menu;
- return quickly to the beginning after scrolling through a long inventory.

After this release, the user can:

- tap Search beside Quick Add to open the existing drawer scoped to To-dos;
- keep capture and retrieval as distinct, unambiguous actions;
- tap scroll-to-top after roughly one-third of a viewport to return to offset zero;
- dismiss Search and return to the unchanged To-dos view and scroll position.

Still intentionally not supported:

- inline filtering of the visible list;
- a second To-dos-only result surface;
- saved searches, ranking changes, or search preferences;
- Search or scroll-to-top in Kanban, where the Quick Add dock is absent;
- new analytics, onboarding, coachmarks, or settings.

## User Experience

On a populated standard To-dos list, the collapsed Quick Add pill keeps its existing
height, copy, elevation, and tap behavior while reserving enough trailing space for a
48-point circular Search button. The button uses the same card surface, border, and
elevation as Quick Add.

Tapping Search calls `openGlobalSearch({ initialScope: 'activities' })`. The existing
drawer remains authoritative for query state, focus, scopes, ranking, results, and
navigation.

After the list crosses roughly one-third of a viewport of vertical scroll, a 40-point circular return
button appears centered above the complete Quick Add/Search row while retaining a
48-point touch target. A hysteresis boundary keeps it stable while scrolling back
through the middle and hides it again within the top quarter of the viewport. Tapping it
gives light haptic feedback, grows briefly to acknowledge the request, starts the active
standard, grouped, or manual-order list toward the top, then fades, sinks, and shrinks
back toward its dock anchor during the return.
Its entrance begins smaller and slightly lower at the dock anchor, then quickly fades,
rises, and grows into its resting position so its origin is spatially legible.

Quick Add and Search use the same light press haptic so the floating controls share one
quiet interaction language. Scroll-to-top remains visually and spatially separate because
it is transient navigation, not a third persistent dock action.

Both satellite actions are hidden while Quick Add is expanded so the capture drawer and
keyboard own the interaction.

When the inventory is stationary, Quick Add and its satellite controls retain their
broad floating shadow and add a darker, tight contact shadow around the surface edge.
Actual list movement removes only the contact layer so the controls recede while the
user scans content. The contact layer returns 600 ms after scrolling settles.

## Existing Product Relationship

This enhances `ActivitiesScreen` as a local invocation point and reuses
`GlobalSearchDrawer`, `QuickAddDock`, the existing inventory scroll stream, and Kwilt's
current icon and surface tokens. The capability-menu Search entry remains the global
invocation path. No domain data or persisted preferences change.

## Buildable Slice

Must be real:

- A circular Search button anchored beside the collapsed Quick Add dock.
- Quick Add's existing tap flow and expanded state preserved.
- Search invocation scoped initially to Activities.
- A circular scroll-to-top button revealed from tested viewport-relative behavior.
- Animated return to offset zero in standard, grouped, and manual-order list layouts.
- Minimum 44-point touch targets, button roles, literal accessibility labels, and hints.
- Shared elevation values between the collapsed dock and the two satellite controls.
- Shared settled-versus-scrolling elevation timing across all visible floating controls.
- Focused tests for Search, scroll-to-top visibility, dock geometry, and threshold
  hysteresis.
- Simulator proof on the populated To-dos route at the top, deep in the list, after
  returning to the top, and through the Search drawer.

Can be thin:

- Andrew-only observation is sufficient for the first composition and thumb-reach pass.
- Entrance and acknowledgement motion stay brief and functional; Reduce Motion removes
  the scale and translation instead of substituting decorative effects.

Intentionally excluded:

- Search-result, recents, scope-chip, or ranking redesign.
- New navigation routes, schema, persistence, entitlements, or feature flags.
- A compound Add/Search input or another labeled dock.
- Changes to the fixed inventory toolbar.
- Kanban-specific placement.

## Release Channel

**Local build.**

The first unknowns are composition, reach, and scroll behavior on the real populated
To-dos surface. Simulator proof can validate the integration; signed-device dogfood is
the next boundary for repeated thumb-reach use. TestFlight remains a separate step.

## Brand-Goodwill Guardrails

- Search stays visually secondary to the wider Quick Add action.
- Retrieval never changes the current view, filters, grouping, or sort.
- The return control appears only when it saves meaningful scrolling.
- Expanded capture never competes with adjacent floating actions.
- No data is collected merely to justify the affordances.

## Reversibility

The slice adds local controls and one optional dock inset. It introduces no migration or
persisted state. Removing the controls and inset restores the previous page without
user-data cleanup.

## Permanent Product Threshold

Keep the affordances when repeated dogfood use shows that Search is invoked without
confusion, scroll-to-top appears at a useful moment, Quick Add still reads as primary,
and the two-control stack feels calm on the smallest supported viewport.

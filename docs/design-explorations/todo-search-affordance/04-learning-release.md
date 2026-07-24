# Learning Release: todo-search-affordance

## Concept To Build

Add one familiar `Search To-dos` field at the top of the populated To-dos inventory that opens Kwilt's existing shared Search drawer already scoped to To-dos.

## Capability Delta

Today, the user cannot:

- recognize a direct Search path from the visible To-dos page;
- search all To-dos without knowing that global Search lives inside the capability menu;
- clearly distinguish known-item retrieval from changing the current view, filters, grouping, or sort.

After this release, the user can:

- see `Search To-dos` before scanning a populated inventory;
- tap it to open the existing drawer with To-dos as the sole initial scope and the query input focused;
- search the full eligible To-dos collection without dismantling the current inventory configuration;
- deliberately broaden the same search to Goals, Arcs, or Chapters using the existing scope chips;
- dismiss Search and return to the unchanged To-dos context.

Still intentionally not supported:

- inline filtering of cards while typing;
- a second Activities-only results surface;
- saved searches, query modes, search preferences, or altered ranking;
- a footer Search button, compound Add/Search dock, fixed-toolbar lens, or scroll-triggered rail;
- a Search affordance when there are no stored To-dos to retrieve;
- special Kanban search placement in the first learning slice.

## User Experience

On a populated To-dos page in the standard inventory layouts, the user sees one compact, full-width field below the view/filter/group/sort toolbar and above the first list content. It contains a search lens and the literal placeholder-style label `Search To-dos`.

The field is a button rather than an editable input. Tapping anywhere on it opens `GlobalSearchDrawer`, resets any previous query, selects only the To-dos scope for this invocation, and focuses the drawer's real query input. With no query, the drawer retains its existing small set of recent/recommended To-dos. The user may broaden scope with the existing chips.

The inventory field participates in the list opening context: it scrolls away with list content and reappears when the user returns to the top. Closing the drawer preserves the inventory's active view, filters, grouping, sort, and scroll position.

## Existing Product Relationship

This enhances `ActivitiesScreen` as a local invocation point and leaves `GlobalSearchDrawer` authoritative for search state, scope, ranking, results, navigation, and empty states. The capability-menu Search entry remains the global invocation path. Quick Add and all To-dos organization controls remain unchanged.

## Buildable Slice

Must be real:

- A reusable passive search-affordance row using existing Kwilt input/surface tokens, iconography, spacing, pressed state, and accessibility conventions.
- Placement in the populated standard To-dos list header beneath the fixed toolbar.
- `accessibilityRole="button"` and `accessibilityLabel="Search To-dos"` with a minimum 44-point hit target.
- Invocation through `openGlobalSearch({ initialScope: 'activities' })`.
- Drawer query reset and query-input focus on open.
- To-dos-only initial scope even if the previous global invocation had broader scopes selected.
- Search results drawn from the full eligible Activities store, independent of the active rendered view/filter/group/sort.
- Unchanged inventory state and scroll position after drawer dismissal.
- Focused tests for visibility, accessibility, invocation scope, and no regression to the existing menu Search entry.
- Simulator proof at the top of a populated list, after the field has scrolled away, and after returning from the drawer.

Can be thin or temporary:

- Manual observation can capture whether the field is noticed and whether the vertical space feels acceptable; no new analytics event is required for an Andrew-only local build.
- The first slice may target the standard list/grouped inventory paths used by the supplied screenshot while Kanban continues to rely on capability-menu Search.
- Styling should reuse the nearest existing quiet input/surface treatment rather than establish a new generalized component API unless reuse is already obvious.

Intentionally excluded:

- Search-result, ranking, recents, or scope-chip redesign.
- New navigation routes or persisted state.
- Search text rendered or managed by `ActivitiesScreen`.
- Coachmarks, onboarding, badges, animations, or explanatory copy.
- Quick Add geometry or behavior changes.
- Fixed toolbar restructuring.
- Search availability based on scroll thresholds, list length, AI inference, or usage frequency.
- TestFlight, production rollout, or feature-flag infrastructure in this phase.

## Release Channel

**Local build.**

This is the fastest truthful first evaluation because the unresolved questions are interaction quality and page composition, not backend feasibility or multi-user behavior. A local iOS simulator build can prove layout, scroll behavior, drawer invocation, accessibility labeling, and state preservation. If the field survives that review, a signed-device build is the next boundary for real thumb reach and repeated dogfood use; TestFlight remains a separate explicitly authorized step.

## Brand-Goodwill Guardrails

- The release remains Andrew-only until it looks intentional in the real populated To-dos surface.
- Use literal, familiar `Search To-dos` language; do not frame this as a new feature or recommendation.
- Keep the field visually quieter than Quick Add and the To-dos themselves.
- Do not move, shrink, or overload Quick Add.
- Do not expose incomplete Kanban behavior as if Search were universally placed until that layout is deliberately resolved.

## Reversibility

The release adds one local trigger and no schema, migration, persisted preference, entitlement, notification, or new result state. Removing the trigger restores the prior page while leaving the shared Search drawer and capability-menu entry intact. Rollback is therefore a narrow component/render-path reversal with no user-data cleanup.

## Permanent Product Threshold

Promote the affordance from a learning slice to accepted To-dos behavior when:

- it is recognized without instruction;
- the added row does not make the opening inventory feel crowded or push useful content unacceptably far down;
- it reliably opens To-dos-scoped Search and preserves inventory context;
- it replaces scanning or filter/view dismantling for known-item retrieval in repeated dogfood use;
- real-device use does not reveal a strong need for persistent bottom access;
- the remaining supported inventory layouts receive an intentional, consistent placement decision.

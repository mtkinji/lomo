# Diverge: money-category-ordering

Axis of variation: direct manipulation versus explicit management versus lightweight emphasis.

## A. Drag the meter grid

Long-press a Summary meter and drag it through the two-column grid. The change is immediate and highly direct.

- Persona fit: visually intuitive for Maya after discovery.
- System fit: poor. It competes with meter taps, vertical scroll, and horizontal month paging.
- Best when: the grid is the only view and direct manipulation is a primary behavior.
- Fails when: a long press fires accidentally or accessibility needs precise movement.
- Anti-pattern check: no dashboard expansion, but the gesture adds hidden interaction weight.

## B. Dedicated reorder list

Add `Reorder categories` to Summary options. Open a single-header drawer containing a full-width category list with drag handles, Done, and accessible Move up/Move down actions. Save the complete order once.

- Persona fit: deliberate, calm, and easy to understand without changing everyday scanning.
- System fit: strong. Reuses `sort_order`, `DraggableFlatList`, drawer containment, and haptic conventions.
- Best when: ordering is occasional but important.
- Fails when: users expect to rearrange directly from the grid and never inspect the overflow menu.
- Anti-pattern check: passes; it adds no score, grouping, or productivity taxonomy.

## C. Pin a few categories

Allow up to three categories to be pinned. Pinned items appear first; everything else keeps system order.

- Persona fit: reduces effort if Maya only cares about a few categories.
- System fit: requires a new state and a second ordering rule even though `sort_order` already exists.
- Best when: favorites are meaningfully different from order.
- Fails when: the desired sequence includes more than a few categories or “pinned” needs explanation.
- Anti-pattern check: bounded, but creates a concept the user did not ask for.

All three preserve Money as a capability rather than forcing its categories into Kwilt's Arc/Goal/Activity hierarchy. None blocks capture or transaction correction.

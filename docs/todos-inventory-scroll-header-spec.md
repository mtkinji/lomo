# To-dos Inventory Auto-Hiding Chrome Spec

## Status

Draft for implementation planning.

## Objective

Make the To-dos inventory feel more focused as the user scrolls. When the user scrolls down, assume they are trying to find or inspect a to-do. Non-essential chrome should quickly get out of the way: the page title, streak capsule, avatar, and global nav controls should hide. The view controls should occupy the freed header space and remain sticky so users can keep changing views, filters, sorts, and layout controls while working through a long list.

This is the common "hide-on-scroll" / "auto-hiding chrome" pattern: downward scroll hides navigation chrome, upward scroll reveals it again even if the user is still deep in the list.

This should feel like the app chrome is yielding to the user's working surface, not like the whole screen is jumping between two unrelated modes.

## Current State

Primary code anchors:

- `src/features/activities/ActivitiesScreen.tsx`
- `src/features/activities/activitiesScreenStyles.ts`
- `src/ui/layout/PageHeader.tsx`
- `src/ui/layout/AppShell.tsx`
- `src/ui/layout/CanvasFlatList.tsx`
- `src/features/activities/QuickAddDock.tsx`
- `src/features/activities/KanbanBoard.tsx`
- `src/navigation/KwiltBottomBar.tsx`
- `src/navigation/kwiltBottomBarMetrics.ts`

The current To-dos screen renders:

- `AppShell`
- `PageHeader` with title `To-dos`, streak capsule, and avatar
- A fixed toolbar outside the scrollable list
- A list or Kanban board below the toolbar
- `QuickAddDock` anchored near the bottom for list layout
- Global bottom navigation/action controls managed by the navigation shell

`ActivitiesScreen.tsx` currently comments that the toolbar is rendered outside scroll views so it stays fixed while scrolling. This spec changes that behavior: the toolbar remains sticky, but the title/streak/avatar chrome uses the same threshold-triggered auto-hide model as the footer.

## User Experience

### At Rest

When the To-dos tab first appears or the list is scrolled to the top:

- The normal `PageHeader` content is visible:
  - `To-dos`
  - streak capsule
  - avatar/settings entry point
  - any contextual header child content, such as Focus Filter
- The view controls sit below the header:
  - Views menu
  - Kanban card fields control when applicable
  - Filter
  - Sort
- The list begins below the controls.

### Scrolling Down

As the user scrolls down:

- The `To-dos` title, streak capsule, avatar, and any header child content translate upward and fade slightly.
- The controls translate upward at a slower/smoother rate until they settle into the top header slot.
- Once the header content is fully collapsed, the controls remain sticky near the safe-area top.
- Global bottom navigation/action controls quickly animate out of view.
- The transition should feel scroll-aware, with a quick animated commit once intent is clear. Avoid a slow, mushy collapse that tracks every pixel forever.

Suggested motion:

- Header content collapse distance: measured `PageHeader` height, including child content.
- Header content opacity: `1 -> 0` over roughly the first 70 percent of the collapse distance.
- Header content translateY: `0 -> -collapseDistance`.
- Controls translateY: `0 -> -collapseDistance`, clamped so their final top aligns with the app shell safe-area top plus the existing canvas gutter.
- Bottom nav translateY: `0 -> navHeight + safeAreaBottom + spacing`, with opacity optionally easing to `0`.
- Quick Add dock translateY: `0 -> navReservedHeight`, so it remains visible but settles into the space vacated by the global nav.

Suggested trigger behavior:

- Hide chrome after downward scroll delta crosses a small threshold, e.g. `12-20px`.
- Reveal chrome after upward scroll delta crosses a small threshold, e.g. `8-16px`.
- Ignore tiny jitter and inertial bounce near the top.
- Once triggered, animate to the hidden or revealed state quickly but not abruptly, e.g. `240-280ms`.

Important distinction:

- Header title/streak/avatar and footer/global-nav visibility are both intent-triggered. Once scroll direction crosses the hide/reveal threshold, animate them to the next state together.
- Quick Add follows footer state for vertical position only, not visibility. It remains present while moving between its "above global nav" and "global nav hidden" anchors.

### Scrolling Up

As the user scrolls back toward the top:

- The sticky controls return to their below-header position.
- The `To-dos` title, streak capsule, avatar, and header child content fade and translate back in.
- The global bottom navigation/action controls reappear.
- The reveal should happen on upward scroll intent even if the user is still in the middle of a long list.
- The full header is restored by the time scroll offset reaches `0`.

### Pull to Top / Programmatic Scroll

Any programmatic scroll-to-top behavior should restore the full header. This includes tab reselect behavior if the app later wires To-dos tab reselect to list top.

## Chrome States

Use a small state model so the implementation does not become a pile of scroll booleans:

- `expanded`: scroll offset is at/near top. Header is visible, sticky controls sit below it, global nav is visible, Quick Add sits above global nav.
- `compact`: user has scrolled down. Header title/streak/avatar are hidden, sticky controls are pinned, global nav is hidden, Quick Add is visible and lowered into the freed global-nav space.
- `revealedMidList`: user scrolled up while still away from top. Global nav is visible again, Quick Add returns above it, sticky controls remain pinned, full header title region stays hidden until near top.
- `quickAddFocused`: Quick Add and keyboard/tooling are stable. Header collapse is frozen or `Done` is relocated; global nav should not change state due to incidental scroll/keyboard movement.
- `empty`: no meaningful scroll behavior. Header, global nav, and Quick Add remain visible.

State transitions:

- `expanded -> compact`: downward scroll offset/delta crosses the hide threshold and content can meaningfully scroll.
- `compact -> revealedMidList`: upward scroll delta crosses the reveal threshold before reaching top.
- `revealedMidList -> compact`: downward scroll delta crosses the hide threshold again.
- `revealedMidList -> expanded`: scroll offset returns near `0`.
- Any state -> `quickAddFocused`: Quick Add receives focus or a Quick Add tool drawer opens.
- `quickAddFocused -> prior state`: Quick Add submits, collapses, or all related drawers close.
- Any state -> `empty`: no to-dos, or content height is not scrollable enough to benefit from hidden chrome.

Short-list rule:

- Do not auto-hide chrome when the active content cannot scroll by at least one meaningful viewport chunk.
- Suggested threshold: content height must exceed viewport height by at least `HEADER_COLLAPSE_DISTANCE + spacing.xl`.
- Filtered zero-results still counts as scroll-eligible if underlying to-dos exist and the filter/sort toolbar is the recovery path.

## Pattern Name

Call this behavior **auto-hiding chrome** in code/docs. Related names:

- Hide-on-scroll header/footer
- Scroll-aware navigation
- Collapsible app chrome
- Revealing navigation bar

Use "auto-hiding chrome" for the spec because it covers both header and footer behavior without implying only the title bar is involved.

## Sticky Controls Contract

The sticky controls are the page's primary working toolbar. They must remain available whenever the user is inside a populated To-dos inventory view.

The toolbar should:

- Stay visible while scrolling through list layout.
- Stay visible while scrolling through Kanban layout unless Kanban expanded mode intentionally hides it.
- Continue to hide when current Kanban expanded behavior says the board should reclaim the space.
- Preserve existing Pro/free behavior for Views, Filters, and Sort.
- Preserve existing accessibility labels and test IDs where possible.
- Keep dropdown positioning correct after the toolbar moves into sticky mode.

The toolbar should not:

- Duplicate controls in two places.
- Cover the first list item without matching top content inset.
- Jump when filter/sort badges appear or disappear.
- Become inaccessible to screen readers while visually sticky.

## Header Content Contract

The collapsible header content includes:

- Page title
- Streak capsule
- Avatar/settings affordance
- `rightElement` such as the Quick Add `Done` button when active
- Header children such as the Focus Filter row

When collapsed:

- These elements should be visually hidden.
- They should be removed from accessibility traversal or marked hidden, so screen reader focus does not land on off-screen controls.
- The avatar/settings affordance does not need a sticky duplicate in v1. Settings remains reachable from the More/Profile area and will reappear when the user scrolls to the top.

Exception:

- If Quick Add is focused and the `Done` button is currently in the header, do not hide the only visible dismiss affordance. Either keep the header expanded while Quick Add is focused or move `Done` into the sticky toolbar area for that focused state. The lower-risk v1 choice is to freeze the header expanded while Quick Add is focused.

## Footer / Bottom Elements

The global bottom navigation/action controls should auto-hide on downward scroll and reappear on upward scroll.

Rationale:

- If the user is scrolling down in To-dos, they are probably scanning and hunting for the right item.
- The global nav is useful for changing places, but it is not useful for inspecting the current list.
- Hiding both top and bottom chrome makes the inventory feel calmer and increases visible list density.

The footer behavior should:

- Animate the global bottom bar/action controls off-screen on downward scroll intent.
- Reveal them on upward scroll intent, even mid-list.
- Reveal them when the scroll offset returns to `0`.
- Reveal them when the user opens an overlay, drawer, or menu that depends on navigation/action context.
- Preserve existing bottom-bar discoverability by making the reveal threshold low and predictable.

The footer behavior should not:

- Hide the global nav while a bottom tab transition is in progress.
- Hide the global nav while a screen reader is actively focused on it.
- Leave content permanently behind the home indicator or bottom safe area.
- Cause the Quick Add dock and global bottom bar to animate in conflicting directions.

`QuickAddDock` is not part of the auto-hidden global chrome:

- Keep Quick Add visible while global nav hides, including the collapsed state.
- Treat Quick Add as the local To-dos action surface, not global navigation.
- In `expanded` and `revealedMidList`, position Quick Add above the visible global nav using the existing reserved bottom-bar geometry.
- In `compact`, lower Quick Add into the space vacated by the hidden global nav while preserving safe-area clearance.
- Animate Quick Add's vertical position with the same timing as the global nav hide/reveal animation so the two surfaces feel coordinated.
- When Quick Add is focused, keep it visible and freeze footer chrome state until the user submits, dismisses, or the keyboard closes.
- When any Quick Add tool drawer is open, keep the dock/tooling stable.
- In empty state, keep Quick Add visible because it is the primary next action.

Quick Add geometry:

- Current expanded anchor: `bottom = KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX + spacing.sm`.
- Compact anchor: `bottom = max(insets.bottom + spacing.sm, spacing.md)`.
- Focused/keyboard anchor: continue using the existing keyboard-aware drawer behavior; do not apply the compact anchor while focused.
- Scroll content bottom inset should be based on the maximum visible obstruction for the current state:
  - expanded/revealed: Quick Add height + global nav reserved height + safe area.
  - compact: Quick Add height + compact bottom anchor + safe area.
  - focused: existing Quick Add reserved height + keyboard/tool drawer reservation.

## Empty State Behavior

When there are no to-dos:

- Keep the full header visible.
- Do not collapse the title/streak/avatar region.
- The empty state should remain vertically balanced.
- The Quick Add dock should remain visible as the primary next action.
- Keep global nav visible; there is no scrolling intent to optimize for.

When filters produce zero matching to-dos but there are underlying to-dos:

- The sticky toolbar behavior should still apply, because filter/sort controls are the escape hatch.
- The "No matching to-dos" empty state should account for the sticky toolbar inset.

## Kanban Behavior

Kanban should follow the same top-header behavior in collapsed board mode:

- Header collapses on scroll or horizontal/vertical board movement if the board emits scroll offset.
- Controls become sticky in the header slot.

Expanded Kanban remains special:

- Preserve the existing `isKanbanExpanded` behavior that hides the fixed toolbar and lets the board reclaim vertical space.
- In expanded mode, do not introduce a second sticky toolbar.
- If expanded Kanban still needs access to card fields/filter/sort later, define that as a separate Kanban-specific control treatment.

## Implementation Direction

### Preferred Structure

Introduce a screen-local auto-hiding header composition rather than making `PageHeader` globally collapsible for every screen.

Suggested approach:

1. Split the current `PageHeader` and toolbar composition in `ActivitiesScreen.tsx` into:
   - `collapsibleHeaderContent`
   - `stickyInventoryControls`
2. Measure header content height and toolbar height with `onLayout`.
3. Track list scroll offset with Reanimated shared values.
4. Render a single top overlay/container that owns both:
   - animated header content
   - animated/sticky controls
5. Emit scroll direction/intent to the navigation shell so global chrome can auto-hide.
6. Add top padding to list/Kanban content equal to the expanded header plus controls height, then let the overlay sit above the scrollable content.

This avoids duplicating list headers across `CanvasFlatListWithRef`, `DraggableList`, and `KanbanBoard`.

Global nav should be controlled by a shell-level state, not by directly importing `KwiltBottomBar` into `ActivitiesScreen.tsx`. Put ownership near the bottom bar/navigation shell, e.g. beside `RootNavigator` and `KwiltBottomBar`, via a `ChromeVisibilityProvider` or equivalent hook. `ActivitiesScreen.tsx` should only publish scroll intent and local Quick Add state.

A small context or navigation-shell hook can expose:

- `setChromeAutoHideEnabled(surface, enabled)`
- `setChromeVisibility(surface, 'shown' | 'hidden')`
- `notifyChromeScrollIntent(surface, direction, delta)`
- `setChromeInteractionLock(surface, locked)` for Quick Add focus, drawers, screen reader mode, and tab transitions
- `useChromeVisibility()` for `KwiltBottomBar` to read the current animated target state

The first implementation can be To-dos-only, but the API should not bake in To-dos terminology.

Implementation note:

- The global bar can keep rendering in place and animate `translateY`/opacity; avoid unmounting it on scroll because unmounting disrupts focus, layout measurement, and active tab indicator state.
- Existing `tabBarStyle: { display: 'none' }` behavior should remain the hard hide for routes that truly remove the tab bar. Auto-hide is a soft animated state and should not reuse `display: 'none'`.
- The bottom fade/scrim in `KwiltBottomBar` should animate with the bar or be disabled while hidden so it does not leave a ghost fade behind Quick Add.

### Scroll Sources

The implementation needs one shared scroll progress source for:

- `CanvasFlatListWithRef`
- `DraggableList`
- `KanbanBoard` if the board supports vertical scroll
- Navigation shell footer visibility
- Quick Add compact/expanded bottom anchor

If `DraggableList` cannot expose an animated scroll handler cleanly, v1 may keep manual-order mode using the expanded header until the list primitive can forward scroll events safely. That tradeoff should be explicit in the PR.

Layering requirements:

- Sticky controls must render above list/Kanban content.
- Dropdown menus opened from sticky controls must render above the sticky header overlay and must not be clipped by any animated wrapper.
- Quick Add must render above list content and below modal/drawer overlays.
- Global nav should render above ordinary content when visible, but below Quick Add if their hit regions would otherwise collide.
- Coachmarks, BottomDrawers, Dialogs, and global search should sit above all auto-hidden chrome surfaces.

### Suggested Constants

Use measured sizes first; constants only as fallbacks:

- `COLLAPSE_DISTANCE_FALLBACK = 88`
- `HEADER_FADE_END_RATIO = 0.7`
- `STICKY_TOP_GAP = spacing.xs`
- `SCROLL_EVENT_THROTTLE = 16`
- `CHROME_HIDE_DELTA = 16`
- `CHROME_REVEAL_DELTA = 12`
- `CHROME_ANIMATION_MS = 180`
- `SHORT_LIST_MIN_SCROLLABLE_OVERFLOW = HEADER_COLLAPSE_DISTANCE + spacing.xl`
- `QUICK_ADD_COMPACT_BOTTOM = max(insets.bottom + spacing.sm, spacing.md)`

Prefer existing `spacing`, `colors`, and typography tokens.

### Accessibility

- When header content opacity is effectively `0`, set:
  - `accessibilityElementsHidden`
  - `importantForAccessibility="no-hide-descendants"`
- Keep sticky controls in normal accessibility order.
- Ensure dropdown triggers remain reachable after position changes.
- If a screen reader is active, prefer keeping global nav visible unless a validated accessibility pass confirms the auto-hide behavior is navigable.
- Preserve existing `testID`s for E2E stability:
  - `e2e.activities.toolbar.views`
  - `e2e.activities.toolbar.filter`
  - `e2e.activities.toolbar.sort`
  - `nav.header.avatar`
  - `e2e.activities.quickAdd.done`

### Safe Areas and Insets

- `AppShell` owns top safe-area padding today.
- The sticky toolbar final position should respect that existing safe-area behavior.
- Avoid adding a second top safe-area inset inside the toolbar.
- On devices with Dynamic Island/notch, the sticky controls should never sit under the status bar.
- Bottom safe-area handling should be explicit per chrome state so hiding the global nav does not leave either an unusable empty gap or content trapped under the home indicator.

## Acceptance Criteria

### Product

- At top of To-dos, the screen still clearly reads as `To-dos`.
- Scrolling down removes the title/streak/avatar region and global bottom nav from view.
- View controls become sticky in the vacated header space.
- Scrolling up, even mid-list, restores the hidden chrome.
- Scrolling back to top restores the title/streak/avatar region and footer chrome.
- The transition feels smooth and intentional, not like content reflow.
- Quick Add remains visible and usable while the global nav is hidden.
- Hidden global nav gives the inventory more usable vertical space because Quick Add lowers into the vacated nav area.

### Functional

- Views menu opens correctly in both expanded and sticky toolbar positions.
- Filter drawer opens correctly in both positions.
- Sort drawer opens correctly in both positions.
- Applied filter/sort counts do not cause toolbar height jumps.
- Focus Filter header child content collapses with the header.
- Quick Add focused state either freezes the header expanded or provides a visible sticky `Done` affordance.
- Global bottom nav hides on downward scroll intent.
- Global bottom nav reveals on upward scroll intent before reaching top.
- Global bottom nav reveals before or during tab changes and overlay-driven navigation.
- Quick Add dock stays present throughout downward and upward scroll behavior.
- Quick Add dock lowers when global nav hides and returns above it when global nav reveals.
- Short lists do not auto-hide chrome.
- Empty state is not pushed off-center.
- Kanban expanded mode preserves its current toolbar-hiding behavior.

### Technical

- No duplicated toolbar instances.
- No new global `PageHeader` behavior unless another top-level screen explicitly opts in.
- No To-dos-specific imports inside the global navigation component.
- Global nav soft auto-hide is modeled separately from hard route-level `tabBarStyle: { display: 'none' }` hiding.
- List content has correct top inset so first rows are not hidden under the sticky controls.
- List content has correct bottom inset whether footer chrome is shown or hidden.
- The bottom fade/scrim does not remain visible after global nav hides.
- Sticky toolbar dropdowns are not clipped by animated header containers.
- Scroll-linked animation runs on the UI thread where possible.
- Existing toolbar test IDs remain stable.
- No user-facing copy changes outside this feature.

## Testing Plan

Manual QA:

- iPhone small viewport and large viewport.
- Light and dark appearance if supported.
- Populated list with many active to-dos.
- Empty To-dos state.
- Filtered zero-results state.
- Active filter and active sort badges.
- Free user with locked filter/sort controls.
- Pro user with custom views.
- Quick Add collapsed, focused, submitted, and dismissed.
- Keyboard open while Quick Add is focused.
- Focus Filter active.
- Kanban collapsed and expanded.
- Mid-list upward scroll reveal.
- Fast fling down followed by small upward correction.
- Tab change after footer has hidden.
- Short list that barely fits on screen.
- Quick Add position with global nav visible vs hidden.
- Sticky toolbar dropdown while header is compact.

Automated checks:

- Existing lint/typecheck command.
- E2E or Maestro smoke for:
  - opening To-dos
  - scrolling down
  - tapping sticky filter
  - tapping sticky views menu
  - verifying bottom nav hides on downward scroll
  - verifying bottom nav reveals on upward scroll
  - verifying Quick Add remains visible while bottom nav is hidden
  - returning to top

Visual QA:

- Capture top-of-list, mid-scroll sticky, and restored-top states.
- Confirm no overlap with status bar, bottom bar, Quick Add dock, or first list rows.
- Confirm hidden global-nav state gives visibly more list space while Quick Add remains anchored and intentional.
- Confirm text does not truncate awkwardly in the sticky controls on small screens.
- Confirm no ghost bottom fade remains when global nav is hidden.

## Rollout Notes

This is safe to ship behind no backend changes. If implementation risk grows, stage it:

1. List layout header collapse + sticky controls only.
2. Add global bottom nav soft auto-hide for To-dos list layout.
3. Add Quick Add compact/expanded bottom-anchor animation while keeping it visible.
4. Add filtered zero-results, short-list gating, and manual-order support.
5. Add Kanban collapsed support.

## Open Questions

- Should the sticky toolbar gain a subtle background/material treatment while pinned, or should it sit directly on the shell?
- Should the streak/avatar be duplicated as tiny icons in the sticky toolbar after collapse, or is hiding them acceptable for v1?
- Should upward scroll reveal the full header immediately, or should it first reveal footer chrome and only restore the full title region near top?
- Should tab reselect scroll To-dos to top and expand the header as a paired behavior?

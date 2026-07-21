# Option G Implementation Baseline

**Status:** Accepted Phase 0 interaction contract

**Date:** 2026-07-21

## Geometry and motion

- A familiar two-line hamburger exposes the menu.
- The underlay occupies 80% of the viewport width.
- The current white capability surface moves aside and remains visibly connected to its
  prior state.
- The revealed foreground uses the 44pt `deviceSheet` radius so its left corners echo the
  iPhone display curvature rather than reading as a generic card.
- Foreground content fades modestly; the hamburger remains legible.
- Use a short double shadow, not a distant directional shadow.
- Reduce Motion changes the transition to an immediate state change.
- There is no close `X`; selecting a destination or covering the menu closes it.

## Information hierarchy

- The Kwilt mark uses pine; the surrounding menu remains restrained and white.
- Group labels are light, compact, all caps, and visually secondary.
- Capability labels are the primary scan targets: 14px, reduced weight, compact rows.
- Capability rows carry icons; group/folder labels do not.
- Expandable families precede direct capabilities.
- Phase 1 registers Goals, To-dos, Plan, Arcs, and Chapters under `Goals & Plans`.
- The long-term order preserves grouped capability families, then direct capabilities,
  with Chats last.
- Avatar sits at lower left; the compact content-fit Chat action sits at lower right.

## Ownership and reuse

- Keep React Navigation as the single router and route registry. Present Option G through
  one owned `CapabilitySideSheet` and one ephemeral open/close state shared by nested headers.
- Derive menu rows and capability routing from the registry.
- Reuse `useAppStore.openGlobalSearch()` for Search.
- Reuse `Settings > SettingsHome` for the avatar.
- Reuse `PageHeader.moreMenu` for contextual actions/settings.
- Ship Option G as the single shell in its TestFlight candidate; rollback is by retained
  TestFlight build and immutable source tag, not a runtime shell flag.
- Do not reuse `nav_drawer_menu`, create a second root navigator, or persist a second
  mutable active-capability value. Derive the active capability from navigation state.

## Phase 1 evidence

Capture closed, opening, open, expanded-group, selected-capability, and Reduce Motion
states on the real To-dos screen. Simulator evidence can verify layout during development;
physical-iPhone evidence remains required for acceptance.

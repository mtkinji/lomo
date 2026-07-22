# Settings Navigation Contract

**Status:** Accepted Phase 0 contract

**Date:** 2026-07-21

## Entry behavior

- Global menu avatar or top-level page avatar → `Settings > SettingsHome`.
- Entering Settings globally always resets to `SettingsHome`; it must not reopen a stale
  nested screen.
- Back from Settings returns to the prior capability route when a valid route exists.
- If return state is missing or invalid, fall back to the relevant capability root rather
  than a dead or unreachable route.

## Current-surface behavior

- The title-adjacent ellipsis contains actions for the visible inventory or detail surface.
- A contextual settings item may navigate to a named Settings route, such as Plan calendars
  or Weekly Chapters.
- Contextual menus must not include account-wide settings merely because there is room.
- Object mutation actions remain with the object and do not move into global Settings.

## Capability contract

A capability settings contribution contains only stable identifiers and route metadata.
It does not import screen components or own a second navigation container.

```ts
type CapabilitySettingsDestination = {
  id: string;
  label: string;
  target: CapabilityRouteTarget;
  scope: 'capability' | 'object';
};
```

## Phase 1 compatibility

The current `SettingsStackParamList`, `SettingsHomeScreen`, avatar handlers, and
`PageHeader.moreMenu` are the implementation seams. Option G must reuse them. Existing
deep links for subscriptions and connected tools remain valid.

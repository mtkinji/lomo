# Learning Release: Kwilt Labs Explore

## Concept To Build

Kwilt Labs is a Settings-owned list of optional emerging capabilities; Explore is its first entry and starts off.

## Capability Delta

Today, the user cannot make Explore a deliberate app-level choice.

After this release, the user can enable or disable Explore from one switch and trust that the visible app and background behavior follow that choice.

Still intentionally not supported: deleting Explore data, changing tracking mode, or managing experimental variants from Labs.

## User Experience

Settings includes **Kwilt Labs** under Personalization. Its page explains that Labs may change or go away and shows one **Explore** switch with a concise location/discovery description. Enabling adds Explore to the capability menu. Disabling removes it and stops Explore runtime work without deleting history.

## Existing Product Relationship

Labs owns activation only. Explore continues to own its map, onboarding, tracking preferences, privacy, sync, history, and deletion controls.

## Buildable Slice

Must be real:

- persisted default-off catalog state;
- canonical Settings UI;
- menu, route, restore, runtime, and background-task enforcement;
- preserved Explore data on disable;
- test coverage for the gate and persistence contract.

Can be thin: one catalog entry and no remote administration.

Intentionally excluded: crash attribution, new analytics, permissions redesign, and another Lab capability.

## Release Channel

TestFlight build. This is a production-hidden learning boundary whose value depends on real process restarts and background-service behavior.

## Brand-Goodwill Guardrails

- Off means no Explore runtime work.
- Disabling never implies deletion.
- Labs copy is humble and non-promotional.
- Existing location permissions are not treated as Labs consent.

## Reversibility

The catalog can remove or hide Explore without migrating its domain store. Re-enabling remounts the existing capability against preserved state.

## Permanent Product Threshold

Explore leaves Labs only after crash-free, battery/thermal, background-location, comprehension, and repeat-use evidence justify default product ownership.

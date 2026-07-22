# Kwilt App System UI Contract

**Status:** Accepted Phase 0 contract

**Date:** 2026-07-21

Kwilt is one public app with shared shell behavior and capability-specific local character.

## Shared shell

- Public product name: **Kwilt**.
- Global navigation: Option G.
- Global settings: avatar → `SettingsHome`.
- Global search: one shared search surface.
- Agent: one first-class destination with contextual entry and exact return.
- Shared concerns such as auth, household identity, analytics, entitlements, notifications,
  persistence, deletion, and export have one owner.

## Capability surfaces

- Preserve the local workflow and useful navigation depth of each capability.
- Capability identity may appear through color, density, illustration, sound, and motion.
- Distinctive visual language does not create a separate product name, app shell, settings
  home, auth root, or release identity.
- Group labels help users scan; they are not destinations without a durable user job.

## Header ownership

- Hamburger: global capability navigation.
- Title: current capability or object.
- Title-adjacent ellipsis: current-surface actions and contextual settings.
- Avatar: global settings.
- Back: restores the capability-local route hierarchy.

## Evidence boundary

Automated tests prove contracts and regression fences. Simulator captures prove layout.
Only the installed release configuration on a physical device proves native motion,
permissions, launch behavior, memory, extensions, and cross-capability interaction quality.

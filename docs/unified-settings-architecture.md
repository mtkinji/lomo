# Unified Kwilt Settings Architecture

**Status:** Accepted Phase 0 contract

**Date:** 2026-07-21

Kwilt has one settings system. Capabilities contribute links or named configuration, but
they do not create parallel settings homes.

## Ownership levels

1. **Global settings** — shared identity, account, subscription, appearance, notifications,
   integrations, privacy, sharing, and platform-wide preferences. The global avatar entry
   always opens `Settings > SettingsHome`.
2. **Contextual settings** — actions and configuration relevant to the current capability
   surface. They open from the title-adjacent ellipsis and may deep-link into the global
   settings stack.
3. **Object settings** — configuration belonging to one concrete Goal, To-do, category,
   game, Chapter, or similar record. These remain in the object's local workflow.
4. **Session controls** — temporary controls for an active focus session, game, capture,
   or other bounded runtime. These do not become durable global preferences unless the
   setting truly applies across sessions.

## Rules

- The avatar is the single global settings entry.
- A title-adjacent ellipsis owns current-surface actions and contextual settings.
- A capability may register a settings destination only when it owns distinct durable
  configuration.
- A contextual link may route into global Settings without duplicating the underlying
  setting or state.
- Imported capabilities surrender standalone settings homes, auth roots, subscription
  controls, analytics configuration, notification roots, deletion, and export ownership.
- Hidden or incomplete settings remain hidden until they form a trustworthy value unit.
- Settings routes use the host React Navigation stack and remain deep-linkable where a
  durable external entry is useful.

See `docs/settings-product-inventory.md` for current ownership and
`docs/settings-navigation-contract.md` for navigation behavior.

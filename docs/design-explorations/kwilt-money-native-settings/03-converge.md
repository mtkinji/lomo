# Converge: Capability-Native Money With Shared Settings Grammar

## Decision

Use a capability-native port and make the Money-derived grouped settings grammar the single shared Kwilt settings presentation system.

## Capability delta

Today, the user cannot:

- open live Money inside Kwilt;
- move among Summary, Transactions, and Accounts without changing apps;
- manage Kwilt and Money choices through one coherent settings hierarchy;
- ask unified Chat about authoritative Money context and return exactly to it.

After the program, the user can do each of those things from one Kwilt binary and identity.

Still intentionally unsupported until its owning slice is proven:

- financial writes before authoritative reload/receipt coverage;
- Plaid before signed-device OAuth and archive evidence;
- widget or Screen Time state migration claims across app groups;
- standalone Money retirement before parity acceptance.

## Reductive decisions

- Retire the standalone Money settings home in the unified app.
- Retire Money's Expo Router root, auth provider, RevenueCat provider, Ask tab, duplicate Goals/Plan tabs, and More shell.
- Reuse `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsToggleRow`, and one divider contract.
- Replace Settings Home's ungrouped icon list with grouped cards; do not add descriptions to every row or a settings dashboard.
- Keep finance-only visual semantics inside Money; do not recolor all Kwilt settings as a finance surface.

## UI contract

Job: When Maya needs to understand or change how Kwilt behaves, she needs one calm, scannable settings hierarchy, so she can act without learning product architecture.

Primary action: open the relevant settings destination.

Must show: identity, visible global settings groups, capability-contributed destinations, account/subscription state, and role/dev-gated tools when authorized.

Reveal later: detailed controls, destructive account actions, Money connection/privacy/widget/app-control configuration.

Must not add: a second settings home, duplicate account controls, decorative per-row descriptions, or visible incomplete settings.

Reuse map: page/group/row/toggle/divider -> `src/ui/SettingsSurface.tsx`; identity -> `ProfileAvatar`; global navigation -> existing Settings stack; capability contribution -> capability registry/settings metadata.

Behavior sources: global/contextual/object/session ownership -> `docs/unified-settings-architecture.md`; Money local places and privacy -> Money integration brief and frozen manifest; visible Settings inventory -> `docs/settings-product-inventory.md`.

Unresolved decisions: none that change the first implementation slice.

Required states: signed in/out, free/Pro, role-gated admin, disabled/unavailable destination, long identity text, Money locked/unlocked/loading/error/empty/live.

Proof path: avatar -> Settings Home -> every visible destination; capability menu -> Money -> Summary/Transactions/Accounts -> detail -> back; contextual settings and Chat -> exact return; iPhone simulator first, signed physical device and TestFlight at native gates.

## Activation

Money appears as a normal capability in Option G after its release gate is enabled. Settings needs no coachmark; the visual convergence should make existing entry points easier to scan without announcing a redesign.

## Bet

We're betting that preserving Money's local workflow while removing its standalone shell will feel like one stronger Kwilt rather than a diluted finance app. If parity or comprehension falls, revisit the translation boundary—not the one-app decision—using side-by-side device evidence.

## Success signal

The same signed-in account can complete the accepted Money parity matrix inside Kwilt, Settings has one owner and one visual grammar, unopened Money performs zero capability work, and real-device users can navigate and understand both without encountering duplicated shell concepts.

# Diverge: Kwilt Money Capability Integration

Axis of variation: where application ownership is removed and how much of the standalone
Money implementation is preserved.

## Alternative A - Embed the standalone application

Copy Money's Expo Router tree, providers, shell, and native configuration into the Kwilt
repository, then launch it behind the Money menu item.

- Persona fit: superficially fast, but weak for Maya because navigation, settings, and auth remain visibly or structurally duplicated.
- Design challenge: preserves Money appearance but fails the one-app trust and performance requirement.
- System fit: poor; two routers and two global owner graphs.
- Best when: the products are expected to remain independent indefinitely.
- Fails when: restored navigation, auth, deep links, settings, account deletion, or lifecycle cross the boundary.
- Four-object/capture stance: Money remains separate and does not distort the Arc/Goal/Activity/Chapter model.
- Anti-pattern check: fail; it is a mini-app shell hidden inside Kwilt.

## Alternative B - Capability-native port

Freeze a committed Money source SHA, port its domain and UI by vertical slice, translate
Expo Router routes into one React Navigation capability navigator, and replace standalone
providers with host adapters. Keep Money's three local places and finance visual language.

- Persona fit: strong; Maya gets familiar Money behavior in one coherent Kwilt shell.
- Design challenge: directly answers it while preserving privacy and truthful financial state.
- System fit: strong; extends the capability registry and lifecycle contracts already on `main`.
- Best when: standalone Money will retire after parity, as currently intended.
- Fails when: porting becomes an excuse to redesign Money or import uncommitted source.
- Four-object/capture stance: Money is a sibling capability with its own financial objects; it does not force them into Goals or Activities.
- Anti-pattern check: pass; Summary must remain a narrative financial surface, not a KPI grid.

## Alternative C - Extract a shared Money package first

Move domain, data, screen composition, and navigation-neutral UI into a workspace package
consumed by both the standalone and unified applications until retirement.

- Persona fit: strong if behavior remains identical.
- Design challenge: preserves parity but delays the integrated experience.
- System fit: medium; clean headless boundaries, but two app wrappers and release lanes remain during extraction.
- Best when: standalone Money must continue shipping independently for months.
- Fails when: package APIs are designed around both routers and become a compatibility layer no one needs after retirement.
- Four-object/capture stance: clean capability boundary.
- Anti-pattern check: pass, but risks architecture work without user-visible learning.

## Alternative D - Rebuild Money directly in Kwilt

Use the standalone app only as a visual/data reference and implement new Kwilt-native Money
screens from the live schema.

- Persona fit: uncertain; a cleaner shell could come at the cost of lost Money behavior and trust details.
- Design challenge: meets one-app ownership but does not preserve the established workflow.
- System fit: medium; host-native, but duplicates mature logic and regression history.
- Best when: the existing implementation is disposable or fundamentally incompatible.
- Fails when: subtle transaction, plan, privacy, and Screen Time contracts are missed.
- Four-object/capture stance: Money remains a sibling capability.
- Anti-pattern check: high dashboard and redesign risk.

## Divergence conclusion

Alternative B is the only approach that matches the accepted modular-monolith direction,
the user's Money-first sequence, and the requirement to preserve Money's native product
truth. Alternative C is a tactical extraction option only for pure modules that genuinely
need dual-app validation during the transition; it should not become the program architecture.

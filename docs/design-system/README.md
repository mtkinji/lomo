# Kwilt Design System

Kwilt's design system is the foundation for product surfaces across the Kwilt family. It covers brand-family architecture, token propagation, and the rules that let Kwilt Goals, Kwilt Money, desktop, and future apps feel related without becoming visually identical.

## Foundations

- [UI constitution](ui-constitution.md): authority order, ShadCN-to-Kwilt translation rules, hierarchy, composition, and visual acceptance gates.
- [Pattern atlas](pattern-atlas.md): composition precedents, maturity, code references, and promotion requirements.
- [Storybook](storybook.md): the primary review surface for tokens, component candidates, variants, and promotion decisions.
- [Brand family architecture](brand-family-architecture.md): suite-level naming, app identity, color roles, icon rules, launch lockups, and cross-app UI principles.
- [Semantic color](semantic-color.md): the required meaning gate for every non-neutral color used in product UI.
- [Foundation propagation](foundation-propagation.md): how shared token and component changes reach consuming apps.
- [Component inventory](component-inventory.md): first picking list for canonical shared components.
- [Illustration guidance](illustration-guidance.md): Goals illustration roles, style rules, and promotion posture.
- [Drawer guidance](drawer-guidance.md): drawer taxonomy and extraction rules for Goals task drawers versus Money choice pickers.
- [Picker guidance](picker-guidance.md): closed trigger and open selection-surface rules for Goals and Money.

## Current Posture

ShadCN is Kwilt's upstream design-system reference and quality bar. Kwilt UI is the localized, source-owned implementation for React Native. Feature code composes Kwilt UI; it does not copy ShadCN web code, reproduce local primitives from raw React Native views, or treat an arbitrary existing component as canonical.

Read the [UI constitution](ui-constitution.md) before material UI work. It defines what is normative, what is localized, and what wins when sources disagree.

## ShadCN And Kwilt UI

ShadCN is more than loose inspiration. It is the intended model for component anatomy, composability, semantic variants, accessibility, state completeness, token roles, restrained composition, source ownership, and documentation quality.

Kwilt UI translates that model for the product and platform:

- ShadCN's web implementation details—Tailwind classes, Radix/Base UI primitives, hover behavior, default dark dashboard posture, and exact theme values—are not copied into React Native.
- Kwilt owns its color, typography, spacing, motion, haptics, navigation, touch behavior, safe areas, drawers, accessibility behavior, and domain semantics.
- Primitives designated Canonical by the inventory live in `src/ui/*` and use `@kwilt/tokens` through the app theme bridge. Directory location or barrel export does not grant status.
- Feature code may use raw React Native `View` only as tokenized layout glue. It must not recreate a known semantic surface or control.
- A local component is authoritative only within the maturity and scope recorded in the [component inventory](component-inventory.md). Existing code alone is not canonical.

Before promoting a component into the canonical native layer, check:

- Anatomy: named slots or clear composition points for labels, descriptions, icons, helper text, actions, and footers.
- States: default, pressed/focused, disabled, loading, selected, error, empty, and destructive states where applicable.
- Accessibility: role, label, hint, focus order, hit target, reduced-motion behavior, and screen-reader output.
- Theming: semantic colors, typography, radii, spacing, elevation, and motion sourced from tokens or app theme bridges.
- Documentation: Storybook examples that show the supported variants and expected usage boundaries.
- Composition: at least one approved pattern-atlas use that proves the primitive works in a coherent surface, not only in isolation.

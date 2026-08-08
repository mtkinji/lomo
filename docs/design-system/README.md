# Kwilt Design System

Kwilt's design system is the foundation for product surfaces across the Kwilt family. It covers brand-family architecture, token propagation, and the rules that let Kwilt Goals, Kwilt Money, desktop, and future apps feel related without becoming visually identical.

## Foundations

- [UI constitution](ui-constitution.md): authority order, ShadCN discipline, RNR-to-Kwilt translation, hierarchy, composition, and acceptance gates.
- [Pattern atlas](pattern-atlas.md): composition precedents, maturity, code references, and promotion evidence.
- [External UI references](references/README.md): time-bounded product evidence and preserve/translate/reject studies.
- [Storybook](storybook.md): the primary review surface for tokens, component candidates, variants, and promotion decisions.
- [Brand family architecture](brand-family-architecture.md): suite-level naming, app identity, color roles, icon rules, launch lockups, and cross-app UI principles.
- [Semantic color](semantic-color.md): the required meaning gate for every non-neutral color used in product UI.
- [Foundation propagation](foundation-propagation.md): how shared token and component changes reach consuming apps.
- [Component inventory](component-inventory.md): first picking list for canonical shared components.
- [Illustration guidance](illustration-guidance.md): Goals illustration roles, style rules, and promotion posture.
- [Drawer guidance](drawer-guidance.md): drawer taxonomy and extraction rules for Goals task drawers versus Money choice pickers.
- [Picker guidance](picker-guidance.md): closed trigger and open selection-surface rules for Goals and Money.

## Current posture

ShadCN is Kwilt's authoring and quality model. React Native Reusables is the preferred native upstream reference for generic component anatomy and composition. Kwilt UI is the localized, source-owned production implementation.

RNR does not imply NativeWind. Kwilt retains its existing `StyleSheet`, `src/theme`, and `@kwilt/tokens` architecture. Feature code composes `src/ui`; it does not import RNR source, behavior primitives, or recreate known controls from raw React Native views.

Read the [UI constitution](ui-constitution.md) before material UI work. The [component inventory](component-inventory.md) grants maturity; folder location and import availability do not.

Before promoting a component into the canonical native layer, check:

- Anatomy: named slots or clear composition points for labels, descriptions, icons, helper text, actions, and footers.
- States: default, pressed/focused, disabled, loading, selected, error, empty, and destructive states where applicable.
- Accessibility: role, label, hint, focus order, hit target, reduced-motion behavior, and screen-reader output.
- Theming: semantic colors, typography, radii, spacing, elevation, and motion sourced from tokens or app theme bridges.
- Documentation: Storybook examples that show the supported variants and expected usage boundaries.
- Composition: at least one approved pattern-atlas use that proves the primitive works in a coherent surface, not only in isolation.

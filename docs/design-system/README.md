# Kwilt Design System

Kwilt's design system is the foundation for product surfaces across the Kwilt family. It covers brand-family architecture, token propagation, and the rules that let Kwilt Goals, Kwilt Money, desktop, and future apps feel related without becoming visually identical.

## Foundations

- [Storybook](storybook.md): the primary review surface for tokens, component candidates, variants, and promotion decisions.
- [Brand family architecture](brand-family-architecture.md): suite-level naming, app identity, color roles, icon rules, launch lockups, and cross-app UI principles.
- [Foundation propagation](foundation-propagation.md): how shared token and component changes reach consuming apps.
- [Component inventory](component-inventory.md): first picking list for canonical shared components.
- [Illustration guidance](illustration-guidance.md): Goals illustration roles, style rules, and promotion posture.
- [Drawer guidance](drawer-guidance.md): drawer taxonomy and extraction rules for Goals task drawers versus Money choice pickers.
- [Picker guidance](picker-guidance.md): closed trigger and open selection-surface rules for Goals and Money.

## Current Posture

Kwilt Goals and Kwilt Money should converge on shared foundation tokens and native theme bridges first. The marketing site can opt into selected brand primitives later while keeping more expressive campaign and landing-page leeway.

## ShadCN Maturity For Existing Components

ShadCN is the model for component ownership and authoring discipline, not a mandate to restyle Kwilt immediately or replace working Kwilt components. Canonical React Native work should start from the existing Goals and Money components, then harden their APIs, states, accessibility, and token usage while preserving the current Kwilt look and feel unless a product/design pass explicitly changes the visual language.

Adopt these ShadCN-inspired traits in the native system:

- Source-owned primitives that live in the repo and can be adapted deliberately, starting from existing `src/ui/*` components.
- Small, composable APIs with semantic variants such as `primary`, `secondary`, `outline`, `ghost`, `destructive`, and app-specific additions only when they carry real meaning.
- Token-driven styling through `@kwilt/tokens` and app theme bridges, rather than one-off raw values in feature code.
- Accessible defaults, explicit disabled/error/loading states, and consistent keyboard/screen-reader behavior.
- Feature code importing from the canonical Kwilt component layer, not raw implementation details.

Before promoting a component into the canonical native layer, check:

- Anatomy: named slots or clear composition points for labels, descriptions, icons, helper text, actions, and footers.
- States: default, pressed/focused, disabled, loading, selected, error, empty, and destructive states where applicable.
- Accessibility: role, label, hint, focus order, hit target, reduced-motion behavior, and screen-reader output.
- Theming: semantic colors, typography, radii, spacing, elevation, and motion sourced from tokens or app theme bridges.
- Documentation: Storybook examples that show the supported variants and expected usage boundaries.

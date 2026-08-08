# Kwilt native UI architecture

The native app has one production UI layer: source-owned components in `src/ui`, styled with semantic values from `src/theme` and `@kwilt/tokens`.

## Layering

```text
ShadCN authoring and quality model
                ↓
React Native Reusables anatomy and composition reference
                ↓
RN Primitives behavior where it fits
                ↓
Kwilt-owned src/ui components + semantic tokens
                ↓
accepted Kwilt patterns
                ↓
feature and capability screens
```

React Native Reusables is an upstream source/reference, not an installed runtime component library. Kwilt does not currently use NativeWind, Uniwind, `global.css`, `tailwind.config.js`, or a `components/ui` mirror. Historical references to those files describe an implementation removed in December 2025 and are not current architecture.

## Import boundary

Feature and capability code imports shared controls from `src/ui`. It must not import:

- RNR copied examples or registry source;
- `@rn-primitives/*` behavior packages directly;
- a `components/ui/*` mirror;
- raw React Native controls to reconstruct a known shared primitive.

Raw `View`, `ScrollView`, `FlatList`, and `StyleSheet` remain appropriate for tokenized layout. Raw `Pressable`, `Text`, and `TextInput` require a real platform- or domain-specific reason when a Canonical Kwilt primitive fits.

Architecture lint enforces the upstream/behavior import boundary outside `src/ui`.

## Localizing RNR

For a weak or missing shared primitive:

1. Identify the gap in semantics, behavior, accessibility, state coverage, or composition.
2. Compare the current RNR component and the nearest accepted Kwilt surface.
3. Record the RNR URL, retrieval date, and release or commit.
4. Translate only the useful anatomy or behavior into `src/ui` using Kwilt tokens and existing public APIs.
5. Add compatibility wrappers when a broad caller migration would be risky.
6. Add tests, Storybook evidence, real-route screenshots, and the native proof required by the [UI constitution](design-system/ui-constitution.md).
7. Record maturity in the [component inventory](design-system/component-inventory.md).

Do not copy NativeWind classes, default RNR colors/radii, web hover mechanics, or a component merely because its screenshot looks better.

## Component contracts

- Dialog: root/controlled opener, overlay, content, header, title, optional description, body, footer, close; explicit backdrop, focus, escape/back, keyboard, and scrolling behavior.
- Alert dialog: separate consequential-confirmation semantics with safe cancel and explicit action.
- Dropdown menu: trigger, portal, content, optional grouping/label, items, selection states, separator, submenu only when needed, and destructive semantics.
- Form field: label, control, optional description, validation message, shared accessibility identity, and no placeholder-as-label.

## Source provenance

Initial convergence reference:

- Repository: `https://github.com/founded-labs/react-native-reusables`
- Documentation: `https://reactnativereusables.com/docs`
- Retrieved: 2026-08-07
- Reference commit: `119d0b101ff0d18408dc392120e12b5c78ae0c05`

# Kwilt UI Constitution

This is the binding design-system contract for Kwilt product UI. It localizes ShadCN's design-system discipline and React Native Reusables' native component anatomy without adopting their web styling mechanics.

## Authority

When sources disagree, use this order:

1. The user's current explicit decision and accepted product contract.
2. iOS, Android, and accessibility requirements.
3. This constitution, semantic tokens, Canonical Kwilt UI components, and Canonical pattern-atlas entries.
4. React Native Reusables (RNR) as the upstream native reference for generic anatomy, composition, variants, and state completeness.
5. ShadCN as the broader source-ownership and authoring-quality model.
6. Adjacent production surfaces, but only for behavior or patterns that remain approved.
7. Candidate and feature-local components within their documented scope.

An existing screen proves what shipped, not what is canonical. A stale guide, screenshot, mockup, or feature-local implementation cannot override this order.

## Reference Classes

References govern different axes and must not silently replace one another.

| Class | Role | Cannot do |
| --- | --- | --- |
| Current-project authority | Product contract, platform requirements, constitution, tokens, Canonical components and patterns. | Be displaced by visual resemblance or deadline pressure. |
| Upstream component system | RNR for generic native anatomy, states, composition APIs, and quality comparison. | Supply Kwilt branding, tokens, product meaning, or production imports. |
| Current-project precedent | An accepted Kwilt route or atlas entry for a documented job and scope. | Become Canonical without the recorded maturity decision. |
| Task-scoped external exemplar | A named product capture such as Airbnb used to study specific hierarchy or composition qualities. | Supply tokens, components, product behavior, canonicality, assets, or silently displace RNR and Kwilt authority. |

An external exemplar is selected per task and per repository. Record its source, date/version when known, exact qualities being studied, and a `Preserve / Translate / Reject` ledger. Another project's annotations or derived patterns do not travel with the original exemplar. Copying distinctive product expression, proprietary glyphs, photography, badges, or screenshot-measured pixels is not translation; rebuild the useful relationship with Kwilt-owned language, icons, components, and tokens.

## Translation Contract

RNR is the preferred upstream source and comparison point. Kwilt UI is the localized production implementation.

| Preserve upstream | Localize for Kwilt |
| --- | --- |
| Source ownership and small composable APIs | Source-owned components in `src/ui` |
| Compound anatomy and semantic names | Existing Kwilt public APIs and compatibility wrappers |
| Accessible behavior primitives | Native behavior proven on Kwilt's supported runtimes |
| Semantic variants and complete states | Kwilt brand, tokens, vocabulary, and capability meaning |
| Restrained hierarchy and composition | Mobile density, touch, haptics, safe areas, keyboard, and motion |
| Documented usage boundaries | Kwilt maturity inventory, atlas, Storybook, and architecture lint |

RNR does not imply NativeWind. Kwilt deliberately retains `StyleSheet`, `src/theme`, and `@kwilt/tokens`; selected upstream anatomy is translated into those systems. Feature code must not import RNR source or `@rn-primitives/*` directly. Behavior primitives belong behind `src/ui`.

For every component localized from RNR, record the upstream URL, retrieval date, and release or commit in the component or inventory. Refreshes are reviewed diffs, not blind overwrites.

## Canonicality

- **Canonical** is the default implementation authority for its documented scope.
- **Candidate** may be reused only inside its current scope when semantics and behavior fit.
- **Promote** is ready for deliberate hardening; it is not canonical.
- **Keep local** is domain-owned and must not be generalized silently.
- **Hybrid** means the shared contract is unresolved.

Only an explicit product/design-owner decision recorded in the inventory or atlas grants Canonical status. Importability, directory location, a barrel export, or repeated use does not.

Raw React Native views are tokenized layout glue. They may arrange content but must not recreate a Button, Card, Input, Dialog, AlertDialog, Menu, Sheet, Switch, picker, or another known semantic primitive.

## Information Hierarchy

Every material surface defines before implementation:

- the three-second read;
- one dominant primary action for the current decision;
- primary and secondary information;
- what is revealed later;
- the first, second, and third focal points;
- the nearest atlas or accepted production precedent and meaningful differences;
- any task-scoped external exemplar and its preserve/translate/reject decisions.

One primary action does not mean one green button per card. Contextual actions stay quiet and local. If every region looks important, hierarchy has failed.

## Composition

- Start with the canvas and content relationships. Add a Card only for a meaningful surface or interaction boundary.
- Use headings, whitespace, alignment, and typography before borders, badges, tinted fills, shadows, or decorative color.
- Helper copy may clarify consequence or unfamiliar vocabulary; it must not compensate for weak labels, grouping, or control choice.
- Prefer one density and spacing rhythm per region and a flat reading order over dashboard grids unless comparison is the job.
- Forms use label, control, optional description, and validation message as one field. Placeholder text is not a label.
- Dialog forms use title, optional concise description, body, and footer with one primary submit action and a quiet cancel/close path.
- Alert dialogs are reserved for consequential confirmation. Harmless reversible actions do not need them.
- Contextual menus hold low-frequency actions; destructive items are semantically and visually distinct without becoming primary.

## Visual Acceptance

A material UI change requires reviewable render evidence showing:

1. The real route in the current target runtime.
2. Realistic content at the smallest supported viewport and accessibility text size.
3. Relevant normal, loading, empty, disabled, error, permission, success, and persisted states.
4. Comparison with the selected RNR reference and nearest accepted Kwilt surface when one exists. If an external exemplar was selected, compare only the named qualities and show how the result remains recognizably Kwilt.
5. A fresh critic pass based on the render, not implementation rationale.

For overlays and forms, also verify portal/overlay bounds, safe areas, keyboard and scrolling, initial focus and restoration, Android back or escape, VoiceOver/TalkBack semantics, touch targets, reduced motion, and long localized content. Label Simulator/emulator, physical-device, signed-build, and assistive-technology proof separately.

Hierarchy, composition, system fit, interaction, and runtime proof are critical. Any failure requires a fix and rerender.

## Exceptions

Record the unmet need, why no Canonical option fits, the RNR and Kwilt precedents considered, smallest exception scope, authorizing owner/decision, and removal or promotion condition. An exception does not authorize raw theme values, direct behavior-primitive imports, or a second component system.

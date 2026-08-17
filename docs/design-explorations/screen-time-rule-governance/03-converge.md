# Converge: Grouped Rule Library

## Chosen direction

Choose **Direction A: Grouped Rule Library**, corrected to use one scoped **Add rule** action per collection.

## Why it wins

The current problem is comprehension, not navigation capacity. One page lets the person answer what Screen Time rules exist without switching modes, while **My rules** and **Household rules** make privacy and shared authority explicit. Scoped add actions reduce builder questions: personal creation begins with **For me** and Household creation begins with an authorized child.

## Qualitative comparison

| Direction | Job clarity | Privacy/authority | Whole-system visibility | System change | Main risk |
| --- | --- | --- | --- | --- | --- |
| Grouped Rule Library | Strong | Strong | Strong | Medium | Long list later |
| Scope Tabs | Medium | Strongest | Weak | Medium | Hidden rules |
| Person Shelves | Medium | Strong | Medium | High | Family dashboard |

## Capability delta

Today, the user cannot:

- know how many personal or Household rules exist;
- see budget-backed restrictions as individual rules;
- distinguish a Household setup destination from an existing rule;
- create a personal rule from a canonical rule builder;
- enter Household rule creation from the shared Screen Time overview.

After this concept ships, the user can:

- scan scoped counts and readable rule sentences;
- see personal Focus, meaningful-first, and Money rules together under **My rules**;
- see shared child rules or truthful child setup state under **Household rules**;
- use the relevant group-level **Add rule** action;
- create a supported personal rule through the constrained sentence builder;
- continue Household construction in the named child's authority-aware editor.

Still intentionally unsupported:

- arbitrary boolean expressions;
- mixing independently owned Focus and Money conditions into one rule;
- editing private personal rules from another adult's account;
- treating approval as proof that a child device applied a rule;
- creating a new Household backend agreement shape before the existing child-device path is dependable.

## Reductive design decisions

- Replace the global hero card with a compact authorization row.
- Replace large personal cards and repeated `On`/`Turn off`/`Edit apps` actions with scannable rule rows.
- Replace aggregate **Money app controls** with one row per active Money rule.
- Rename customer-facing **Family** labels on this surface to **Household**.
- Keep one direct enabled control and one disclosure path per rule.
- Use a group-level count and add action; do not add a global count or global add action.
- Do not ask users to name rules; the readable sentence is their identity.

## Activation path

Preserve the existing contextual offer, Apple approval, and Settings handoff. After setup, Settings becomes the canonical management surface. Existing contextual entry points may later deep-link into a scoped add flow, but this release does not rebuild them.

## System implications

- Add a pure cross-domain presentation projection for personal and Money rules.
- Preserve separate persistence: personal rules remain local/device-owned, Money policies remain Money-owned, and Household agreements remain authority/versioned child records.
- Project Household activation honestly even where the overview cannot yet fetch full child agreement detail.
- Allow personal rules to have stable instance identity without changing native per-selection enforcement semantics.

## Bet

We're betting that the dominant blocker is the false inventory: fixed modes and aggregate owner rows do not read as a governed rule system. If scoped counts, readable rows, and a real personal builder still do not create comprehension, the next move is a subject-aware full Household projection—not tabs or a more expressive automation grammar.

## Success signal

In a three-second read, Andrew can correctly state how many private rules and Household rule/setup entries exist, identify the Money-backed rule, and know which **Add rule** action creates a personal versus shared rule.

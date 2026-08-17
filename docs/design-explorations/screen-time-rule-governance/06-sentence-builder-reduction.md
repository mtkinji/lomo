# Sentence builder reduction

> Superseded for authoring by `07-structured-rule-builder-contract.md`. This file
> records the earlier prototype decision and the evidence that led to the next
> pass; the grouped inventory and dedicated-page findings remain useful history.

## What failed

The first builder was a full-height drawer with a custom eyebrow, duplicated
title, helper paragraph, sentence preview, always-visible condition form, and a
second preview card. It read as a conventional form wrapped around a sentence,
not as direct sentence editing.

## Corrected UI contract

Job: Create one understandable personal Screen Time rule without learning an
automation interface.

Authority chain: accepted Screen Time governance brief -> explicit user
correction -> Kwilt PageHeader, canonical PickerFieldTrigger/Input, and standard
BottomDrawerHeader -> Apple FamilyActivityPicker.

Three-second read: `Pause apps when…`

Primary action: Create rule.

Primary information: the editable app target and condition inside the sentence.

Reveal later: app/category inventory in Apple's picker; supported conditions in
a compact standard drawer.

Scan order: standard page title -> sentence -> create action.

Must not add: eyebrow, helper paragraph, separate condition section, rule
preview card, custom close/header treatment, or raw boolean logic.

Required states: empty sentence, apps chosen, condition chosen, complete,
picker cancelled, duplicate prevented.

Proof path: Settings > Screen Time > My rules > Add rule on iPhone 17 Pro
Simulator; signed physical device remains required for native authorization and
enforcement proof.

## Direction considered

1. Keep the drawer and clean up typography: rejected because containment still
   implies a temporary form and leaves the sentence competing with drawer chrome.
2. Dedicated page with inline sentence choices: selected because it gives the
   sentence enough room and makes both choices direct.
3. Multi-step wizard: rejected because two bounded choices do not justify steps.

The bet is that structural duplication, not missing explanation, caused the
complexity. If the sentence still feels heavy, the next reduction is typographic
wrapping and choice styling, not additional instructional copy.

## Affordance refinement

A household hallway test showed that the underlined sentence still read as
display copy rather than a form. The selected direction keeps the sentence but
makes only its replaceable values look like controls:

> Pause **[Apps v]** when **[Condition v]**.

`Pause` and `when` remain secondary-weight grammar. The complete empty sentence
stays on one line at iPhone width. Each value uses Kwilt's canonical compact
picker-field trigger: a 12-point input radius, neutral border, disclosure
chevron, 44-point target, and standard field typography. Selected values use
concise receipts such as `Instagram + 2` and `a step is waiting`. Underlines and
fully rounded capsules are removed. The editor appears inline at the end of My
rules, so saved rules stay visible and no second page or competing header is
introduced.

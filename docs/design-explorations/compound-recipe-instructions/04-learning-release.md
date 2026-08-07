# Learning Release: Compound Recipe Instructions

## Concept To Build

One structured instruction sequence reads as grouped phases on Recipe Home and as atomic, contextual actions in Cook Mode.

## User Experience

On Recipe Home, each numbered phase holds one or more short action lines. In Cook Mode, the current action dominates while a compact label states its phase and, when needed, its action position within that phase.

## Buildable Slice

Must be real:

- backward-compatible phase/cue contracts and parsing;
- stable cue compilation for all 500 starter recipes;
- one shared normalization path;
- Recipe Home grouped rendering;
- Cook Mode cue flattening, progress, ingredient/timer/media derivation, voice position, and cached-session reconciliation;
- component/domain tests and iPhone Simulator proof.

Intentionally excluded: backend cue persistence, independent cue editing, semantic phase-title generation, and analytics containing recipe text.

## Release Channel

Local build for Andrew-only visual and cooking-flow evaluation. The shape is reversible because legacy recipes remain valid and the UI adds no persistent user setting.


# Kwilt Money Documentation Import Manifest

**Imported:** 2026-07-24  
**Source repository:** `/Users/andrewwatanabe/Documents/Kwilt Budget`  
**Frozen source:** `df383c3ac1538dff0a83b43a21ff3e45c024298b`

## Contract

Money integration includes its product reasoning, not only its runtime code.
The parent Kwilt repository owns canonical persona, JTBD, job-flow, feature-brief,
and capability-manifest links. The frozen source remains available verbatim for
provenance and historical evidence.

## Imported Inventory

| Source class | Count | Canonical disposition |
| --- | ---: | --- |
| Feature briefs | 26 | Promoted to `docs/feature-briefs/`, normalized to the parent audience hero, and linked by `src/capabilities/money/FEATURE.md`. |
| Feature-brief authoring guide | 1 | Preserved in `docs/capabilities/money/frozen-source/`; Kwilt's canonical authoring contract remains `docs/feature-briefs/_AUTHORING.md`. |
| Design-exploration files | 153 | Promoted under their original `docs/design-explorations/<topic>/` paths. |
| Concepts | 3 | Promoted to `docs/concepts/`. |
| Design-reference files | 6 | Promoted to `docs/design-references/`. |
| Persona/JTBD/job-flow files | 4 | Reconciled into the parent Maya persona, promoted Money JTBD, and refreshed Money job flow. Originals remain frozen. |
| Job-delivery system, plans, and reviews | 23 | Preserved in `docs/capabilities/money/frozen-source/`; current delivery truth is the canonical Money job flow until the old route map is translated. |
| Superpowers implementation plans | 6 | Promoted to `docs/superpowers/plans/` for linked design history and preserved unchanged in frozen source. |
| Security/Plaid files | 4 | Preserved in frozen source; they are not promoted as global Kwilt policy without a separate policy review. |
| Development notes | 2 | Preserved in frozen source as standalone implementation history. |
| Root workflow and voice guides | 2 | Promoted to `docs/basic-workflow.md` and `docs/copy-voice.md`. |

The complete frozen set contains 230 files after excluding `.DS_Store` and
`.gitkeep` metadata.

## Normalization Applied To Canonical Briefs

- `hero_jtbd` is the audience hero
  `jtbd-move-the-few-things-that-matter`; topical jobs remain in `serves:`.
- The provisional Money job now resolves canonically as
  `jtbd-review-budget-reality-before-spending`.
- `feature-ios-budget-widgets` is normalized to `brief-ios-budget-widgets`.
- Standalone-only statuses are mapped to Kwilt's `draft` or `accepted` states;
  none is called `shipped` without current production evidence.
- `Blaire` remains participant context in the source artifact but is not added as
  a representative parent persona; the canonical brief uses Maya.
- Every promoted brief records `source_repo` and the immutable `source_sha`.

## Deliberate Historical Boundary

The frozen job-delivery map and reviews refer to standalone Expo Router paths and
old delivery scores. They are retained so product learning is not lost, but they
must not be executed or quoted as current native-Kwilt proof until translated to
`src/capabilities/money/` and refreshed against the canonical job flow.

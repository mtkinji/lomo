# From UI inspiration to an applied design system

Send an image, recording, link, or local file with a sentence such as “I like how the background becomes unreadable.” That is enough to start. An optional target (“for our task drawers”) makes scope clearer. Use `$operating-design-system` to capture references, develop rules, audit surfaces, or apply an accepted rule.

## One system, several levels

The [constitution](ui-constitution.md) sets authority, the [component inventory](component-inventory.md) owns component maturity, and the [pattern atlas](pattern-atlas.md) owns composition maturity. References provide evidence. They do not create another source of design authority.

| Level | What must be specified | Typical evidence |
| --- | --- | --- |
| Foundations | Semantic typography, color, spacing, radii, elevation, material, motion | Token source and supported states |
| Components | Anatomy, variants, behavior, accessibility, use/exclusions | Owned implementation and stories |
| Groups | Label/control/help relationships, row alignment, section rhythm, action grouping | Composition with realistic content |
| Pages | Shell, scan order, hierarchy, content density, navigation, scroll and fixed regions | Actual route at relevant sizes and states |
| Flows | Transitions, continuity, disclosure, completion and recovery | Sequence or recording, not isolated screenshots |

Comprehensive means coverage at all five levels and documented gaps. It does not mean declaring every existing component canonical.

## Capture

1. Copy the supplied artifact into `references/<product>/<subject>-<date>/`; do not leave the sole copy in temporary attachments. Preserve the original separately from any annotation.
2. Write `source.md`: stable reference ID; source/product/platform; received date separately from unknown capture date/version; local asset or exact source URL; selected quality in the user's words; level/tags; observed facts; unknowns; Preserve / Translate / Reject; candidate Kwilt mapping; refresh condition.
3. Add the record to [the catalog](references/README.md). Check existing records to avoid duplicate studies. Link additional captures rather than overwriting provenance.
4. Report what was captured and what, if anything, was accepted. “I like this quality” accepts a preference; it does not establish every detail or every application. An explicit instruction to apply it authorizes work in that scope without another generic approval question.

## Guided selection → trial → adoption

Between capture and rule authoring, help the owner decide what to take from the reference. Do not ask for blanket approval of a screenshot or stop at an abstract preference. Capture-only requests do not require this conversation; offer it when useful without starting implementation.

Present a small set of independent qualities and recommend where each belongs. Work through the unresolved decisions one focused question at a time, retaining earlier answers. Separate four layers:

| Layer | Decision |
| --- | --- |
| Journey and user state | First launch, selected-capability setup, first result, or ongoing/returning use? |
| Screen type and job | Establish a promise, invite access, explain evidence, adjust a proposal, or commit? |
| Composition | What relationships among copy, imagery, evidence, controls and action make the screen work? |
| Transferable detail | Could a spacing, alignment or motion relationship serve other contexts under a separate rule? |

For each selected quality, record a compact trial brief: source ID; keep/adapt/try/ignore decision; journey/user state; screen job; inclusion and exclusion conditions; existing authority and proposed change; representative trial; remaining question. These are decision fields in the existing study or candidate contract, not a new parallel design system.

Preference capture is an intermediate checkpoint. Once selections are made, present the proposed scoped pattern and next concrete trial—not just a saved summary. In a screen-by-screen workshop, stay with that screen through the authorized trial, refinement and explicit adoption decision; do not offer the next screen solely because preferences were recorded. The owner can reject or explicitly defer an item, or choose a capture-only/batch pass. Record deferred work as pending; do not force implementation or promotion to let the walkthrough proceed. Every handoff should identify the actual stage and remaining step, without conflating selected direction, canonical adoption and runtime proof.

Example: a plainspoken benefit-led headline with purposeful imagery may fit a capability introduction before setup. It does not imply that every analysis page must contain only one sentence. Its shared gutter or action placement may be reusable elsewhere, but that broader scope is a separate decision governed by existing typography, spacing and dock contracts. Do not copy screenshot pixels or silently replace a canonical owner.

After the owner chooses what to try, produce the smallest useful mock/recording using actual product behavior. Show the selected context and a contrasting case where the treatment does not apply. Review layout plus relevant motion, long text, accessibility and state behavior. Ask what to refine, retain or drop; a trial is not adoption.

When the trial is satisfactory, resolve explicitly: should this become the default for the named scope, remain a local exception, stay Candidate or be rejected? Do not re-ask if the owner already made that exact decision. Record the date, scope, exclusions, evidence and any superseded rule in the inventory/atlas. Canonical promotion still requires its existing evidence contract; accepted direction, local implementation, runtime acceptance and release remain distinct.

The result should be a pattern family with selection conditions, not a blanket external-product style. An onboarding-only narrative rule and an independently reusable spacing rule can originate from the same screenshot without sharing scope.

## Specify a rule

Use the existing inventory/atlas maturity vocabulary. Keep proposal status, implementation status and runtime proof separate. Record explicit decisions with date and scope, including superseded guidance.

Each rule needs a job and selection conditions; anatomy; semantic component/token owners; grouping, alignment and spacing relationships; states; accessibility and responsive behavior; allowed variants; **Do** examples; **Don't** counterexamples and when not to use it; source references; code mapping; rendered evidence; open decisions. Use existing atlas entry fields for composition rules. Reference authoritative guidance rather than duplicating token values in multiple places.

Spacing is a relationship: who owns the gutter, how label-to-control compares with group-to-group spacing, how fixed regions reserve clearance, and how rhythm changes with content. Pick actual tokens from code; never measure foreign screenshots into Kwilt constants.

For a new product behavior use the product-framing workflow. For translation within an accepted UI job use the existing UI skills. A visual preference must not silently rewrite persistence, navigation, selection, or dismissal behavior.

## Audit

Start with a bounded scope or build an app-wide route/component inventory for an app-wide request. Record branch, HEAD, dirty state, date, searched roots, search commands, examined files, routes/states and exclusions. Re-read current source: imports alone do not establish use or conformance.

Search both shared-component consumers and raw/local implementations that should use the shared component. Inspect wrappers and navigation reachability. For each surface identify its job, applicable canonical component **and** composition, observed mismatch, exact code location, appropriate replacement, exception rationale, priority, and verification needed.

Use finding states: `conforms`, `violation`, `candidate opportunity`, `documented exception`, `unreviewed`, `blocked`. Missing approved guidance is a design-system gap, not an implementation violation. An intentional plain/nonmodal variant is not drift simply because it looks different.

Publish an actionable ledger in `audits/`. Track inventory total, inspected total, runtime-reviewed total and remaining scope separately. Never label a sample or an import search an app-wide audit. “Source conforms” and “visually accepted” are different evidence levels.

## Apply and verify

For an authorized apply request, fix the shared owner first where semantics match, then migrate the relevant callers. Do not force incompatible jobs through one component. Prefer existing variants; introduce a new variant only for a demonstrated need. Preserve behavior and unrelated checkout changes.

Use the repository's focused tests and completion/integration gates. Collect before/after evidence on actual routes, with viewport, content state, platform, build/checkout provenance and applicable keyboard/accessibility cases. Code checks cannot close a visual finding. Update the audit row with changed files, evidence, remaining gaps and disposition; update inventory/atlas only when its maturity requirements are met.

## Ongoing use

- “Save this as inspiration; I like the grouped spacing.” → capture and map; no app rewrite implied.
- “Make this our rule for secondary settings pages.” → record that decision and scope, then prepare the applicable contract and proof.
- “Audit Money against our design system.” → route inventory plus findings, including composition and exceptions.
- “Apply the accepted fixes from this audit.” → perform the scoped changes, verify, and close only proven findings.

Start with [coverage and gaps](coverage.md) and the [Origin drawer reference](references/origin-mobile/drawer-background-2026-09/source.md).

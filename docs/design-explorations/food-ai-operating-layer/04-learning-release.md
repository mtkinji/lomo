# Learning Release: Import to Next Shop

## Experience

1. Photograph one or more pages, share a supported URL, paste text, or dictate
   a recipe.
2. Kwilt creates a `RecipeImportDraft`, shows the clean recipe beside the source
   evidence, and focuses review on uncertain or contradictory fields.
3. The user corrects anything, confirms source and credit, and saves an
   immutable private Recipe version.
4. The clean cooking view works without the source site or import artifact.
5. The user says or taps **Plan the next meals**. AI proposes a small set drawn
   from saved Recipes and current authorized context and explains each choice.
6. The organizer edits and finalizes the plan.
7. Deterministic code compiles ingredients. AI calls attention to ambiguous
   units and likely duplicates; the user reviews **Already have**.
8. Kwilt produces a plain share/export and, where feasibility is proven, a
   reviewed retailer handoff.

## Polished-release bar

Photo and URL import are base criteria, not post-MVP enhancements. The first
release is not acceptable unless it handles:

- multi-page and rotated images;
- common handwriting and print;
- two-column layouts, headings, marginal notes, fractions, ranges, and
  abbreviations;
- visible source crops and field confidence;
- correction without retyping the whole recipe;
- retained provenance, credits, and original ingredient lines;
- save retry without duplication;
- clear recovery from unreadable or incomplete evidence;
- accessible clean cooking view and offline read access; and
- strict separation between private import rights and public publishing rights.

## Intentionally later

- public catalog publication and discovery;
- live recipe collaboration beyond proven copy/share needs;
- automated family invitation;
- retailer product auto-selection;
- coupon activation without authorized acknowledgement;
- checkout, payment, or delivery-slot selection.

The object and operation contracts for these later states are still locked
before release one so early data does not need unsafe ownership or attribution
migrations.

## Evaluation corpus

Use two corpora:

- private, user-owned household artifacts stored outside Git for true dogfood;
- synthetic, public-domain, or expressly releasable fixtures in the repository
  for deterministic tests.

The corpus includes glare, shadows, cursive, stains, crossed-out quantities,
two columns, rotations, multi-page recipes, missing headings, fractional units,
family abbreviations, embedded prompt-injection text, and incomplete sources.

Measure field transcription accuracy, invented-content rate, provenance
retention, correction burden, time to clean save, save retry behavior, plan
proposal acceptance/correction, and grocery compilation corrections. Invented
recipe facts, unsupported savings claims, and authority escalation have a zero
tolerance threshold.

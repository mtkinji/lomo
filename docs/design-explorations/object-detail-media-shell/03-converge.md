# Converge: Object Detail Media Shell

## Qualitative comparison

| Alternative | Maya / job fit | Cross-object consistency | System fit | Migration risk | Long-term drift risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Shared Media-To-Sheet Shell | Strong | Strongest | Strong if narrowly bounded | Medium | Lowest | Choose, with staged adoption |
| B. Shared Motion Hook And Geometry Tokens | Strong for Meals | Medium | Strongest near-term | Low | Medium-high | Preserve as internal implementation support, not the public abstraction |
| C. Meal-First Golden Path, Then Extract | Strongest immediate Meals learning | Weak until extraction | Good temporarily | Low first, high later | Highest if follow-up slips | Reject as the architectural endpoint |

## Chosen direction

Choose **Alternative A: Shared Media-To-Sheet Shell**, adopted in stages.

Recipe Home is the first consumer because it exercises the richest state
matrix: no photo, one photo, many photos, catalog artwork, editable personal
media, attribution, Reviews, recommendations, long recipe content, persistent
actions, Dynamic Type, and Reduce Motion. After Recipe Home is accepted, Arc,
Goal, and To-do migrate one at a time within the same initiative. Their content,
header, actions, editing behavior, scroll-dependent features, and appropriate
hero scale remain domain-owned.

Alternative B may exist as an internal hook used by the shell, but screens do
not consume a motion hook as the only standard. The shared contract must own
the visible hero-to-sheet structure as well as its animation math.

## Capability delta

### Today, the user cannot

- rely on one consistent hero-to-sheet behavior across cover-bearing object
  details;
- view multiple Recipe photos from Recipe Home even though the Recipe model can
  hold them;
- encounter a photo-less Meal that feels as intentional as a photographed one
  while still discovering that photos can be added;
- scan Recipe effort as calm full-width icon rows;
- read one relationship-prioritized Reviews stream on Recipe Home;
- reach contextual, explained alternative Meals at the end of the page.

### After this concept ships, the user can

- recognize the same Kwilt media-to-content transition across Arc, Goal,
  To-do, and Meal without learning a new header or page grammar;
- swipe through multiple Meal photos, open the full gallery, and deliberately
  choose a cover where they have edit authority;
- use a complete artwork fallback indefinitely or add a Meal photo when the
  moment is natural;
- understand total, prep, cook, wait, and yield from full-width icon rows with
  unavailable facts omitted;
- read one Reviews stream ordered by their own review, eligible visible reviews
  from people they know, then other useful reviews;
- continue browsing through alternatives explained relative to the open Meal
  and return without losing context.

### Still intentionally not supported

- changing the established object-detail header or its action semantics;
- requiring a cover photo or making photo completion a setup task;
- automatically publishing private Cook notes or household learning as a
  Review;
- exposing a relationship, household membership, or private content through
  Review ordering;
- engagement-ranked recommendations, a social feed, replies, review likes, or
  follower-driven content distribution;
- one universal component that owns every object title, body section, editor,
  action, or navigation rule.

## Shared component boundary

`ObjectDetailMediaShell` owns:

- the media viewport and clipping;
- scroll-linked parallax and fade, with a Reduce Motion path;
- measurement of the content-sheet threshold relative to the fixed header;
- the sheet overlap, top radii, background, border, and overflow behavior;
- media attribution placement above the sheet overlap;
- safe content padding above persistent bottom controls;
- controlled geometry variants and a shared state/test matrix;
- composition slots for hero media, sheet content, and screen-specific scroll
  behavior.

The shell accepts or forwards screen-owned scroll requirements rather than
silently replacing them. It must allow keyboard-aware scrolling, coachmark
scroll locks, scroll lifecycle callbacks, refs, and other current handlers to
compose with the shared transition.

The shell does **not** own:

- `ObjectPageHeader`, `HeaderActionPill`, or header layout;
- object type, title, description, editing, breadcrumbs, or navigation;
- `ActionDock` contents or action meaning;
- Recipe facts, Ingredients, Instructions, Reviews, or recommendations;
- Arc, Goal, or To-do domain sections;
- media selection/upload permissions, storage, publication, or rights policy.

## Geometry decisions

Standardize behavior, not one universal height.

- `immersive`: Arc and image-forward Meal details; large visual field and
  rounded sheet overlap.
- `standard`: Goal and ordinary Meal details where content should arrive
  sooner.
- `compact`: To-do details; smaller art, the same motion semantics, and a
  restrained overlap.

Exact values remain design tokens proven in Simulator rather than copied from
the current drifted implementations. Every variant shares the same threshold
definition: the hero completes its fade as the sheet reaches the established
header boundary. Rounded sheet treatment is consistent for every variant that
uses the media-to-sheet pattern; a screen that should not visually overlap does
not use this shell.

## Recipe Home decisions

### Media and photo invitation

- One photo: full-bleed cover with no `1 / 1` badge.
- Multiple photos: selected cover first, horizontal paging, quiet `n / total`
  indicator, and tap-through gallery.
- Catalog artwork: same visual treatment as a photo, with rights and
  attribution retained.
- No photo: a composed, appetizing, non-literal artwork state fills the same
  viewport and receives the same transition. It does not say "missing photo,"
  display an empty icon, or reduce the hero.
- Editable personal/family Recipe: a quiet **Add a photo** action appears with
  the Recipe identity/actions, not as an error inside the artwork. Completing a
  Cook session may offer **Keep a photo from tonight** once as a secondary,
  dismissible action.
- Adding or choosing a cover is reversible and never deletes the other photos.

### Facts

Use the selected full-width list under **What this recipe takes**.

- One row per available fact.
- Leading semantic line icon.
- Human label and value with strong alignment, not a card of equal KPI cells.
- Candidate rows: Total time, Prep, Cook, Waiting, Makes.
- Omit unknown values; never render a row of dashes.
- Serving scaling remains a separate interactive row after the facts.

### Reviews

Use one section titled **Reviews**.

- The server applies visibility, blocking, moderation, and account policy
  before relationship-aware ordering.
- Order tiers: the viewer's own Review; eligible visible Reviews from active
  Friends/otherwise authorized known people; other eligible Reviews.
- Household membership or following alone never grants Review visibility.
- The projection may return a coarse ordering tier but does not expose private
  relationship type to unrelated readers or require the client to join broad
  relationship tables.
- Within a tier, use bounded usefulness signals such as a verified Cook receipt
  and recency; do not use likes, replies, follower count, or engagement velocity.
- Recipe Home shows a bounded horizontal preview and **Show all reviews**.
- A restrained **Cooked in Kwilt** cue means only that a Cook receipt exists.
- The person's private prior-Cook note remains private learning. Kwilt may
  prefill nothing and may invite an explicit Review after Cook Complete; the
  person writes and submits it deliberately.

### Recommendations

End with **More Meals you might like** only when at least one eligible
alternative exists.

- Exclude the open Meal, hidden Meals, unavailable publications, and exact
  duplicates or personal editions of the same canonical Recipe.
- Prefer deterministic contextual reasons available now: another Meal in the
  same category or cuisine, a quicker alternative, similar primary
  ingredients, or a reviewed editorial alternative.
- Show one reason per card in plain language: **Quicker tonight**, **Another
  French dinner**, **Uses similar ingredients**, or **Kwilt pick**.
- Do not rank by stars, Review count, comment activity, or generic popularity in
  the first release.
- Opening an alternative preserves the prior Recipe and scroll context so Back
  returns to the recommendation rail.
- Recommendations never add, replace, or finalize a Meal Plan item without an
  explicit action on the selected Meal.

## Reductive design decisions

- Enhance the existing detail screens; do not add a new detail route.
- Reuse `RecipeArtworkGallery`, Recipe media assets, existing header controls,
  and `ActionDock` rather than creating parallel concepts.
- Replace the Recipe fact capsule and the body-level **More recipe actions**.
- Rename **Method** to **Instructions**.
- Keep private prior-Cook learning distinct from submitted Reviews without
  introducing visible "lanes" inside Reviews.
- Refuse a gallery tab, photo-completion badge, Reviews feed, helpful-vote
  system, recommendation carousel settings, or new onboarding.
- Reviews and recommendations live after the Recipe itself; they support the
  decision rather than becoming the dominant page content.

## Activation path

- Shared shell: learned implicitly through consistency; no education.
- Photo addition: discovered through the quiet Recipe action or contextually
  after a Cook. Never prompt merely because a page was opened without a photo.
- Multiple photos: direct horizontal swipe plus position indicator.
- Reviews: encountered naturally below Recipe content. The own-review action is
  available there and may be offered after Cook Complete.
- Recommendations: encountered when the person reaches the end without taking
  a primary action; each card explains why it is present.
- Natural adoption: people swipe multiple photos, add a real Meal photo after
  cooking, read or submit Reviews, or open an explained alternative without
  needing a tutorial.

## System implications

- The component extraction should be a shared UI change with per-screen
  migration tests and Simulator evidence; it does not change object authority.
- Multi-photo ordering needs an explicit cover/position authority. The current
  media array supports multiplicity but not a durable user-controlled cover
  role in the mobile contract; the global catalog publication-media join
  already models role and position and should inform the private Recipe shape.
- Relationship-prioritized Reviews should be projected server-side after
  visibility checks, using the existing safe Friendship/relationship boundary
  rather than exposing connection graphs to Recipe Home.
- Reviews depend on the independently gated global-catalog participation work.
  The visual shell and Recipe layout must remain complete when Reviews are
  unavailable or gated off.
- Contextual recommendations require a pure, testable selector distinct from
  the current general discovery recommendation builder.

## Accepted trade-offs

- A staged migration temporarily leaves old and new shell consumers in the
  tree, but each migrated screen moves onto the final abstraction rather than a
  temporary local copy.
- Geometry remains variant-driven rather than forcing every object to use the
  same hero height.
- Reviews may remain gated while the shared shell, facts, photos, and
  recommendations are evaluated.
- The first recommendation model is intentionally deterministic and modest.

## Rejected trade-offs

- No header redesign as part of consistency work.
- No motion-hook-only standard that permits structural drift to continue.
- No Meal-only bespoke endpoint with an unspecified future extraction.
- No blank or reduced hero for a Meal without a photo.
- No separate Reviews lanes for household and public sources.
- No automatic conversion of private learning into public participation.
- No star- or engagement-ranked recommendation rail.

## Stated bet

We're betting that one narrow media-to-sheet shell, first proven by the richest
Recipe Home states and then adopted by existing cover-bearing details, will make
Kwilt feel substantially more coherent while preserving each object's meaning.
We're also betting that a complete no-photo state, relationship-prioritized
Reviews, and explained alternatives will increase Meal confidence without
creating image-maintenance pressure or a social-content feed. If this does not
land, we will first revisit the shell geometry and the placement/weight of
Reviews and recommendations—not the established header or the Recipe authority
boundaries.

## Success signal

On the same iPhone build, a person can open Arc, Goal, To-do, and Meal details
and recognize one consistent media-to-sheet behavior; Recipe Home remains
intentional with zero, one, or many photos; facts scan naturally; visible
Reviews prioritize known people without privacy leakage; and an explained
alternative can be opened and backed out of without losing browsing context.

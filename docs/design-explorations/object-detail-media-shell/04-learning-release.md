# Learning Release: Object Detail Media Shell

## Concept To Build

Give every cover-bearing object detail one recognizable Kwilt media-to-sheet
transition, first proving the full experience on Recipe Home with dignified
zero-, one-, and many-photo states, scannable recipe facts, one eligible Reviews
stream, and explained alternative Meals.

## Capability Delta

Today, the user cannot:

- depend on the same media-to-content behavior across Arc, Goal, To-do, and
  Meal details;
- browse all of a Meal's photos or deliberately choose its cover from Recipe
  Home;
- encounter a photo-less Meal that feels fully composed rather than unfinished;
- scan recipe effort without decoding a compressed row of equal-weight facts;
- read eligible Reviews with people they know prioritized in one stream;
- reach alternatives that explain why they fit the Meal currently open.

After this release, the user can:

- recognize one shared parallax, fade, overlap, and rounded-sheet grammar below
  the existing object-detail header;
- swipe through Meal photos, open the gallery, add photos when they have edit
  authority, and choose a cover without deleting the other images;
- use an intentional artwork state indefinitely when no Meal photo exists;
- scan available time and yield facts as full-width icon rows, then move through
  Ingredients and Instructions with clear section rhythm;
- read one visibility-safe Reviews stream ordered with their own Review first,
  then eligible Reviews from people they know, then other eligible Reviews;
- open a small set of deterministic, explained Meal alternatives and return to
  the same place on the original page.

Still intentionally not supported:

- a new header, new header actions, or a universal object-detail body;
- a required-photo state, photo-completion badge, or setup prompt;
- automatic publication of a private Cook note as a Review;
- visibility granted merely by household membership, following, or a social
  connection;
- review replies, likes, separate relationship lanes, a social feed, or
  engagement-ranked recommendations;
- implicit Meal Plan changes when an alternative is opened.

## User Experience

The user opens an existing Arc, Goal, To-do, or Meal route through the existing
header and navigation. Media moves with a restrained shared parallax treatment
and fades as the rounded content sheet reaches the established header boundary.
Reduce Motion keeps the spatial relationship while removing the scroll-linked
movement.

Recipe Home is the richest first consumer. With one image, it shows a clean
full-bleed cover. With several, it starts on the selected cover, supports
horizontal paging, displays a quiet position indicator, and opens the existing
gallery. With no photo, the same viewport contains composed non-literal artwork
that looks like a finished Kwilt Meal, not a missing asset. An editable Recipe
offers **Add a photo** quietly among its identity or action affordances; it does
not interrupt page opening.

Below the description, **What this recipe takes** lists only known facts as
full-width icon rows. Serving scaling stays separate because it is an action,
not another fact. Ingredients and **Instructions** receive clear section
spacing. The body-level **More recipe actions** control is removed because the
existing action surfaces already own those commands.

After the recipe itself, an independently gated **Reviews** section presents
one stream. The page ends with **More Meals you might like** when at least one
eligible alternative exists. Each card carries one plain-language reason, such
as **Quicker tonight** or **Uses similar ingredients**. Back returns to the
original Recipe and recommendation position.

## Existing Product Relationship

- Enhances the current Recipe Home, Arc detail, Goal detail, and To-do detail
  routes rather than adding replacement routes.
- Leaves `ObjectPageHeader`, `HeaderActionPill`, title/edit behavior, navigation,
  and each domain's `ActionDock` meaning unchanged.
- Reuses Recipe media assets and `RecipeArtworkGallery`; adds only the explicit
  cover/position authority that multi-photo management requires.
- Replaces the Recipe summary capsule, **Method** label, and body-level **More
  recipe actions** affordance.
- Extracts the already familiar hero-to-sheet behavior into one structural
  component with immersive, standard, and compact geometry variants.
- Coordinates with the global recipe catalog's independently gated Reviews,
  public-profile, moderation, and Cook-receipt work rather than inventing a
  second participation model.

## Buildable Slice

Must be real:

- a shared `ObjectDetailMediaShell` that owns viewport clipping, parallax,
  threshold-based fade, sheet overlap and radii, media attribution placement,
  bottom-control clearance, and a Reduce Motion path;
- Recipe Home adoption followed by Arc, Goal, and To-do adoption in the same
  initiative, with domain-specific geometry and scroll behavior preserved;
- zero-, one-, and many-photo Recipe states, using the existing gallery for
  full viewing;
- durable, reversible photo position and selected-cover behavior for editable
  Recipes, plus real add-photo authority and upload flow;
- the full-width Recipe fact list, unknown-value omission, separate serving
  scale control, **Instructions** copy, improved section rhythm, and removal of
  the redundant body action;
- a pure contextual recommendation selector that excludes the current,
  unavailable, hidden, and duplicate-edition Recipes and returns a bounded
  reason for every result;
- restoration of the original Recipe and scroll position after visiting an
  alternative;
- real server-side Review visibility, blocking, moderation, adult-profile
  policy, relationship-aware ordering, and coarse projection before Reviews are
  enabled for any account;
- Dynamic Type, VoiceOver labeling, Reduce Motion, zero/one/many media,
  long-content, and persistent-action Simulator checks across the migrated
  screens.

Can be thin or temporary:

- photo management may be a compact sheet limited to add, delete, reorder, and
  choose cover;
- recommendation reasons may initially be limited to quicker, same cuisine or
  category, similar primary ingredients, and editorial pick;
- **Show all reviews** may open a focused sheet rather than a new route;
- the post-Cook **Keep a photo from tonight** invitation may remain gated until
  its timing can be evaluated in real Cook completion;
- Reviews may remain completely hidden behind their own feature gate while the
  shell, media states, recipe structure, and recommendations are evaluated;
- old and new shell implementations may coexist briefly while each existing
  screen is migrated, provided no new bespoke shell is added.

Intentionally excluded:

- any change to the established header style or floating action semantics;
- a gallery tab, photo onboarding, photo requirement, or completion score;
- fabricated review fixtures in user-visible builds or client-side joins over
  broad relationship tables;
- public child reviews, automatic private-note publication, separate friend and
  public review lanes, replies, likes, or popularity ranking;
- recommendation settings, AI-generated reasons, or recommendations that alter
  a Meal Plan;
- a universal component that absorbs titles, editors, domain content, or
  object-specific actions.

## Release Channel

Use `Production-hidden` as the learning channel, preceded by local Simulator
proof. Andrew and explicitly eligible internal adult profiles should exercise
the real bundled shell, media states, navigation restoration, and deterministic
recommendations against production-shaped data.

Reviews retain a separate gate and should only appear for profiles included in
the global-catalog participation release after two-account visibility,
relationship ordering, blocking, reporting, and moderation proof passes. This
allows the visual system and Recipe improvements to be evaluated without
pretending the participation system is ready.

## Brand-Goodwill Guardrails

- A Meal without a photo looks intentional and complete; copy never calls it
  missing, empty, or unfinished.
- Fallback artwork is non-literal and never depicts a different specific dish
  as though it were the Meal.
- Photo invitations are secondary, contextual, dismissible, and never required
  to continue.
- Reviews never appear unless their people, content, visibility, and ordering
  come from the real authorized projection.
- Relationship ordering never reveals why a reviewer is considered known or
  grants access that did not already exist.
- Recommendation cards explain their bounded deterministic reason and never use
  invented personalization or popularity claims.
- Reviews and alternatives follow the complete recipe; they do not displace the
  Meal's identity, Ingredients, Instructions, or primary actions.
- Motion remains restrained, keeps the content readable, and honors Reduce
  Motion.

## Reversibility

Gate the new shell per consumer during migration and gate Reviews and
recommendations independently. Keep each screen's previous render path until
its state matrix is accepted, then remove it rather than maintaining permanent
dual implementations. The media authority change must be additive: hiding the
new shell or rolling back the client cannot delete photos, change their rights,
or erase Review data. Review publication and ordering remain server-controlled
and can be disabled without changing Recipe content. Recommendation selection
is local, deterministic, and side-effect free, so its section can be removed
without undoing user state.

## Permanent Product Threshold

Accept this as permanent product capability when the same installed build
demonstrates the shared media-to-sheet grammar on Arc, Goal, To-do, and Meal;
Recipe Home feels complete with zero, one, and many photos; cover choice and
photo ordering survive relaunch; long content, large Dynamic Type, VoiceOver,
and Reduce Motion remain usable; recipe facts and sections scan without
truncation or redundant actions; an explained alternative opens and returns to
the prior scroll context; and two real eligible accounts prove that Review
visibility, known-person prioritization, blocking, reporting, and moderation
work without exposing private relationships or Cook notes.

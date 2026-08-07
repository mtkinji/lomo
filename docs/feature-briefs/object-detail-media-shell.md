---
id: brief-object-detail-media-shell
title: Shared Object Detail Media Shell
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in]
related_briefs: [brief-global-recipe-catalog, brief-household-food-loop, brief-family-recipe-capture]
owner: andrew
last_updated: 2026-08-07
---

# Shared Object Detail Media Shell

## Context

Kwilt already uses image-led object details for Arcs, Goals, and To-dos, but
each screen implements its hero height, parallax, fade, sheet overlap, and
rounding independently. Recipe Home rebuilt a similar page without the shared
motion behavior, shows only one image, compresses effort facts into a dense
horizontal capsule, labels cooking steps **Method**, and exposes a redundant
body action. The result makes Meals feel structurally separate and makes
photo-less Meals feel more deficient than they should.

## Target audience

`audience-aspirational-family-organizers` needs to recognize quickly whether a
Meal fits real life and then act without decoding a dashboard or maintaining a
perfect recipe archive. A calm, familiar detail grammar should make the Meal
easier to trust while keeping photo capture optional.

## Representative persona

Maya is deciding whether a Meal is plausible for her household tonight. She
wants the time, yield, Ingredients, and Instructions to scan naturally; useful
experience from people she knows should help when available, but the page
cannot turn into a social feed or imply that an unphotographed Meal is
unfinished.

## Aspirational design challenge

How might we help Maya recognize whether a Meal fits tonight and continue with
confidence, while preserving Kwilt's existing object-detail header, private
household authority, and calm optional relationship to photos and public
participation?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Recipe Home matters when it helps Maya
move from browsing to one realistic Meal decision and eventual follow-through.

## Job flow step

Primary: step 3 in `job-flow-maya-feed-household-with-less-work`, **Recognize
whether it fits tonight**, currently scored 1/5. Recipe Home contains the raw
facts and actions, but its compressed summary and crowded sections make the
decision harder to scan.

Secondary: step 18, **Keep what was learned**, currently scored 1/5. Private
Cook learning, optional photos, and eligible Reviews should accumulate useful
experience without automatically publishing household content.

## JTBD framing

When I open a Meal, help me understand what it asks of us and whether it fits
tonight. Let the page feel complete even when we have not photographed it, show
me useful experience I am allowed to see, and let me explore another Meal
without losing my place or changing the plan behind my back.

## Design

### Constraint posture

`Extend the system`. Extract the media-to-sheet structure already present in
Arc, Goal, and To-do details, preserving the established header and each
domain's content and actions. Standardize the structural behavior, not a single
hero height or universal object-detail body.

### Shared shell contract

`ObjectDetailMediaShell` owns:

- media viewport clipping;
- scroll-linked parallax and threshold-based fade;
- a no-parallax Reduce Motion path;
- sheet overlap, top radii, canvas background, and border treatment;
- media attribution placement before the sheet edge;
- bottom clearance for persistent actions;
- `immersive`, `standard`, and `compact` geometry variants;
- composition points for hero media, sheet content, scroll refs, scroll
  callbacks, keyboard behavior, and temporary coachmark scroll locks.

It does not own the header, title or edit semantics, navigation, domain
sections, media storage authority, or `ActionDock` meaning.

Recipe Home is the first consumer. Arc, Goal, and To-do migrate to the same
component within the initiative, retaining their current domain behavior and
appropriate hero scale.

### Recipe media

- One active image fills the hero with no count badge.
- Several active images start with the selected cover, page horizontally, show
  a quiet position indicator, and open the existing full gallery.
- With no active image, the hero uses composed non-literal artwork in the same
  viewport. It never says “missing,” shows an empty-state icon, or shrinks.
- Photo order determines presentation order; explicit cover authority must be
  durable and reversible before a cover-management action ships.
- An editable Recipe may show **Add a photo** only when the picker, upload,
  ownership, persistence, offline, and error path are real. The visual release
  must not ship a dead or local-only invitation.
- A post-Cook **Keep a photo from tonight** invitation remains separately gated
  until its timing is evaluated.

### Recipe information hierarchy

Replace the horizontal summary capsule with a flat section titled **What this
recipe takes**. Each known fact receives a full-width row with a semantic line
icon, label, and right-aligned value. Candidate facts are Total time, Prep,
Cook, Waiting, and Makes. Unknown facts are omitted; no dash placeholders are
rendered.

Serving scale remains its own interactive row after the facts. Ingredients and
**Instructions** use larger section separation than the content inside each
section. Private prior-Cook learning and provenance remain quieter supporting
content.

Remove the body-level **More recipe actions** button. Editable personal Recipes
retain edit and delete through one quiet title-adjacent three-dot menu using the
existing action sheet. The fixed header style and share, like, and not-for-us
semantics do not change.

### Reviews

Recipe Home reserves no placeholder for Reviews. When the independently gated
global-catalog participation projection is available, show one **Reviews**
section after the complete Recipe:

1. the viewer's own eligible Review;
2. eligible visible Reviews from active Friends or another explicitly
   authorized known-person relationship;
3. other eligible Reviews.

The server applies visibility, blocking, moderation, adult-profile, and
account policy before ordering. Household membership or following alone never
grants visibility. The client receives a bounded projection and never joins
relationship graphs. Private Cook notes remain private and never become
Reviews automatically. There are no separate lanes, replies, likes, or feed.

### Recommendations

End with **More Meals you might like** when eligible alternatives exist.
Selection is deterministic and excludes the open Meal, hidden or unavailable
Meals, and duplicate editions of the same canonical Recipe. Every card shows
one truthful bounded reason: **Quicker tonight**, **Another [cuisine/category]
Meal**, **Uses similar ingredients**, or **Kwilt pick**. The first release does
not rank by rating, Review volume, or engagement.

Opening an alternative pushes another Recipe Home route. Back restores the
prior Recipe and its scroll position. Merely viewing or opening an alternative
never adds, removes, replaces, or finalizes a Meal Plan item.

### Recipe Home next-action dock

Recipe Home reuses the complete To-do Detail dock geometry and split-action
grammar rather than only sharing the outer `ActionDock` shell. Before a Cook
Session exists, the dock treats ingredient readiness as the dominant next job:

- a Meal outside the Meal Plan defaults to **Get ingredients** for this Meal;
- a Meal in a finalized Meal Plan defaults to **Get ingredients** for the whole
  reviewed plan, with this-Meal-only scope available in the menu;
- a Meal in an unfinished plan keeps this-Meal ingredient review available and
  offers the Meal Plan as a separate review path rather than compiling an
  unfinalized plan;
- **Start cooking**, **Continue cooking**, and explicit Meal Plan membership
  remain available according to current state, but a plus/check icon is never
  the only explanation of plan membership;
- a one-Meal Grocery list references the immutable Recipe version directly and
  never creates or mutates a Meal Plan as a side effect.

Choosing an ingredient scope opens the Groceries-owned **What do you already
have?** batch review. The user checks everything already at home and creates one
reviewed list of what remains. Recipe Home ingredient rows are plain recipe
information; stock confirmation belongs to Groceries and cooking progress
belongs to Cook Mode.

### UI contract

- **Job:** When a Meal is under consideration, Maya needs to understand what it
  asks and inspect credible context so she can choose it or continue browsing.
- **Authority chain:** Andrew's decisions and this brief → platform and
  accessibility requirements → Kwilt UI constitution and tokens → Candidate
  object-detail atlas entry → existing Arc/Goal/To-do production behavior →
  Airbnb reference for hierarchy and spacing only.
- **Three-second read:** Meal image or intentional artwork, title and
  description, then the effort it requires.
- **Primary action:** the state-derived next action in the shared split
  `ActionDock`: normally **Get ingredients** before cooking and **Continue
  cooking** during an active Cook Session.
- **Primary information:** title, description, time/yield facts, Ingredients,
  and Instructions.
- **Secondary information:** private Cook learning, notes, provenance, Reviews,
  and alternatives.
- **Reveal later:** gallery, personal Recipe actions, all Reviews, and photo
  management.
- **Scan order:** hero and identity → what the Recipe takes → Ingredients and
  Instructions → trusted context and alternatives.
- **Must not add:** a new header, nested fact cards, dash placeholders, photo
  requirement, social lanes, Review engagement, recommendation settings, or
  implicit planning effects.
- **Reuse map:** header → `ObjectPageHeader` / `HeaderActionPill`; persistent
  actions → `ActionDock` plus the shared split-action content extracted from
  To-do Detail; media paging → `RecipeArtworkGallery`; semantic
  controls → canonical `Button` and existing Recipe action sheet; layout and
  motion → new shared `ObjectDetailMediaShell` composed from tokenized views.
- **Nearest precedent:** Arc detail for immersive overlap and threshold fade;
  Goal detail for standard scale; To-do detail for compact scale. Recipe Home
  differs through horizontal Meal media paging and long-form cooking content.
- **Required states:** missing Recipe, zero/one/many media, long title and
  description, missing facts, long Ingredients/Instructions, prior private
  learning, pending offline save, Reviews gated/empty/populated/error, no/one/
  many recommendations, large Dynamic Type, VoiceOver, Reduce Motion, offline,
  and persistent actions.
- **Proof path:** real Meals → Recipe Home route on the owned iPhone Simulator
  runtime, followed by Arc, Goal, and To-do routes on the same installed build;
  signed-account/device proof remains separate for media sync and Reviews.

### Activation

The shared shell is learned implicitly through consistency. Photo addition is
discovered through a quiet personal Recipe action or after Cook completion,
never prompted because a page opened without a photo. Reviews and alternatives
are encountered only after the Recipe itself. No onboarding, badge, completion
state, or announcement is added.

### Release and reversibility

Release production-hidden after local Simulator proof. Gate each shell consumer
during migration and gate Reviews and recommendations independently. The core
Recipe page must remain complete when Reviews, recommendations, or photo
mutation are unavailable. Media changes are additive and must survive a client
rollback. Disabling Reviews or recommendations cannot delete or reinterpret
Recipe, photo, Cook, or Review data.

## Success signal

On the same installed build, Arc, Goal, To-do, and Meal details share a
recognizable media-to-sheet behavior without losing their domain identity;
Recipe Home feels complete with zero, one, or many photos; Maya can identify
the time and yield and find Ingredients and Instructions without interpreting
placeholder cells; an explained alternative opens and returns to the prior
context; and real eligible accounts prove known-person Review prioritization
without visibility or relationship leakage.

## Acceptance criteria

- `ObjectDetailMediaShell` supplies tokenized immersive, standard, and compact
  variants, threshold fade, parallax, sheet overlap/radii, and Reduce Motion.
- Recipe, Arc, Goal, and To-do consume the shared structural shell; no new
  screen-specific parallax formula remains.
- Recipe Home uses the same `ActionDock` horizontal and bottom placement as
  To-do Detail and the same split primary/menu anatomy.
- Before cooking, Recipe Home offers a one-Meal ingredient review without
  silently adding the Meal to the Meal Plan; a finalized active plan also
  offers all-plan ingredient review.
- The batch Already-have review produces a Grocery list containing only the
  remaining needed items and preserves Recipe or Meal Plan provenance.
- Recipe Home displays zero, one, and all active media states; a single image
  has no counter and many images have paging plus gallery access.
- The no-photo Recipe hero never uses missing/empty language or depicts a
  specific unrelated Meal.
- Known Recipe facts render as full-width rows; unknown facts render no row or
  dash; serving scale remains separate.
- **Instructions** replaces **Method**, with a truthful no-steps state.
- Ingredients and Instructions have at least one section-level spacing token
  more separation than their internal row rhythm.
- The body-level **More recipe actions** control is absent; personal edit/delete
  remains reachable through one quiet title-adjacent menu.
- Recommendation logic is pure and tested for current, hidden, unavailable,
  duplicate, limit, and reason-truth cases; navigation restoration has a screen
  regression test.
- Reviews render only from the authorized server projection; their absence
  leaves no empty placeholder. Two-account visibility and moderation proof is
  required before their gate widens.
- Dynamic Type, VoiceOver labels/order, Reduce Motion, long content, persistent
  controls, and zero/one/many media receive Simulator evidence.
- `npm run verify:changed -- --run` passes, with source/tests, Simulator,
  signed-device/account, production-hidden, and production-default proof kept
  distinct.

## Learning and decision rule

See [`04-learning-release.md`](../design-explorations/object-detail-media-shell/04-learning-release.md)
and [`05-evaluate-learning.md`](../design-explorations/object-detail-media-shell/05-evaluate-learning.md).
The shared shell and core Recipe layout may be accepted independently of
recommendations, media mutation, and Reviews.

## Spec refinement

Decisions locked:

- the existing header style and header action semantics stay unchanged;
- one shared structural shell with controlled geometry variants, not one fixed
  hero height and not a motion-hook-only convention;
- Recipe Home is the first proving consumer, followed by Arc, Goal, and To-do
  in the same initiative;
- zero-photo is a complete artwork state, while photo mutation appears only
  when it is fully authoritative;
- flat fact rows, separate serving scale, **Instructions**, wider section
  rhythm, and no body-level catch-all action;
- one Reviews stream with server-side visibility and known-person
  prioritization, independently gated;
- deterministic explained alternatives with navigation restoration and no
  planning side effects.

Engineering may choose exact token combinations, component file boundaries,
and scroll-event composition after verifying current screen contracts. Reviews
and durable media mutation are intentionally delivery-gated by the global
catalog and private Recipe data-authority work; the implementation must hide
those affordances rather than stub them. No user-owned product decision remains
open for the production-hidden core slice.

## Open questions

- None for the production-hidden core slice. Review widening and post-Cook
  photo timing remain later evidence-based gates, not unresolved requirements
  for the shell and Recipe layout.

# Learning Release: Household Feeding Loop

## Concept To Build

Move from a photo or URL to a trusted clean private Recipe, use AI to prepare
the next meals on the household's real cadence, finalize the plan, compile and
review one combined grocery list, and export it or send it to Instacart for
product selection and checkout. Bounded family participation follows after the
organizer spine works.

## Capability Delta

Today, the user cannot:

- preserve a Recipe as a durable Kwilt object;
- assemble a flexible-horizon meal plan;
- gather structured input from selected household members;
- generate a combined list with recipe provenance; or
- create an Instacart shopping-list page from Kwilt.

After this release, the user can:

- photograph or scan a printed/handwritten Recipe, import a supported URL,
  dictate, paste, or enter manually, then review source-grounded extraction
  before saving;
- cook from a clean immutable private Recipe without returning to the source;
- put saved recipes into a Next meals cycle framed by next shop, meal count, or
  date range;
- invite selected Meal-Planning-enabled household members to **Pick up to
  three**, pass, or suggest one idea, then finalize the plan;
- generate, correct, and prune one grocery list; and
- leave Kwilt through an explicit **Shop ingredients** handoff to Instacart.

Still intentionally not supported:

- automatic checkout, payment, delivery-slot selection, or order tracking;
- broad recipe discovery;
- Kroger cart-add;
- live family collection editing;
- nutrition and price optimization;
- coupon enumeration or activation;
- generic polling, ranked-choice configuration, or majority-rule auto-finalize.

## User Experience

The user photographs a family card or cookbook page, shares a URL, dictates, or
enters a Recipe. Kwilt creates an import draft, shows uncertain fields beside
their source evidence, and saves only after correction and approval. The user
then starts **Next meals** in Meal Planning. AI prepares a small candidate set
from authorized context and explains why; the organizer edits it. They choose a
next-shop, meal-count, or date-range horizon; days remain optional. **Ask the family** invites selected
activated members. On their own devices, participants privately pick up to
three, pass, or suggest one idea. When responses arrive or the organizer closes
the round, Meal Planning shows a calm aggregate and the organizer finalizes the
plan. **Make grocery list** then shows ingredients grouped by aisle with source
recipes attached. The user can mark items **Already have**, correct quantities,
and keep household staples. From Groceries, **Shop ingredients** creates an
Instacart list page and opens it. The return state says **Ready to review on
Instacart**, never **Ordered**.

This release preserves the seams for Savings Autopilot but does not pretend to
have coupon authority. If a Kroger feasibility spike returns regular and promo
prices, that evidence stays in the spike until product matching is dependable
enough for a separate Basket Truth release.

## Existing Product Relationship

- Adds Recipes, Meal Planning, and Groceries as separate capability owners,
  which may share a calm navigation grouping.
- Reuses `shopping_list`, execution destinations, Household eligibility, and
  Unified Chat proposal/receipt patterns.
- Does not make every Recipe an Activity.
- Uses Activities only for optional participation/cooking/shopping projections;
  Activities never store choice responses or finalize plans.
- Replaces the current one-query Instacart search handoff for eligible grocery
  lists once the production API path is proven.

## Buildable Slice

Must be real:

- Recipe storage, ownership, provenance, edit, export, and delete.
- Photo/scan import with multi-page ordering, rotation, common print and
  handwriting, visible evidence, field confidence, correction, temporary-media
  deletion, and idempotent approval.
- URL import for sites exposing valid `schema.org/Recipe` JSON-LD, with a manual
  correction step and source link.
- AI candidate proposals that cite authorized reasons and never finalize a plan
  or invite another person without review.
- Manual recipe entry suitable for a family card.
- Next meals planning horizons, candidates, and finalization.
- One versioned choice round with specific participant invitation, private
  response, pass, suggest-one-idea, close, aggregate, withdraw, and stale-state
  behavior.
- Server-enforced negative authorization proving uninvited household members and
  unrelated accounts cannot read or mutate the round.
- Ingredient parsing, consolidation, provenance, and correction.
- “Already have” exclusion.
- Durable grocery-list projection.
- Server-side Instacart API key isolation, link creation, expiry refresh, error
  recovery, and an honest receipt.

Can be thin or temporary:

- One household, one organizer, and up to three invited participants.
- Dinner only.
- A small aisle vocabulary.
- No nutrition calculation.
- No automated recipe search.
- Development key and local/TestFlight proof before production-key review.

Cannot be thin:

- source-grounded import review, provenance, correction, and retry;
- clean, accessible cooking from the saved version;
- deterministic ingredient compilation and visible uncertainty;
- private identity and account-switch isolation; or
- proposal, confirmation, and receipt truth.

Intentionally excluded:

- Scraping behind login, bypassing anti-bot controls, or retaining retailer
  passwords.
- Copying article prose or publisher photography without permission.
- Product auto-selection presented as certain.
- Retailer order completion claims.
- Scraping loyalty accounts, storing retailer passwords, or calling a coupon
  **applied** without provider acknowledgement.
- Open-ended family discussion, public results, member rankings, repeated
  pressure notifications, or child access to budget/dietary/private Recipe data.

## Release Channel

Start with a **local build** for organizer-side recipe/plan/list dogfooding, then
a **TestFlight build** for a real household choice round on independently
authenticated devices after the plan contract is stable. Request an
Instacart production key only after a compliant end-to-end demo exists; its
current review process requests a screen recording and documents an average
30–40 day integration path.

## Brand-Goodwill Guardrails

- Imported content always shows source and import status.
- AI never invents a missing ingredient, quantity, time, author, source, rights
  basis, price, offer, activation, order, or realized saving.
- Quantity merges show their recipe sources and can be undone.
- Dietary and allergy data is user-provided context, not a medical guarantee.
- Retailer actions name their exact state.
- No sponsored recipe ranking in the learning release.
- No sponsored product ranking or inflated savings claims.
- Family recipes remain private until explicitly shared.
- A Meal Planning invitation grants only one-round participation and clearly
  names who invited the participant and when the round closes.
- Results say **picks**, not votes or winners; the organizer's final choice is
  presented as a practical plan, not a verdict on anyone's preference.

## Reversibility

The Recipe, MealPlan, MealChoiceRound, GroceryList, and RetailerHandoff
boundaries remain provider-neutral. Instacart is an adapter; disabling it leaves
Recipes, Next meals, family choice, Groceries, export, and plain-list sharing
intact. External product IDs are stored only inside provider mappings, never as
the canonical ingredient.

## Permanent Product Threshold

Keep the capability when repeated real grocery cycles show that users reuse
their recipe collection, generate rather than manually rebuild lists, correct
few enough ingredient matches to trust the system, and complete retailer
checkout often enough for the handoff to matter.

For Meal Planning specifically, keep the capability only if independently
authenticated family members willingly respond and organizers say the round
reduces guessing or negotiation rather than adding another coordination chore.

## Next learning release: Basket Truth

Once the core loop and Kroger product mapping work, build a bounded savings
slice: regular/promo comparison, unit-price normalization, three-or-fewer
worthwhile recommendations, official retailer deep links for required actions,
and photo receipt reconciliation. Automatic coupon activation remains excluded
until a provider supplies documented read/write authority.

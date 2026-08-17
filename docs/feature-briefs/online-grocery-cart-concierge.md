---
id: brief-online-grocery-cart-concierge
title: Online grocery cart concierge
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life, jtbd-understand-why-ai-suggested-this]
related_briefs: [household-food-loop, exact-store-retailer-handoff]
owner: andrew
last_updated: 2026-08-16
---

## Context

The Grocery list already serves the in-store moment. `Shop online` should not
plan an errand or infer whether Maya is making a tiny run, a restock, or a
price-sensitive trip. Its distinct job is to turn the reviewed remainder into
the most complete credible pickup or delivery cart a retailer permits, ask Maya
only about consequential exceptions, surface a few evidence-backed savings,
and preserve everything the handoff did not cover.

## Target audience

`audience-aspirational-family-organizers` wants to feed a household without
becoming a grocery-commerce operator. The value is eliminating store trips or
large amounts of retailer browsing, not giving Maya another place to manage
retailers, scoring weights, or shopping strategies.

## Representative persona

Maya has already made the important household decision: the grocery list is
what the family needs. She is willing to state stable online-shopping
preferences once, including pickup versus delivery and the order in which she
prefers retailers. She expects Kwilt to reuse those preferences, do the
repetitive product work, and tell the truth whenever a retailer exposes only a
link rather than a writable cart.

## Aspirational design challenge

How might Kwilt turn Maya's reviewed grocery list into a nearly checkout-ready
pickup or delivery order, with only a few human decisions, while making
meaningful savings visible and never overstating retailer coverage, cart state,
or order state?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the value is a completed household-food
cycle with less repeated work, not a more sophisticated shopping dashboard.

## Job flow step

`job-flow-maya-feed-household-with-less-work`, step 14, **Reach a buying
surface**. Current delivery is 2: the Kroger-family source path can discover an
exact store, match products, and add confirmed UPCs to an authenticated cart,
but production enablement and real retailer proof remain gated. Amazon and
Walmart currently provide at most policy-governed outbound-link opportunities;
Costco has no approved Kwilt integration.

## JTBD framing

When my list is ready, help me get nearly all of it into pickup or delivery
without searching for every item, so I can avoid another store trip or a long
retailer-browsing session. Preserve `jtbd-carry-intentions-into-action` by
carrying list identity and quantity into the retailer, preserve
`jtbd-review-budget-reality-before-spending` by labeling observed estimates and
savings coverage, and preserve `jtbd-trust-this-app-with-my-life` by keeping
links, cart acknowledgements, checkout, orders, and fulfillment as distinct
evidence states.

## Design

### Product boundary

- The Grocery list remains the complete in-store experience.
- `Shop online` owns online preference setup, retailer eligibility, product
  matching, exception review, evidence-backed savings, retailer handoff, and
  the exact unresolved remainder. When its batch provider is explicitly
  available, Amazon is whole-list-first: Kwilt prepares every
  provider-supported match together, while unresolved exceptions stay in
  Kwilt for another retailer or an in-store pass.
- Kwilt does not create an in-person itinerary, call an affiliate link a cart,
  or infer a purchase from an opened retailer.
- The retailer owns slot selection, substitutions not supported by the provider
  contract, fees, tax, payment, checkout, order status, and fulfillment.

### First use

The first `Shop online` use asks for stable, user-owned defaults:

1. Default fulfillment: `Pickup`, `Delivery`, or `Either`.
2. One ordered list of online destinations Kwilt can actually use for the
   selected fulfillment mode. Amazon and Walmart appear only when their exact
   mobile handoffs are approved and a qualifying-link format is configured. A Kroger-backed store appears only after an
   exact supported location is known, labeled with the banner Maya recognizes,
   such as Smith's, King Soopers, or Fred Meyer.
3. Drag handles and a quiet remove action let Maya make that actionable list
   her preferred order. `Add store` searches only supported online locations;
   it is not a directory of every store where the household shops.

The starter list contains every currently actionable destination. When a new
destination becomes actionable later, Kwilt appends it without disturbing the
person's existing order. Removing a destination is remembered, and `Add store`
can restore it.

Kwilt may use already-authorized location or a user-entered place or ZIP to
identify an exact supported store. Corporate ownership and provider routing
stay internal: Maya ranks Smith's, not `Kroger family`. Unsupported
independents, co-ops, Costco, and generic `Other` entries remain served by the
ordinary in-store Grocery list rather than appearing as inert online
preferences. Kwilt does not claim to detect Amazon membership or
retailer-account state. Account authorization is deferred until a cart-capable
provider needs it. Preferences are person/device scoped in the learning
release, inspectable, editable, versioned, and reversible.

### Returning use

`Shop online` immediately resolves Maya's highest-ranked executable destination
against the current Grocery-list revision. When Amazon is first, Kwilt bypasses
the retailer overview and starts whole-list preparation in one transient
interstitial. The moment first states the real work underway, then reports the
ready count and exact remainder. Maya explicitly chooses `Open Amazon` before
leaving Kwilt; `Use another retailer` is quiet recovery, not a required
decision. Every uncertain or unavailable item remains on the Grocery list. The
retailer overview remains available for non-Amazon destinations,
unavailable-preference recovery, and deliberate retailer changes.
Without provider evidence, the interstitial says the Amazon cart handoff is
not connected and offers another retailer; example data is not counted as
ready.

### Capability levels

Retailer capability is explicit and runtime-gated:

- `cart_prepare`: store/area evidence, fulfillment-filtered product matches,
  current item prices where returned, and an acknowledged cart-write path.
- `product_links`: authorized product or search links opened in the retailer's
  app or the system browser. Kwilt may remember explicit user-reported progress
  for the current list revision, but makes no cart, coverage, availability,
  price, purchase, or order claim.
- `remembered_only`: an internal legacy or demand signal; it is not presented
  as a choice in the online priority list.
- `unavailable`: an integration exists conceptually but is disabled, expired,
  unapproved, or unavailable for this fulfillment mode.

Kroger-family pickup is the first `cart_prepare` implementation. Delivery may
be exposed only after the public API's delivery filter and cart modality are
proved against a disposable retailer cart. Amazon and Walmart product-link
workflows are product-ready behind disabled runtime gates. They remain absent
from production until the exact Kwilt mobile surface is accepted by each
program, a qualifying-link format is configured, the unavoidable `Paid link`
disclosure is present, and live attribution is proved. Costco remains outside
the online priority list until Kwilt has a legitimate integration.

### Cart concierge

The default scan is:

1. A result such as `18 of 21 ready for Smith's pickup`.
2. A collapsed Ready section containing deterministic or remembered matches.
3. A small Needs review section for ambiguous identity, material package or
   quantity changes, unavailable products, or unsupported fulfillment.
4. Up to three evidence-backed savings that can be accepted directly into the
   current cart draft.
5. One action: `Add N items to [retailer]`.

Kwilt may default a product only when a tested matching rule marks it ready.
Previously confirmed exact-store mappings rank first. New matches require
meaningful concept-token coverage, requested fulfillment availability, and no
protected-product conflict. Unknown package conversion is labeled and remains
editable; it cannot support a normalized savings claim.

### Savings

The first savings layer stays within the selected cart:

- current promotion on the selected product;
- a lower observed price for a user-reviewed alternative when package quantity
  can be normalized;
- avoided duplicate quantity when the list already has overlapping needs.

Savings are estimated, carry evidence time and coverage, and exclude unknown
fees, tax, future coupon redemption, and cross-retailer comparisons. Walmart
price tracking or alerting is not implemented under the current affiliate
terms. Realized savings require receipt or provider-authoritative paid evidence.

### Handoff and remainder

A provider acknowledgement creates `In [retailer] cart`, never `Ordered`.
Partial or ambiguous writes show exactly which items were acknowledged and
which require retailer-cart inspection. The unresolved remainder stays in the
same Grocery list. `Shop N remaining` repeats online fulfillment; `Leave for
in-store` simply returns those items to the ordinary checklist and does not
construct a store trip.

For Amazon and Walmart link assistance, opening an individual product link or
reporting an addition never creates a provider cart receipt or checks off the
Grocery item. A batch handoff is shown only when the provider returns an
approved cart URL for specific product identifiers. Opening that URL means only
`opened for retailer review`; the retailer still owns availability, final cart
contents, price, fulfillment, and checkout. A changed Grocery-list revision
safely starts a fresh preparation rather than carrying stale assertions forward.

### Recipe equipment below groceries

When the current list has Recipe provenance, Groceries may show at most three
specialized kitchen tools below the actual grocery rows. Each suggestion names
the Recipe or Recipes that surfaced it. When Amazon's exact mobile surface and
qualifying-link format are approved, `Search Amazon` opens a one-tool search in
the Amazon app or system browser with the qualifying-link disclosure beside the
Recipe provenance. The suggestion remains outside the Grocery list, and opening
Amazon does not mark it covered, purchased, or carted. `View on Amazon` requires
an exact product/ASIN from an approved provider; a generic equipment concept
must remain `Search Amazon`. If the external handoff fails, `Add to list` may be
offered as recovery rather than as a competing row action. The section is hidden
when no approved or explicitly enabled testing link exists. The surface does not
infer that the household lacks the tool and does not show products, prices, or
sponsored ranking. Ordinary kitchen basics are excluded.

Equipment extraction is evidence-first rather than an open-ended shopping
recommendation. Recipe import makes one schema-constrained model call, then
persists only validated, still-grounded evidence with the immutable Recipe
version. Each immutable Recipe snapshot records a canonical
tool concept, evidence text, required-versus-preferred classification, explicit
substitute when present, confidence, and a brand-neutral search query. Exact
size or capacity language such as `9-inch springform pan` survives into the
query. Optional mentions, warnings against a tool, preferred conveniences, and
tools with a stated ordinary substitute do not enter the shopping section.
Required tools shared by more planned Recipes rank before one-Recipe tools;
specificity and confidence break ties. Commission rate, retailer availability,
brand, price, and sponsored status never participate in generation or ranking.
The model call happens during import, never while opening Groceries. Manual,
catalog, provider-unavailable, and legacy Recipe versions use the same
deterministic instruction parser as a fallback. Legacy snapshots containing
only a concept and label remain readable through conservative required-tool
defaults.

### Privacy and monetization

- Retailer priority is never changed by commission rate.
- Affiliate disclosure is unavoidable beside qualifying links.
- Analytics record only provider/capability/mode, bounded item counts, decision
  counts, coarse duration, and outcome. They never record ingredient text,
  product names, store addresses, account identity, or order content.
- Amazon opens through Universal Links or the system browser, never an embedded
  WebView, and Kwilt never orders on a user's behalf.

## Success signal

For a supported retailer on a normal household list, Maya reaches the retailer
checkout in roughly two minutes, at least 90% of ordinary list items are
transferred, and she makes no more than a few consequential product decisions.
Across repeated use, households report avoiding grocery-store trips or removing
substantial retailer browsing. Every unmatched item survives, every price or
savings claim names its evidence coverage, and no state claims `ordered`,
`picked up`, `delivered`, or `saved` without corresponding evidence.

The job-flow delivery score should not move above 2 until a signed-device run
proves a real disposable cart, exact remainder, and truthful recovery. A move
toward 3 additionally requires repeated TestFlight household use demonstrating
material time or trip reduction.

## Spec refinement

- The learning release is Kroger-family pickup first. It records delivery as a
  preference but does not expose Kroger delivery cart preparation until the API
  path is independently proved.
- Retailer preference and retailer capability are separate models. The visible
  priority list is the actionable intersection of user preference, current
  approval, fulfillment mode, and exact-store evidence; non-executable stores
  do not appear there.
- The existing exact-store confirmation remains required for pickup and must
  not be generalized to imply provider-verified delivery origin.
- Cross-retailer basket optimization, order-status ingestion, automatic
  checkout, and receipt reconciliation are excluded.
- Recipe import requests equipment in the existing schema-constrained LLM call,
  including for schema.org URL imports while preserving the deterministic
  recipe transcription. Model output must quote a retained Recipe instruction
  and pass the same necessity, substitute, confidence, and ranking rules before
  it can persist or surface. Groceries never invokes the model at render time.
- Amazon and Walmart have complete disabled-gate product flows: preference
  entry, primary-outcome routing, whole-list preparation, compact handoff receipt,
  disclosure, recovery, and alternatives. Active
  qualifying links still require program/surface approval, configured link
  formats, and live attribution verification.

## Open questions

- What exact public Kroger cart modality value and store/area relationship will
  pass a real delivery-cart drill for the selected Smith's market?
- After Walmart approval, which Impact-provided product feeds and mobile
  qualifying-link formats are authorized for Kwilt's exact surface?
- Can an approved Amazon mobile surface support sufficiently targeted product
  links without resembling or emulating Amazon's shopping experience?

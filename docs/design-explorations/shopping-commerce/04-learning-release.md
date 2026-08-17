# Learning Release: One Real Instacart Handoff

> **Current-status note (2026-08-14):** Instacart's July 20, 2026 Developer
> Platform documentation now says `Apply today` and estimates a 30–40 day
> integration/approval path. The earlier closed-intake finding below is stale.
> See
> [`docs/research/online-grocery-acquisition-integration-state.md`](../../research/online-grocery-acquisition-integration-state.md)
> for the current cross-provider assessment and evidence gates.

## Concept to build

Prove the smallest complete commercial loop: a useful reviewed Kwilt Grocery
List can create a real Instacart shopping-list page, open it through a compliant
branded action, and retain an honest plain-list fallback. The release tests the
partner and attribution opportunity; it does not turn Groceries into a retailer
front end.

## Current truth

- Kwilt already has a provider-neutral Grocery List, plain copy/share fallback,
  Instacart payload adapter, server-side Edge Function, idempotent handoff record,
  and honest `opened_for_product_review` state.
- The production `grocery-handoff` function is deployed but deliberately cannot
  create links: no Instacart API credential is configured and the remote enable
  flag is not on.
- Instacart's current Developer Platform documentation publishes an `Apply
  today` path and estimates 30–40 days from access request through demo approval
  and production-key access. Kwilt has not yet proved that the current intake
  will issue it a development key; the integration remains disabled until it
  does.
- The existing UI copy was not launch compliant. Instacart currently approves
  only **Shop ingredients** or **Shop on Instacart** and requires a 46-point,
  29.5-radius branded CTA with its 22-point full-color logo.
- Affiliate attribution is not yet proven. Instacart invites an approved
  integration to Impact after its demo review; a click is not revenue evidence.

## User experience contract

### Actual handoff

```text
Reviewed Kwilt Grocery List
  -> Kwilt sends generic names, display text, and supported measurements
  -> Instacart returns a hosted shopping-list URL
  -> user opens it and chooses or confirms a store
  -> user reviews Instacart's product matches
  -> user adds the wanted products to that retailer's cart
  -> user signs in if needed and checks out on Instacart
```

The first release uses Instacart's **shopping list page**, not a generic search
link and not a direct final-cart mutation. This is the right object for a mixed
household list containing Recipe ingredients, staples, pet supplies, or other
store needs.

Kwilt can supply generic product names, separate display text, one or more
supported measurements, and eventually approved brand/health filters or known
UPCs. Instacart performs product matching. For this combined-list endpoint,
Kwilt cannot force a retailer; Instacart uses location, availability, and user
preference to establish the initial store, and the user can choose another.

Other available models are deliberately not the primary flow:

- A **recipe page** can include image, author, servings, instructions, pantry
  handling, and an optional preferred-retailer URL. It is useful for a direct
  one-Recipe experiment, but it fragments the shared household list.
- A **generic affiliate link** can attribute traffic but cannot carry the
  reviewed Kwilt list, so it fails the consumer job.
- A **direct cart or embedded checkout** is not a documented, generally
  available public-IDP contract Kwilt can responsibly plan around today.

### Three-second read

**Your grocery list is ready.** The user can send it to Instacart or carry the
plain list anywhere.

### Hierarchy

1. The list is ready.
2. **Shop on Instacart** is the one commercial continuation.
3. Copy and share/print remain quiet, permanent alternatives.
4. Provider responsibility and recovery detail appear after the choice.

The closest Kwilt atlas precedent is **Persistent decision region**, but this
screen remains a flat page for the learning release because the decision does
not need to follow the user through list review. The Instacart CTA is a
capability-local provider-brand exception: it uses the required white theme so
Kwilt does not acquire another green primary-button style.

### Required states

- ready list;
- preparing link;
- provider disabled or unavailable;
- stale or unreviewed list;
- offline or pending local changes;
- real Instacart product-review page opened;
- plain copy/share available whenever local list data exists.

Kwilt never says **ordered**, **delivered**, or **saved money** from link creation
or opening. Instacart owns matching, substitutions, prices, and checkout.

## Must be real

- A development API key issued to Kwilt, held only as a Supabase secret.
- One realistic reviewed list generated from Recipes plus at least one ordinary
  household item.
- A real Platform API list-page URL whose matched and unmatched items are
  inspected manually.
- A signed-device recording that shows the Grocery List, the branded CTA, the
  tap, and the resulting Instacart page.
- The exact review URL supplied with the production-key request.
- Remote disable and plain-list recovery still working when provider creation
  fails.
- After approval, the actual Impact attribution configuration and one real
  qualifying order visible in provider reporting before any revenue claim.

## Can be thin

- Andrew's household only.
- One retailer and one region.
- A development-key signed build before production review.
- Manual recording of match quality and correction burden.
- No in-app checkout-return ceremony; opening remains the last Kwilt-observed
  provider state.

## Intentionally excluded

- Price comparison, retailer ranking, coupons, delivery claims, or basket
  optimization.
- Product auto-selection presented as certain.
- Order completion inferred from a click, app foreground, or user report.
- Affiliate disclosure or earnings claims before an affiliate relationship is
  actually active. Required disclosure becomes part of the production launch.
- A generic Shopping navigation object.

## Release and evidence gates

1. **Access gate:** attempt the currently published application/dashboard path
   and obtain a development API key for Kwilt.
2. **Technical gate:** create and open one real list page on a signed device.
3. **Quality gate:** inspect matching and record every correction or omission.
4. **Review gate:** submit Instacart's screen recording and list URL; obtain a
   production key and the actual affiliate terms.
5. **Attribution gate:** configure the approved program and observe one real
   qualifying order in Impact reporting.
6. **Investment gate:** repeat enough household cycles to test the provisional
   $25 annualized gross affiliate revenue per monthly active Grocery household
   threshold from the Grocery Flywheel decision.

Production remains disabled until gates 1 through 4 pass. A generic affiliate
tracking link is not a substitute for a generated shopping-list page. Provider code may ship
behind the remote flag because its failure path leaves the complete Grocery List
usable.

## Permanent product threshold

Keep and expand the integration only if real households reach a useful list
with less re-entry, matching is good enough that retailer review is easier than
starting over, attributed orders produce meaningful revenue, and users still
understand that Kwilt did not alter their list for commercial reasons.

## Stop conditions

Stop before multi-retailer or generic Shopping work if Kwilt cannot obtain
approval, matching corrections dominate the task, mobile-app attribution is not
available on acceptable terms, or the integration makes the neutral list feel
like an ad.

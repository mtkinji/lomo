---
id: brief-trusted-recipe-product-picks
title: Trusted Recipe Product Picks
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-understand-why-ai-suggested-this, jtbd-trust-this-app-with-my-life]
related_briefs: [recipe-origin-story]
owner: andrew
last_updated: 2026-08-20
---

# Trusted Recipe Product Picks

## Context

Recipe equipment already belongs to the immutable cooking record, while the
public Recipe experience has begun testing researched product picks. Keeping a
specific retailer product on every Recipe would duplicate changing commercial
data and make a product replacement look like a cooking change. Kwilt needs one
shared, reviewable commerce catalog that can serve both the mobile app and the
public site without making commerce necessary to use a Recipe.

## Target audience

Aspirational family organizers want to feed their household with less repeated
work. A product recommendation helps only when it resolves a real equipment gap
without turning Recipe Home into a storefront.

## Representative persona

Maya has chosen something to cook and discovers that a tool may make the Recipe
possible or substantially easier. She wants to know whether she needs to buy
anything, why Kwilt selected a product, and whether the purchase will be useful
beyond one meal.

## Aspirational design challenge

How might we help Maya confidently resolve a real equipment gap while
preserving a complete Recipe, an honest substitute, and a calm boundary between
editorial judgment and retailer commerce?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the recommendation should help Maya
carry tonight's meal through to cooking, not give her another catalog to manage.

## Job flow step

This improves step 15, **Prepare before cooking**, in
`job-flow-maya-feed-household-with-less-work`. Its current delivery score is 1:
Kwilt shows ingredients and directions but does not yet provide a complete,
trusted readiness experience for equipment gaps.

## JTBD framing

When a Recipe calls for equipment Maya may not own, help her decide whether she
can use what she has or confidently choose one reviewed product, so she can
start cooking without reconstructing the decision elsewhere. The recommendation
must explain its evidence and trade-offs because trust is more important than
maximizing clicks.

## Design

### Ownership boundary

- `RecipeVersion` owns the stable cooking requirement and instruction evidence.
- A Recipe equipment need may reference a stable equipment category.
- Versioned equipment reviews own methodology, sources, substitute guidance,
  review dates, and publication state.
- Products own stable manufacturer and model identity.
- Retailer listings own marketplace-specific external identifiers such as an
  Amazon ASIN. Tagged URLs are resolved at open time and are never Recipe data.
- Review picks join a published review to products and carry role, rationale,
  trade-off, and ordering.

```text
RecipeVersion
  -> equipment requirement/category
    -> published equipment review
      -> reviewed product pick
        -> retailer listing
```

Changing a Recipe requirement creates a new Recipe version. Changing a product,
retailer listing, or affiliate approval does not.

### Learning-release experience

Recipe Home shows at most one calm recommendation for a clearly supported
equipment requirement. Before the retailer action, it explains:

- why the product fits the cooking need;
- a material trade-off;
- whether an ordinary substitute avoids a purchase; and
- how many other Kwilt Recipes use the same equipment category.

The user explicitly continues to Amazon. Kwilt describes only the handoff it can
prove: an external or paid product link, never cart creation or purchase.

### Trust and monetization guardrails

- A Recipe remains complete when no review or retailer listing exists.
- Optional, warned-against, low-confidence, or readily substitutable equipment
  does not trigger merchandising from instruction extraction alone.
- Publication requires current editorial evidence; withdrawn or expired reviews
  resolve to no recommendation.
- Paid placement cannot silently change editorial ranking.
- No household content is sent to a retailer or stored in the commerce catalog.
- An unavailable or unapproved affiliate surface falls back to no product card
  or an accurately labeled untagged testing link.

## Success signal

In a small production release, users who encounter a supported equipment gap can
explain why the product was recommended, can identify the no-purchase substitute,
and can reach the retailer without believing Kwilt created a cart. The permanent
capability is justified only if the card helps Recipe follow-through and earns
qualified outbound traffic without reducing Recipe trust.

## Open questions

- Whether equipment ownership should be remembered after this release.
- Which additional categories deserve editorial review after the first proven
  product and whether a second retailer materially improves customer outcomes.

## Spec refinement

The first implementation proves the ownership boundary with one published
product pick and a source-controlled offline projection matching a normalized
Supabase schema. Live catalog fetching, ownership memory, price/availability,
multi-retailer comparison, sponsored inventory, and cart APIs are intentionally
deferred. Completion requires contract tests, database tests, component tests,
and diff-aware repository verification; signed-device and production affiliate
behavior remain later evidence gates.

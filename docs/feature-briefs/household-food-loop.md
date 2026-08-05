---
id: brief-household-food-loop
title: Household Food Loop
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-food-ai-operating-layer, brief-activity-context-action-platform]
owner: andrew
last_updated: 2026-08-05
---

# Household Food Loop

## Context

Feeding a household is one recurring job composed of several disconnected
burdens: preserving recipes, deciding what sounds good, gathering family input,
combining ingredients, remembering what is already at home, matching products,
finding worthwhile savings, and rebuilding a retailer cart. Kwilt can remove
meaningful household work only if the transitions become easier while Recipes,
Meal Planning, and Groceries retain truthful ownership.

## Target audience

`audience-aspirational-family-organizers` wants family life to feel more
organized without adopting a productivity methodology. This audience values
continuity, shared participation, and fewer repeated decisions more than a
large content catalog or a sophisticated coupon dashboard.

## Representative persona

Maya wants the next shopping cycle to include meals her household will actually
eat, reuse family knowledge, and reach pickup or delivery without reconstructing
the same decisions and list arithmetic. She shops on a variable cadence and
wants children with their own devices to have a bounded, meaningful voice.

## Aspirational design challenge

How might Kwilt help Maya and her family choose the meals they want for whatever
horizon fits their next shop, then move the finalized plan to reviewed groceries
ready for pickup or delivery, while preserving private ownership, child voice,
organizer authority, retailer truth, and a calm household experience?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the spine because the value is not
recipe storage or deal discovery in isolation; it is reliable household
follow-through from “what should we eat?” to a reviewed checkout destination.

## Job flow step

`job-flow-maya-move-family-life-forward` currently has weak seams at knowing
the next doable family action and scheduling or handing it off. Household
participation exists as a foundation, but Meals has no capability-owned
invitation, private response, or finalization contract. The loop should improve
those steps without adding recurring administration.

## JTBD framing

When feeding my household becomes another coordination burden, help us reuse
food we already love, decide together on our real cadence, make one trustworthy
list, and reach a retailer with the least re-entry possible. Help me improve
the economic outcome without requiring me to become good at couponing or trust
discount claims that cannot be proven.

## Design

### Capability ownership

- **Recipes** owns reusable food knowledge, provenance, versions, clean cooking,
  private ownership, and recipe-specific sharing.
- **Meal Planning** owns horizons, candidates, family choice rounds, responses,
  constraints, servings, day placement, and finalization.
- **Groceries** owns compiled lists, Already have state, household additions,
  product mappings, price and offer evidence, savings plans, retailer handoffs,
  and receipt reconciliation.
- **Activities** optionally carry recurring prompts, scheduled cooking, and
  shopping execution. They never become canonical Recipes or Meal Plans.

### Learning-release loop

1. Photograph, scan, share a URL, dictate, paste, or manually enter ten to
   twenty real private Recipes; review uncertain fields against their evidence.
2. Cook from the clean saved version without returning to the source.
3. Start **Next meals** using next-shop, meal-count, date-range, or open horizon.
4. Let AI prepare an explained candidate set from authorized context, then add
   or remove Recipes, leftovers, eat out, undecided, or plain meal notes.
5. Optionally invite selected activated household members to pick up to three,
   pass, or suggest one idea.
6. Close the round and show a calm aggregate; the organizer finalizes.
7. Compile ingredients deterministically with provenance and uncertainty.
8. Review **Already have**, corrections, staples, and quantities.
9. Create an Instacart shopping-list page and state truthfully that retailer
   product review and checkout remain.

### AI operating layer

AI is not a fourth food capability. It operates Recipes, Meal Planning, and
Groceries through the same canonical capability operations used by native
surfaces. It may extract, search, prepare, explain, and execute work at the
declared authority level; capability code validates every mutation and owns the
receipt.

Photo and URL import are base release criteria. Extraction creates a temporary
evidence-backed draft with field confidence and warnings. The user approves the
canonical Recipe. AI can propose meals, point out ingredient ambiguity, prepare
product matches, explain savings evidence, reconcile receipt lines, and prepare
public metadata. It cannot silently invite, finalize, publish, select a
consequential product, apply an unsupported coupon, checkout, or attest rights.

The complete authority matrix lives in
[`food-ai-operating-layer`](../design-explorations/food-ai-operating-layer/03-converge.md).

### Recipe identity and public sharing

Private Recipe identity, immutable content versions, provenance, credits,
lineage, grants, collections, media rights, and import drafts are separate
records. Public distribution uses an opted-in creator profile and a publication
snapshot of one reviewed version; it does not expose or mutate the private
Recipe. Discoverable public sharing requires moderation, takedown, rights, and
child-safety policy before launch.

### Savings Autopilot

Savings is a Groceries behavior, not a fourth top-level capability. After
product matching is trustworthy, **Find savings** presents at most three
worthwhile changes ranked by net household outcome. Public promotion prices,
member prices, coupons requiring activation, rebates, fees, and receipt-proven
savings remain distinct evidence states.

Kroger regular and promotional price evidence is the first planned Basket
Truth provider. Automatic coupon activation is excluded until a provider grants
documented offer enumeration, eligibility, activation, and acknowledgement
authority.

### Retailer truth

Instacart is the first broad handoff and Kroger the second direct cart-add
adapter. Walmart, Target, Harmons-direct, and universal checkout are not on the
no-negotiation implementation path. Plain list/export remains the permanent
fallback. No state says **ordered** without retailer order evidence.

### Content boundary

Kwilt supports private user-initiated recipe capture, user-authored and family
recipes, Kwilt-authored recipes, and properly licensed/open content. It does
not bulk crawl or create a public ad-free copy of third-party recipe sites.
Every import keeps source and rights provenance and remains reviewable.

## Success signal

One household completes at least three real cycles across its natural cadence,
reuses saved recipes, willingly participates from separate devices, accepts
most list compilation, reaches retailer checkout, and reports that Kwilt
removed meaningful work. Savings expands only when itemized evidence shows a
better outcome without extra deal-management burden.

## Open questions

- Exact Instacart production approval and Harmons/Utah retailer coverage require
  a development-key feasibility run.
- Exact Kroger public scopes and Smith's cart-add behavior require a developer
  application and disposable-account proof.
- URL import quality and terms must be validated on the representative 50-site
  corpus before external launch.
- Broader discovery and live recipe collaboration remain post-learning-release
  decisions, not launch dependencies.
- Model/provider choice, private import-media retention, and the exact set of
  reversible Chat actions that can complete without a second tap require
  preflight evaluation.

## References

- [`docs/design-explorations/meals-recipes-groceries/strategy.md`](../design-explorations/meals-recipes-groceries/strategy.md)
- [`docs/design-explorations/meals-recipes-groceries/capability-boundaries.md`](../design-explorations/meals-recipes-groceries/capability-boundaries.md)
- [`docs/design-explorations/meals-recipes-groceries/object-models.md`](../design-explorations/meals-recipes-groceries/object-models.md)
- [`docs/design-explorations/food-ai-operating-layer/`](../design-explorations/food-ai-operating-layer/)
- [`docs/design-explorations/meals-recipes-groceries/04-learning-release.md`](../design-explorations/meals-recipes-groceries/04-learning-release.md)

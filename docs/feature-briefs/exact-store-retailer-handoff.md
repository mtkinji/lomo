---
id: brief-exact-store-retailer-handoff
title: Exact-store retailer handoff
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [household-food-loop]
owner: andrew
last_updated: 2026-08-13
---

## Context

Kwilt already finds nearby Kroger-family stores, lets the user choose one, and
matches products against that exact Kroger location. The public Kroger Cart API
does not accept a store identifier and does not reveal the retailer account's
active pickup store. A successful cart write can therefore land in a retailer
cart whose pickup store differs from the store selected in Kwilt.

## Target audience

`audience-aspirational-family-organizers` needs retailer handoff to remove
re-entry without creating another store-management ritual or silently changing
a household decision.

## Representative persona

Maya has reviewed her grocery list and selected the store she intends to use.
She expects that choice to survive the handoff. Discovering a different store
at checkout makes the automation feel less dependable than doing the work
herself.

## Aspirational design challenge

How might we carry Maya's chosen store into the retailer handoff with almost no
repeat work, while remaining truthful about the verification Kroger's public
API does not provide?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the reviewed grocery work should reach
a buying surface instead of becoming another task Maya must reconstruct.

## Job flow step

`job-flow-maya-feed-household-with-less-work`, step 14, **Reach a buying
surface**. The existing score is 2: exact-store product matching and cart-add
exist, but retailer-store continuity is not provider-verifiable.

## JTBD framing

When I am ready to buy, move the reviewed work into the exact pickup store I
chose, so I do not reconstruct the cart or discover a store mismatch at
checkout. Preserve `jtbd-carry-intentions-into-action` by carrying the decision
forward and `jtbd-trust-this-app-with-my-life` by distinguishing user-confirmed
store pairing from retailer-verified state.

## Design

- Leave nearby-store discovery and preferred-store behavior unchanged.
- Treat the selected store as authoritative for product matching, header state,
  and handoff.
- Route each recognized Kroger-family banner to its own storefront rather than
  defaulting every handoff to Kroger.com.
- Before the first cart write for a store, send the user to that banner and ask
  them to confirm its pickup store. Do not mutate the retailer cart first.
- Persist a person/device-scoped receipt with provider, exact location id,
  banner, address, timestamp, and `user_confirmed` authority.
- Reuse that receipt only for the exact location. Selecting another store or
  reconnecting a retailer account requires confirmation again.
- Require every public-API cart mutation to carry an exact-store confirmation
  assertion matching the server-held selected location.
- After acknowledgement, name the exact store in the receipt and leave
  substitutions, scheduling, payment, and checkout with the retailer.
- A future Kroger partner contract may replace `user_confirmed` with
  `provider_verified` without changing store discovery or the surrounding cart
  flow.

### UI contract

Job: When the cart is ready for handoff, the user needs to preserve the chosen
pickup store before Kwilt writes anything, so the cart does not quietly land in
the wrong place.

Authority chain: explicit selected-store decision -> Kroger public API boundary
-> Kwilt local components and tokens -> platform browser return behavior.

Three-second read: **Confirm pickup store**, exact address, one next action.

Primary action: first `Set pickup store at [banner]`, then `Yes, add N items`
after returning.

Primary information: banner and full selected-store address.

Secondary information: the confirmation is supplied by the user because the
retailer cannot currently be queried for it.

Reveal later: `Check [banner] again` appears only after the first retailer
round-trip.

Must not add: another store finder, a global setting, automatic proximity-based
store switching, or Kroger-verified language.

Required states: exact-store receipt present, receipt absent, changed store,
retailer reconnect, retailer browser dismissed, cart acknowledged, ambiguous
cart write, and provider unavailable.

## Success signal

On first use or after changing stores, no retailer cart mutation occurs before
the user confirms the exact store. A repeat handoff to the same store is one
tap. A Seattle QFC or Fred Meyer selection routes to that banner and never
inherits a Saratoga Springs confirmation.

## Spec refinement

- The public API cannot prove the active retailer store, so the receipt is
  deliberately `user_confirmed`, not provider-authoritative.
- The receipt is local and person-scoped for this release; cross-device pairing
  is deferred until a provider-verifiable or account-identifiable contract is
  available.
- Store discovery, ranking, preferred-store selection, and product-matching
  activation remain unchanged.
- Acceptance requires focused Jest and Deno regression coverage, app and test
  typechecks, product/architecture lint, and real iOS observation before calling
  the UI complete. Testing must not write to Andrew's real retailer cart.

## Open questions

- Can an approved Kroger Partner API set and read back a cart's exact
  fulfillment location, replacing the user-confirmed receipt?

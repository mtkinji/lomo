---
feature: groceries
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
job_flows:
  - job-flow-maya-feed-household-with-less-work
  - job-flow-maya-move-family-life-forward
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-invite-the-right-people-in
  - jtbd-review-budget-reality-before-spending
  - jtbd-trust-this-app-with-my-life
  - jtbd-understand-why-ai-suggested-this
briefs:
  - household-food-loop
  - exact-store-retailer-handoff
  - online-grocery-cart-concierge
status: draft
last_reviewed: 2026-08-16
---

# Groceries

Owns deterministic ingredient compilation, household additions and state,
retailer product evidence, current prices and offers, savings review, handoff,
receipt reconciliation, and realized-outcome truth.

The first direct retailer adapter is Kroger-family cart-add. A reviewed, synced
Grocery List can connect the user's retailer account, select a location,
propose store-specific products, persist only explicit confirmations, and add
those UPCs to the retailer cart. Because the public Cart API cannot set or read
the retailer account's active pickup store, Kwilt requires a person-confirmed
exact-store pairing before the first write and after a store or account change.
The retailer remains authoritative for substitutions, pickup or delivery,
payment, and checkout. Plain copy/share stays available.

Production schema and Edge Functions were deployed on 2026-08-08 with the
provider remote-disabled. Live enablement still requires Kroger developer
client credentials, the registered production callback URL, and signed-device
proof against a disposable Smith's cart. No coupon or order authority is
claimed.

The accepted online cart-concierge direction keeps the Grocery list as the
complete in-store experience. `Shop online` will collect stable fulfillment and
retailer preferences, prepare an exception-light cart where a provider permits
it, surface only evidence-backed savings, and preserve the exact remainder.
Amazon and Walmart have product-ready, approval-gated outbound assistance. An
approved retailer can become the preferred hero outcome. Amazon-first bypasses
the retailer overview: a transient whole-list preparation moment reports the
ready count and remainder, then waits for explicit `Open Amazon` consent. It
quietly leaves uncertain items on the Grocery list. A live handoff occurs only
for a provider-issued Amazon cart URL;
internal previews without provider evidence do not claim that any item is
ready and instead offer another retailer. Walmart retains
resumable explicit `reported added` or `kept for later` progress until its batch
provider contract is proved. Neither path creates order evidence. Costco
remains outside the executable online list.

Runtime capability is distinct from preference: a retailer may be
`cart_prepare`, `product_links`, `remembered_only`, or `unavailable` for the
requested fulfillment mode. Learning release A is Kroger-family pickup only;
Kroger delivery requires its own disposable-cart proof, while Amazon and
Walmart require exact-surface approval, configured qualifying-link formats,
and live attribution before their disabled gates may be enabled. Source completion, Simulator proof,
signed-device cart proof, TestFlight household use, and production affiliate
attribution remain separate evidence levels.

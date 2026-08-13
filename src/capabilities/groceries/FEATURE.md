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
briefs:
  - household-food-loop
  - exact-store-retailer-handoff
  - online-grocery-cart-concierge
status: draft
last_reviewed: 2026-08-08
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
Amazon and Walmart remain approval-gated outbound assistance, and Costco is a
remembered preference rather than an executable integration.

# Household Food provider feasibility

Verified against public documentation on 2026-08-05. No live credentials were
available in this worktree, so provider behavior is **fixture-proven and
documentation-supported, not live-account proven**.

## Deliverable without a negotiated partnership

| Path | What Kwilt can ship | What remains at the retailer | Proof state |
|---|---|---|---|
| Plain list | Grouped copy/share/print-friendly list | Product selection and checkout | Source and Jest proven |
| Instacart Developer Platform | Server-created shopping-list page and nearby retailer lookup with an ordinary developer API key | Product matches, retailer selection, substitutions, prices, cart, fulfillment, payment, checkout | Official docs + deterministic adapter fixtures; live key gated |
| Kroger Public APIs | Locations and product proposals after self-service app registration; user-authorized cart add is technically represented | Confirm each product; inspect the write-only retailer cart; checkout, fulfillment, payment | Official Kroger public workspace + fixtures; customer OAuth/cart write gated |

Instacart documents `POST /idp/v1/products/products_link` as returning a
shopping-list page where the user chooses a store, adds products, and checks
out. It explicitly says development/production API calls do not become an order
without Marketplace checkout:

- https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
- https://docs.instacart.com/developer_platform_api/get_started/recipe
- https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers/

Kroger's public workspace documents self-service application registration,
location/product reads, and `PUT /cart/add` with a customer Authorization Code
grant. The public cart endpoint returns an acknowledgement but does not prove
checkout or order completion:

- https://www.postman.com/kroger/the-kroger-co-s-public-workspace/documentation/ki6utqb/kroger-public-apis
- https://www.postman.com/kroger/the-kroger-co-s-public-workspace/request/mwiie4o/add-to-cart

## Deliberate exclusions

- Automatic coupon activation is not enabled: no public, tested enumeration +
  eligibility + activation + acknowledgement chain is available here.
- Kroger cart add is disabled until G6 proves customer OAuth, exact scopes,
  token-vault storage, store coverage, and an authorized real-cart test. Because
  the public write is ambiguous when the response is lost, Kwilt says **Check
  retailer cart** and does not retry blindly.
- Walmart, Target, Harmons-direct, and universal checkout have no runtime
  adapter in the no-negotiation lane.
- “Ordered,” “paid,” “delivered,” and realized savings are unreachable without
  provider order or reviewed receipt evidence.

## Local evidence

`npm run food:feasibility -- --fixture-dir scripts/fixtures/food-providers`
passed with five redacted observations. Instacart list link/retailer lookup and
Kroger location/product fixture cases proceeded; Kroger cart add remained
`blocked_by_access`. Every fixture declares checkout and coupon activation
false. No secrets, product text, retailer account identifiers, or raw provider
responses are written to evidence.

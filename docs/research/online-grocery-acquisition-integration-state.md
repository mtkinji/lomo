# Online Grocery Acquisition Integration State

**Reviewed:** 2026-08-14
**Status:** Current integration and partner-access assessment
**Audience:** Product, engineering, partnership, and release decisions
**Related job flow:** `job-flow-maya-feed-household-with-less-work`, step 14,
“Reach a buying surface”

## Executive conclusion

Kroger is currently Kwilt's only credible path to a **direct authenticated
retailer-cart write**. Its APIs expose store-specific product search and allow
UPC items to be added to an authenticated customer's cart. Kwilt already has
the corresponding protected OAuth, matching, cart-add, idempotency, remainder,
and recovery architecture. Production remains disabled pending Kroger
credentials, callback registration, and a signed-device disposable-cart test.

Instacart is the strongest second path and may now be actionable sooner than
our earlier research suggested. Instacart's current documentation, updated
July 20, 2026, invites developers to **Apply today** and estimates roughly
30–40 days from access request through demo approval and production-key access.
We should therefore treat the program as **apparently reopened, but access not
yet verified for Kwilt**, rather than as indefinitely closed.

Instacart can accept a complete Kwilt list and return a hosted Instacart
shopping-list URL. Instacart then performs store and product matching; the
shopper selects a store, reviews products, adds the wanted items to the cart,
and checks out on Instacart. This removes list reconstruction, but it is not the
same as Kwilt directly writing a final cart without retailer review.

Amazon and Walmart can support attributed product or search links after their
respective approval gates, but neither currently exposes a documented public
consumer-cart interface that supports Kwilt's intended whole-list workflow.
They should not be treated as substitutes for Kroger or Instacart.

## The capability distinctions that matter

The word “integration” hides several materially different capabilities. Kwilt
must keep them separate in product copy, code, analytics, and partnership
claims.

1. **Affiliate attribution** — a qualifying click or purchase may generate
   revenue. This says nothing about product matching or cart creation.
2. **Product discovery** — Kwilt can search a retailer catalog or open a
   retailer search/product page. This says nothing about cart contents.
3. **Hosted whole-list handoff** — Kwilt sends a full list to a retailer-owned
   review page. The retailer matches products and the shopper completes the
   cart there.
4. **Authenticated cart write** — Kwilt sends specific retailer product IDs and
   quantities into the shopper's existing retailer cart after authorization.
5. **Order authority** — an integration can place, pay for, schedule, observe,
   or modify an order. Kwilt has no verified order authority with any retailer.

Kwilt's core promise requires at least capability 3. Capability 4 is the
strongest currently reasonable experience. Capability 1 or 2 alone does not
remove enough grocery-shopping work to carry the primary `Shop online` story.

## Current provider assessment

| Provider | Published consumer workflow | Best supported capability | Kwilt state | Main gate | Product conclusion |
| --- | --- | --- | --- | --- | --- |
| **Kroger family** | Search a selected store, choose UPCs, authorize the customer, and add items to the authenticated retailer cart. The retailer owns substitutions, fulfillment, payment, and checkout. | **Authenticated cart write** | Source-proven adapter and recovery flow; production schema/functions deployed but remote-disabled. | Kroger credentials, registered callback, exact Smith's store/cart proof, and commercial terms. | **Primary path to the intended purchase workflow.** |
| **Instacart** | Send a whole list to an Instacart-hosted shopping page; shopper selects a store, reviews matches, adds preferred products, and checks out on Instacart. | **Hosted whole-list handoff** | Payload adapter, Edge Function, idempotent handoff, compliant CTA, and failure recovery already exist behind a disabled gate. | Confirm application intake for Kwilt, obtain development key, pass demo review, receive production key, and separately activate affiliate attribution. | **Best second path and potentially available now.** It removes reconstruction but does not prove direct cart mutation by Kwilt. |
| **Walmart** | Approved affiliate product/search links. Published Marketplace APIs serve sellers and solution providers managing catalog, inventory, fulfillment, and orders. | **Product-link assistance** | Resumable item-by-item assistance exists for testing; no provider cart receipt. | Affiliate approval, approved mobile link format/feed, attribution proof, and any separately negotiated consumer-cart capability. | Useful secondary monetized handoff, not a primary cart workflow. |
| **Amazon** | Approved product/search links and catalog discovery through Creators API. The current public API lists search/get operations, not cart operations. | **Product-link assistance** | Associates account setup is underway; internal fake-cart preview was removed. No real catalog credentials, ASIN matches, or provider cart URL are connected. | Final Associates acceptance, approved mobile surface, Creators API access, attribution proof, and a separate supported cart mechanism if one becomes available. | Do not position as whole-list fulfillment. |
| **Costco** | No verified direct Kwilt cart integration. Costco inventory may be reachable as a store selected inside Instacart where available. | **Potentially covered through Instacart** | No executable direct provider. | Instacart access and local Costco availability, or a future direct agreement. | Keep outside the direct provider list; let Instacart own store availability. |

## What Kroger can and cannot deliver

### What it can deliver

- Search products for a specific Kroger-family location.
- Return retailer product identifiers, product/package information, observed
  price/promotion evidence, and fulfillment availability where supplied.
- Add reviewed UPCs and retail quantities to an authenticated customer's cart.
- Preserve Kwilt's unresolved remainder when a product is uncertain,
  unavailable, removed, or not acknowledged.
- Open the appropriate Kroger-family cart for final retailer review.

### What it does not prove

- The final cart contents, total, fees, tax, coupons, substitutions, or time
  slot.
- That checkout or purchase occurred.
- That pickup or delivery was completed.
- Affiliate or revenue-share compensation. Commercial attribution is a
  separate negotiation from API access.

### Current Kwilt proof boundary

- The application architecture and tests exist.
- Production database and Edge Function scaffolding were deployed with the
  provider intentionally disabled.
- A real Kroger credential exchange and disposable Smith's cart have not been
  proved on a signed device.
- Until that drill succeeds, `In Smith's cart` remains a designed contract, not
  a production claim.

## What Instacart can and cannot deliver

### The documented list-page workflow

Instacart's `POST /idp/v1/products/products_link` endpoint accepts a list of
line items. Kwilt can send:

- product/ingredient names;
- display text;
- quantities and supported measurements;
- optional UPCs or Instacart product IDs;
- optional approved brand and health filters;
- a link back to Kwilt.

The endpoint returns an Instacart-hosted shopping-list URL. On that page:

1. the shopper selects a store;
2. Instacart maps the list to products available at that store;
3. the shopper reviews the matches and quantities;
4. the shopper adds preferred products to the cart;
5. the shopper signs in if necessary and checks out on Instacart.

The returned URL supports deep linking into the Instacart app.

### How closely this matches Kwilt's intended experience

| Desired behavior | Instacart fit |
| --- | --- |
| Send the whole reviewed list without retyping | **Yes.** This is the core list-page contract. |
| Match products against a local store | **Yes, retailer-owned.** The shopper selects the store and Instacart performs matching. |
| Preserve quantities and useful product constraints | **Yes, bounded by supported measurements, identifiers, and filters.** |
| Automatically place every confident item in a final cart from Kwilt | **Not established.** The documented flow says the shopper reviews and adds preferred items on Instacart. |
| Support pickup or delivery | **Handled by Instacart and the selected retailer at checkout.** Kwilt should not promise a mode until the returned experience proves it. |
| Attribute resulting orders | **Potentially.** Active Developer Platform partners may apply to the Impact affiliate program; actual attribution must be configured and observed. |
| Observe the completed order | **Not part of the list-link evidence reviewed here.** Kwilt must not infer purchase from link creation or opening. |

Instacart therefore satisfies the consumer job much better than Amazon or
Walmart even without direct cart mutation: it transfers the whole list and
centralizes store/product review on one retailer-owned surface.

### Program-access update

Earlier project documentation recorded that Instacart was not accepting new
Developer Platform applications. That evidence is now stale. As of this review:

- the official Get Started page says `Apply today`;
- the page says the average integration takes approximately 30–40 days from
  access request to demo approval and production-key access;
- the developer dashboard documentation describes development and production
  API keys;
- production approval includes a screen-recorded integration review;
- approved partners that want affiliate payments receive an Impact invitation
  and must verify the returned attribution parameters.

This does **not** prove that Kwilt will be accepted. It does mean the next action
is to attempt the current application/dashboard path now, not wait passively
for an unspecified reopening.

## Why Amazon and Walmart do not currently carry the primary workflow

### Amazon

Amazon's current Creators API supports product search and item retrieval. The
published operation list does not include cart creation. The older Product
Advertising API cart operations were removed, and the former Add-to-Cart
documentation now redirects to the PA-API deprecation notice. An Amazon link
can open the Amazon app and preserve approved attribution, but it cannot be
described as a populated Kwilt cart without a separate supported contract.

### Walmart

Walmart's public Marketplace APIs are documented for sellers and approved
solution providers managing their Walmart business: listings, inventory,
pricing, fulfillment, and seller orders. The reviewed public documentation did
not expose a shopper-cart endpoint for an affiliate application. Impact
approval or a product feed could improve discovery and monetization, but it
would not by itself create a consumer cart.

## Recommended strategy

### 1. Keep Kroger as the primary direct-cart integration

Complete the Kroger access path and prove one disposable Smith's pickup cart.
The proof must include exact-store confirmation, product matching, the cart
write acknowledgement, the unresolved remainder, and retailer-owned checkout.

### 2. Re-enter the Instacart access path immediately

Treat Instacart as an active second workstream rather than a dormant option:

1. attempt the current `Apply today` or developer-dashboard path;
2. request a development API key for Kwilt;
3. use the existing `grocery-handoff` adapter to generate one realistic list;
4. inspect match quality and correction burden on a signed device;
5. submit the required demo for production approval;
6. activate and verify Impact attribution only after platform approval.

Instacart may ultimately serve more households and banners than Kroger, while
Kroger provides the more direct cart-write experience.

### 3. Demote Amazon and Walmart to honest secondary assistance

Keep them available only where their exact approved link surfaces are useful.
Do not route the primary whole-list experience through either provider unless
a documented or negotiated batch-cart capability becomes real.

### 4. Keep monetization separate from capability

Retailer priority remains a user preference. Revenue terms cannot promote a
weaker acquisition path above a provider that actually removes more work.
Record attribution as external commercial evidence, never as proof that items
entered a cart or that an order completed.

## Product and release claims allowed today

Kwilt may say:

- the Grocery list remains complete and usable in-store;
- Kroger-family cart preparation is built but awaiting live provider proof;
- Instacart whole-list handoff is implemented behind an access gate;
- Amazon and Walmart can provide approved outbound assistance when configured.

Kwilt may not yet say:

- Kwilt orders groceries;
- Amazon or Walmart receives a populated cart;
- a Kroger item is in a real cart without a live provider acknowledgement;
- an Instacart link means products were added or purchased;
- any provider generates revenue until attributed orders appear in its
  reporting.

## Next evidence gates

| Priority | Gate | Evidence required |
| --- | --- | --- |
| 1 | **Instacart intake** | Kwilt account/application accepted far enough to issue a development API key. |
| 2 | **Kroger access** | Client credentials and production callback accepted. |
| 3 | **Kroger disposable-cart drill** | Signed-device recording and provider evidence for exact-store cart addition and remainder. |
| 4 | **Instacart list-quality drill** | Real hosted list URL, store selection, matched/unmatched audit, quantity audit, and checkout continuation. |
| 5 | **Production approval** | Kroger enablement and/or Instacart production key after provider review. |
| 6 | **Commercial proof** | One qualifying attributed order visible in provider reporting under accepted terms. |
| 7 | **Household proof** | Repeated TestFlight use showing meaningful browsing-time or trip reduction. |

The job-flow delivery score for “Reach a buying surface” should remain **2/5**
until a signed-device disposable-cart or real Instacart list-page drill proves
that a household can reach retailer review without reconstructing the list.

## Sources

- [Instacart Developer Platform introduction](https://docs.instacart.com/developer_platform_api)
- [Instacart Get started](https://docs.instacart.com/developer_platform_api/get_started/overview)
- [Instacart Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page)
- [Instacart shopping-list workflow](https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list)
- [Instacart approval process](https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/approval_process/)
- [Instacart conversion tracking and affiliate payments](https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments/)
- [Kroger official Postman workspace: Add to cart](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/request/7uyizn9/add-to-cart)
- [Kroger official Postman workspace: Product list](https://www.postman.com/kroger/the-kroger-co-s-public-workspace/request/cx3ttq9/product-list)
- [Amazon Creators API operations](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference)
- [Amazon PA-API deprecation notice](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation)
- [Walmart Marketplace API introduction](https://developer.walmart.com/us-marketplace/docs/introduction-to-marketplace-apis)

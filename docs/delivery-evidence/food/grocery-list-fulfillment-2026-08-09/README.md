# Grocery list and direct fulfillment proof

Source checkout: `/Users/andrewwatanabe/Kwilt`

Source branch: `feature/grocery-list-fulfillment`

Base commit: `4a87c06c`

Runtime: iPhone 17 Pro Simulator, iOS 26.5, existing Kwilt development build connected to Metro from this checkout on port 8081.

## Proof sequence

1. `01-grocery-list.png` — the primary surface is a grouped grocery checklist. It has no introductory item count, review prompt, repeating status label, or repeating Why action. The familiar Plan icon and two-meal counter remain in the top-right header.
2. `02-covered-check-treatment.png` — checking flour uses the same filled check and strikethrough treatment as Recipe ingredients, and the dock updates from 15 to 14 remaining.
3. `03-direct-fulfillment.png` — historical generic handoff capture, superseded by the preferred-store flow below.
4. `04-reviewed-items-menu.png` — checked-item review is available from the header menu as `Review checked items`, rather than as a separate on-canvas action.
5. `05-preferred-store-action.jpeg` — historical preferred-store treatment, superseded by the store-agnostic `Shop online` flow below.
6. `06-direct-smiths-connect.jpeg` — historical connection-first treatment, superseded by choosing a Kroger-family store before authentication.
7. `07-shop-online-list.jpeg` — the grocery list's dominant action is `Shop online`; Plan context remains in the top-right header and no retailer is prematurely implied.
8. `08-kroger-family-store-results.jpeg` — a real production lookup for ZIP 84045 returns nearby Kroger-family stores before OAuth, including the Saratoga Springs Smith's.
9. `09-pre-oauth-match.jpeg` — historical confirmation-first treatment, superseded by the automatic product-matching transition below.
10. `10-real-product-matches.jpeg` — real production Kroger catalog results show product, package, fulfillment availability, and price. No retailer account was connected and no cart was written for this proof.
11. `11-simplified-store-picker.jpeg` — the revised store picker removes the redundant `Choose a store` heading and explanatory paragraph. `Shop online`, ZIP code, and `Find stores` are the complete first read.
12. `12-store-selection-starts-matching.jpeg` — tapping the Saratoga Springs store immediately starts product matching while preserving a quiet `Change` action; there is no review-confirmation button.
13. `13-direct-product-matches.jpeg` — the same automatic transition resolves to real production product matches, with the selected store remaining visible and changeable.
14. `14-compact-store-selector.jpeg` — once chosen, the full store name, address, and separate `Change` action collapse to the quiet `Smith's` selector and down chevron. Activating it returned to the store picker in the live Simulator.
15. `15-cart-style-product-selection.jpeg` — historical selection-list treatment, superseded by the checkbox-free cart below.
16. `16-typical-cart-lines.jpeg` — `Cart` leads the header, the compact `Smith's` selector is anchored at top right, and each automatically matched product is a plain cart line with package details, store price, retail package quantity, Edit, and Remove. There are no product-selection checkboxes or radios.
17. `17-cart-pickup-subtotal.jpeg` — historical floating-action treatment, superseded by the full-width handoff footer below.
18. `18-cart-thumbnails-full-width-handoff.png` — real production Kroger thumbnails make the prepared cart legible at a glance. The full-width safe-area footer shows the $27.01 estimated item subtotal and the exact `Add 8 items to Smith's` action, with final-total boundaries immediately below it.
19. `19-cart-product-replacements.png` — the first thumbnail-enabled replacement render exposed unrelated cocoa results for baking powder; this is retained as critic evidence rather than acceptance evidence.
20. `20-cart-relevant-product-replacements.png` — the corrected Edit state keeps only phrase-relevant baking-powder alternatives, with thumbnail, package, and price, while the cart and footer stay in place.
21. `21-cart-quantity-subtotal-update.png` — increasing baking powder from one to two retail packages updates the line to `$3.59 each`, the line total to `$7.18`, and the estimated item subtotal from `$27.01` to `$30.60` without touching the grocery-list quantity.

## Visual acceptance

Three-second read: pass. The list is the first and largest object; Plan is visible context; the Sumi fulfillment action is the dominant action.

Scan order: pass. Groceries and Plan, aisle-grouped items, then the resting bottom dock.

Reduction: pass. Removed `15 things to get`, `Review what I already have`, `List looks right`, repeated Need/Have labels, and repeated Why buttons.

Color: pass. The fulfillment action uses the canonical dark primary treatment; no green CTA was introduced.

Runtime behavior: partial pass. A real persisted item toggle updated the checklist. `Shop online` performed a production Kroger-family store search, selected the Saratoga Springs Smith's, allowed changing that selection, and returned real product matches without OAuth. Production schema and Edge Function receipts are deployed. OAuth, cart acknowledgement, and remainder rendering remain covered by source/tests rather than retailer-connected runtime proof.

Store-picker refinement: pass. The visible focal points are `Shop online`, ZIP code, and `Find stores`; there is one dominant action and no helper copy compensating for the structure. Selecting a real store was observed transitioning through `Finding products…` directly to product matches without an intervening tap.

Selected-store reduction: pass. The store is secondary context rather than a header block: one compact, accessible selector remains above product matches, while address and alternatives are revealed only when changing stores.

Cart-pattern refinement: pass. The default scan is an automatically populated, reversible handoff cart rather than a match-review form. `Cart`, real product thumbnail/package/price, `Qty 1`, Edit, Remove, estimated item subtotal, and `Add 8 items to Smith's` were observed with real Saratoga Springs catalog data. The full-width footer is one coherent decision region rather than a detached floating button. A regression test proves five recipe teaspoons cannot become five retail packages; each match begins at one package and changes only through the cart quantity controls.

Price truth: pass within the stated boundary. The visible subtotal totals the current regular or promotional item prices returned for the selected store at match time. It is labeled `Estimated subtotal` and immediately distinguishes the later retailer-owned pickup, substitutions, fees, taxes, weighted-item changes, coupons, and final total. It is not described as a quote.

Handoff continuity: pass in source and component proof. The bottom action names the mutation—`Add N items to Smith's`—and, after Kroger acknowledges the UPC/package quantities, opens the retailer cart directly. The success state retains an `Open Smith's cart` recovery path when the user returns. The live critic pass intentionally did not press the action because doing so would mutate Andrew's real retailer cart.

Fresh visual critic: pass after one correction. The intended focal points were independently visible as cart identity/store, thumbnail-led product rows, then estimated subtotal and handoff action. One dominant action and one footer surface were present. The first replacement render failed semantic relevance by showing cocoa for baking powder; phrase-level filtering removed those choices and the corrected state was rerendered in `20-cart-relevant-product-replacements.png`.

Remaining release gates: retailer-connected cart-add/open proof, signed-device accessibility/large-text proof, and TestFlight. TestFlight is intentionally paused.

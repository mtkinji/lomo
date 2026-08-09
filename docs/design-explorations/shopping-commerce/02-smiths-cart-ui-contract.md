# Smith's cart learning-release UI contract

**Job:** When a reviewed Grocery List is ready, the user needs to turn its food
concepts into specific Smith's products so they can complete pickup or delivery
with the retailer.

**Authority chain:** explicit user decisions; Groceries capability boundary;
Kwilt UI constitution, pattern atlas, tokens, and local components; iOS and
Android conventions; React Native Reusables as generic component-quality
reference. No external visual exemplar.

**Three-second read:** Shop at Smith's.

**Primary action:** Exactly one state-dependent action: connect, find a store,
review matches, add confirmed items, or open the retailer cart.

**Primary information:** Selected Smith's location, original grocery concept,
needed quantity, proposed product, package size, pickup availability, and
observed regular or promotional price.

**Secondary information:** Match progress and the limits of retailer evidence.

**Reveal later:** Alternatives appear only during product review. OAuth scopes,
tokens, coupons, fulfillment configuration, and checkout do not appear here.

**Scan order:** Current job and store -> grocery concept -> proposed products ->
one primary action.

**Must not add:** Green buttons, a second dominant action, coupon claims,
automatic uncertain matches, checkout claims, or automatic retry after an
ambiguous cart write.

**Reuse map:** `AppShell`, `PageHeader`, `Heading`, `Text`, `Input`, `Button`,
and tokenized inline product rows. Plain list copy/share remains on the parent
handoff surface.

**Required states:** Loading, provider unavailable, disconnected, connected
without store, store results, no match, partial match, adding, acknowledged,
ambiguous write, and ordinary failure.

**Proof path:** Food -> Groceries -> reviewed list -> Shop groceries -> Shop at
Smith's, on the simulator and then a signed device with a disposable retailer
cart.

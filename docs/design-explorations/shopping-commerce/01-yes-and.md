# Yes-and: Groceries-Led Shopping

## Original idea

Build toward Shopping as a general household acquisition capability while
leading with a focused, complete Groceries experience.

## Strategic shape

```text
Now:       Recipes → Plan → Groceries → retailer
                              ↑
                       household additions

Later:     capability needs ─┐
            manual capture ──┼→ Shopping → retailer
            recurring needs ─┘      ↑
                                  Groceries remains
                                  the leading context
```

“Shopping” is initially an architectural truth, not a navigation promise.
“Groceries” is initially the product people can understand, use, and judge.

## Adjacencies

### 1. Accept ordinary household supplies without announcing a new system

**Yes, and what if Groceries quietly accepted foil, detergent, paper towels,
dog food, and similar store-run needs alongside food?**

- **Serves:** `jtbd-capture-and-find-meaning`
- **Job elevation:** The household can capture the real trip rather than only
  the Recipe-derived portion of it.
- **New value:** Early evidence reveals where the grocery boundary naturally
  stretches before Kwilt renames or expands the capability.
- **Cost delta vs. original:** Low in interaction; medium in item taxonomy.
- **Anti-pattern check:** Pass if category assignment is optional and
  retrospective. Fail if capture requires classification.

### 2. Make Recipe provenance one source among several

**Yes, and what if every list item could state why it is there—Recipe,
household request, staple, or manual addition—without one source owning the
list?**

- **Serves:** `jtbd-trust-this-app-with-my-life`
- **Job elevation:** Maya can understand and safely edit a combined list.
- **New value:** The model can later accept needs from other capabilities
  without migrating away from a food-only parent object.
- **Cost delta vs. original:** Medium.
- **Anti-pattern check:** Pass if provenance remains compact and useful. Fail
  if the list becomes an audit log or family surveillance feed.

### 3. Let the household add needs at the moment they notice them

**Yes, and what if a family member could add milk or shampoo through Groceries,
voice, Chat, or a contextual action without knowing which list or store it
belongs to?**

- **Serves:** `jtbd-carry-intentions-into-action`
- **Job elevation:** A noticed need survives the interruption and reaches the
  shared buying surface.
- **New value:** Groceries becomes a household habit rather than an organizer's
  end-of-planning artifact.
- **Cost delta vs. original:** Medium because shared authority and capture
  receipts must remain exact.
- **Anti-pattern check:** Pass when capture is consent-first and capability-
  owned. Fail if Chat silently infers and adds purchases.

### 4. Organize for the trip without making users administer stores

**Yes, and what if Kwilt grouped the list into useful store sections and showed
where an item is likely obtainable, while keeping one obvious household list?**

- **Serves:** `jtbd-carry-intentions-into-action`
- **Job elevation:** The list becomes faster to execute in a real aisle or
  retailer app.
- **New value:** Grocery-derived and household-supply items can coexist without
  requiring named Kroger, Costco, and Target lists.
- **Cost delta vs. original:** Medium.
- **Anti-pattern check:** Pass if grouping is automatic and easily corrected.
  Fail if store configuration becomes prerequisite administration.

### 5. Earn from an intentional retailer handoff

**Yes, and what if “Shop this list” prepared the items a retailer can match,
preserved the unmatched remainder, and earned Kwilt an attributed commission
when the user completes a qualifying purchase?**

- **Serves:** `jtbd-carry-intentions-into-action`,
  `jtbd-trust-this-app-with-my-life`
- **Job elevation:** Kwilt is paid for removing reconstruction work from a
  purchase the household already intended.
- **New value:** A revenue event aligns with a completed user job rather than
  attention or ad impressions.
- **Cost delta vs. original:** High because provider access, attribution,
  product matching, recovery, disclosure, and conversion truth must be real.
- **Anti-pattern check:** Pass only if Kwilt states that it may earn a
  commission and affiliate status never changes ranking.

### 6. Preserve a trustworthy non-commercial path

**Yes, and what if every list could still be checked off in-store, copied, or
shared even when no affiliate retailer supports the trip?**

- **Serves:** `jtbd-trust-this-app-with-my-life`
- **Job elevation:** The household can depend on Groceries without depending on
  Kwilt's partnerships.
- **New value:** Provider outages and geographic gaps do not strand the job.
- **Cost delta vs. original:** Low because list execution already exists.
- **Anti-pattern check:** Pass when the fallback is dignified and equally
  visible. Fail if the affiliate route is styled as the only complete action.

### 7. Reconcile what was actually bought

**Yes, and what if retailer acknowledgement or a receipt could mark fulfilled
items, preserve unmatched needs, and inform the next grocery cycle without
claiming more than the evidence proves?**

- **Serves:** `jtbd-review-budget-reality-before-spending`,
  `jtbd-trust-this-app-with-my-life`
- **Job elevation:** Shopping completion reduces repeated work and gives Money
  accurate purchase evidence.
- **New value:** Kwilt can distinguish listed, handed off, purchased, and paid
  rather than treating a click as success.
- **Cost delta vs. original:** High.
- **Anti-pattern check:** Pass with reviewable receipts and capability
  boundaries. Fail if affiliate conversion data is treated as complete basket
  or financial truth.

### 8. Let generic Shopping emerge from observed use

**Yes, and what if Kwilt watched only product-level usage signals—not private
behavioral advertising profiles—to learn when non-food needs justify a visible
Shopping expansion?**

- **Serves:** `jtbd-trust-this-app-with-my-life`
- **Job elevation:** The product expands because households are already using
  it that way, not because affiliate categories pay more.
- **New value:** A later rename to Shopping can arrive with real supporting
  behavior, categories, and retailer coverage.
- **Cost delta vs. original:** Low for aggregate capability events; high if
  product semantics become overly detailed.
- **Anti-pattern check:** Pass with minimal, disclosed instrumentation and no
  sale of list contents. Fail with cross-context targeting or item-level ad
  profiling.

## Expansion gates

Keep the visible capability named **Groceries** until the evidence shows all of
the following:

1. households repeatedly add meaningful non-food items without prompting;
2. those additions fit the same capture, sharing, completion, and retailer
   lifecycle;
3. users try to retrieve the combined list as “shopping,” not only while
   grocery shopping;
4. at least one provider can usefully fulfill non-food categories without
   degrading grocery fulfillment;
5. the broader label improves comprehension rather than making Kwilt feel like
   a marketplace.

The code and data model should be ready for this expansion before the interface
advertises it.

## Frame recommendation

**Run the design-thinking loop with the expanded internal frame and the narrow
external promise.**

- Internal architecture: **Shopping** owns intended physical acquisitions,
  source provenance, fulfillment, and purchase receipts.
- Initial navigation and copy: **Groceries**.
- Initial complete journey: Recipe or manual need → one shared Grocery List →
  in-store execution or truthful retailer handoff.
- Initial monetization: affiliate attribution on explicit handoff only.
- Deferred: generic Shopping navigation, product discovery, sponsored results,
  multiple store lists, and affiliate-led recommendations.

This sequencing preserves a small product surface while avoiding a food-only
architecture that would have to be replaced just as the business begins to
work.

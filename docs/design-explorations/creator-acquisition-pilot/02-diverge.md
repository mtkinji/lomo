# Diverge: creator acquisition pilot

Axis of variation: where attribution truth lives — the web link, Apple's offer,
or Kwilt's own claimed campaign identity.

## Alternative A — Link-only campaign analytics

Each creator receives a landing page and App Store campaign link. Kwilt measures
clicks, installs where available, and aggregate conversion, but does not ask the
person to claim a code after installation.

- Persona fit: lowest friction for Marcus.
- Design-challenge answer: good for aggregate demand learning, weak for payout-grade truth.
- System fit: reuses the site and analytics with the smallest blast radius.
- Best when: Kwilt is paying only flat content fees.
- Fails when: a specific paid renewal must be attributed fairly after an App Store install.
- Primer check: passes calm UX; fails trust if probabilistic attribution determines money.

## Alternative B — Apple offer code as affiliate identity

Each creator promotes an Apple subscription offer code. Redemption supplies a
customer benefit and the RevenueCat webhook reports the offer code used.

- Persona fit: a familiar customer proposition.
- Design-challenge answer: strong purchase linkage, but the offer is tied to specific subscription products and eligibility rules.
- System fit: keeps billing entirely with Apple but cannot express all four current products through one simple universal code.
- Best when: testing a controlled discount on one product/storefront.
- Fails when: intro offers, multiple SKUs, pre-purchase activation, or non-discount campaigns need one stable identity.
- Primer check: passes if eligibility and non-stacking are explicit; fails if the code implies guaranteed savings.

## Alternative C — First-party claim plus Apple purchase

The creator link opens a job-specific landing page. After install, the person may
claim the creator code before purchase. Kwilt stores a server-owned, first-qualified
claim tied to the install and later the authenticated user. Apple still processes
the purchase; RevenueCat events drive a separate, idempotent commission ledger.

- Persona fit: one optional step in exchange for the creator's challenge/template and clear attribution.
- Design-challenge answer: connects a trusted demonstration to activation, paid value, and fair compensation.
- System fit: extends existing install identity, Edge Functions, RevenueCat mirror, and admin tooling.
- Best when: Kwilt needs deterministic payout attribution without changing billing.
- Fails when: code claiming is hidden, coercive, or allowed after purchase.
- Primer check: passes when skippable, privacy-safe, and non-promotional.

## Alternative D — External affiliate/MMP platform

Adopt a mobile measurement or affiliate network for deferred deep links,
multi-touch attribution, fraud scoring, partner portals, and payouts.

- Persona fit: invisible when configured well.
- Design-challenge answer: broadest channel infrastructure, but does not solve Kwilt's product-claim or activation design by itself.
- System fit: highest privacy, SDK, operational, and migration blast radius.
- Best when: creator volume and paid media justify a specialized system.
- Fails when: five pilot creators cannot generate enough signal to justify the platform.
- Primer check: acceptable only with strict data minimization; otherwise violates calm trust.

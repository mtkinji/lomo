# Learning Release: creator acquisition pilot

## Concept To Build

A five-creator, six-week US pilot that carries one approved advanced Screen Time
promise from creator content through a Kwilt code claim, optional seven-day
activation challenge, Apple subscription, retained paid conversion, and reviewed
creator commission.

## Capability Delta

Today, the user cannot:

- reliably continue a creator campaign across App Store installation;
- claim the creator's Kwilt activation experience before subscribing;
- know that the code does not bypass Apple's subscription terms.

After this release, the user can:

- land on a job-specific creator page;
- claim one creator code before purchase;
- receive the creator's optional challenge/template;
- purchase the ordinary Kwilt Pro subscription through Apple.

Still intentionally not supported:

- stacked discounts, claim switching, post-purchase attribution, public referrals, or creator access to user-level data.

## User Experience

Marcus sees a creator demonstrate a compound Screen Time rule. The campaign page
describes the same evidence-approved outcome, discloses the paid relationship,
and links to the App Store. After install, Kwilt offers a skippable creator-code
claim. Claiming confirms the creator and challenge; it does not grant Pro. When
Marcus asks to save an advanced rule, the ordinary contextual Pro interstitial
shows live StoreKit price and eligibility.

## Existing Product Relationship

The release extends site campaign routing, install identity, onboarding
continuation, the contextual paywall, RevenueCat lifecycle processing, and
super-admin operations. Friend referrals remain unchanged.

## Buildable Slice

Must be real:

- server-owned campaign resolution and pre-purchase claim;
- install-to-user association;
- first-qualified-claim and 30-day attribution rules;
- Apple/RevenueCat purchase and first-paid-period linkage;
- immutable commission events, refund reversals, 30-day hold, and reviewed export;
- privacy-safe funnel instrumentation and approved claim register.

Can be thin or temporary:

- creator onboarding, contracts, tax collection, invoices, and payouts are manual;
- challenge content may be editorially configured rather than self-served;
- reporting may be an internal export rather than a creator portal.

Intentionally excluded:

- external attribution SDK, automated payouts, lifetime revenue share, public partner APIs, and creator-specific Apple discounts.

## Release Channel

`Production-small` for five contracted creators and US storefront traffic after
the core monetization lifecycle, Screen Time signed-device proof, and App Review
claim gate pass. The creator pilot does not block the general Pro release; it
blocks only paid creator traffic.

## Brand-Goodwill Guardrails

- Creator disclosures appear in the content itself.
- The code claim is skippable and never changes access truth.
- Campaign copy uses only capabilities marked marketable in the evidence ledger.
- No private content, child identity, app selection, or financial detail enters campaign analytics.
- A kill switch can pause a campaign or all commission accrual without affecting subscriptions.

## Reversibility

Deactivate campaign resolution and claim creation while retaining immutable
audit rows. Existing subscriptions continue normally. Pending commissions can be
reviewed, paid, reversed, or voided by explicit status; no customer entitlement
depends on creator state.

## Permanent Product Threshold

At least three creators generate qualified first paid periods, attribution disputes
remain exceptional, refund/reversal behavior reconciles exactly, and modeled
12-month net revenue is at least three times fully loaded creator acquisition
cost before expanding the program or automating partner operations.

# Monetization release readiness — frame

Date: 2026-08-31

Status: converged for planning

Related brief: `docs/feature-briefs/monetization-paywall-revenuecat.md`

## System alignment

- **Posture: Bend.** Preserve the existing RevenueCat purchase shell, `isPro` client signal, contextual paywall drawer, and current product identifiers. Change the old commercial rules, trusted enforcement boundaries, lifecycle projection, and public promise.
- **Primary audience:** AI-native life operators.
- **Representative persona:** Nina.
- **Hero job:** `jtbd-trust-this-app-with-my-life` — help me trust this place enough to keep coming back.
- **Secondary audience:** aspirational family organizers, represented by Maya.
- **Underserved steps protected by the decision:** Maya's “see what matters,” “know the next doable action,” and “schedule or hand off” steps are only 2/5. Basic organization must therefore remain free instead of adding friction before Kwilt earns recurring use.
- **Commercial constraint:** ongoing connected services and provider-intensive assistance need a sustainable paid boundary.
- **Trust constraint:** the same action must receive the same access decision
  from every entry point, and downgrade must preserve the person's data plus
  access to release, deletion, and cleanup controls.

## Aspirational design challenge

How might we make Free Kwilt complete enough to become a trusted household habit while making Pro an obvious upgrade for connected services and high-value assistance, with one truthful purchase experience across screens, Chat, deep links, background work, and server calls?

## Existing contract assessment

The accepted Free/Pro brief has the right strategy:

- Free is the complete personal and household system.
- Pro is the connected and assisted service layer.
- The Apple introductory offer unlocks normal Pro, not a partial trial tier.
- A contextual interstitial appears only after explicit paid intent.
- Cancellation is not expiration, and downgrade preserves data.

The release problem is not a missing pricing thesis. It is the gap between that thesis and the current application, backend, store configuration, public messaging, and launch evidence.

---
feature: paywall
audiences: [audience-ai-native-life-operators, audience-aspirational-family-organizers]
personas: [Nina, Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-move-the-few-things-that-matter
  - jtbd-put-intention-before-impulse
  - jtbd-invite-the-right-people-in
briefs:
  - ai-proxy-and-quotas
  - monetization-paywall-revenuecat
status: shipped
last_reviewed: 2026-09-02
---

# paywall

Helps Nina understand paid limits and upgrades without making Kwilt feel manipulative or unsafe.

## Surfaces in this folder

- `PaywallDrawer.tsx` - contextual upgrade prompt.
- `PaywallInterstitialScreen.tsx` - full-screen upgrade surface.
- `PaywallDrawer.tsx`'s `PaywallContent` export and `paywallTheme.ts` - shared paywall content and visual posture.

## Notes

Paywall messaging should explain capacity and trust boundaries, especially around AI credits and limits. It should not use dark patterns that undermine `jtbd-trust-this-app-with-my-life`.

Contextual upgrade prompts are invitations, not purchase surfaces. They lead with one reason-specific outcome and one plan-choice action. A verified introductory offer or live-derived annual savings may appear as one quiet commercial line; exact localized plan charges, cadence, renewal disclosure, the complete inclusion set, Terms, Privacy, and Restore remain on the plan-selection surface.

The reviewed Money drawer is the canonical contextual Pro-offer template: one immersive Pine field, the `Kwilt | Pro` lockup, a radiused contextual photograph, one full-width proof notification inset over the lower image, an outcome-led headline, one concise mechanism sentence, and one large white/inverse CTA independently anchored with equal side and bottom insets. The close affordance is the only dismissal. Do not add a feature list, `Not now`, legal copy, a white footer, a pricing grid, or a second dominant action.

Other Pro paths reuse that hierarchy and geometry, not Money-specific creative. Each path supplies its own paid outcome, focal-point-safe photograph or illustration, proof notification, mechanism, retained control, eligibility-aware commercial line, CTA, analytics reason/source, and post-purchase resume intent.

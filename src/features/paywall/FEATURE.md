---
feature: paywall
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-move-the-few-things-that-matter
briefs:
  - ai-proxy-and-quotas
  - monetization-paywall-revenuecat
status: shipped
last_reviewed: 2026-05-09
---

# paywall

Helps Nina understand paid limits and upgrades without making Kwilt feel manipulative or unsafe.

## Surfaces in this folder

- `PaywallDrawer.tsx` - contextual upgrade prompt.
- `PaywallInterstitialScreen.tsx` - full-screen upgrade surface.
- `PaywallDrawer.tsx`'s `PaywallContent` export and `paywallTheme.ts` - shared paywall content and visual posture.

## Notes

Paywall messaging should explain capacity and trust boundaries, especially around AI credits and limits. It should not use dark patterns that undermine `jtbd-trust-this-app-with-my-life`.

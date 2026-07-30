---
feature: auth
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
briefs: [kwilt-games-native, kwilt-games-activation, player-profile]
status: shipped
last_reviewed: 2026-07-12
---

# auth

Provides optional shared Kwilt identity only when it preserves useful continuity. Authentication must never block guest play, and failures fall back to local play.

## Surfaces

- `AuthScreen.tsx` starts Apple or Google authentication, communicates recoverable errors, and gives a signed-in user access to their private **My player** identity.

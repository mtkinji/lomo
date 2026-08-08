---
feature: games
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves:
  - jtbd-help-us-enjoy-being-together
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - kwilt-games-capability-integration
  - kwilt-2-games-maturity
  - nearby-game-join
  - bank-roll-pacing
  - games-timer
  - deeper-story-relay
  - stitch-five-game
status: shipping
last_reviewed: 2026-08-03
---

# Games

Gives family and friends an easy reason to spend time together without turning play into household administration.

## Ownership

- `domain/` owns the complete deterministic catalog, rules, scoring, prompts, and practice logic.
- `features/`, `ui/`, and `navigation/` own the shelf, setup, local tables, utilities, join, and remote-room experience.
- `players/`, `remote/`, `audio/`, `nearby/`, and `platform/` own Games-specific persistence and runtime behavior behind host adapters.
- Kwilt's shell owns authentication, global settings, capability switching, analytics, deep links, and release.

## Proof boundary

The integrated source surface matches committed Kwilt Games `7b3e209`: the full catalog and utility, local setup/play, player persistence, audio/orientation, and remote/join/nearby foundations. The required Supabase migrations and functions are deployed. A current native build and two isolated simulator accounts prove Bank discovery, join, active-table reconnect, start, and live moves in both directions. Full finish/rematch, nearby radio behavior, background continuity, and expiry still require signed physical-device proof. See `docs/integration/kwilt-games-source-manifest.md` for the detailed host adaptations and evidence boundary.

---
id: brief-kwilt-games-capability-integration
title: Kwilt Games Capability Integration
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-money-capability-integration]
exploration: docs/design-explorations/kwilt-games-capability-integration
source_repo: /Users/andrewwatanabe/Kwilt Games
source_sha: 7b3e209587d2489ae297f0e265aa2e56481821fb
owner: andrew
last_updated: 2026-07-28
---

# Kwilt Games Capability Integration

## Context

Kwilt's modular monolith and Fun group provide the host contract. Kwilt Games is a mature sibling Expo app with a guest-first catalog, local games, remote foundations, and a distinct playful kit. This brief makes the complete committed Games product a first-class host capability without nesting its standalone application shell.

## Target audience and representative persona

Maya, an aspirational family organizer, wants an easy reason for people to be together. She will initiate play but should not have to administer accounts, profiles, rules, or household configuration before everyone receives value.

## Aspirational design challenge

How might we help Maya start a joyful shared game from the Kwilt she already uses, while preserving instant guest play and Games' distinct table-native character?

## Hero JTBD and job-flow step

`jtbd-help-us-enjoy-being-together` is the demand spine. The integration improves `job-flow-maya-start-playing-together` steps 3–8 from no unified delivery to the complete committed local catalog plus the existing private remote-table paths.

## JTBD framing

When a group has a small opening, let them choose and begin a fair shared game in seconds, invite only the people involved, and keep identity and game state understandable.

## Design

- Register `games` as an active capability in `fun` with one global `Games` destination.
- Add a Games-owned native stack. The shelf is its inventory; game tables are descendants.
- Preserve Games' cream/felt/coral/turmeric visual grammar inside the shared shell.
- Preserve the full committed shelf: Bank, Farkle, Show of Hands, Common Thread, Object Quest, Story Relay, Family Forecast, Pass the Pattern, Doodle Bridge, Clue Circle, Slanguage, and Basic Dice Roller.
- Preserve the established setup, local play, Farkle practice, celebration, sound, orientation, saved-player, identity, and personal-best behavior.
- Preserve the committed Bank, Pass the Pattern, and Slanguage remote-room, invite, join, nearby, and server-authoritative behavior.
- Use host navigation, session, analytics, deep links, settings, and release ownership.
- Put durable player identity, remembered-player, and default game-sound controls under Kwilt Settings > Games; keep setup pencils as contextual shortcuts into the same editors.
- Adapt Expo Router calls behind the Games native-stack adapter; use Kwilt's shared auth and Supabase client rather than importing duplicate owners.
- Keep one global Games row rather than global rows for individual games.
- Track all source and parity boundaries in `docs/integration/kwilt-games-source-manifest.md`.

## Acceptance criteria

- `Games` appears below `Explore` under `Fun` and selects as one capability.
- `kwilt://games` opens the Games shelf.
- Every committed catalog game and Basic Dice Roller is reachable from the established Games shelf.
- Local setup, play, completion, replay, saved players, profiles, personal bests, audio, and orientation behavior remain available.
- Remote Bank, Pass the Pattern, and Slanguage preserve create/invite/join/reconnect/server-convergence paths.
- Legacy `kwiltgames://join/:token`, Kwilt-native `kwilt://games/join/:token`, and Games universal links resolve into the Games join route.
- Back from setup/play returns within Games; global switching remains available from the shelf.
- Settings > Games can edit My player, manage remembered players, and set the default game-sound behavior without adding a second Games account entry.
- No Games query, channel, permission, or auth prompt starts before entry.
- Registry, navigation, imported Games tests, Deno checks, typechecks, product lint, and architecture lint pass.
- Local Supabase, signed-device nearby/orientation/audio, hosted-function deployment, and Simulator surface proof remain separate release evidence.

## Spec refinement

The source checkout's four uncommitted connection-game/setup refinements are included as a documented working-copy overlay without modifying or cleaning that checkout. Full committed source parity plus those current refinements are required in this lane. Deployment and device validation are proof boundaries, not reasons to remove catalog or product behavior. The standalone shell, bundle identity, duplicate auth storage, and Expo Router ownership are intentionally replaced by host adapters.

## Success signal

Andrew can enter Games from Fun and find the Games product he already had—its complete shelf, local sessions, utilities, players, and remote foundations—without a separate app shell or visible loss of Games' playful identity.

## Open questions

- After full-parity surface proof, should the standalone Games binary remain available as an independent distribution or become a compatibility-only join target?

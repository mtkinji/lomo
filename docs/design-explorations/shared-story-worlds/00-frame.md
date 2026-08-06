# Frame: Shared Story Worlds

## What the user said

> Shared storytelling is really fun when the family is together on the couch and casting a game. How can AI help with that? Could it become something like Dungeons & Dragons: a guided story where each person has a character who grows, playable together or remotely?

## Restated in user voice

When family or friends have an evening opening—together on the couch or joining from elsewhere—they want to enter a story where every person can make meaningful choices and surprise the group, so the time feels imaginative, connected, and worth returning to without anyone needing to prepare or serve as the permanent storyteller.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers who want unstructured time to become easy shared connection rather than another activity to administer.

## Representative persona

Maya is gathering family on the couch at night, often casting one shared screen. She wants something the group will willingly begin and may invite distant family into later.

- Current situation: The group has enough attention for a story, but not enough patience for preparation, rulebooks, character sheets, or one person doing all the work.
- What they're trying to become/do: Turn a quiet family opening into a memorable shared adventure in which everyone matters.
- Emotional state or tension: Excited by imagination and continuity; wary of setup, awkward AI prose, passive watching, or a system that sidelines younger or quieter players.
- What would make this feel wrong to them: AI performing a story at the family, mandatory accounts, public-by-default story history, complex RPG statistics, pressure to maintain a campaign, or one dominant player steering every choice.

## Hero anchor

`jtbd-help-us-enjoy-being-together` — the game succeeds only if people feel they spent time with one another, not merely consumed AI output together.

## Job flow step

Primary gap: step 7, “Play through a fair, responsive shared game.” Story Relay currently provides a complete local turn loop, but the typed 140-character contributions, fixed prompts, and deterministic sparks put most of the momentum burden on the players. Provisional current delivery: **3/5**.

Secondary gap: step 9, “Preserve continuity only after it earns the interruption.” Story Relay ends after up to three chapters and keeps no durable world, character, or campaign continuity. Provisional current delivery: **1/5**.

The existing job-flow document predates the unified Games integration and understates the current shelf, setup, and playable local catalog; this exploration uses the current source as the product truth.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — AI should create more interaction between people, not more attention directed toward the model.
- `jtbd-invite-the-right-people-in` — the same meaningful story loop should eventually work for selected remote participants without default-public sharing.
- `jtbd-trust-this-app-with-my-life` — generated content, memory, safety, cost, failure states, and persistence must remain understandable and bounded.

## Friction we're addressing

Story Relay can produce a funny chapter, but it cannot listen to the emerging fiction, respond to player choices, carry forward important details, play supporting characters, or relieve someone from acting as full-time narrator. A D&D-shaped extension could solve those problems, but it could also bury the immediate couch-game magic under character creation, rules, lore, and campaign administration.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Story Relay is a release-ready connection game on the Games shelf.
- Existing local flow: 2–6 named or neutral players rotate through authored chapter roles, optionally choose deterministic sparks, type a short contribution, reveal the chapter, read it aloud, and continue for up to three chapters.
- Existing domain model: player order, chapter/turn progression, contribution text, and optional spark are local and ephemeral.
- Existing durable identity: a signed-in Games player profile currently owns display name, color, and feedback sounds; local saved players provide familiar seats without accounts.
- Existing pet affordance: Pixel Pet is an off-by-default Labs prototype with a named, expressive creature and gentle cosmetic growth. It is not yet a production Games identity or progression system.
- Existing remote affordances: Games already has private-room patterns for Bank, Pass the Pattern, and Slanguage, but Story Relay remote play is only described in catalog metadata.
- Existing AI affordance: production AI calls route through Kwilt's proxy, but Games has no capability-owned generation contract, safety policy, usage boundary, or failure behavior.
- Existing presentation grammar: one shared/cast public board, minimal copy, named turns, immediate next action, family-safe prompts, and no required account for local play.

Constraints to preserve:

- People remain the protagonists, decision-makers, and source of the memorable moments.
- AI may frame, react, remember, and connect; it must not resolve the whole story without player action.
- A local game must start quickly and remain playable if generation is slow or unavailable.
- The cast screen is public to the room; private choices belong on the current player's phone or in a deliberate handoff.
- Remote participation is private-room and consent-first, not a default-public family feed.
- No mandatory character sheets, rules tutorial, campaign calendar, streak, or persistent progression before continuity earns demand.
- Keep the real player, their story character, and an optional pet projection distinct so story state does not overload the global player profile or make Pet a dependency.
- Abilities, items, and relationships belong to a story world; cross-game identity remains lightweight.
- Generated content must be family-safe and appropriately bounded for mixed ages.

Constraints we may challenge:

- Story Relay's fixed three-chapter ceiling and one-sentence typed contribution.
- The assumption that every player must author prose rather than choose, speak, act, draw, or roll.
- The assumption that a story disappears completely when play ends.

Design implication:

Treat the AI as a quiet game master and continuity engine. It should turn player-authored choices into consequential situations, play the world around them, and return attention to the group quickly. A one-night story and a persistent campaign can share this engine, but persistence should be earned after the immediate shared loop proves fun.

## Aspirational design challenge

How might we help Maya's family enter a surprising shared adventure where every person changes what happens, while preserving the effortless start, shared-screen energy, and human authorship of a couch game?

## Out of scope

- Reproducing the full Dungeons & Dragons ruleset.
- Open-ended AI chat presented as a game.
- Public story publishing or discovery.
- AI-generated avatars, maps, voice acting, or video in the first learning slice.
- Durable character progression before a self-contained session earns replay.

## Open question

Should the first learning bet include both “play as yourself” and “make a character,” or is even that choice too much before the first adventure begins?
